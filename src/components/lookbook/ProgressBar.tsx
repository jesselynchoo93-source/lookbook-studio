"use client";

import { useMemo } from "react";
import type { TrackerState, GenerationPromptPackage } from "@/lib/lookbook/types";

interface ProgressBarProps {
  tracker: TrackerState | null;
  packages: GenerationPromptPackage[];
}

export default function ProgressBar({ tracker, packages }: ProgressBarProps) {
  const { approved, total, nextAction } = useMemo(() => {
    if (!tracker) return { approved: 0, total: 0, nextAction: null as string | null };

    const shots = Object.values(tracker.shots);
    const total = shots.length;
    const approved = shots.filter(
      (s) => s.status === "accepted" || s.status === "enhancing" || s.status === "done",
    ).length;

    const needsRetry = packages.find(
      (p) => tracker.shots[p.shotPosition]?.status === "needs_retry",
    );
    const nextPending = packages.find(
      (p) => tracker.shots[p.shotPosition]?.status === "pending",
    );

    let nextAction: string | null = null;
    if (needsRetry) {
      nextAction = `Retry: Shot ${needsRetry.shotPosition}`;
    } else if (nextPending) {
      nextAction = `Next: Shot ${nextPending.shotPosition}`;
    } else if (approved === total && total > 0) {
      nextAction = "All shots approved";
    }

    return { approved, total, nextAction };
  }, [tracker, packages]);

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 bg-[--surface-inset] rounded-full overflow-hidden">
        <div
          className="h-full bg-[--text-primary] rounded-full transition-all"
          style={{ width: `${(approved / total) * 100}%` }}
        />
      </div>
      <span className="text-xs text-[--text-secondary] shrink-0">
        {approved} of {total}
      </span>
      {nextAction && (
        <span className="text-xs text-[--text-tertiary] shrink-0">
          {nextAction}
        </span>
      )}
    </div>
  );
}
