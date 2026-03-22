"use client";

import { useMemo } from "react";
import type { TrackerState } from "@/lib/lookbook/types";

interface SetSummaryProps {
  tracker: TrackerState;
}

export default function SetSummary({ tracker }: SetSummaryProps) {
  const summary = useMemo(() => {
    const statuses = Object.values(tracker.shots);
    const total = statuses.length;
    if (total === 0) return null;

    const accepted = statuses.filter(
      (s) => s.status === "accepted" || s.status === "enhancing" || s.status === "done",
    ).length;
    const done = statuses.filter((s) => s.status === "done").length;
    const needsRetry = statuses.filter((s) => s.status === "needs_retry").length;
    const concerns = statuses.filter((s) => s.continuity === "concern").length;
    const reviewed = statuses.filter((s) => s.continuity !== "unreviewed").length;
    const allOk = statuses.every(
      (s) => s.continuity === "ok" || s.continuity === "unreviewed",
    );

    // Only show when there's meaningful progress
    if (accepted === 0 && done === 0 && needsRetry === 0) return null;

    // Build status line
    const parts: string[] = [];
    if (accepted > 0) parts.push(`${accepted} accepted`);
    if (done > 0) parts.push(`${done} done`);
    if (needsRetry > 0) parts.push(`${needsRetry} needs retry`);
    if (concerns > 0) parts.push(`${concerns} continuity concern${concerns > 1 ? "s" : ""}`);
    const statusLine = parts.join(", ");

    // Build cohesion assessment
    let cohesionLine: string | null = null;
    if (reviewed > 0 && concerns === 0 && allOk) {
      cohesionLine = "Set feels cohesive so far";
    } else if (concerns > 0) {
      const concernCounts: Record<string, number> = {};
      for (const s of statuses) {
        for (const c of s.continuityConcerns) {
          concernCounts[c] = (concernCounts[c] || 0) + 1;
        }
      }
      const topConcern = Object.entries(concernCounts).sort(
        (a, b) => b[1] - a[1],
      )[0];
      if (topConcern) {
        const label = topConcern[0].replace(/_/g, " ");
        cohesionLine = `Review ${label} before finalising`;
      }
    }

    // Readiness check
    const allAccepted = accepted === total;
    const noConcerns = concerns === 0;
    const noRetries = needsRetry === 0;
    const ready = allAccepted && noConcerns && noRetries;

    return { statusLine, cohesionLine, ready, total, accepted };
  }, [tracker]);

  if (!summary) return null;

  return (
    <div
      className="bg-[--surface-card] rounded-xl p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h4 className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider mb-2">
        Set Status
      </h4>
      <p className="text-sm text-[--text-primary]">{summary.statusLine}</p>
      {summary.cohesionLine && (
        <p className="text-xs text-[--text-tertiary] mt-1">{summary.cohesionLine}</p>
      )}
      {summary.ready && (
        <p className="text-xs text-[--status-success-text] mt-2">
          All {summary.total} shots accepted with no concerns. Ready to move forward.
        </p>
      )}
    </div>
  );
}
