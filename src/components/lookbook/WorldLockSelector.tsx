"use client";

import { useCallback } from "react";
import type { WorldLockMode, WorldFamily } from "@/lib/lookbook/types";
import { WORLD_FAMILY_LABELS } from "@/lib/lookbook/worldProfiles";

interface WorldLockSelectorProps {
  value: WorldLockMode;
  onChange: (mode: WorldLockMode) => void;
  /** Family detected from styling reference (Gemini analysis). */
  detectedFamily?: WorldFamily;
  /** Family that auto mode would resolve to based on current style/objective/product. */
  contextFamily?: WorldFamily;
}

const LOCK_OPTIONS: { value: WorldLockMode; label: string; description: string }[] = [
  { value: "auto", label: "Auto", description: "" },
  { value: "studio_minimal", label: "Studio minimal", description: "Clean seamless backdrop, even lighting, no mood bias" },
  { value: "architectural_interior", label: "Architectural interior", description: "Plaster, stone, or concrete walls, window light, minimal props" },
  { value: "architectural_exterior", label: "Architectural exterior", description: "Facade, courtyard, or steps, diffused outdoor daylight" },
  { value: "furnished_interior", label: "Furnished interior", description: "Design-led interior with restrained furnishings, window light" },
  { value: "urban_exterior", label: "Urban exterior", description: "Weathered urban wall or facade, overcast outdoor light" },
  { value: "natural_exterior", label: "Natural exterior", description: "Restrained natural landscape, soft outdoor daylight" },
];

export default function WorldLockSelector({
  value,
  onChange,
  detectedFamily,
  contextFamily,
}: WorldLockSelectorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value as WorldLockMode);
    },
    [onChange],
  );

  // Which family auto mode will resolve to
  const resolvedAutoFamily = detectedFamily ?? contextFamily ?? "studio_minimal";
  const resolvedAutoLabel = WORLD_FAMILY_LABELS[resolvedAutoFamily];
  const resolvedAutoDescription = LOCK_OPTIONS.find((o) => o.value === resolvedAutoFamily)?.description || "";

  const autoLabel = detectedFamily
    ? `Auto from references (${resolvedAutoLabel.toLowerCase()})`
    : `Auto (${resolvedAutoLabel.toLowerCase()})`;

  // Show description for the selected option, or the auto-resolved description
  const selectedDescription = value === "auto"
    ? resolvedAutoDescription
    : LOCK_OPTIONS.find((o) => o.value === value)?.description || "";

  return (
    <div className="space-y-2">
      <div>
        <span className="text-xs font-medium text-[--text-secondary]">
          World
        </span>
        <p className="text-[10px] text-[--text-tertiary] mt-0.5">
          Visual environment for all shots. Use a lock to force a specific environment.
        </p>
      </div>

      <select
        value={value}
        onChange={handleChange}
        className="w-full text-sm bg-[--surface-inset] border border-[--border-subtle] rounded-lg px-3 py-2 text-[--text-primary] focus:outline-none focus:border-[--text-tertiary]"
      >
        <option value="auto">{autoLabel}</option>
        {LOCK_OPTIONS.filter((o) => o.value !== "auto").map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {selectedDescription && (
        <p className="text-[10px] text-[--text-tertiary]">
          {selectedDescription}
        </p>
      )}
    </div>
  );
}
