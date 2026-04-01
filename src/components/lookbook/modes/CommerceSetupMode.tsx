"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type {
  LookbookInput,
  ReferenceAsset,
  ReferenceType,
  ProductFingerprint,
  FingerprintMeta,
} from "@/lib/lookbook/types";
import type {
  TemplateFamilyDefinition,
  CommerceSwapMode,
} from "@/lib/commerce/referenceLibrary.types";
import { useVisionExtractor } from "@/lib/lookbook/useVisionExtractor";
import { computeFamilyCompatibility } from "@/lib/commerce/compatibilityCheck";
import TemplateFamilyPicker from "../TemplateFamilyPicker";

// ── Presentation map (UI Vocabulary Rule) ──

const SWAP_MODE_LABELS: Record<CommerceSwapMode, string> = {
  identity_and_garment: "Garment + identity",
  garment_only: "Garment swap",
  face_only: "Garment-only recommended",
};

// ── Types ──

interface CommerceSetupModeProps {
  projectId: string;
  initialInput: LookbookInput;
  references: {
    model: ReferenceAsset[];
    product: ReferenceAsset[];
    styling: ReferenceAsset[];
  };
  families: TemplateFamilyDefinition[];
  fingerprintMeta?: FingerprintMeta;
  currentFingerprint?: ProductFingerprint;
  initialSelectedFamilyId?: string;
  onFingerprintChange: (fp: ProductFingerprint, meta: FingerprintMeta) => void;
  onSubmit: (input: LookbookInput, family: TemplateFamilyDefinition) => void;
  onFamilySelect?: (familyId: string) => void;
  onAddReferences: (type: ReferenceType, files: File[]) => void;
  onRemoveReference: (id: string) => void;
}

// ── Component ──

export default function CommerceSetupMode({
  projectId,
  initialInput,
  references,
  families,
  fingerprintMeta,
  currentFingerprint,
  initialSelectedFamilyId,
  onFingerprintChange,
  onSubmit,
  onFamilySelect,
  onAddReferences,
  onRemoveReference,
}: CommerceSetupModeProps) {
  // Restore selected family and step from persisted state
  const restoredFamily = initialSelectedFamilyId
    ? families.find((f) => f.id === initialSelectedFamilyId) ?? null
    : null;
  const hasProductRef = references.product.length > 0;

  const [selectedFamily, setSelectedFamily] = useState<TemplateFamilyDefinition | null>(restoredFamily);
  const [step, setStep] = useState<"upload" | "family">(
    restoredFamily && hasProductRef ? "family" : "upload",
  );
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [manualDescription, setManualDescription] = useState("");

  const hasModelRef = references.model.length > 0;

  // ── Model-ref suitability check (anti-contamination warning) ──
  const [modelSuitability, setModelSuitability] = useState<"unchecked" | "checking" | "clean" | "warning">("unchecked");
  const [modelSuitabilityReason, setModelSuitabilityReason] = useState<string>("");

  useEffect(() => {
    if (!hasModelRef) {
      setModelSuitability("unchecked");
      setModelSuitabilityReason("");
      return;
    }

    const primaryModel = references.model.find((r) => r.isPrimary) ?? references.model[0];
    if (!primaryModel?.previewUrl) return;

    let cancelled = false;
    setModelSuitability("checking");

    (async () => {
      try {
        const res = await fetch(primaryModel.previewUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const checkRes = await fetch("/api/check-model-suitability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType: blob.type || "image/jpeg" }),
        });

        if (cancelled) return;
        const data = await checkRes.json();

        if (data.suitable === false) {
          setModelSuitability("warning");
          setModelSuitabilityReason(data.reason || "Visible clothing or layering detected");
        } else {
          setModelSuitability("clean");
        }
      } catch {
        if (!cancelled) setModelSuitability("clean"); // Fail open
      }
    })();

    return () => { cancelled = true; };
  }, [hasModelRef, references.model]);

  const autoSwapMode: CommerceSwapMode = useMemo(() => {
    if (hasModelRef && hasProductRef) return "identity_and_garment";
    if (hasModelRef) return "face_only";
    return "garment_only";
  }, [hasModelRef, hasProductRef]);

  // ── Vision extraction (auto-runs when product ref uploaded) ──
  const extractor = useVisionExtractor({
    projectId,
    family: initialInput.productFamily,
    productReferences: references.product,
    currentFingerprint,
    currentMeta: fingerprintMeta,
    onFingerprint: onFingerprintChange,
    specificItem: initialInput.specificItem,
  });

  // Show textarea only when extraction fails or confidence is low (No-Textarea Rule)
  const shouldShowTextarea = showEditDetails
    || extractor.status === "error"
    || (extractor.status === "ready" && extractor.meta?.confidence === "low");

  const handleFamilySelect = useCallback(
    (family: TemplateFamilyDefinition) => {
      setSelectedFamily(family);
      onFamilySelect?.(family.id);
    },
    [onFamilySelect],
  );

  const handleContinueToFamily = useCallback(() => {
    if (!hasProductRef) return;
    setStep("family");
  }, [hasProductRef]);

  const handleGenerateSet = useCallback(() => {
    if (!selectedFamily) return;
    const input = {
      ...initialInput,
      specificItem: manualDescription || initialInput.specificItem || "",
    };
    onSubmit(input, selectedFamily);
  }, [selectedFamily, initialInput, onSubmit, manualDescription]);

  // ── Fingerprint chip renderer ──
  const fingerprintChips = useMemo(() => {
    if (!extractor.fingerprint) return [];
    const fp = extractor.fingerprint as unknown as Record<string, unknown>;
    const chipFields = [
      "specificItem",
      "material",
      "materialFinish",
      "primaryColour",
      "materialColour",
      "silhouette",
      "neckline",
      "sleeveLength",
      "hemLength",
      "fit",
      "closureType",
      "strapType",
      "constructionStyle",
    ];
    const seen = new Set<string>();
    const chips: string[] = [];
    for (const field of chipFields) {
      const val = fp[field];
      if (!val || val === "unknown" || val === "none") continue;
      const str = String(val);
      const lower = str.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      chips.push(str);
    }
    return chips;
  }, [extractor.fingerprint]);

  // ── One-sentence garment summary ──
  const garmentSummary = useMemo(() => {
    if (!extractor.fingerprint) return null;
    const fp = extractor.fingerprint as unknown as Record<string, unknown>;
    const parts: string[] = [];
    if (fp.primaryColour) parts.push(String(fp.primaryColour));
    if (fp.material) parts.push(String(fp.material));
    if (fp.specificItem) parts.push(String(fp.specificItem));
    if (parts.length === 0) return null;
    const base = parts.join(" ");
    const details: string[] = [];
    if (fp.neckline) details.push(`${fp.neckline} neckline`);
    if (fp.fit) details.push(String(fp.fit));
    if (fp.silhouette) details.push(String(fp.silhouette));
    if (fp.strapType) details.push(String(fp.strapType));
    if (details.length > 0) return `${base} with ${details.join(", ")}`;
    return base;
  }, [extractor.fingerprint]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Progress indicator: 2 steps (Upload, Template) */}
      <div className="flex items-center gap-3 mb-8">
        {["Upload", "Template"].map((label, i) => {
          const currentIndex = step === "upload" ? 0 : 1;
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;

          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`
                  w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium
                  ${isActive
                    ? "bg-[--text-primary] text-[--text-inverted]"
                    : isDone
                      ? "bg-[--status-success-bg] text-[--status-success-text]"
                      : "bg-[--surface-inset] text-[--text-tertiary]"
                  }
                `}
              >
                {isDone ? "\u2713" : i + 1}
              </span>
              <span
                className={`text-xs ${
                  isActive ? "text-[--text-primary] font-medium" : "text-[--text-tertiary]"
                }`}
              >
                {label}
              </span>
              {i < 1 && (
                <div className="w-8 h-px bg-[--border-subtle]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-1">
              Upload product references
            </h2>
            <p className="text-sm text-[--text-secondary]">
              Upload photos of the product you want to generate commerce shots for.
              Optionally add a model reference for identity swap.
            </p>
          </div>

          {/* Product refs */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
              Product Photos (required)
            </label>
            <DropZone
              assets={references.product}
              type="product"
              onAdd={onAddReferences}
              onRemove={onRemoveReference}
            />
          </div>

          {/* Vision extraction status */}
          {hasProductRef && (
            <div className="space-y-2">
              {extractor.status === "analysing" && (
                <div className="bg-[--surface-inset] rounded-lg p-3 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[--text-tertiary] border-t-[--text-primary] rounded-full animate-spin" />
                  <span className="text-xs text-[--text-secondary]">Detecting garment details...</span>
                </div>
              )}

              {extractor.status === "ready" && fingerprintChips.length > 0 && (
                <div className="bg-[--surface-inset] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[--text-secondary]">
                      Garment details detected
                    </span>
                    <div className="flex items-center gap-2">
                      {extractor.meta?.confidence && (
                        <span className={`text-xs ${
                          extractor.meta.confidence === "high"
                            ? "text-[--status-success-text]"
                            : extractor.meta.confidence === "low"
                              ? "text-[--status-error-text]"
                              : "text-[--status-warning-text]"
                        }`}>
                          {extractor.meta.confidence === "high" ? "High" : extractor.meta.confidence === "low" ? "Low" : "Medium"} confidence
                        </span>
                      )}
                      <button
                        onClick={() => extractor.rerun()}
                        className="text-xs text-[--text-tertiary] hover:text-[--text-primary] transition-colors"
                      >
                        Re-analyse
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fingerprintChips.map((chip) => (
                      <span
                        key={chip}
                        className="px-2 py-0.5 rounded-md bg-[--surface-card] text-xs text-[--text-primary] border border-[--border-subtle]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  {garmentSummary && (
                    <p className="mt-2 text-xs text-[--text-secondary] italic">
                      {garmentSummary}
                    </p>
                  )}
                  {!showEditDetails && (
                    <button
                      onClick={() => setShowEditDetails(true)}
                      className="mt-2 text-xs text-[--text-tertiary] hover:text-[--text-primary] transition-colors"
                    >
                      Edit details
                    </button>
                  )}
                </div>
              )}

              {extractor.status === "error" && (
                <div className="bg-[--surface-inset] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[--status-error-text]">
                      {extractor.error || "Could not detect garment details"}
                    </span>
                    <button
                      onClick={() => extractor.rerun()}
                      className="text-xs text-[--text-secondary] hover:text-[--text-primary] transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Textarea: hidden by default (No-Textarea Rule) */}
              {shouldShowTextarea && (
                <div className="space-y-1">
                  <textarea
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    placeholder="e.g., Green satin midi dress with fitted bodice, V-neckline, spaghetti straps, A-line skirt"
                    rows={3}
                    className="w-full text-sm text-[--text-primary] bg-[--surface-inset] border border-[--border-subtle] rounded-lg p-3 resize-none focus:outline-none focus:border-[--border-default]"
                  />
                  <p className="text-xs text-[--text-tertiary]">
                    Describe the garment: material, colour, silhouette, and key details.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Model refs */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
              Model Reference (optional)
            </label>
            <DropZone
              assets={references.model}
              type="model"
              onAdd={onAddReferences}
              onRemove={onRemoveReference}
            />
            <p className="text-xs text-[--text-tertiary]">
              Add a model photo for identity swap. Skip for garment-only mode.
            </p>
            {modelSuitability === "warning" && (
              <div className="bg-[--status-warning-bg] rounded-lg p-3 text-xs text-[--status-warning-text]">
                <p className="font-medium mb-0.5">
                  Your model photo includes visible clothing/layering.
                </p>
                <p>
                  This can override the product and cause wrong results. Use a cleaner identity photo for best results.
                </p>
                {modelSuitabilityReason && (
                  <p className="mt-1 text-[--text-tertiary]">
                    Detected: {modelSuitabilityReason}
                  </p>
                )}
              </div>
            )}
            {modelSuitability === "checking" && (
              <div className="flex items-center gap-2 text-xs text-[--text-tertiary]">
                <div className="w-3 h-3 border border-[--text-tertiary] border-t-[--text-primary] rounded-full animate-spin" />
                Checking model photo...
              </div>
            )}
          </div>

          {/* Swap mode preview */}
          <div className="bg-[--surface-inset] rounded-lg p-3 text-xs text-[--text-secondary]">
            Swap mode: <span className="font-medium text-[--text-primary]">
              {SWAP_MODE_LABELS[autoSwapMode]}
            </span>
            {" "}(auto-detected from references)
          </div>

          <button
            onClick={handleContinueToFamily}
            disabled={!hasProductRef}
            className={`
              w-full py-2.5 rounded-lg text-sm font-medium transition-opacity
              ${hasProductRef
                ? "bg-[--text-primary] text-[--text-inverted] hover:opacity-90"
                : "bg-[--surface-inset] text-[--text-tertiary] cursor-not-allowed"
              }
            `}
          >
            Choose Template
          </button>
        </div>
      )}

      {/* Step 2: Template Family + Generate */}
      {step === "family" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[--text-primary] mb-1">
              Choose a template
            </h2>
            <p className="text-sm text-[--text-secondary]">
              Each template defines the shots, background, and lighting for your commerce set.
            </p>
          </div>

          <TemplateFamilyPicker
            families={families}
            productFamily={initialInput.productFamily}
            genderPresentation={initialInput.genderPresentation}
            selectedFamilyId={selectedFamily?.id}
            fingerprint={extractor.fingerprint ?? currentFingerprint}
            extractionStatus={extractor.status}
            onSelect={handleFamilySelect}
          />

          {/* Inline summary when family selected */}
          {selectedFamily && (
            <SelectedFamilySummary
              family={selectedFamily}
              fingerprint={extractor.fingerprint ?? currentFingerprint}
              extractionStatus={extractor.status}
              garmentSummary={garmentSummary}
              fingerprintChips={fingerprintChips}
              swapModeLabel={SWAP_MODE_LABELS[autoSwapMode]}
            />
          )}

          {/* Skip explanation */}
          {selectedFamily && (
            <SkipExplanation
              family={selectedFamily}
              fingerprint={extractor.fingerprint ?? currentFingerprint}
              extractionStatus={extractor.status}
            />
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("upload")}
              className="flex-1 py-2.5 rounded-lg text-sm text-[--text-secondary] border border-[--border-subtle] hover:border-[--text-tertiary] transition-colors"
            >
              Back
            </button>
            <GenerateButton
              selectedFamily={selectedFamily}
              fingerprint={extractor.fingerprint ?? currentFingerprint}
              extractionStatus={extractor.status}
              onClick={handleGenerateSet}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Selected Family Summary (with effective shot count from shared source) ──

function SelectedFamilySummary({
  family,
  fingerprint,
  extractionStatus,
  garmentSummary,
  fingerprintChips,
  swapModeLabel,
}: {
  family: TemplateFamilyDefinition;
  fingerprint?: ProductFingerprint;
  extractionStatus: string;
  garmentSummary: string | null;
  fingerprintChips: string[];
  swapModeLabel: string;
}) {
  const compat = useMemo(
    () => computeFamilyCompatibility(family, fingerprint),
    [family, fingerprint],
  );

  const shotLabel = compat.status === "unknown"
    ? `${family.shots.length} shots`
    : compat.skippedCount > 0
      ? `${compat.effectiveShots} of ${family.shots.length} shots (${compat.skippedCount} skipped)`
      : `${family.shots.length} shots`;

  return (
    <div className="bg-[--surface-card] border border-[--border-subtle] rounded-xl p-4 space-y-1.5 text-sm">
      {garmentSummary ? (
        <p className="text-xs text-[--text-secondary] mb-2">
          {garmentSummary}
        </p>
      ) : fingerprintChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {fingerprintChips.slice(0, 6).map((chip) => (
            <span
              key={chip}
              className="px-2 py-0.5 rounded-md bg-[--surface-inset] text-xs text-[--text-primary]"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex justify-between text-[--text-secondary]">
        <span>{swapModeLabel}</span>
        <span>{shotLabel}</span>
      </div>
      {compat.status === "unknown" && (
        <p className="text-xs text-[--text-tertiary]">
          {extractionStatus === "analysing"
            ? "Compatibility not yet checked"
            : "Upload a product photo to check compatibility"}
        </p>
      )}
    </div>
  );
}

// ── Skip Explanation (between summary and CTA) ──

function SkipExplanation({
  family,
  fingerprint,
  extractionStatus,
}: {
  family: TemplateFamilyDefinition;
  fingerprint?: ProductFingerprint;
  extractionStatus: string;
}) {
  const compat = useMemo(
    () => computeFamilyCompatibility(family, fingerprint),
    [family, fingerprint],
  );

  if (compat.status === "compatible") return null;

  if (compat.status === "unknown") {
    return (
      <div className="bg-[--surface-inset] rounded-lg px-3 py-2 text-xs text-[--text-tertiary]">
        {extractionStatus === "analysing"
          ? "Checking which shots are compatible..."
          : "Upload a product photo to check compatibility."}
      </div>
    );
  }

  if (compat.status === "partial" && compat.conflictSummary) {
    return (
      <div className="bg-[--status-warning-bg] rounded-lg px-3 py-2 text-xs text-[--status-warning-text]">
        {compat.conflictSummary}
      </div>
    );
  }

  if (compat.status === "incompatible") {
    return (
      <div className="bg-[--surface-inset] rounded-lg px-3 py-2 text-xs text-[--text-tertiary]">
        This template is not compatible with your garment.
      </div>
    );
  }

  return null;
}

// ── Generate Button (with effective shot count from shared source) ──

function GenerateButton({
  selectedFamily,
  fingerprint,
  extractionStatus,
  onClick,
}: {
  selectedFamily: TemplateFamilyDefinition | null;
  fingerprint?: ProductFingerprint;
  extractionStatus: string;
  onClick: () => void;
}) {
  const label = useMemo(() => {
    if (!selectedFamily) return "Generate Set";
    const compat = computeFamilyCompatibility(selectedFamily, fingerprint);
    if (compat.status === "unknown") return "Generate Set";
    return `Generate ${compat.effectiveShots}-Shot Set`;
  }, [selectedFamily, fingerprint]);

  return (
    <button
      onClick={onClick}
      disabled={!selectedFamily}
      className={`
        flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity
        ${selectedFamily
          ? "bg-[--text-primary] text-[--text-inverted] hover:opacity-90"
          : "bg-[--surface-inset] text-[--text-tertiary] cursor-not-allowed"
        }
      `}
    >
      {label}
    </button>
  );
}

// ── Drop Zone (simplified) ──

function DropZone({
  assets,
  type,
  onAdd,
  onRemove,
}: {
  assets: ReferenceAsset[];
  type: ReferenceType;
  onAdd: (type: ReferenceType, files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onAdd(type, Array.from(files));
      }
    },
    [type, onAdd],
  );

  return (
    <div className="space-y-2">
      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="relative w-16 h-16 rounded-lg overflow-hidden bg-[--surface-inset] group"
            >
              {asset.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.previewUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              <button
                onClick={() => onRemove(asset.id)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="block border border-dashed border-[--border-subtle] rounded-lg p-4 text-center cursor-pointer hover:border-[--text-tertiary] transition-colors">
        <span className="text-xs text-[--text-tertiary]">
          {assets.length === 0 ? "Click to upload" : "Add more"}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
