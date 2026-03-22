import type {
  LookbookInput,
  LookbookPlanResult,
  ScoredArchetype,
  MasterShootDNA,
  CoverageSummary,
  ResolvedBlueprint,
  EvidenceType,
  ResolvedEvidencePlan,
  PlanDiagnostics,
  RedundancyWarning,
  ShotCategory,
} from "./types";
import { ALL_ARCHETYPES } from "./shotArchetypes";
import { scoreArchetype, computeCoverage } from "./scoring";
import { buildMasterShootDNA } from "./shootDNA";
import { buildRecommendedShot } from "./buildShotDelta";
import { formatExportText } from "./exportShotPlan";
import { resolveBlueprint, UNIVERSAL_RULES } from "./shotBlueprints";
import type { ShotArchetype } from "./types";
import {
  PRODUCT_ONLY_ELIGIBLE_FAMILIES,
  PRODUCT_ONLY_ELIGIBLE_CATEGORIES,
  getEvidenceWeight,
} from "./productEvidence";

// ── Accessory-Led Families ──
// These families have a physical product that is NOT the full outfit.
// Selection rules differ: fewer heroes, more product-focus and detail variety.
const ACCESSORY_LED_FAMILIES: string[] = ["bags", "jewelry", "eyewear", "watches", "small_accessories"];

// ── Evidence Relevance Gate ──
// An archetype must provide at least 1 required OR recommended evidence type
// for the product to be eligible for selection. This prevents irrelevant archetypes
// (e.g. full-body hero for watches) from being selected via context scoring alone.

function computeEvidenceRelevance(
  archetype: ShotArchetype,
  evidencePlan: ResolvedEvidencePlan,
): { requiredMatches: number; recommendedMatches: number; totalRelevant: number; anyPlanMatch: number } {
  const planRequired = new Set(
    evidencePlan.orderedEvidence.filter((e) => e.priority === "required").map((e) => e.evidence),
  );
  const planRecommended = new Set(
    evidencePlan.orderedEvidence.filter((e) => e.priority === "recommended").map((e) => e.evidence),
  );
  // All evidence in the plan (including optional), excluding discouraged
  const planAll = new Set(
    evidencePlan.orderedEvidence
      .filter((e) => e.priority !== "discouraged")
      .map((e) => e.evidence),
  );

  let requiredMatches = 0;
  let recommendedMatches = 0;
  let anyPlanMatch = 0;
  for (const ev of archetype.evidenceCapabilities) {
    if (planRequired.has(ev)) requiredMatches++;
    if (planRecommended.has(ev)) recommendedMatches++;
    if (planAll.has(ev)) anyPlanMatch++;
  }

  return { requiredMatches, recommendedMatches, totalRelevant: requiredMatches + recommendedMatches, anyPlanMatch };
}

/** Evidence types that require a body present. Used to gate product_only shots. */
const ON_BODY_EVIDENCE: EvidenceType[] = [
  "fit_on_body", "carry_method", "on_foot_presence", "face_framing",
  "wrist_visibility", "ear_visibility", "waist_anchoring",
  "finger_visibility", "neckline_visibility",
];

// ── Framing Bucket Helper ──

function getFramingBucket(framing: string): string {
  const lower = framing.toLowerCase();
  if (lower.includes("full body") || lower.includes("head to toe")) return "full_body";
  if (
    lower.includes("close") ||
    lower.includes("crop") ||
    lower.includes("detail") ||
    lower.includes("extreme")
  ) return "close_up";
  if (
    lower.includes("three-quarter") ||
    lower.includes("three quarter") ||
    lower.includes("3/4") ||
    lower.includes("waist up") ||
    lower.includes("half body") ||
    lower.includes("half-body") ||
    lower.includes("chest")
  ) return "upper_body";
  return "upper_body";
}

// ── Marginal Evidence Gain ──

function computeMarginalEvidenceGain(
  candidate: ScoredArchetype,
  coveredEvidence: Set<EvidenceType>,
  evidencePlan: ResolvedEvidencePlan,
): number {
  let total = 0;
  const planEvidenceMap = new Map(
    evidencePlan.orderedEvidence.map((er) => [er.evidence, er]),
  );

  for (const ev of candidate.archetype.evidenceCapabilities) {
    if (coveredEvidence.has(ev)) continue;
    const requirement = planEvidenceMap.get(ev);
    if (!requirement) continue;
    total += getEvidenceWeight(requirement);
  }

  return total;
}

// ── Redundancy Penalty ──

// Ambient evidence: inherent to any on-body shot at a given framing.
// These are excluded from redundancy severity classification because
// they don't represent distinct product features. Two full-body shots
// both showing body_scale is expected, not a defect.
const AMBIENT_EVIDENCE: Set<EvidenceType> = new Set([
  "body_scale",
  "face_scale",
  "fit_on_body",
  "full_silhouette",
  "scale_reference",
]);

function countDistinctiveShared(sharedEvidence: EvidenceType[]): number {
  return sharedEvidence.filter((ev) => !AMBIENT_EVIDENCE.has(ev)).length;
}

function computeRedundancyPenalty(
  candidate: ScoredArchetype,
  alreadySelected: ScoredArchetype[],
): { penalty: number; warnings: RedundancyWarning[] } {
  let totalPenalty = 0;
  const warnings: RedundancyWarning[] = [];
  const candidateBucket = getFramingBucket(candidate.archetype.defaultFraming);
  const candidateEvidence = new Set(candidate.archetype.evidenceCapabilities);
  const candidateZones = new Set(candidate.archetype.primaryDisplayZones);

  for (let i = 0; i < alreadySelected.length; i++) {
    const existing = alreadySelected[i];
    const existingEvidence = new Set(existing.archetype.evidenceCapabilities);
    const existingZones = new Set(existing.archetype.primaryDisplayZones);
    const existingBucket = getFramingBucket(existing.archetype.defaultFraming);

    // Shared evidence (all)
    const sharedEvidence: EvidenceType[] = [];
    for (const ev of candidateEvidence) {
      if (existingEvidence.has(ev)) sharedEvidence.push(ev);
    }

    // Distinctive shared evidence (excluding ambient)
    const distinctiveCount = countDistinctiveShared(sharedEvidence);

    // Shared primary display zones
    let sharedZoneCount = 0;
    for (const z of candidateZones) {
      if (existingZones.has(z)) sharedZoneCount++;
    }

    // Framing similarity
    const sameBucket = candidateBucket === existingBucket;

    // Classify severity using DISTINCTIVE shared evidence count
    if (distinctiveCount >= 3 && sameBucket && sharedZoneCount > 0) {
      // Critical: 3+ distinctive shared evidence, same bucket, overlapping zones
      totalPenalty -= 30;
      warnings.push({
        severity: "critical",
        shotA: i + 1,
        shotB: alreadySelected.length + 1,
        sharedEvidence,
        message: `Critical redundancy: ${distinctiveCount} distinctive shared evidence (${sharedEvidence.length} total), same framing bucket (${candidateBucket}), ${sharedZoneCount} overlapping primary zones`,
      });
    } else if (
      (distinctiveCount >= 2 && sameBucket) ||
      (distinctiveCount >= 3 && !sameBucket)
    ) {
      // Warning
      totalPenalty -= 15;
      warnings.push({
        severity: "warning",
        shotA: i + 1,
        shotB: alreadySelected.length + 1,
        sharedEvidence,
        message: `Redundancy warning: ${distinctiveCount} distinctive shared evidence (${sharedEvidence.length} total)${sameBucket ? ", same framing bucket" : ", different framing bucket"}`,
      });
    } else if (sharedEvidence.length === 1 && !sameBucket) {
      // Info: no penalty
      warnings.push({
        severity: "info",
        shotA: i + 1,
        shotB: alreadySelected.length + 1,
        sharedEvidence,
        message: `Minor overlap: 1 shared evidence type, different framing bucket`,
      });
    }
  }

  return { penalty: totalPenalty, warnings };
}

// ── Selection with Greedy Set-Cover ──

function selectShots(
  scored: ScoredArchetype[],
  input: LookbookInput,
  count: number,
  blueprint: ResolvedBlueprint,
  dna: MasterShootDNA,
): ScoredArchetype[] {
  const selected: ScoredArchetype[] = [];
  const categoryCount: Record<string, number> = {};
  let motionCount = 0;
  let heroCount = 0;
  let productOnlyCount = 0;
  const coveredEvidence = new Set<EvidenceType>();

  const maxPerCategory = UNIVERSAL_RULES.maxShotsPerCategory;
  const maxMotion = blueprint.maxMotionShots;
  const isAccessoryLed = ACCESSORY_LED_FAMILIES.includes(input.productFamily);
  const maxHero = isAccessoryLed ? 1 : maxPerCategory;
  const evidencePlan = blueprint.evidencePlan;

  // Helpers
  const isSelected = (c: ScoredArchetype) => selected.some((s) => s.archetype.id === c.archetype.id);

  const isProductOnly = (c: ScoredArchetype) =>
    c.archetype.primaryDisplayZones.includes("product_only");

  // Pre-compute evidence relevance for all candidates
  const relevanceCache = new Map<string, ReturnType<typeof computeEvidenceRelevance>>();
  for (const s of scored) {
    relevanceCache.set(s.archetype.id, computeEvidenceRelevance(s.archetype, evidencePlan));
  }

  // Track critical redundancy count in the selected set
  let criticalRedundancyCount = 0;

  // Universal archetypes (listed for nearly all families) can fill context/mood slots
  // even when they lack specialized evidence for a niche product family.
  const UNIVERSAL_FAMILY_THRESHOLD = 7;

  const passesHardConstraints = (candidate: ScoredArchetype): boolean => {
    const cat = candidate.archetype.shotCategory;
    const families = candidate.archetype.suitableFamilies;
    const isUniversal = families.length >= UNIVERSAL_FAMILY_THRESHOLD;

    // Family match: block specialist archetypes not designed for this family.
    // Universal archetypes (7+ families) always pass since they apply broadly.
    if (!isUniversal && !families.includes(input.productFamily)) {
      return false;
    }

    // Evidence relevance gate:
    // - Specialist archetypes: must provide at least 1 required OR recommended evidence.
    // - Universal archetypes: must provide at least 1 match from the FULL evidence plan
    //   (including optional). Prevents truly irrelevant universal archetypes (e.g.
    //   torso_turn_editorial for watches provides 0 watch-related evidence at any level).
    const relevance = relevanceCache.get(candidate.archetype.id);
    if (relevance) {
      if (!isUniversal && relevance.totalRelevant === 0) {
        return false;
      }
      if (isUniversal && relevance.anyPlanMatch === 0) {
        return false;
      }
    }

    // Semantic compatibility gate: block archetypes with strongly category-specific
    // semantics from being reused across unrelated families.
    const id = candidate.archetype.id;
    const fam = input.productFamily;
    // "jewelry" in the archetype name/semantics should not leak to non-jewelry families
    if (id === "profile_jewelry_focus" || id === "mood_portrait_jewelry") {
      if (fam !== "jewelry") return false;
    }
    // Ear-specific archetypes only for jewelry
    if (id === "ear_detail_crop" || id === "three_quarter_ear_reveal" || id === "pair_symmetry_validation") {
      if (fam !== "jewelry") return false;
    }
    // Jewelry neckline focus only for jewelry
    if (id === "jewelry_neckline_focus") {
      if (fam !== "jewelry") return false;
    }
    // Bag-specific archetypes only for bags
    if (id === "bag_carry_profile" || id === "bag_hardware_detail" || id === "bag_construction_detail") {
      if (fam !== "bags") return false;
    }
    // Footwear-specific archetypes only for footwear
    if (id === "footwear_ground_focus" || id === "footwear_material_detail") {
      if (fam !== "footwear") return false;
    }
    // Eyewear-specific archetypes only for eyewear
    if (id === "eyewear_portrait_halfbody" || id === "eyewear_temple_detail") {
      if (fam !== "eyewear") return false;
    }
    // Watch-specific archetypes only for watches
    if (id === "watch_dial_closeup" || id === "watch_wrist_hero" || id === "watch_strap_detail") {
      if (fam !== "watches") return false;
    }
    // Apparel tailoring archetypes only for apparel
    if (id === "tailoring_lapel_touch" || id === "cuff_adjustment_tailoring" || id === "open_jacket_ease" || id === "back_view_shape") {
      if (fam !== "apparel") return false;
    }
    // Hand interaction only for small wrist/hand products
    if (id === "accessory_hand_interaction") {
      if (!["jewelry", "watches", "small_accessories"].includes(fam)) return false;
    }

    // Max per category
    if ((categoryCount[cat] || 0) >= maxPerCategory) return false;

    // Hero cap for accessory-led families
    if (cat === "hero" && heroCount >= maxHero) return false;

    // Motion cap
    if (cat === "motion" && motionCount >= maxMotion) return false;

    // No duplicate archetypes
    if (UNIVERSAL_RULES.noDuplicateArchetypes && isSelected(candidate)) return false;

    // Framing diversity: for accessory-led families, max 1 front full-body
    if (isAccessoryLed) {
      const candidateFraming = candidate.archetype.defaultFraming.toLowerCase();
      const isFrontFullBody =
        candidateFraming.includes("full body") &&
        (candidate.archetype.defaultAngle.toLowerCase().includes("straight on") ||
          candidate.archetype.defaultAngle.toLowerCase().includes("perpendicular"));
      if (isFrontFullBody) {
        const existingFrontFullBody = selected.filter((s) => {
          const f = s.archetype.defaultFraming.toLowerCase();
          const a = s.archetype.defaultAngle.toLowerCase();
          return f.includes("full body") && (a.includes("straight on") || a.includes("perpendicular"));
        }).length;
        if (existingFrontFullBody >= 1) return false;
      }
    }

    return true;
  };

  const addToSelected = (candidate: ScoredArchetype) => {
    selected.push(candidate);
    const cat = candidate.archetype.shotCategory;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    if (cat === "motion") motionCount++;
    if (cat === "hero") heroCount++;
    if (isProductOnly(candidate)) productOnlyCount++;

    // Track covered evidence
    for (const ev of candidate.archetype.evidenceCapabilities) {
      coveredEvidence.add(ev);
    }
  };

  const allRequiredOnBodyCovered = (): boolean => {
    for (const er of evidencePlan.orderedEvidence) {
      if (er.priority !== "required") continue;
      // Only gate on on-body evidence types, not all required evidence
      if (!ON_BODY_EVIDENCE.includes(er.evidence)) continue;
      if (!coveredEvidence.has(er.evidence)) return false;
    }
    return true;
  };

  // ── Phase 1: Satisfy role mix minimums ──
  const roleMixOrder: ShotCategory[] = ["hero", "product_focus", "detail", "silhouette", "editorial", "motion"];

  for (const category of roleMixOrder) {
    const target = evidencePlan.categoryRoleMix[category] ?? 0;
    if (target < 1) continue;
    if (selected.length >= count) break;

    // Find the best archetype for this category
    const candidates = scored
      .filter(
        (c) =>
          c.archetype.shotCategory === category &&
          !isSelected(c) &&
          !isProductOnly(c) && // product_only excluded from Phase 1
          passesHardConstraints(c),
      )
      .map((c) => {
        const marginalGain = computeMarginalEvidenceGain(c, coveredEvidence, evidencePlan);
        const { penalty: redundancyPenalty } = computeRedundancyPenalty(c, selected);

        // Framing diversity check: penalise if we already have this bucket
        let framingDiversityBonus = 0;
        const bucket = getFramingBucket(c.archetype.defaultFraming);
        const existingBuckets = selected.map((s) => getFramingBucket(s.archetype.defaultFraming));
        if (existingBuckets.includes(bucket)) {
          framingDiversityBonus = -15;
        }

        // Critical redundancy avoidance in Phase 1 (uses distinctive evidence)
        let criticalPenalty = 0;
        if (selected.length > 0) {
          const candidateBucket = getFramingBucket(c.archetype.defaultFraming);
          const candidateEvSet = new Set(c.archetype.evidenceCapabilities);
          const candidateZoneSet = new Set(c.archetype.primaryDisplayZones);
          for (const existing of selected) {
            const exEvSet = new Set(existing.archetype.evidenceCapabilities);
            const exZoneSet = new Set(existing.archetype.primaryDisplayZones);
            const exBucket = getFramingBucket(existing.archetype.defaultFraming);
            const sharedEv = [...candidateEvSet].filter((e) => exEvSet.has(e));
            const distinctiveShared = sharedEv.filter((e) => !AMBIENT_EVIDENCE.has(e)).length;
            const sharedZ = [...candidateZoneSet].filter((z) => exZoneSet.has(z)).length;
            if (distinctiveShared >= 3 && candidateBucket === exBucket && sharedZ > 0) {
              criticalPenalty = -60;
              break;
            }
          }
        }

        const combinedScore =
          marginalGain + c.score + framingDiversityBonus + redundancyPenalty + criticalPenalty;

        return { candidate: c, combinedScore };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore);

    if (candidates.length > 0) {
      addToSelected(candidates[0].candidate);
    }
  }

  // ── Phase 2: Greedy marginal gain with hardened constraints ──

  // Check which required role mix categories still need filling
  const getUnfilledTargets = (): ShotCategory[] => {
    const unfilled: ShotCategory[] = [];
    for (const [cat, target] of Object.entries(evidencePlan.categoryRoleMix)) {
      if ((target as number) >= 1 && (categoryCount[cat] || 0) < 1) {
        unfilled.push(cat as ShotCategory);
      }
    }
    return unfilled;
  };

  // Check if a candidate would cause critical redundancy with any selected shot.
  // Uses distinctive (non-ambient) evidence count to avoid false positives
  // for apparel-adjacent families where ambient evidence overlaps extensively.
  const wouldCauseCriticalRedundancy = (candidate: ScoredArchetype): boolean => {
    const candidateBucket = getFramingBucket(candidate.archetype.defaultFraming);
    const candidateEvidence = new Set(candidate.archetype.evidenceCapabilities);
    const candidateZones = new Set(candidate.archetype.primaryDisplayZones);

    for (const existing of selected) {
      const existingEvidence = new Set(existing.archetype.evidenceCapabilities);
      const existingZones = new Set(existing.archetype.primaryDisplayZones);
      const existingBucket = getFramingBucket(existing.archetype.defaultFraming);

      const sharedEvidence = [...candidateEvidence].filter((e) => existingEvidence.has(e));
      const distinctiveShared = sharedEvidence.filter((e) => !AMBIENT_EVIDENCE.has(e)).length;
      const sharedZones = [...candidateZones].filter((z) => existingZones.has(z)).length;
      const sameBucket = candidateBucket === existingBucket;

      if (distinctiveShared >= 3 && sameBucket && sharedZones > 0) return true;
    }
    return false;
  };

  // Check if candidate covers any currently-uncovered required evidence
  const coversUncoveredRequired = (candidate: ScoredArchetype): boolean => {
    const requiredEvidence = evidencePlan.orderedEvidence
      .filter((e) => e.priority === "required")
      .map((e) => e.evidence);
    return candidate.archetype.evidenceCapabilities.some(
      (ev) => requiredEvidence.includes(ev) && !coveredEvidence.has(ev),
    );
  };

  while (selected.length < count) {
    let bestCandidate: ScoredArchetype | null = null;
    let bestScore = -Infinity;

    const unfilledTargets = getUnfilledTargets();

    for (const candidate of scored) {
      if (isSelected(candidate)) continue;
      if (!passesHardConstraints(candidate)) continue;

      // product_only constraints
      if (isProductOnly(candidate)) {
        // Max 1 product_only per set
        if (productOnlyCount >= 1) continue;
        // Only for eligible families
        if (!PRODUCT_ONLY_ELIGIBLE_FAMILIES.includes(input.productFamily)) continue;
        // Only for eligible categories
        if (!PRODUCT_ONLY_ELIGIBLE_CATEGORIES.includes(candidate.archetype.shotCategory)) continue;
        // Bags: product_only only for detail category
        if (input.productFamily === "bags" && candidate.archetype.shotCategory !== "detail") continue;
        // Only if all required on-body evidence already covered
        if (!allRequiredOnBodyCovered()) continue;
      }

      // Critical redundancy gate: block candidates that would create critical redundancy
      // UNLESS they cover uncovered required evidence (only escape hatch)
      if (wouldCauseCriticalRedundancy(candidate)) {
        if (criticalRedundancyCount >= 1 || !coversUncoveredRequired(candidate)) {
          continue; // Hard block
        }
      }

      const marginalGain = computeMarginalEvidenceGain(candidate, coveredEvidence, evidencePlan);

      // Role mix bonus/penalty (strengthened)
      const cat = candidate.archetype.shotCategory;
      const catTarget = evidencePlan.categoryRoleMix[cat] ?? 0;
      const catActual = categoryCount[cat] || 0;
      let roleMixBonus = 0;
      if (catActual < catTarget) {
        roleMixBonus = 20; // Stronger pull toward unfilled targets
      } else if (catActual >= catTarget && catTarget > 0) {
        roleMixBonus = -15; // Stronger penalty for exceeding targets
      } else if (catTarget === 0 && unfilledTargets.length > 0) {
        // Non-targeted category while targeted categories are still unfilled
        roleMixBonus = -25;
      }

      const { penalty: redundancyPenalty } = computeRedundancyPenalty(candidate, selected);

      const combinedScore =
        marginalGain * 0.5 +
        candidate.score * 0.25 +
        roleMixBonus * 0.15 +
        redundancyPenalty * 0.1;

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) break;

    // Track critical redundancy count before adding
    if (wouldCauseCriticalRedundancy(bestCandidate)) {
      criticalRedundancyCount++;
    }

    addToSelected(bestCandidate);
  }

  // ── Phase 2b: Backfill pass ──
  // If strict Phase 2 couldn't fill all slots (critical redundancy blocking was too aggressive),
  // relax the constraint: allow critical redundancy with a heavy scoring penalty instead of blocking.
  if (selected.length < count) {
    while (selected.length < count) {
      let bestCandidate: ScoredArchetype | null = null;
      let bestScore = -Infinity;

      for (const candidate of scored) {
        if (isSelected(candidate)) continue;
        if (!passesHardConstraints(candidate)) continue;

        // product_only constraints (same as Phase 2)
        if (isProductOnly(candidate)) {
          if (productOnlyCount >= 1) continue;
          if (!PRODUCT_ONLY_ELIGIBLE_FAMILIES.includes(input.productFamily)) continue;
          if (!PRODUCT_ONLY_ELIGIBLE_CATEGORIES.includes(candidate.archetype.shotCategory)) continue;
          if (input.productFamily === "bags" && candidate.archetype.shotCategory !== "detail") continue;
          if (!allRequiredOnBodyCovered()) continue;
        }

        // No critical redundancy blocking in backfill; use heavy penalty instead
        const marginalGain = computeMarginalEvidenceGain(candidate, coveredEvidence, evidencePlan);
        const { penalty: redundancyPenalty } = computeRedundancyPenalty(candidate, selected);
        const critRedPenalty = wouldCauseCriticalRedundancy(candidate) ? -40 : 0;

        const cat = candidate.archetype.shotCategory;
        const catTarget = evidencePlan.categoryRoleMix[cat] ?? 0;
        const catActual = categoryCount[cat] || 0;
        let roleMixBonus = catActual < catTarget ? 20 : catActual >= catTarget && catTarget > 0 ? -15 : 0;

        const combinedScore =
          marginalGain * 0.5 +
          candidate.score * 0.25 +
          roleMixBonus * 0.15 +
          (redundancyPenalty + critRedPenalty) * 0.1;

        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestCandidate = candidate;
        }
      }

      if (!bestCandidate) break;

      if (wouldCauseCriticalRedundancy(bestCandidate)) {
        criticalRedundancyCount++;
      }
      addToSelected(bestCandidate);
    }
  }

  // ── Phase 3: Guarantee checks ──

  // Guarantee: at least 1 clarity-driven shot
  if (UNIVERSAL_RULES.guaranteeClarityShot) {
    const hasClarityShot = selected.some(
      (s) => s.archetype.productClaritySuitability === "high",
    );
    if (!hasClarityShot && selected.length >= count) {
      const clarityCandidate = scored.find(
        (s) =>
          s.archetype.productClaritySuitability === "high" &&
          !isSelected(s),
      );
      if (clarityCandidate) {
        selected[selected.length - 1] = clarityCandidate;
      }
    }
  }

  // Guarantee: at least 1 detail/product_focus shot for accessories
  const isAccessory = [
    "jewelry", "eyewear", "watches", "bags", "footwear", "small_accessories",
  ].includes(input.productFamily);
  if (isAccessory) {
    const hasDetailShot = selected.some(
      (s) =>
        s.archetype.shotCategory === "detail" ||
        s.archetype.shotCategory === "product_focus",
    );
    if (!hasDetailShot && selected.length >= count) {
      const detailCandidate = scored.find(
        (s) =>
          (s.archetype.shotCategory === "detail" ||
            s.archetype.shotCategory === "product_focus") &&
          !isSelected(s),
      );
      if (detailCandidate) {
        selected[selected.length - 1] = detailCandidate;
      }
    }
  }

  // Guarantee: at least 1 editorial shot when creativity is balanced or directional
  if (UNIVERSAL_RULES.guaranteeEditorialWhenCreative) {
    if (
      input.creativityLevel === "balanced" ||
      input.creativityLevel === "directional"
    ) {
      const hasEditorial = selected.some(
        (s) => s.archetype.shotCategory === "editorial",
      );
      if (!hasEditorial && selected.length >= count) {
        const editorialCandidate = scored.find(
          (s) =>
            s.archetype.shotCategory === "editorial" && !isSelected(s),
        );
        if (editorialCandidate) {
          selected[selected.length - 1] = editorialCandidate;
        }
      }
    }
  }

  return selected;
}

// ── Generation Order ──

function computeGenerationOrder(
  selected: ScoredArchetype[],
  blueprint: ResolvedBlueprint,
): number[] {
  const evidencePlan = blueprint.evidencePlan;

  // Build a set of evidence types that only ONE shot in the set can provide
  const evidenceProviderCount = new Map<EvidenceType, number>();
  for (const s of selected) {
    for (const ev of s.archetype.evidenceCapabilities) {
      evidenceProviderCount.set(ev, (evidenceProviderCount.get(ev) || 0) + 1);
    }
  }
  const requiredEvidenceSet = new Set(
    evidencePlan.orderedEvidence
      .filter((er) => er.priority === "required")
      .map((er) => er.evidence),
  );
  const uniqueRequiredCoverageScore = (s: ScoredArchetype): number => {
    let count = 0;
    for (const ev of s.archetype.evidenceCapabilities) {
      if (requiredEvidenceSet.has(ev) && (evidenceProviderCount.get(ev) || 0) === 1) {
        count++;
      }
    }
    return count;
  };

  // Check if all required on-body evidence is covered by shots before this one
  const allRequiredCoveredBySet = (subset: ScoredArchetype[]): boolean => {
    const covered = new Set<EvidenceType>();
    for (const s of subset) {
      for (const ev of s.archetype.evidenceCapabilities) {
        covered.add(ev);
      }
    }
    for (const er of evidencePlan.orderedEvidence) {
      if (er.priority === "required" && !covered.has(er.evidence)) return false;
    }
    return true;
  };

  const isProductOnly = (s: ScoredArchetype) =>
    s.archetype.primaryDisplayZones.includes("product_only");

  // Commercial anchor importance: hero and product_focus first
  const commercialAnchorOrder: Record<string, number> = {
    hero: 0,
    product_focus: 1,
    silhouette: 2,
    detail: 3,
    editorial: 4,
    motion: 5,
  };

  const reliabilityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const difficultyOrder: Record<string, number> = { easy: 0, moderate: 1, hard: 2 };

  // Check if family blueprint overrides category order
  const hasBlueprintOrder = blueprint.generationCategoryOrder.length > 0;
  const blueprintCategoryPriority: Record<string, number> = {};
  if (hasBlueprintOrder) {
    blueprint.generationCategoryOrder.forEach((cat, idx) => {
      blueprintCategoryPriority[cat] = idx;
    });
  }

  const indexed = selected.map((s, i) => ({
    index: i,
    shot: s,
    category: s.archetype.shotCategory,
    isProductOnly: isProductOnly(s),
    uniqueRequiredCoverage: uniqueRequiredCoverageScore(s),
    reliability: s.archetype.higgsfieldReliability,
    difficulty: s.archetype.difficulty,
  }));

  indexed.sort((a, b) => {
    // If blueprint provides generation order, use that as primary sort
    if (hasBlueprintOrder) {
      const catDiff =
        (blueprintCategoryPriority[a.category] ?? 5) -
        (blueprintCategoryPriority[b.category] ?? 5);
      if (catDiff !== 0) return catDiff;
    } else {
      // 1. Commercial anchor importance
      const anchorDiff =
        (commercialAnchorOrder[a.category] ?? 5) -
        (commercialAnchorOrder[b.category] ?? 5);
      if (anchorDiff !== 0) return anchorDiff;
    }

    // 2. Required evidence coverage: shots covering unique required evidence first
    const coverDiff = b.uniqueRequiredCoverage - a.uniqueRequiredCoverage;
    if (coverDiff !== 0) return coverDiff;

    // 3. product_only shots NOT in first 3 positions (push them later)
    if (a.isProductOnly && !b.isProductOnly) return 1;
    if (!a.isProductOnly && b.isProductOnly) return -1;

    // 4. Reliability (high > medium > low)
    const rDiff =
      (reliabilityOrder[a.reliability] ?? 1) -
      (reliabilityOrder[b.reliability] ?? 1);
    if (rDiff !== 0) return rDiff;

    // 5. Difficulty (easy > moderate > hard)
    return (
      (difficultyOrder[a.difficulty] ?? 1) -
      (difficultyOrder[b.difficulty] ?? 1)
    );
  });

  // Post-sort: ensure product_only shots are NOT in first 3 positions
  // unless all required on-body evidence is covered by the first 3 non-product-only shots
  const result = indexed.map((item) => item.index);
  const nonProductOnlyInFirst3 = result
    .slice(0, Math.min(3, result.length))
    .filter((idx) => !selected[idx].archetype.primaryDisplayZones.includes("product_only"));

  // Only enforce if we have more than 3 shots
  if (result.length > 3) {
    const first3NonPOShots = nonProductOnlyInFirst3.map((idx) => selected[idx]);
    if (!allRequiredCoveredBySet(first3NonPOShots)) {
      // Move any product_only in first 3 to position 4+
      for (let pos = 0; pos < Math.min(3, result.length); pos++) {
        const idx = result[pos];
        if (selected[idx].archetype.primaryDisplayZones.includes("product_only")) {
          // Find first non-product-only after position 3
          for (let swap = 3; swap < result.length; swap++) {
            if (!selected[result[swap]].archetype.primaryDisplayZones.includes("product_only")) {
              const temp = result[pos];
              result[pos] = result[swap];
              result[swap] = temp;
              break;
            }
          }
        }
      }
    }
  }

  // Post-sort: ensure first two generation-order shots don't share 3+ distinctive evidence
  if (result.length >= 2) {
    const firstIdx = result[0];
    const secondIdx = result[1];
    const firstEvidence = new Set(selected[firstIdx].archetype.evidenceCapabilities);
    const secondEvidence = selected[secondIdx].archetype.evidenceCapabilities;
    const shared = secondEvidence.filter((e) => firstEvidence.has(e));
    const distinctiveShared = shared.filter((e) => !AMBIENT_EVIDENCE.has(e));

    if (distinctiveShared.length >= 3) {
      // Find the best non-redundant shot to swap into position 2
      for (let swap = 2; swap < result.length; swap++) {
        const swapEvidence = selected[result[swap]].archetype.evidenceCapabilities;
        const swapShared = swapEvidence.filter((e) => firstEvidence.has(e));
        const swapDistinctive = swapShared.filter((e) => !AMBIENT_EVIDENCE.has(e));
        if (swapDistinctive.length < 3) {
          const temp = result[1];
          result[1] = result[swap];
          result[swap] = temp;
          break;
        }
      }
    }
  }

  return result;
}

// ── Diagnostics ──

export function computeDiagnostics(
  selected: ScoredArchetype[],
  evidencePlan: ResolvedEvidencePlan,
): PlanDiagnostics {
  // Collect all evidence provided by selected shots
  const allCoveredEvidence = new Set<EvidenceType>();
  for (const s of selected) {
    for (const ev of s.archetype.evidenceCapabilities) {
      allCoveredEvidence.add(ev);
    }
  }

  // Classify coverage by priority
  const requiredEvidenceCovered: EvidenceType[] = [];
  const recommendedEvidenceCovered: EvidenceType[] = [];
  const uncoveredEvidence: EvidenceType[] = [];
  const uncoveredRequired: EvidenceType[] = [];
  const uncoveredRecommended: EvidenceType[] = [];
  const uncoveredOptional: EvidenceType[] = [];

  for (const er of evidencePlan.orderedEvidence) {
    if (er.priority === "discouraged") continue;

    if (allCoveredEvidence.has(er.evidence)) {
      if (er.priority === "required") {
        requiredEvidenceCovered.push(er.evidence);
      } else if (er.priority === "recommended") {
        recommendedEvidenceCovered.push(er.evidence);
      }
    } else {
      if (er.priority === "required") {
        uncoveredRequired.push(er.evidence);
        uncoveredEvidence.push(er.evidence);
      } else if (er.priority === "recommended") {
        uncoveredRecommended.push(er.evidence);
        uncoveredEvidence.push(er.evidence);
      } else if (er.priority === "optional") {
        uncoveredOptional.push(er.evidence);
      }
    }
  }

  // Redundancy warnings: check all pairs
  const redundancyWarnings: RedundancyWarning[] = [];
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const a = selected[i];
      const b = selected[j];
      const aEvidence = new Set(a.archetype.evidenceCapabilities);
      const bEvidence = new Set(b.archetype.evidenceCapabilities);
      const aZones = new Set(a.archetype.primaryDisplayZones);
      const bZones = new Set(b.archetype.primaryDisplayZones);
      const aBucket = getFramingBucket(a.archetype.defaultFraming);
      const bBucket = getFramingBucket(b.archetype.defaultFraming);

      const sharedEvidence: EvidenceType[] = [];
      for (const ev of aEvidence) {
        if (bEvidence.has(ev)) sharedEvidence.push(ev);
      }

      let sharedZoneCount = 0;
      for (const z of aZones) {
        if (bZones.has(z)) sharedZoneCount++;
      }

      const sameBucket = aBucket === bBucket;

      const distinctiveCount = countDistinctiveShared(sharedEvidence);

      if (distinctiveCount >= 3 && sameBucket && sharedZoneCount > 0) {
        redundancyWarnings.push({
          severity: "critical",
          shotA: i + 1,
          shotB: j + 1,
          sharedEvidence,
          message: `Critical redundancy between shot ${i + 1} and shot ${j + 1}: ${distinctiveCount} distinctive shared evidence (${sharedEvidence.length} total), same framing bucket, ${sharedZoneCount} overlapping zones`,
        });
      } else if (
        (distinctiveCount >= 2 && sameBucket) ||
        (distinctiveCount >= 3 && !sameBucket)
      ) {
        redundancyWarnings.push({
          severity: "warning",
          shotA: i + 1,
          shotB: j + 1,
          sharedEvidence,
          message: `Redundancy warning between shot ${i + 1} and shot ${j + 1}: ${distinctiveCount} distinctive shared evidence (${sharedEvidence.length} total)${sameBucket ? ", same framing bucket" : ""}`,
        });
      } else if (sharedEvidence.length === 1 && !sameBucket) {
        redundancyWarnings.push({
          severity: "info",
          shotA: i + 1,
          shotB: j + 1,
          sharedEvidence,
          message: `Minor overlap between shot ${i + 1} and shot ${j + 1}: 1 shared evidence, different framing`,
        });
      }
    }
  }

  // Role mix
  const roleMixActual: Partial<Record<ShotCategory, number>> = {};
  for (const s of selected) {
    const cat = s.archetype.shotCategory;
    roleMixActual[cat] = (roleMixActual[cat] || 0) + 1;
  }

  return {
    requiredEvidenceCovered,
    recommendedEvidenceCovered,
    uncoveredEvidence,
    uncoveredRequired,
    uncoveredRecommended,
    uncoveredOptional,
    redundancyWarnings,
    roleMixActual,
    roleMixTarget: evidencePlan.categoryRoleMix,
    shotCountRequested: selected.length, // will be overridden by caller with actual request
    shotCountActual: selected.length,
  };
}

// ── Main Entry Point ──

export function generateLookbookPlan(input: LookbookInput): LookbookPlanResult {
  // Step 1: Resolve the 3-layer blueprint
  const blueprint = resolveBlueprint(input);

  // Step 2: Build Master Shoot DNA (uses family blueprint hints)
  const dna = buildMasterShootDNA(input);

  // Step 3: Score all archetypes
  // DEPRECATED: filterArchetypesByBlueprint() skipped — evidence scoring + family hard constraint
  // in selectShots() replace the old restrictedArchetypeIds filtering.
  const scored = ALL_ARCHETYPES.map((arch) => scoreArchetype(arch, input, blueprint));

  // Step 4: Select shots with constraints
  const selected = selectShots(scored, input, input.shotCount, blueprint, dna);

  // Step 5: Compute generation order
  const genOrder = computeGenerationOrder(selected, blueprint);

  // Step 6: Build priority map (1-based, lower = generate first)
  const priorityMap = new Map<number, number>();
  genOrder.forEach((selIdx, priority) => {
    priorityMap.set(selIdx, priority + 1);
  });

  // Step 7: Build recommended shots (pass selected for whyGenerateNow context)
  const shots = selected.map((s, idx) =>
    buildRecommendedShot(
      s,
      idx + 1,
      priorityMap.get(idx) || idx + 1,
      dna,
      input,
      blueprint,
      selected,
    ),
  );

  // Step 8: Coverage (including evidence coverage)
  const baseCoverage = computeCoverage(
    selected.map((s) => s.archetype),
  );
  const evidenceCoverageMap: Partial<Record<EvidenceType, number>> = {};
  for (const s of selected) {
    for (const ev of s.archetype.evidenceCapabilities) {
      evidenceCoverageMap[ev] = (evidenceCoverageMap[ev] || 0) + 1;
    }
  }
  const coverage: CoverageSummary = {
    ...baseCoverage,
    evidenceCoverage: evidenceCoverageMap,
  };

  // Step 9: Diagnostics
  const diagnostics = computeDiagnostics(selected, blueprint.evidencePlan);
  diagnostics.shotCountRequested = input.shotCount;
  diagnostics.shotCountActual = shots.length;

  // Step 10: Export text (includes diagnostics)
  const exportText = formatExportText(dna, shots, genOrder, input, diagnostics);

  return {
    input,
    dna,
    shots,
    coverage,
    generationOrder: genOrder.map((i) => i + 1), // 1-based positions
    exportText,
    diagnostics,
  };
}
