"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  LookbookInput,
  ProductFamily,
  PrimaryObjective,
  SecondaryEmphasis,
  TargetStyle,
  GenderPresentation,
  BrandVisibility,
  PoseDirection,
  SettingsDriver,
  ProductFingerprint,
  ExtractedWorldTokens,
  WorldLockMode,
} from "@/lib/lookbook/types";
import type { RecommendedSettings } from "@/lib/lookbook/recommendSettings";
import { getRecommendedSettings } from "@/lib/lookbook/recommendSettings";
import { inferWorldFamily, inferFamilyFromContext } from "@/lib/lookbook/worldProfiles";
import ProductSelector from "./ProductSelector";
import CampaignGoalSelector from "./CampaignGoalSelector";
import ProductFingerprintForm from "./ProductFingerprintForm";
import WorldLockSelector from "./WorldLockSelector";

/** Classification result from the lightweight product classifier. */
export interface ClassifiedProduct {
  family: ProductFamily;
  specificItem: string;
  genderPresentation?: GenderPresentation;
  targetStyle?: TargetStyle;
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
  /** Extracted world tokens from styling reference analysis. */
  extractedWorld?: ExtractedWorldTokens;
  /** Auto-fill notes (brand guidelines) from styling analysis. */
  brandGuidelines?: string;
}

const DEFAULT_INPUT: LookbookInput = (() => {
  const rec = getRecommendedSettings({ productFamily: "apparel", specificItem: "" });
  return {
    productFamily: "apparel" as ProductFamily,
    specificItem: "",
    genderPresentation: rec.genderPresentation,
    targetStyle: rec.targetStyle,
    primaryObjective: rec.primaryObjective,
    secondaryEmphasis: rec.secondaryEmphasis,
    brandVisibility: rec.brandVisibility,
    poseDirection: rec.poseDirection,
    shotCount: 6,
    notes: "",
  };
})();

export default function CampaignForm({
  onSubmit,
  initialInput,
  formId,
  onInputChange,
  hasProductRefs,
  classifiedProduct,
  extractedWorld,
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
      ...(classifiedProduct.genderPresentation && { genderPresentation: classifiedProduct.genderPresentation }),
      ...(classifiedProduct.targetStyle && { targetStyle: classifiedProduct.targetStyle }),
      productFingerprint: undefined, // reset fingerprint when family changes
    }));
  }, [classifiedProduct]);

  // ── Auto-fill extractedWorld from styling analysis ──
  const prevExtractedWorldRef = useRef<ExtractedWorldTokens | undefined>(undefined);
  useEffect(() => {
    if (!extractedWorld) return;
    if (prevExtractedWorldRef.current === extractedWorld) return;
    prevExtractedWorldRef.current = extractedWorld;
    setInput(prev => ({ ...prev, extractedWorld }));
  }, [extractedWorld]);

  // ── Auto-fill notes (brand guidelines) from styling analysis ──
  const prevBrandGuidelinesRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (brandGuidelines === undefined) return;
    if (prevBrandGuidelinesRef.current === brandGuidelines) return;
    prevBrandGuidelinesRef.current = brandGuidelines;
    setInput(prev => ({ ...prev, notes: brandGuidelines }));
  }, [brandGuidelines]);

  // ── Settings driver: tracks what is currently controlling all campaign settings ──
  const [settingsDriver, setSettingsDriver] = useState<SettingsDriver>(() => {
    if (!initialInput) return "ai_recommended";
    const rec = getRecommendedSettings({
      productFamily: initialInput.productFamily,
      specificItem: initialInput.specificItem,
    });
    if (
      initialInput.primaryObjective === rec.primaryObjective &&
      initialInput.brandVisibility === rec.brandVisibility &&
      initialInput.poseDirection === rec.poseDirection &&
      initialInput.secondaryEmphasis === rec.secondaryEmphasis &&
      initialInput.genderPresentation === rec.genderPresentation &&
      initialInput.targetStyle === rec.targetStyle
    ) {
      return "ai_recommended";
    }
    return "custom";
  });

  const [pendingRecommendation, setPendingRecommendation] = useState<RecommendedSettings | null>(null);

  const prevContextRef = useRef({
    productFamily: input.productFamily,
    specificItem: input.specificItem,
  });

  // ── Auto-apply or suggest recommendation when product context changes ──
  useEffect(() => {
    const prev = prevContextRef.current;
    const contextChanged =
      prev.productFamily !== input.productFamily ||
      prev.specificItem !== input.specificItem;

    if (contextChanged) {
      // When auto mode, don't pass current gender/style so the engine derives fresh ones
      const rec = settingsDriver === "ai_recommended"
        ? getRecommendedSettings({
            productFamily: input.productFamily,
            specificItem: input.specificItem,
          })
        : getRecommendedSettings({
            productFamily: input.productFamily,
            specificItem: input.specificItem,
            genderPresentation: input.genderPresentation,
            targetStyle: input.targetStyle,
          });

      if (settingsDriver === "ai_recommended") {
        setInput(prev => ({
          ...prev,
          genderPresentation: rec.genderPresentation,
          targetStyle: rec.targetStyle,
          primaryObjective: rec.primaryObjective,
          secondaryEmphasis: rec.secondaryEmphasis,
          brandVisibility: rec.brandVisibility,
          poseDirection: rec.poseDirection,
        }));
        setPendingRecommendation(null);
      } else {
        setPendingRecommendation(rec);
      }
    }

    prevContextRef.current = {
      productFamily: input.productFamily,
      specificItem: input.specificItem,
    };
  }, [input.productFamily, input.specificItem, input.genderPresentation, input.targetStyle, settingsDriver]);

  const handleApplyRecommendation = useCallback((rec: RecommendedSettings) => {
    setInput(prev => ({
      ...prev,
      genderPresentation: rec.genderPresentation,
      targetStyle: rec.targetStyle,
      primaryObjective: rec.primaryObjective,
      secondaryEmphasis: rec.secondaryEmphasis,
      brandVisibility: rec.brandVisibility,
      poseDirection: rec.poseDirection,
    }));
    setSettingsDriver("ai_recommended");
    setPendingRecommendation(null);
  }, []);

  const handleDismissRecommendation = useCallback(() => {
    setPendingRecommendation(null);
  }, []);

  const handleObjectiveChange = useCallback((v: PrimaryObjective) => {
    setInput(prev => ({ ...prev, primaryObjective: v }));
    setSettingsDriver("custom");
    setPendingRecommendation(null);
  }, []);

  const handleEmphasisChange = useCallback((v: SecondaryEmphasis | undefined) => {
    setInput(prev => ({ ...prev, secondaryEmphasis: v }));
    setSettingsDriver("custom");
    setPendingRecommendation(null);
  }, []);

  const handleBrandVisibilityChange = useCallback((v: BrandVisibility) => {
    setInput(prev => ({ ...prev, brandVisibility: v }));
    setSettingsDriver("custom");
    setPendingRecommendation(null);
  }, []);

  const handlePoseDirectionChange = useCallback((v: PoseDirection) => {
    setInput(prev => ({ ...prev, poseDirection: v }));
    setSettingsDriver("custom");
    setPendingRecommendation(null);
  }, []);

  const handleFingerprintChange = useCallback((fp: ProductFingerprint | undefined) => {
    setInput(prev => ({ ...prev, productFingerprint: fp }));
  }, []);

  const handleWorldLockChange = useCallback((mode: WorldLockMode) => {
    setInput(prev => ({ ...prev, worldLockMode: mode }));
  }, []);

  const handleFamilyChange = useCallback((f: ProductFamily) => {
    setInput(prev => ({ ...prev, productFamily: f, specificItem: "", productFingerprint: undefined }));
  }, []);

  const handleItemChange = useCallback((item: string) => {
    setInput(prev => ({ ...prev, specificItem: item }));
  }, []);

  const handleStyleChange = useCallback((v: TargetStyle) => {
    setInput(prev => ({ ...prev, targetStyle: v }));
    setSettingsDriver("custom");
    setPendingRecommendation(null);
  }, []);

  const handleGenderChange = useCallback((v: GenderPresentation) => {
    setInput(prev => ({ ...prev, genderPresentation: v }));
    setSettingsDriver("custom");
    setPendingRecommendation(null);
  }, []);

  // Notify parent of input changes (family, item, fingerprint)
  useEffect(() => {
    onInputChange?.(input);
  }, [input, onInputChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} id={formId} className="space-y-8">
      {/* Product Selection */}
      <ProductSelector
        family={input.productFamily}
        specificItem={input.specificItem}
        onFamilyChange={handleFamilyChange}
        onItemChange={handleItemChange}
      />

      {/* Campaign Goals + Recommendation */}
      <CampaignGoalSelector
        objective={input.primaryObjective}
        emphasis={input.secondaryEmphasis}
        style={input.targetStyle}
        gender={input.genderPresentation}
        brandVisibility={input.brandVisibility}
        poseDirection={input.poseDirection}
        productFamily={input.productFamily}
        specificItem={input.specificItem}
        settingsDriver={settingsDriver}
        pendingRecommendation={pendingRecommendation}
        onObjectiveChange={handleObjectiveChange}
        onEmphasisChange={handleEmphasisChange}
        onStyleChange={handleStyleChange}
        onGenderChange={handleGenderChange}
        onBrandVisibilityChange={handleBrandVisibilityChange}
        onPoseDirectionChange={handlePoseDirectionChange}
        onApplyRecommendation={handleApplyRecommendation}
        onDismissRecommendation={handleDismissRecommendation}
      />

      {/* F7: Product Fingerprint (only shown when no auto-extraction) */}
      {!hasProductRefs && (
        <ProductFingerprintForm
          family={input.productFamily}
          value={input.productFingerprint}
          onChange={handleFingerprintChange}
        />
      )}

      {/* World Lock Selector (always visible) */}
      <WorldLockSelector
        value={input.worldLockMode ?? "auto"}
        onChange={handleWorldLockChange}
        detectedFamily={extractedWorld ? inferWorldFamily(extractedWorld).family : undefined}
        contextFamily={inferFamilyFromContext(input)}
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
