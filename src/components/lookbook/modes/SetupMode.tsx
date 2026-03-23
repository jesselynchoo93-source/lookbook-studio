"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  LookbookInput,
  ReferenceAsset,
  ReferenceType,
  FingerprintMeta,
  ProductFingerprint,
  ProductFamily,
  ContinuityWorldTokens,
} from "@/lib/lookbook/types";
import { WORLD_PRESETS } from "@/lib/lookbook/providerCompiler";
import { useVisionExtractor } from "@/lib/lookbook/useVisionExtractor";
import { db } from "@/lib/lookbook/projectStore";
import CampaignForm from "../CampaignForm";
import type { ClassifiedProduct } from "../CampaignForm";
import ReferencePanel from "../ReferencePanel";
import ReferenceTrustCopy from "../ReferenceTrustCopy";
import ExtractedProductTruth from "../ExtractedProductTruth";
import ProductFingerprintForm from "../ProductFingerprintForm";

interface SetupModeProps {
  projectId: string;
  initialInput: LookbookInput;
  references: {
    model: ReferenceAsset[];
    product: ReferenceAsset[];
    styling: ReferenceAsset[];
  };
  fingerprintMeta?: FingerprintMeta;
  onSubmit: (input: LookbookInput) => void;
  onFingerprintMetaChange: (meta: FingerprintMeta) => void;
  onAddReferences: (type: ReferenceType, files: File[]) => void;
  onRemoveReference: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

const FORM_ID = "lookbook-campaign-form";

// ── Resize image for API calls (AI doesn't need full resolution) ──

const MAX_DIMENSION = 1024;

async function resizeImageBlob(
  blob: Blob,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Only resize if larger than max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for resizing"));
    };
    img.src = url;
  });
}

// ── Lightweight product classifier ──

async function classifyProductImage(
  ref: ReferenceAsset,
): Promise<ClassifiedProduct | null> {
  try {
    const blobRecord = await db.referenceBlobs.get(ref.id);
    if (!blobRecord) return null;

    const { base64, mimeType } = await resizeImageBlob(blobRecord.blob);

    const res = await fetch("/api/classify-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64, mimeType }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.confidence === "low") return null;

    return {
      family: data.family as ProductFamily,
      specificItem: data.specificItem || "",
    };
  } catch {
    return null;
  }
}

// ── Styling reference analyser ──

interface StylingAnalysis {
  worldPreset: string | null;
  worldTokens: { backdrop: string; lighting: string; tonalTemperature: string; styling: string } | null;
  brandGuidelines: string;
  confidence: "high" | "medium" | "low";
}

async function analyseStylingImage(
  ref: ReferenceAsset,
): Promise<{ data: StylingAnalysis | null; error: string | null }> {
  try {
    const blobRecord = await db.referenceBlobs.get(ref.id);
    if (!blobRecord) return { data: null, error: "Could not load image from storage" };

    const { base64, mimeType } = await resizeImageBlob(blobRecord.blob);

    const res = await fetch("/api/analyse-styling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64, mimeType }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      return { data: null, error: body.error || `API error ${res.status}` };
    }
    return { data: await res.json(), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

function resolveWorldFromAnalysis(
  analysis: StylingAnalysis,
): ContinuityWorldTokens | undefined {
  // Try matching to a named preset first
  if (analysis.worldPreset) {
    const preset = WORLD_PRESETS.find((p) => p.id === analysis.worldPreset);
    if (preset) return { ...preset.tokens };
  }
  // Fall back to raw tokens from the analysis
  if (analysis.worldTokens) {
    return {
      backdrop: analysis.worldTokens.backdrop,
      lighting: analysis.worldTokens.lighting,
      tonalTemperature: analysis.worldTokens.tonalTemperature,
      styling: analysis.worldTokens.styling || "",
      modelTokens: "",
    };
  }
  return undefined;
}

export default function SetupMode({
  projectId,
  initialInput,
  references,
  fingerprintMeta,
  onSubmit,
  onFingerprintMetaChange,
  onAddReferences,
  onRemoveReference,
  onSetPrimary,
}: SetupModeProps) {
  // Track the live form input so we know the current family for extraction
  const liveInputRef = useRef<LookbookInput>(initialInput);
  const [liveFamily, setLiveFamily] = useState(initialInput.productFamily);
  const [liveItem, setLiveItem] = useState(initialInput.specificItem);

  // Track fingerprint view: "extracted" (compact panel) vs "editing" (manual form)
  const [fingerprintView, setFingerprintView] = useState<"extracted" | "editing">(
    fingerprintMeta?.source === "manual" ? "editing" : "extracted",
  );

  // ── Auto-classification from uploaded product images ──
  const [classifiedProduct, setClassifiedProduct] = useState<ClassifiedProduct | undefined>();
  const [classifying, setClassifying] = useState(false);
  const classifiedRefIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (references.product.length === 0) return;
    const primary = references.product.find((r) => r.isPrimary) ?? references.product[0];
    // Don't re-classify the same image
    if (classifiedRefIdRef.current === primary.id) return;
    classifiedRefIdRef.current = primary.id;

    setClassifying(true);
    classifyProductImage(primary).then((result) => {
      setClassifying(false);
      if (result) {
        setClassifiedProduct(result);
      }
    });
  }, [references.product]);

  // ── Auto-analyse styling references ──
  const [analysingStyling, setAnalysingStyling] = useState(false);
  const [autoWorld, setAutoWorld] = useState<ContinuityWorldTokens | undefined>();
  const [brandGuidelines, setBrandGuidelines] = useState("");
  const [stylingAnalysed, setStylingAnalysed] = useState(false);
  const [stylingError, setStylingError] = useState<string | null>(null);
  const analysedStylingRefIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (references.styling.length === 0) return;
    const primary = references.styling.find((r) => r.isPrimary) ?? references.styling[0];
    if (analysedStylingRefIdRef.current === primary.id) return;
    analysedStylingRefIdRef.current = primary.id;

    setAnalysingStyling(true);
    setStylingAnalysed(false);
    setStylingError(null);
    analyseStylingImage(primary).then(({ data, error }) => {
      setAnalysingStyling(false);
      if (error) {
        setStylingError(error);
        return;
      }
      if (data) {
        const world = resolveWorldFromAnalysis(data);
        if (world) setAutoWorld(world);
        if (data.brandGuidelines) setBrandGuidelines(data.brandGuidelines);
        setStylingAnalysed(true);
      }
    });
  }, [references.styling]);

  const handleInputChange = useCallback((input: LookbookInput) => {
    liveInputRef.current = input;
    setLiveFamily(input.productFamily);
    setLiveItem(input.specificItem);
  }, []);

  // When extraction produces a fingerprint, update the form input via a ref-based approach
  // We store the latest fingerprint and the form's onSubmit merges it
  const extractedFpRef = useRef<ProductFingerprint | undefined>(undefined);

  const handleExtractedFingerprint = useCallback(
    (fp: ProductFingerprint, meta: FingerprintMeta) => {
      extractedFpRef.current = fp;
      onFingerprintMetaChange(meta);
    },
    [onFingerprintMetaChange],
  );

  const extractor = useVisionExtractor({
    projectId,
    family: liveFamily,
    productReferences: references.product,
    currentFingerprint: liveInputRef.current.productFingerprint,
    currentMeta: fingerprintMeta,
    onFingerprint: handleExtractedFingerprint,
    specificItem: liveItem || undefined,
  });

  // Wrap onSubmit to merge extracted fingerprint
  const handleSubmit = useCallback(
    (input: LookbookInput) => {
      const fp = extractedFpRef.current ?? input.productFingerprint;
      onSubmit({ ...input, productFingerprint: fp });
    },
    [onSubmit],
  );

  // Manual edit after extraction marks source as "edited"
  const handleManualFingerprintEdit = useCallback(
    (fp: ProductFingerprint | undefined) => {
      extractedFpRef.current = fp;
      if (fp && fingerprintMeta) {
        onFingerprintMetaChange({ ...fingerprintMeta, source: "edited" });
      }
    },
    [fingerprintMeta, onFingerprintMetaChange],
  );

  const hasProductRefs = references.product.length > 0;
  const showExtractionPanel =
    hasProductRefs &&
    (extractor.status !== "idle" || extractor.fingerprint !== null);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Section A: Reference Images (upload first) */}
      <div
        className="bg-[--surface-card] rounded-xl p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-lg font-semibold text-[--text-primary] mb-4">
          Reference Images
        </h2>
        <div className="space-y-4">
          <ReferencePanel
            model={references.model}
            product={references.product}
            styling={references.styling}
            onAdd={onAddReferences}
            onRemove={onRemoveReference}
            onSetPrimary={onSetPrimary}
          />
          <ReferenceTrustCopy />
        </div>
      </div>

      {/* Section B: Detected Product Truth (appears after image analysis) */}
      {showExtractionPanel && fingerprintView === "extracted" && (
        <div
          className="bg-[--surface-card] rounded-xl p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <ExtractedProductTruth
            status={extractor.status}
            fingerprint={extractor.fingerprint}
            meta={extractor.meta}
            error={extractor.error}
            notes={extractor.notes}
            onEdit={() => setFingerprintView("editing")}
            onRerun={extractor.rerun}
            onManualEntry={() => {
              setFingerprintView("editing");
              if (fingerprintMeta) {
                onFingerprintMetaChange({ ...fingerprintMeta, source: "manual" });
              }
            }}
          />
        </div>
      )}

      {/* Section B alt: Manual fingerprint editing */}
      {showExtractionPanel && fingerprintView === "editing" && (
        <div
          className="bg-[--surface-card] rounded-xl p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[--text-primary]">
              Product Fingerprint
            </h2>
            {extractor.fingerprint && (
              <button
                type="button"
                onClick={() => setFingerprintView("extracted")}
                className="text-[11px] px-2.5 py-1 rounded bg-[--surface-inset] border border-[--border-default] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
              >
                Back to detected
              </button>
            )}
          </div>
          <ProductFingerprintForm
            family={liveFamily}
            value={extractedFpRef.current ?? liveInputRef.current.productFingerprint}
            onChange={handleManualFingerprintEdit}
          />
        </div>
      )}

      {/* Section C: Brand Guidelines (auto-filled from styling ref) */}
      {(references.styling.length > 0 || brandGuidelines) && (
        <div
          className="bg-[--surface-card] rounded-xl p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-[--text-primary]">
              Brand Guidelines
            </h2>
            {stylingAnalysed && !analysingStyling && (
              <span className="text-[10px] text-[--text-tertiary] px-2 py-0.5 rounded-full bg-[--surface-inset] border border-[--border-subtle]">
                Auto-filled from styling ref
              </span>
            )}
          </div>

          {/* Loading state */}
          {analysingStyling && (
            <div className="flex items-center gap-3 py-4 px-3 bg-[--surface-inset] rounded-lg mb-3">
              <div className="w-4 h-4 border-2 border-[--text-tertiary] border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-sm text-[--text-secondary]">Analysing styling reference...</p>
                <p className="text-[11px] text-[--text-tertiary] mt-0.5">Extracting mood, lighting, and brand direction</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {stylingError && !analysingStyling && (
            <div className="flex items-center justify-between gap-3 py-3 px-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <p className="text-xs text-red-700">{stylingError}</p>
              <button
                type="button"
                onClick={() => {
                  analysedStylingRefIdRef.current = null;
                  setStylingError(null);
                  // Re-trigger by forcing a new ref check
                  if (references.styling.length > 0) {
                    const primary = references.styling.find((r) => r.isPrimary) ?? references.styling[0];
                    setAnalysingStyling(true);
                    analyseStylingImage(primary).then(({ data, error }) => {
                      setAnalysingStyling(false);
                      if (error) {
                        setStylingError(error);
                        return;
                      }
                      if (data) {
                        analysedStylingRefIdRef.current = primary.id;
                        const world = resolveWorldFromAnalysis(data);
                        if (world) setAutoWorld(world);
                        if (data.brandGuidelines) setBrandGuidelines(data.brandGuidelines);
                        setStylingAnalysed(true);
                      }
                    });
                  }
                }}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded bg-white border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Textarea (always visible, editable even during loading) */}
          {!analysingStyling && (
            <>
              <textarea
                value={brandGuidelines}
                onChange={(e) => setBrandGuidelines(e.target.value)}
                placeholder="Visual brand rules for this client, e.g. 'Maintain warm earth tones. Keep backgrounds clean and uncluttered. Logo must be visible but not dominant.'"
                className="w-full bg-[--surface-inset] border border-[--border-subtle] rounded-lg px-3 py-2 text-[--text-primary] text-sm focus:outline-none focus:border-[--text-tertiary] min-h-[72px] resize-y"
              />
              <p className="mt-1.5 text-[11px] text-[--text-tertiary]">
                Describes the visual identity for this project. Auto-extracted from styling references, or write your own.
              </p>
            </>
          )}
        </div>
      )}

      {/* Section D: Creative Direction (auto-filled from classification) */}
      <div
        className="bg-[--surface-card] rounded-xl p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[--text-primary]">
            Creative Direction
          </h2>
          {classifying && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[--text-tertiary] border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-[--text-tertiary]">Detecting product...</span>
            </div>
          )}
          {classifiedProduct && !classifying && (
            <span className="text-[10px] text-[--text-tertiary] px-2 py-0.5 rounded-full bg-[--surface-inset] border border-[--border-subtle]">
              Auto-filled from image
            </span>
          )}
        </div>
        <CampaignForm
          onSubmit={handleSubmit}
          initialInput={initialInput}
          formId={FORM_ID}
          onInputChange={handleInputChange}
          hasProductRefs={hasProductRefs}
          classifiedProduct={classifiedProduct}
          autoWorld={autoWorld}
          brandGuidelines={brandGuidelines || undefined}
        />
      </div>

      {/* CTA */}
      <button
        type="submit"
        form={FORM_ID}
        className="w-full bg-[--text-primary] text-[--text-inverted] font-medium py-3 rounded-lg text-base hover:opacity-90 transition-opacity"
      >
        Build Lookbook Plan
      </button>
    </div>
  );
}
