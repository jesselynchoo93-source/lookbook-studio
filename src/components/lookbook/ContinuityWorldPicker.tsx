"use client";

import { useState, useCallback } from "react";
import type { ContinuityWorldTokens } from "@/lib/lookbook/types";
import { WORLD_PRESETS } from "@/lib/lookbook/providerCompiler";

interface ContinuityWorldPickerProps {
  value?: ContinuityWorldTokens;
  onChange: (world: ContinuityWorldTokens | undefined) => void;
  /** When true, hides the model-only styling field (product refs provide styling context). */
  hasProductRefs?: boolean;
}

const PRESET_DESCRIPTIONS: Record<string, string> = {
  neutral_studio: "Clean, minimal. Even lighting, no mood bias.",
  warm_editorial: "Warm tones, directional light. Fashion editorial feel.",
  cool_modern: "Dark, cool tones. Architectural, contemporary.",
  natural_light: "Daylight, organic textures. Relaxed, approachable.",
};

export default function ContinuityWorldPicker({
  value,
  onChange,
  hasProductRefs,
}: ContinuityWorldPickerProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(() => {
    if (!value) return undefined;
    const match = WORLD_PRESETS.find(
      (p) =>
        p.tokens.backdrop === value.backdrop &&
        p.tokens.lighting === value.lighting,
    );
    return match?.id;
  });
  const [showOverrides, setShowOverrides] = useState(false);

  const handlePresetSelect = useCallback(
    (presetId: string) => {
      if (selectedPresetId === presetId) {
        // Deselect
        setSelectedPresetId(undefined);
        onChange(undefined);
        return;
      }
      const preset = WORLD_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setSelectedPresetId(presetId);
      onChange({ ...preset.tokens });
    },
    [selectedPresetId, onChange],
  );

  const handleOverrideField = useCallback(
    (field: keyof ContinuityWorldTokens, val: string) => {
      if (!value) return;
      onChange({ ...value, [field]: val });
    },
    [value, onChange],
  );

  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-medium text-[--text-secondary]">
          Continuity World
        </span>
        <p className="text-[10px] text-[--text-tertiary] mt-0.5">
          Environment and lighting for all shots. Auto-derived if not selected.
        </p>
      </div>

      {/* Preset cards */}
      <div className="grid grid-cols-2 gap-2">
        {WORLD_PRESETS.map((preset) => {
          const isActive = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                isActive
                  ? "border-[--text-tertiary] bg-[--surface-inset]"
                  : "border-[--border-subtle] hover:border-[--border-default] bg-transparent"
              }`}
            >
              <span
                className={`text-[11px] font-medium block ${
                  isActive ? "text-[--text-primary]" : "text-[--text-secondary]"
                }`}
              >
                {preset.label}
              </span>
              <span className="text-[10px] text-[--text-tertiary] block mt-0.5">
                {PRESET_DESCRIPTIONS[preset.id] || ""}
              </span>
            </button>
          );
        })}
      </div>

      {/* Styling field: hidden when product refs exist (product refs provide styling context) */}
      {value && !hasProductRefs && (
        <div>
          <label className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1">
            Styling (model-only reference)
          </label>
          <input
            type="text"
            className="w-full text-xs bg-[--surface-inset] border border-[--border-subtle] rounded-lg px-3 py-1.5 text-[--text-primary] placeholder-[--text-tertiary]"
            placeholder="charcoal wool overcoat, black turtleneck, dark trousers..."
            value={value.styling || ""}
            onChange={(e) => handleOverrideField("styling", e.target.value)}
          />
        </div>
      )}

      {/* Override toggle */}
      {value && (
        <div>
          <button
            type="button"
            onClick={() => setShowOverrides(!showOverrides)}
            className="text-[10px] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
          >
            {showOverrides ? "Hide" : "Override"} individual fields
          </button>

          {showOverrides && (
            <div className="mt-2 space-y-2">
              <OverrideField
                label="Backdrop"
                value={value.backdrop}
                onChange={(v) => handleOverrideField("backdrop", v)}
              />
              <OverrideField
                label="Lighting"
                value={value.lighting}
                onChange={(v) => handleOverrideField("lighting", v)}
              />
              <OverrideField
                label="Tonal Temperature"
                value={value.tonalTemperature}
                onChange={(v) => handleOverrideField("tonalTemperature", v)}
              />
              <OverrideField
                label="Model Tokens"
                value={value.modelTokens || ""}
                placeholder="Additional model direction..."
                onChange={(v) => handleOverrideField("modelTokens", v)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OverrideField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1">
        {label}
      </label>
      <input
        type="text"
        className="w-full text-xs bg-[--surface-inset] border border-[--border-default] rounded-lg px-3 py-1.5 text-[--text-primary] placeholder-[--text-tertiary]"
        placeholder={placeholder || ""}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
