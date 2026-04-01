/**
 * Derivation layer: maps user-facing controls (PrimaryObjective, SecondaryEmphasis,
 * PoseDirection, BrandVisibility) to internal types (CampaignGoal, CreativityLevel,
 * LogoVisibilityPriority) used by archetype scoring and DNA resolution.
 *
 * This module is the single source of truth for these mappings.
 */

import type {
  PrimaryObjective,
  SecondaryEmphasis,
  CampaignGoal,
  PoseDirection,
  CreativityLevel,
  BrandVisibility,
  LogoVisibilityPriority,
} from "./types";

// ── Primary Objective → Internal CampaignGoal(s) ──

const PRIMARY_GOAL_MAP: Record<PrimaryObjective, CampaignGoal[]> = {
  sell_clearly: ["product_clarity"],
  shape_and_fit: ["silhouette"],
  craftsmanship: ["detail_focus"],
  editorial_story: ["styling_story"], // NOT mood; mood is opt-in via secondary emphasis
};

// ── Secondary Emphasis → CampaignGoal ──

const SECONDARY_GOAL_MAP: Record<SecondaryEmphasis, CampaignGoal> = {
  branding: "premium_branding",
  movement: "movement",
  mood: "mood",
  styling: "styling_story",
  detail: "detail_focus",
};

// ── Primary Objective → Archetype suitability field to check ──

export type SuitabilityField =
  | "productClaritySuitability"
  | "silhouetteSuitability"
  | "detailSuitability"
  | "editorialStrength"
  | "movementSuitability"
  | "logoVisibilitySuitability";

const OBJECTIVE_SUITABILITY_MAP: Record<PrimaryObjective, SuitabilityField> = {
  sell_clearly: "productClaritySuitability",
  shape_and_fit: "silhouetteSuitability",
  craftsmanship: "detailSuitability",
  editorial_story: "editorialStrength",
};

const EMPHASIS_SUITABILITY_MAP: Record<SecondaryEmphasis, SuitabilityField> = {
  branding: "logoVisibilitySuitability",
  movement: "movementSuitability",
  mood: "editorialStrength",
  styling: "editorialStrength",
  detail: "detailSuitability",
};

// ── Public API ──

export interface DerivedGoals {
  /** The primary internal goal(s) for scoring/DNA */
  primaryGoals: CampaignGoal[];
  /** The secondary internal goal, if any (null if none or duplicates a primary) */
  secondaryGoal: CampaignGoal | null;
  /** All effective goals (deduplicated union of primary + secondary) */
  allEffectiveGoals: CampaignGoal[];
  /** Archetype suitability field to check for primary objective bonus */
  primarySuitabilityField: SuitabilityField;
  /** Archetype suitability field to check for secondary emphasis bonus (null if no emphasis) */
  secondarySuitabilityField: SuitabilityField | null;
}

export function deriveGoals(
  objective: PrimaryObjective,
  emphasis?: SecondaryEmphasis,
): DerivedGoals {
  const primaryGoals = PRIMARY_GOAL_MAP[objective];
  const rawSecondaryGoal = emphasis ? SECONDARY_GOAL_MAP[emphasis] : null;

  // Deduplicate: if secondary duplicates a primary, drop it
  const secondaryGoal =
    rawSecondaryGoal && !primaryGoals.includes(rawSecondaryGoal)
      ? rawSecondaryGoal
      : null;

  const allSet = new Set<CampaignGoal>(primaryGoals);
  if (secondaryGoal) allSet.add(secondaryGoal);

  return {
    primaryGoals,
    secondaryGoal,
    allEffectiveGoals: Array.from(allSet),
    primarySuitabilityField: OBJECTIVE_SUITABILITY_MAP[objective],
    secondarySuitabilityField: emphasis ? EMPHASIS_SUITABILITY_MAP[emphasis] : null,
  };
}

// ── Trivial type bridges ──
// PoseDirection and CreativityLevel have the same literal values by design.
// BrandVisibility and LogoVisibilityPriority have the same literal values.

export function poseDirectionToCreativity(pd: PoseDirection): CreativityLevel {
  return pd as CreativityLevel;
}

export function brandVisibilityToLogoPriority(bv: BrandVisibility): LogoVisibilityPriority {
  return bv as LogoVisibilityPriority;
}
