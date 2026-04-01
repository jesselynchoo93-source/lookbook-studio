/**
 * Regression tests: Pocketless satin slip dress + Riviera family
 *
 * Tests the exact failure case from V2 runtime testing:
 * - Green satin slip dress (no pockets, pull-on, unstructured) as product ref
 * - Riviera grey studio template (shots 2 and 4 imply pockets)
 *
 * These tests verify that V3 fixes prevent pocket hallucination,
 * template contamination, and wrong detail shots.
 */

import { describe, it, expect } from "vitest";
import {
  checkShotCompatibility,
  compileCommercePlan,
  ROLE_STRATEGIES,
  isIdentityBearingDetail,
  resolveStrategy,
  needsAnchorForConsistency,
} from "../commercePromptCompiler";
import { computeFamilyCompatibility } from "../compatibilityCheck";
import type {
  TemplateFamilyDefinition,
  TemplateFamilyShot,
  CatalogReferenceImage,
  GarmentFeatureToken,
} from "../referenceLibrary.types";
import { normalizeToFeatureToken } from "../referenceLibrary.types";
import {
  selectTemplateFamilies,
  type SelectionCriteria,
} from "../templateSelector";

// ── Default structured fields for test fixtures (V3.2.5) ──
// All test shot fixtures spread this in. Override individual fields as needed.
const DEFAULT_STRUCTURED_FIELDS = {
  compositionType: "front_facing" as const,
  cropClass: "full_body" as const,
  garmentFocus: "silhouette" as const,
  bodyDirection: "front" as const,
  handPlacement: "at_sides" as const,
  headDirection: "to_camera" as const,
};

// ── Test Fixtures ──

const POCKETLESS_FINGERPRINT = {
  specificItem: "satin slip dress",
  material: "satin",
  materialFinish: "smooth glossy",
  materialColour: "emerald green",
  primaryColour: "green",
  silhouette: "A-line",
  neckline: "V-neck",
  sleeveLength: "sleeveless",
  strapType: "spaghetti straps",
  fit: "bias-cut",
  closureType: "pull-on",
  constructionStyle: "unstructured",
  forbiddenElements: ["pockets", "pocket_flaps", "structured_waist_seam"],
};

const POCKETED_FINGERPRINT = {
  specificItem: "structured blazer dress",
  material: "wool blend",
  forbiddenElements: [], // This garment HAS pockets
};

const RIVIERA_SHOT_2: TemplateFamilyShot = {
  ...DEFAULT_STRUCTURED_FIELDS,
  position: 2,
  role: "three_quarter_seller",
  referenceImageId: "6b3e54ee9645eff4",
  thumbnailPath: "apparel/everlane-riviera-dress/shot-06.jpg",
  isAnchor: false,
  poseVariation: "standing relaxed, three-quarter left turn, hand in pocket",
  framingVariation: "full body",
  replacementSafety: "safe",
  sourceTier: "A",
  impliedGarmentFeatures: ["pockets"],
  compositionType: "three_quarter",
  bodyDirection: "three_quarter_left",
  handPlacement: "hand_in_pocket",
};

const RIVIERA_SHOT_4: TemplateFamilyShot = {
  ...DEFAULT_STRUCTURED_FIELDS,
  position: 4,
  role: "detail_construction",
  referenceImageId: "dee951d6b17c2893",
  thumbnailPath: "apparel/everlane-riviera-dress/shot-04.jpg",
  isAnchor: false,
  poseVariation: "three-quarter crop showing waist seam and pocket construction",
  framingVariation: "mid body crop",
  replacementSafety: "caution",
  sourceTier: "B",
  impliedGarmentFeatures: ["pockets", "structured_waist_seam"],
  detailPresentation: "worn_on_body",
  compositionType: "three_quarter",
  cropClass: "mid_body",
  garmentFocus: "construction",
  bodyDirection: "three_quarter_left",
  handPlacement: "not_applicable",
  headDirection: "not_applicable",
};

const NEUTRAL_SHOT: TemplateFamilyShot = {
  ...DEFAULT_STRUCTURED_FIELDS,
  position: 1,
  role: "front_seller",
  referenceImageId: "35e538d13dc79972",
  isAnchor: true,
  poseVariation: "standing neutral, arms at sides, direct to camera",
  framingVariation: "full body",
  replacementSafety: "safe",
  sourceTier: "A",
};

// Minimal Riviera-like family for plan compilation tests
function buildTestFamily(shots: TemplateFamilyShot[]): TemplateFamilyDefinition {
  return {
    id: "test-riviera",
    name: "Test Riviera",
    description: "Test family",
    backgroundFamily: "seamless_grey",
    lightingFamily: "soft_even",
    cameraLogic: {
      primaryLens: "85mm",
      aperture: "f/5.6",
      heightRange: "waist to shoulder",
      distanceConsistency: "consistent",
    },
    stylingStrictness: "identical",
    productFamilies: ["apparel"],
    genderPresentation: "womenswear",
    bestForProductTypes: ["dresses"],
    shots,
    anchorShotId: "35e538d13dc79972",
    coherenceScore: 5,
    approvalStatus: "approved",
    coverageQuality: "partial",
  };
}

// Minimal catalog image stub
function buildTestImage(id: string): CatalogReferenceImage {
  return {
    id,
    fileName: `${id}.jpg`,
    relativePath: `apparel/test/${id}.jpg`,
    sourceUrl: "",
    sourceBrand: "test",
    sourceType: "pdp",
    sourceTier: "A",
    shotRole: "front_seller",
    angle: "front",
    framing: "full body",
    cameraHeight: "waist",
    poseClass: "standing",
    bodyDirection: "front",
    handPlacement: "at sides",
    headDirection: "front",
    backgroundClass: "seamless_grey",
    lightingClass: "soft_even",
    productFamily: "apparel",
    genderPresentation: "womenswear",
    qualityScore: 5,
    approvalStatus: "approved",
    safetyScores: {
      productVisibilityScore: 5,
      backgroundNeutralityScore: 5,
      poseDeviationRisk: 1,
      stylingContaminationRisk: 1,
      garmentReplacementDifficulty: 1,
      faceSwapDifficulty: 1,
      fullIdentitySwapDifficulty: 1,
    },
  };
}

// ── Tests ──

describe("Pocketless satin slip dress regression", () => {
  describe("checkShotCompatibility", () => {
    it("detects pocket conflict on Riviera shot 2", () => {
      const result = checkShotCompatibility(RIVIERA_SHOT_2, POCKETLESS_FINGERPRINT);
      expect(result.compatible).toBe(false);
      expect(result.conflicts).toContain("pockets");
      expect(result.severity).toBe("skip");
    });

    it("detects pocket + structured_waist_seam conflict on Riviera shot 4", () => {
      const result = checkShotCompatibility(RIVIERA_SHOT_4, POCKETLESS_FINGERPRINT);
      expect(result.compatible).toBe(false);
      expect(result.conflicts).toContain("pockets");
      expect(result.conflicts).toContain("structured_waist_seam");
      expect(result.severity).toBe("skip");
    });

    it("returns compatible for neutral shot with no implied features", () => {
      const result = checkShotCompatibility(NEUTRAL_SHOT, POCKETLESS_FINGERPRINT);
      expect(result.compatible).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it("returns compatible for pocket shot with pocketed garment", () => {
      const result = checkShotCompatibility(RIVIERA_SHOT_2, POCKETED_FINGERPRINT);
      expect(result.compatible).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe("compileCommercePlan with incompatible shots", () => {
    const backShot: TemplateFamilyShot = {
      ...DEFAULT_STRUCTURED_FIELDS,
      position: 3,
      role: "back_fit_proof",
      referenceImageId: "90c1b020318af06c",
      isAnchor: false,
      poseVariation: "standing neutral, full back view",
      framingVariation: "full body",
      replacementSafety: "safe",
      sourceTier: "A",
      compositionType: "back_view",
      bodyDirection: "back",
      headDirection: "away_from_camera",
    };

    const family = buildTestFamily([NEUTRAL_SHOT, RIVIERA_SHOT_2, backShot, RIVIERA_SHOT_4]);

    const images = [
      buildTestImage("35e538d13dc79972"),
      buildTestImage("6b3e54ee9645eff4"),
      buildTestImage("90c1b020318af06c"),
      buildTestImage("dee951d6b17c2893"),
    ];

    it("skips shot 2 (three_quarter_seller with pockets)", () => {
      const plan = compileCommercePlan({
        family,
        images,
        fingerprint: POCKETLESS_FINGERPRINT,
        hasModelRef: true,
        hasProductRef: true,
      });

      const skipped = plan.skippedShots.find((s) => s.position === 2);
      expect(skipped).toBeDefined();
      expect(skipped!.role).toBe("three_quarter_seller");
    });

    it("drops shot 4 (detail_construction with pockets + caution safety)", () => {
      const plan = compileCommercePlan({
        family,
        images,
        fingerprint: POCKETLESS_FINGERPRINT,
        hasModelRef: true,
        hasProductRef: true,
      });

      const skipped = plan.skippedShots.find((s) => s.position === 4);
      expect(skipped).toBeDefined();
      expect(skipped!.role).toBe("detail_construction");
    });

    it("has fewer than original shot count", () => {
      const plan = compileCommercePlan({
        family,
        images,
        fingerprint: POCKETLESS_FINGERPRINT,
        hasModelRef: true,
        hasProductRef: true,
      });

      expect(plan.effectiveShotCount).toBeLessThan(family.shots.length);
      expect(plan.shots.length).toBe(plan.effectiveShotCount);
    });

    it("compiles all shots for a pocketed garment (no skips)", () => {
      const plan = compileCommercePlan({
        family,
        images,
        fingerprint: POCKETED_FINGERPRINT,
        hasModelRef: true,
        hasProductRef: true,
      });

      expect(plan.skippedShots).toHaveLength(0);
      expect(plan.effectiveShotCount).toBe(family.shots.length);
    });
  });

  describe("Role-specific strategies for detail shots", () => {
    it("detail_material strategy does not include model ref", () => {
      const strategy = ROLE_STRATEGIES.detail_material;
      expect(strategy.includeModelRef).toBe(false);
      expect(strategy.includeConsistencyTarget).toBe(false);
      expect(strategy.runDriftCheck).toBe(false);
    });

    it("detail_material strategy has additional instructions for material focus", () => {
      const strategy = ROLE_STRATEGIES.detail_material;
      expect(strategy.additionalInstructions).toBeDefined();
      expect(strategy.additionalInstructions).toContain("fabric");
    });

    it("body strategies include model ref and drift check", () => {
      expect(ROLE_STRATEGIES.front_seller.includeModelRef).toBe(true);
      expect(ROLE_STRATEGIES.front_seller.runDriftCheck).toBe(true);
      expect(ROLE_STRATEGIES.front_seller.maxDriftRetries).toBe(2);
    });
  });

  describe("Negative prompt includes absences + behavioral expansions", () => {
    it("compiled plan negative prompts contain forbidden elements", () => {
      const family = buildTestFamily([NEUTRAL_SHOT]);
      const images = [buildTestImage("35e538d13dc79972")];

      const plan = compileCommercePlan({
        family,
        images,
        fingerprint: POCKETLESS_FINGERPRINT,
        hasModelRef: false,
        hasProductRef: true,
      });

      const anchorShot = plan.shots[0];
      expect(anchorShot.negativePrompt).toContain("pockets");
      expect(anchorShot.negativePrompt).toContain("hand in pocket");
      expect(anchorShot.negativePrompt).toContain("pocket opening");
    });

    it("compiled plan positive prompt contains absence constraint block", () => {
      const family = buildTestFamily([NEUTRAL_SHOT]);
      const images = [buildTestImage("35e538d13dc79972")];

      const plan = compileCommercePlan({
        family,
        images,
        fingerprint: POCKETLESS_FINGERPRINT,
        hasModelRef: false,
        hasProductRef: true,
      });

      const anchorShot = plan.shots[0];
      expect(anchorShot.positivePrompt).toContain("GARMENT ABSENCE CONSTRAINTS");
      expect(anchorShot.positivePrompt).toContain("NO pockets");
    });
  });

  describe("Generation schedule", () => {
    it("separates core body and detail shots", () => {
      const materialShot: TemplateFamilyShot = {
        ...DEFAULT_STRUCTURED_FIELDS,
        position: 5,
        role: "detail_material",
        referenceImageId: "mat123",
        isAnchor: false,
        poseVariation: "flat lay",
        framingVariation: "flat lay",
        replacementSafety: "safe",
        sourceTier: "B",
        detailPresentation: "flat_or_macro",
        compositionType: "flat_lay",
        cropClass: "flat_full_product",
        garmentFocus: "material",
        bodyDirection: "not_applicable",
        handPlacement: "not_applicable",
        headDirection: "not_applicable",
      };

      const family = buildTestFamily([NEUTRAL_SHOT, RIVIERA_SHOT_2, materialShot]);
      const images = [
        buildTestImage("35e538d13dc79972"),
        buildTestImage("6b3e54ee9645eff4"),
        buildTestImage("mat123"),
      ];

      // Use pocketed garment so shot 2 is not skipped
      const plan = compileCommercePlan({
        family,
        images,
        fingerprint: POCKETED_FINGERPRINT,
        hasModelRef: true,
        hasProductRef: true,
      });

      expect(plan.generationSchedule.anchor).toBe(1);
      expect(plan.generationSchedule.coreBody).toContain(2);
      expect(plan.generationSchedule.detailTexture).toContain(5);
      expect(plan.generationSchedule.coreBody).not.toContain(5);
    });
  });
});

describe("Controlled vocabulary", () => {
  it("normalizes common extraction outputs to canonical tokens", () => {
    expect(normalizeToFeatureToken("pockets")).toBe("pockets");
    expect(normalizeToFeatureToken("pocket")).toBe("pockets");
    expect(normalizeToFeatureToken("Pocket Flaps")).toBe("pocket_flaps");
    expect(normalizeToFeatureToken("belt loops")).toBe("belt_loops");
    expect(normalizeToFeatureToken("structured waist seam")).toBe("structured_waist_seam");
  });

  it("returns null for unknown values", () => {
    expect(normalizeToFeatureToken("sequins")).toBeNull();
    expect(normalizeToFeatureToken("random feature")).toBeNull();
  });
});

describe("Template ranking with compatibility", () => {
  const rivieraFamily = buildTestFamily([
    NEUTRAL_SHOT,
    { ...RIVIERA_SHOT_2 }, // has impliedGarmentFeatures: ["pockets"]
  ]);
  rivieraFamily.id = "riviera";

  const cleanFamily = buildTestFamily([
    NEUTRAL_SHOT,
    { ...NEUTRAL_SHOT, position: 2, role: "back_fit_proof", isAnchor: false, compositionType: "back_view" as const, bodyDirection: "back" as const, headDirection: "away_from_camera" as const },
  ]);
  cleanFamily.id = "clean";

  const allFamilies = [rivieraFamily, cleanFamily];

  it("ranks clean family above pocket-implied family for pocketless garment", () => {
    const criteria: SelectionCriteria = {
      productFamily: "apparel",
      genderPresentation: "womenswear",
      fingerprint: POCKETLESS_FINGERPRINT,
    };

    const ranked = selectTemplateFamilies(criteria, allFamilies);
    const rivieraIdx = ranked.findIndex((f) => f.id === "riviera");
    const cleanIdx = ranked.findIndex((f) => f.id === "clean");

    // Both should be present (neither is totally incompatible)
    expect(cleanIdx).toBeGreaterThanOrEqual(0);
    if (rivieraIdx >= 0) {
      expect(cleanIdx).toBeLessThan(rivieraIdx);
    }
  });

  it("applies zero penalty for compatible family with pocketed garment", () => {
    const criteria: SelectionCriteria = {
      productFamily: "apparel",
      genderPresentation: "womenswear",
      fingerprint: POCKETED_FINGERPRINT,
    };

    const ranked = selectTemplateFamilies(criteria, allFamilies);
    // Both families should rank normally (no penalty)
    expect(ranked.length).toBe(2);
  });

  it("applies zero penalty when no fingerprint provided", () => {
    const criteria: SelectionCriteria = {
      productFamily: "apparel",
      genderPresentation: "womenswear",
    };

    const ranked = selectTemplateFamilies(criteria, allFamilies);
    expect(ranked.length).toBe(2);
  });
});

// ── V3.1: Worn-on-body detail shot identity ──

describe("Identity-bearing detail shots (worn on body)", () => {
  const wornDetailShot: TemplateFamilyShot = {
    ...DEFAULT_STRUCTURED_FIELDS,
    position: 5,
    role: "detail_construction",
    referenceImageId: "42e562d45cfedc75",
    isAnchor: false,
    poseVariation: "back upper body crop showing strap and neckline construction",
    framingVariation: "upper body crop",
    replacementSafety: "caution",
    sourceTier: "B",
    detailPresentation: "worn_on_body",
    compositionType: "back_view",
    cropClass: "upper_body",
    garmentFocus: "construction",
    bodyDirection: "back",
    handPlacement: "not_applicable",
    headDirection: "not_applicable",
  };

  const flatDetailShot: TemplateFamilyShot = {
    ...DEFAULT_STRUCTURED_FIELDS,
    position: 6,
    role: "detail_material",
    referenceImageId: "1a9ddead9340b292",
    isAnchor: false,
    poseVariation: "flat lay showing full garment silhouette and fabric",
    framingVariation: "full product flat lay",
    replacementSafety: "safe",
    sourceTier: "B",
    detailPresentation: "flat_or_macro",
    compositionType: "flat_lay",
    cropClass: "flat_full_product",
    garmentFocus: "material",
    bodyDirection: "not_applicable",
    handPlacement: "not_applicable",
    headDirection: "not_applicable",
  };

  const untaggedBodyShot: TemplateFamilyShot = {
    ...DEFAULT_STRUCTURED_FIELDS,
    position: 3,
    role: "detail_construction",
    referenceImageId: "b78802f54ec537fe",
    isAnchor: false,
    poseVariation: "face and shoulders close-up showing neckline and sleeve construction",
    framingVariation: "face and shoulders",
    replacementSafety: "caution",
    sourceTier: "B",
    // No detailPresentation tag: should fall back to text matching
    compositionType: "front_facing",
    cropClass: "upper_body",
    garmentFocus: "neckline",
    bodyDirection: "front",
    handPlacement: "not_applicable",
    headDirection: "not_applicable",
  };

  it("isIdentityBearingDetail returns true for worn_on_body tagged shot", () => {
    expect(isIdentityBearingDetail(wornDetailShot)).toBe(true);
  });

  it("isIdentityBearingDetail returns false for flat_or_macro tagged shot", () => {
    expect(isIdentityBearingDetail(flatDetailShot)).toBe(false);
  });

  it("isIdentityBearingDetail fallback detects body from text when untagged", () => {
    expect(isIdentityBearingDetail(untaggedBodyShot)).toBe(true);
  });

  it("worn_on_body detail shot gets model ref in compiled plan", () => {
    const family = buildTestFamily([NEUTRAL_SHOT, wornDetailShot]);
    const images = [
      buildTestImage("35e538d13dc79972"),
      buildTestImage("42e562d45cfedc75"),
    ];

    const plan = compileCommercePlan({
      family,
      images,
      fingerprint: POCKETED_FINGERPRINT,
      hasModelRef: true,
      hasProductRef: true,
    });

    const detailPrompt = plan.shots.find((s) => s.position === 5);
    expect(detailPrompt).toBeDefined();
    expect(detailPrompt!.roleStrategy.includeModelRef).toBe(true);
    expect(detailPrompt!.roleStrategy.includeConsistencyTarget).toBe(true);
  });

  it("flat_or_macro detail shot does NOT get model ref", () => {
    const family = buildTestFamily([NEUTRAL_SHOT, flatDetailShot]);
    const images = [
      buildTestImage("35e538d13dc79972"),
      buildTestImage("1a9ddead9340b292"),
    ];

    const plan = compileCommercePlan({
      family,
      images,
      fingerprint: POCKETED_FINGERPRINT,
      hasModelRef: true,
      hasProductRef: true,
    });

    const detailPrompt = plan.shots.find((s) => s.position === 6);
    expect(detailPrompt).toBeDefined();
    expect(detailPrompt!.roleStrategy.includeModelRef).toBe(false);
  });

  it("worn_on_body positive prompt includes model identity instruction", () => {
    const family = buildTestFamily([NEUTRAL_SHOT, wornDetailShot]);
    const images = [
      buildTestImage("35e538d13dc79972"),
      buildTestImage("42e562d45cfedc75"),
    ];

    const plan = compileCommercePlan({
      family,
      images,
      fingerprint: POCKETED_FINGERPRINT,
      hasModelRef: true,
      hasProductRef: true,
    });

    const detailPrompt = plan.shots.find((s) => s.position === 5);
    expect(detailPrompt!.modelInstruction).toBeDefined();
    expect(detailPrompt!.positivePrompt).toContain("model reference");
  });
});

// ── V3.1: Unknown compatibility status ──

describe("Compatibility status: unknown when no fingerprint", () => {
  const family = buildTestFamily([NEUTRAL_SHOT, RIVIERA_SHOT_2]);

  it("returns status unknown when fingerprint is undefined", () => {
    const result = computeFamilyCompatibility(family, undefined);
    expect(result.status).toBe("unknown");
    expect(result.skippedCount).toBe(0);
    expect(result.warnedCount).toBe(0);
    expect(result.effectiveShots).toBe(family.shots.length);
    expect(result.conflictSummary).toBeNull();
  });

  it("returns real compatible status when fingerprint is present and clean", () => {
    const result = computeFamilyCompatibility(family, POCKETED_FINGERPRINT);
    expect(result.status).toBe("compatible");
  });

  it("returns partial status when fingerprint has conflicts", () => {
    const result = computeFamilyCompatibility(family, POCKETLESS_FINGERPRINT);
    expect(result.status).toBe("partial");
    expect(result.skippedCount).toBeGreaterThan(0);
    expect(result.conflictSummary).toBeTruthy();
  });

  it("never returns compatible when fingerprint is absent", () => {
    const result = computeFamilyCompatibility(family);
    expect(result.status).not.toBe("compatible");
    expect(result.status).toBe("unknown");
  });

  it("unknown status includes empty conflictFeatures", () => {
    const result = computeFamilyCompatibility(family);
    expect(result.conflictFeatures).toEqual([]);
  });
});

// ── V3.2: Conflict features and new summary format ──

describe("V3.2: conflictFeatures and updated conflictSummary", () => {
  const family = buildTestFamily([NEUTRAL_SHOT, RIVIERA_SHOT_2]);

  it("partial result includes conflictFeatures array", () => {
    const result = computeFamilyCompatibility(family, POCKETLESS_FINGERPRINT);
    expect(result.status).toBe("partial");
    expect(result.conflictFeatures).toContain("pockets");
  });

  it("conflictSummary uses new format: N shots will be skipped because...", () => {
    const result = computeFamilyCompatibility(family, POCKETLESS_FINGERPRINT);
    expect(result.conflictSummary).toMatch(/\d+ shots? will be skipped because/);
    expect(result.conflictSummary).toContain("pockets");
  });

  it("compatible result has empty conflictFeatures", () => {
    const result = computeFamilyCompatibility(family, POCKETED_FINGERPRINT);
    expect(result.status).toBe("compatible");
    expect(result.conflictFeatures).toEqual([]);
    expect(result.conflictSummary).toBeNull();
  });
});

// ── V3.2: Worn detail coherence pipeline ──

describe("V3.2: Worn detail uses dedicated strategy (not spread override)", () => {
  const wornDetailConstruction: TemplateFamilyShot = {
    ...DEFAULT_STRUCTURED_FIELDS,
    position: 5,
    role: "detail_construction",
    referenceImageId: "42e562d45cfedc75",
    isAnchor: false,
    poseVariation: "back upper body crop",
    framingVariation: "upper body crop",
    replacementSafety: "caution",
    sourceTier: "B",
    detailPresentation: "worn_on_body",
    compositionType: "back_view",
    cropClass: "upper_body",
    garmentFocus: "construction",
    bodyDirection: "back",
    handPlacement: "not_applicable",
    headDirection: "not_applicable",
  };

  const wornDetailMaterial: TemplateFamilyShot = {
    ...DEFAULT_STRUCTURED_FIELDS,
    position: 6,
    role: "detail_material",
    referenceImageId: "mat456",
    isAnchor: false,
    poseVariation: "shoulder showing fabric texture",
    framingVariation: "upper body crop",
    replacementSafety: "safe",
    sourceTier: "B",
    detailPresentation: "worn_on_body",
    compositionType: "back_view",
    cropClass: "upper_body",
    garmentFocus: "material",
    bodyDirection: "back",
    handPlacement: "not_applicable",
    headDirection: "not_applicable",
  };

  const flatMacroShot: TemplateFamilyShot = {
    ...DEFAULT_STRUCTURED_FIELDS,
    position: 7,
    role: "detail_material",
    referenceImageId: "flat789",
    isAnchor: false,
    poseVariation: "flat lay",
    framingVariation: "flat lay",
    replacementSafety: "safe",
    sourceTier: "B",
    detailPresentation: "flat_or_macro",
    compositionType: "flat_lay",
    cropClass: "flat_full_product",
    garmentFocus: "material",
    bodyDirection: "not_applicable",
    handPlacement: "not_applicable",
    headDirection: "not_applicable",
  };

  it("worn detail_construction has maxDriftRetries: 2", () => {
    const strategy = resolveStrategy(wornDetailConstruction);
    expect(strategy.maxDriftRetries).toBe(2);
    expect(strategy.includeConsistencyTarget).toBe(true);
    expect(strategy.runDriftCheck).toBe(true);
    expect(strategy.includeModelRef).toBe(true);
  });

  it("worn detail_material has maxDriftRetries: 2", () => {
    const strategy = resolveStrategy(wornDetailMaterial);
    expect(strategy.maxDriftRetries).toBe(2);
    expect(strategy.includeConsistencyTarget).toBe(true);
    expect(strategy.runDriftCheck).toBe(true);
  });

  it("flat/macro detail uses base strategy (no drift check)", () => {
    const strategy = resolveStrategy(flatMacroShot);
    expect(strategy.runDriftCheck).toBe(false);
    expect(strategy.includeConsistencyTarget).toBe(false);
    expect(strategy.includeModelRef).toBe(false);
  });

  it("worn detail compiled prompt includes BACKGROUND COHERENCE block", () => {
    const family = buildTestFamily([NEUTRAL_SHOT, wornDetailConstruction]);
    const images = [
      buildTestImage("35e538d13dc79972"),
      buildTestImage("42e562d45cfedc75"),
    ];

    const plan = compileCommercePlan({
      family,
      images,
      fingerprint: POCKETED_FINGERPRINT,
      hasModelRef: true,
      hasProductRef: true,
    });

    const detailPrompt = plan.shots.find((s) => s.position === 5);
    expect(detailPrompt!.positivePrompt).toContain("BACKGROUND COHERENCE");
  });

  it("flat/macro detail compiled prompt does NOT include BACKGROUND COHERENCE block", () => {
    const family = buildTestFamily([NEUTRAL_SHOT, flatMacroShot]);
    const images = [
      buildTestImage("35e538d13dc79972"),
      buildTestImage("flat789"),
    ];

    const plan = compileCommercePlan({
      family,
      images,
      fingerprint: POCKETED_FINGERPRINT,
      hasModelRef: true,
      hasProductRef: true,
    });

    const detailPrompt = plan.shots.find((s) => s.position === 7);
    expect(detailPrompt!.positivePrompt).not.toContain("BACKGROUND COHERENCE");
  });
});

// ── V3.2: needsAnchorForConsistency helper ──

describe("V3.2: needsAnchorForConsistency", () => {
  it("returns true for body shots", () => {
    expect(needsAnchorForConsistency(NEUTRAL_SHOT)).toBe(true);
  });

  it("returns true for worn detail shots", () => {
    const wornShot: TemplateFamilyShot = {
      ...DEFAULT_STRUCTURED_FIELDS,
      position: 5,
      role: "detail_construction",
      referenceImageId: "x",
      isAnchor: false,
      poseVariation: "back upper body crop",
      framingVariation: "upper body crop",
      replacementSafety: "caution",
      sourceTier: "B",
      detailPresentation: "worn_on_body",
      compositionType: "back_view",
      cropClass: "upper_body",
      garmentFocus: "construction",
      bodyDirection: "back",
      handPlacement: "not_applicable",
      headDirection: "not_applicable",
    };
    expect(needsAnchorForConsistency(wornShot)).toBe(true);
  });

  it("returns false for flat/macro detail shots", () => {
    const flatShot: TemplateFamilyShot = {
      ...DEFAULT_STRUCTURED_FIELDS,
      position: 6,
      role: "detail_material",
      referenceImageId: "y",
      isAnchor: false,
      poseVariation: "flat lay",
      framingVariation: "flat lay",
      replacementSafety: "safe",
      sourceTier: "B",
      detailPresentation: "flat_or_macro",
      compositionType: "flat_lay",
      cropClass: "flat_full_product",
      garmentFocus: "material",
      bodyDirection: "not_applicable",
      handPlacement: "not_applicable",
      headDirection: "not_applicable",
    };
    expect(needsAnchorForConsistency(flatShot)).toBe(false);
  });
});

// ── V3.2: Canonical anchor fields on plan ──

describe("V3.2: anchorShotIndex and anchorImageKey on plan", () => {
  it("sets anchorShotIndex to the index of the anchor shot in plan.shots", () => {
    const family = buildTestFamily([NEUTRAL_SHOT, RIVIERA_SHOT_2]);
    const images = [
      buildTestImage("35e538d13dc79972"),
      buildTestImage("6b3e54ee9645eff4"),
    ];

    const plan = compileCommercePlan({
      family,
      images,
      fingerprint: POCKETED_FINGERPRINT,
      hasModelRef: true,
      hasProductRef: true,
    });

    expect(typeof plan.anchorShotIndex).toBe("number");
    expect(plan.shots[plan.anchorShotIndex].isAnchor).toBe(true);
  });

  it("sets anchorImageKey in shot-{position} format", () => {
    const family = buildTestFamily([NEUTRAL_SHOT]);
    const images = [buildTestImage("35e538d13dc79972")];

    const plan = compileCommercePlan({
      family,
      images,
      fingerprint: POCKETED_FINGERPRINT,
      hasModelRef: true,
      hasProductRef: true,
    });

    expect(plan.anchorImageKey).toBe(`shot-${NEUTRAL_SHOT.position}`);
  });

  it("anchor fields survive when shots are skipped", () => {
    const backShot: TemplateFamilyShot = {
      ...DEFAULT_STRUCTURED_FIELDS,
      position: 3,
      role: "back_fit_proof",
      referenceImageId: "90c1b020318af06c",
      isAnchor: false,
      poseVariation: "standing neutral, full back view",
      framingVariation: "full body",
      replacementSafety: "safe",
      sourceTier: "A",
      compositionType: "back_view",
      bodyDirection: "back",
      headDirection: "away_from_camera",
    };

    const family = buildTestFamily([NEUTRAL_SHOT, RIVIERA_SHOT_2, backShot]);
    const images = [
      buildTestImage("35e538d13dc79972"),
      buildTestImage("6b3e54ee9645eff4"),
      buildTestImage("90c1b020318af06c"),
    ];

    const plan = compileCommercePlan({
      family,
      images,
      fingerprint: POCKETLESS_FINGERPRINT,
      hasModelRef: true,
      hasProductRef: true,
    });

    // Shot 2 is skipped, but anchor (shot 1) should still be correctly indexed
    expect(plan.skippedShots.length).toBeGreaterThan(0);
    expect(plan.anchorShotIndex).toBeGreaterThanOrEqual(0);
    expect(plan.shots[plan.anchorShotIndex].isAnchor).toBe(true);
    expect(plan.anchorImageKey).toBe("shot-1");
  });
});
