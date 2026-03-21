import type {
  ShotArchetype,
  LookbookInput,
  ScoredArchetype,
  SuitabilityRating,
  ShotBlueprint,
} from "./types";

function ratingToNumber(r: SuitabilityRating): number {
  if (r === "high") return 100;
  if (r === "medium") return 60;
  return 20;
}

// ── Occlusion Rules ──

interface OcclusionRule {
  items: string[];
  penalties: { archetypeIdPattern?: string; fieldMatch?: Partial<Record<keyof ShotArchetype, string>>; reason: string; penalty: number }[];
}

const OCCLUSION_RULES: OcclusionRule[] = [
  {
    items: ["earrings", "earring", "ear cuff", "hoop", "stud", "drop earring"],
    penalties: [
      { archetypeIdPattern: "hand_interaction", reason: "hands likely cover ear area", penalty: -50 },
      { archetypeIdPattern: "back_view", reason: "back angle hides earrings completely", penalty: -60 },
      { archetypeIdPattern: "full_body", reason: "earrings too small to read at full-body scale", penalty: -40 },
      { archetypeIdPattern: "silhouette_fullbody", reason: "full-body silhouette does not show earring detail", penalty: -50 },
      { archetypeIdPattern: "contrapposto", reason: "full-body pose loses earring at this scale", penalty: -40 },
      { archetypeIdPattern: "half_stride", reason: "motion makes earring unreadable", penalty: -40 },
      { archetypeIdPattern: "pivot_step", reason: "rotation hides the featured ear", penalty: -40 },
      { archetypeIdPattern: "seated", reason: "seated poses often angle head away from optimal earring visibility", penalty: -25 },
      { archetypeIdPattern: "logo_focus", reason: "earrings have no logo zone for a logo crop", penalty: -60 },
    ],
  },
  {
    items: ["necklace", "pendant", "choker", "chain"],
    penalties: [
      { archetypeIdPattern: "full_body", reason: "necklace too small at full-body scale", penalty: -30 },
      { archetypeIdPattern: "back_view", reason: "necklace not visible from behind", penalty: -60 },
      { archetypeIdPattern: "half_stride", reason: "motion bounces necklace unpredictably", penalty: -25 },
    ],
  },
];

function getOcclusionPenalty(archetype: ShotArchetype, input: LookbookInput): { penalty: number; reasons: string[] } {
  const item = (input.specificItem || "").toLowerCase();
  let totalPenalty = 0;
  const reasons: string[] = [];

  for (const rule of OCCLUSION_RULES) {
    if (!rule.items.some((i) => item.includes(i) || i.includes(item))) continue;

    for (const p of rule.penalties) {
      if (p.archetypeIdPattern && archetype.id.includes(p.archetypeIdPattern)) {
        totalPenalty += p.penalty;
        reasons.push(p.reason);
      }
    }
  }

  return { penalty: totalPenalty, reasons };
}

// ── Blueprint-Aware Filtering ──

export function filterArchetypesByBlueprint(
  archetypes: ShotArchetype[],
  blueprint: ShotBlueprint
): ShotArchetype[] {
  return archetypes.filter((a) => !blueprint.bannedArchetypeIds.includes(a.id));
}

// ── Scoring ──

export function scoreArchetype(
  archetype: ShotArchetype,
  input: LookbookInput,
  blueprint: ShotBlueprint | null
): ScoredArchetype {
  let score = 0;
  const reasons: string[] = [];

  // Family match (+20 / -40)
  if (archetype.suitableFamilies.includes(input.productFamily)) {
    score += 20;
    reasons.push("product family match");
  } else {
    score -= 40;
  }

  // Specific item match (+10)
  if (
    input.specificItem &&
    archetype.suitableItems.some((item) =>
      input.specificItem!.toLowerCase().includes(item.toLowerCase())
    )
  ) {
    score += 10;
    reasons.push("specific item match");
  }

  // Campaign goal match (+25)
  if (archetype.suitableGoals.includes(input.campaignGoal)) {
    score += 25;
    reasons.push("campaign goal match");
  }

  // Style match (+15)
  if (archetype.suitableStyles.includes(input.targetStyle)) {
    score += 15;
    reasons.push("style match");
  }

  // Gender match (+10)
  if (archetype.suitableGenderPresentation.includes(input.genderPresentation)) {
    score += 10;
    reasons.push("gender match");
  }

  // Creativity band match (+10)
  if (archetype.creativityBand.includes(input.creativityLevel)) {
    score += 10;
    reasons.push("creativity band match");
  }

  // Logo visibility alignment (+20 for high match, -15 for mismatch)
  if (input.logoVisibilityPriority === "high") {
    if (archetype.logoVisibilitySuitability === "high") {
      score += 20;
      reasons.push("high logo visibility match");
    } else if (archetype.logoVisibilitySuitability === "low") {
      score -= 15;
    }
  } else if (input.logoVisibilityPriority === "low") {
    if (archetype.logoVisibilitySuitability === "low") {
      score += 10;
    }
  }

  // Reliability bonus (+10 for high, -15 for low when safe creativity)
  if (archetype.higgsfieldReliability === "high") {
    score += 10;
    reasons.push("high reliability");
  } else if (
    archetype.higgsfieldReliability === "low" &&
    input.creativityLevel === "safe"
  ) {
    score -= 15;
  }

  // Campaign-specific suitability boosts (+10)
  if (
    input.campaignGoal === "product_clarity" &&
    archetype.productClaritySuitability === "high"
  ) {
    score += 10;
    reasons.push("high product clarity");
  }
  if (
    input.campaignGoal === "silhouette" &&
    archetype.silhouetteSuitability === "high"
  ) {
    score += 10;
    reasons.push("high silhouette strength");
  }
  if (
    input.campaignGoal === "detail_focus" &&
    archetype.detailSuitability === "high"
  ) {
    score += 10;
    reasons.push("high detail suitability");
  }
  if (
    input.campaignGoal === "movement" &&
    archetype.movementSuitability === "high"
  ) {
    score += 10;
    reasons.push("high movement suitability");
  }
  if (
    (input.campaignGoal === "mood" || input.campaignGoal === "styling_story") &&
    archetype.editorialStrength === "high"
  ) {
    score += 10;
    reasons.push("high editorial strength");
  }
  if (
    input.campaignGoal === "premium_branding" &&
    archetype.logoVisibilitySuitability === "high"
  ) {
    score += 10;
    reasons.push("branding-safe archetype");
  }

  // Blueprint bonuses
  if (blueprint) {
    // Required role bonus (+30)
    if (blueprint.requiredRoles.includes(archetype.id)) {
      score += 30;
      reasons.push("blueprint required role");
    }

    // Optional role bonus (+15)
    if (blueprint.optionalRoles.includes(archetype.id)) {
      score += 15;
      reasons.push("blueprint optional role");
    }

    // Framing family match (+10)
    const framingLower = archetype.defaultFraming.toLowerCase();
    if (
      (blueprint.preferredFramingFamily === "close_up" && (framingLower.includes("close") || framingLower.includes("crop"))) ||
      (blueprint.preferredFramingFamily === "half_body" && (framingLower.includes("half") || framingLower.includes("chest"))) ||
      (blueprint.preferredFramingFamily === "full_body" && framingLower.includes("full body"))
    ) {
      score += 10;
      reasons.push("preferred framing match");
    }

    // Movement level penalty (-20 for exceeding preferred)
    const movementLevels = { static: 0, subtle: 1, moderate: 2, active: 3 };
    const archetypeMovement = archetype.movementSuitability === "high" ? 3
      : archetype.movementSuitability === "medium" ? 2
      : archetype.shotCategory === "motion" ? 3 : 0;
    if (archetypeMovement > movementLevels[blueprint.preferredMovementLevel]) {
      score -= 20;
      reasons.push("exceeds preferred movement level");
    }
  }

  // Occlusion penalties (item-specific)
  const occlusion = getOcclusionPenalty(archetype, input);
  if (occlusion.penalty < 0) {
    score += occlusion.penalty;
    reasons.push(...occlusion.reasons);
  }

  return { archetype, score, matchReasons: reasons };
}

export function computeCoverage(
  archetypes: ShotArchetype[]
): { clarity: number; branding: number; silhouette: number; editorial: number; detail: number; motion: number } {
  if (archetypes.length === 0) {
    return { clarity: 0, branding: 0, silhouette: 0, editorial: 0, detail: 0, motion: 0 };
  }

  const sum = (key: (a: ShotArchetype) => SuitabilityRating) =>
    Math.round(
      archetypes.reduce((acc, a) => acc + ratingToNumber(key(a)), 0) /
        archetypes.length
    );

  return {
    clarity: sum((a) => a.productClaritySuitability),
    branding: sum((a) => a.logoVisibilitySuitability),
    silhouette: sum((a) => a.silhouetteSuitability),
    editorial: sum((a) => a.editorialStrength),
    detail: sum((a) => a.detailSuitability),
    motion: sum((a) => a.movementSuitability),
  };
}
