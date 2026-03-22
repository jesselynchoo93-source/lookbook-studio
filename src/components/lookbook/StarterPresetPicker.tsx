"use client";

import type { StarterPreset, LookbookInput } from "@/lib/lookbook/types";
import { STARTER_PRESETS } from "@/lib/lookbook/starterPresets";

interface StarterPresetPickerProps {
  onSelect: (defaults: Partial<LookbookInput>) => void;
  onClear: () => void;
  selectedId?: string;
  activePreset?: StarterPreset;
}

export default function StarterPresetPicker({
  onSelect,
  onClear,
  selectedId,
  activePreset,
}: StarterPresetPickerProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-gray-400">
          Choose a Creative Direction
        </h3>
        {selectedId && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Presets define the overall direction of your lookbook. Your product details can refine the exact settings afterward.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {STARTER_PRESETS.map((preset: StarterPreset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.defaults)}
            className={`text-left p-3 rounded-lg border transition-all ${
              selectedId === preset.id
                ? "border-white bg-gray-800 ring-1 ring-white/20"
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

      {/* Preset explanation panel: shows what the active preset biases */}
      {activePreset && (
        <div className="mt-4 bg-gray-800/60 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            What &ldquo;{activePreset.label}&rdquo; biases
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div>
              <span className="text-gray-500">Shot mix: </span>
              <span className="text-gray-300">{activePreset.explanation.shotMix}</span>
            </div>
            <div>
              <span className="text-gray-500">Branding: </span>
              <span className="text-gray-300">{activePreset.explanation.brandingPriority}</span>
            </div>
            <div>
              <span className="text-gray-500">Creativity: </span>
              <span className="text-gray-300">{activePreset.explanation.creativityPosture}</span>
            </div>
            <div>
              <span className="text-gray-500">Balance: </span>
              <span className="text-gray-300">{activePreset.explanation.balance}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
