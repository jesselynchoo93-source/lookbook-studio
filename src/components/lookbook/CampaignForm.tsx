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
} from "@/lib/lookbook/types";
import type { RecommendedSettings } from "@/lib/lookbook/recommendSettings";
import { getRecommendedSettings } from "@/lib/lookbook/recommendSettings";
import { STARTER_PRESETS } from "@/lib/lookbook/starterPresets";
import StarterPresetPicker from "./StarterPresetPicker";
import ProductSelector from "./ProductSelector";
import CampaignGoalSelector from "./CampaignGoalSelector";
import ProductFingerprintForm from "./ProductFingerprintForm";
import ContinuityWorldPicker from "./ContinuityWorldPicker";

/** Classification result from the lightweight product classifier. */
export interface ClassifiedProduct {
  family: ProductFamily;
  specificItem: string;
}

interface CampaignFormProps {
  onSubmit: (input: LookbookInput) => void;
  /** Pre-fill form with saved input when reopening a draft project. */
  initialInput?: LookbookInput;
  /** HTML form id. When set, the internal submit button is hidden so an external button can use form={formId}. */
  formId?: string;
  /** Called whenever the form input changes (for parent components that need live family/item). */
  onInputChange?: (input: LookbookInput) => void;
  /** When true, hides model-only styling field in Continuity World (product refs provide context). */
  hasProductRefs?: boolean;
  /** Auto-fill family and item from image classification. Updates form when changed. */
  classifiedProduct?: ClassifiedProduct;
  /** Auto-fill Continuity World from styling analysis. */
  autoWorld?: ContinuityWorldTokens;
  /** Auto-fill notes (brand guidelines) from styling analysis. */
  brandGuidelines?: string;
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
  onInputChange,
  hasProductRefs,
  classifiedProduct,
  autoWorld,
  brandGuidelines,
}: CampaignFormProps) {
  const [input, setInput] = useState<LookbookInput>(initialInput ?? DEFAULT_INPUT);

  // ── Auto-fill from image classification ──
  const prevClassifiedRef = useRef<ClassifiedProduct | undefined>(undefined);
  useEffect(() => {
    if (!classifiedProduct) return;
    if (
      prevClassifiedRef.current?.family === classifiedProduct.family &&
      prevClassifiedRef.current?.specificItem === classifiedProduct.specificItem
    ) return;
    prevClassifiedRef.current = classifiedProduct;
    setInput(prev => ({
      ...prev,
      productFamily: classifiedProduct.family,
      specificItem: classifiedProduct.specificItem,
      productFingerprint: undefined, // reset fingerprint when family changes
    }));
  }, [classifiedProduct]);

  // ── Auto-fill Continuity World from styling analysis ──
  const prevAutoWorldRef = useRef<ContinuityWorldTokens | undefined>(undefined);
  useEffect(() => {
    if (!autoWorld) return;
    if (prevAutoWorldRef.current === autoWorld) return;
    prevAutoWorldRef.current = autoWorld;
    setInput(prev => ({ ...prev, continuityWorld: autoWorld }));
  }, [autoWorld]);

  // ── Auto-fill notes (brand guidelines) from styling analysis ──
  const prevBrandGuidelinesRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (brandGuidelines === undefined) return;
    if (prevBrandGuidelinesRef.current === brandGuidelines) return;
    prevBrandGuidelinesRef.current = brandGuidelines;
    setInput(prev => ({ ...prev, notes: brandGuidelines }));
  }, [brandGuidelines]);

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

  // Notify parent of input changes (family, item, fingerprint)
  useEffect(() => {
    onInputChange?.(input);
  }, [input, onInputChange]);

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
        onApplyRecommendation={handleApplyRecommendation}
        onKeepPreset={handleKeepPreset}
      />

      {/* F7: Product Fingerprint (only shown when no auto-extraction) */}
      {!hasProductRefs && (
        <ProductFingerprintForm
          family={input.productFamily}
          value={input.productFingerprint}
          onChange={handleFingerprintChange}
        />
      )}

      {/* F7: Continuity World (only shown when no auto-fill from styling) */}
      {!autoWorld && (
        <ContinuityWorldPicker
          value={input.continuityWorld}
          onChange={handleWorldChange}
          hasProductRefs={hasProductRefs}
        />
      )}

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
