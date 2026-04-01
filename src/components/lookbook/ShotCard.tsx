"use client";

import { useState } from "react";
import { SHOT_CATEGORY_LABELS } from "@/lib/lookbook/types";
import type { RecommendedShot } from "@/lib/lookbook/types";

interface ShotCardProps {
  shot: RecommendedShot;
  isTopPriority: boolean;
  compact?: boolean;
}

function Badge({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    Safe: "bg-[--status-success-bg] text-[--status-success-text]",
    Balanced: "bg-[--status-info-bg] text-[--status-info-text]",
    Directional: "bg-purple-50 text-purple-700",
    "Logo-safe": "bg-emerald-50 text-emerald-700",
    "High detail": "bg-cyan-50 text-cyan-700",
    Motion: "bg-[--status-warning-bg] text-[--status-warning-text]",
    "High reliability": "bg-[--status-success-bg] text-[--status-success-text]",
    "Higher risk": "bg-[--status-error-bg] text-[--status-error-text]",
  };
  const colors =
    colorMap[label] || "bg-[--surface-inset] text-[--text-secondary]";

  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full ${colors}`}
    >
      {label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs py-1 border-b border-[--border-subtle] last:border-0">
      <span className="text-[--text-tertiary]">{label}</span>
      <span className="text-[--text-primary] text-right max-w-[65%]">{value}</span>
    </div>
  );
}

export default function ShotCard({ shot, isTopPriority, compact }: ShotCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const a = shot.archetype;

  const handleCopyBrief = async () => {
    await navigator.clipboard.writeText(shot.deltaBrief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bg-[--surface-card] rounded-xl overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[--text-tertiary] bg-[--surface-inset] px-2 py-0.5 rounded">
              #{shot.position}
            </span>
            {isTopPriority && (
              <span className="text-xs text-[--phase-anchor] bg-[--accent-soft] px-2 py-0.5 rounded">
                Generate first
              </span>
            )}
          </div>
          <span className="text-xs text-[--text-tertiary]">
            {SHOT_CATEGORY_LABELS[a.shotCategory]}
          </span>
        </div>
        <h3 className="text-[--text-primary] font-semibold text-base mb-1">{shot.resolvedTitle ?? a.title}</h3>
        {!compact && (
          <p className="text-[--text-secondary] text-sm">{shot.shotPurpose}</p>
        )}
      </div>

      {/* What It Sells (always visible) */}
      <div className="px-4 pb-3">
        <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
          What it sells
        </span>
        <p className="text-sm text-[--text-primary] mt-1">{shot.whatItSells}</p>
      </div>

      {/* Compact mode: stop here */}
      {compact && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {shot.badges.map((badge) => (
            <Badge key={badge} label={badge} />
          ))}
        </div>
      )}

      {/* Full content (hidden in compact mode) */}
      {!compact && (
        <>
          {/* Badges */}
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {shot.badges.map((badge) => (
              <Badge key={badge} label={badge} />
            ))}
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
          <div className="mx-4 mb-3 bg-[--surface-inset] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
                Delta Brief
              </span>
              <button
                onClick={handleCopyBrief}
                className="text-xs text-[--accent] hover:opacity-80 transition-opacity"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-sm text-[--text-primary] leading-relaxed">
              {shot.deltaBrief}
            </p>
          </div>

          {/* Expandable Details */}
          <div className="mx-4 mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors flex items-center gap-1"
            >
              <span>{expanded ? "Hide" : "Show"} details</span>
              <span className="text-[10px]">{expanded ? "\u25B2" : "\u25BC"}</span>
            </button>

            {expanded && (
          <div className="mt-3 space-y-3">
            {/* Pose Details */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
                Pose Direction
              </span>
              <p className="text-xs text-[--text-secondary]">{shot.poseDelta}</p>
            </div>

            {/* Branding */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
                Branding Safety
              </span>
              <p className="text-xs text-[--text-secondary]">{shot.brandingSafety}</p>
            </div>

            {/* Realism */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
                Realism Notes
              </span>
              <p className="text-xs text-[--text-secondary]">{shot.realismNote}</p>
            </div>

            {/* Usage */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
                Usage
              </span>
              <div className="text-xs text-[--text-secondary] space-y-1">
                <p>
                  <span className="text-[--status-success-text]">Best when:</span>{" "}
                  {a.bestUsedWhen}
                </p>
                <p>
                  <span className="text-[--status-error-text]">Avoid when:</span>{" "}
                  {a.avoidWhen}
                </p>
              </div>
            </div>

            {/* Negative Cues */}
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
                Negative Cues
              </span>
              <p className="text-xs text-[--text-tertiary] break-words">
                {shot.negativeCues}
              </p>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
