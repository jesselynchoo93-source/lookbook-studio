"use client";

import { useMemo } from "react";
import type { RecommendedShot, MasterShootDNA } from "@/lib/lookbook/types";
import {
  reviewPlanContinuity,
  type PlanContinuityFlag,
  type PlanContinuityResult,
} from "@/lib/lookbook/planContinuityReview";

interface PlanContinuityPanelProps {
  shots: RecommendedShot[];
  dna: MasterShootDNA;
}

const SEVERITY_STYLE: Record<PlanContinuityFlag["severity"], { dot: string; text: string }> = {
  info: { dot: "bg-blue-500", text: "text-blue-400" },
  warning: { dot: "bg-[--status-warning-text]", text: "text-[--status-warning-text]" },
  critical: { dot: "bg-[--status-error-text]", text: "text-[--status-error-text]" },
};

const OVERALL_STYLE: Record<PlanContinuityResult["overall"], { bg: string; label: string }> = {
  pass: { bg: "bg-[--status-success-bg]", label: "Plan looks consistent" },
  concerns: { bg: "bg-[--status-warning-bg]", label: "Potential concerns found" },
  fail: { bg: "bg-[--status-error-bg]", label: "Issues detected in plan" },
};

export default function PlanContinuityPanel({ shots, dna }: PlanContinuityPanelProps) {
  const result = useMemo(() => reviewPlanContinuity(shots, dna), [shots, dna]);

  if (result.overall === "pass") {
    return (
      <div className="bg-[--status-success-bg] rounded-lg px-4 py-2.5 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[--status-success-text] shrink-0" />
        <span className="text-xs text-[--status-success-text]">
          Plan continuity check passed. No drift detected across {shots.length} shots.
        </span>
      </div>
    );
  }

  const overall = OVERALL_STYLE[result.overall];

  return (
    <div
      className="bg-[--surface-card] rounded-xl p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className={`${overall.bg} rounded-lg px-3 py-2 mb-3`}>
        <span className="text-xs font-medium text-[--text-primary]">
          {overall.label}
        </span>
        <span className="text-[10px] text-[--text-tertiary] ml-2">
          {result.flags.length} flag{result.flags.length !== 1 ? "s" : ""}
        </span>
      </div>

      <ul className="space-y-2">
        {result.flags.map((flag, i) => {
          const style = SEVERITY_STYLE[flag.severity];
          return (
            <li key={i} className="flex items-start gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0 mt-1.5`} />
              <div>
                <span className={`text-xs ${style.text}`}>
                  {flag.severity === "critical" ? "Critical" : flag.severity === "warning" ? "Warning" : "Info"}
                </span>
                <p className="text-xs text-[--text-secondary] mt-0.5">
                  {flag.message}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
