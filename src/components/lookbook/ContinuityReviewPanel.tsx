"use client";

import type {
  ContinuityLock,
  TrackerState,
  GeneratedImageAsset,
} from "@/lib/lookbook/types";

interface ContinuityStripShot {
  position: number;
  status: "accepted" | "enhancing" | "done";
  previewUrl: string;
}

interface ContinuityReviewPanelProps {
  continuity: ContinuityLock;
  tracker?: TrackerState | null;
  generatedImages?: Record<number, GeneratedImageAsset>;
}

const CHECKLIST_ITEMS = [
  {
    label: "Does the face still look like the same person across shots?",
    area: "Face identity",
  },
  {
    label: "Does the lighting feel like the same shoot?",
    area: "Lighting",
  },
  {
    label: "Does the product scale stay consistent?",
    area: "Product scale",
  },
  {
    label: "Does the background or environment stay cohesive?",
    area: "Environment",
  },
  {
    label: "Does the skin and finish quality hold across the set?",
    area: "Finish",
  },
  {
    label: "Does the product feel equally premium in every shot?",
    area: "Product quality",
  },
  {
    label: "Do these still feel like one campaign?",
    area: "Overall cohesion",
  },
];

/**
 * Build the image strip: shots with status accepted/enhancing/done
 * that have an attached generated image, ordered by position.
 */
function buildContinuityStrip(
  tracker?: TrackerState | null,
  generatedImages?: Record<number, GeneratedImageAsset>,
): ContinuityStripShot[] {
  if (!tracker || !generatedImages) return [];

  const qualifying = Object.entries(tracker.shots)
    .filter(([, s]) =>
      s.status === "accepted" || s.status === "enhancing" || s.status === "done",
    )
    .map(([posStr, s]) => {
      const pos = Number(posStr);
      const img = generatedImages[pos];
      if (!img) return null;
      return { position: pos, status: s.status, previewUrl: img.previewUrl };
    })
    .filter((x): x is ContinuityStripShot => x !== null)
    .sort((a, b) => a.position - b.position);

  return qualifying;
}

const STATUS_DOT_COLOR: Record<string, string> = {
  accepted: "bg-[--status-info-text]",
  enhancing: "bg-purple-600",
  done: "bg-[--status-success-text]",
};

export default function ContinuityReviewPanel({
  continuity,
  tracker,
  generatedImages,
}: ContinuityReviewPanelProps) {
  const stripShots = buildContinuityStrip(tracker, generatedImages);

  return (
    <div
      className="bg-[--surface-card] rounded-xl p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h4 className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider mb-1">
        Continuity Review
      </h4>
      <p className="text-[11px] text-[--text-tertiary] mb-4">
        After generating several shots, check that the set still feels like one
        cohesive lookbook. Compare your accepted outputs against these
        benchmarks.
      </p>

      {/* Visual image strip for qualifying shots */}
      {stripShots.length >= 2 && (
        <div className="mb-4">
          <p className="text-[11px] text-[--text-tertiary] mb-2">
            Your accepted shots side by side:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {stripShots.map((shot) => (
              <div key={shot.position} className="shrink-0 relative">
                <img
                  src={shot.previewUrl}
                  alt={`Shot ${shot.position}`}
                  className="w-16 h-16 object-cover rounded-md border border-[--border-default]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-md px-1 py-0.5 flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT_COLOR[shot.status] || "bg-[--text-tertiary]"}`}
                  />
                  <span className="text-[9px] text-gray-300">#{shot.position}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DNA reference (compact) */}
      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-[--text-tertiary]">Environment</span>
          <span className="text-[--text-secondary] text-right truncate max-w-[55%]">
            {continuity.environment.split(".")[0]}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[--text-tertiary]">Lighting</span>
          <span className="text-[--text-secondary] text-right truncate max-w-[55%]">
            {continuity.lighting.split(".")[0]}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[--text-tertiary]">Finish</span>
          <span className="text-[--text-secondary] text-right truncate max-w-[55%]">
            {continuity.finish.split(".")[0]}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[--text-tertiary]">Realism</span>
          <span className="text-[--text-secondary] text-right truncate max-w-[55%]">
            {continuity.realism}
          </span>
        </div>
      </div>

      {/* Checklist */}
      <ul className="space-y-2">
        {CHECKLIST_ITEMS.map((item) => (
          <li
            key={item.area}
            className="flex items-start gap-2 text-xs text-[--text-secondary]"
          >
            <span className="text-[--text-tertiary] mt-0.5 shrink-0">[ ]</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
