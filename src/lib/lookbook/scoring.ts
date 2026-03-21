import type {
  ShotArchetype,
  LookbookInput,
  ScoredArchetype,
  SuitabilityRating,
} from "./types";

function ratingToNumber(r: SuitabilityRating): number {
  if (r === "high") return 100;
  if (r === "medium") return 60;
  return 20;
}

export function scoreArchetype(
  archetype: ShotArchetype,
  input: LookbookInput
): ScoredArchetype {
  let score = 0;
  const reasons: string[] = [];

  // Family match (+20)
  if (archetype.suitableFamilies.includes(input.productFamily)) {
    score += 20;
    reasons.push("product family match");
  } else {
    score -= 40; // strong penalty for family mismatch
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
