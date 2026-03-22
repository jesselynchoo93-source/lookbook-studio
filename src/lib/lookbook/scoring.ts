import type {
  ShotArchetype,
  LookbookInput,
  ScoredArchetype,
  SuitabilityRating,
  ResolvedBlueprint,
  EvidenceType,
  ResolvedEvidencePlan,
} from "./types";
import { getEvidenceWeight } from "./productEvidence";

function ratingToNumber(r: SuitabilityRating): number {
  if (r === "high") return 100;
  if (r === "medium") return 60;
  return 20;
}

// ── Evidence-Based Scoring ──

export function scoreEvidenceCoverage(
  archetype: ShotArchetype,
  evidencePlan: ResolvedEvidencePlan
): { score: number; matchedEvidence: EvidenceType[]; reasons: string[] } {
  let rawScore = 0;
  const matchedEvidence: EvidenceType[] = [];
  const reasons: string[] = [];

  // Check each evidence requirement against archetype capabilities
  for (const requirement of evidencePlan.orderedEvidence) {
    if (archetype.evidenceCapabilities.includes(requirement.evidence)) {
      const weight = getEvidenceWeight(requirement);
      rawScore += weight;
      matchedEvidence.push(requirement.evidence);
      reasons.push(`evidence: ${requirement.evidence} (${requirement.priority}, +${weight})`);
    }
  }

  // Zone bonus: +5 for each primary display zone that matches a product zone
  for (const zone of archetype.primaryDisplayZones) {
    if (evidencePlan.productZones.includes(zone)) {
      rawScore += 5;
      reasons.push(`zone match: ${zone} (+5)`);
    }
  }

  // Compute max possible score
  let maxPossible = 0;
  for (const requirement of evidencePlan.orderedEvidence) {
    const weight = getEvidenceWeight(requirement);
    if (weight > 0) {
      if (requirement.priority === "required") maxPossible += 10;
      else if (requirement.priority === "recommended") maxPossible += 6;
      else if (requirement.priority === "optional") maxPossible += 3;
    }
  }
  maxPossible += evidencePlan.productZones.length * 5;

  const normalizedScore = maxPossible > 0
    ? Math.min(100, (rawScore / maxPossible) * 100)
    : 0;

  return { score: normalizedScore, matchedEvidence, reasons };
}

// ── Scoring ──

export function scoreArchetype(
  archetype: ShotArchetype,
  input: LookbookInput,
  blueprint: ResolvedBlueprint
): ScoredArchetype {
  let contextRaw = 0;
  let reliabilityRaw = 0;
  const contextReasons: string[] = [];
  const reliabilityReasons: string[] = [];

  // ── Context rules (all existing rules except reliability and archetype-ID bonuses) ──

  // Family match (+20 / -40)
  if (archetype.suitableFamilies.includes(input.productFamily)) {
    contextRaw += 20;
    contextReasons.push("product family match");
  } else {
    contextRaw -= 40;
  }

  // Specific item match (+10)
  if (
    input.specificItem &&
    archetype.suitableItems.some((item) =>
      input.specificItem!.toLowerCase().includes(item.toLowerCase())
    )
  ) {
    contextRaw += 10;
    contextReasons.push("specific item match");
  }

  // Campaign goal match (+25)
  if (archetype.suitableGoals.includes(input.campaignGoal)) {
    contextRaw += 25;
    contextReasons.push("campaign goal match");
  }

  // Style match (+15)
  if (archetype.suitableStyles.includes(input.targetStyle)) {
    contextRaw += 15;
    contextReasons.push("style match");
  }

  // Gender match (+10)
  if (archetype.suitableGenderPresentation.includes(input.genderPresentation)) {
    contextRaw += 10;
    contextReasons.push("gender match");
  }

  // Creativity band match (+10)
  if (archetype.creativityBand.includes(input.creativityLevel)) {
    contextRaw += 10;
    contextReasons.push("creativity band match");
  }

  // Logo visibility alignment (+20 for high match, -15 for mismatch)
  if (input.logoVisibilityPriority === "high") {
    if (archetype.logoVisibilitySuitability === "high") {
      contextRaw += 20;
      contextReasons.push("high logo visibility match");
    } else if (archetype.logoVisibilitySuitability === "low") {
      contextRaw -= 15;
    }
  } else if (input.logoVisibilityPriority === "low") {
    if (archetype.logoVisibilitySuitability === "low") {
      contextRaw += 10;
    }
  }

  // Campaign-specific suitability boosts (+10)
  if (
    input.campaignGoal === "product_clarity" &&
    archetype.productClaritySuitability === "high"
  ) {
    contextRaw += 10;
    contextReasons.push("high product clarity");
  }
  if (
    input.campaignGoal === "silhouette" &&
    archetype.silhouetteSuitability === "high"
  ) {
    contextRaw += 10;
    contextReasons.push("high silhouette strength");
  }
  if (
    input.campaignGoal === "detail_focus" &&
    archetype.detailSuitability === "high"
  ) {
    contextRaw += 10;
    contextReasons.push("high detail suitability");
  }
  if (
    input.campaignGoal === "movement" &&
    archetype.movementSuitability === "high"
  ) {
    contextRaw += 10;
    contextReasons.push("high movement suitability");
  }
  if (
    (input.campaignGoal === "mood" || input.campaignGoal === "styling_story") &&
    archetype.editorialStrength === "high"
  ) {
    contextRaw += 10;
    contextReasons.push("high editorial strength");
  }
  if (
    input.campaignGoal === "premium_branding" &&
    archetype.logoVisibilitySuitability === "high"
  ) {
    contextRaw += 10;
    contextReasons.push("branding-safe archetype");
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
    contextRaw += 10;
    contextReasons.push("preferred framing match");
  }

  // Movement level penalty (-20 for exceeding preferred)
  const movementLevels = { static: 0, subtle: 1, moderate: 2, active: 3 };
  const archetypeMovement = archetype.movementSuitability === "high" ? 3
    : archetype.movementSuitability === "medium" ? 2
    : archetype.shotCategory === "motion" ? 3 : 0;
  if (archetypeMovement > movementLevels[blueprint.preferredMovementLevel]) {
    contextRaw -= 20;
    contextReasons.push("exceeds preferred movement level");
  }

  // Branding emphasis alignment
  if (blueprint.brandingEmphasis === "product_first") {
    // Product-first: penalise logo-focused archetypes, boost product-clarity ones
    if (archetype.id.includes("logo_focus")) {
      contextRaw -= 20;
      contextReasons.push("logo-focus penalised (product-first emphasis)");
    }
    if (archetype.productClaritySuitability === "high") {
      contextRaw += 10;
      contextReasons.push("product clarity bonus (product-first emphasis)");
    }
  } else if (blueprint.brandingEmphasis === "logo_first") {
    if (archetype.logoVisibilitySuitability === "high") {
      contextRaw += 10;
      contextReasons.push("logo visibility bonus (logo-first emphasis)");
    }
  }

  // Semantic affinity: prefer family-specialist archetypes over generic universal ones.
  // A specialist archetype (1-3 families) designed for this family will outscore a
  // universal archetype (7+ families) that happens to be eligible.
  // Native archetypes (≤2 families) get the strongest boost because they were
  // purpose-built for this product type and should always beat generic alternatives
  // when they cover the same evidence.
  const familyCount = archetype.suitableFamilies.length;
  if (archetype.suitableFamilies.includes(input.productFamily)) {
    if (familyCount <= 2) {
      contextRaw += 40;
      contextReasons.push("native archetype affinity (+40)");
    } else if (familyCount <= 3) {
      contextRaw += 30;
      contextReasons.push("family specialist affinity (+30)");
    } else if (familyCount <= 6) {
      contextRaw += 10;
      contextReasons.push("semi-specialist affinity (+10)");
    }
    // Universal (7+): no additional affinity, relies on evidence score
  }

  // Detail subtype preference for bags and accessories
  // When logo visibility is not high, prefer construction/hardware detail over branding detail
  if (blueprint.family === "bags" && archetype.shotCategory === "detail") {
    const isConstructionOrHardware = archetype.id.includes("hardware_detail") || archetype.id.includes("construction_detail");
    const isBrandingDetail = archetype.id.includes("logo_focus");
    if (input.logoVisibilityPriority !== "high") {
      if (isConstructionOrHardware) {
        contextRaw += 15;
        contextReasons.push("construction/hardware detail preferred for bags");
      }
      if (isBrandingDetail) {
        contextRaw -= 10;
        contextReasons.push("branding detail deprioritised (logo not high priority)");
      }
    }
  }

  // ── Reliability rules ──

  // Reliability bonus (+10 for high, -15 for low when safe creativity)
  if (archetype.higgsfieldReliability === "high") {
    reliabilityRaw += 10;
    reliabilityReasons.push("high reliability");
  } else if (
    archetype.higgsfieldReliability === "low" &&
    input.creativityLevel === "safe"
  ) {
    reliabilityRaw -= 15;
    reliabilityReasons.push("low reliability penalised (safe creativity)");
  }

  // ── Evidence scoring ──

  const evidenceResult = scoreEvidenceCoverage(archetype, blueprint.evidencePlan);

  // ── Normalize context and reliability to 0-100 ──
  // Context theoretical range: roughly -125 to +230 based on all rules
  // We clamp and map to 0-100
  const contextScore = Math.max(0, Math.min(100, ((contextRaw + 125) / 355) * 100));

  // Reliability theoretical range: -15 to +10
  // Map to 0-100
  const reliabilityScore = Math.max(0, Math.min(100, ((reliabilityRaw + 15) / 25) * 100));

  // ── Weighted combination: evidence 60%, context 30%, reliability 10% ──
  const finalScore = evidenceResult.score * 0.6 + contextScore * 0.3 + reliabilityScore * 0.1;

  // Merge all reasons
  const allReasons = [
    ...contextReasons,
    ...reliabilityReasons,
    ...evidenceResult.reasons,
  ];

  return { archetype, score: finalScore, matchReasons: allReasons };
}

export function computeCoverage(
  archetypes: ShotArchetype[]
): { clarity: number; branding: number; silhouette: number; editorial: number; detail: number; motion: number; evidenceCoverage: Partial<Record<EvidenceType, number>> } {
  if (archetypes.length === 0) {
    return { clarity: 0, branding: 0, silhouette: 0, editorial: 0, detail: 0, motion: 0, evidenceCoverage: {} };
  }

  const sum = (key: (a: ShotArchetype) => SuitabilityRating) =>
    Math.round(
      archetypes.reduce((acc, a) => acc + ratingToNumber(key(a)), 0) /
        archetypes.length
    );

  // Build evidence coverage: 100 if any selected archetype covers it, omitted otherwise
  const evidenceCoverage: Partial<Record<EvidenceType, number>> = {};
  for (const archetype of archetypes) {
    for (const ev of archetype.evidenceCapabilities) {
      evidenceCoverage[ev] = 100;
    }
  }

  return {
    clarity: sum((a) => a.productClaritySuitability),
    branding: sum((a) => a.logoVisibilitySuitability),
    silhouette: sum((a) => a.silhouetteSuitability),
    editorial: sum((a) => a.editorialStrength),
    detail: sum((a) => a.detailSuitability),
    motion: sum((a) => a.movementSuitability),
    evidenceCoverage,
  };
}
