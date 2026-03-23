"use client";

import { useRef, useState } from "react";
import type { ReferenceAsset, ReferenceType } from "@/lib/lookbook/types";

// ── Constants ──

const ACCEPTED_FORMATS = ".jpg,.jpeg,.png,.webp,.heic,.heif";
const FORMAT_LABEL = "JPG, PNG, WebP, or HEIC";

// ── Props ──

interface ReferencePanelProps {
  model: ReferenceAsset[];
  product: ReferenceAsset[];
  styling: ReferenceAsset[];
  onAdd: (type: ReferenceType, files: File[]) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

// ── Section config ──

type SectionUrgency = "recommended" | "strongly_recommended" | "optional";

const SECTIONS: {
  type: ReferenceType;
  title: string;
  urgency: SectionUrgency;
  description: string;
  supportsPrimary: boolean;
  maxFiles: number;
  badge?: string;
}[] = [
  {
    type: "model",
    title: "Model Reference",
    urgency: "recommended",
    description: "Face and identity for the set",
    supportsPrimary: true,
    maxFiles: 3,
  },
  {
    type: "product",
    title: "Product References",
    urgency: "strongly_recommended",
    description: "Source of truth for shape, hardware, and construction",
    badge: "Source of truth",
    supportsPrimary: true,
    maxFiles: 10,
  },
  {
    type: "styling",
    title: "Styling References",
    urgency: "optional",
    description: "Mood and composition reference only",
    badge: "Inspiration only",
    supportsPrimary: false,
    maxFiles: 6,
  },
];

// ── Internal components ──

function UrgencyBadge({ urgency }: { urgency: SectionUrgency }) {
  switch (urgency) {
    case "strongly_recommended":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[--status-warning-bg] text-[--status-warning-text]">
          Strongly recommended
        </span>
      );
    case "recommended":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[--accent-soft] text-[--accent]">
          Recommended
        </span>
      );
    case "optional":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[--surface-inset] text-[--text-tertiary]">
          Optional
        </span>
      );
  }
}

function Thumbnail({
  asset,
  supportsPrimary,
  onRemove,
  onSetPrimary,
}: {
  asset: ReferenceAsset;
  supportsPrimary: boolean;
  onRemove: () => void;
  onSetPrimary: () => void;
}) {
  return (
    <div className="relative group">
      <div
        className={`w-20 h-20 rounded-lg overflow-hidden bg-[--surface-inset] border-2 transition-colors ${
          asset.isPrimary
            ? "border-[--phase-anchor]/60"
            : "border-[--border-default]"
        }`}
      >
        <img
          src={asset.previewUrl}
          alt={asset.fileName}
          className="w-full h-full object-cover"
        />
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[--surface-inset] hover:bg-[--status-error-bg] text-[--text-tertiary] hover:text-[--status-error-text] rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all"
      >
        &times;
      </button>
      {supportsPrimary && asset.isPrimary && (
        <p className="text-[10px] text-[--phase-anchor] mt-1 truncate w-20">
          Primary
        </p>
      )}
      {supportsPrimary && !asset.isPrimary && (
        <button
          onClick={onSetPrimary}
          className="text-[10px] text-[--text-tertiary] hover:text-[--text-secondary] mt-1 truncate w-20 text-left transition-colors"
        >
          Set primary
        </button>
      )}
      {!supportsPrimary && (
        <p className="text-[10px] text-[--text-tertiary] mt-1 truncate w-20">
          {asset.fileName}
        </p>
      )}
    </div>
  );
}

function UploadZone({
  onFiles,
  compact,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length > 0) onFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      className={`
        border-2 border-dashed rounded-lg cursor-pointer transition-colors
        flex items-center justify-center
        ${compact ? "w-20 h-20 shrink-0" : "py-8 px-4"}
        ${
          dragOver
            ? "border-[--text-tertiary] bg-[--surface-inset]"
            : "border-[--border-default] hover:border-[--text-tertiary] bg-[--surface-page]"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        multiple
        onChange={handleChange}
        className="hidden"
      />
      {compact ? (
        <span className="text-[--text-tertiary] text-lg select-none">+</span>
      ) : (
        <div className="text-center select-none">
          <div className="text-[--text-tertiary] text-2xl mb-1">+</div>
          <p className="text-xs text-[--text-tertiary]">
            Drop images here or click to upload
          </p>
          <p className="text-[10px] text-[--text-tertiary] mt-1">{FORMAT_LABEL}</p>
        </div>
      )}
    </div>
  );
}

function ReferenceSection({
  title,
  description,
  urgency,
  supportsPrimary,
  maxFiles,
  assets,
  onAdd,
  onRemove,
  onSetPrimary,
}: {
  title: string;
  description: string;
  urgency: SectionUrgency;
  supportsPrimary: boolean;
  maxFiles: number;
  assets: ReferenceAsset[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const atLimit = assets.length >= maxFiles;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="text-sm font-medium text-[--text-primary]">{title}</h4>
        <UrgencyBadge urgency={urgency} />
      </div>

      <p className="text-[11px] text-[--text-tertiary]">{description}</p>

      {assets.length === 0 ? (
        <UploadZone onFiles={onAdd} />
      ) : (
        <div className="flex flex-wrap gap-3 items-start">
          {assets.map((asset) => (
            <Thumbnail
              key={asset.id}
              asset={asset}
              supportsPrimary={supportsPrimary}
              onRemove={() => onRemove(asset.id)}
              onSetPrimary={() => onSetPrimary(asset.id)}
            />
          ))}
          {!atLimit && <UploadZone onFiles={onAdd} compact />}
        </div>
      )}

      {atLimit && (
        <p className="text-[10px] text-[--text-tertiary]">
          Maximum {maxFiles} {maxFiles === 1 ? "image" : "images"} reached.
        </p>
      )}
    </div>
  );
}

// ── Main export ──

export default function ReferencePanel({
  model,
  product,
  styling,
  onAdd,
  onRemove,
  onSetPrimary,
}: ReferencePanelProps) {
  const assetsByType: Record<ReferenceType, ReferenceAsset[]> = {
    model,
    product,
    styling,
  };

  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => (
        <ReferenceSection
          key={section.type}
          title={section.title}
          description={section.description}
          urgency={section.urgency}
          supportsPrimary={section.supportsPrimary}
          maxFiles={section.maxFiles}
          assets={assetsByType[section.type]}
          onAdd={(files) => onAdd(section.type, files)}
          onRemove={onRemove}
          onSetPrimary={onSetPrimary}
        />
      ))}
    </div>
  );
}
