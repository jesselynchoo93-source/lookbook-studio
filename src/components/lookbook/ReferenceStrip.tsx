"use client";

import { useState, useEffect, useRef } from "react";
import type { ReferenceAsset, ReferenceType } from "@/lib/lookbook/types";

function RefImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ext = alt.split(".").pop()?.toUpperCase() || "IMG";
  useEffect(() => { setFailed(false); }, [src]);
  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-[--surface-inset] text-[8px] text-[--text-tertiary] ${className || "w-full h-full"}`}>
        {ext}
      </div>
    );
  }
  return <img src={src} alt={alt} className={className || "w-full h-full object-cover"} onError={() => setFailed(true)} />;
}

interface ReferenceStripProps {
  model: ReferenceAsset[];
  product: ReferenceAsset[];
  styling: ReferenceAsset[];
  onAdd: (type: ReferenceType, files: File[]) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

function ThumbnailGroup({
  label,
  assets,
}: {
  label: string;
  assets: ReferenceAsset[];
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {assets.slice(0, 3).map((asset) => (
          <div
            key={asset.id}
            className={`w-8 h-8 rounded-md overflow-hidden border-2 bg-[--surface-inset] ${
              asset.isPrimary
                ? "border-[--phase-anchor]/60 ring-1 ring-[--phase-anchor]/30"
                : "border-[--surface-card]"
            }`}
          >
            <RefImage src={asset.previewUrl} alt={asset.fileName} className="w-full h-full object-cover" />
          </div>
        ))}
        {assets.length > 3 && (
          <div className="w-8 h-8 rounded-md bg-[--surface-inset] border-2 border-[--surface-card] flex items-center justify-center text-[10px] text-[--text-secondary]">
            +{assets.length - 3}
          </div>
        )}
      </div>
      <span className="text-[11px] text-[--text-tertiary]">{label}</span>
    </div>
  );
}

function ExpandedGroup({
  label,
  badge,
  assets,
  type,
  supportsPrimary,
  onAdd,
  onRemove,
  onSetPrimary,
}: {
  label: string;
  badge?: string;
  assets: ReferenceAsset[];
  type: ReferenceType;
  supportsPrimary: boolean;
  onAdd: (type: ReferenceType, files: File[]) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onAdd(type, files);
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-[--text-secondary] font-medium">{label}</span>
        {badge && (
          <span className="text-[10px] text-[--text-tertiary] italic">{badge}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-start">
        {assets.map((asset) => (
          <div key={asset.id} className="relative group">
            <div
              className={`w-16 h-16 rounded-lg overflow-hidden bg-[--surface-inset] border-2 transition-colors ${
                asset.isPrimary
                  ? "border-[--phase-anchor]/60"
                  : "border-[--border-default]"
              }`}
            >
              <RefImage src={asset.previewUrl} alt={asset.fileName} className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => onRemove(asset.id)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-[--surface-inset] hover:bg-[--status-error-bg] text-[--text-tertiary] hover:text-[--status-error-text] rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all"
            >
              &times;
            </button>
            {supportsPrimary && asset.isPrimary && (
              <p className="text-[10px] text-[--phase-anchor] mt-0.5">Primary</p>
            )}
            {supportsPrimary && !asset.isPrimary && (
              <button
                onClick={() => onSetPrimary(asset.id)}
                className="text-[10px] text-[--text-tertiary] hover:text-[--text-secondary] mt-0.5 transition-colors"
              >
                Set primary
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          className="w-16 h-16 rounded-lg border-2 border-dashed border-[--border-default] hover:border-[--text-tertiary] bg-[--surface-page] flex items-center justify-center text-[--text-tertiary] text-sm cursor-pointer transition-colors shrink-0"
        >
          +
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

export default function ReferenceStrip({
  model,
  product,
  styling,
  onAdd,
  onRemove,
  onSetPrimary,
}: ReferenceStripProps) {
  const total = model.length + product.length + styling.length;
  const [expanded, setExpanded] = useState(false);

  if (total === 0) return null;

  const groups = [
    {
      type: "model" as ReferenceType,
      label: "Model",
      supportsPrimary: true,
      assets: model,
    },
    {
      type: "product" as ReferenceType,
      label: "Product",
      badge: "Source of truth",
      supportsPrimary: true,
      assets: product,
    },
    {
      type: "styling" as ReferenceType,
      label: "Styling",
      badge: "Inspiration only",
      supportsPrimary: false,
      assets: styling,
    },
  ].filter((g) => g.assets.length > 0);

  return (
    <div
      className="bg-[--surface-card] rounded-xl p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
            References
          </span>
          <div className="flex items-center gap-4">
            {groups.map((group) => (
              <ThumbnailGroup
                key={group.type}
                label={group.label}
                assets={group.assets}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors shrink-0"
        >
          {expanded ? "Collapse" : "Manage"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[--border-subtle] space-y-4">
          {groups.map((group) => (
            <ExpandedGroup
              key={group.type}
              label={group.label}
              badge={group.badge}
              assets={group.assets}
              type={group.type}
              supportsPrimary={group.supportsPrimary}
              onAdd={onAdd}
              onRemove={onRemove}
              onSetPrimary={onSetPrimary}
            />
          ))}
          <p className="text-[10px] text-[--text-tertiary] italic pt-1">
            Changing references after generating your plan may affect
            consistency across shots.
          </p>
        </div>
      )}
    </div>
  );
}
