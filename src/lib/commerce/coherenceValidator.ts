/**
 * Coherence Validator
 *
 * Validates that a template family is internally coherent: same visual
 * system, proper role coverage, no editorial contamination, and
 * controlled tonal drift.
 *
 * Design principle: conservative about false rejections. Rejecting
 * a good family is worse than allowing a borderline one, because the
 * curation library is expensive to build. Hard-fail only on class-level
 * mismatches and strong editorial contamination. Tonal drift uses
 * confidence-aware score degradation, not brittle threshold rejection.
 */

import type {
  TemplateFamilyDefinition,
  CatalogReferenceImage,
  CommerceShotRole,
  SceneConstraints,
  CoverageQuality,
  ReplacementSafety,
} from "./referenceLibrary.types";
import { REQUIRED_COMMERCE_ROLES, OPTIONAL_COMMERCE_ROLES } from "./referenceLibrary.types";

export interface CoherenceIssue {
  check: string;
  message: string;
  severity: "hard_fail" | "score_degrade" | "flag_review";
  shotPosition?: number;
}

export interface CoherenceReport {
  pass: boolean;
  adjustedCoherenceScore: number;
  issues: CoherenceIssue[];
  suggestedCoverageQuality: CoverageQuality;
}

// ── Editorial Leak Keywords (secondary detection) ──

const EDITORIAL_KEYWORDS = [
  "cinematic",
  "moody",
  "ethereal",
  "dramatic",
  "editorial",
  "atmospheric",
  "dreamy",
  "vintage",
  "artistic",
];

// ── Hard Anti-Randomization Checks ──

function checkBackgroundClassMatch(
  family: TemplateFamilyDefinition,
  images: CatalogReferenceImage[],
): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  for (const shot of family.shots) {
    const img = images.find((i) => i.id === shot.referenceImageId);
    if (img && img.backgroundClass !== family.backgroundFamily) {
      issues.push({
        check: "background_class_mismatch",
        message: `Shot ${shot.position} has backgroundClass "${img.backgroundClass}", family expects "${family.backgroundFamily}"`,
        severity: "hard_fail",
        shotPosition: shot.position,
      });
    }
  }
  return issues;
}

function checkLightingClassMatch(
  family: TemplateFamilyDefinition,
  images: CatalogReferenceImage[],
): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  for (const shot of family.shots) {
    const img = images.find((i) => i.id === shot.referenceImageId);
    if (img && img.lightingClass !== family.lightingFamily) {
      issues.push({
        check: "lighting_class_mismatch",
        message: `Shot ${shot.position} has lightingClass "${img.lightingClass}", family expects "${family.lightingFamily}"`,
        severity: "hard_fail",
        shotPosition: shot.position,
      });
    }
  }
  return issues;
}

function checkEditorialLeaks(
  images: CatalogReferenceImage[],
): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];

  for (const img of images) {
    const constraints = img.extractedConstraints;
    if (!constraints) continue;

    // Structured signals (primary detection)
    const structuredLeak =
      constraints.expression === "intense" ||
      constraints.expression === "dramatic" ||
      constraints.expression === "fashion-editorial";

    // Keyword support (secondary, only flags for review unless structural signal also fires)
    const notesLower = (constraints.notes || "").toLowerCase();
    const detailLower = (constraints.backgroundDetail || "").toLowerCase();
    const hasKeyword = EDITORIAL_KEYWORDS.some(
      (kw) => notesLower.includes(kw) || detailLower.includes(kw),
    );

    if (structuredLeak) {
      issues.push({
        check: "editorial_leak",
        message: `Image "${img.fileName}" has editorial expression: "${constraints.expression}"`,
        severity: "hard_fail",
      });
    } else if (hasKeyword) {
      // Keyword-only: flag for review, not auto-reject
      issues.push({
        check: "editorial_keyword",
        message: `Image "${img.fileName}" has editorial keyword in notes/detail (review manually)`,
        severity: "flag_review",
      });
    }
  }

  return issues;
}

function checkStylingVariance(
  family: TemplateFamilyDefinition,
  images: CatalogReferenceImage[],
): CoherenceIssue[] {
  // Simplified check: if strictness is "identical", all images should
  // have the same styling contamination risk level (within 1 point)
  if (family.stylingStrictness !== "identical") return [];

  const scores = images.map((i) => i.safetyScores.stylingContaminationRisk);
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  if (max - min > 1) {
    return [
      {
        check: "styling_variance",
        message: `Styling contamination risk varies from ${min} to ${max} in "identical" strictness family`,
        severity: "hard_fail",
      },
    ];
  }
  return [];
}

function checkModelEnergy(
  images: CatalogReferenceImage[],
): CoherenceIssue[] {
  const editorialExpressions = ["intense", "dramatic", "fashion-editorial"];
  let count = 0;
  for (const img of images) {
    if (
      img.extractedConstraints &&
      editorialExpressions.includes(img.extractedConstraints.expression)
    ) {
      count++;
    }
  }
  if (count > 1) {
    return [
      {
        check: "model_energy_shift",
        message: `${count} shots have editorial expressions. Commerce families must read as neutral/approachable (max 1 allowed).`,
        severity: "hard_fail",
      },
    ];
  }
  return [];
}

// ── Confidence-Aware Tonal Drift ──

function scoreTonalDrift(
  family: TemplateFamilyDefinition,
  images: CatalogReferenceImage[],
): { scoreDelta: number; issues: CoherenceIssue[] } {
  const anchor = images.find(
    (i) => i.id === family.anchorShotId,
  );
  if (!anchor?.extractedConstraints) {
    return { scoreDelta: 0, issues: [] };
  }

  const anchorC = anchor.extractedConstraints;
  let totalDelta = 0;
  const issues: CoherenceIssue[] = [];

  for (const img of images) {
    if (img.id === anchor.id) continue;
    const c = img.extractedConstraints;
    if (!c) continue;

    const hueDelta = Math.abs(c.backgroundHue - anchorC.backgroundHue);
    const satDelta = Math.abs(c.backgroundSaturation - anchorC.backgroundSaturation);
    const lumDelta = Math.abs(c.backgroundLuminance - anchorC.backgroundLuminance);

    const drifts = hueDelta > 10 || satDelta > 0.05 || lumDelta > 3;
    if (!drifts) continue;

    if (c.confidence >= 0.8) {
      totalDelta += 1;
      issues.push({
        check: "tonal_drift",
        message: `Shot "${img.fileName}" tonal drift from anchor (hue: ${hueDelta.toFixed(1)}, sat: ${satDelta.toFixed(3)}, lum: ${lumDelta.toFixed(1)}). High confidence.`,
        severity: "score_degrade",
      });
    } else if (c.confidence >= 0.5) {
      totalDelta += 0.5;
      issues.push({
        check: "tonal_drift",
        message: `Shot "${img.fileName}" tonal drift (moderate confidence, flagged for review)`,
        severity: "flag_review",
      });
    } else {
      issues.push({
        check: "tonal_drift_low_confidence",
        message: `Shot "${img.fileName}" tonal drift measurement unreliable (low confidence)`,
        severity: "flag_review",
      });
    }
  }

  return { scoreDelta: totalDelta, issues };
}

// ── Coverage Quality ──

function assessCoverageQuality(
  family: TemplateFamilyDefinition,
): CoverageQuality {
  const roles = family.shots.map((s) => s.role);
  const safeties = family.shots.map((s) => s.replacementSafety);

  const hasAllRequired = REQUIRED_COMMERCE_ROLES.every((r) => roles.includes(r));
  if (!hasAllRequired) return "partial";

  const requiredSafeties = family.shots
    .filter((s) => (REQUIRED_COMMERCE_ROLES as string[]).includes(s.role))
    .map((s) => s.replacementSafety);

  const allRequiredSafe = requiredSafeties.every((s) => s === "safe");
  if (!allRequiredSafe) return "partial";

  const hasOptional = family.shots.some((s) =>
    (OPTIONAL_COMMERCE_ROLES as string[]).includes(s.role),
  );

  return hasOptional ? "complete" : "strong";
}

// ── Structural Checks ──

function checkStructure(
  family: TemplateFamilyDefinition,
  images: CatalogReferenceImage[],
): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];

  // Exactly 6 shots
  if (family.shots.length !== 6) {
    issues.push({
      check: "shot_count",
      message: `Family has ${family.shots.length} shots, expected 6`,
      severity: "hard_fail",
    });
  }

  // Anchor role
  const anchor = family.shots.find((s) => s.isAnchor);
  if (!anchor) {
    issues.push({
      check: "missing_anchor",
      message: "No anchor shot designated",
      severity: "hard_fail",
    });
  } else if (
    anchor.role !== "front_seller" &&
    anchor.role !== "three_quarter_seller"
  ) {
    issues.push({
      check: "anchor_role",
      message: `Anchor role is "${anchor.role}", must be front_seller or three_quarter_seller`,
      severity: "hard_fail",
    });
  }

  // Anchor tier
  if (anchor) {
    const anchorImg = images.find((i) => i.id === anchor.referenceImageId);
    if (anchorImg && anchorImg.sourceTier !== "A") {
      issues.push({
        check: "anchor_tier",
        message: `Anchor image is Tier ${anchorImg.sourceTier}, must be Tier A`,
        severity: "hard_fail",
      });
    }
  }

  // Anchor replacement safety
  if (anchor && anchor.replacementSafety !== "safe") {
    issues.push({
      check: "anchor_safety",
      message: `Anchor replacementSafety is "${anchor.replacementSafety}", must be "safe"`,
      severity: "hard_fail",
    });
  }

  // Required roles
  const roles = family.shots.map((s) => s.role);
  for (const req of REQUIRED_COMMERCE_ROLES) {
    if (!roles.includes(req)) {
      issues.push({
        check: "missing_required_role",
        message: `Missing required role: ${req}`,
        severity: "hard_fail",
      });
    }
  }

  // Max 1 Tier C
  const tierCCount = family.shots.filter((s) => s.sourceTier === "C").length;
  if (tierCCount > 1) {
    issues.push({
      check: "tier_c_limit",
      message: `Family has ${tierCCount} Tier C images, max 1 allowed`,
      severity: "hard_fail",
    });
  }

  // All reference IDs resolve
  for (const shot of family.shots) {
    if (!images.some((i) => i.id === shot.referenceImageId)) {
      issues.push({
        check: "missing_reference",
        message: `Shot ${shot.position} references image ID "${shot.referenceImageId}" not found in catalog`,
        severity: "hard_fail",
      });
    }
  }

  // Pose diversity: at least 3 different body directions
  const bodyDirs = new Set(
    images
      .filter((i) => family.shots.some((s) => s.referenceImageId === i.id))
      .map((i) => i.bodyDirection),
  );
  if (bodyDirs.size < 3) {
    issues.push({
      check: "pose_diversity",
      message: `Only ${bodyDirs.size} body directions covered, need at least 3`,
      severity: "score_degrade",
    });
  }

  // No more than 2 identical pose classes
  const poseCounts: Record<string, number> = {};
  for (const img of images) {
    if (family.shots.some((s) => s.referenceImageId === img.id)) {
      poseCounts[img.poseClass] = (poseCounts[img.poseClass] || 0) + 1;
    }
  }
  for (const [pose, count] of Object.entries(poseCounts)) {
    if (count > 2) {
      issues.push({
        check: "pose_repetition",
        message: `Pose class "${pose}" used ${count} times, max 2 allowed`,
        severity: "score_degrade",
      });
    }
  }

  return issues;
}

// ── Main Validator ──

export function validateFamilyCoherence(
  family: TemplateFamilyDefinition,
  images: CatalogReferenceImage[],
): CoherenceReport {
  const familyImages = images.filter((i) =>
    family.shots.some((s) => s.referenceImageId === i.id),
  );

  const allIssues: CoherenceIssue[] = [];

  // Structural checks
  allIssues.push(...checkStructure(family, familyImages));

  // Hard anti-randomization rules
  allIssues.push(...checkBackgroundClassMatch(family, familyImages));
  allIssues.push(...checkLightingClassMatch(family, familyImages));
  allIssues.push(...checkEditorialLeaks(familyImages));
  allIssues.push(...checkStylingVariance(family, familyImages));
  allIssues.push(...checkModelEnergy(familyImages));

  // Confidence-aware tonal drift
  const tonal = scoreTonalDrift(family, familyImages);
  allIssues.push(...tonal.issues);

  // Calculate adjusted coherence score
  let adjustedScore = family.coherenceScore;
  adjustedScore -= tonal.scoreDelta;

  // Score degradation from non-hard-fail issues
  const scoreDegradeCount = allIssues.filter(
    (i) => i.severity === "score_degrade",
  ).length;
  adjustedScore -= scoreDegradeCount * 0.5;

  adjustedScore = Math.max(0, Math.min(5, adjustedScore));

  // Pass/fail
  const hasHardFail = allIssues.some((i) => i.severity === "hard_fail");
  const scoreTooLow = adjustedScore < 3;

  return {
    pass: !hasHardFail && !scoreTooLow,
    adjustedCoherenceScore: adjustedScore,
    issues: allIssues,
    suggestedCoverageQuality: assessCoverageQuality(family),
  };
}
