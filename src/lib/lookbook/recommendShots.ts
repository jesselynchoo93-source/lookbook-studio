import type {
  LookbookInput,
  LookbookPlanResult,
  ScoredArchetype,
  MasterShootDNA,
  CoverageSummary,
  ResolvedBlueprint,
} from "./types";
import { ALL_ARCHETYPES } from "./shotArchetypes";
import { scoreArchetype, computeCoverage, filterArchetypesByBlueprint } from "./scoring";
import { buildMasterShootDNA } from "./shootDNA";
import { buildRecommendedShot } from "./buildShotDelta";
import { formatExportText } from "./exportShotPlan";
import { resolveBlueprint, UNIVERSAL_RULES } from "./shotBlueprints";

// ── Accessory-Led Families ──
// These families have a physical product that is NOT the full outfit.
// Selection rules differ: fewer heroes, more product-focus and detail variety.
const ACCESSORY_LED_FAMILIES: string[] = ["bags", "jewelry", "eyewear", "watches", "small_accessories"];

// ── Selection with Hard Constraints ──

function selectShots(
  scored: ScoredArchetype[],
  input: LookbookInput,
  count: number,
  blueprint: ResolvedBlueprint,
  dna: MasterShootDNA
): ScoredArchetype[] {
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  const selected: ScoredArchetype[] = [];
  const categoryCount: Record<string, number> = {};
  let motionCount = 0;
  let heroCount = 0;

  const maxPerCategory = UNIVERSAL_RULES.maxShotsPerCategory;
  const maxMotion = blueprint.maxMotionShots;
  const isAccessoryLed = ACCESSORY_LED_FAMILIES.includes(input.productFamily);
  // Accessory-led families: max 1 hero to avoid redundant full-body standing shots
  const maxHero = isAccessoryLed ? 1 : maxPerCategory;

  // Phase 1: satisfy required archetypes first
  for (const requiredId of blueprint.requiredArchetypeIds) {
    if (selected.length >= count) break;
    const candidate = sorted.find(
      (s) => s.archetype.id === requiredId && !selected.includes(s)
    );
    if (candidate) {
      selected.push(candidate);
      const cat = candidate.archetype.shotCategory;
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      if (cat === "motion") motionCount++;
      if (cat === "hero") heroCount++;
    }
  }

  // Phase 2: fill remaining slots from sorted candidates
  for (const candidate of sorted) {
    if (selected.length >= count) break;
    if (selected.includes(candidate)) continue;

    const cat = candidate.archetype.shotCategory;

    // Max per category
    if ((categoryCount[cat] || 0) >= maxPerCategory) continue;

    // Hero cap for accessory-led families
    if (cat === "hero" && heroCount >= maxHero) continue;

    // Motion cap
    if (cat === "motion" && motionCount >= maxMotion) continue;

    // No duplicate archetypes
    if (UNIVERSAL_RULES.noDuplicateArchetypes) {
      if (selected.some((s) => s.archetype.id === candidate.archetype.id)) continue;
    }

    // Framing diversity: for accessory-led families, do not allow a second
    // full-body front-biased shot if we already have one, unless it is a
    // different category (e.g. silhouette vs hero)
    if (isAccessoryLed) {
      const candidateFraming = candidate.archetype.defaultFraming.toLowerCase();
      const isFrontFullBody = candidateFraming.includes("full body") &&
        (candidate.archetype.defaultAngle.toLowerCase().includes("straight on") ||
         candidate.archetype.defaultAngle.toLowerCase().includes("perpendicular"));
      if (isFrontFullBody) {
        const existingFrontFullBody = selected.filter((s) => {
          const f = s.archetype.defaultFraming.toLowerCase();
          const a = s.archetype.defaultAngle.toLowerCase();
          return f.includes("full body") && (a.includes("straight on") || a.includes("perpendicular"));
        }).length;
        if (existingFrontFullBody >= 1) continue;
      }
    }

    // DNA enforcement: if blueprint prefers portrait/detail framing, limit full-body shots
    const prefFraming = blueprint.preferredFramingFamily;
    const isPortraitPreference = prefFraming === "half_body" || prefFraming === "close_up";
    const isFullBodyArchetype = candidate.archetype.defaultFraming.toLowerCase().includes("full body");
    if (isPortraitPreference && isFullBodyArchetype) {
      const existingFullBody = selected.filter(
        (s) => s.archetype.defaultFraming.toLowerCase().includes("full body")
      ).length;
      if (existingFullBody >= 1) continue;
    }

    selected.push(candidate);
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    if (cat === "motion") motionCount++;
    if (cat === "hero") heroCount++;
  }

  // Guarantee: at least 1 clarity-driven shot
  if (UNIVERSAL_RULES.guaranteeClarityShot) {
    const hasClarityShot = selected.some(
      (s) => s.archetype.productClaritySuitability === "high"
    );
    if (!hasClarityShot && selected.length >= count) {
      const clarityCandidate = sorted.find(
        (s) =>
          s.archetype.productClaritySuitability === "high" &&
          !selected.includes(s)
      );
      if (clarityCandidate) {
        selected[selected.length - 1] = clarityCandidate;
      }
    }
  }

  // Guarantee: at least 1 detail/product_focus shot for accessories
  const isAccessory = ["jewelry", "eyewear", "watches", "bags", "footwear", "small_accessories"].includes(
    input.productFamily
  );
  if (isAccessory) {
    const hasDetailShot = selected.some(
      (s) =>
        s.archetype.shotCategory === "detail" ||
        s.archetype.shotCategory === "product_focus"
    );
    if (!hasDetailShot && selected.length >= count) {
      const detailCandidate = sorted.find(
        (s) =>
          (s.archetype.shotCategory === "detail" ||
            s.archetype.shotCategory === "product_focus") &&
          !selected.includes(s)
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
        (s) => s.archetype.shotCategory === "editorial"
      );
      if (!hasEditorial && selected.length >= count) {
        const editorialCandidate = sorted.find(
          (s) =>
            s.archetype.shotCategory === "editorial" && !selected.includes(s)
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
// Blueprint-aware: uses the resolved blueprint's generationCategoryOrder.

function computeGenerationOrder(
  selected: ScoredArchetype[],
  blueprint: ResolvedBlueprint
): number[] {
  const indexed = selected.map((s, i) => ({
    index: i,
    id: s.archetype.id,
    category: s.archetype.shotCategory,
    reliability: s.archetype.higgsfieldReliability,
    difficulty: s.archetype.difficulty,
    isRequired: blueprint.requiredArchetypeIds.includes(s.archetype.id),
  }));

  // Build category priority from the blueprint's generation order
  const categoryPriority: Record<string, number> = {};
  blueprint.generationCategoryOrder.forEach((cat, idx) => {
    categoryPriority[cat] = idx;
  });

  const reliabilityOrder = { high: 0, medium: 1, low: 2 };
  const difficultyOrder = { easy: 0, moderate: 1, hard: 2 };

  indexed.sort((a, b) => {
    // Required archetypes first
    if (a.isRequired && !b.isRequired) return -1;
    if (!a.isRequired && b.isRequired) return 1;
    // Then by category priority from blueprint
    const catDiff = (categoryPriority[a.category] ?? 5) - (categoryPriority[b.category] ?? 5);
    if (catDiff !== 0) return catDiff;
    // Then by reliability
    const rDiff = reliabilityOrder[a.reliability] - reliabilityOrder[b.reliability];
    if (rDiff !== 0) return rDiff;
    // Then by difficulty
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });

  return indexed.map((item) => item.index);
}

// ── Main Entry Point ──

export function generateLookbookPlan(input: LookbookInput): LookbookPlanResult {
  // Step 1: Resolve the 3-layer blueprint
  const blueprint = resolveBlueprint(input);

  // Step 2: Build Master Shoot DNA (uses family blueprint hints)
  const dna = buildMasterShootDNA(input);

  // Step 3: Filter archetypes through blueprint restrictions, then score
  const archetypePool = filterArchetypesByBlueprint(ALL_ARCHETYPES, blueprint);

  const scored = archetypePool.map((arch) => scoreArchetype(arch, input, blueprint));

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
      blueprint
    )
  );

  // Step 8: Coverage
  const coverage: CoverageSummary = computeCoverage(
    selected.map((s) => s.archetype)
  );

  // Step 9: Export text
  const exportText = formatExportText(dna, shots, genOrder, input);

  return {
    input,
    dna,
    shots,
    coverage,
    generationOrder: genOrder.map((i) => i + 1), // 1-based positions
    exportText,
  };
}
