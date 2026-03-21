/**
 * Hard-fail validation runner for the evidence-based shot selection system.
 * Asserts correctness across 9 product categories. A case FAILS if ANY hard assertion is violated.
 *
 * Hard assertions (all cases):
 *   A. Shot count: plan must return exactly the requested number of shots
 *   B. Required evidence: all required evidence types must be covered by at least one shot
 *   C. Role mix minimums: each targeted category must have >= its minimum count
 *   D. Zero critical redundancies in the entire set
 *   E. First two generation-order shots do NOT share 3+ distinctive evidence
 *   F. No apparel-specific wording for non-apparel families
 *   G. Max 1 zero-evidence shot
 *   H. No semantically incompatible archetypes
 *
 * Run: npx tsx src/lib/lookbook/runValidation.ts
 */

import { generateLookbookPlan } from "./recommendShots";
import type {
  LookbookInput,
  EvidenceType,
  LookbookPlanResult,
  ShotCategory,
} from "./types";

// ── Assertion Helpers ──

function hasEvidence(result: LookbookPlanResult, ev: EvidenceType): boolean {
  return result.shots.some((s) => s.evidenceProvided.includes(ev));
}

function countCategory(result: LookbookPlanResult, cat: ShotCategory): number {
  return result.shots.filter((s) => s.archetype.shotCategory === cat).length;
}

function countDistinctCategories(result: LookbookPlanResult): number {
  return new Set(result.shots.map((s) => s.archetype.shotCategory)).size;
}

// ── Cross-Cutting Hard Assertions ──

function checkShotCount(result: LookbookPlanResult): string[] {
  const errors: string[] = [];
  const { shotCountRequested, shotCountActual } = result.diagnostics;
  if (shotCountActual < shotCountRequested) {
    errors.push(
      `Shot count: requested ${shotCountRequested}, got ${shotCountActual}. ` +
      `The planner failed to fill all slots.`
    );
  }
  return errors;
}

function checkRequiredEvidence(result: LookbookPlanResult): string[] {
  const errors: string[] = [];
  for (const ev of result.diagnostics.uncoveredRequired) {
    errors.push(`Uncovered REQUIRED evidence: ${ev}`);
  }
  return errors;
}

function checkRoleMixMinimums(result: LookbookPlanResult): string[] {
  const errors: string[] = [];
  const target = result.diagnostics.roleMixTarget;
  const actual = result.diagnostics.roleMixActual;

  for (const [cat, min] of Object.entries(target)) {
    const targetMin = min as number;
    if (targetMin < 1) continue;
    const actualCount = (actual as Record<string, number>)[cat] || 0;
    if (actualCount < targetMin) {
      errors.push(`Role mix: ${cat} target=${targetMin}, actual=${actualCount}`);
    }
  }
  return errors;
}

function checkCriticalRedundancyCap(result: LookbookPlanResult): string[] {
  const errors: string[] = [];
  const criticals = result.diagnostics.redundancyWarnings.filter(
    (w) => w.severity === "critical"
  );
  if (criticals.length > 0) {
    errors.push(
      `Critical redundancy: ${criticals.length} (must be 0). ` +
      criticals.map((c) => `Shots ${c.shotA}&${c.shotB}: ${c.sharedEvidence.join(", ")}`).join("; ")
    );
  }
  return errors;
}

// Ambient evidence excluded from gen-order redundancy check
const AMBIENT_EVIDENCE: Set<EvidenceType> = new Set([
  "body_scale", "face_scale", "fit_on_body", "full_silhouette", "scale_reference",
]);

function checkGenOrderNonRedundancy(result: LookbookPlanResult): string[] {
  const errors: string[] = [];
  if (result.generationOrder.length < 2) return errors;
  const first = result.generationOrder[0] - 1;
  const second = result.generationOrder[1] - 1;
  const shotA = result.shots[first];
  const shotB = result.shots[second];
  if (!shotA || !shotB) return errors;
  const shared = shotA.evidenceProvided.filter((e) =>
    shotB.evidenceProvided.includes(e)
  );
  const distinctiveShared = shared.filter((e) => !AMBIENT_EVIDENCE.has(e));
  if (distinctiveShared.length >= 3) {
    errors.push(
      `Gen-order redundancy: first two shots (${shotA.archetype.title}, ${shotB.archetype.title}) ` +
      `share ${distinctiveShared.length} distinctive evidence: ${distinctiveShared.join(", ")}`
    );
  }
  return errors;
}

function checkNoApparelWording(result: LookbookPlanResult, family: string): string[] {
  if (family === "apparel" || family === "full_look") return [];
  const errors: string[] = [];
  const badPhrases = ["garment", "fabric drape"];
  for (const shot of result.shots) {
    for (const phrase of badPhrases) {
      if (shot.whatItSells.toLowerCase().includes(phrase)) {
        errors.push(
          `Family copy: shot ${shot.position} "${shot.archetype.title}" ` +
          `whatItSells contains "${phrase}" (family: ${family})`
        );
      }
    }
  }
  return errors;
}

function checkNoZeroEvidenceShots(result: LookbookPlanResult): string[] {
  const errors: string[] = [];
  const zeroEvidenceShots = result.shots.filter((s) => s.evidenceProvided.length === 0);
  if (zeroEvidenceShots.length > 1) {
    for (const shot of zeroEvidenceShots) {
      errors.push(
        `Zero-evidence shot: #${shot.position} "${shot.archetype.title}" ` +
        `(${zeroEvidenceShots.length} total, max 1)`
      );
    }
  }
  return errors;
}

function checkNoIncompatibleArchetypes(
  result: LookbookPlanResult,
  family: string,
): string[] {
  const errors: string[] = [];

  for (const shot of result.shots) {
    const id = shot.archetype.id;

    // Jewelry-specific archetypes must not appear for non-jewelry families
    if (
      ["profile_jewelry_focus", "mood_portrait_jewelry", "jewelry_neckline_focus",
       "ear_detail_crop", "three_quarter_ear_reveal", "pair_symmetry_validation"].includes(id)
    ) {
      if (family !== "jewelry") {
        errors.push(`Incompatible: ${id} selected for ${family} (jewelry-only)`);
      }
    }

    // Bag-specific archetypes must not appear for non-bag families
    if (["bag_carry_profile", "bag_hardware_detail", "bag_construction_detail"].includes(id)) {
      if (family !== "bags") {
        errors.push(`Incompatible: ${id} selected for ${family} (bags-only)`);
      }
    }

    // Footwear-specific archetypes must not appear for non-footwear families
    if (["footwear_ground_focus", "footwear_material_detail"].includes(id)) {
      if (family !== "footwear") {
        errors.push(`Incompatible: ${id} selected for ${family} (footwear-only)`);
      }
    }

    // Eyewear-specific archetypes must not appear for non-eyewear families
    if (["eyewear_portrait_halfbody", "eyewear_temple_detail"].includes(id)) {
      if (family !== "eyewear") {
        errors.push(`Incompatible: ${id} selected for ${family} (eyewear-only)`);
      }
    }

    // Watch-specific archetypes must not appear for non-watch families
    if (["watch_dial_closeup", "watch_wrist_hero", "watch_strap_detail"].includes(id)) {
      if (family !== "watches") {
        errors.push(`Incompatible: ${id} selected for ${family} (watches-only)`);
      }
    }

    // Apparel tailoring archetypes must not appear for non-apparel families
    if (["tailoring_lapel_touch", "cuff_adjustment_tailoring", "open_jacket_ease", "back_view_shape"].includes(id)) {
      if (family !== "apparel") {
        errors.push(`Incompatible: ${id} selected for ${family} (apparel-only)`);
      }
    }

    // Hand interaction only for jewelry/watches/small_accessories
    if (id === "accessory_hand_interaction") {
      if (!["jewelry", "watches", "small_accessories"].includes(family)) {
        errors.push(`Incompatible: ${id} selected for ${family}`);
      }
    }
  }
  return errors;
}

// ── Test Cases ──

interface TestCase {
  name: string;
  input: LookbookInput;
  /** Case-specific assertions on top of the cross-cutting ones */
  caseAssertions: (result: LookbookPlanResult) => string[];
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
    caseAssertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "carry_method")) errors.push("Missing carry_method");
      if (!hasEvidence(result, "full_silhouette")) errors.push("Missing full_silhouette");
      if (!hasEvidence(result, "hardware_detail")) errors.push("Missing hardware_detail");
      if (countCategory(result, "product_focus") < 1) errors.push("Need >= 1 product_focus");
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
    caseAssertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "interior_capacity")) errors.push("Missing interior_capacity (tote)");
      if (!hasEvidence(result, "carry_method")) errors.push("Missing carry_method");
      if (countCategory(result, "detail") < 1) errors.push("Need >= 1 detail");
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
    caseAssertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "ear_visibility")) errors.push("Missing ear_visibility");
      if (!hasEvidence(result, "pair_symmetry")) errors.push("Missing pair_symmetry");
      const fullBody = result.shots.filter((s) =>
        s.archetype.defaultFraming.toLowerCase().includes("full body")
      ).length;
      if (fullBody > 2) errors.push(`Too many full-body shots (${fullBody}), max 2`);
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
    caseAssertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "face_framing")) errors.push("Missing face_framing");
      if (!hasEvidence(result, "side_profile")) errors.push("Missing side_profile");
      // Eyewear should use eyewear-specific detail, not generic logo crop
      const hasEyewearDetail = result.shots.some(
        (s) => s.archetype.id === "eyewear_temple_detail"
      );
      if (!hasEyewearDetail) errors.push("Missing eyewear_temple_detail (should prefer over generic detail)");
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
    caseAssertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "construction_quality")) errors.push("Missing construction_quality");
      if (!hasEvidence(result, "full_silhouette")) errors.push("Missing full_silhouette");
      if (!hasEvidence(result, "logo_placement")) errors.push("Missing logo_placement");
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
    caseAssertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "on_foot_presence")) errors.push("Missing on_foot_presence");
      if (!hasEvidence(result, "sole_profile")) errors.push("Missing sole_profile");
      if (countCategory(result, "motion") < 1) errors.push("Need >= 1 motion");
      // Footwear should use footwear-specific detail
      const hasFootwearDetail = result.shots.some(
        (s) => s.archetype.id === "footwear_material_detail"
      );
      if (!hasFootwearDetail) errors.push("Missing footwear_material_detail (should prefer over generic detail)");
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
    caseAssertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "wrist_visibility")) errors.push("Missing wrist_visibility");
      if (!hasEvidence(result, "hardware_detail")) errors.push("Missing hardware_detail");
      const detailOrFocus = countCategory(result, "detail") + countCategory(result, "product_focus");
      if (detailOrFocus < 2) errors.push(`Need 2+ detail/product_focus, got ${detailOrFocus}`);
      // Watches should use watch-specific hero
      const hasWatchHero = result.shots.some(
        (s) => s.archetype.id === "watch_wrist_hero"
      );
      if (!hasWatchHero) errors.push("Missing watch_wrist_hero (should prefer over generic hero_full_body_seller)");
      // Watches should use watch-specific dial detail
      const hasWatchDetail = result.shots.some(
        (s) => s.archetype.id === "watch_dial_closeup"
      );
      if (!hasWatchDetail) errors.push("Missing watch_dial_closeup");
      // Watches should use strap/closure detail
      const hasStrapDetail = result.shots.some(
        (s) => s.archetype.id === "watch_strap_detail"
      );
      if (!hasStrapDetail) errors.push("Missing watch_strap_detail (needed for closure_mechanism)");
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
    caseAssertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "full_silhouette")) errors.push("Missing full_silhouette");
      if (!hasEvidence(result, "fit_on_body")) errors.push("Missing fit_on_body");
      if (!hasEvidence(result, "styling_context")) errors.push("Missing styling_context");
      if (countDistinctCategories(result) < 3)
        errors.push(`Need 3+ categories, got ${countDistinctCategories(result)}`);
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
    caseAssertions: (result) => {
      const errors: string[] = [];
      if (!hasEvidence(result, "fabric_drape")) errors.push("Missing fabric_drape");
      if (!hasEvidence(result, "texture_detail")) errors.push("Missing texture_detail");
      return errors;
    },
  },
];

// ── Runner ──

function sep() {
  return "=".repeat(90);
}
function subsep() {
  return "-".repeat(90);
}

interface CaseResult {
  name: string;
  passed: boolean;
  errors: string[];
  criticalRedundancies: number;
  uncoveredRequired: string[];
  uncoveredRecommended: string[];
  roleMixViolations: string[];
  result: LookbookPlanResult;
}

function runCase(tc: TestCase): CaseResult {
  const result = generateLookbookPlan(tc.input);
  const family = tc.input.productFamily;
  const allErrors: string[] = [];

  // Cross-cutting hard assertions (order matters for readability)
  allErrors.push(...checkShotCount(result));
  allErrors.push(...checkRequiredEvidence(result));
  allErrors.push(...checkRoleMixMinimums(result));
  allErrors.push(...checkCriticalRedundancyCap(result));
  allErrors.push(...checkGenOrderNonRedundancy(result));
  allErrors.push(...checkNoApparelWording(result, family));
  allErrors.push(...checkNoZeroEvidenceShots(result));
  allErrors.push(...checkNoIncompatibleArchetypes(result, family));

  // Case-specific assertions
  allErrors.push(...tc.caseAssertions(result));

  const criticals = result.diagnostics.redundancyWarnings.filter(
    (w) => w.severity === "critical"
  ).length;

  return {
    name: tc.name,
    passed: allErrors.length === 0,
    errors: allErrors,
    criticalRedundancies: criticals,
    uncoveredRequired: result.diagnostics.uncoveredRequired,
    uncoveredRecommended: result.diagnostics.uncoveredRecommended,
    roleMixViolations: checkRoleMixMinimums(result),
    result,
  };
}

function printCaseResult(cr: CaseResult) {
  const status = cr.passed ? "PASS" : "FAIL";
  const result = cr.result;
  const input = result.input;
  const diag = result.diagnostics;

  console.log(sep());
  console.log(`  ${status}  ${cr.name}`);
  console.log(
    `  Input: ${input.productFamily} > ${input.specificItem || "(no item)"} | ` +
    `${input.targetStyle} | ${input.campaignGoal} | logo=${input.logoVisibilityPriority} | ` +
    `creativity=${input.creativityLevel} | ${input.shotCount} shots`
  );
  console.log(sep());

  // Shot count
  console.log("");
  console.log(`  SHOTS: ${diag.shotCountActual}/${diag.shotCountRequested} requested`);
  console.log(subsep());
  for (const shot of result.shots) {
    const ev = shot.evidenceProvided.length > 0 ? shot.evidenceProvided.join(", ") : "(none)";
    const badges = shot.badges.length > 0 ? ` [${shot.badges.join(", ")}]` : "";
    console.log(`  #${shot.position}  ${shot.archetype.title} (${shot.archetype.id})`);
    console.log(`       Category: ${shot.archetype.shotCategory} | Priority: ${shot.generationPriority}${badges}`);
    console.log(`       Evidence: ${ev}`);
    console.log(`       What it sells: ${shot.whatItSells}`);
    console.log("");
  }

  // Generation order
  console.log("  GENERATION ORDER:");
  console.log(subsep());
  const genOrder = result.generationOrder.map((pos) => {
    const shot = result.shots[pos - 1];
    return `  ${pos}. ${shot.archetype.title} [${shot.archetype.shotCategory}]`;
  });
  console.log(genOrder.join("\n"));
  console.log("");

  // Evidence coverage by priority
  console.log("  EVIDENCE COVERAGE:");
  console.log(subsep());
  console.log(`  Required covered:     ${diag.requiredEvidenceCovered.join(", ") || "(none)"}`);
  console.log(`  Required UNCOVERED:   ${diag.uncoveredRequired.join(", ") || "(none)"}`);
  console.log(`  Recommended covered:  ${diag.recommendedEvidenceCovered.join(", ") || "(none)"}`);
  console.log(`  Recommended uncovered: ${diag.uncoveredRecommended.join(", ") || "(none)"}`);
  console.log(`  Optional uncovered:   ${diag.uncoveredOptional.join(", ") || "(none)"}`);
  console.log("");

  // Role mix
  const targetStr = Object.entries(diag.roleMixTarget).map(([k, v]) => `${k}=${v}`).join(", ");
  const actualStr = Object.entries(diag.roleMixActual).map(([k, v]) => `${k}=${v}`).join(", ");
  console.log(`  Role mix target:  ${targetStr}`);
  console.log(`  Role mix actual:  ${actualStr}`);
  console.log("");

  // Redundancy warnings (non-info)
  const warnings = diag.redundancyWarnings.filter((w) => w.severity !== "info");
  if (warnings.length > 0) {
    console.log("  REDUNDANCY WARNINGS:");
    console.log(subsep());
    for (const w of warnings) {
      console.log(`  [${w.severity.toUpperCase()}] ${w.message}`);
    }
    console.log("");
  }

  // Hard assertion results
  if (cr.errors.length > 0) {
    console.log("  HARD ASSERTION FAILURES:");
    console.log(subsep());
    for (const e of cr.errors) {
      console.log(`  X ${e}`);
    }
    console.log("");
  } else {
    console.log("  All hard assertions passed.");
    console.log("");
  }
}

function run() {
  console.log("");
  console.log(sep());
  console.log("  LOOKBOOK STUDIO -- HARD-FAIL VALIDATION HARNESS v2");
  console.log("  9 cases | shot count + required evidence + role mix + compatibility");
  console.log(sep());
  console.log("");

  const results: CaseResult[] = [];
  for (const tc of TEST_CASES) {
    const cr = runCase(tc);
    results.push(cr);
    printCaseResult(cr);
  }

  // ── Summary ──
  console.log(sep());
  console.log("  SUMMARY");
  console.log(sep());
  console.log("");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const cr of results) {
    const icon = cr.passed ? "PASS" : "FAIL";
    const errorCount = cr.errors.length;

    if (cr.passed) {
      const recMsg = cr.uncoveredRecommended.length > 0
        ? ` (recommended uncovered: ${cr.uncoveredRecommended.join(", ")})`
        : "";
      console.log(`  ${icon}  ${cr.name}${recMsg}`);
    } else {
      console.log(`  ${icon}  ${cr.name} (${errorCount} failures)`);
      for (const e of cr.errors) {
        console.log(`         - ${e}`);
      }
    }
  }

  console.log("");
  console.log(subsep());
  console.log(`  FINAL: ${passed} PASSED, ${failed} FAILED out of ${TEST_CASES.length}`);

  const totalCriticals = results.reduce((sum, r) => sum + r.criticalRedundancies, 0);
  const totalUncoveredReq = results.reduce((sum, r) => sum + r.uncoveredRequired.length, 0);
  const totalUncoveredRec = results.reduce((sum, r) => sum + r.uncoveredRecommended.length, 0);
  const totalRoleMix = results.reduce((sum, r) => sum + r.roleMixViolations.length, 0);
  console.log(
    `  Totals: ${totalCriticals} critical redundancies | ` +
    `${totalUncoveredReq} uncovered required | ` +
    `${totalUncoveredRec} uncovered recommended | ` +
    `${totalRoleMix} role mix violations`
  );
  console.log(subsep());
  console.log("");

  return failed;
}

const failCount = run();
process.exit(failCount > 0 ? 1 : 0);
