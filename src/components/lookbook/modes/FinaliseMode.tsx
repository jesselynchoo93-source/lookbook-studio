"use client";

import { useState, useMemo } from "react";
import type {
  LookbookPlanResult,
  TrackerState,
  FinalMark,
  GeneratedImageAsset,
} from "@/lib/lookbook/types";
import { computeSetReadiness } from "@/lib/lookbook/setReadiness";
import { formatFinalExport } from "@/lib/lookbook/exportShotPlan";
import { toPersistedGeneratedImages } from "@/lib/lookbook/projectStore";
import type { WorkflowMode } from "../ModeNavigator";
import FinaliseGallery from "../FinaliseGallery";
import ContinuityReviewPanel from "../ContinuityReviewPanel";
import ReadinessBar from "../shared/ReadinessBar";
import CopyButton from "../shared/CopyButton";
import { compileAllPackages } from "@/lib/lookbook/generationPrompt";

interface FinaliseModeProps {
  plan: LookbookPlanResult;
  tracker: TrackerState | null;
  generatedImages: Record<number, GeneratedImageAsset>;
  projectName: string;
  onModeChange: (mode: WorkflowMode) => void;
  onFinalMarkChange: (position: number, mark: FinalMark) => void;
}

/**
 * Whether to show the continuity review panel.
 * Relevant once 2+ shots are accepted/enhancing/done.
 */
function shouldShowContinuityReview(tracker: TrackerState | null): boolean {
  if (!tracker) return false;
  const statuses = Object.values(tracker.shots);
  const reviewable = statuses.filter(
    (s) =>
      s.status === "accepted" ||
      s.status === "enhancing" ||
      s.status === "done",
  ).length;
  return reviewable >= 2;
}

export default function FinaliseMode({
  plan,
  tracker,
  generatedImages,
  projectName,
  onModeChange,
  onFinalMarkChange,
}: FinaliseModeProps) {
  // Curation workspace: no prompt-copying or generation controls.
  // Images first, FinalMark prominent, editorial feel.
  const [showExportPreview, setShowExportPreview] = useState(false);

  // Readiness computation
  const readiness = useMemo(() => {
    if (!tracker) return null;
    const persisted = toPersistedGeneratedImages(generatedImages);
    return computeSetReadiness(tracker, persisted);
  }, [tracker, generatedImages]);

  // Final export text
  const finalExportText = useMemo(() => {
    if (!tracker || !readiness) return null;
    return formatFinalExport(
      plan.input,
      plan.shots,
      tracker,
      readiness,
      projectName,
    );
  }, [tracker, readiness, plan.input, plan.shots, projectName]);

  // Continuity lock from packages
  const continuityLock = useMemo(() => {
    const packages = compileAllPackages(plan);
    return packages[0]?.continuity ?? null;
  }, [plan]);

  const showContinuityReview = shouldShowContinuityReview(tracker);

  if (!tracker) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[--text-tertiary]">
          No generation data yet. Start generating first.
        </p>
        <button
          onClick={() => onModeChange("generate")}
          className="mt-4 text-sm text-[--accent] hover:opacity-80 transition-opacity"
        >
          Go to Generate
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[--text-primary] mb-1">
            Finalise Your Set
          </h2>
          <p className="text-[--text-secondary] text-sm">
            Review your images and curate the final lookbook.
          </p>
        </div>
        <button
          onClick={() => onModeChange("generate")}
          className="text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
        >
          Back to Generate
        </button>
      </div>

      {/* Readiness bar */}
      {readiness && (
        <ReadinessBar tier={readiness.tier} reasons={readiness.reasons} />
      )}

      {/* Image gallery (dominant) */}
      <FinaliseGallery
        shots={plan.shots}
        tracker={tracker}
        generatedImages={generatedImages}
        generationOrder={plan.generationOrder}
        presentationOrder={plan.presentationOrder}
        onFinalMarkChange={onFinalMarkChange}
      />

      {/* Continuity review (appears after 2+ shots accepted) */}
      {showContinuityReview && continuityLock && (
        <ContinuityReviewPanel
          continuity={continuityLock}
          tracker={tracker}
          generatedImages={generatedImages}
        />
      )}

      {/* Export (final summary only, not generation prompts) */}
      {finalExportText && readiness && readiness.tier !== "not_ready" && (
        <div
          className="bg-[--surface-card] rounded-xl p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h3 className="text-sm font-medium text-[--text-primary] mb-1">
            Final Summary
          </h3>
          <p className="text-xs text-[--text-tertiary] mb-4">
            A presentation-ready summary of your selected set.
          </p>
          <div className="flex gap-3">
            <CopyButton
              text={finalExportText}
              label="Copy Final Summary"
              copiedLabel="Copied"
              primary
            />
            <button
              onClick={() => setShowExportPreview(!showExportPreview)}
              className="text-[--text-secondary] hover:text-[--text-primary] text-sm px-4 py-2 rounded-lg border border-[--border-default] transition-colors"
            >
              {showExportPreview ? "Hide Preview" : "Preview"}
            </button>
          </div>
          {showExportPreview && (
            <pre className="mt-4 bg-[--surface-inset] border border-[--border-subtle] rounded-lg p-4 text-xs text-[--text-secondary] overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
              {finalExportText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
