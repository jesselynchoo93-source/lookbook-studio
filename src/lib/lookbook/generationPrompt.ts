/**
 * V3.0: Generation-ready prompt packages.
 *
 * Turns each planned shot into a structured package that can be:
 * - copy/pasted into Higgsfield
 * - consumed by a future tracker UI
 * - consumed by a future API generation path
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
} from "./types";
import {
  PRODUCT_FAMILY_LABELS,
  GENDER_LABELS,
  STYLE_LABELS,
  GOAL_LABELS,
} from "./types";
import { NEGATIVE_DEFAULTS } from "./realismRules";

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

// ── Continuity Lock ──

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

// ── Reliability Label ──

function extractReliabilityLabel(badges: string[]): "High reliability" | "Moderate reliability" | "Higher risk" {
  if (badges.includes("Higher risk")) return "Higher risk";
  if (badges.includes("High reliability")) return "High reliability";
  return "Moderate reliability";
}

// ── Shoot DNA Summary ──

function buildShootDNASummary(dna: MasterShootDNA): string {
  // campaignDirection already contains the full narrative; just add gender for context
  const gender = GENDER_LABELS[dna.genderPresentation];
  return `${gender}. ${dna.campaignDirection}`;
}

// ── Prompt Normalization ──
// Cleans up compiled prompts to remove duplication inherited from brief composition.

function normalizeCompiledPrompt(raw: string, item: string): string {
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

  // 4. Remove sentences that duplicate an earlier sentence.
  //    Two passes: exact-match dedup, then keyword-overlap dedup.
  const sentences = text.split(/(?<=\.)\s+/);

  // Extract content keywords from a sentence (nouns and key adjectives, 4+ chars)
  const STOP_WORDS = new Set([
    "this", "that", "with", "from", "into", "also", "been", "have", "will",
    "should", "must", "does", "than", "more", "very", "over", "under",
  ]);
  function extractKeywords(s: string): Set<string> {
    return new Set(
      s.toLowerCase()
        .replace(/[.,;:!?()]/g, "")
        // Normalize common verb endings so "faces"/"facing", "tucked"/"tuck" match
        .replace(/\b(\w+?)(?:ing|ed|es|s)\b/g, "$1")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
    );
  }

  const kept: { raw: string; keywords: Set<string> }[] = [];
  for (const s of sentences) {
    const norm = s.toLowerCase().replace(/\s+/g, " ").trim();
    if (norm.length < 8) continue;

    // Exact duplicate check (case-insensitive)
    if (kept.some((k) => k.raw.toLowerCase().replace(/\s+/g, " ").trim() === norm)) continue;

    // Keyword overlap: if a short sentence's keywords are 80%+ covered by a prior sentence
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

  // 5. Clean up stray double spaces or leading spaces
  text = text.replace(/\s{2,}/g, " ").trim();

  return text;
}

// ── Generator Prompt ──

export function formatGeneratorPrompt(shot: RecommendedShot, dna: MasterShootDNA): string {
  const family = PRODUCT_FAMILY_LABELS[dna.productFamily];
  const item = dna.specificItem || family.toLowerCase();
  const gender = GENDER_LABELS[dna.genderPresentation];
  const style = STYLE_LABELS[dna.targetStyle].toLowerCase();

  // Build a concise, pasteable prompt
  const parts: string[] = [];

  // Opening: style + subject
  parts.push(`${style} fashion photograph`);

  // Gender context
  if (gender === "Menswear") parts.push("male model");
  else if (gender === "Womenswear") parts.push("female model");
  else parts.push("model");

  // Framing summary (first clause of framingDelta before the lens spec)
  const framingSummary = shot.framingDelta.split(" at ")[0];
  if (framingSummary) parts.push(framingSummary.toLowerCase());

  // Product placement
  parts.push(`featuring ${item}`);

  // Join the opening
  let prompt = parts.join(", ") + ". ";

  // Add the brief as the detailed scene description
  prompt += shot.deltaBrief;

  // Add environment and lighting from DNA (concise, first clause only)
  prompt += ` Environment: ${dna.environmentFamily.split(".")[0]}.`;
  prompt += ` Lighting: ${dna.lightingFamily.split(".")[0]}.`;
  prompt += ` Finish: ${dna.finishFamily.split(".")[0]}.`;

  // Normalize: deduplicate framing restatements, product anchors, repeated sentences
  return normalizeCompiledPrompt(prompt, item);
}

// ── Negative Prompt ──

export function buildNegativePrompt(shot: RecommendedShot, _dna: MasterShootDNA): string {
  const shotSpecific = shot.negativeCues;
  if (shotSpecific && shotSpecific !== "(see global negative cues)") {
    return `${NEGATIVE_DEFAULTS}, ${shotSpecific}`;
  }
  return NEGATIVE_DEFAULTS;
}

// ── Guardrail Checklist ──

export function buildGuardrailChecklist(shot: RecommendedShot): string[] {
  const guardrail = shot.realismGuardrail;
  if (!guardrail) return [];

  // Split on periods and commas that separate distinct checks
  // First try splitting on ". " for sentence-level items
  const sentences = guardrail
    .split(/\.\s+/)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter((s) => s.length > 0);

  if (sentences.length >= 2) {
    return sentences;
  }

  // If only one sentence, try splitting on ", " for comma-separated checks
  const parts = guardrail
    .split(/,\s+/)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter((s) => s.length > 0);

  return parts;
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
      // editorial, silhouette, motion
      notes.push(`Verify ${focus.boundary}`);
    }
  }

  // Deduplicate (evidence hints may overlap with family hints)
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
): GenerationPromptPackage {
  return {
    shotPosition: shot.position,
    archetypeId: shot.archetype.id,
    archetypeTitle: shot.archetype.title,

    generationPriority: shot.generationPriority,
    generationPhase: assignGenerationPhase(shot),
    reliabilityLabel: extractReliabilityLabel(shot.badges),

    shootDNA: buildShootDNASummary(dna),
    shotBrief: shot.deltaBrief,
    generatorPrompt: formatGeneratorPrompt(shot, dna),
    negativePrompt: buildNegativePrompt(shot, dna),
    guardrailChecklist: buildGuardrailChecklist(shot),

    continuity: buildContinuityLock(dna),

    evidenceProvided: shot.evidenceProvided,
    whySelected: shot.whySelected || "",
    whyGenerateNow: shot.whyGenerateNow,

    status: "pending",
    retryCount: 0,

    enhancorNotes: buildEnhancorNotes(shot, dna),
  };
}

// ── Compile All Packages ──

export function compileAllPackages(plan: LookbookPlanResult): GenerationPromptPackage[] {
  // generationOrder stores 1-based positions (see recommendShots.ts line 1208)
  const ordered = plan.generationOrder.map((pos) => {
    const shot = plan.shots.find((s) => s.position === pos);
    return shot;
  }).filter((s): s is RecommendedShot => s !== undefined);

  return ordered.map((shot) => compilePromptPackage(shot, plan.dna, plan));
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

// ── Clipboard Export: Full Queue ──

export function formatQueueForClipboard(pkgs: GenerationPromptPackage[]): string {
  const lines: string[] = [];
  const item = pkgs[0]?.shootDNA || "Lookbook";

  lines.push("GENERATION QUEUE");
  lines.push("=================");
  lines.push(item);
  lines.push("");

  // Group by phase
  const anchors = pkgs.filter((p) => p.generationPhase === "anchor");
  const details = pkgs.filter((p) => p.generationPhase === "detail_validation");
  const editorial = pkgs.filter((p) => p.generationPhase === "editorial");

  if (anchors.length > 0) {
    lines.push("--- ANCHOR SHOTS (generate first, validate product rendering) ---");
    lines.push("");
    for (const pkg of anchors) {
      lines.push(formatForClipboard(pkg));
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  if (details.length > 0) {
    lines.push("--- DETAIL VALIDATION (confirm materials render at close range) ---");
    lines.push("");
    for (const pkg of details) {
      lines.push(formatForClipboard(pkg));
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  if (editorial.length > 0) {
    lines.push("--- EDITORIAL (atmospheric, generate after anchors pass) ---");
    lines.push("");
    for (const pkg of editorial) {
      lines.push(formatForClipboard(pkg));
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  lines.push(`Generated by Lookbook Studio v3`);
  return lines.join("\n");
}

// ── Helpers ──

function formatPhaseLabel(phase: GenerationPhase): string {
  switch (phase) {
    case "anchor": return "Anchor";
    case "detail_validation": return "Detail Validation";
    case "editorial": return "Editorial";
  }
}
