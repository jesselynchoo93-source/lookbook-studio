import type {
  ShotArchetype,
  LookbookInput,
  ScoredArchetype,
  SuitabilityRating,
  ResolvedBlueprint,
} from "./types";

function ratingToNumber(r: SuitabilityRating): number {
  if (r === "high") return 100;
  if (r === "medium") return 60;
  return 20;
}

// ── Blueprint-Aware Filtering ──

export function filterArchetypesByBlueprint(
  archetypes: ShotArchetype[],
  blueprint: ResolvedBlueprint
): ShotArchetype[] {
  return archetypes.filter((a) => !blueprint.restrictedArchetypeIds.includes(a.id));
}

// ── Occlusion Penalty from Blueprint ──

function getOcclusionPenalty(
  archetype: ShotArchetype,
  blueprint: ResolvedBlueprint
): { penalty: number; reasons: string[] } {
  if (blueprint.occlusionPenalties.length === 0) {
    return { penalty: 0, reasons: [] };
  }

  let totalPenalty = 0;
  const reasons: string[] = [];
  const idLower = archetype.id.toLowerCase();
  const framingLower = archetype.defaultFraming.toLowerCase();

  for (const penaltyDesc of blueprint.occlusionPenalties) {
    const descLower = penaltyDesc.toLowerCase();

    // Match penalty descriptions against archetype characteristics
    if (descLower.includes("full body") || descLower.includes("full-body")) {
      if (framingLower.includes("full body") || framingLower.includes("full-body")) {
        totalPenalty -= 30;
        reasons.push(penaltyDesc);
      }
    }
    if (descLower.includes("hand") || descLower.includes("grip")) {
      if (idLower.includes("hand_interaction") || idLower.includes("lapel_touch") || idLower.includes("cuff_adjustment")) {
        totalPenalty -= 35;
        reasons.push(penaltyDesc);
      }
    }
    if (descLower.includes("back") || descLower.includes("behind")) {
      if (idLower.includes("back_view")) {
        totalPenalty -= 50;
        reasons.push(penaltyDesc);
      }
    }
    if (descLower.includes("arm")) {
      if (idLower.includes("arm") || idLower.includes("stride") || idLower.includes("pivot")) {
        totalPenalty -= 25;
        reasons.push(penaltyDesc);
      }
    }
    if (descLower.includes("motion") || descLower.includes("bounce") || descLower.includes("stride")) {
      if (archetype.shotCategory === "motion") {
        totalPenalty -= 25;
        reasons.push(penaltyDesc);
      }
    }
    if (descLower.includes("logo")) {
      if (idLower.includes("logo_focus") && blueprint.brandingEmphasis === "product_first") {
        totalPenalty -= 40;
        reasons.push(penaltyDesc);
      }
    }
    if (descLower.includes("hair") || descLower.includes("ear")) {
      if (idLower.includes("ear") || idLower.includes("profile")) {
        // Only penalise if not specifically designed for ear visibility
        if (!idLower.includes("ear_detail") && !idLower.includes("ear_reveal")) {
          totalPenalty -= 20;
          reasons.push(penaltyDesc);
        }
      }
    }
    if (descLower.includes("ground") || descLower.includes("float")) {
      if (idLower.includes("ground") || idLower.includes("footwear")) {
        // Don't penalise footwear-specific archetypes for ground issues
      } else if (archetype.shotCategory === "motion") {
        totalPenalty -= 15;
        reasons.push(penaltyDesc);
      }
    }
  }

  return { penalty: totalPenalty, reasons };
}

// ── Scoring ──

export function scoreArchetype(
  archetype: ShotArchetype,
  input: LookbookInput,
  blueprint: ResolvedBlueprint
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

  // ── Blueprint bonuses ──

  // Required archetype bonus (+30)
  if (blueprint.requiredArchetypeIds.includes(archetype.id)) {
    score += 30;
    reasons.push("blueprint required archetype");
  }

  // Preferred archetype bonus (+15)
  if (blueprint.preferredArchetypeIds.includes(archetype.id)) {
    score += 15;
    reasons.push("blueprint preferred archetype");
  }

  // Framing family match (+10)
  const framingLower = archetype.defaultFraming.toLowerCase();
  const pf = blueprint.preferredFramingFamily;
  if (
    (pf === "close_up" && (framingLower.includes("close") || framingLower.includes("crop"))) ||
    (pf === "half_body" && (framingLower.includes("half") || framingLower.includes("chest") || framingLower.includes("waist"))) ||
    (pf === "three_quarter" && (framingLower.includes("three quarter") || framingLower.includes("3/4"))) ||
    (pf === "full_body" && framingLower.includes("full body")) ||
    (pf === "mixed")
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

  // Branding emphasis alignment
  if (blueprint.brandingEmphasis === "product_first") {
    // Product-first: penalise logo-focused archetypes, boost product-clarity ones
    if (archetype.id.includes("logo_focus")) {
      score -= 20;
      reasons.push("logo-focus penalised (product-first emphasis)");
    }
    if (archetype.productClaritySuitability === "high") {
      score += 10;
      reasons.push("product clarity bonus (product-first emphasis)");
    }
  } else if (blueprint.brandingEmphasis === "logo_first") {
    if (archetype.logoVisibilitySuitability === "high") {
      score += 10;
      reasons.push("logo visibility bonus (logo-first emphasis)");
    }
  }

  // Detail subtype preference for bags and accessories
  // When logo visibility is not high, prefer construction/hardware detail over branding detail
  if (blueprint.family === "bags" && archetype.shotCategory === "detail") {
    const isConstructionOrHardware = archetype.id.includes("hardware_detail") || archetype.id.includes("construction_detail");
    const isBrandingDetail = archetype.id.includes("logo_focus");
    if (input.logoVisibilityPriority !== "high") {
      if (isConstructionOrHardware) {
        score += 15;
        reasons.push("construction/hardware detail preferred for bags");
      }
      if (isBrandingDetail) {
        score -= 10;
        reasons.push("branding detail deprioritised (logo not high priority)");
      }
    }
  }

  // Occlusion penalties from resolved blueprint
  const occlusion = getOcclusionPenalty(archetype, blueprint);
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
