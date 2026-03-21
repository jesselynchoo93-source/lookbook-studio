"use client";

import { useState } from "react";
import type { RecommendedShot } from "@/lib/lookbook/types";

interface ShotCardProps {
  shot: RecommendedShot;
  isTopPriority: boolean;
}

function Badge({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    Safe: "bg-green-600/20 text-green-400 border-green-600/30",
    Balanced: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    Directional: "bg-purple-600/20 text-purple-400 border-purple-600/30",
    "Logo-safe": "bg-emerald-600/20 text-emerald-400 border-emerald-600/30",
    "High detail": "bg-cyan-600/20 text-cyan-400 border-cyan-600/30",
    Motion: "bg-amber-600/20 text-amber-400 border-amber-600/30",
    "High reliability": "bg-green-600/20 text-green-400 border-green-600/30",
    "Higher risk": "bg-red-600/20 text-red-400 border-red-600/30",
  };
  const colors =
    colorMap[label] || "bg-gray-600/20 text-gray-400 border-gray-600/30";

  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full border ${colors}`}
    >
      {label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs py-1 border-b border-gray-700/50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 text-right max-w-[65%]">{value}</span>
    </div>
  );
}

export default function ShotCard({ shot, isTopPriority }: ShotCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const a = shot.archetype;

  const handleCopyBrief = async () => {
    await navigator.clipboard.writeText(shot.deltaBrief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
              #{shot.position}
            </span>
            {isTopPriority && (
              <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                Generate first
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 capitalize">
            {a.shotCategory.replace("_", " ")}
          </span>
        </div>
        <h3 className="text-white font-semibold text-base mb-1">{a.title}</h3>
        <p className="text-gray-400 text-sm">{shot.shotPurpose}</p>
      </div>

      {/* Badges */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {shot.badges.map((badge) => (
          <Badge key={badge} label={badge} />
        ))}
      </div>

      {/* What It Sells */}
      <div className="px-4 pb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          What it sells
        </span>
        <p className="text-sm text-gray-300 mt-1">{shot.whatItSells}</p>
      </div>

      {/* Key Specs */}
      <div className="px-4 pb-3 space-y-0.5">
        <DetailRow label="Framing" value={a.defaultFraming} />
        <DetailRow
          label="Lens"
          value={`${a.defaultLens} @ ${a.defaultAperture}`}
        />
        <DetailRow label="Reliability" value={a.higgsfieldReliability} />
        <DetailRow label="Difficulty" value={a.difficulty} />
        <DetailRow label="Risk" value={shot.riskSummary} />
      </div>

      {/* Delta Brief */}
      <div className="mx-4 mb-3 bg-gray-900/60 border border-gray-700/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Delta Brief
          </span>
          <button
            onClick={handleCopyBrief}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          {shot.deltaBrief}
        </p>
      </div>

      {/* Expandable Details */}
      <div className="mx-4 mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-500 hover:text-gray-400 transition-colors flex items-center gap-1"
        >
          <span>{expanded ? "Hide" : "Show"} details</span>
          <span className="text-[10px]">{expanded ? "\u25B2" : "\u25BC"}</span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Pose Details */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Pose Direction
              </span>
              <p className="text-xs text-gray-400">{shot.poseDelta}</p>
            </div>

            {/* Branding */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Branding Safety
              </span>
              <p className="text-xs text-gray-400">{shot.brandingSafety}</p>
            </div>

            {/* Realism */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Realism Notes
              </span>
              <p className="text-xs text-gray-400">{shot.realismNote}</p>
            </div>

            {/* Usage */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Usage
              </span>
              <div className="text-xs text-gray-400 space-y-1">
                <p>
                  <span className="text-green-400">Best when:</span>{" "}
                  {a.bestUsedWhen}
                </p>
                <p>
                  <span className="text-red-400">Avoid when:</span>{" "}
                  {a.avoidWhen}
                </p>
              </div>
            </div>

            {/* Negative Cues */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Negative Cues
              </span>
              <p className="text-xs text-gray-500 break-words">
                {shot.negativeCues}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
