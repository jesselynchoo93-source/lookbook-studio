"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  LookbookInput,
  ProductFamily,
  CampaignGoal,
  TargetStyle,
  GenderPresentation,
  LogoVisibilityPriority,
  CreativityLevel,
  SettingsDriver,
  ProductFingerprint,
  ContinuityWorldTokens,
  ReferenceAsset,
  FingerprintMeta,
} from "@/lib/lookbook/types";
import type { RecommendedSettings } from "@/lib/lookbook/recommendSettings";
import { getRecommendedSettings } from "@/lib/lookbook/recommendSettings";
import { STARTER_PRESETS } from "@/lib/lookbook/starterPresets";
import { useVisionExtractor } from "@/lib/lookbook/useVisionExtractor";
import StarterPresetPicker from "./StarterPresetPicker";
import ProductSelector from "./ProductSelector";
import CampaignGoalSelector from "./CampaignGoalSelector";
import ProductFingerprintForm from "./ProductFingerprintForm";
import ExtractedProductTruth from "./ExtractedProductTruth";
import ContinuityWorldPicker from "./ContinuityWorldPicker";

interface CampaignFormProps {
  onSubmit: (input: LookbookInput) => void;
  /** Pre-fill form with saved input when reopening a draft project. */
  initialInput?: LookbookInput;
  /** HTML form id. When set, the internal submit button is hidden so an external button can use form={formId}. */
  formId?: string;
  /** Project ID for blob lookups. */
  projectId: string;
  /** Product reference images (for auto-extraction). */
  productReferences: ReferenceAsset[];
  /** Existing extraction metadata from the project record. */
  fingerprintMeta?: FingerprintMeta;
  /** Called when extraction produces or updates metadata. */
  onFingerprintMetaChange: (meta: FingerprintMeta) => void;
}

const DEFAULT_INPUT: LookbookInput = {
  productFamily: "apparel",
  specificItem: "",
  genderPresentation: "menswear",
  targetStyle: "commercial",
  campaignGoal: "product_clarity",
  logoVisibilityPriority: "medium",
  creativityLevel: "balanced",
  shotCount: 6,
  notes: "",
};

export default function CampaignForm({
  onSubmit,
  initialInput,
  formId,
  projectId,
  productReferences,
  fingerprintMeta,
  onFingerprintMetaChange,
}: CampaignFormProps) {
  const [input, setInput] = useState<LookbookInput>(initialInput ?? DEFAULT_INPUT);

  // ── Vision extraction toggle ──
  // "extracted" = compact panel (default), "editing" = manual form
  const [fingerprintView, setFingerprintView] = useState<"extracted" | "editing">(
    fingerprintMeta?.source === "manual" ? "editing" : "extracted",
  );

  // ── Settings driver: tracks what is currently controlling goal/logo/creativity ──
  const [settingsDriver, setSettingsDriver] = useState<SettingsDriver>(() => {
    if (!initialInput) return "ai_recommended";
    const rec = getRecommendedSettings({
      productFamily: initialInput.productFamily,
      specificItem: initialInput.specificItem,
      genderPresentation: initialInput.genderPresentation,
      targetStyle: initialInput.targetStyle,
    });
    if (
      initialInput.campaignGoal === rec.campaignGoal &&
      initialInput.logoVisibilityPriority === rec.logoVisibilityPriority &&
      initialInput.creativityLevel === rec.creativityLevel
    ) {
      return "ai_recommended";
    }
    return "custom";
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();

  const [pendingRecommendation, setPendingRecommendation] = useState<RecommendedSettings | null>(null);

  const prevContextRef = useRef({
    productFamily: input.productFamily,
    specificItem: input.specificItem,
    targetStyle: input.targetStyle,
    genderPresentation: input.genderPresentation,
  });

  // ── Auto-apply or suggest recommendation when context changes ──
  useEffect(() => {
    const prev = prevContextRef.current;
    const contextChanged =
      prev.productFamily !== input.productFamily ||
      prev.specificItem !== input.specificItem ||
      prev.targetStyle !== input.targetStyle ||
      prev.genderPresentation !== input.genderPresentation;

    if (contextChanged) {
      const rec = getRecommendedSettings({
        productFamily: input.productFamily,
        specificItem: input.specificItem,
        genderPresentation: input.genderPresentation,
        targetStyle: input.targetStyle,
      });

      if (settingsDriver === "ai_recommended") {
        setInput(prev => ({
          ...prev,
          campaignGoal: rec.campaignGoal,
          logoVisibilityPriority: rec.logoVisibilityPriority,
          creativityLevel: rec.creativityLevel,
        }));
        setPendingRecommendation(null);
      } else {
        setPendingRecommendation(rec);
      }
    }

    prevContextRef.current = {
      productFamily: input.productFamily,
      specificItem: input.specificItem,
      targetStyle: input.targetStyle,
      genderPresentation: input.genderPresentation,
    };
  }, [input.productFamily, input.specificItem, input.targetStyle, input.genderPresentation, settingsDriver]);

  // ── Preset selection ──
  const handlePresetSelect = useCallback((defaults: Partial<LookbookInput>) => {
    setInput(prev => ({ ...prev, ...defaults }));
    setSettingsDriver("preset");
    setPendingRecommendation(null);
    const match = STARTER_PRESETS.find(
      (p) => JSON.stringify(p.defaults) === JSON.stringify(defaults)
    );
    setSelectedPresetId(match?.id);
  }, []);

  const handleClearPreset = useCallback(() => {
    setSelectedPresetId(undefined);
    setSettingsDriver("ai_recommended");
    const rec = getRecommendedSettings({
      productFamily: input.productFamily,
      specificItem: input.specificItem,
      genderPresentation: input.genderPresentation,
      targetStyle: input.targetStyle,
    });
    setInput(prev => ({
      ...prev,
      campaignGoal: rec.campaignGoal,
      logoVisibilityPriority: rec.logoVisibilityPriority,
      creativityLevel: rec.creativityLevel,
    }));
    setPendingRecommendation(null);
  }, [input.productFamily, input.specificItem, input.genderPresentation, input.targetStyle]);

  const handleApplyRecommendation = useCallback((rec: RecommendedSettings) => {
    setInput(prev => ({
      ...prev,
      campaignGoal: rec.campaignGoal,
      logoVisibilityPriority: rec.logoVisibilityPriority,
      creativityLevel: rec.creativityLevel,
    }));
    setSettingsDriver("ai_recommended");
    setSelectedPresetId(undefined);
    setPendingRecommendation(null);
  }, []);

  const handleKeepPreset = useCallback(() => {
    setPendingRecommendation(null);
  }, []);

  const handleGoalChange = useCallback((v: CampaignGoal) => {
    setInput(prev => ({ ...prev, campaignGoal: v }));
    setSettingsDriver(prev =>
      prev === "preset" || prev === "modified_preset" ? "modified_preset" : "custom"
    );
    setPendingRecommendation(null);
  }, []);

  const handleLogoChange = useCallback((v: LogoVisibilityPriority) => {
    setInput(prev => ({ ...prev, logoVisibilityPriority: v }));
    setSettingsDriver(prev =>
      prev === "preset" || prev === "modified_preset" ? "modified_preset" : "custom"
    );
    setPendingRecommendation(null);
  }, []);

  const handleCreativityChange = useCallback((v: CreativityLevel) => {
    setInput(prev => ({ ...prev, creativityLevel: v }));
    setSettingsDriver(prev =>
      prev === "preset" || prev === "modified_preset" ? "modified_preset" : "custom"
    );
    setPendingRecommendation(null);
  }, []);

  const handleFingerprintChange = useCallback((fp: ProductFingerprint | undefined) => {
    setInput(prev => ({ ...prev, productFingerprint: fp }));
  }, []);

  // ── Vision extractor: auto-extraction of product fingerprint ──

  const handleExtractedFingerprint = useCallback(
    (fp: ProductFingerprint, meta: FingerprintMeta) => {
      setInput((prev) => ({ ...prev, productFingerprint: fp }));
      onFingerprintMetaChange(meta);
    },
    [onFingerprintMetaChange],
  );

  const extractor = useVisionExtractor({
    projectId,
    family: input.productFamily,
    productReferences,
    currentFingerprint: input.productFingerprint,
    currentMeta: fingerprintMeta,
    onFingerprint: handleExtractedFingerprint,
    specificItem: input.specificItem || undefined,
  });

  // When user edits a field in the manual form after extraction, mark source as "edited"
  const handleManualFingerprintEdit = useCallback(
    (fp: ProductFingerprint | undefined) => {
      setInput((prev) => ({ ...prev, productFingerprint: fp }));
      if (fp && fingerprintMeta) {
        onFingerprintMetaChange({ ...fingerprintMeta, source: "edited" });
      }
    },
    [fingerprintMeta, onFingerprintMetaChange],
  );

  const handleWorldChange = useCallback((world: ContinuityWorldTokens | undefined) => {
    setInput(prev => ({ ...prev, continuityWorld: world }));
  }, []);

  const handleFamilyChange = useCallback((f: ProductFamily) => {
    setInput(prev => ({ ...prev, productFamily: f, specificItem: "", productFingerprint: undefined }));
  }, []);

  const handleItemChange = useCallback((item: string) => {
    setInput(prev => ({ ...prev, specificItem: item }));
  }, []);

  const handleStyleChange = useCallback((v: TargetStyle) => {
    setInput(prev => ({ ...prev, targetStyle: v }));
  }, []);

  const handleGenderChange = useCallback((v: GenderPresentation) => {
    setInput(prev => ({ ...prev, genderPresentation: v }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(input);
  };

  const activePreset = selectedPresetId
    ? STARTER_PRESETS.find(p => p.id === selectedPresetId)
    : undefined;

  return (
    <form onSubmit={handleSubmit} id={formId} className="space-y-8">
      {/* Creative Direction Presets */}
      <StarterPresetPicker
        onSelect={handlePresetSelect}
        onClear={handleClearPreset}
        selectedId={selectedPresetId}
        activePreset={activePreset}
      />

      {/* Divider with relationship explainer */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[--border-default]" />
          <span className="text-xs text-[--text-tertiary] uppercase tracking-wider">
            Campaign Details
          </span>
          <div className="flex-1 h-px bg-[--border-default]" />
        </div>
        <p className="text-xs text-[--text-tertiary] text-center">
          Your creative direction stays active unless you choose to apply the AI recommendation.
        </p>
      </div>

      {/* Product Selection */}
      <ProductSelector
        family={input.productFamily}
        specificItem={input.specificItem}
        onFamilyChange={handleFamilyChange}
        onItemChange={handleItemChange}
      />

      {/* Campaign Goals + Recommendation */}
      <CampaignGoalSelector
        goal={input.campaignGoal}
        style={input.targetStyle}
        gender={input.genderPresentation}
        logo={input.logoVisibilityPriority}
        creativity={input.creativityLevel}
        notes={input.notes || ""}
        productFamily={input.productFamily}
        specificItem={input.specificItem}
        settingsDriver={settingsDriver}
        selectedPresetId={selectedPresetId}
        pendingRecommendation={pendingRecommendation}
        onGoalChange={handleGoalChange}
        onStyleChange={handleStyleChange}
        onGenderChange={handleGenderChange}
        onLogoChange={handleLogoChange}
        onCreativityChange={handleCreativityChange}
        onNotesChange={(v: string) => setInput(prev => ({ ...prev, notes: v }))}
        onApplyRecommendation={handleApplyRecommendation}
        onKeepPreset={handleKeepPreset}
      />

      {/* F7: Product Fingerprint (vision extraction or manual) */}
      {fingerprintView === "extracted" ? (
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
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[--text-secondary] uppercase tracking-wider">
              Product Fingerprint
            </span>
            {extractor.fingerprint && (
              <button
                type="button"
                onClick={() => setFingerprintView("extracted")}
                className="text-[10px] px-2 py-1 rounded bg-[--surface-card] border border-[--border-default] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
              >
                Back to detected
              </button>
            )}
          </div>
          <ProductFingerprintForm
            family={input.productFamily}
            value={input.productFingerprint}
            onChange={handleManualFingerprintEdit}
          />
        </div>
      )}

      {/* F7: Continuity World */}
      <ContinuityWorldPicker
        value={input.continuityWorld}
        onChange={handleWorldChange}
      />

      {/* Submit (hidden when formId is set, allowing external submit button) */}
      {!formId && (
        <button
          type="submit"
          className="w-full bg-[--text-primary] text-[--text-inverted] font-medium py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Build Lookbook Plan
        </button>
      )}
    </form>
  );
}
