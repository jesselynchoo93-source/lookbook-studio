"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  LookbookPlanResult,
  GenerationPromptPackage,
  GenerationStatus,
  RetryReason,
  TrackerState,
  ContinuityVerdict,
  ContinuityConcern,
  SkinPolishStatus,
  GeneratedImageAsset,
  FinalMark,
  SetReadinessTier,
} from "@/lib/lookbook/types";
import {
  compileAllPackages,
  formatQueueForClipboard,
} from "@/lib/lookbook/generationPrompt";
import { computeSetReadiness } from "@/lib/lookbook/setReadiness";
import { formatFinalExport } from "@/lib/lookbook/exportShotPlan";
import { toPersistedGeneratedImages } from "@/lib/lookbook/projectStore";
import GenerationShotCard from "./GenerationShotCard";
import ContinuityReviewPanel from "./ContinuityReviewPanel";
import SetSummary from "./SetSummary";
import ReadinessBar from "./shared/ReadinessBar";

// ── Shared sub-components ──

function CopyButton({
  text,
  label,
  copiedLabel,
  primary,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  primary?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={
        primary
          ? "bg-[--text-primary] text-[--text-inverted] text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          : "text-[--text-secondary] hover:text-[--text-primary] text-sm px-4 py-2 rounded-lg border border-[--border-default] transition-colors"
      }
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

// ── Props ──

interface GenerationQueuePanelProps {
  plan: LookbookPlanResult;
  tracker: TrackerState | null;
  generatedImages: Record<number, GeneratedImageAsset>;
  onStatusChange: (
    position: number,
    status: GenerationStatus,
    retryReason?: RetryReason,
  ) => void;
  onContinuityChange: (
    position: number,
    verdict: ContinuityVerdict,
    concerns?: ContinuityConcern[],
  ) => void;
  onSkinPolishChange: (position: number, status: SkinPolishStatus) => void;
  onUploadImage: (position: number, file: File) => void;
  onRemoveImage: (position: number) => void;
  onFinalMarkChange: (position: number, mark: FinalMark) => void;
  projectName?: string;
}

// ── Phase section with progress count ──

/**
 * F1: Count "approved" shots in a phase.
 * Approved = accepted, enhancing, or done.
 */
function countApproved(
  packages: GenerationPromptPackage[],
  tracker: TrackerState | null,
): number {
  if (!tracker) return 0;
  return packages.filter((p) => {
    const s = tracker.shots[p.shotPosition]?.status;
    return s === "accepted" || s === "enhancing" || s === "done";
  }).length;
}

function PhaseSection({
  title,
  subtitle,
  packages,
  accentColor,
  productFamily,
  tracker,
  generatedImages,
  onStatusChange,
  onContinuityChange,
  onSkinPolishChange,
  onUploadImage,
  onRemoveImage,
  onFinalMarkChange,
}: {
  title: string;
  subtitle: string;
  packages: GenerationPromptPackage[];
  accentColor: string;
  productFamily: import("@/lib/lookbook/types").ProductFamily;
  tracker: TrackerState | null;
  generatedImages: Record<number, GeneratedImageAsset>;
  onStatusChange: (
    position: number,
    status: GenerationStatus,
    retryReason?: RetryReason,
  ) => void;
  onContinuityChange: (
    position: number,
    verdict: ContinuityVerdict,
    concerns?: ContinuityConcern[],
  ) => void;
  onSkinPolishChange: (position: number, status: SkinPolishStatus) => void;
  onUploadImage: (position: number, file: File) => void;
  onRemoveImage: (position: number) => void;
  onFinalMarkChange: (position: number, mark: FinalMark) => void;
}) {
  if (packages.length === 0) return null;

  const approved = countApproved(packages, tracker);
  const total = packages.length;

  const dotColor: Record<string, string> = {
    amber: "bg-[--phase-anchor]",
    cyan: "bg-[--phase-detail]",
    purple: "bg-[--phase-editorial]",
  };
  const textColor: Record<string, string> = {
    amber: "text-[--phase-anchor]",
    cyan: "text-[--phase-detail]",
    purple: "text-[--phase-editorial]",
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`w-2 h-2 rounded-full ${dotColor[accentColor] || "bg-[--text-tertiary]"}`}
        />
        <span
          className={`text-xs font-medium uppercase tracking-wider ${textColor[accentColor] || "text-[--text-secondary]"}`}
        >
          {title}
        </span>
        {/* F1: Phase progress count */}
        {tracker && (
          <span className="text-[10px] text-[--text-tertiary] ml-1">
            {approved === total && total > 0 ? (
              <span className="text-[--status-success-text]">all approved</span>
            ) : (
              `${approved} of ${total} approved`
            )}
          </span>
        )}
      </div>
      <p className="text-xs text-[--text-tertiary] mb-4">{subtitle}</p>
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6 mb-6 border-b border-[--border-subtle]"
      >
        {packages.map((pkg) => (
          <GenerationShotCard
            key={pkg.shotPosition}
            pkg={pkg}
            productFamily={productFamily}
            shotStatus={tracker?.shots[pkg.shotPosition]}
            generatedImage={generatedImages[pkg.shotPosition]}
            onStatusChange={onStatusChange}
            onContinuityChange={onContinuityChange}
            onSkinPolishChange={onSkinPolishChange}
            onUploadImage={onUploadImage}
            onRemoveImage={onRemoveImage}
            onFinalMarkChange={onFinalMarkChange}
          />
        ))}
      </div>
    </div>
  );
}

// ── Hooks ──

/**
 * Build a progress summary and next-action cue from tracker state.
 * F1: Returns the target shot position for the next-action scroll.
 */
function useProgressSummary(
  tracker: TrackerState | null,
  packages: GenerationPromptPackage[],
) {
  return useMemo(() => {
    if (!tracker)
      return { summary: null, nextAction: null, nextActionTarget: null };

    const statuses = Object.values(tracker.shots);
    const total = statuses.length;
    if (total === 0)
      return { summary: null, nextAction: null, nextActionTarget: null };

    const approved = statuses.filter(
      (s) =>
        s.status === "accepted" ||
        s.status === "enhancing" ||
        s.status === "done",
    ).length;
    const needsRetry = statuses.filter(
      (s) => s.status === "needs_retry",
    ).length;
    const generating = statuses.filter(
      (s) => s.status === "generating",
    ).length;

    // Only show summary once at least one shot has moved past pending
    const anyActivity = approved + needsRetry + generating > 0;
    if (!anyActivity)
      return { summary: null, nextAction: null, nextActionTarget: null };

    // Build summary text
    const parts: string[] = [];
    if (approved > 0) parts.push(`${approved} of ${total} approved`);
    if (generating > 0) parts.push(`${generating} generating`);
    if (needsRetry > 0) parts.push(`${needsRetry} needs retry`);
    if (parts.length === 0) parts.push(`${total} in progress`);
    const summary = parts.join(", ");

    // Next recommended action: prioritise retries, then next pending shot
    let nextAction: string | null = null;
    let nextActionTarget: number | null = null;
    if (needsRetry > 0) {
      const retryShot = packages.find(
        (p) => tracker.shots[p.shotPosition]?.status === "needs_retry",
      );
      if (retryShot) {
        nextAction = `Needs attention: Shot ${retryShot.shotPosition} (${retryShot.archetypeTitle})`;
        nextActionTarget = retryShot.shotPosition;
      }
    } else {
      const nextPending = packages.find(
        (p) => tracker.shots[p.shotPosition]?.status === "pending",
      );
      if (nextPending) {
        nextAction = `Next: Shot ${nextPending.shotPosition} (${nextPending.archetypeTitle})`;
        nextActionTarget = nextPending.shotPosition;
      }
    }

    return { summary, nextAction, nextActionTarget };
  }, [tracker, packages]);
}

/**
 * Determine whether to show the continuity review panel.
 * Only relevant once 2+ shots are accepted/enhancing/done.
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

/**
 * Build a skin polish progress summary.
 */
function useSkinPolishSummary(tracker: TrackerState | null) {
  return useMemo(() => {
    if (!tracker) return null;
    const statuses = Object.values(tracker.shots);
    const eligible = statuses.filter(
      (s) =>
        (s.status === "accepted" || s.status === "done") &&
        s.continuity !== "concern",
    );
    if (eligible.length === 0) return null;

    const ready = eligible.filter((s) => s.skinPolish === "ready").length;
    const done = eligible.filter((s) => s.skinPolish === "done").length;
    const total = eligible.length;

    if (ready === 0 && done === 0) return null;

    if (done === total && done > 0) {
      return `Final polish complete for ${done} shot${done > 1 ? "s" : ""}`;
    }
    const parts: string[] = [];
    if (done > 0) parts.push(`${done} polished`);
    if (ready > 0) parts.push(`${ready} ready for skin polish`);
    return parts.join(", ");
  }, [tracker]);
}

/**
 * F1: Determine whether any shot has been marked for final review.
 * Used to decide whether to show the finalisation block at the bottom.
 */
function hasAnyFinalMarks(tracker: TrackerState | null): boolean {
  if (!tracker) return false;
  return Object.values(tracker.shots).some(
    (s) =>
      s.finalMark === "keep" ||
      s.finalMark === "best_in_set" ||
      s.finalMark === "replace_later",
  );
}

// ── Main component ──

export default function GenerationQueuePanel({
  plan,
  tracker,
  generatedImages,
  onStatusChange,
  onContinuityChange,
  onSkinPolishChange,
  onUploadImage,
  onRemoveImage,
  onFinalMarkChange,
  projectName,
}: GenerationQueuePanelProps) {
  const packages = useMemo(() => compileAllPackages(plan), [plan]);

  const anchors = packages.filter((p) => p.generationPhase === "anchor");
  const details = packages.filter(
    (p) => p.generationPhase === "detail_validation",
  );
  const editorial = packages.filter((p) => p.generationPhase === "editorial");

  const allPromptsText = packages
    .map(
      (p) =>
        `SHOT ${p.shotPosition}: ${p.archetypeTitle}\n${p.generatorPrompt}`,
    )
    .join("\n\n---\n\n");
  const fullQueueText = formatQueueForClipboard(packages);

  const { summary, nextAction, nextActionTarget } = useProgressSummary(
    tracker,
    packages,
  );
  const showContinuityReview = shouldShowContinuityReview(tracker);
  const skinPolishSummary = useSkinPolishSummary(tracker);
  const showFinalisationBlock = hasAnyFinalMarks(tracker);

  // V4.3: Set readiness (computed from selected set)
  const readiness = useMemo(() => {
    if (!tracker) return null;
    const persisted = toPersistedGeneratedImages(generatedImages);
    return computeSetReadiness(tracker, persisted);
  }, [tracker, generatedImages]);

  // V4.3: Final summary export text
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

  // F1: Scroll to shot card and briefly highlight it
  const [highlightedShot, setHighlightedShot] = useState<number | null>(null);

  const scrollToShot = useCallback((position: number) => {
    const el = document.getElementById(`shot-card-${position}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedShot(position);
    setTimeout(() => setHighlightedShot(null), 1500);
  }, []);

  // Get continuity lock from first package (all share the same DNA)
  const continuityLock = packages[0]?.continuity;
  const productFamily = plan.dna.productFamily;

  return (
    <div className="space-y-6">
      {/* F1: Queue header with emphasis as main work area */}
      <div className="border-l-2 border-[--text-primary]/15 pl-4">
        <h3 className="text-lg font-semibold text-[--text-primary] mb-1">
          Generation Queue
        </h3>
        <p className="text-xs text-[--text-tertiary]">
          {packages.length} shots ready for Higgsfield. Work through anchor
          shots first, then detail and editorial.
        </p>

        {/* F1: Lightweight top-of-queue operational cue */}
        {summary && (
          <p className="text-xs text-[--text-secondary] mt-1.5">{summary}</p>
        )}
        {nextAction && nextActionTarget && (
          <button
            onClick={() => scrollToShot(nextActionTarget)}
            className="text-xs text-[--accent] hover:opacity-80 mt-1 transition-opacity text-left"
          >
            {nextAction} &rarr;
          </button>
        )}
      </div>

      {/* Queue-level actions */}
      <div className="flex gap-3 flex-wrap">
        <CopyButton
          text={allPromptsText}
          label="Copy All Prompts"
          copiedLabel="All prompts copied"
          primary
        />
        <CopyButton
          text={fullQueueText}
          label="Copy Full Queue"
          copiedLabel="Full queue copied"
        />
      </div>

      {/* Phase sections */}
      <PhaseSection
        title="Anchor Shots"
        subtitle="Generate first to validate product shape and proportion."
        packages={anchors}
        accentColor="amber"
        productFamily={productFamily}
        tracker={tracker}
        generatedImages={generatedImages}
        onStatusChange={onStatusChange}
        onContinuityChange={onContinuityChange}
        onSkinPolishChange={onSkinPolishChange}
        onUploadImage={onUploadImage}
        onRemoveImage={onRemoveImage}
        onFinalMarkChange={onFinalMarkChange}
      />
      <PhaseSection
        title="Detail Validation"
        subtitle="Use these to confirm materials and hardware render correctly at close range."
        packages={details}
        accentColor="cyan"
        productFamily={productFamily}
        tracker={tracker}
        generatedImages={generatedImages}
        onStatusChange={onStatusChange}
        onContinuityChange={onContinuityChange}
        onSkinPolishChange={onSkinPolishChange}
        onUploadImage={onUploadImage}
        onRemoveImage={onRemoveImage}
        onFinalMarkChange={onFinalMarkChange}
      />
      <PhaseSection
        title="Editorial"
        subtitle="Leave these for later once the core product read is working."
        packages={editorial}
        accentColor="purple"
        productFamily={productFamily}
        tracker={tracker}
        generatedImages={generatedImages}
        onStatusChange={onStatusChange}
        onContinuityChange={onContinuityChange}
        onSkinPolishChange={onSkinPolishChange}
        onUploadImage={onUploadImage}
        onRemoveImage={onRemoveImage}
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

      {/* Skin polish progress */}
      {skinPolishSummary && (
        <p className="text-xs text-[--status-success-text]">{skinPolishSummary}</p>
      )}

      {/* Set summary */}
      {tracker && <SetSummary tracker={tracker} />}

      {/*
       * F1: Finalisation block (bottom of queue).
       * Only appears once the user starts curating shots.
       * Contains: readiness bar + final summary export.
       */}
      {showFinalisationBlock && readiness && (
        <div className="space-y-4 pt-2 border-t border-[--border-subtle]">
          <ReadinessBar tier={readiness.tier} reasons={readiness.reasons} />
          {finalExportText && readiness.tier !== "not_ready" && (
            <div className="flex gap-3">
              <CopyButton
                text={finalExportText}
                label="Copy Final Summary"
                copiedLabel="Final summary copied"
                primary
              />
            </div>
          )}
        </div>
      )}

      {/* F1: Shot highlight overlay (CSS-driven pulse) */}
      {highlightedShot !== null && (
        <style>{`
          #shot-card-${highlightedShot} {
            animation: f1-highlight 1.5s ease-out;
          }
        `}</style>
      )}
    </div>
  );
}
