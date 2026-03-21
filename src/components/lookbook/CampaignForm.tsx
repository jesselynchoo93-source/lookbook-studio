"use client";

import { useState } from "react";
import type { LookbookInput, ProductFamily, CampaignGoal, TargetStyle, GenderPresentation, LogoVisibilityPriority, CreativityLevel } from "@/lib/lookbook/types";
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

  const handlePresetSelect = (defaults: Partial<LookbookInput>) => {
    setInput(prev => ({ ...prev, ...defaults }));
    const match = STARTER_PRESETS.find(
      (p) => JSON.stringify(p.defaults) === JSON.stringify(defaults)
    );
    setSelectedPresetId(match?.id);
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
        onFamilyChange={(f: ProductFamily) =>
          setInput(prev => ({ ...prev, productFamily: f, specificItem: "" }))
        }
        onItemChange={(item: string) =>
          setInput(prev => ({ ...prev, specificItem: item }))
        }
      />

      {/* Campaign Goals */}
      <CampaignGoalSelector
        goal={input.campaignGoal}
        style={input.targetStyle}
        gender={input.genderPresentation}
        logo={input.logoVisibilityPriority}
        creativity={input.creativityLevel}
        notes={input.notes || ""}
        onGoalChange={(v: CampaignGoal) =>
          setInput(prev => ({ ...prev, campaignGoal: v }))
        }
        onStyleChange={(v: TargetStyle) =>
          setInput(prev => ({ ...prev, targetStyle: v }))
        }
        onGenderChange={(v: GenderPresentation) =>
          setInput(prev => ({ ...prev, genderPresentation: v }))
        }
        onLogoChange={(v: LogoVisibilityPriority) =>
          setInput(prev => ({ ...prev, logoVisibilityPriority: v }))
        }
        onCreativityChange={(v: CreativityLevel) =>
          setInput(prev => ({ ...prev, creativityLevel: v }))
        }
        onNotesChange={(v: string) =>
          setInput(prev => ({ ...prev, notes: v }))
        }
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
