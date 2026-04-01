"use client";

import { useState } from "react";
import { SHOT_CATEGORY_LABELS } from "@/lib/lookbook/types";
import type {
  RecommendedShot,
  TrackerState,
  GeneratedImageAsset,
  FinalMark,
} from "@/lib/lookbook/types";

interface FinaliseGalleryProps {
  shots: RecommendedShot[];
  tracker: TrackerState;
  generatedImages: Record<number, GeneratedImageAsset>;
  generationOrder: number[];
  presentationOrder?: number[];
  onFinalMarkChange: (position: number, mark: FinalMark) => void;
}

function FinalMarkControl({
  mark,
  onMarkChange,
}: {
  mark: FinalMark;
  onMarkChange: (mark: FinalMark) => void;
}) {
  const options: {
    value: NonNullable<FinalMark>;
    label: string;
    activeClass: string;
  }[] = [
    {
      value: "keep",
      label: "Keep",
      activeClass:
        "bg-[--status-success-bg] text-[--status-success-text] border-[--status-success-text]/20",
    },
    {
      value: "replace_later",
      label: "Replace",
      activeClass:
        "bg-[--status-warning-bg] text-[--status-warning-text] border-[--status-warning-text]/20",
    },
    {
      value: "best_in_set",
      label: "Lead",
      activeClass:
        "bg-[--accent-soft] text-[--accent] border-[--accent]/20",
    },
  ];

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const isActive = mark === opt.value;
        const nextMark = isActive ? null : opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onMarkChange(nextMark)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              isActive
                ? opt.activeClass
                : "border-[--border-default] text-[--text-tertiary] hover:text-[--text-secondary] hover:border-[--text-tertiary]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function GalleryCard({
  shot,
  image,
  mark,
  isLead,
  onMarkChange,
}: {
  shot: RecommendedShot;
  image?: GeneratedImageAsset;
  mark: FinalMark;
  isLead: boolean;
  onMarkChange: (mark: FinalMark) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div
      className={`bg-[--surface-card] rounded-xl overflow-hidden transition-all ${
        isLead ? "ring-2 ring-[--accent]" : ""
      }`}
      style={{
        boxShadow: isLead ? "var(--shadow-card-active)" : "var(--shadow-card)",
      }}
    >
      {/* Image area (dominant) */}
      {image ? (
        <button
          onClick={() => setPreviewOpen(true)}
          className="w-full aspect-[3/4] bg-[--surface-inset] overflow-hidden cursor-pointer"
        >
          <img
            src={image.previewUrl}
            alt={shot.resolvedTitle ?? shot.archetype.title}
            className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
          />
        </button>
      ) : (
        <div className="w-full aspect-[3/4] bg-[--surface-inset] flex items-center justify-center">
          <span className="text-xs text-[--text-tertiary]">No image</span>
        </div>
      )}

      {/* Shot info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-[--text-tertiary] bg-[--surface-inset] px-1.5 py-0.5 rounded">
              #{shot.position}
            </span>
            {isLead && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[--accent-soft] text-[--accent]">
                Lead
              </span>
            )}
          </div>
          <span className="text-[10px] text-[--text-tertiary]">
            {SHOT_CATEGORY_LABELS[shot.archetype.shotCategory]}
          </span>
        </div>

        <h4 className="text-sm font-semibold text-[--text-primary] leading-snug">
          {shot.resolvedTitle ?? shot.archetype.title}
        </h4>

        <p className="text-xs text-[--text-secondary] line-clamp-2">
          {shot.whatItSells}
        </p>

        {/* FinalMark controls */}
        <FinalMarkControl mark={mark} onMarkChange={onMarkChange} />
      </div>

      {/* Lightbox preview */}
      {previewOpen && image && (
        <div
          onClick={() => setPreviewOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[90vh] flex flex-col bg-[--surface-elevated] rounded-xl overflow-hidden"
            style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-subtle] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[--text-tertiary] bg-[--surface-inset] px-2 py-0.5 rounded">
                  #{shot.position}
                </span>
                <span className="text-sm font-medium text-[--text-primary]">
                  {shot.resolvedTitle ?? shot.archetype.title}
                </span>
                {isLead && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[--accent-soft] text-[--accent]">
                    Lead
                  </span>
                )}
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-[--text-tertiary] hover:text-[--text-primary] text-lg leading-none transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="overflow-auto p-4">
              <img
                src={image.previewUrl}
                alt={image.fileName}
                className="max-w-full max-h-[75vh] object-contain rounded-lg mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinaliseGallery({
  shots,
  tracker,
  generatedImages,
  generationOrder,
  presentationOrder,
  onFinalMarkChange,
}: FinaliseGalleryProps) {
  // Sort shots by presentation order (contrast-maximised gallery sequence)
  // Falls back to generation order if presentationOrder not available
  const displayOrder = presentationOrder ?? generationOrder;
  const sortedShots = [...shots].sort((a, b) => {
    const aIdx = displayOrder.indexOf(a.position);
    const bIdx = displayOrder.indexOf(b.position);
    return aIdx - bIdx;
  });

  const selectedCount = Object.values(tracker.shots).filter(
    (s) => s.finalMark === "keep" || s.finalMark === "best_in_set",
  ).length;

  const leadPosition = Object.entries(tracker.shots).find(
    ([, s]) => s.finalMark === "best_in_set",
  )?.[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[--text-primary]">
            Your Lookbook
          </h3>
          <p className="text-xs text-[--text-tertiary] mt-0.5">
            {selectedCount} of {shots.length} selected
            {leadPosition ? ` \u00B7 Lead: #${leadPosition}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {sortedShots.map((shot) => {
          const status = tracker.shots[shot.position];
          const mark = status?.finalMark ?? null;
          const isLead = mark === "best_in_set";
          const image = generatedImages[shot.position];

          return (
            <GalleryCard
              key={shot.position}
              shot={shot}
              image={image}
              mark={mark}
              isLead={isLead}
              onMarkChange={(m) => onFinalMarkChange(shot.position, m)}
            />
          );
        })}
      </div>
    </div>
  );
}
