"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  LookbookPlanResult,
  TrackerState,
  GenerationStatus,
  RetryReason,
  ContinuityVerdict,
  ContinuityConcern,
  SkinPolishStatus,
  FinalMark,
  GeneratedImageAsset,
  ReferenceAsset,
  ReferenceType,
} from "@/lib/lookbook/types";
import type { WorkflowMode } from "../ModeNavigator";
import { compileAllPackages, formatProviderQueueForClipboard } from "@/lib/lookbook/generationPrompt";
import QueueRail from "../QueueRail";
import CurrentShotWorkspace from "../CurrentShotWorkspace";
import ReferenceDrawer from "../ReferenceDrawer";
import ProgressBar from "../ProgressBar";

interface GenerateModeProps {
  plan: LookbookPlanResult;
  tracker: TrackerState | null;
  generatedImages: Record<number, GeneratedImageAsset>;
  references: {
    model: ReferenceAsset[];
    product: ReferenceAsset[];
    styling: ReferenceAsset[];
  };
  projectName: string;
  onModeChange: (mode: WorkflowMode) => void;
  onStatusChange: (position: number, status: GenerationStatus, retryReason?: RetryReason) => void;
  onContinuityChange: (position: number, verdict: ContinuityVerdict, concerns?: ContinuityConcern[]) => void;
  onSkinPolishChange: (position: number, status: SkinPolishStatus) => void;
  onUploadImage: (position: number, file: File) => void;
  onRemoveImage: (position: number) => void;
  onFinalMarkChange: (position: number, mark: FinalMark) => void;
  onAddReferences: (type: ReferenceType, files: File[]) => void;
  onRemoveReference: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

/**
 * Select the default active shot based on priority:
 * retry > generating > pending > unreviewed > first
 */
function selectDefaultActiveShot(
  tracker: TrackerState | null,
  generationOrder: number[],
): number {
  if (!tracker) return generationOrder[0] ?? 1;
  const shots = tracker.shots;

  for (const pos of generationOrder) {
    if (shots[pos]?.status === "needs_retry") return pos;
  }
  for (const pos of generationOrder) {
    if (shots[pos]?.status === "generating") return pos;
  }
  for (const pos of generationOrder) {
    if (shots[pos]?.status === "pending") return pos;
  }
  for (const pos of generationOrder) {
    const s = shots[pos];
    if ((s?.status === "accepted" || s?.status === "enhancing") && s?.continuity === "unreviewed") return pos;
  }
  return generationOrder[0] ?? 1;
}

export default function GenerateMode({
  plan,
  tracker,
  generatedImages,
  references,
  projectName,
  onModeChange,
  onStatusChange,
  onContinuityChange,
  onSkinPolishChange,
  onUploadImage,
  onRemoveImage,
  onFinalMarkChange,
  onAddReferences,
  onRemoveReference,
  onSetPrimary,
}: GenerateModeProps) {
  const hasProductRef = references.product.length > 0;
  const hasModelRef = references.model.length > 0;
  const packages = useMemo(() => compileAllPackages(plan, hasProductRef, hasModelRef), [plan, hasProductRef, hasModelRef]);

  const [activeShot, setActiveShot] = useState<number>(() =>
    selectDefaultActiveShot(tracker, plan.generationOrder),
  );

  const activePkg = useMemo(
    () => packages.find((p) => p.shotPosition === activeShot),
    [packages, activeShot],
  );

  const handleFinalise = useCallback(() => {
    onModeChange("finalise");
  }, [onModeChange]);

  const [copyLabel, setCopyLabel] = useState("Copy All Prompts");
  const handleCopyAll = useCallback(() => {
    const text = formatProviderQueueForClipboard(packages, plan.input);
    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy All Prompts"), 2000);
    });
  }, [packages, plan.input]);

  if (!activePkg) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[--text-tertiary]">No shots in plan</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar + copy all */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <ProgressBar tracker={tracker} packages={packages} />
        </div>
        <button
          type="button"
          onClick={handleCopyAll}
          className="shrink-0 text-xs border border-[--border-default] text-[--text-secondary] font-medium px-3 py-1.5 rounded-md hover:text-[--text-primary] hover:border-[--text-tertiary] transition-colors"
        >
          {copyLabel}
        </button>
      </div>

      {/* 3-zone layout */}
      <div className="flex gap-6 items-start">
        {/* Left: Queue Rail */}
        <QueueRail
          packages={packages}
          tracker={tracker}
          generatedImages={generatedImages}
          activeShot={activeShot}
          onSelectShot={setActiveShot}
          onFinalise={handleFinalise}
        />

        {/* Center: Current Shot Workspace (dominant) */}
        <CurrentShotWorkspace
          pkg={activePkg}
          productFamily={plan.dna.productFamily}
          shotStatus={tracker?.shots[activePkg.shotPosition]}
          generatedImage={generatedImages[activePkg.shotPosition]}
          onStatusChange={onStatusChange}
          onContinuityChange={onContinuityChange}
          onSkinPolishChange={onSkinPolishChange}
          onUploadImage={onUploadImage}
          onRemoveImage={onRemoveImage}
          onFinalMarkChange={onFinalMarkChange}
        />

        {/* Right: Reference Drawer (collapsed by default) */}
        <ReferenceDrawer
          result={plan}
          references={references}
          onAddReferences={onAddReferences}
          onRemoveReference={onRemoveReference}
          onSetPrimary={onSetPrimary}
        />
      </div>
    </div>
  );
}
