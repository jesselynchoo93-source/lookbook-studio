"use client";

import type { CoverageSummary as CoverageType } from "@/lib/lookbook/types";

interface CoverageSummaryProps {
  coverage: CoverageType;
}

const DIMENSIONS: { key: keyof CoverageType; label: string; color: string }[] = [
  { key: "clarity", label: "Clarity", color: "bg-blue-500" },
  { key: "branding", label: "Branding", color: "bg-emerald-500" },
  { key: "silhouette", label: "Silhouette", color: "bg-purple-500" },
  { key: "editorial", label: "Editorial", color: "bg-amber-500" },
  { key: "detail", label: "Detail", color: "bg-cyan-500" },
  { key: "motion", label: "Motion", color: "bg-orange-500" },
];

export default function CoverageSummaryComponent({
  coverage,
}: CoverageSummaryProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-medium text-white mb-1">Set Coverage</h3>
      <p className="text-xs text-gray-500 mb-4">
        How well your 6-shot set covers each dimension. Higher is better, but
        not every set needs 100% in every category.
      </p>
      <div className="space-y-2.5">
        {DIMENSIONS.map(({ key, label, color }) => {
          const value = coverage[key] as number;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20 text-right">
                {label}
              </span>
              <div className="flex-1 bg-gray-700/50 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">{value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
