import type {
  LookbookInput,
  LookbookPlanResult,
  ScoredArchetype,
  MasterShootDNA,
  CoverageSummary,
} from "./types";
import { ALL_ARCHETYPES } from "./shotArchetypes";
import { scoreArchetype, computeCoverage } from "./scoring";
import { buildMasterShootDNA } from "./shootDNA";
import { buildRecommendedShot } from "./buildShotDelta";
import { formatExportText } from "./exportShotPlan";

// ── Selection with Hard Constraints ──

function selectShots(
  scored: ScoredArchetype[],
  input: LookbookInput,
  count: number
): ScoredArchetype[] {
  // Sort by score descending
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  const selected: ScoredArchetype[] = [];
  const categoryCount: Record<string, number> = {};
  let motionCount = 0;

  for (const candidate of sorted) {
    if (selected.length >= count) break;

    const cat = candidate.archetype.shotCategory;

    // Max 2 per category
    if ((categoryCount[cat] || 0) >= 2) continue;

    // Max 2 motion shots
    if (cat === "motion" && motionCount >= 2) continue;

    selected.push(candidate);
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    if (cat === "motion") motionCount++;
  }

  // Guarantee constraints: ensure at least 1 clarity-driven shot
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

  // Ensure at least 1 detail/product shot for accessories
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

  // Ensure at least 1 editorial shot when creativity is balanced or directional
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

function computeGenerationOrder(
  selected: ScoredArchetype[]
): number[] {
  // Sort by: reliability (high first), then difficulty (easy first)
  const indexed = selected.map((s, i) => ({
    index: i,
    reliability: s.archetype.higgsfieldReliability,
    difficulty: s.archetype.difficulty,
  }));

  const reliabilityOrder = { high: 0, medium: 1, low: 2 };
  const difficultyOrder = { easy: 0, moderate: 1, hard: 2 };

  indexed.sort((a, b) => {
    const rDiff = reliabilityOrder[a.reliability] - reliabilityOrder[b.reliability];
    if (rDiff !== 0) return rDiff;
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });

  return indexed.map((item) => item.index);
}

// ── Main Entry Point ──

export function generateLookbookPlan(input: LookbookInput): LookbookPlanResult {
  // Step 1: Build Master Shoot DNA
  const dna = buildMasterShootDNA(input);

  // Step 2: Score all archetypes
  const scored = ALL_ARCHETYPES.map((arch) => scoreArchetype(arch, input));

  // Step 3: Select shots with constraints
  const selected = selectShots(scored, input, input.shotCount);

  // Step 4: Compute generation order
  const genOrder = computeGenerationOrder(selected);

  // Step 5: Build priority map (1-based, lower = generate first)
  const priorityMap = new Map<number, number>();
  genOrder.forEach((selIdx, priority) => {
    priorityMap.set(selIdx, priority + 1);
  });

  // Step 6: Build recommended shots
  const shots = selected.map((s, idx) =>
    buildRecommendedShot(
      s,
      idx + 1,
      priorityMap.get(idx) || idx + 1,
      dna,
      input
    )
  );

  // Step 7: Coverage
  const coverage: CoverageSummary = computeCoverage(
    selected.map((s) => s.archetype)
  );

  // Step 8: Export text
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
