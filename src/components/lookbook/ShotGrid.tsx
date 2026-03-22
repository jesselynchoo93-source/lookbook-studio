"use client";

import type { RecommendedShot } from "@/lib/lookbook/types";
import ShotCard from "./ShotCard";

interface ShotGridProps {
  shots: RecommendedShot[];
  topPriorityPositions: Set<number>;
  compact?: boolean;
}

export default function ShotGrid({
  shots,
  topPriorityPositions,
  compact,
}: ShotGridProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-[--text-primary] mb-1">
        Your 6-Shot Lookbook Plan
      </h3>
      <p className="text-xs text-[--text-tertiary] mb-4">
        Each shot is a variation on your Master Shoot DNA. They share the same
        environment, lighting, and realism profile. Only the framing, pose, and
        emphasis change.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shots.map((shot) => (
          <ShotCard
            key={shot.archetype.id}
            shot={shot}
            isTopPriority={topPriorityPositions.has(shot.position)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
