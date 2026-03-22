"use client";

import { useState } from "react";
import type {
  LookbookPlanResult,
  ReferenceAsset,
  ReferenceType,
} from "@/lib/lookbook/types";
import ReferenceStrip from "./ReferenceStrip";

interface ReferenceDrawerProps {
  result: LookbookPlanResult;
  references: {
    model: ReferenceAsset[];
    product: ReferenceAsset[];
    styling: ReferenceAsset[];
  };
  onAddReferences: (type: ReferenceType, files: File[]) => void;
  onRemoveReference: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

export default function ReferenceDrawer({
  result,
  references,
  onAddReferences,
  onRemoveReference,
  onSetPrimary,
}: ReferenceDrawerProps) {
  const [open, setOpen] = useState(false);

  const hasRefs =
    references.model.length > 0 ||
    references.product.length > 0 ||
    references.styling.length > 0;

  return (
    <div className="w-64 shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors flex items-center justify-between py-2"
      >
        <span>Reference &amp; Context</span>
        <span className="text-[10px]">{open ? "\u25B2" : "\u25BC"}</span>
      </button>

      {open && (
        <div className="space-y-4 mt-2">
          {/* References */}
          {hasRefs && (
            <div>
              <ReferenceStrip
                model={references.model}
                product={references.product}
                styling={references.styling}
                onAdd={onAddReferences}
                onRemove={onRemoveReference}
                onSetPrimary={onSetPrimary}
              />
            </div>
          )}

          {/* Compact DNA */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-[--text-tertiary] uppercase tracking-wider">
              Campaign Direction
            </span>
            <p className="text-xs text-[--text-secondary]">
              {result.dna.targetStyle} &middot; {result.dna.campaignGoal.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-[--text-tertiary]">
              {result.dna.creativityLevel} creativity &middot; Logo: {result.dna.logoVisibilityPriority}
            </p>
          </div>

          {/* Generation order */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-[--text-tertiary] uppercase tracking-wider">
              Generation Order
            </span>
            <div className="flex flex-wrap gap-1">
              {result.generationOrder.map((pos, i) => {
                const shot = result.shots.find((s) => s.position === pos);
                return (
                  <span
                    key={pos}
                    className="text-[10px] text-[--text-secondary] bg-[--surface-inset] px-1.5 py-0.5 rounded"
                  >
                    {i + 1}. #{pos}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Coverage summary */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-[--text-tertiary] uppercase tracking-wider">
              Coverage
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {(["clarity", "branding", "silhouette", "editorial", "detail", "motion"] as const).map((dim) => (
                <div key={dim} className="flex items-center justify-between">
                  <span className="text-[10px] text-[--text-tertiary] capitalize">{dim}</span>
                  <span className="text-[10px] text-[--text-secondary]">
                    {Math.round(result.coverage[dim] * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
