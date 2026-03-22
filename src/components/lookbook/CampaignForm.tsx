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
} from "@/lib/lookbook/types";
import type { RecommendedSettings } from "@/lib/lookbook/recommendSettings";
import { getRecommendedSettings } from "@/lib/lookbook/recommendSettings";
import { STARTER_PRESETS } from "@/lib/lookbook/starterPresets";
import StarterPresetPicker from "./StarterPresetPicker";
import ProductSelector from "./ProductSelector";
import CampaignGoalSelector from "./CampaignGoalSelector";

interface CampaignFormProps {
  onSubmit: (input: LookbookInput) => void;
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

export default function CampaignForm({ onSubmit }: CampaignFormProps) {
  const [input, setInput] = useState<LookbookInput>(DEFAULT_INPUT);

  // ── Settings driver: tracks what is currently controlling goal/logo/creativity ──
  // "preset"           = user selected a creative direction
  // "ai_recommended"   = AI auto-applied based on product/style
  // "custom"           = user manually edited without a preset base
  // "modified_preset"  = user started from a preset then changed something
  const [settingsDriver, setSettingsDriver] = useState<SettingsDriver>("ai_recommended");
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();

  // When a preset is active and product changes, the recommendation becomes a
  // pending suggestion rather than auto-applying. This stores it.
  const [pendingRecommendation, setPendingRecommendation] = useState<RecommendedSettings | null>(null);

  // Track the context keys that drive recommendations (for detecting changes)
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
        // No preset active, no manual edits: auto-apply freely
        setInput(prev => ({
          ...prev,
          campaignGoal: rec.campaignGoal,
          logoVisibilityPriority: rec.logoVisibilityPriority,
          creativityLevel: rec.creativityLevel,
        }));
        setPendingRecommendation(null);
      } else {
        // Preset, custom, or modified_preset active: show as suggestion, don't override
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

  // ── Clear preset (deselect) ──
  const handleClearPreset = useCallback(() => {
    setSelectedPresetId(undefined);
    setSettingsDriver("ai_recommended");
    // Auto-apply current recommendation
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

  // ── Apply recommendation (user clicks "Apply recommendation") ──
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

  // ── Keep preset (dismiss the pending recommendation) ──
  const handleKeepPreset = useCallback(() => {
    setPendingRecommendation(null);
  }, []);

  // ── Manual edits to goal/logo/creativity ──
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

  // ── Context changes (product, item, style, gender) ──
  // These do NOT change the driver directly; the useEffect above handles the logic.
  const handleFamilyChange = useCallback((f: ProductFamily) => {
    setInput(prev => ({ ...prev, productFamily: f, specificItem: "" }));
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

  // Find the active preset object for explanation display
  const activePreset = selectedPresetId
    ? STARTER_PRESETS.find(p => p.id === selectedPresetId)
    : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            Campaign Details
          </span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>
        <p className="text-xs text-gray-500 text-center">
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

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-white text-gray-900 font-medium py-3 rounded-lg hover:bg-gray-100 transition-colors"
      >
        Build Lookbook Plan
      </button>
    </form>
  );
}
