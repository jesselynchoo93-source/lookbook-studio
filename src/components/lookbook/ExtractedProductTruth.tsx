"use client";

/**
 * Compact "Detected Product Truth" panel.
 * Editorial two-column summary: Form | Material & Finish.
 * Exclusions as "Must not appear" chips. Notes collapsible.
 *
 * States: analysing / ready / error.
 * Actions: Edit, Re-run, Enter manually (on error).
 */

import { useState } from "react";
import type {
  ProductFingerprint,
  FingerprintMeta,
  BagFingerprint,
  WatchFingerprint,
  BeltFingerprint,
  JewelryFingerprint,
  EyewearFingerprint,
  ApparelFingerprint,
  FootwearFingerprint,
  HeadwearFingerprint,
  ScarfFingerprint,
  SmallAccessoryFingerprint,
  FullLookFingerprint,
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

// ── Editorial grouping by family ──
// Returns { form: string[], materialFinish: string[] } where each entry is a
// natural-language phrase combining related attributes.

interface EditorialSummary {
  form: string[];
  materialFinish: string[];
}

function getBagSummary(fp: BagFingerprint): EditorialSummary {
  const form: string[] = [];

  // Silhouette + handles + attachment + closure as one phrase
  const parts = [`${fp.silhouetteShape} ${fp.silhouettePrimary}`];
  const handleDesc = `${fp.handleCount} ${fp.handleType}`;
  if (fp.handleAttachment) {
    parts.push(`${handleDesc}, ${fp.handleAttachment}`);
  } else {
    parts.push(handleDesc);
  }
  parts.push(fp.closureType);
  form.push(parts.join(", "));

  if (fp.constructionStyle) {
    form.push(fp.constructionStyle);
  }

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);

  const hwParts: string[] = [fp.hardwareFinish];
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    hwParts.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }
  matFinish.push(hwParts.join(", "));

  if (fp.strapPresent && fp.strapType) {
    matFinish.push(`strap: ${fp.strapType}`);
  }

  return { form, materialFinish: matFinish };
}

function getWatchSummary(fp: WatchFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.caseShape} case, ${fp.caseSize}`);
  form.push(`${fp.dialColour} ${fp.dialType} dial, ${fp.bezelType} bezel`);
  if (fp.crownPosition) form.push(`crown at ${fp.crownPosition}`);
  if (fp.complicationCount > 0) form.push(`${fp.complicationCount} complication${fp.complicationCount > 1 ? "s" : ""}`);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  matFinish.push(fp.hardwareFinish);
  matFinish.push(`${fp.strapColour} ${fp.strapType} strap`);

  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }

  return { form, materialFinish: matFinish };
}

function getBeltSummary(fp: BeltFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.beltWidth} width, ${fp.buckleShape} ${fp.buckleType} buckle`);
  form.push(`${fp.tipStyle} tip`);
  if (fp.constructionStyle) form.push(fp.constructionStyle);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  matFinish.push(fp.hardwareFinish);

  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }

  return { form, materialFinish: matFinish };
}

function getJewelrySummary(fp: JewelryFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.jewelryType}, ${fp.constructionStyle}`);
  if (fp.chainType) form.push(`${fp.chainType} chain`);
  if (fp.settingType) form.push(`${fp.settingType} setting`);
  if (fp.stonePresent && fp.stoneType) form.push(fp.stoneType);
  if (fp.dropLength) form.push(`${fp.dropLength} drop`);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  matFinish.push(fp.hardwareFinish);

  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }

  return { form, materialFinish: matFinish };
}

function getEyewearSummary(fp: EyewearFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.frameShape} ${fp.eyewearType}, ${fp.frameMaterial} frame`);
  form.push(`${fp.lensType} lens, ${fp.bridgeType} bridge`);
  if (fp.templeStyle) form.push(`${fp.templeStyle} temples`);
  if (fp.constructionStyle) form.push(fp.constructionStyle);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  if (fp.lensColour) matFinish.push(`${fp.lensColour} lens`);
  matFinish.push(fp.hardwareFinish);
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }
  return { form, materialFinish: matFinish };
}

function getApparelSummary(fp: ApparelFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.fitType} ${fp.apparelType}, ${fp.neckline} neckline`);
  form.push(`${fp.sleeveLength} sleeve, ${fp.hemLength} hem`);
  if (fp.closureType) form.push(`${fp.closureType} closure`);
  if (fp.constructionStyle) form.push(fp.constructionStyle);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  matFinish.push(fp.hardwareFinish);
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }
  return { form, materialFinish: matFinish };
}

function getFootwearSummary(fp: FootwearFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.toeShape} ${fp.footwearType}, ${fp.heelHeight} heel`);
  form.push(`${fp.closureType}, ${fp.ankleHeight} height`);
  if (fp.soleType) form.push(`${fp.soleType} sole`);
  if (fp.constructionStyle) form.push(fp.constructionStyle);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  matFinish.push(fp.hardwareFinish);
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }
  return { form, materialFinish: matFinish };
}

function getHeadwearSummary(fp: HeadwearFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.crownShape} ${fp.headwearType}`);
  if (fp.brimStyle) form.push(`${fp.brimStyle} brim`);
  if (fp.closureType) form.push(fp.closureType);
  if (fp.constructionStyle) form.push(fp.constructionStyle);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  matFinish.push(fp.hardwareFinish);
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }
  return { form, materialFinish: matFinish };
}

function getScarfSummary(fp: ScarfFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.dimensions} ${fp.scarfType}, ${fp.fabricWeight}`);
  if (fp.patternType) form.push(`${fp.patternType} pattern`);
  if (fp.edgeFinish) form.push(`${fp.edgeFinish} edge`);
  if (fp.constructionStyle) form.push(fp.constructionStyle);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  matFinish.push(fp.hardwareFinish);
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }
  return { form, materialFinish: matFinish };
}

function getSmallAccessorySummary(fp: SmallAccessoryFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.accessoryType}, ${fp.openingType} opening`);
  if (fp.cardSlots) form.push(`${fp.cardSlots} card slots`);
  if (fp.compartmentCount) form.push(`${fp.compartmentCount} compartments`);
  if (fp.constructionStyle) form.push(fp.constructionStyle);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  matFinish.push(fp.hardwareFinish);
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }
  return { form, materialFinish: matFinish };
}

function getFullLookSummary(fp: FullLookFingerprint): EditorialSummary {
  const form: string[] = [];
  form.push(`${fp.styleDirection} look, ${fp.primaryPiece} hero`);
  form.push(`${fp.layeringCount} layer${fp.layeringCount > 1 ? "s" : ""}, ${fp.colourPalette} palette`);
  if (fp.constructionStyle) form.push(fp.constructionStyle);

  const matFinish: string[] = [];
  matFinish.push(`${fp.materialFinish} ${fp.materialColour}`);
  matFinish.push(fp.hardwareFinish);
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    matFinish.push(`${fp.logoStyle} ${fp.logoScale}, ${fp.logoPlacement}`);
  }
  return { form, materialFinish: matFinish };
}

function getEditorialSummary(fp: ProductFingerprint): EditorialSummary {
  switch (fp.family) {
    case "bags": return getBagSummary(fp);
    case "watches": return getWatchSummary(fp);
    case "belts": return getBeltSummary(fp);
    case "jewelry": return getJewelrySummary(fp);
    case "eyewear": return getEyewearSummary(fp);
    case "apparel": return getApparelSummary(fp);
    case "footwear": return getFootwearSummary(fp);
    case "headwear": return getHeadwearSummary(fp);
    case "scarves": return getScarfSummary(fp);
    case "small_accessories": return getSmallAccessorySummary(fp);
    case "full_look": return getFullLookSummary(fp);
  }
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
  const [showNotes, setShowNotes] = useState(false);

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

  // ── Ready state: editorial two-column summary ──
  const summary = getEditorialSummary(fingerprint);
  const exclusions = fingerprint.forbiddenElements;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
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

      {/* ── Two-column editorial summary ── */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1.5">
            Form
          </span>
          <div className="space-y-0.5">
            {summary.form.map((line, i) => (
              <p key={i} className="text-xs text-[--text-primary] leading-relaxed">{line}</p>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1.5">
            Material & Finish
          </span>
          <div className="space-y-0.5">
            {summary.materialFinish.map((line, i) => (
              <p key={i} className="text-xs text-[--text-primary] leading-relaxed">{line}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ── Must not appear ── */}
      {exclusions.length > 0 && (
        <div>
          <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider block mb-1.5">
            Must not appear
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

      {/* ── Collapsible extraction notes ── */}
      {notes.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="text-[10px] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
          >
            {showNotes ? "Hide" : "View"} extraction notes
          </button>
          {showNotes && (
            <div className="mt-1.5 space-y-0.5">
              {notes.map((note, i) => (
                <p key={i} className="text-[10px] text-[--text-tertiary] leading-relaxed">{note}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
