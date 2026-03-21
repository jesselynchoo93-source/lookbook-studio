"use client";

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
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-medium text-white mb-1">
        Recommended Generation Order
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Generate the safest anchor shots first to validate your setup. Then move
        to editorial and motion variations.
      </p>

      <div className="space-y-3">
        {/* First three */}
        <div>
          <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
            Generate First (Anchors)
          </span>
          <div className="mt-2 space-y-1.5">
            {firstThree.map((pos) => {
              const shot = getShotByPosition(pos);
              if (!shot) return null;
              return (
                <div
                  key={pos}
                  className="flex items-center gap-3 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2"
                >
                  <span className="text-xs font-mono text-amber-400">
                    #{shot.position}
                  </span>
                  <span className="text-sm text-gray-200">
                    {shot.archetype.title}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto capitalize">
                    {shot.archetype.shotCategory.replace("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remaining */}
        {remaining.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Then Generate
            </span>
            <div className="mt-2 space-y-1.5">
              {remaining.map((pos) => {
                const shot = getShotByPosition(pos);
                if (!shot) return null;
                return (
                  <div
                    key={pos}
                    className="flex items-center gap-3 bg-gray-700/30 border border-gray-700 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs font-mono text-gray-500">
                      #{shot.position}
                    </span>
                    <span className="text-sm text-gray-300">
                      {shot.archetype.title}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto capitalize">
                      {shot.archetype.shotCategory.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Anchors are the safest shots with the highest Higgsfield reliability.
        Starting with these validates your model, lighting, and garment
        rendering before attempting more creative variations.
      </div>
    </div>
  );
}
