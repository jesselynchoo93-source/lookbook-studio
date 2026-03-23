/**
 * F8: Deterministic Provider Critic
 *
 * Reviews compiled provider prompts for quality issues before display.
 * Checks for forbidden features, mixed goals, vague filler, missing
 * contact language, contradictory physics, and realism risks.
 *
 * When issues are found, the critic can auto-fix (strip offending
 * fragments) or attach warnings for QA view.
 */
import type {
  ProductFingerprint,
  BagFingerprint,
  CriticViolation,
  ProviderCompilationMode,
  BagShotClass,
} from "./types";

// ── Forbidden Feature Check ──
// Prompt must not mention features the product doesn't have.

function checkForbiddenFeatures(
  positive: string,
  fp: ProductFingerprint,
): CriticViolation[] {
  const violations: CriticViolation[] = [];
  const lower = positive.toLowerCase();

  // Check explicit forbidden elements
  for (const forbidden of fp.forbiddenElements) {
    const term = forbidden.toLowerCase();
    if (lower.includes(term)) {
      violations.push({
        severity: "error",
        code: "FORBIDDEN_FEATURE",
        message: `Prompt mentions forbidden element: "${forbidden}"`,
        fix: positive.replace(new RegExp(forbidden, "gi"), "").replace(/\s+/g, " "),
      });
    }
  }

  // Check structural contradictions for bags
  if (fp.family === "bags") {
    const bag = fp as BagFingerprint;

    if (!bag.strapPresent) {
      if (lower.includes("crossbody") || lower.includes("shoulder strap")) {
        violations.push({
          severity: "error",
          code: "NO_STRAP_MENTIONED",
          message: "Prompt mentions strap but product has no strap",
        });
      }
    }

    if (bag.closureType === "open-top") {
      for (const term of ["zipper", "zip closure", "flap closure", "magnetic snap"]) {
        if (lower.includes(term)) {
          violations.push({
            severity: "error",
            code: "WRONG_CLOSURE",
            message: `Prompt mentions "${term}" but product has open-top closure`,
          });
        }
      }
    }
  }

  return violations;
}

// ── Mixed Detail Goals ──
// A macro/detail shot should prove ONE zone, not a laundry list.

const DETAIL_KEYWORDS = [
  "hardware", "buckle", "closure", "stitching", "edge",
  "interior", "lining", "zipper", "handle", "attachment",
  "logo", "seam", "construction", "texture",
];

function checkMixedDetailGoals(
  positive: string,
  mode: ProviderCompilationMode,
): CriticViolation[] {
  if (mode !== "detail") return [];

  const lower = positive.toLowerCase();
  const found = DETAIL_KEYWORDS.filter(kw => lower.includes(kw));

  if (found.length > 4) {
    return [{
      severity: "warning",
      code: "MIXED_DETAIL_GOALS",
      message: `Detail shot mentions ${found.length} distinct zones (${found.join(", ")}). Should focus on 1-2 proof targets.`,
    }];
  }

  return [];
}

// ── Vague Filler Check ──
// Flag generic luxury prose that doesn't serve product proof.

const VAGUE_FILLER = [
  "exquisite craftsmanship",
  "timeless elegance",
  "luxurious feel",
  "premium quality",
  "stunning beauty",
  "breathtaking",
  "masterfully crafted",
  "impeccable attention to detail",
  "sophisticated charm",
  "effortless style",
  "unparalleled luxury",
];

function checkVagueFiller(
  positive: string,
): CriticViolation[] {
  const lower = positive.toLowerCase();
  const found = VAGUE_FILLER.filter(phrase => lower.includes(phrase));

  if (found.length > 0) {
    return [{
      severity: "warning",
      code: "VAGUE_FILLER",
      message: `Prompt contains generic luxury filler: "${found[0]}". Replace with specific proof language.`,
    }];
  }

  return [];
}

// ── Missing Contact Language ──
// Editorial on-body shots must describe how the bag contacts the body.

const CONTACT_TERMS = [
  "resting", "against", "contact", "pressing", "weight",
  "grip", "holding", "carry", "hanging", "swinging",
  "on lap", "at side", "on shoulder", "in hand",
];

function checkMissingContact(
  positive: string,
  mode: ProviderCompilationMode,
  shotClass?: BagShotClass,
): CriticViolation[] {
  if (mode !== "on-body") return [];
  if (shotClass && !shotClass.startsWith("proof_hero") && !shotClass.startsWith("proof_profile") && shotClass !== "editorial_desire") return [];

  const lower = positive.toLowerCase();
  const hasContact = CONTACT_TERMS.some(term => lower.includes(term));

  if (!hasContact) {
    return [{
      severity: "warning",
      code: "MISSING_CONTACT",
      message: "On-body shot lacks body-object contact language (grip, weight, resting, etc.)",
    }];
  }

  return [];
}

// ── Contradictory Physics ──
// Check for physics that contradict the shot type.

function checkContradictoryPhysics(
  positive: string,
  mode: ProviderCompilationMode,
): CriticViolation[] {
  const violations: CriticViolation[] = [];
  const lower = positive.toLowerCase();

  // Product-only shot should not mention body/model
  if (mode === "product-only") {
    for (const term of ["model", "wearing", "carrying", "hand holding", "wrist", "on body"]) {
      if (lower.includes(term)) {
        violations.push({
          severity: "error",
          code: "BODY_IN_PRODUCT_ONLY",
          message: `Product-only shot mentions body/model: "${term}"`,
        });
      }
    }
  }

  // Detail shot should not mention full body
  if (mode === "detail") {
    for (const term of ["full body", "head to toe", "full-length", "walking stride"]) {
      if (lower.includes(term)) {
        violations.push({
          severity: "error",
          code: "FULL_BODY_IN_DETAIL",
          message: `Detail shot mentions full body: "${term}"`,
        });
      }
    }
  }

  // Perfect symmetry on soft goods
  if (lower.includes("perfectly symmetric") || lower.includes("mirror-perfect") || lower.includes("exact symmetry")) {
    violations.push({
      severity: "warning",
      code: "PERFECT_SYMMETRY_SOFT_GOODS",
      message: "Prompt asks for perfect symmetry on soft goods (unrealistic)",
    });
  }

  return violations;
}

// ── Readable Text Check ──
// Never ask for readable tiny text unless absolutely required.

function checkReadableText(
  positive: string,
): CriticViolation[] {
  const lower = positive.toLowerCase();
  if (lower.includes("readable text") || lower.includes("legible text") || lower.includes("read the logo text")) {
    return [{
      severity: "warning",
      code: "READABLE_TEXT",
      message: "Prompt asks for readable/legible text. AI generators struggle with text rendering. Prefer placement truth over text readability.",
    }];
  }
  return [];
}

// ── Macro Shot Proof Zone Check ──
// Macro shots must have a specific proof zone, not just generic "detail".

function checkMacroProofZone(
  positive: string,
  mode: ProviderCompilationMode,
  shotClass?: BagShotClass,
): CriticViolation[] {
  if (mode !== "detail") return [];
  if (!shotClass?.startsWith("proof_macro")) return [];

  const lower = positive.toLowerCase();
  const hasSpecificZone = [
    "seam", "stitch", "attachment", "handle",
    "logo", "mark", "buckle", "closure", "opening",
    "interior", "lining", "edge", "panel",
  ].some(term => lower.includes(term));

  if (!hasSpecificZone) {
    return [{
      severity: "warning",
      code: "MISSING_PROOF_ZONE",
      message: "Macro shot lacks a specific proof zone target. Add a concrete detail (seam, attachment, logo, etc.)",
    }];
  }

  return [];
}

// ── Main Critic ──

export interface CriticInput {
  positive: string;
  negative: string;
  mode: ProviderCompilationMode;
  fp?: ProductFingerprint;
  shotClass?: BagShotClass;
}

export interface CriticResult {
  violations: CriticViolation[];
  /** Cleaned positive prompt (forbidden features stripped) */
  cleanedPositive: string;
  /** Cleaned negative prompt */
  cleanedNegative: string;
}

/**
 * Run all critic checks on a compiled provider prompt.
 * Returns violations and a cleaned prompt with auto-fixes applied.
 */
export function runProviderCritic(input: CriticInput): CriticResult {
  const violations: CriticViolation[] = [];
  let cleanedPositive = input.positive;

  // 1. Forbidden features (has auto-fix)
  if (input.fp) {
    const forbidden = checkForbiddenFeatures(cleanedPositive, input.fp);
    violations.push(...forbidden);

    // Apply fixes for forbidden features
    for (const v of forbidden) {
      if (v.fix) cleanedPositive = v.fix;
    }
  }

  // 2. Mixed detail goals
  violations.push(...checkMixedDetailGoals(cleanedPositive, input.mode));

  // 3. Vague filler
  violations.push(...checkVagueFiller(cleanedPositive));

  // 4. Missing contact language
  violations.push(...checkMissingContact(cleanedPositive, input.mode, input.shotClass));

  // 5. Contradictory physics
  violations.push(...checkContradictoryPhysics(cleanedPositive, input.mode));

  // 6. Readable text
  violations.push(...checkReadableText(cleanedPositive));

  // 7. Macro proof zone
  violations.push(...checkMacroProofZone(cleanedPositive, input.mode, input.shotClass));

  // Clean up whitespace
  cleanedPositive = cleanedPositive.replace(/\s+/g, " ").trim();

  return {
    violations,
    cleanedPositive,
    cleanedNegative: input.negative,
  };
}
