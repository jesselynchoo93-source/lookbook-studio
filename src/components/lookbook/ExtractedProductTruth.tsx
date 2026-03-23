"use client";

/**
 * Compact "Detected Product Truth" panel.
 * Shows extracted fingerprint attributes in a key-value layout.
 * States: analysing / ready / error.
 * Actions: Edit, Re-run, Enter manually (on error).
 */

import type {
  ProductFingerprint,
  FingerprintMeta,
  BagFingerprint,
  WatchFingerprint,
  BeltFingerprint,
  JewelryFingerprint,
} from "@/lib/lookbook/types";
import type { ExtractorStatus } from "@/lib/lookbook/useVisionExtractor";

interface ExtractedProductTruthProps {
  status: ExtractorStatus;
  fingerprint: ProductFingerprint | null;
  meta: FingerprintMeta | null;
  error: string | null;
  notes: string[];
  onEdit: () => void;
  onRerun: () => void;
  onManualEntry: () => void;
}

// ── Attribute rows by family ──

function getBagAttributes(fp: BagFingerprint): [string, string][] {
  return [
    ["Silhouette", `${fp.silhouetteShape} ${fp.silhouettePrimary}`],
    ["Handles", `${fp.handleCount} ${fp.handleType}${fp.handleAttachment ? `, ${fp.handleAttachment} attachment` : ""}`],
    ["Closure", fp.closureType],
    ["Construction", fp.constructionStyle],
    ...(fp.strapPresent && fp.strapType ? [["Strap", fp.strapType] as [string, string]] : []),
  ];
}

function getWatchAttributes(fp: WatchFingerprint): [string, string][] {
  return [
    ["Case", `${fp.caseShape} ${fp.caseSize}`],
    ["Dial", `${fp.dialColour} ${fp.dialType}`],
    ["Bezel", fp.bezelType],
    ["Strap", `${fp.strapColour} ${fp.strapType}`],
    ["Crown", fp.crownPosition],
    ...(fp.complicationCount > 0 ? [["Complications", String(fp.complicationCount)] as [string, string]] : []),
  ];
}

function getBeltAttributes(fp: BeltFingerprint): [string, string][] {
  return [
    ["Width", fp.beltWidth],
    ["Buckle", `${fp.buckleShape} ${fp.buckleType}`],
    ["Tip", fp.tipStyle],
    ["Construction", fp.constructionStyle],
  ];
}

function getJewelryAttributes(fp: JewelryFingerprint): [string, string][] {
  return [
    ["Type", fp.jewelryType],
    ["Construction", fp.constructionStyle],
    ...(fp.chainType ? [["Chain", fp.chainType] as [string, string]] : []),
    ...(fp.settingType ? [["Setting", fp.settingType] as [string, string]] : []),
    ...(fp.stonePresent && fp.stoneType ? [["Stone", fp.stoneType] as [string, string]] : []),
    ...(fp.dropLength ? [["Drop", fp.dropLength] as [string, string]] : []),
  ];
}

function getFamilyAttributes(fp: ProductFingerprint): [string, string][] {
  switch (fp.family) {
    case "bags":
      return getBagAttributes(fp);
    case "watches":
      return getWatchAttributes(fp);
    case "belts":
      return getBeltAttributes(fp);
    case "jewelry":
      return getJewelryAttributes(fp);
  }
}

function getCommonAttributes(fp: ProductFingerprint): [string, string][] {
  const rows: [string, string][] = [
    ["Material", `${fp.materialFinish} ${fp.materialColour}`],
    ["Hardware", fp.hardwareFinish],
  ];
  if (fp.logoPlacement && fp.logoScale !== "none") {
    rows.push(["Logo", `${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`]);
  }
  if (fp.forbiddenElements.length > 0) {
    rows.push(["Exclusions", fp.forbiddenElements.map((e) => `no ${e}`).join(", ")]);
  }
  if (fp.additionalNotes) {
    rows.push(["Notes", fp.additionalNotes]);
  }
  return rows;
}

// ── Confidence badge ──

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const labels = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${styles[confidence]}`}>
      {labels[confidence]}
    </span>
  );
}

// ── Main component ──

export default function ExtractedProductTruth({
  status,
  fingerprint,
  meta,
  error,
  notes,
  onEdit,
  onRerun,
  onManualEntry,
}: ExtractedProductTruthProps) {
  // ── Analysing state ──
  if (status === "analysing") {
    return (
      <div className="bg-[--surface-inset] border border-[--border-subtle] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-[--text-secondary] uppercase tracking-wider">
            Detected Product Truth
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[--text-tertiary] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[--text-tertiary]">Analysing reference...</span>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (status === "error") {
    return (
      <div className="bg-[--surface-inset] border border-[--border-subtle] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-[--text-secondary] uppercase tracking-wider">
            Detected Product Truth
          </span>
        </div>
        <p className="text-sm text-[--text-tertiary] mb-3">
          Could not detect product attributes confidently.
          {error && <span className="block text-xs text-[--status-error-text] mt-1">{error}</span>}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onRerun}
            className="text-[11px] px-3 py-1.5 rounded bg-[--surface-card] border border-[--border-default] text-[--text-secondary] hover:text-[--text-primary] transition-colors"
          >
            Re-run
          </button>
          <button
            onClick={onManualEntry}
            className="text-[11px] px-3 py-1.5 rounded text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
          >
            Enter manually
          </button>
        </div>
      </div>
    );
  }

  // ── Idle state (no product references yet) ──
  if (status === "idle" || !fingerprint || !meta) {
    return null;
  }

  // ── Ready state ──
  const familyRows = getFamilyAttributes(fingerprint);
  const commonRows = getCommonAttributes(fingerprint);
  const allRows = [...familyRows, ...commonRows];

  return (
    <div className="bg-[--surface-inset] border border-[--border-subtle] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[--text-secondary] uppercase tracking-wider">
            Detected Product Truth
          </span>
          <ConfidenceBadge confidence={meta.confidence} />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onEdit}
            className="text-[10px] px-2 py-1 rounded bg-[--surface-card] border border-[--border-default] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onRerun}
            className="text-[10px] px-2 py-1 rounded bg-[--surface-card] border border-[--border-default] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
          >
            Re-run
          </button>
        </div>
      </div>

      {/* Attribute grid */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {allRows.map(([label, value]) => (
          <div key={label} className="contents">
            <span className="text-[11px] text-[--text-tertiary] whitespace-nowrap">
              {label}
            </span>
            <span className="text-[11px] text-[--text-secondary]">{value}</span>
          </div>
        ))}
      </div>

      {/* Notes/warnings */}
      {notes.length > 0 && (
        <div className="mt-3 pt-2 border-t border-[--border-subtle]">
          {notes.map((note, i) => (
            <p key={i} className="text-[10px] text-[--text-tertiary]">{note}</p>
          ))}
        </div>
      )}
    </div>
  );
}
