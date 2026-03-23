"use client";

/**
 * Compact "Detected Product Truth" panel.
 * Shows extracted fingerprint attributes in a layered layout:
 *   Layer 1: Header (confidence badge + actions)
 *   Layer 2: Core summary (silhouette, handles, closure, material, hardware)
 *   Layer 3: Secondary details (logo, exclusions, reference observations)
 *
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

// ── Core attributes by family (primary identity) ──

function getBagCore(fp: BagFingerprint): [string, string][] {
  return [
    ["Silhouette", `${fp.silhouetteShape} ${fp.silhouettePrimary}`],
    ["Handles", `${fp.handleCount} ${fp.handleType}${fp.handleAttachment ? `, ${fp.handleAttachment}` : ""}`],
    ["Closure", fp.closureType],
    ["Material", `${fp.materialFinish} ${fp.materialColour}`],
    ["Hardware", fp.hardwareFinish],
  ];
}

function getWatchCore(fp: WatchFingerprint): [string, string][] {
  return [
    ["Case", `${fp.caseShape} ${fp.caseSize}`],
    ["Dial", `${fp.dialColour} ${fp.dialType}`],
    ["Bezel", fp.bezelType],
    ["Strap", `${fp.strapColour} ${fp.strapType}`],
    ["Material", `${fp.materialFinish} ${fp.materialColour}`],
    ["Hardware", fp.hardwareFinish],
  ];
}

function getBeltCore(fp: BeltFingerprint): [string, string][] {
  return [
    ["Width", fp.beltWidth],
    ["Buckle", `${fp.buckleShape} ${fp.buckleType}`],
    ["Tip", fp.tipStyle],
    ["Material", `${fp.materialFinish} ${fp.materialColour}`],
    ["Hardware", fp.hardwareFinish],
  ];
}

function getJewelryCore(fp: JewelryFingerprint): [string, string][] {
  const rows: [string, string][] = [
    ["Type", fp.jewelryType],
    ["Construction", fp.constructionStyle],
  ];
  if (fp.chainType) rows.push(["Chain", fp.chainType]);
  if (fp.settingType) rows.push(["Setting", fp.settingType]);
  if (fp.stonePresent && fp.stoneType) rows.push(["Stone", fp.stoneType]);
  rows.push(
    ["Material", `${fp.materialFinish} ${fp.materialColour}`],
    ["Hardware", fp.hardwareFinish],
  );
  return rows;
}

function getCoreAttributes(fp: ProductFingerprint): [string, string][] {
  switch (fp.family) {
    case "bags": return getBagCore(fp);
    case "watches": return getWatchCore(fp);
    case "belts": return getBeltCore(fp);
    case "jewelry": return getJewelryCore(fp);
  }
}

// ── Secondary details ──

interface SecondaryDetails {
  construction?: string;
  strap?: string;
  logo?: string;
  drop?: string;
  crown?: string;
  complications?: string;
}

function getSecondaryDetails(fp: ProductFingerprint): SecondaryDetails {
  const details: SecondaryDetails = {};

  if (fp.family === "bags") {
    const bag = fp as BagFingerprint;
    details.construction = bag.constructionStyle;
    if (bag.strapPresent && bag.strapType) details.strap = bag.strapType;
  }
  if (fp.family === "watches") {
    const w = fp as WatchFingerprint;
    details.crown = w.crownPosition;
    if (w.complicationCount > 0) details.complications = String(w.complicationCount);
  }
  if (fp.family === "belts") {
    details.construction = (fp as BeltFingerprint).constructionStyle;
  }
  if (fp.family === "jewelry") {
    const j = fp as JewelryFingerprint;
    if (j.dropLength) details.drop = j.dropLength;
  }

  if (fp.logoScale !== "none" && fp.logoPlacement) {
    details.logo = `${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`;
  }

  return details;
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
    medium: "Review suggested",
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[--text-secondary] uppercase tracking-wider">
            Detected Product Truth
          </span>
        </div>
        <div className="flex items-center gap-3 py-2">
          <div className="w-4 h-4 border-2 border-[--text-tertiary] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[--text-tertiary]">Analysing reference...</span>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (status === "error") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[--text-secondary] uppercase tracking-wider">
            Detected Product Truth
          </span>
        </div>
        <p className="text-sm text-[--text-tertiary]">
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

  // ── Ready state: 3-layer layout ──
  const coreRows = getCoreAttributes(fingerprint);
  const secondary = getSecondaryDetails(fingerprint);
  const exclusions = fingerprint.forbiddenElements;
  const hasSecondary =
    secondary.construction ||
    secondary.strap ||
    secondary.logo ||
    secondary.drop ||
    secondary.crown ||
    secondary.complications ||
    exclusions.length > 0 ||
    notes.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Layer 1: Header ── */}
      <div className="flex items-center justify-between">
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

      {/* ── Layer 2: Core product identity ── */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {coreRows.map(([label, value]) => (
          <div key={label} className="contents">
            <span className="text-[11px] text-[--text-tertiary] whitespace-nowrap py-0.5">
              {label}
            </span>
            <span className="text-[11px] text-[--text-primary] py-0.5">{value}</span>
          </div>
        ))}
      </div>

      {/* ── Layer 3: Secondary details ── */}
      {hasSecondary && (
        <div className="pt-3 border-t border-[--border-subtle] space-y-3">
          {/* Extra attributes (construction, strap, logo, etc.) */}
          {(secondary.construction || secondary.strap || secondary.logo || secondary.crown || secondary.complications || secondary.drop) && (
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              {secondary.construction && (
                <div className="contents">
                  <span className="text-[11px] text-[--text-tertiary] py-0.5">Construction</span>
                  <span className="text-[11px] text-[--text-secondary] py-0.5">{secondary.construction}</span>
                </div>
              )}
              {secondary.strap && (
                <div className="contents">
                  <span className="text-[11px] text-[--text-tertiary] py-0.5">Strap</span>
                  <span className="text-[11px] text-[--text-secondary] py-0.5">{secondary.strap}</span>
                </div>
              )}
              {secondary.logo && (
                <div className="contents">
                  <span className="text-[11px] text-[--text-tertiary] py-0.5">Logo</span>
                  <span className="text-[11px] text-[--text-secondary] py-0.5">{secondary.logo}</span>
                </div>
              )}
              {secondary.crown && (
                <div className="contents">
                  <span className="text-[11px] text-[--text-tertiary] py-0.5">Crown</span>
                  <span className="text-[11px] text-[--text-secondary] py-0.5">{secondary.crown}</span>
                </div>
              )}
              {secondary.complications && (
                <div className="contents">
                  <span className="text-[11px] text-[--text-tertiary] py-0.5">Complications</span>
                  <span className="text-[11px] text-[--text-secondary] py-0.5">{secondary.complications}</span>
                </div>
              )}
              {secondary.drop && (
                <div className="contents">
                  <span className="text-[11px] text-[--text-tertiary] py-0.5">Drop</span>
                  <span className="text-[11px] text-[--text-secondary] py-0.5">{secondary.drop}</span>
                </div>
              )}
            </div>
          )}

          {/* Exclusions as pill chips */}
          {exclusions.length > 0 && (
            <div>
              <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1.5">
                Exclusions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {exclusions.map((item) => (
                  <span
                    key={item}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/8 text-red-400/90 border border-red-500/15"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reference observations */}
          {notes.length > 0 && (
            <div>
              <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1">
                Reference observations
              </span>
              <div className="space-y-0.5">
                {notes.map((note, i) => (
                  <p key={i} className="text-[10px] text-[--text-tertiary] leading-relaxed">{note}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
