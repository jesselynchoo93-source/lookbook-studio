/**
 * Validation harness for the evidence-based shot selection system.
 * 9 test cases across product categories.
 *
 * Run: npx tsx src/lib/lookbook/validateEvidence.ts
 */

import { generateLookbookPlan } from "./recommendShots";
import type { LookbookInput, EvidenceType, LookbookPlanResult, ShotCategory } from "./types";

interface TestCase {
  name: string;
  input: LookbookInput;
  assertions: (result: LookbookPlanResult) => string[];
}

function hasEvidence(result: LookbookPlanResult, ev: EvidenceType): boolean {
  return result.shots.some((s) => s.evidenceProvided.includes(ev));
}

function countCategory(result: LookbookPlanResult, cat: ShotCategory): number {
  return result.shots.filter((s) => s.archetype.shotCategory === cat).length;
}

function countDistinctCategories(result: LookbookPlanResult): number {
  const cats = new Set(result.shots.map((s) => s.archetype.shotCategory));
  return cats.size;
}

function hasNoApparelWording(result: LookbookPlanResult): string[] {
  const errors: string[] = [];
  const badPhrases = ["garment", "fabric drape"];
  for (const shot of result.shots) {
    for (const phrase of badPhrases) {
      if (shot.whatItSells.toLowerCase().includes(phrase)) {
        errors.push(`Shot ${shot.position} "${shot.archetype.title}" whatItSells contains "${phrase}"`);
      }
    }
  }
  return errors;
}

// Evidence types that appear on nearly every shot for certain families and
// should not count toward the redundancy check between generation-order shots.
const AMBIENT_EVIDENCE: Set<EvidenceType> = new Set([
  "body_scale",
  "face_scale",
  "fit_on_body",
  "full_silhouette",
  "scale_reference",
]);

// Check that first two generation-order shots don't have critical redundancy
function checkGenOrderNonRedundancy(result: LookbookPlanResult): string[] {
  const errors: string[] = [];
  if (result.generationOrder.length < 2) return errors;

  const first = result.generationOrder[0] - 1; // 0-based
  const second = result.generationOrder[1] - 1;
  const shotA = result.shots[first];
  const shotB = result.shots[second];

  if (!shotA || !shotB) return errors;

  const shared = shotA.evidenceProvided.filter((e) => shotB.evidenceProvided.includes(e));
  const distinctiveShared = shared.filter((e) => !AMBIENT_EVIDENCE.has(e));
  if (distinctiveShared.length >= 3) {
    errors.push(
      `First two generation-order shots (${shotA.archetype.title}, ${shotB.archetype.title}) share ${distinctiveShared.length} distinctive evidence types: ${distinctiveShared.join(", ")}`
    );
  }

  return errors;
}

const TEST_CASES: TestCase[] = [
  // 1. bags > shoulder bag > commercial (6)
  {
    name: "bags > shoulder bag > commercial",
    input: {
      productFamily: "bags",
      specificItem: "shoulder bag",
      genderPresentation: "womenswear",
      targetStyle: "commercial",
      primaryObjective: "sell_clearly",
      brandVisibility: "medium",
      poseDirection: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "carry_method")) errors.push("Missing carry_method evidence");
      if (!hasEvidence(result, "full_silhouette")) errors.push("Missing full_silhouette evidence");
      if (!hasEvidence(result, "hardware_detail")) errors.push("Missing hardware_detail evidence");
      if (!hasEvidence(result, "side_profile")) errors.push("Missing side_profile evidence");
      if (countCategory(result, "product_focus") < 1) errors.push("Need at least 1 product_focus with carry_method");
      // No apparel wording
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },

  // 2. bags > tote > commercial (6)
  {
    name: "bags > tote > commercial",
    input: {
      productFamily: "bags",
      specificItem: "tote",
      genderPresentation: "womenswear",
      targetStyle: "commercial",
      primaryObjective: "sell_clearly",
      brandVisibility: "medium",
      poseDirection: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "interior_capacity")) errors.push("Missing interior_capacity (tote-specific)");
      if (!hasEvidence(result, "carry_method")) errors.push("Missing carry_method");
      if (countCategory(result, "detail") < 1) errors.push("Need at least 1 detail shot");
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },

  // 3. jewelry > earrings > editorial (6)
  {
    name: "jewelry > earrings > editorial",
    input: {
      productFamily: "jewelry",
      specificItem: "earrings",
      genderPresentation: "womenswear",
      targetStyle: "editorial",
      primaryObjective: "editorial_story",
      secondaryEmphasis: "mood",
      brandVisibility: "low",
      poseDirection: "balanced",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "ear_visibility")) errors.push("Missing ear_visibility");
      if (!hasEvidence(result, "pair_symmetry")) errors.push("Missing pair_symmetry");
      const fullBody = result.shots.filter((s) =>
        s.archetype.defaultFraming.toLowerCase().includes("full body")
      ).length;
      if (fullBody > 2) errors.push(`Too many full-body shots (${fullBody}), expected <= 2`);
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },

  // 4. eyewear > sunglasses > commercial (6)
  {
    name: "eyewear > sunglasses > commercial",
    input: {
      productFamily: "eyewear",
      specificItem: "sunglasses",
      genderPresentation: "womenswear",
      targetStyle: "commercial",
      primaryObjective: "sell_clearly",
      brandVisibility: "medium",
      poseDirection: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "face_framing")) errors.push("Missing face_framing");
      if (!hasEvidence(result, "side_profile")) errors.push("Missing side_profile");
      // No bag/footwear archetypes
      for (const shot of result.shots) {
        const id = shot.archetype.id.toLowerCase();
        if (id.includes("bag_") || id.includes("footwear_")) {
          errors.push(`Shot ${shot.position} uses non-eyewear archetype: ${shot.archetype.id}`);
        }
      }
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },

  // 5. apparel > suit jacket > premium_branding (6)
  {
    name: "apparel > suit jacket > premium_branding",
    input: {
      productFamily: "apparel",
      specificItem: "suit jacket",
      genderPresentation: "menswear",
      targetStyle: "tailoring",
      primaryObjective: "sell_clearly",
      secondaryEmphasis: "branding",
      brandVisibility: "high",
      poseDirection: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "construction_quality")) errors.push("Missing construction_quality");
      if (!hasEvidence(result, "full_silhouette")) errors.push("Missing full_silhouette");
      if (!hasEvidence(result, "logo_placement")) errors.push("Missing logo_placement");
      return errors;
    },
  },

  // 6. footwear > sneakers > lifestyle (6)
  {
    name: "footwear > sneakers > lifestyle",
    input: {
      productFamily: "footwear",
      specificItem: "sneakers",
      genderPresentation: "unisex",
      targetStyle: "street",
      primaryObjective: "editorial_story",
      secondaryEmphasis: "styling",
      brandVisibility: "medium",
      poseDirection: "balanced",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "on_foot_presence")) errors.push("Missing on_foot_presence");
      if (!hasEvidence(result, "sole_profile")) errors.push("Missing sole_profile");
      const motionShots = result.shots.filter((s) => s.archetype.shotCategory === "motion").length;
      if (motionShots < 1) errors.push("Need at least 1 motion shot");
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },

  // 7. watches > sport watch > detail_focus (6)
  {
    name: "watches > sport watch > detail_focus",
    input: {
      productFamily: "watches",
      specificItem: "sport watch",
      genderPresentation: "menswear",
      targetStyle: "commercial",
      primaryObjective: "craftsmanship",
      brandVisibility: "low",
      poseDirection: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "wrist_visibility")) errors.push("Missing wrist_visibility");
      if (!hasEvidence(result, "hardware_detail")) errors.push("Missing hardware_detail");
      const detailOrFocus = countCategory(result, "detail") + countCategory(result, "product_focus");
      if (detailOrFocus < 2) errors.push(`Need 2+ detail/product_focus shots, got ${detailOrFocus}`);
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },

  // 8. full_look > evening ensemble > editorial (6)
  {
    name: "full_look > evening ensemble > editorial",
    input: {
      productFamily: "full_look",
      specificItem: "evening ensemble",
      genderPresentation: "womenswear",
      targetStyle: "editorial",
      primaryObjective: "editorial_story",
      secondaryEmphasis: "mood",
      brandVisibility: "low",
      poseDirection: "directional",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "full_silhouette")) errors.push("Missing full_silhouette");
      if (!hasEvidence(result, "fit_on_body")) errors.push("Missing fit_on_body");
      if (!hasEvidence(result, "styling_context")) errors.push("Missing styling_context");
      if (countDistinctCategories(result) < 3) {
        errors.push(`Need 3+ different categories, got ${countDistinctCategories(result)}`);
      }
      return errors;
    },
  },

  // 9. scarves > silk scarf > styling_story (6)
  {
    name: "scarves > silk scarf > styling_story",
    input: {
      productFamily: "scarves",
      specificItem: "silk scarf",
      genderPresentation: "womenswear",
      targetStyle: "editorial",
      primaryObjective: "editorial_story",
      secondaryEmphasis: "styling",
      brandVisibility: "low",
      poseDirection: "balanced",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "fabric_drape")) errors.push("Missing fabric_drape");
      if (!hasEvidence(result, "texture_detail")) errors.push("Missing texture_detail");
      // No footwear/bag/jewelry archetypes
      for (const shot of result.shots) {
        const id = shot.archetype.id.toLowerCase();
        if (id.includes("footwear_") || id.includes("bag_") || id.includes("ear_") || id.includes("jewelry_")) {
          errors.push(`Shot ${shot.position} uses wrong-family archetype: ${shot.archetype.id}`);
        }
      }
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },
  // 10. belts > leather belt > editorial (6)
  {
    name: "belts > leather belt > editorial",
    input: {
      productFamily: "belts",
      specificItem: "leather belt",
      genderPresentation: "menswear",
      targetStyle: "editorial",
      primaryObjective: "craftsmanship",
      brandVisibility: "medium",
      poseDirection: "balanced",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "waist_anchoring")) errors.push("Missing waist_anchoring evidence");
      if (!hasEvidence(result, "hardware_detail")) errors.push("Missing hardware_detail evidence");
      if (!hasEvidence(result, "closure_mechanism")) errors.push("Missing closure_mechanism evidence");
      if (countCategory(result, "detail") < 1) errors.push("Need at least 1 detail shot");
      const productFocusOrWaist = result.shots.filter(
        (s) => s.archetype.shotCategory === "product_focus" ||
               s.archetype.id === "belt_waist_hero" ||
               s.archetype.id === "belt_waist_styling_crop"
      ).length;
      if (productFocusOrWaist < 1) errors.push("Need at least 1 product_focus or waist-led shot");
      // No duplicate hero-like waist seller shots
      const heroCount = countCategory(result, "hero");
      if (heroCount > 1) errors.push(`Too many hero shots (${heroCount}), expected 1`);
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },

  // 11. headwear > cap > commercial (6)
  {
    name: "headwear > cap > commercial",
    input: {
      productFamily: "headwear",
      specificItem: "cap",
      genderPresentation: "menswear",
      targetStyle: "commercial",
      primaryObjective: "sell_clearly",
      brandVisibility: "medium",
      poseDirection: "balanced",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "face_framing")) errors.push("Missing face_framing evidence");
      if (!hasEvidence(result, "face_scale")) errors.push("Missing face_scale evidence");
      if (result.shots.length < 5) errors.push(`Need 5+ shots, got ${result.shots.length}`);
      if (!hasEvidence(result, "texture_detail")) errors.push("Missing texture_detail evidence (recommended)");
      if (!hasEvidence(result, "side_profile")) errors.push("Missing side_profile evidence (recommended)");
      // Should have at least 1 detail shot for texture
      if (countCategory(result, "detail") < 1) errors.push("Need at least 1 detail shot");
      // Should not select bag/watch/footwear archetypes
      for (const shot of result.shots) {
        const id = shot.archetype.id.toLowerCase();
        if (id.includes("bag_") || id.includes("watch_") || id.includes("footwear_")) {
          errors.push(`Shot ${shot.position} uses wrong-family archetype: ${shot.archetype.id}`);
        }
      }
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },

  // 12. small_accessories > wallet > commercial (6)
  {
    name: "small_accessories > wallet > commercial",
    input: {
      productFamily: "small_accessories",
      specificItem: "wallet",
      genderPresentation: "menswear",
      targetStyle: "commercial",
      primaryObjective: "craftsmanship",
      brandVisibility: "low",
      poseDirection: "balanced",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "scale_reference")) errors.push("Missing scale_reference evidence");
      if (!hasEvidence(result, "texture_detail")) errors.push("Missing texture_detail evidence");
      if (result.shots.length < 4) errors.push(`Need 4+ shots, got ${result.shots.length}`);
      if (countCategory(result, "detail") + countCategory(result, "product_focus") < 2) {
        errors.push("Need 2+ detail/product_focus shots");
      }
      if (countCategory(result, "hero") < 1) errors.push("Need at least 1 hero shot");
      // Should not select bag/watch/footwear archetypes
      for (const shot of result.shots) {
        const id = shot.archetype.id.toLowerCase();
        if (id.includes("bag_") || id.includes("watch_") || id.includes("footwear_")) {
          errors.push(`Shot ${shot.position} uses wrong-family archetype: ${shot.archetype.id}`);
        }
      }
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },
];

// ── Runner ──

export function validateAll(): { passed: number; failed: number; details: string[] } {
  let passed = 0;
  let failed = 0;
  const details: string[] = [];

  for (const tc of TEST_CASES) {
    const result = generateLookbookPlan(tc.input);
    const errors = tc.assertions(result);

    // Cross-cutting: first two gen-order shots must not have critical redundancy
    const genOrderErrors = checkGenOrderNonRedundancy(result);
    errors.push(...genOrderErrors);

    if (errors.length === 0) {
      passed++;
      details.push(`PASS: ${tc.name}`);
      details.push(`  Evidence covered: ${result.diagnostics.requiredEvidenceCovered.join(", ")}`);
      if (result.diagnostics.uncoveredEvidence.length > 0) {
        details.push(`  Uncovered (recommended): ${result.diagnostics.uncoveredEvidence.join(", ")}`);
      }
      const cats = result.shots.map((s) => s.archetype.shotCategory).join(", ");
      details.push(`  Categories: ${cats}`);
    } else {
      failed++;
      details.push(`FAIL: ${tc.name}`);
      for (const e of errors) {
        details.push(`  - ${e}`);
      }
      details.push(`  Shots selected:`);
      for (const shot of result.shots) {
        details.push(`    ${shot.position}. ${shot.archetype.title} [${shot.archetype.shotCategory}] evidence: ${shot.evidenceProvided.join(", ")}`);
      }
      if (result.diagnostics.uncoveredEvidence.length > 0) {
        details.push(`  Uncovered: ${result.diagnostics.uncoveredEvidence.join(", ")}`);
      }
      if (result.diagnostics.redundancyWarnings.length > 0) {
        for (const w of result.diagnostics.redundancyWarnings) {
          details.push(`  ${w.message}`);
        }
      }
    }
    details.push("");
  }

  details.push(`Results: ${passed} passed, ${failed} failed out of ${TEST_CASES.length}`);
  return { passed, failed, details };
}

// Run if executed directly
if (typeof process !== "undefined" && process.argv[1]?.includes("validateEvidence")) {
  const { passed, failed, details } = validateAll();
  for (const line of details) {
    console.log(line);
  }
  process.exit(failed > 0 ? 1 : 0);
}
