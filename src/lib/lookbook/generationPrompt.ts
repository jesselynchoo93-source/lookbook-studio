/**
 * F4: 6-Layer Prompt Architecture.
 *
 * Turns each planned shot into a structured package with layered prompts:
 *   Layer 1: Campaign Continuity Lock (per-set, from DNA)
 *   Layer 2: Product Truth Lock (per-set, per-family)
 *   Layer 3: Scale/Proportion Lock (per-set, per-family)
 *   Layer 4: Shot Delta (per-shot, slimmed to framing/angle/pose/product)
 *   Layer 5: Negative Prompt (3-tier: global + family drift + shot-specific)
 *   Layer 6: Guardrail/Review Checks (existing guardrails + product truth)
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
  EvidenceType,
  ProductFamily,
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
  getProductTruthInvariants,
} from "./productTruth";
import {
  compileProviderPrompt,
  formatProviderForClipboard,
  formatProviderQueueForClipboard,
} from "./providerCompiler";

// ── Family-Aware Enhancor Vocabulary ──
// Compact lookup for generating practical Enhancor notes per family.

const ENHANCOR_FOCUS: Record<ProductFamily, { texture: string; finish: string; boundary: string }> = {
  eyewear: { texture: "acetate and metal surface", finish: "lens coating and hinge hardware", boundary: "frame-to-skin contact at nose bridge and temples" },
  bags: { texture: "leather grain and stitching", finish: "hardware (buckles, zippers, clasps)", boundary: "strap-to-shoulder and bag-to-body contact points" },
  watches: { texture: "dial surface and strap material", finish: "case and crown metal finish", boundary: "strap-to-wrist contact and case-to-skin edge" },
  jewelry: { texture: "metal surface and stone facets", finish: "clasp and setting precision", boundary: "piece-to-skin contact (ear, neck, wrist, finger)" },
  footwear: { texture: "upper material and sole rubber", finish: "lacing, eyelets, and pull tabs", boundary: "shoe-to-foot contact and ankle line" },
  apparel: { texture: "fabric weave and drape", finish: "buttons, zippers, and seam lines", boundary: "fabric-to-skin contact at cuffs, collar, and hem" },
  headwear: { texture: "material surface (knit, woven, felt)", finish: "brim edge and band hardware", boundary: "hat-to-head contact and hair-to-hat transition" },
  belts: { texture: "leather grain and edge paint", finish: "buckle metal and prong alignment", boundary: "belt-to-waist contact and loop spacing" },
  scarves: { texture: "weave pattern and fringe detail", finish: "hem stitching and print registration", boundary: "fabric-to-skin drape line at neck and shoulders" },
  small_accessories: { texture: "material surface and edge finishing", finish: "clasp, hinge, and hardware detail", boundary: "product-to-hand contact and grip points" },
  full_look: { texture: "fabric interplay between layers", finish: "accessory hardware and trim", boundary: "layering contact points and overlap zones" },
};

// ── Evidence-to-Enhancor Mapping ──
// What to check in Enhancor for specific evidence types.

const EVIDENCE_ENHANCOR_HINTS: Partial<Record<EvidenceType, string>> = {
  face_framing: "Verify skin texture around the face-to-product boundary",
  face_scale: "Check product-to-face proportion looks natural at final resolution",
  wrist_visibility: "Verify wrist anatomy and strap-to-skin contact",
  ear_visibility: "Check earring-to-ear attachment looks weighted and real",
  texture_detail: "Inspect material grain at full resolution for AI smoothing artefacts",
  hardware_detail: "Verify metal finish looks physical, not rendered",
  surface_reflection: "Check light play on reflective surfaces is natural, not CGI",
  construction_quality: "Inspect stitching and edge lines for regularity",
  closure_mechanism: "Verify clasp or buckle mechanism looks functional",
  fabric_drape: "Check fabric weight follows gravity naturally",
  movement_behavior: "Verify motion blur direction is consistent with pose",
  logo_placement: "Confirm logo text is legible and not distorted",
  carry_method: "Check strap tension and bag weight look real",
  on_foot_presence: "Verify shoe-to-ground contact and lacing symmetry",
  sole_profile: "Check sole tread detail at full resolution",
  pair_symmetry: "Compare left and right items for consistent rendering",
};

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
    environment: dna.environmentFamily,
    lighting: dna.lightingFamily,
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
    `Environment: ${dna.environmentFamily}. ` +
    `Lighting: ${dna.lightingFamily}. ` +
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
  const framingSummary = shot.framingDelta.split(" at ")[0];
  const deltaOpening = framingSummary
    ? `This shot: ${framingSummary.toLowerCase()}, featuring ${item}.`
    : `This shot: featuring ${item}.`;
  const rawDelta = `${deltaOpening} ${shot.deltaBrief}`;
  const layer4 = normalizeShotDelta(rawDelta, item);

  // Assemble: Layers 1-4 concatenated
  return `${layer1} ${layer2} ${layer3} ${layer4}`;
}

// ── F4 Negative Prompt: 3-Tier ──

export function buildNegativePrompt(
  shot: RecommendedShot,
  _dna: MasterShootDNA,
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

// ── Guardrail Checklist (Layer 6) ──

export function buildGuardrailChecklist(shot: RecommendedShot, family: ProductFamily): string[] {
  const guardrail = shot.realismGuardrail;
  const items: string[] = [];

  if (guardrail) {
    // Split on periods and commas that separate distinct checks
    const sentences = guardrail
      .split(/\.\s+/)
      .map((s) => s.replace(/\.$/, "").trim())
      .filter((s) => s.length > 0);

    if (sentences.length >= 2) {
      items.push(...sentences);
    } else {
      const parts = guardrail
        .split(/,\s+/)
        .map((s) => s.replace(/\.$/, "").trim())
        .filter((s) => s.length > 0);
      items.push(...parts);
    }
  }

  // F4 Layer 6: Add product-truth consistency checks
  const invariants = getProductTruthInvariants(family);
  if (invariants.length > 0) {
    items.push(`Cross-shot consistency: verify ${invariants.slice(0, 3).join(", ")}`);
  }

  return items;
}

// ── Enhancor Notes ──

export function buildEnhancorNotes(shot: RecommendedShot, dna: MasterShootDNA): string[] {
  const notes: string[] = [];
  const family = dna.productFamily;
  const focus = ENHANCOR_FOCUS[family];

  // Evidence-specific notes (pick the most relevant, max 3)
  let evidenceNoteCount = 0;
  for (const ev of shot.evidenceProvided) {
    if (evidenceNoteCount >= 3) break;
    const hint = EVIDENCE_ENHANCOR_HINTS[ev];
    if (hint) {
      notes.push(hint);
      evidenceNoteCount++;
    }
  }

  // Family-specific texture and finish checks
  if (focus) {
    const cat = shot.archetype.shotCategory;
    if (cat === "detail" || cat === "product_focus") {
      notes.push(`Check ${focus.texture} at full resolution`);
      notes.push(`Verify ${focus.finish} looks natural`);
    } else if (cat === "hero") {
      notes.push(`Verify ${focus.boundary}`);
      notes.push(`Check ${focus.texture} is visible and natural`);
    } else {
      notes.push(`Verify ${focus.boundary}`);
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return notes.filter((n) => {
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

// ── Compile Single Package ──

export function compilePromptPackage(
  shot: RecommendedShot,
  dna: MasterShootDNA,
  _plan: LookbookPlanResult,
  locks: SetLocks,
  input?: LookbookInput,
  hasProductRef?: boolean,
): GenerationPromptPackage {
  const item = dna.specificItem || PRODUCT_FAMILY_LABELS[dna.productFamily].toLowerCase();

  // Build Layer 4 delta text for the promptLayers field
  const framingSummary = shot.framingDelta.split(" at ")[0];
  const deltaOpening = framingSummary
    ? `This shot: ${framingSummary.toLowerCase()}, featuring ${item}.`
    : `This shot: featuring ${item}.`;
  const rawDelta = `${deltaOpening} ${shot.deltaBrief}`;
  const normalizedDelta = normalizeShotDelta(rawDelta, item);

  // Build shot-specific negatives for the negativeLayers field
  const shotSpecific = shot.negativeCues;
  const tier3Text = (shotSpecific && shotSpecific !== "(see global negative cues)")
    ? shotSpecific
    : "";

  return {
    shotPosition: shot.position,
    archetypeId: shot.archetype.id,
    archetypeTitle: shot.archetype.title,

    generationPriority: shot.generationPriority,
    generationPhase: assignGenerationPhase(shot),
    reliabilityLabel: extractReliabilityLabel(shot.badges),

    shootDNA: buildShootDNASummary(dna),
    shotBrief: shot.deltaBrief,
    generatorPrompt: formatGeneratorPrompt(shot, dna, locks),
    negativePrompt: buildNegativePrompt(shot, dna, locks),
    guardrailChecklist: buildGuardrailChecklist(shot, dna.productFamily),

    continuity: buildContinuityLock(dna),

    evidenceProvided: shot.evidenceProvided,
    whySelected: shot.whySelected || "",
    whyGenerateNow: shot.whyGenerateNow,

    status: "pending",
    retryCount: 0,

    enhancorNotes: buildEnhancorNotes(shot, dna),

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
      ? compileProviderPrompt(shot, dna, input, hasProductRef ?? false)
      : undefined,
  };
}

// ── Compile All Packages ──

export function compileAllPackages(
  plan: LookbookPlanResult,
  hasProductRef?: boolean,
): GenerationPromptPackage[] {
  // Build shared locks once for the entire set
  const locks = buildSetLocks(plan.dna, plan.input);

  const ordered = plan.generationOrder.map((pos) => {
    const shot = plan.shots.find((s) => s.position === pos);
    return shot;
  }).filter((s): s is RecommendedShot => s !== undefined);

  return ordered.map((shot) =>
    compilePromptPackage(shot, plan.dna, plan, locks, plan.input, hasProductRef),
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
  lines.push("");

  lines.push("GUARDRAIL CHECKLIST:");
  for (const item of pkg.guardrailChecklist) {
    lines.push(`  [ ] ${item}`);
  }
  lines.push("");

  lines.push("ENHANCOR NOTES:");
  for (const note of pkg.enhancorNotes) {
    lines.push(`  - ${note}`);
  }

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

  lines.push("GUARDRAIL CHECKLIST:");
  for (const item of pkg.guardrailChecklist) {
    lines.push(`  [ ] ${item}`);
  }
  lines.push("");

  lines.push("ENHANCOR NOTES:");
  for (const note of pkg.enhancorNotes) {
    lines.push(`  - ${note}`);
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
