"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  GenerationPromptPackage,
  GenerationStatus,
  RetryReason,
  ShotStatus,
  ContinuityVerdict,
  ContinuityConcern,
  SkinPolishStatus,
  ProductFamily,
  GeneratedImageAsset,
  FinalMark,
} from "@/lib/lookbook/types";
import StatusControl from "./StatusControl";
import ContinuityFlagControl from "./ContinuityFlagControl";
import SkinPolishBlock from "./SkinPolishBlock";

interface GenerationShotCardProps {
  pkg: GenerationPromptPackage;
  productFamily: ProductFamily;
  shotStatus?: ShotStatus;
  generatedImage?: GeneratedImageAsset;
  onStatusChange?: (position: number, status: GenerationStatus, retryReason?: RetryReason) => void;
  onContinuityChange?: (position: number, verdict: ContinuityVerdict, concerns?: ContinuityConcern[]) => void;
  onSkinPolishChange?: (position: number, status: SkinPolishStatus) => void;
  onUploadImage?: (position: number, file: File) => void;
  onRemoveImage?: (position: number) => void;
  onFinalMarkChange?: (position: number, mark: FinalMark) => void;
}

// ── Internal components ──

function CopyButton({
  text,
  label,
  copiedLabel,
}: {
  text: string;
  label: string;
  copiedLabel: string;
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
      className="text-xs px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap
        border-[--border-default] text-[--text-secondary] hover:text-[--text-primary] hover:border-[--text-tertiary]"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

function ReliabilityBadge({
  label,
}: {
  label: "High reliability" | "Moderate reliability" | "Higher risk";
}) {
  const colors = {
    "High reliability":
      "bg-[--status-success-bg] text-[--status-success-text]",
    "Moderate reliability":
      "bg-[--surface-inset] text-[--text-secondary]",
    "Higher risk":
      "bg-[--status-error-bg] text-[--status-error-text]",
  };
  return (
    <span
      className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${colors[label]}`}
    >
      {label}
    </span>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const colors: Record<string, string> = {
    anchor: "bg-[--status-warning-bg] text-[--phase-anchor]",
    detail_validation: "bg-[--status-info-bg] text-[--phase-detail]",
    editorial: "bg-purple-50 text-[--phase-editorial]",
  };
  const labels: Record<string, string> = {
    anchor: "Anchor",
    detail_validation: "Detail",
    editorial: "Editorial",
  };
  return (
    <span
      className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${colors[phase] || "bg-[--surface-inset] text-[--text-secondary]"}`}
    >
      {labels[phase] || phase}
    </span>
  );
}

const STATUS_LABELS: Record<GenerationStatus, string> = {
  pending: "Pending",
  generating: "Generating",
  needs_retry: "Needs Retry",
  accepted: "Accepted",
  enhancing: "Enhancing",
  done: "Done",
};

/**
 * F1: Workflow stage derivation.
 * Maps raw GenerationStatus to a 3-tier stage for progressive disclosure.
 *
 * - generating: pending, generating, needs_retry (prompt + status are primary)
 * - reviewing: accepted, enhancing (continuity, polish, final mark activate)
 * - finalised: done (card recedes, controls secondary)
 */
type WorkflowStage = "generating" | "reviewing" | "finalised";

function deriveWorkflowStage(status?: GenerationStatus): WorkflowStage {
  if (!status || status === "pending" || status === "generating" || status === "needs_retry") {
    return "generating";
  }
  if (status === "accepted" || status === "enhancing") {
    return "reviewing";
  }
  return "finalised";
}

const STATUS_FLOW: GenerationStatus[] = [
  "pending",
  "generating",
  "accepted",
  "done",
];

function StatusBreadcrumb({ current }: { current?: GenerationStatus }) {
  // Map actual statuses to their display position in the breadcrumb
  const displayStep = (() => {
    if (!current || current === "pending") return 0;
    if (current === "generating" || current === "needs_retry") return 1;
    if (current === "accepted" || current === "enhancing") return 2;
    return 3; // done
  })();

  return (
    <div className="flex items-center gap-0.5">
      {STATUS_FLOW.map((step, i) => {
        const isActive = i === displayStep;
        const isPast = i < displayStep;
        return (
          <div key={step} className="flex items-center gap-0.5">
            {i > 0 && (
              <span className={`text-[8px] ${isPast ? "text-[--text-tertiary]" : "text-[--border-default]"}`}>
                ›
              </span>
            )}
            <span
              className={`text-[10px] ${
                isActive
                  ? "text-[--text-primary] font-medium"
                  : isPast
                    ? "text-[--text-tertiary]"
                    : "text-[--border-default]"
              }`}
            >
              {step === "accepted" && current === "enhancing" && isActive
                ? "Enhancing"
                : step === "generating" && current === "needs_retry" && isActive
                  ? "Retry"
                  : STATUS_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ShotImagePreview({
  image,
  title,
  position,
  status,
  onClose,
}: {
  image: GeneratedImageAsset;
  title: string;
  position: number;
  status?: GenerationStatus;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
    >
      <div className="relative max-w-3xl max-h-[90vh] flex flex-col bg-[--surface-elevated] rounded-xl overflow-hidden" style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-subtle] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[--text-tertiary] bg-[--surface-inset] px-2 py-0.5 rounded">
              #{position}
            </span>
            <span className="text-sm font-medium text-[--text-primary]">{title}</span>
            {status && (
              <span className="text-[10px] text-[--text-tertiary] px-1.5 py-0.5 rounded-full border border-[--border-default]">
                {STATUS_LABELS[status]}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[--text-tertiary] hover:text-[--text-primary] text-lg leading-none transition-colors"
          >
            &times;
          </button>
        </div>
        {/* Image */}
        <div className="overflow-auto p-4">
          <img
            src={image.previewUrl}
            alt={image.fileName}
            className="max-w-full max-h-[75vh] object-contain rounded-lg mx-auto"
          />
        </div>
        {/* Footer */}
        <div className="px-4 py-2 border-t border-[--border-subtle] text-[10px] text-[--text-tertiary] shrink-0">
          {image.fileName} &middot; {(image.sizeBytes / 1024).toFixed(0)} KB
        </div>
      </div>
    </div>
  );
}

function ShotImageArea({
  image,
  status,
  title,
  position,
  onUpload,
  onRemove,
}: {
  image?: GeneratedImageAsset;
  status?: GenerationStatus;
  title: string;
  position: number;
  onUpload?: (file: File) => void;
  onRemove?: () => void;
}) {
  const [preview, setPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Upload not allowed for pending status
  const uploadAllowed = status && status !== "pending";

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!onUpload) return;
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("image/"),
    );
    if (file) onUpload(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    e.target.value = "";
  };

  // No image, no upload allowed: show nothing
  if (!image && !uploadAllowed) return null;

  // No image, upload allowed: show upload zone
  if (!image && uploadAllowed && onUpload) {
    return (
      <div className="px-4 pb-3">
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-lg py-4 px-3 cursor-pointer transition-colors flex items-center justify-center gap-2 ${
            dragOver
              ? "border-[--text-tertiary] bg-[--surface-inset]"
              : "border-[--border-default] hover:border-[--text-tertiary] bg-[--surface-inset]/50"
          }`}
        >
          <span className="text-[--text-tertiary] text-sm">+</span>
          <span className="text-[11px] text-[--text-tertiary]">
            Drop generated image or click to upload
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  // Image attached: show thumbnail
  if (image) {
    return (
      <div className="px-4 pb-3">
        <div className="relative group">
          <button
            onClick={() => setPreview(true)}
            className="w-full rounded-lg overflow-hidden bg-[--surface-inset] border border-[--border-subtle] hover:border-[--border-default] transition-colors cursor-pointer"
          >
            <img
              src={image.previewUrl}
              alt={image.fileName}
              className="w-full h-40 object-cover"
            />
          </button>
          {/* Replace button */}
          {onUpload && uploadAllowed && (
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute top-2 right-9 text-[10px] bg-[--surface-card]/90 text-[--text-secondary] hover:text-[--text-primary] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all border border-[--border-default]"
            >
              Replace
            </button>
          )}
          {/* Remove button */}
          {onRemove && (
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 w-5 h-5 bg-[--surface-card]/90 hover:bg-[--status-error-text] text-[--text-secondary] hover:text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all border border-[--border-default] hover:border-transparent"
            >
              &times;
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleChange}
            className="hidden"
          />
        </div>
        {preview && (
          <ShotImagePreview
            image={image}
            title={title}
            position={position}
            status={status}
            onClose={() => setPreview(false)}
          />
        )}
      </div>
    );
  }

  return null;
}

// ── Main component ──

function FinalMarkControl({
  mark,
  onMarkChange,
}: {
  mark: FinalMark;
  onMarkChange: (mark: FinalMark) => void;
}) {
  const options: { value: NonNullable<FinalMark>; label: string; activeClass: string }[] = [
    { value: "keep", label: "Keep", activeClass: "bg-[--status-success-bg] text-[--status-success-text] border-[--status-success-text]/20" },
    { value: "replace_later", label: "Replace", activeClass: "bg-[--status-warning-bg] text-[--status-warning-text] border-[--status-warning-text]/20" },
    { value: "best_in_set", label: "Lead", activeClass: "bg-[--accent-soft] text-[--accent] border-[--accent]/20" },
  ];

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const isActive = mark === opt.value;
        // Toggle off if clicking the active mark; otherwise set the new mark
        const nextMark = isActive ? null : opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onMarkChange(nextMark)}
            className={`text-[10px] px-2 py-1 rounded border transition-colors ${
              isActive
                ? opt.activeClass
                : "border-[--border-default] text-[--text-tertiary] hover:text-[--text-secondary] hover:border-[--text-tertiary]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function GenerationShotCard({
  pkg,
  productFamily,
  shotStatus,
  generatedImage,
  onStatusChange,
  onContinuityChange,
  onSkinPolishChange,
  onUploadImage,
  onRemoveImage,
  onFinalMarkChange,
}: GenerationShotCardProps) {
  const [expanded, setExpanded] = useState(false);

  // F1: Workflow stage drives progressive disclosure
  const stage = deriveWorkflowStage(shotStatus?.status);
  const isLead = shotStatus?.finalMark === "best_in_set";
  const hasImage = !!generatedImage;

  // Final mark: eligible when reviewing/finalised AND image is attached
  const canMarkFinal =
    (stage === "reviewing" || stage === "finalised") && hasImage;

  const fullPackageText = [
    `SHOT ${pkg.shotPosition}: ${pkg.archetypeTitle.toUpperCase()}`,
    `Phase: ${pkg.generationPhase === "detail_validation" ? "Detail Validation" : pkg.generationPhase === "anchor" ? "Anchor" : "Editorial"} | Priority: #${pkg.generationPriority} | ${pkg.reliabilityLabel}`,
    "",
    pkg.whySelected ? `WHY: ${pkg.whySelected}` : "",
    pkg.whyGenerateNow ? `GENERATE NOW: ${pkg.whyGenerateNow}` : "",
    "",
    "PROMPT:",
    pkg.generatorPrompt,
    "",
    "NEGATIVE:",
    pkg.negativePrompt,
    "",
    "GUARDRAIL CHECKLIST:",
    ...pkg.guardrailChecklist.map((g) => `  [ ] ${g}`),
    "",
    "ENHANCOR NOTES:",
    ...pkg.enhancorNotes.map((n) => `  - ${n}`),
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return (
    <div
      id={`shot-card-${pkg.shotPosition}`}
      className={`bg-[--surface-card] rounded-xl overflow-hidden transition-all ${
        stage === "finalised"
          ? "opacity-60"
          : ""
      }`}
      style={{
        boxShadow: stage === "reviewing"
          ? "var(--shadow-card-active)"
          : "var(--shadow-card)",
      }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-[--text-tertiary] bg-[--surface-inset] px-2 py-0.5 rounded">
              #{pkg.shotPosition}
            </span>
            {isLead && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[--accent-soft] text-[--accent]">
                Lead
              </span>
            )}
            <PhaseBadge phase={pkg.generationPhase} />
            <ReliabilityBadge label={pkg.reliabilityLabel} />
          </div>
          {/* Status control */}
          {shotStatus && onStatusChange && (
            <StatusControl
              shotStatus={shotStatus}
              onStatusChange={(status, reason) =>
                onStatusChange(pkg.shotPosition, status, reason)
              }
            />
          )}
        </div>
        <h3 className="text-[--text-primary] font-semibold text-base">
          {pkg.archetypeTitle}
        </h3>
        {/* F1: Status breadcrumb */}
        {shotStatus && (
          <div className="mt-1.5">
            <StatusBreadcrumb current={shotStatus.status} />
          </div>
        )}
      </div>

      {/* Context: why selected, why generate now */}
      {(pkg.whySelected || pkg.whyGenerateNow) && (
        <div className="px-4 pb-3 space-y-1">
          {pkg.whySelected && (
            <p className="text-sm text-[--text-secondary]">{pkg.whySelected}</p>
          )}
          {pkg.whyGenerateNow && (
            <p className="text-sm text-[--accent]">{pkg.whyGenerateNow}</p>
          )}
        </div>
      )}

      {/* Prompt preview: 4-line clamp */}
      <div className="mx-4 mb-3 bg-[--surface-inset] border border-[--border-subtle] rounded-lg p-3">
        <p className="text-sm text-[--text-secondary] leading-relaxed line-clamp-4">
          {pkg.generatorPrompt}
        </p>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-3 flex gap-2">
        <CopyButton
          text={pkg.generatorPrompt}
          label="Copy Prompt"
          copiedLabel="Prompt copied"
        />
        <CopyButton
          text={fullPackageText}
          label="Copy Full Package"
          copiedLabel="Package copied"
        />
      </div>

      {/* Generated image area */}
      <ShotImageArea
        image={generatedImage}
        status={shotStatus?.status}
        title={pkg.archetypeTitle}
        position={pkg.shotPosition}
        onUpload={onUploadImage ? (file) => onUploadImage(pkg.shotPosition, file) : undefined}
        onRemove={onRemoveImage ? () => onRemoveImage(pkg.shotPosition) : undefined}
      />

      {/*
       * F1: Progressive disclosure of review controls.
       *
       * GENERATING stage: show a compact stage hint instead of dead controls.
       * REVIEWING stage: all review controls are primary and interactive.
       * FINALISED stage: controls are secondary (visible but receded).
       */}
      {stage === "generating" ? (
        /* Stage hint: tells the user what comes next */
        <div className="px-4 pb-3">
          <p className="text-[11px] text-[--text-tertiary] italic">
            {shotStatus?.status === "needs_retry"
              ? "Retry this shot, then review controls will appear"
              : "Accept the generated image to unlock review controls"}
          </p>
        </div>
      ) : (
        /* REVIEWING or FINALISED: show review controls */
        <div className={stage === "finalised" ? "opacity-70" : ""}>
          {/* Final set review mark (only with image attached) */}
          {canMarkFinal && onFinalMarkChange && (
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider">Curate</span>
                <FinalMarkControl
                  mark={shotStatus?.finalMark ?? null}
                  onMarkChange={(mark) => onFinalMarkChange(pkg.shotPosition, mark)}
                />
              </div>
            </div>
          )}

          {/* Continuity flag */}
          {shotStatus && onContinuityChange && (
            <div className="px-4 pb-3">
              <ContinuityFlagControl
                verdict={shotStatus.continuity}
                concerns={shotStatus.continuityConcerns}
                onUpdate={(verdict, concerns) =>
                  onContinuityChange(pkg.shotPosition, verdict, concerns)
                }
              />
            </div>
          )}

          {/* Skin polish block (accepted/done, no unresolved continuity concerns) */}
          {shotStatus &&
            onSkinPolishChange &&
            (shotStatus.status === "accepted" || shotStatus.status === "done") &&
            shotStatus.continuity !== "concern" && (
            <div className="px-4 pb-3">
              <SkinPolishBlock
                family={productFamily}
                shotCategory={pkg.generationPhase === "anchor" ? "hero" : pkg.generationPhase === "detail_validation" ? "detail" : "editorial"}
                skinPolish={shotStatus.skinPolish}
                onStatusChange={(status) => onSkinPolishChange(pkg.shotPosition, status)}
              />
            </div>
          )}
        </div>
      )}

      {/* Expandable details */}
      <div className="mx-4 mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors flex items-center gap-1"
        >
          <span>{expanded ? "Hide" : "Show"} details</span>
          <span className="text-[10px]">{expanded ? "\u25B2" : "\u25BC"}</span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-4">
            {/* Full Prompt */}
            <div>
              <span className="text-xs font-medium text-[--text-tertiary] uppercase tracking-wider">
                Full Prompt
              </span>
              <p className="text-xs text-[--text-secondary] mt-1 leading-relaxed">
                {pkg.generatorPrompt}
              </p>
            </div>

            {/* Negative Prompt */}
            <div>
              <span className="text-xs font-medium text-[--text-tertiary] uppercase tracking-wider">
                Negative Prompt
              </span>
              <p className="text-xs text-[--text-tertiary] mt-1 break-words">
                {pkg.negativePrompt}
              </p>
            </div>

            {/* Guardrail Checklist */}
            {pkg.guardrailChecklist.length > 0 && (
              <div>
                <span className="text-xs font-medium text-[--text-tertiary] uppercase tracking-wider">
                  Guardrail Checklist
                </span>
                <ul className="mt-1 space-y-1">
                  {pkg.guardrailChecklist.map((item, i) => (
                    <li
                      key={i}
                      className="text-xs text-[--text-secondary] flex items-start gap-2"
                    >
                      <span className="text-[--text-tertiary] mt-0.5">[ ]</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Enhancor Notes */}
            {pkg.enhancorNotes.length > 0 && (
              <div>
                <span className="text-xs font-medium text-[--text-tertiary] uppercase tracking-wider">
                  Enhancor Notes
                </span>
                <ul className="mt-1 space-y-1">
                  {pkg.enhancorNotes.map((note, i) => (
                    <li
                      key={i}
                      className="text-xs text-[--text-secondary] flex items-start gap-2"
                    >
                      <span className="text-[--phase-detail]">-</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
