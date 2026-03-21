/**
 * Full validation runner for the evidence-based shot selection system.
 * Prints selected shots, evidence coverage, diagnostics, and assertion results for all 9 cases.
 *
 * Run: npx tsx src/lib/lookbook/runValidation.ts
 */

import { generateLookbookPlan } from "./recommendShots";
import type { LookbookInput, EvidenceType, LookbookPlanResult, ShotCategory } from "./types";

// ── Helpers ──

function hasEvidence(result: LookbookPlanResult, ev: EvidenceType): boolean {
  return result.shots.some((s) => s.evidenceProvided.includes(ev));
}

function countCategory(result: LookbookPlanResult, cat: ShotCategory): number {
  return result.shots.filter((s) => s.archetype.shotCategory === cat).length;
}

function countDistinctCategories(result: LookbookPlanResult): number {
  return new Set(result.shots.map((s) => s.archetype.shotCategory)).size;
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

function checkGenOrderNonRedundancy(result: LookbookPlanResult): string[] {
  const errors: string[] = [];
  if (result.generationOrder.length < 2) return errors;
  const first = result.generationOrder[0] - 1;
  const second = result.generationOrder[1] - 1;
  const shotA = result.shots[first];
  const shotB = result.shots[second];
  if (!shotA || !shotB) return errors;
  const shared = shotA.evidenceProvided.filter((e) => shotB.evidenceProvided.includes(e));
  if (shared.length >= 3) {
    errors.push(
      `Gen-order redundancy: first two shots (${shotA.archetype.title}, ${shotB.archetype.title}) share ${shared.length} evidence: ${shared.join(", ")}`
    );
  }
  return errors;
}

// ── Test Cases ──

interface TestCase {
  name: string;
  input: LookbookInput;
  assertions: (result: LookbookPlanResult) => string[];
}

const TEST_CASES: TestCase[] = [
  {
    name: "1. bags > shoulder bag > commercial",
    input: {
      productFamily: "bags",
      specificItem: "shoulder bag",
      genderPresentation: "womenswear",
      targetStyle: "commercial",
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "medium",
      creativityLevel: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "carry_method")) errors.push("FAIL: Missing carry_method evidence");
      if (!hasEvidence(result, "full_silhouette")) errors.push("FAIL: Missing full_silhouette evidence");
      if (!hasEvidence(result, "hardware_detail")) errors.push("FAIL: Missing hardware_detail evidence");
      if (!hasEvidence(result, "side_profile")) errors.push("FAIL: Missing side_profile evidence");
      if (countCategory(result, "product_focus") < 1) errors.push("FAIL: Need >= 1 product_focus shot");
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },
  {
    name: "2. bags > tote > commercial",
    input: {
      productFamily: "bags",
      specificItem: "tote",
      genderPresentation: "womenswear",
      targetStyle: "commercial",
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "medium",
      creativityLevel: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "interior_capacity")) errors.push("FAIL: Missing interior_capacity (tote-specific)");
      if (!hasEvidence(result, "carry_method")) errors.push("FAIL: Missing carry_method");
      if (countCategory(result, "detail") < 1) errors.push("FAIL: Need >= 1 detail shot");
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },
  {
    name: "3. jewelry > earrings > editorial",
    input: {
      productFamily: "jewelry",
      specificItem: "earrings",
      genderPresentation: "womenswear",
      targetStyle: "editorial",
      campaignGoal: "mood",
      logoVisibilityPriority: "low",
      creativityLevel: "balanced",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "ear_visibility")) errors.push("FAIL: Missing ear_visibility");
      if (!hasEvidence(result, "pair_symmetry")) errors.push("FAIL: Missing pair_symmetry");
      const fullBody = result.shots.filter((s) =>
        s.archetype.defaultFraming.toLowerCase().includes("full body")
      ).length;
      if (fullBody > 2) errors.push(`FAIL: Too many full-body shots (${fullBody}), expected <= 2`);
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },
  {
    name: "4. eyewear > sunglasses > commercial",
    input: {
      productFamily: "eyewear",
      specificItem: "sunglasses",
      genderPresentation: "womenswear",
      targetStyle: "commercial",
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "medium",
      creativityLevel: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "face_framing")) errors.push("FAIL: Missing face_framing");
      if (!hasEvidence(result, "side_profile")) errors.push("FAIL: Missing side_profile");
      for (const shot of result.shots) {
        const id = shot.archetype.id.toLowerCase();
        if (id.includes("bag_") || id.includes("footwear_")) {
          errors.push(`FAIL: Shot ${shot.position} uses non-eyewear archetype: ${shot.archetype.id}`);
        }
      }
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },
  {
    name: "5. apparel > suit jacket > premium_branding",
    input: {
      productFamily: "apparel",
      specificItem: "suit jacket",
      genderPresentation: "menswear",
      targetStyle: "tailoring",
      campaignGoal: "premium_branding",
      logoVisibilityPriority: "high",
      creativityLevel: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "construction_quality")) errors.push("FAIL: Missing construction_quality");
      if (!hasEvidence(result, "full_silhouette")) errors.push("FAIL: Missing full_silhouette");
      if (!hasEvidence(result, "logo_placement")) errors.push("FAIL: Missing logo_placement");
      return errors;
    },
  },
  {
    name: "6. footwear > sneakers > lifestyle",
    input: {
      productFamily: "footwear",
      specificItem: "sneakers",
      genderPresentation: "unisex",
      targetStyle: "street",
      campaignGoal: "styling_story",
      logoVisibilityPriority: "medium",
      creativityLevel: "balanced",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "on_foot_presence")) errors.push("FAIL: Missing on_foot_presence");
      if (!hasEvidence(result, "sole_profile")) errors.push("FAIL: Missing sole_profile");
      if (countCategory(result, "motion") < 1) errors.push("FAIL: Need >= 1 motion shot");
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },
  {
    name: "7. watches > sport watch > detail_focus",
    input: {
      productFamily: "watches",
      specificItem: "sport watch",
      genderPresentation: "menswear",
      targetStyle: "commercial",
      campaignGoal: "detail_focus",
      logoVisibilityPriority: "low",
      creativityLevel: "safe",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "wrist_visibility")) errors.push("FAIL: Missing wrist_visibility");
      if (!hasEvidence(result, "hardware_detail")) errors.push("FAIL: Missing hardware_detail");
      const detailOrFocus = countCategory(result, "detail") + countCategory(result, "product_focus");
      if (detailOrFocus < 2) errors.push(`FAIL: Need 2+ detail/product_focus shots, got ${detailOrFocus}`);
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },
  {
    name: "8. full_look > evening ensemble > editorial",
    input: {
      productFamily: "full_look",
      specificItem: "evening ensemble",
      genderPresentation: "womenswear",
      targetStyle: "editorial",
      campaignGoal: "mood",
      logoVisibilityPriority: "low",
      creativityLevel: "directional",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "full_silhouette")) errors.push("FAIL: Missing full_silhouette");
      if (!hasEvidence(result, "fit_on_body")) errors.push("FAIL: Missing fit_on_body");
      if (!hasEvidence(result, "styling_context")) errors.push("FAIL: Missing styling_context");
      if (countDistinctCategories(result) < 3)
        errors.push(`FAIL: Need 3+ categories, got ${countDistinctCategories(result)}`);
      return errors;
    },
  },
  {
    name: "9. scarves > silk scarf > styling_story",
    input: {
      productFamily: "scarves",
      specificItem: "silk scarf",
      genderPresentation: "womenswear",
      targetStyle: "editorial",
      campaignGoal: "styling_story",
      logoVisibilityPriority: "low",
      creativityLevel: "balanced",
      shotCount: 6,
    },
    assertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "fabric_drape")) errors.push("FAIL: Missing fabric_drape");
      if (!hasEvidence(result, "texture_detail")) errors.push("FAIL: Missing texture_detail");
      for (const shot of result.shots) {
        const id = shot.archetype.id.toLowerCase();
        if (id.includes("footwear_") || id.includes("bag_") || id.includes("ear_") || id.includes("jewelry_")) {
          errors.push(`FAIL: Shot ${shot.position} uses wrong-family archetype: ${shot.archetype.id}`);
        }
      }
      errors.push(...hasNoApparelWording(result));
      return errors;
    },
  },
];

// ── Runner ──

function printSeparator() {
  console.log("═".repeat(90));
}

function printSubSeparator() {
  console.log("─".repeat(90));
}

function run() {
  let passed = 0;
  let failed = 0;

  console.log("");
  printSeparator();
  console.log("  LOOKBOOK STUDIO — EVIDENCE-BASED SHOT SELECTION VALIDATION");
  console.log("  9 test cases across product categories");
  printSeparator();
  console.log("");

  for (const tc of TEST_CASES) {
    const result = generateLookbookPlan(tc.input);
    const errors = tc.assertions(result);
    const genOrderErrors = checkGenOrderNonRedundancy(result);
    errors.push(...genOrderErrors);

    const status = errors.length === 0 ? "PASS ✓" : "FAIL ✗";
    if (errors.length === 0) passed++;
    else failed++;

    // Header
    printSeparator();
    console.log(`  ${status}  ${tc.name}`);
    console.log(`  Input: ${tc.input.productFamily} > ${tc.input.specificItem || "(no item)"} | ${tc.input.targetStyle} | ${tc.input.campaignGoal} | logo=${tc.input.logoVisibilityPriority} | creativity=${tc.input.creativityLevel} | ${tc.input.shotCount} shots`);
    printSeparator();

    // Selected shots
    console.log("");
    console.log("  SELECTED SHOTS:");
    printSubSeparator();
    for (const shot of result.shots) {
      const ev = shot.evidenceProvided.length > 0 ? shot.evidenceProvided.join(", ") : "(none)";
      const badges = shot.badges.length > 0 ? `[${shot.badges.join(", ")}]` : "";
      console.log(`  #${shot.position}  ${shot.archetype.title}`);
      console.log(`       ID: ${shot.archetype.id}`);
      console.log(`       Category: ${shot.archetype.shotCategory} | Priority: ${shot.generationPriority} ${badges}`);
      console.log(`       Evidence: ${ev}`);
      console.log(`       Framing: ${shot.framingDelta}`);
      console.log(`       What it sells: ${shot.whatItSells}`);
      console.log(`       Risk: ${shot.riskSummary}`);
      console.log("");
    }

    // Generation order
    console.log("  GENERATION ORDER:");
    printSubSeparator();
    const genOrder = result.generationOrder.map((pos) => {
      const shot = result.shots[pos - 1];
      return `  ${pos}. ${shot.archetype.title} [${shot.archetype.shotCategory}]`;
    });
    console.log(genOrder.join("\n"));
    console.log("");

    // Evidence coverage
    console.log("  EVIDENCE COVERAGE:");
    printSubSeparator();
    const allEvidence = new Set<EvidenceType>();
    for (const shot of result.shots) {
      for (const ev of shot.evidenceProvided) allEvidence.add(ev);
    }
    console.log(`  All evidence provided: ${[...allEvidence].join(", ")}`);
    console.log("");

    // Coverage scores
    console.log("  COVERAGE SCORES:");
    printSubSeparator();
    console.log(`  Clarity: ${result.coverage.clarity}  |  Branding: ${result.coverage.branding}  |  Silhouette: ${result.coverage.silhouette}`);
    console.log(`  Editorial: ${result.coverage.editorial}  |  Detail: ${result.coverage.detail}  |  Motion: ${result.coverage.motion}`);
    if (Object.keys(result.coverage.evidenceCoverage).length > 0) {
      console.log(`  Evidence coverage map: ${Object.entries(result.coverage.evidenceCoverage).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    }
    console.log("");

    // Diagnostics
    console.log("  DIAGNOSTICS:");
    printSubSeparator();
    const diag = result.diagnostics;
    console.log(`  Required evidence covered: ${diag.requiredEvidenceCovered.length > 0 ? diag.requiredEvidenceCovered.join(", ") : "(none)"}`);
    console.log(`  Recommended evidence covered: ${diag.recommendedEvidenceCovered.length > 0 ? diag.recommendedEvidenceCovered.join(", ") : "(none)"}`);
    console.log(`  Uncovered evidence: ${diag.uncoveredEvidence.length > 0 ? diag.uncoveredEvidence.join(", ") : "(none — all covered)"}`);
    console.log("");

    // Role mix
    const targetEntries = Object.entries(diag.roleMixTarget).map(([k, v]) => `${k}=${v}`).join(", ");
    const actualEntries = Object.entries(diag.roleMixActual).map(([k, v]) => `${k}=${v}`).join(", ");
    console.log(`  Role mix target:  ${targetEntries}`);
    console.log(`  Role mix actual:  ${actualEntries}`);
    console.log("");

    // Redundancy warnings
    if (diag.redundancyWarnings.length > 0) {
      console.log("  REDUNDANCY WARNINGS:");
      printSubSeparator();
      for (const w of diag.redundancyWarnings) {
        console.log(`  [${w.severity.toUpperCase()}] ${w.message}`);
      }
      console.log("");
    }

    // Assertion results
    if (errors.length > 0) {
      console.log("  ASSERTION FAILURES:");
      printSubSeparator();
      for (const e of errors) {
        console.log(`  ✗ ${e}`);
      }
      console.log("");
    } else {
      console.log("  All assertions passed.");
      console.log("");
    }
  }

  // Summary
  printSeparator();
  console.log("");
  console.log(`  FINAL RESULTS: ${passed} PASSED, ${failed} FAILED out of ${TEST_CASES.length}`);
  console.log("");
  printSeparator();

  return failed;
}

const failCount = run();
process.exit(failCount > 0 ? 1 : 0);
