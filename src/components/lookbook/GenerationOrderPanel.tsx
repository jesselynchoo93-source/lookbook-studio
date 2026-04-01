"use client";

import { SHOT_CATEGORY_LABELS } from "@/lib/lookbook/types";
import type { RecommendedShot } from "@/lib/lookbook/types";

interface GenerationOrderPanelProps {
  shots: RecommendedShot[];
  generationOrder: number[];
}

export default function GenerationOrderPanel({
  shots,
  generationOrder,
}: GenerationOrderPanelProps) {
  const firstThree = generationOrder.slice(0, 3);
  const remaining = generationOrder.slice(3);

  const getShotByPosition = (pos: number) =>
    shots.find((s) => s.position === pos);

  return (
    <div
      className="bg-[--surface-card] rounded-xl p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-sm font-medium text-[--text-primary] mb-1">
        Recommended Generation Order
      </h3>
      <p className="text-xs text-[--text-tertiary] mb-4">
        Generate the safest anchor shots first to validate your setup. Then move
        to editorial and motion variations.
      </p>

      <div className="space-y-3">
        {/* First three */}
        <div>
          <span className="text-xs font-medium text-[--phase-anchor] uppercase tracking-wider">
            Generate First (Anchors)
          </span>
          <div className="mt-2 space-y-1.5">
            {firstThree.map((pos) => {
              const shot = getShotByPosition(pos);
              if (!shot) return null;
              return (
                <div
                  key={pos}
                  className="flex items-center gap-3 bg-[--accent-soft] border border-[--phase-anchor]/20 rounded-lg px-3 py-2"
                >
                  <span className="text-xs font-mono text-[--phase-anchor]">
                    #{shot.position}
                  </span>
                  <span className="text-sm text-[--text-primary]">
                    {shot.resolvedTitle ?? shot.archetype.title}
                  </span>
                  <span className="text-xs text-[--text-tertiary] ml-auto">
                    {SHOT_CATEGORY_LABELS[shot.archetype.shotCategory]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remaining */}
        {remaining.length > 0 && (
          <div>
            <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
              Then Generate
            </span>
            <div className="mt-2 space-y-1.5">
              {remaining.map((pos) => {
                const shot = getShotByPosition(pos);
                if (!shot) return null;
                return (
                  <div
                    key={pos}
                    className="flex items-center gap-3 bg-[--surface-inset] border border-[--border-subtle] rounded-lg px-3 py-2"
                  >
                    <span className="text-xs font-mono text-[--text-tertiary]">
                      #{shot.position}
                    </span>
                    <span className="text-sm text-[--text-primary]">
                      {shot.resolvedTitle ?? shot.archetype.title}
                    </span>
                    <span className="text-xs text-[--text-tertiary] ml-auto">
                      {SHOT_CATEGORY_LABELS[shot.archetype.shotCategory]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-[--text-tertiary]">
        Anchors are the safest shots with the highest Higgsfield reliability.
        Starting with these validates your model, lighting, and garment
        rendering before attempting more creative variations.
      </div>
    </div>
  );
}
