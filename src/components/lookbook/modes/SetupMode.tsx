"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  LookbookInput,
  ReferenceAsset,
  ReferenceType,
  FingerprintMeta,
  ProductFingerprint,
  ProductFamily,
} from "@/lib/lookbook/types";
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

// ── Lightweight product classifier ──

async function classifyProductImage(
  ref: ReferenceAsset,
): Promise<ClassifiedProduct | null> {
  try {
    const blobRecord = await db.referenceBlobs.get(ref.id);
    if (!blobRecord) return null;

    const buf = await blobRecord.blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const res = await fetch("/api/classify-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: ref.mimeType,
      }),
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

      {/* Section C: Creative Direction (auto-filled from classification) */}
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
