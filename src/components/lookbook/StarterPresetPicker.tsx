"use client";

import type { StarterPreset, LookbookInput } from "@/lib/lookbook/types";
import { STARTER_PRESETS } from "@/lib/lookbook/starterPresets";

interface StarterPresetPickerProps {
  onSelect: (defaults: Partial<LookbookInput>) => void;
  selectedId?: string;
}

export default function StarterPresetPicker({
  onSelect,
  selectedId,
}: StarterPresetPickerProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">
        Quick Start: Choose a Preset
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Pick a starting point, then customise the details below. Or skip presets and fill in the form directly.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {STARTER_PRESETS.map((preset: StarterPreset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.defaults)}
            className={`text-left p-3 rounded-lg border transition-all ${
              selectedId === preset.id
                ? "border-white bg-gray-800"
                : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
            }`}
          >
            <span className="block text-sm font-medium text-white mb-1">
              {preset.label}
            </span>
            <span className="block text-xs text-gray-400 leading-relaxed">
              {preset.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
