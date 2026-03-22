"use client";

import type { SetReadinessTier } from "@/lib/lookbook/types";

interface ReadinessBarProps {
  tier: SetReadinessTier;
  reasons: string[];
}

const CONFIG: Record<
  SetReadinessTier,
  { bg: string; text: string; label: string }
> = {
  not_ready: {
    bg: "bg-[--status-error-bg]",
    text: "text-[--status-error-text]",
    label: "Not ready",
  },
  ready_with_issues: {
    bg: "bg-[--status-warning-bg]",
    text: "text-[--status-warning-text]",
    label: "Ready (with issues)",
  },
  ready_to_finalise: {
    bg: "bg-[--status-success-bg]",
    text: "text-[--status-success-text]",
    label: "Ready to finalise",
  },
};

export default function ReadinessBar({ tier, reasons }: ReadinessBarProps) {
  const c = CONFIG[tier];

  return (
    <div className={`${c.bg} rounded-lg px-4 py-2.5`}>
      <p className={`text-xs font-medium ${c.text}`}>{c.label}</p>
      {reasons.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {reasons.map((r, i) => (
            <li key={i} className="text-xs text-[--text-secondary]">
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
