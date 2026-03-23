"use client";

/**
 * Client hook: auto-triggers vision extraction when a primary product
 * reference image is uploaded. Manages state (idle/analysing/ready/error),
 * blob-to-base64 conversion, fetch, and normalised result handling.
 *
 * Extraction signature (SHA-256 of image blob) prevents redundant runs.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  ReferenceAsset,
  ProductFamily,
  ProductFingerprint,
  FingerprintMeta,
  FingerprintSource,
} from "./types";
import { db } from "./projectStore";
import type { NormalisedExtractionResult } from "./fingerprintSchema";

// ── Types ──

export type ExtractorStatus = "idle" | "analysing" | "ready" | "error";

export interface ExtractorState {
  status: ExtractorStatus;
  fingerprint: ProductFingerprint | null;
  meta: FingerprintMeta | null;
  error: string | null;
  /** Raw notes from the normaliser (shown as warnings). */
  notes: string[];
}

export interface UseVisionExtractorOptions {
  projectId: string;
  family: ProductFamily;
  productReferences: ReferenceAsset[];
  /** Current fingerprint from the campaign input (may be manually entered). */
  currentFingerprint?: ProductFingerprint;
  /** Current extraction metadata from ProjectRecord. */
  currentMeta?: FingerprintMeta;
  /** Called when extraction produces a new fingerprint. */
  onFingerprint: (fp: ProductFingerprint, meta: FingerprintMeta) => void;
  /** Optional specific item name for better prompts (e.g. "X Nihilo Tote"). */
  specificItem?: string;
}

// ── Helpers ──

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const arr = new Uint8Array(hash);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Families that have extraction schemas. */
const EXTRACTABLE_FAMILIES = new Set<ProductFamily>([
  "bags",
  "watches",
  "belts",
  "jewelry",
]);

// ── Hook ──

export function useVisionExtractor({
  projectId,
  family,
  productReferences,
  currentFingerprint,
  currentMeta,
  onFingerprint,
  specificItem,
}: UseVisionExtractorOptions): ExtractorState & {
  rerun: () => void;
} {
  const [state, setState] = useState<ExtractorState>({
    status: currentMeta ? "ready" : "idle",
    fingerprint: currentFingerprint ?? null,
    meta: currentMeta ?? null,
    error: null,
    notes: currentMeta?.notes ?? [],
  });

  const extractingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track latest onFingerprint to avoid stale closures
  const onFingerprintRef = useRef(onFingerprint);
  onFingerprintRef.current = onFingerprint;

  /**
   * Find the primary product reference (or first if none marked primary).
   */
  const getPrimaryRef = useCallback((): ReferenceAsset | null => {
    if (productReferences.length === 0) return null;
    return (
      productReferences.find((r) => r.isPrimary) ?? productReferences[0]
    );
  }, [productReferences]);

  /**
   * Run extraction against the API route.
   */
  const runExtraction = useCallback(
    async (quality: "standard" | "high" = "standard") => {
      if (extractingRef.current) return;
      if (!EXTRACTABLE_FAMILIES.has(family)) return;

      const primary = getPrimaryRef();
      if (!primary) return;

      extractingRef.current = true;
      setState((s) => ({
        ...s,
        status: "analysing",
        error: null,
        notes: [],
      }));

      try {
        // Load blob from IndexedDB
        const blobRecord = await db.referenceBlobs.get(primary.id);
        if (!blobRecord) {
          throw new Error("Product image blob not found in storage");
        }

        const [base64, signature] = await Promise.all([
          blobToBase64(blobRecord.blob),
          hashBlob(blobRecord.blob),
        ]);

        const res = await fetch("/api/extract-fingerprint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: primary.mimeType,
            family,
            quality,
            specificItem,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            errBody.error ?? `Extraction failed (${res.status})`,
          );
        }

        const result: NormalisedExtractionResult = await res.json();

        const meta: FingerprintMeta = {
          signature,
          confidence: result.confidence,
          notes: result.notes,
          source: "auto" as FingerprintSource,
          extractedAt: new Date().toISOString(),
        };

        setState({
          status: "ready",
          fingerprint: result.fingerprint,
          meta,
          error: null,
          notes: result.notes,
        });

        onFingerprintRef.current(result.fingerprint, meta);

        // Auto-escalate: if Sonnet returned low confidence, re-run with Opus
        if (quality === "standard" && result.confidence === "low") {
          extractingRef.current = false;
          runExtraction("high");
          return;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown extraction error";
        setState((s) => ({
          ...s,
          status: "error",
          error: message,
        }));
      } finally {
        extractingRef.current = false;
      }
    },
    [family, getPrimaryRef, specificItem],
  );

  /**
   * Auto-extraction effect: triggers when the primary product image changes.
   */
  useEffect(() => {
    if (!EXTRACTABLE_FAMILIES.has(family)) return;

    const primary = getPrimaryRef();
    if (!primary) return;

    // Don't re-extract if the user has edited the fingerprint for this image
    if (
      currentMeta?.source === "edited" &&
      currentMeta.signature // we'll check in the async part
    ) {
      // Need to verify the signature matches; do it async
    }

    // Debounce: 500ms after the primary image stabilises
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const blobRecord = await db.referenceBlobs.get(primary.id);
        if (!blobRecord) return;

        const signature = await hashBlob(blobRecord.blob);

        // Already extracted for this exact image?
        if (currentMeta?.signature === signature) {
          // If user edited, protect their edits
          if (currentMeta.source === "edited") return;
          // If already auto-extracted, no need to re-run
          if (currentMeta.source === "auto") return;
        }

        // Trigger extraction
        runExtraction("standard");
      } catch {
        // Silently fail on hash check; don't block
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [family, productReferences, currentMeta, getPrimaryRef, runExtraction]);

  /**
   * Manual re-run: forces a fresh extraction with Opus (high quality).
   * Ignores signature checks and overwrites edited values.
   */
  const rerun = useCallback(() => {
    runExtraction("high");
  }, [runExtraction]);

  return { ...state, rerun };
}
