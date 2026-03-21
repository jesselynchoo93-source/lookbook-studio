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
import {
  PRODUCT_ONLY_ELIGIBLE_FAMILIES,
  PRODUCT_ONLY_ELIGIBLE_CATEGORIES,
  getEvidenceWeight,
} from "./productEvidence";

// ── Accessory-Led Families ──
// These families have a physical product that is NOT the full outfit.
// Selection rules differ: fewer heroes, more product-focus and detail variety.
const ACCESSORY_LED_FAMILIES: string[] = ["bags", "jewelry", "eyewear", "watches", "small_accessories"];

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

    // Shared evidence
    const sharedEvidence: EvidenceType[] = [];
    for (const ev of candidateEvidence) {
      if (existingEvidence.has(ev)) sharedEvidence.push(ev);
    }

    // Shared primary display zones
    let sharedZoneCount = 0;
    for (const z of candidateZones) {
      if (existingZones.has(z)) sharedZoneCount++;
    }

    // Framing similarity
    const sameBucket = candidateBucket === existingBucket;

    // Classify severity
    if (sharedEvidence.length >= 3 && sameBucket && sharedZoneCount > 0) {
      // Critical
      totalPenalty -= 30;
      warnings.push({
        severity: "critical",
        shotA: i + 1,
        shotB: alreadySelected.length + 1,
        sharedEvidence,
        message: `Critical redundancy: ${sharedEvidence.length} shared evidence types, same framing bucket (${candidateBucket}), ${sharedZoneCount} overlapping primary zones`,
      });
    } else if (
      (sharedEvidence.length >= 2 && sameBucket) ||
      (sharedEvidence.length >= 3 && !sameBucket)
    ) {
      // Warning
      totalPenalty -= 15;
      warnings.push({
        severity: "warning",
        shotA: i + 1,
        shotB: alreadySelected.length + 1,
        sharedEvidence,
        message: `Redundancy warning: ${sharedEvidence.length} shared evidence types${sameBucket ? ", same framing bucket" : ", different framing bucket"}`,
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

  const passesHardConstraints = (candidate: ScoredArchetype): boolean => {
    const cat = candidate.archetype.shotCategory;

    // Family match: block single-family archetypes designed for a different family
    // (e.g. bag_hardware_detail for eyewear). Multi-family archetypes get a soft scoring penalty instead.
    if (
      candidate.archetype.suitableFamilies.length <= 2 &&
      !candidate.archetype.suitableFamilies.includes(input.productFamily)
    ) {
      return false;
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
          framingDiversityBonus = -10;
        }

        const combinedScore =
          marginalGain + c.score + framingDiversityBonus + redundancyPenalty;

        return { candidate: c, combinedScore };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore);

    if (candidates.length > 0) {
      addToSelected(candidates[0].candidate);
    }
  }

  // ── Phase 2: Greedy marginal gain ──
  while (selected.length < count) {
    let bestCandidate: ScoredArchetype | null = null;
    let bestScore = -Infinity;

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

      const marginalGain = computeMarginalEvidenceGain(candidate, coveredEvidence, evidencePlan);

      // Role mix bonus
      const cat = candidate.archetype.shotCategory;
      const catTarget = evidencePlan.categoryRoleMix[cat] ?? 0;
      const catActual = categoryCount[cat] || 0;
      let roleMixBonus = 0;
      if (catActual < catTarget) {
        roleMixBonus = 15;
      } else if (catActual >= catTarget && catTarget > 0) {
        roleMixBonus = -10;
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
    addToSelected(bestCandidate);
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

  // Post-sort: ensure first two generation-order shots don't have critical redundancy
  // The validation assertion checks for 3+ shared evidence types regardless of framing bucket
  if (result.length >= 2) {
    const firstIdx = result[0];
    const secondIdx = result[1];
    const firstEvidence = new Set(selected[firstIdx].archetype.evidenceCapabilities);
    const secondEvidence = selected[secondIdx].archetype.evidenceCapabilities;
    const shared = secondEvidence.filter((e) => firstEvidence.has(e));

    if (shared.length >= 3) {
      // Find the best non-redundant shot to swap into position 2
      for (let swap = 2; swap < result.length; swap++) {
        const swapEvidence = selected[result[swap]].archetype.evidenceCapabilities;
        const swapShared = swapEvidence.filter((e) => firstEvidence.has(e));
        if (swapShared.length < 3) {
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

  // Classify coverage
  const requiredEvidenceCovered: EvidenceType[] = [];
  const recommendedEvidenceCovered: EvidenceType[] = [];
  const uncoveredEvidence: EvidenceType[] = [];

  for (const er of evidencePlan.orderedEvidence) {
    if (er.priority === "discouraged") continue;

    if (allCoveredEvidence.has(er.evidence)) {
      if (er.priority === "required") {
        requiredEvidenceCovered.push(er.evidence);
      } else if (er.priority === "recommended") {
        recommendedEvidenceCovered.push(er.evidence);
      }
    } else {
      if (er.priority === "required" || er.priority === "recommended") {
        uncoveredEvidence.push(er.evidence);
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

      if (sharedEvidence.length >= 3 && sameBucket && sharedZoneCount > 0) {
        redundancyWarnings.push({
          severity: "critical",
          shotA: i + 1,
          shotB: j + 1,
          sharedEvidence,
          message: `Critical redundancy between shot ${i + 1} and shot ${j + 1}: ${sharedEvidence.length} shared evidence, same framing bucket, ${sharedZoneCount} overlapping zones`,
        });
      } else if (
        (sharedEvidence.length >= 2 && sameBucket) ||
        (sharedEvidence.length >= 3 && !sameBucket)
      ) {
        redundancyWarnings.push({
          severity: "warning",
          shotA: i + 1,
          shotB: j + 1,
          sharedEvidence,
          message: `Redundancy warning between shot ${i + 1} and shot ${j + 1}: ${sharedEvidence.length} shared evidence${sameBucket ? ", same framing bucket" : ""}`,
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
    redundancyWarnings,
    roleMixActual,
    roleMixTarget: evidencePlan.categoryRoleMix,
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

  // Step 7: Build recommended shots
  const shots = selected.map((s, idx) =>
    buildRecommendedShot(
      s,
      idx + 1,
      priorityMap.get(idx) || idx + 1,
      dna,
      input,
      blueprint,
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
