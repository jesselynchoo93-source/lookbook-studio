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
import CopyButton from "./shared/CopyButton";

interface CurrentShotWorkspaceProps {
  pkg: GenerationPromptPackage;
  productFamily: ProductFamily;
  shotStatus?: ShotStatus;
  generatedImage?: GeneratedImageAsset;
  onStatusChange: (position: number, status: GenerationStatus, retryReason?: RetryReason) => void;
  onContinuityChange: (position: number, verdict: ContinuityVerdict, concerns?: ContinuityConcern[]) => void;
  onSkinPolishChange: (position: number, status: SkinPolishStatus) => void;
  onUploadImage: (position: number, file: File) => void;
  onRemoveImage: (position: number) => void;
  onFinalMarkChange: (position: number, mark: FinalMark) => void;
}

// ── Stage derivation ──

type WorkflowStage = "generating" | "reviewing" | "finalised";

function deriveWorkflowStage(status?: GenerationStatus): WorkflowStage {
  if (!status || status === "pending" || status === "generating" || status === "needs_retry") {
    return "generating";
  }
  if (status === "accepted" || status === "enhancing") return "reviewing";
  return "finalised";
}

// ── Phase badge ──

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

// ── Image area (dominant, h-72) ──

function WorkspaceImageArea({
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

  // Pending: empty placeholder
  if (!image && !uploadAllowed) {
    return (
      <div className="h-72 rounded-xl bg-[--surface-inset] border border-[--border-subtle] flex items-center justify-center">
        <p className="text-xs text-[--text-tertiary]">
          Set status to Generating to begin
        </p>
      </div>
    );
  }

  // No image, upload allowed: upload zone
  if (!image && uploadAllowed && onUpload) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`h-72 rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${
          dragOver
            ? "border-[--text-tertiary] bg-[--surface-inset]"
            : "border-[--border-default] hover:border-[--text-tertiary] bg-[--surface-inset]/50"
        }`}
      >
        <span className="text-2xl text-[--text-tertiary]">+</span>
        <span className="text-xs text-[--text-tertiary]">
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
    );
  }

  // Image attached: show image
  if (image) {
    return (
      <>
        <div className="relative group h-72 rounded-xl overflow-hidden bg-[--surface-inset] border border-[--border-subtle]">
          <button
            onClick={() => setPreview(true)}
            className="w-full h-full cursor-pointer"
          >
            <img
              src={image.previewUrl}
              alt={image.fileName}
              className="w-full h-full object-cover"
            />
          </button>
          {/* Hover controls */}
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onUpload && uploadAllowed && (
              <button
                onClick={() => inputRef.current?.click()}
                className="text-[10px] bg-[--surface-card]/90 text-[--text-secondary] hover:text-[--text-primary] px-2.5 py-1 rounded border border-[--border-default]"
              >
                Replace
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="text-[10px] bg-[--surface-card]/90 text-[--text-secondary] hover:text-[--status-error-text] px-2.5 py-1 rounded border border-[--border-default]"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleChange}
            className="hidden"
          />
        </div>
        {/* Full-screen preview overlay */}
        {preview && (
          <ImagePreviewOverlay
            image={image}
            title={title}
            position={position}
            status={status}
            onClose={() => setPreview(false)}
          />
        )}
      </>
    );
  }

  return null;
}

function ImagePreviewOverlay({
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

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
    >
      <div className="relative max-w-3xl max-h-[90vh] flex flex-col bg-[--surface-elevated] rounded-xl overflow-hidden" style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-subtle] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[--text-tertiary] bg-[--surface-inset] px-2 py-0.5 rounded">
              #{position}
            </span>
            <span className="text-sm font-medium text-[--text-primary]">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-[--text-tertiary] hover:text-[--text-primary] text-lg transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="overflow-auto p-4">
          <img
            src={image.previewUrl}
            alt={image.fileName}
            className="max-w-full max-h-[75vh] object-contain rounded-lg mx-auto"
          />
        </div>
        <div className="px-4 py-2 border-t border-[--border-subtle] text-[10px] text-[--text-tertiary] shrink-0">
          {image.fileName} &middot; {(image.sizeBytes / 1024).toFixed(0)} KB
        </div>
      </div>
    </div>
  );
}

// ── Final Mark Control ──

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
        const nextMark = isActive ? null : opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onMarkChange(nextMark)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
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

// ── Main component ──

export default function CurrentShotWorkspace({
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
}: CurrentShotWorkspaceProps) {
  const [showDetails, setShowDetails] = useState(false);
  const stage = deriveWorkflowStage(shotStatus?.status);
  const hasImage = !!generatedImage;
  const canMarkFinal = (stage === "reviewing" || stage === "finalised") && hasImage;

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
      className={`flex-1 min-w-0 space-y-4 ${stage === "finalised" ? "opacity-70" : ""}`}
    >
      {/* Shot header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-[--text-tertiary] bg-[--surface-inset] px-2 py-0.5 rounded">
            #{pkg.shotPosition}
          </span>
          <PhaseBadge phase={pkg.generationPhase} />
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              pkg.reliabilityLabel === "High reliability"
                ? "bg-[--status-success-bg] text-[--status-success-text]"
                : pkg.reliabilityLabel === "Moderate reliability"
                  ? "bg-[--surface-inset] text-[--text-secondary]"
                  : "bg-[--status-error-bg] text-[--status-error-text]"
            }`}
          >
            {pkg.reliabilityLabel}
          </span>
          {shotStatus?.finalMark === "best_in_set" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[--accent-soft] text-[--accent]">
              Lead
            </span>
          )}
        </div>
        {shotStatus && (
          <StatusControl
            shotStatus={shotStatus}
            onStatusChange={(status, reason) =>
              onStatusChange(pkg.shotPosition, status, reason)
            }
          />
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-[--text-primary]">
        {pkg.archetypeTitle}
      </h2>

      {/* Retry info */}
      {shotStatus?.status === "needs_retry" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--status-error-bg] text-[--status-error-text]">
            Retry needed
          </span>
          {shotStatus.retryCount > 0 && (
            <span className="text-[10px] text-[--text-tertiary]">
              {shotStatus.retryCount} attempt{shotStatus.retryCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Image area (dominant) */}
      <WorkspaceImageArea
        image={generatedImage}
        status={shotStatus?.status}
        title={pkg.archetypeTitle}
        position={pkg.shotPosition}
        onUpload={(file) => onUploadImage(pkg.shotPosition, file)}
        onRemove={() => onRemoveImage(pkg.shotPosition)}
      />

      {/* Prompt block: full text, no line-clamp */}
      <div className="bg-[--surface-inset] border border-[--border-subtle] rounded-lg p-4">
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          {pkg.generatorPrompt}
        </p>
      </div>

      {/* Primary + secondary actions */}
      <div className="flex gap-3">
        <CopyButton
          text={pkg.generatorPrompt}
          label="Copy Prompt"
          copiedLabel="Prompt copied"
          primary
        />
        <CopyButton
          text={fullPackageText}
          label="Copy Full Package"
          copiedLabel="Package copied"
        />
      </div>

      {/* REVIEWING / FINALISED: review controls */}
      {stage !== "generating" && (
        <div className={`space-y-4 ${stage === "finalised" ? "opacity-70" : ""}`}>
          {/* FinalMark */}
          {canMarkFinal && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[--text-tertiary] uppercase tracking-wider">
                Curate
              </span>
              <FinalMarkControl
                mark={shotStatus?.finalMark ?? null}
                onMarkChange={(mark) => onFinalMarkChange(pkg.shotPosition, mark)}
              />
            </div>
          )}

          {/* Continuity */}
          {shotStatus && (
            <ContinuityFlagControl
              verdict={shotStatus.continuity}
              concerns={shotStatus.continuityConcerns}
              onUpdate={(verdict, concerns) =>
                onContinuityChange(pkg.shotPosition, verdict, concerns)
              }
            />
          )}

          {/* Skin Polish */}
          {shotStatus &&
            (shotStatus.status === "accepted" || shotStatus.status === "done") &&
            shotStatus.continuity !== "concern" && (
            <SkinPolishBlock
              family={productFamily}
              shotCategory={pkg.generationPhase === "anchor" ? "hero" : pkg.generationPhase === "detail_validation" ? "detail" : "editorial"}
              skinPolish={shotStatus.skinPolish}
              onStatusChange={(status) => onSkinPolishChange(pkg.shotPosition, status)}
            />
          )}
        </div>
      )}

      {/* Stage hint (generating, no image) */}
      {stage === "generating" && !hasImage && (
        <p className="text-xs text-[--text-tertiary] italic">
          Accept the generated image to unlock review controls
        </p>
      )}

      {/* Hidden details toggle */}
      <div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors flex items-center gap-1"
        >
          <span>{showDetails ? "Hide" : "Show"} details</span>
          <span className="text-[10px]">{showDetails ? "\u25B2" : "\u25BC"}</span>
        </button>

        {showDetails && (
          <div className="mt-3 space-y-4">
            {/* Shot context */}
            {(pkg.whySelected || pkg.whyGenerateNow) && (
              <div className="space-y-2">
                <span className="text-[10px] font-medium text-[--text-tertiary] uppercase tracking-wider">
                  Shot Context
                </span>
                {pkg.whySelected && (
                  <p className="text-xs text-[--text-secondary]">{pkg.whySelected}</p>
                )}
                {pkg.whyGenerateNow && (
                  <p className="text-xs text-[--accent]">{pkg.whyGenerateNow}</p>
                )}
              </div>
            )}

            {/* Technical details */}
            <div className="space-y-3">
              <span className="text-[10px] font-medium text-[--text-tertiary] uppercase tracking-wider">
                Technical Details
              </span>
              <div>
                <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider">
                  Negative Prompt
                </span>
                <p className="text-xs text-[--text-tertiary] mt-1 break-words">
                  {pkg.negativePrompt}
                </p>
              </div>
              {pkg.guardrailChecklist.length > 0 && (
                <div>
                  <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider">
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
              {pkg.enhancorNotes.length > 0 && (
                <div>
                  <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider">
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
          </div>
        )}
      </div>
    </div>
  );
}
