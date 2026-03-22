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
        <h3 className="text-sm font-medium text-[--text-secondary]">
          Choose a Creative Direction
        </h3>
        {selectedId && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>
      <p className="text-xs text-[--text-tertiary] mb-4">
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
                ? "border-[--text-primary] bg-[--surface-card] ring-1 ring-[--text-primary]/20"
                : "border-[--border-default] bg-[--surface-card] hover:border-[--text-tertiary]"
            }`}
            style={{ boxShadow: selectedId === preset.id ? "var(--shadow-card-active)" : "var(--shadow-card)" }}
          >
            <span className="flex items-center gap-1.5 mb-1">
              <span className="text-sm font-medium text-[--text-primary]">
                {preset.label}
              </span>
              {preset.id === "balanced_lookbook" && (
                <span className="text-[10px] text-[--accent] bg-[--accent-soft] px-1.5 py-0.5 rounded-full">
                  Recommended
                </span>
              )}
            </span>
            <span className="block text-xs text-[--text-secondary] leading-relaxed">
              {preset.description}
            </span>
          </button>
        ))}
      </div>

      {/* Preset explanation: compact inline summary */}
      {activePreset && (
        <div className="mt-3 bg-[--surface-inset] rounded-lg px-4 py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div>
              <span className="text-[--text-tertiary]">Shots: </span>
              <span className="text-[--text-primary]">{activePreset.explanation.shotMix}</span>
            </div>
            <div>
              <span className="text-[--text-tertiary]">Branding: </span>
              <span className="text-[--text-primary]">{activePreset.explanation.brandingPriority}</span>
            </div>
            <div>
              <span className="text-[--text-tertiary]">Creativity: </span>
              <span className="text-[--text-primary]">{activePreset.explanation.creativityPosture}</span>
            </div>
            <div>
              <span className="text-[--text-tertiary]">Balance: </span>
              <span className="text-[--text-primary]">{activePreset.explanation.balance}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
