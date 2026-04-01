/**
 * Catalog Validator
 *
 * Quality validation for CatalogReferenceImage entries.
 * Enforces minimum standards for resolution, metadata completeness,
 * safety scores, source tiering, and anchor eligibility.
 */

import type {
  CatalogReferenceImage,
  CommerceSafetyScores,
  SourceTier,
} from "./referenceLibrary.types";

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  anchorEligible: boolean;
}

const BLOCKED_DOMAINS = [
  "pinterest.com",
  "instagram.com",
  "tumblr.com",
  "tiktok.com",
  "reddit.com",
  "flickr.com",
];

const ALLOWED_SOURCE_TYPES = ["pdp", "catalog", "wholesale_linesheet", "press_kit"];

function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

function validateSafetyScores(
  scores: CommerceSafetyScores,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fields: (keyof CommerceSafetyScores)[] = [
    "productVisibilityScore",
    "backgroundNeutralityScore",
    "poseDeviationRisk",
    "stylingContaminationRisk",
    "garmentReplacementDifficulty",
    "faceSwapDifficulty",
    "fullIdentitySwapDifficulty",
  ];

  for (const f of fields) {
    const v = scores[f];
    if (v == null) {
      issues.push({ field: `safetyScores.${f}`, message: "Missing value", severity: "error" });
    } else if (v < 1 || v > 5 || !Number.isInteger(v)) {
      issues.push({
        field: `safetyScores.${f}`,
        message: `Must be integer 1-5, got ${v}`,
        severity: "error",
      });
    }
  }

  return issues;
}

function checkTierCRules(entry: CatalogReferenceImage): ValidationIssue[] {
  if (entry.sourceTier !== "C") return [];

  const issues: ValidationIssue[] = [];
  if (entry.safetyScores.backgroundNeutralityScore < 4) {
    issues.push({
      field: "safetyScores.backgroundNeutralityScore",
      message: "Tier C entries require backgroundNeutralityScore >= 4",
      severity: "error",
    });
  }
  if (entry.safetyScores.stylingContaminationRisk > 2) {
    issues.push({
      field: "safetyScores.stylingContaminationRisk",
      message: "Tier C entries require stylingContaminationRisk <= 2",
      severity: "error",
    });
  }
  return issues;
}

function checkAnchorEligibility(entry: CatalogReferenceImage): boolean {
  return (
    entry.sourceTier === "A" &&
    entry.safetyScores.productVisibilityScore >= 4 &&
    entry.safetyScores.poseDeviationRisk <= 2
  );
}

export function validateCatalogEntry(
  entry: CatalogReferenceImage,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Required metadata
  if (!entry.id) {
    issues.push({ field: "id", message: "Missing image ID (SHA-256)", severity: "error" });
  }
  if (!entry.fileName) {
    issues.push({ field: "fileName", message: "Missing file name", severity: "error" });
  }
  if (!entry.relativePath) {
    issues.push({ field: "relativePath", message: "Missing relative path", severity: "error" });
  }
  if (!entry.sourceUrl) {
    issues.push({ field: "sourceUrl", message: "Missing source URL", severity: "error" });
  }

  // Blocked domains
  if (entry.sourceUrl && isBlockedDomain(entry.sourceUrl)) {
    issues.push({
      field: "sourceUrl",
      message: `Source URL from blocked domain`,
      severity: "error",
    });
  }

  // Source type
  if (!ALLOWED_SOURCE_TYPES.includes(entry.sourceType)) {
    issues.push({
      field: "sourceType",
      message: `Invalid source type: ${entry.sourceType}`,
      severity: "error",
    });
  }

  // Source tier
  if (!["A", "B", "C"].includes(entry.sourceTier)) {
    issues.push({
      field: "sourceTier",
      message: `Invalid source tier: ${entry.sourceTier}`,
      severity: "error",
    });
  }

  // Quality score
  if (entry.qualityScore < 3) {
    issues.push({
      field: "qualityScore",
      message: `Quality score ${entry.qualityScore} below minimum 3 for approval`,
      severity: "error",
    });
  }

  // Safety scores
  if (!entry.safetyScores) {
    issues.push({
      field: "safetyScores",
      message: "Missing safety scores object",
      severity: "error",
    });
  } else {
    issues.push(...validateSafetyScores(entry.safetyScores));

    // Minimum thresholds for any entry
    if (entry.safetyScores.backgroundNeutralityScore < 3) {
      issues.push({
        field: "safetyScores.backgroundNeutralityScore",
        message: "backgroundNeutralityScore must be >= 3",
        severity: "error",
      });
    }
    if (entry.safetyScores.productVisibilityScore < 3) {
      issues.push({
        field: "safetyScores.productVisibilityScore",
        message: "productVisibilityScore must be >= 3",
        severity: "error",
      });
    }

    // Tier C rules
    issues.push(...checkTierCRules(entry));
  }

  const anchorEligible = entry.safetyScores
    ? checkAnchorEligibility(entry)
    : false;

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    anchorEligible,
  };
}

/**
 * Tier A criteria (review-based, not brand-name-based):
 * - backgroundNeutralityScore >= 4
 * - productVisibilityScore >= 4
 * - poseDeviationRisk <= 2
 * - stylingContaminationRisk <= 2
 * - backgroundClass is seamless_white, seamless_grey, or concrete_minimal
 * - lightingClass is soft_even or soft_directional
 */
export function meetssTierACriteria(entry: CatalogReferenceImage): boolean {
  const s = entry.safetyScores;
  if (!s) return false;

  const allowedBg = ["seamless_white", "seamless_grey", "concrete_minimal"];
  const allowedLight = ["soft_even", "soft_directional"];

  return (
    s.backgroundNeutralityScore >= 4 &&
    s.productVisibilityScore >= 4 &&
    s.poseDeviationRisk <= 2 &&
    s.stylingContaminationRisk <= 2 &&
    allowedBg.includes(entry.backgroundClass) &&
    allowedLight.includes(entry.lightingClass)
  );
}

/**
 * Check if an entry meets Tier B criteria (passes general quality
 * but does not meet all Tier A criteria).
 */
export function meetsTierBCriteria(entry: CatalogReferenceImage): boolean {
  const s = entry.safetyScores;
  if (!s) return false;

  return (
    s.backgroundNeutralityScore >= 3 &&
    s.productVisibilityScore >= 3 &&
    !meetssTierACriteria(entry)
  );
}

/**
 * Auto-assign tier based on quality criteria.
 * This is a helper for curation, not a replacement for human review.
 */
export function suggestTier(entry: CatalogReferenceImage): SourceTier {
  if (meetssTierACriteria(entry)) return "A";
  if (meetsTierBCriteria(entry)) return "B";
  return "C";
}
