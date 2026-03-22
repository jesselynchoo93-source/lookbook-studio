"use client";

import { useState, useEffect, useRef } from "react";
import type { LookbookInput, ProductFamily, CampaignGoal, TargetStyle, GenderPresentation, LogoVisibilityPriority, CreativityLevel } from "@/lib/lookbook/types";
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
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();

  // Track whether the user has manually changed goal/logo/creativity
  // Once they have, we stop auto-applying recommendations on context changes.
  const [hasManualOverride, setHasManualOverride] = useState(false);

  // Track the context keys that drive recommendations (for auto-apply on change)
  const prevContextRef = useRef({
    productFamily: input.productFamily,
    specificItem: input.specificItem,
    targetStyle: input.targetStyle,
    genderPresentation: input.genderPresentation,
  });

  // Auto-apply recommendation when context changes (unless user has manually overridden)
  useEffect(() => {
    const prev = prevContextRef.current;
    const contextChanged =
      prev.productFamily !== input.productFamily ||
      prev.specificItem !== input.specificItem ||
      prev.targetStyle !== input.targetStyle ||
      prev.genderPresentation !== input.genderPresentation;

    if (contextChanged && !hasManualOverride) {
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
    }

    prevContextRef.current = {
      productFamily: input.productFamily,
      specificItem: input.specificItem,
      targetStyle: input.targetStyle,
      genderPresentation: input.genderPresentation,
    };
  }, [input.productFamily, input.specificItem, input.targetStyle, input.genderPresentation, hasManualOverride]);

  const handlePresetSelect = (defaults: Partial<LookbookInput>) => {
    setInput(prev => ({ ...prev, ...defaults }));
    setHasManualOverride(false); // Presets reset manual override
    const match = STARTER_PRESETS.find(
      (p) => JSON.stringify(p.defaults) === JSON.stringify(defaults)
    );
    setSelectedPresetId(match?.id);
  };

  const handleApplyRecommendation = (rec: RecommendedSettings) => {
    setInput(prev => ({
      ...prev,
      campaignGoal: rec.campaignGoal,
      logoVisibilityPriority: rec.logoVisibilityPriority,
      creativityLevel: rec.creativityLevel,
    }));
    setHasManualOverride(false); // Explicitly applying recommendation resets override
  };

  // When the user manually changes goal/logo/creativity, mark as overridden
  const handleGoalChange = (v: CampaignGoal) => {
    setInput(prev => ({ ...prev, campaignGoal: v }));
    setHasManualOverride(true);
    setSelectedPresetId(undefined);
  };
  const handleLogoChange = (v: LogoVisibilityPriority) => {
    setInput(prev => ({ ...prev, logoVisibilityPriority: v }));
    setHasManualOverride(true);
    setSelectedPresetId(undefined);
  };
  const handleCreativityChange = (v: CreativityLevel) => {
    setInput(prev => ({ ...prev, creativityLevel: v }));
    setHasManualOverride(true);
    setSelectedPresetId(undefined);
  };

  // Context changes (product, item, style, gender) do NOT set manual override
  const handleFamilyChange = (f: ProductFamily) => {
    setInput(prev => ({ ...prev, productFamily: f, specificItem: "" }));
    setSelectedPresetId(undefined);
  };
  const handleItemChange = (item: string) => {
    setInput(prev => ({ ...prev, specificItem: item }));
    setSelectedPresetId(undefined);
  };
  const handleStyleChange = (v: TargetStyle) => {
    setInput(prev => ({ ...prev, targetStyle: v }));
    setSelectedPresetId(undefined);
  };
  const handleGenderChange = (v: GenderPresentation) => {
    setInput(prev => ({ ...prev, genderPresentation: v }));
    setSelectedPresetId(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Starter Presets */}
      <StarterPresetPicker
        onSelect={handlePresetSelect}
        selectedId={selectedPresetId}
      />

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          Campaign Details
        </span>
        <div className="flex-1 h-px bg-gray-700" />
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
        hasManualOverride={hasManualOverride}
        onGoalChange={handleGoalChange}
        onStyleChange={handleStyleChange}
        onGenderChange={handleGenderChange}
        onLogoChange={handleLogoChange}
        onCreativityChange={handleCreativityChange}
        onNotesChange={(v: string) => setInput(prev => ({ ...prev, notes: v }))}
        onApplyRecommendation={handleApplyRecommendation}
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
