import type {
  LookbookInput,
  LookbookPlanResult,
  ScoredArchetype,
  MasterShootDNA,
  CoverageSummary,
  ShotBlueprint,
} from "./types";
import { ALL_ARCHETYPES } from "./shotArchetypes";
import { scoreArchetype, computeCoverage, filterArchetypesByBlueprint } from "./scoring";
import { buildMasterShootDNA } from "./shootDNA";
import { buildRecommendedShot } from "./buildShotDelta";
import { formatExportText } from "./exportShotPlan";
import { selectBlueprint } from "./shotBlueprints";

// ── Selection with Hard Constraints ──

function selectShots(
  scored: ScoredArchetype[],
  input: LookbookInput,
  count: number,
  blueprint: ShotBlueprint | null,
  dna: MasterShootDNA
): ScoredArchetype[] {
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  const selected: ScoredArchetype[] = [];
  const categoryCount: Record<string, number> = {};
  let motionCount = 0;

  const maxMotion = blueprint?.maxMotionShots ?? 2;

  // Phase 1: if blueprint exists, satisfy required roles first
  if (blueprint) {
    for (const requiredId of blueprint.requiredRoles) {
      if (selected.length >= count) break;
      const candidate = sorted.find(
        (s) => s.archetype.id === requiredId && !selected.includes(s)
      );
      if (candidate) {
        selected.push(candidate);
        const cat = candidate.archetype.shotCategory;
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        if (cat === "motion") motionCount++;
      }
    }
  }

  // Phase 2: fill remaining slots from sorted candidates
  for (const candidate of sorted) {
    if (selected.length >= count) break;
    if (selected.includes(candidate)) continue;

    const cat = candidate.archetype.shotCategory;

    // Max 2 per category
    if ((categoryCount[cat] || 0) >= 2) continue;

    // Motion cap
    if (cat === "motion" && motionCount >= maxMotion) continue;

    // DNA enforcement: if DNA says portrait/detail framing, limit full-body shots
    const dnaFraming = dna.framingFamily.toLowerCase();
    const isPortraitDNA = dnaFraming.includes("half-body") || dnaFraming.includes("close-up") || dnaFraming.includes("mixed");
    const isFullBodyArchetype = candidate.archetype.defaultFraming.toLowerCase().includes("full body");
    if (isPortraitDNA && isFullBodyArchetype) {
      // Allow at most 1 full-body shot when DNA prefers portrait/detail framing
      const existingFullBody = selected.filter(
        (s) => s.archetype.defaultFraming.toLowerCase().includes("full body")
      ).length;
      if (existingFullBody >= 1) continue;
    }

    selected.push(candidate);
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    if (cat === "motion") motionCount++;
  }

  // Guarantee: at least 1 clarity-driven shot
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

  // Guarantee: at least 1 detail shot for accessories
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

  return selected;
}

// ── Generation Order ──
// Blueprint-aware: for jewelry/accessories, prioritise portrait heroes first, then detail, then editorial.
// For apparel, keep the original order: reliability then difficulty.

function computeGenerationOrder(
  selected: ScoredArchetype[],
  blueprint: ShotBlueprint | null
): number[] {
  const indexed = selected.map((s, i) => ({
    index: i,
    id: s.archetype.id,
    category: s.archetype.shotCategory,
    reliability: s.archetype.higgsfieldReliability,
    difficulty: s.archetype.difficulty,
    isRequired: blueprint ? blueprint.requiredRoles.includes(s.archetype.id) : false,
  }));

  if (blueprint) {
    // Blueprint-aware ordering: required first, then by category priority, then reliability
    const categoryPriority: Record<string, number> = {
      hero: 0,
      product_focus: 1,
      detail: 2,
      editorial: 3,
      silhouette: 4,
      motion: 5,
    };
    const reliabilityOrder = { high: 0, medium: 1, low: 2 };

    indexed.sort((a, b) => {
      // Required roles first
      if (a.isRequired && !b.isRequired) return -1;
      if (!a.isRequired && b.isRequired) return 1;
      // Then by category priority
      const catDiff = (categoryPriority[a.category] ?? 3) - (categoryPriority[b.category] ?? 3);
      if (catDiff !== 0) return catDiff;
      // Then by reliability
      return reliabilityOrder[a.reliability] - reliabilityOrder[b.reliability];
    });
  } else {
    // Generic ordering: reliability first, then difficulty
    const reliabilityOrder = { high: 0, medium: 1, low: 2 };
    const difficultyOrder = { easy: 0, moderate: 1, hard: 2 };

    indexed.sort((a, b) => {
      const rDiff = reliabilityOrder[a.reliability] - reliabilityOrder[b.reliability];
      if (rDiff !== 0) return rDiff;
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
  }

  return indexed.map((item) => item.index);
}

// ── Main Entry Point ──

export function generateLookbookPlan(input: LookbookInput): LookbookPlanResult {
  // Step 1: Build Master Shoot DNA
  const dna = buildMasterShootDNA(input);

  // Step 2: Select blueprint (may be null for generic items)
  const blueprint = selectBlueprint(input);

  // Step 3: Filter archetypes through blueprint, then score
  const archetypePool = blueprint
    ? filterArchetypesByBlueprint(ALL_ARCHETYPES, blueprint)
    : ALL_ARCHETYPES;

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
