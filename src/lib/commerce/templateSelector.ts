/**
 * Template Family Selector
 *
 * Filters and ranks template families for the commerce engine.
 *
 * Ranking order:
 * 1. bestForProductTypes match (boost, not gate; untagged families still surface)
 * 2. coverageQuality (complete > strong)
 * 3. Swap safety (fewer caution shots = higher rank)
 * 4. coherenceScore
 * 5. Background/lighting preference matches
 */

import type { ProductFamily, GenderPresentation, ProductFingerprint } from "@/lib/lookbook/types";
import type {
  TemplateFamilyDefinition,
  BestForTag,
  BackgroundClass,
  LightingClass,
  CoverageQuality,
  CommerceShotRole,
  GarmentFeatureToken,
} from "./referenceLibrary.types";
import { normalizeToFeatureToken } from "./referenceLibrary.types";
import { isV1Background, isV1Lighting, isV1ProductFamily } from "./v1ScopeConfig";

export interface SelectionCriteria {
  productFamily: ProductFamily;
  genderPresentation: GenderPresentation;
  /** Optional: product type tag for bestFor ranking boost */
  productTypeHint?: BestForTag;
  /** Optional: preferred background */
  preferredBackground?: BackgroundClass;
  /** Optional: preferred lighting */
  preferredLighting?: LightingClass;
  /** Optional: product fingerprint for garment-feature compatibility scoring */
  fingerprint?: ProductFingerprint | Record<string, unknown>;
}

const COVERAGE_RANK: Record<CoverageQuality, number> = {
  complete: 3,
  strong: 2,
  partial: 1,
};

function countCautionShots(family: TemplateFamilyDefinition): number {
  return family.shots.filter((s) => s.replacementSafety === "caution").length;
}

function hasRiskyRequiredRole(family: TemplateFamilyDefinition): boolean {
  const requiredRoles = [
    "front_seller",
    "three_quarter_seller",
    "side_fit_proof",
    "back_fit_proof",
  ];
  return family.shots.some(
    (s) => requiredRoles.includes(s.role) && s.replacementSafety === "risky",
  );
}

function anchorIsSafe(family: TemplateFamilyDefinition): boolean {
  const anchor = family.shots.find((s) => s.isAnchor);
  return anchor?.replacementSafety === "safe";
}

function countRiskyShots(family: TemplateFamilyDefinition): number {
  return family.shots.filter((s) => s.replacementSafety === "risky").length;
}

// ── Garment-Feature Compatibility ──

const REQUIRED_ROLES: CommerceShotRole[] = [
  "front_seller", "three_quarter_seller", "side_fit_proof", "back_fit_proof",
];

function computeCompatibilityPenalty(
  family: TemplateFamilyDefinition,
  fingerprint: ProductFingerprint | Record<string, unknown>,
): number {
  const fp = fingerprint as Record<string, unknown>;
  const rawForbidden = Array.isArray(fp.forbiddenElements) ? (fp.forbiddenElements as string[]) : [];
  const forbidden = rawForbidden.map(normalizeToFeatureToken).filter(Boolean) as GarmentFeatureToken[];
  if (forbidden.length === 0) return 0;

  let penalty = 0;
  for (const shot of family.shots) {
    const implied = (shot.impliedGarmentFeatures || []);
    const conflicts = implied.filter((f) => forbidden.includes(f));
    if (conflicts.length > 0) {
      penalty += REQUIRED_ROLES.includes(shot.role) ? -30 : -10;
    }
  }
  return penalty;
}

/** Returns true if ALL required roles in the family have conflicts (total incompatibility). */
function isTotallyIncompatible(
  family: TemplateFamilyDefinition,
  fingerprint: ProductFingerprint | Record<string, unknown>,
): boolean {
  const fp = fingerprint as Record<string, unknown>;
  const rawForbidden = Array.isArray(fp.forbiddenElements) ? (fp.forbiddenElements as string[]) : [];
  const forbidden = rawForbidden.map(normalizeToFeatureToken).filter(Boolean) as GarmentFeatureToken[];
  if (forbidden.length === 0) return false;

  const requiredShots = family.shots.filter((s) => REQUIRED_ROLES.includes(s.role));
  if (requiredShots.length === 0) return false;

  return requiredShots.every((shot) => {
    const implied = (shot.impliedGarmentFeatures || []);
    return implied.some((f) => forbidden.includes(f));
  });
}

export function selectTemplateFamilies(
  criteria: SelectionCriteria,
  allFamilies: TemplateFamilyDefinition[],
): TemplateFamilyDefinition[] {
  // Filter: approved, matching product family + gender, V1 allowed
  const eligible = allFamilies.filter((f) => {
    if (f.approvalStatus !== "approved") return false;
    if (f.genderPresentation !== criteria.genderPresentation) return false;
    if (!f.productFamilies.includes(criteria.productFamily)) return false;

    // V1 environment gate
    if (!isV1Background(f.backgroundFamily)) return false;
    if (!isV1Lighting(f.lightingFamily)) return false;

    // V1 product family gate
    if (!isV1ProductFamily(criteria.productFamily)) return false;

    // replacementSafety selection rules
    if (!anchorIsSafe(f)) return false;
    if (hasRiskyRequiredRole(f)) return false;
    if (countRiskyShots(f) > 1) return false;

    // Hard gate: filter out families where ALL required roles conflict
    if (criteria.fingerprint && isTotallyIncompatible(f, criteria.fingerprint)) return false;

    // V1 picker: accept partial coverage (V1 library is thin,
    // side_fit_proof is unavailable from standard PDP photography)

    return true;
  });

  // Rank
  const scored = eligible.map((f) => {
    let score = 0;

    // 1. bestForProductTypes match (boost, not gate)
    if (
      criteria.productTypeHint &&
      f.bestForProductTypes.includes(criteria.productTypeHint)
    ) {
      score += 100;
    }

    // 2. coverageQuality
    score += COVERAGE_RANK[f.coverageQuality] * 20;

    // 3. Swap safety (fewer caution = higher)
    score -= countCautionShots(f) * 5;

    // 4. coherenceScore
    score += f.coherenceScore * 3;

    // 5. Background/lighting preference
    if (criteria.preferredBackground && f.backgroundFamily === criteria.preferredBackground) {
      score += 5;
    }
    if (criteria.preferredLighting && f.lightingFamily === criteria.preferredLighting) {
      score += 5;
    }

    // 6. Garment-feature compatibility penalty
    if (criteria.fingerprint) {
      score += computeCompatibilityPenalty(f, criteria.fingerprint);
    }

    return { family: f, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map((s) => s.family);
}

/**
 * Returns how many strong candidate families match the criteria.
 * Used for library-thinness UX: if < 3, show fewer with explanation.
 */
export function countStrongCandidates(
  criteria: SelectionCriteria,
  allFamilies: TemplateFamilyDefinition[],
): number {
  return selectTemplateFamilies(criteria, allFamilies).length;
}
