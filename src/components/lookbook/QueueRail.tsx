"use client";

import { useMemo } from "react";
import type {
  GenerationPromptPackage,
  TrackerState,
  GenerationPhase,
  GeneratedImageAsset,
} from "@/lib/lookbook/types";

interface QueueRailProps {
  packages: GenerationPromptPackage[];
  tracker: TrackerState | null;
  generatedImages: Record<number, GeneratedImageAsset>;
  activeShot: number;
  onSelectShot: (position: number) => void;
  onFinalise: () => void;
}

type WorkflowStage = "generating" | "reviewing" | "finalised";

function deriveStage(status?: string): WorkflowStage {
  if (!status || status === "pending" || status === "generating" || status === "needs_retry") {
    return "generating";
  }
  if (status === "accepted" || status === "enhancing") return "reviewing";
  return "finalised";
}

const PHASE_CONFIG: Record<GenerationPhase, { label: string; dot: string }> = {
  anchor: { label: "Anchor", dot: "bg-[--phase-anchor]" },
  detail_validation: { label: "Detail", dot: "bg-[--phase-detail]" },
  editorial: { label: "Editorial", dot: "bg-[--phase-editorial]" },
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-[--surface-inset] border border-[--border-default]",
  generating: "bg-[--status-info-text] animate-pulse",
  needs_retry: "bg-[--status-error-text]",
  accepted: "bg-[--status-success-text]",
  enhancing: "bg-[--phase-detail]",
  done: "bg-[--status-success-text]",
};

export default function QueueRail({
  packages,
  tracker,
  generatedImages,
  activeShot,
  onSelectShot,
  onFinalise,
}: QueueRailProps) {
  const grouped = useMemo(() => {
    const groups: Record<GenerationPhase, GenerationPromptPackage[]> = {
      anchor: [],
      detail_validation: [],
      editorial: [],
    };
    for (const pkg of packages) {
      groups[pkg.generationPhase].push(pkg);
    }
    return groups;
  }, [packages]);

  // Progress
  const approved = useMemo(() => {
    if (!tracker) return 0;
    return Object.values(tracker.shots).filter(
      (s) => s.status === "accepted" || s.status === "enhancing" || s.status === "done",
    ).length;
  }, [tracker]);

  const total = packages.length;
  const allDone = tracker
    ? Object.values(tracker.shots).every((s) => s.status === "done")
    : false;

  return (
    <div className="w-56 shrink-0 space-y-4">
      {/* Progress */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-medium text-[--text-primary]">
            {approved} of {total} approved
          </span>
        </div>
        <div className="h-1 bg-[--surface-inset] rounded-full overflow-hidden">
          <div
            className="h-full bg-[--text-primary] rounded-full transition-all"
            style={{ width: total > 0 ? `${(approved / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Phase groups */}
      {(["anchor", "detail_validation", "editorial"] as GenerationPhase[]).map((phase) => {
        const pkgs = grouped[phase];
        if (pkgs.length === 0) return null;
        const config = PHASE_CONFIG[phase];

        return (
          <div key={phase}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[--text-tertiary]">
                {config.label}
              </span>
            </div>
            <div className="space-y-0.5">
              {pkgs.map((pkg) => {
                const status = tracker?.shots[pkg.shotPosition]?.status;
                const isActive = activeShot === pkg.shotPosition;
                const hasImage = !!generatedImages[pkg.shotPosition];

                return (
                  <button
                    key={pkg.shotPosition}
                    onClick={() => onSelectShot(pkg.shotPosition)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      isActive
                        ? "bg-[--surface-card] text-[--text-primary] font-medium"
                        : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-card]/50"
                    }`}
                    style={isActive ? { boxShadow: "var(--shadow-card)" } : undefined}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status || "pending"]}`}
                    />
                    <span className="truncate flex-1">
                      #{pkg.shotPosition} {pkg.archetypeTitle}
                    </span>
                    {hasImage && (
                      <span className="text-[8px] text-[--text-tertiary]">IMG</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Finalise button */}
      <button
        onClick={onFinalise}
        disabled={approved === 0}
        className={`w-full text-xs py-2 rounded-lg border transition-colors ${
          allDone
            ? "bg-[--text-primary] text-[--text-inverted] border-transparent font-medium"
            : approved > 0
              ? "border-[--border-default] text-[--text-secondary] hover:text-[--text-primary] hover:border-[--text-tertiary]"
              : "border-[--border-default] text-[--text-tertiary] opacity-50 cursor-not-allowed"
        }`}
      >
        Finalise Set
      </button>
    </div>
  );
}
