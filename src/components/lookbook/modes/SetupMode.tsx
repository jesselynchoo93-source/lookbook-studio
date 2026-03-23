"use client";

import { useState, useCallback, useRef } from "react";
import type {
  LookbookInput,
  ReferenceAsset,
  ReferenceType,
  FingerprintMeta,
  ProductFingerprint,
} from "@/lib/lookbook/types";
import { useVisionExtractor } from "@/lib/lookbook/useVisionExtractor";
import CampaignForm from "../CampaignForm";
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
      {/* Section A: Creative Direction */}
      <div
        className="bg-[--surface-card] rounded-xl p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-lg font-semibold text-[--text-primary] mb-4">
          Creative Direction
        </h2>
        <CampaignForm
          onSubmit={handleSubmit}
          initialInput={initialInput}
          formId={FORM_ID}
          onInputChange={handleInputChange}
        />
      </div>

      {/* Section B: Product & References */}
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

      {/* Section C: Detected Product Truth (between refs and Build button) */}
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

      {/* Section C alt: Manual fingerprint editing */}
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
