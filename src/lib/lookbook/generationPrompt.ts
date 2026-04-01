/**
 * F4: 6-Layer Prompt Architecture.
 *
 * Turns each planned shot into a structured package with layered prompts:
 *   Layer 1: Campaign Continuity Lock (per-set, from DNA)
 *   Layer 2: Product Truth Lock (per-set, per-family)
 *   Layer 3: Scale/Proportion Lock (per-set, per-family)
 *   Layer 4: Shot Delta (per-shot, slimmed to framing/angle/pose/product)
 *   Layer 5: Negative Prompt (3-tier: global + family drift + shot-specific)
 *
 * Does NOT modify planner logic. Read-only consumer of LookbookPlanResult.
 */

import type {
  RecommendedShot,
  MasterShootDNA,
  LookbookPlanResult,
  GenerationPromptPackage,
  GenerationPhase,
  ContinuityLock,
  ShotCategory,
  LookbookInput,
} from "./types";
import {
  PRODUCT_FAMILY_LABELS,
  GENDER_LABELS,
  STYLE_LABELS,
} from "./types";
import { NEGATIVE_DEFAULTS, getRealismProfile } from "./realismRules";
import {
  resolveProductTruth,
  resolveScaleLock,
  resolveDriftNegatives,
} from "./productTruth";
import {
  compileProviderPrompt,
  formatProviderForClipboard,
  formatProviderQueueForClipboard,
} from "./providerCompiler";

// ── Phase Assignment ──

export function assignGenerationPhase(shot: RecommendedShot): GenerationPhase {
  const cat: ShotCategory = shot.archetype.shotCategory;
  if (cat === "hero" || cat === "product_focus") return "anchor";
  if (cat === "detail") return "detail_validation";
  return "editorial"; // editorial, silhouette, motion
}

// ── Continuity Lock (data object, unchanged) ──

function buildContinuityLock(dna: MasterShootDNA): ContinuityLock {
  return {
    environment: dna.worldSummary,
    lighting: dna.lightingSummary,
    lensFamily: dna.lensFamily,
    framingFamily: dna.framingFamily,
    finish: dna.finishFamily,
    realism: dna.realismProfile,
    brandingRules: dna.brandingVisibilityRules,
  };
}

// ── F4 Layer 1: Campaign Continuity Lock TEXT ──
// Full prose paragraph written into the prompt. Not abbreviated first-clauses.

function buildContinuityLockText(dna: MasterShootDNA): string {
  const gender = GENDER_LABELS[dna.genderPresentation];
  const style = STYLE_LABELS[dna.targetStyle].toLowerCase();
  const realism = getRealismProfile(dna.targetStyle);

  let text =
    `${style} fashion photograph, ${gender.toLowerCase()} model. ` +
    `Environment: ${dna.worldSummary}. ` +
    `Lighting: ${dna.lightingSummary}. ` +
    `Lens family: ${dna.lensFamily}. ` +
    `Finish: ${dna.finishFamily}. ` +
    `${realism} ` +
    `Branding rules: ${dna.brandingVisibilityRules}.`;

  if (dna.brandGuidelines) {
    text += ` Brand guidelines: ${dna.brandGuidelines}`;
  }

  return text;
}

// ── Shared Set Locks ──
// Built once per set, passed to each shot's compilation.

export interface SetLocks {
  continuityLockText: string;   // Layer 1
  productTruthText: string;     // Layer 2
  scaleLockText: string;        // Layer 3
  driftNegatives: string;       // Layer 5 tier 2
}

export function buildSetLocks(dna: MasterShootDNA, input: LookbookInput): SetLocks {
  return {
    continuityLockText: buildContinuityLockText(dna),
    productTruthText: resolveProductTruth(input),
    scaleLockText: resolveScaleLock(input),
    driftNegatives: resolveDriftNegatives(input),
  };
}

// ── Reliability Label ──

function extractReliabilityLabel(badges: string[]): "High reliability" | "Moderate reliability" | "Higher risk" {
  if (badges.includes("Higher risk")) return "Higher risk";
  if (badges.includes("High reliability")) return "High reliability";
  return "Moderate reliability";
}

// ── Shoot DNA Summary ──

function buildShootDNASummary(dna: MasterShootDNA): string {
  const gender = GENDER_LABELS[dna.genderPresentation];
  return `${gender}. ${dna.campaignDirection}`;
}

// ── Layer 4 Normalization ──
// Runs ONLY on the shot delta layer, not the full assembled prompt.
// This prevents the normalizer from stripping lock content.

function normalizeShotDelta(raw: string, item: string): string {
  let text = raw;

  // 1. Remove "Override framing to X." — redundant with the opening framing summary
  text = text.replace(/Override framing to [^.]+\.\s*/g, "");

  // 2. Remove "Reframe to X." — same pattern, different verb
  text = text.replace(/Reframe to [^.]+\.\s*/g, "");

  // 3. Remove product-lock anchor sentences restating what the opening already says
  const itemEsc = item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const anchorPatterns = [
    new RegExp(`The ${itemEsc} is the focal point\\.\\s*`, "gi"),
    new RegExp(`The ${itemEsc} defines the composition\\.\\s*`, "gi"),
    new RegExp(`The ${itemEsc} and face framing are the composition anchor\\.\\s*`, "gi"),
    new RegExp(`The ${itemEsc} is the subject\\.\\s*`, "gi"),
  ];
  for (const pat of anchorPatterns) {
    text = text.replace(pat, "");
  }

  // 4. Sentence dedup within the delta only
  const sentences = text.split(/(?<=\.)\s+/);

  const STOP_WORDS = new Set([
    "this", "that", "with", "from", "into", "also", "been", "have", "will",
    "should", "must", "does", "than", "more", "very", "over", "under",
  ]);
  function extractKeywords(s: string): Set<string> {
    return new Set(
      s.toLowerCase()
        .replace(/[.,;:!?()]/g, "")
        .replace(/\b(\w+?)(?:ing|ed|es|s)\b/g, "$1")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
    );
  }

  const kept: { raw: string; keywords: Set<string> }[] = [];
  for (const s of sentences) {
    const norm = s.toLowerCase().replace(/\s+/g, " ").trim();
    if (norm.length < 8) continue;
    if (kept.some((k) => k.raw.toLowerCase().replace(/\s+/g, " ").trim() === norm)) continue;
    const kw = extractKeywords(s);
    if (kw.size >= 2 && kw.size <= 6) {
      const isCovered = kept.some((prev) => {
        let overlap = 0;
        for (const w of kw) { if (prev.keywords.has(w)) overlap++; }
        return overlap / kw.size >= 0.8;
      });
      if (isCovered) continue;
    }
    kept.push({ raw: s, keywords: kw });
  }
  text = kept.map((k) => k.raw).join(" ");

  // 5. Clean up stray double spaces
  text = text.replace(/\s{2,}/g, " ").trim();

  return text;
}

// ── Shot Delta Builder (shared by prompt assembly and package layers) ──

function buildNormalizedDelta(shot: RecommendedShot, item: string): string {
  const framingSummary = shot.framingDelta.split(" at ")[0];
  const deltaOpening = framingSummary
    ? `This shot: ${framingSummary.toLowerCase()}, featuring ${item}.`
    : `This shot: featuring ${item}.`;
  const rawDelta = `${deltaOpening} ${shot.poseDelta} ${shot.deltaBrief}`;
  return normalizeShotDelta(rawDelta, item);
}

// ── F4 Generator Prompt: 4-Layer Assembly ──

export function formatGeneratorPrompt(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  locks: SetLocks,
): string {
  const item = dna.specificItem || PRODUCT_FAMILY_LABELS[dna.productFamily].toLowerCase();

  // Layer 1: Campaign Continuity Lock (full prose, not abbreviated)
  const layer1 = locks.continuityLockText;

  // Layer 2: Product Truth Lock
  const layer2 = `Product truth: ${locks.productTruthText}`;

  // Layer 3: Scale/Proportion Lock
  const layer3 = `Scale: ${locks.scaleLockText}`;

  // Layer 4: Shot Delta (per-shot, normalized)
  const layer4 = buildNormalizedDelta(shot, item);

  // Assemble: Layers 1-4 concatenated
  return `${layer1} ${layer2} ${layer3} ${layer4}`;
}

// ── F4 Negative Prompt: 3-Tier ──

export function buildNegativePrompt(
  shot: RecommendedShot,
  locks: SetLocks,
): string {
  // Tier 1: Global defaults
  const tier1 = NEGATIVE_DEFAULTS;

  // Tier 2: Family drift negatives
  const tier2 = locks.driftNegatives;

  // Tier 3: Shot-specific negative cues
  const shotSpecific = shot.negativeCues;
  const tier3 = (shotSpecific && shotSpecific !== "(see global negative cues)")
    ? shotSpecific
    : "";

  // Combine non-empty tiers
  const parts = [tier1, tier2];
  if (tier3) parts.push(tier3);
  return parts.join(", ");
}

// ── Compile Single Package ──

export function compilePromptPackage(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  locks: SetLocks,
  input?: LookbookInput,
  hasProductRef?: boolean,
  hasModelRef?: boolean,
): GenerationPromptPackage {
  const item = dna.specificItem || PRODUCT_FAMILY_LABELS[dna.productFamily].toLowerCase();

  // Build Layer 4 delta text (shared helper, computed once)
  const normalizedDelta = buildNormalizedDelta(shot, item);

  // Build shot-specific negatives for the negativeLayers field
  const shotSpecific = shot.negativeCues;
  const tier3Text = (shotSpecific && shotSpecific !== "(see global negative cues)")
    ? shotSpecific
    : "";

  return {
    shotPosition: shot.position,
    archetypeId: shot.archetype.id,
    archetypeTitle: shot.resolvedTitle ?? shot.archetype.title,

    generationPriority: shot.generationPriority,
    generationPhase: assignGenerationPhase(shot),
    reliabilityLabel: extractReliabilityLabel(shot.badges),

    shootDNA: buildShootDNASummary(dna),
    shotBrief: shot.deltaBrief,
    generatorPrompt: formatGeneratorPrompt(shot, dna, locks),
    negativePrompt: buildNegativePrompt(shot, locks),

    continuity: buildContinuityLock(dna),

    evidenceProvided: shot.evidenceProvided,
    whySelected: shot.whySelected || "",
    whyGenerateNow: shot.whyGenerateNow,

    status: "pending",
    retryCount: 0,

    // F4: Structured layers for UI display
    promptLayers: {
      campaignContinuityLock: locks.continuityLockText,
      productTruthLock: locks.productTruthText,
      scaleLock: locks.scaleLockText,
      shotDelta: normalizedDelta,
    },
    negativeLayers: {
      globalDefaults: NEGATIVE_DEFAULTS,
      familyDrift: locks.driftNegatives,
      shotSpecific: tier3Text,
    },

    // F7: Provider-facing prompt (compact, for Higgsfield)
    providerPrompt: input
      ? compileProviderPrompt(shot, dna, input, hasProductRef ?? false, hasModelRef ?? false)
      : undefined,
  };
}

// ── Compile All Packages ──

export function compileAllPackages(
  plan: LookbookPlanResult,
  hasProductRef?: boolean,
  hasModelRef?: boolean,
): GenerationPromptPackage[] {
  // Build shared locks once for the entire set
  const locks = buildSetLocks(plan.dna, plan.input);

  const shotByPos = new Map(plan.shots.map((s) => [s.position, s]));
  const ordered = plan.generationOrder
    .map((pos) => shotByPos.get(pos))
    .filter((s): s is RecommendedShot => s !== undefined);

  return ordered.map((shot) =>
    compilePromptPackage(shot, plan.dna, locks, plan.input, hasProductRef, hasModelRef),
  );
}

// ── Clipboard Export: Single Shot ──

export function formatForClipboard(pkg: GenerationPromptPackage): string {
  const lines: string[] = [];

  lines.push(`SHOT ${pkg.shotPosition}: ${pkg.archetypeTitle.toUpperCase()}`);
  lines.push(`Phase: ${formatPhaseLabel(pkg.generationPhase)} | Priority: #${pkg.generationPriority} | ${pkg.reliabilityLabel}`);
  lines.push("");

  if (pkg.whySelected) {
    lines.push(`WHY: ${pkg.whySelected}`);
  }
  if (pkg.whyGenerateNow) {
    lines.push(`GENERATE NOW: ${pkg.whyGenerateNow}`);
  }
  if (pkg.whySelected || pkg.whyGenerateNow) {
    lines.push("");
  }

  lines.push("PROMPT:");
  lines.push(pkg.generatorPrompt);
  lines.push("");

  lines.push("NEGATIVE:");
  lines.push(pkg.negativePrompt);

  return lines.join("\n");
}

// ── Clipboard Export: Single Shot (delta only, for queue export) ──

function formatShotDeltaForClipboard(pkg: GenerationPromptPackage): string {
  const lines: string[] = [];

  lines.push(`SHOT ${pkg.shotPosition}: ${pkg.archetypeTitle.toUpperCase()}`);
  lines.push(`Phase: ${formatPhaseLabel(pkg.generationPhase)} | Priority: #${pkg.generationPriority} | ${pkg.reliabilityLabel}`);
  lines.push("");

  if (pkg.whySelected) {
    lines.push(`WHY: ${pkg.whySelected}`);
  }
  if (pkg.whyGenerateNow) {
    lines.push(`GENERATE NOW: ${pkg.whyGenerateNow}`);
  }
  if (pkg.whySelected || pkg.whyGenerateNow) {
    lines.push("");
  }

  // Only the shot delta, not the full 4-layer prompt
  lines.push("SHOT DELTA:");
  lines.push(pkg.promptLayers?.shotDelta || pkg.shotBrief);
  lines.push("");

  // Shot-specific negatives only (tiers 1-2 are in the shared header)
  const shotNeg = pkg.negativeLayers?.shotSpecific;
  if (shotNeg) {
    lines.push("SHOT-SPECIFIC NEGATIVES:");
    lines.push(shotNeg);
    lines.push("");
  }

  return lines.join("\n");
}

// ── Clipboard Export: Full Queue ──
// Shared locks printed once at top, then per-shot deltas only.

export function formatQueueForClipboard(pkgs: GenerationPromptPackage[]): string {
  const lines: string[] = [];
  const item = pkgs[0]?.shootDNA || "Lookbook";

  lines.push("GENERATION QUEUE");
  lines.push("=================");
  lines.push(item);
  lines.push("");

  // Shared locks (printed once for the entire set)
  const firstPkg = pkgs[0];
  if (firstPkg?.promptLayers) {
    lines.push("CAMPAIGN CONTINUITY LOCK (all shots):");
    lines.push(firstPkg.promptLayers.campaignContinuityLock);
    lines.push("");
    lines.push("PRODUCT TRUTH LOCK (all shots):");
    lines.push(firstPkg.promptLayers.productTruthLock);
    lines.push("");
    lines.push("SCALE LOCK (all shots):");
    lines.push(firstPkg.promptLayers.scaleLock);
    lines.push("");
    lines.push("NEGATIVE BASELINE (all shots):");
    lines.push(`Global: ${firstPkg.negativeLayers?.globalDefaults || NEGATIVE_DEFAULTS}`);
    lines.push(`Family drift: ${firstPkg.negativeLayers?.familyDrift || ""}`);
    lines.push("");
    lines.push("=================");
    lines.push("");
  }

  // Group by phase, show per-shot deltas only
  const anchors = pkgs.filter((p) => p.generationPhase === "anchor");
  const details = pkgs.filter((p) => p.generationPhase === "detail_validation");
  const editorial = pkgs.filter((p) => p.generationPhase === "editorial");

  if (anchors.length > 0) {
    lines.push("--- ANCHOR SHOTS (generate first, validate product rendering) ---");
    lines.push("");
    for (const pkg of anchors) {
      lines.push(formatShotDeltaForClipboard(pkg));
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  if (details.length > 0) {
    lines.push("--- DETAIL VALIDATION (confirm materials render at close range) ---");
    lines.push("");
    for (const pkg of details) {
      lines.push(formatShotDeltaForClipboard(pkg));
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  if (editorial.length > 0) {
    lines.push("--- EDITORIAL (atmospheric, generate after anchors pass) ---");
    lines.push("");
    for (const pkg of editorial) {
      lines.push(formatShotDeltaForClipboard(pkg));
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  lines.push(`Generated by Lookbook Studio v4`);
  return lines.join("\n");
}

// ── F7: Re-export provider clipboard formats ──

export { formatProviderForClipboard, formatProviderQueueForClipboard };

// ── Helpers ──

function formatPhaseLabel(phase: GenerationPhase): string {
  switch (phase) {
    case "anchor": return "Anchor";
    case "detail_validation": return "Detail Validation";
    case "editorial": return "Editorial";
  }
}
