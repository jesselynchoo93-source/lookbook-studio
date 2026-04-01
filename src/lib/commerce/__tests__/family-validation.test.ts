/**
 * V3.2.5: Family validation tests
 *
 * Tests validateFamilyShotIntents() with both valid and invalid families.
 */

import { describe, it, expect } from "vitest";
import {
  validateFamilyShotIntents,
  type FamilyValidationResult,
} from "../commercePromptCompiler";
import type {
  TemplateFamilyDefinition,
  TemplateFamilyShot,
} from "../referenceLibrary.types";
import {
  rivieraFamily,
  silkShirtFamily,
  teeDressFamily,
  buildCatalogForFamily,
  buildTestImage,
} from "./test-helpers";

// ── Helpers ──

const DEFAULT_BODY_SHOT: TemplateFamilyShot = {
  position: 1,
  role: "front_seller",
  referenceImageId: "test-img-1",
  isAnchor: true,
  poseVariation: "standing neutral",
  framingVariation: "full body",
  replacementSafety: "safe",
  sourceTier: "A",
  compositionType: "front_facing",
  cropClass: "full_body",
  garmentFocus: "silhouette",
  bodyDirection: "front",
  handPlacement: "at_sides",
  headDirection: "to_camera",
};

const DEFAULT_DETAIL_SHOT: TemplateFamilyShot = {
  position: 2,
  role: "detail_construction",
  referenceImageId: "test-img-2",
  isAnchor: false,
  poseVariation: "construction crop",
  framingVariation: "tight crop",
  replacementSafety: "caution",
  sourceTier: "B",
  detailPresentation: "worn_on_body",
  compositionType: "front_facing",
  cropClass: "upper_body",
  garmentFocus: "construction",
  bodyDirection: "front",
  handPlacement: "not_applicable",
  headDirection: "not_applicable",
};

function makeFamily(shots: TemplateFamilyShot[]): TemplateFamilyDefinition {
  return {
    id: "test-family",
    name: "Test Family",
    description: "Test",
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
    anchorShotId: shots[0]?.referenceImageId ?? "",
    coherenceScore: 5,
    approvalStatus: "approved",
    coverageQuality: "partial",
  };
}

function catalogFor(shots: TemplateFamilyShot[]) {
  return shots.map((s) => buildTestImage(s.referenceImageId));
}

// ── Tests ──

describe("family validation", () => {
  it("throws on family with duplicate visual intent", () => {
    const shot1Clone: TemplateFamilyShot = {
      ...DEFAULT_BODY_SHOT,
      position: 2,
      referenceImageId: "test-img-2",
      isAnchor: false,
    };
    const family = makeFamily([DEFAULT_BODY_SHOT, shot1Clone]);
    const catalog = catalogFor(family.shots);

    expect(() => validateFamilyShotIntents(family, catalog)).toThrow(
      /identical resolved visual intent/,
    );
  });

  it("throws on shot with missing required structured fields (garmentFocus undefined)", () => {
    const badShot = {
      ...DEFAULT_DETAIL_SHOT,
      garmentFocus: undefined,
    } as unknown as TemplateFamilyShot;
    const family = makeFamily([DEFAULT_BODY_SHOT, badShot]);
    const catalog = catalogFor(family.shots);

    expect(() => validateFamilyShotIntents(family, catalog)).toThrow(
      /missing required structured fields/,
    );
  });

  it("throws on shot with missing compositionType/cropClass/bodyDirection", () => {
    const legacyShot = {
      ...DEFAULT_BODY_SHOT,
      compositionType: undefined,
      cropClass: undefined,
      bodyDirection: undefined,
    } as unknown as TemplateFamilyShot;
    const family = makeFamily([legacyShot]);
    const catalog = catalogFor(family.shots);

    expect(() => validateFamilyShotIntents(family, catalog)).toThrow(
      /missing required structured fields/,
    );
  });

  it("throws on detail shot with garmentFocus 'silhouette'", () => {
    const badShot: TemplateFamilyShot = {
      ...DEFAULT_DETAIL_SHOT,
      garmentFocus: "silhouette",
    };
    const family = makeFamily([DEFAULT_BODY_SHOT, badShot]);
    const catalog = catalogFor(family.shots);

    expect(() => validateFamilyShotIntents(family, catalog)).toThrow(
      /detail shot must NOT use garmentFocus "silhouette"/,
    );
  });

  it("throws on non-detail body shot with garmentFocus other than silhouette", () => {
    const badShot: TemplateFamilyShot = {
      ...DEFAULT_BODY_SHOT,
      position: 2,
      referenceImageId: "test-img-2",
      isAnchor: false,
      garmentFocus: "construction",
    };
    const family = makeFamily([DEFAULT_BODY_SHOT, badShot]);
    const catalog = catalogFor(family.shots);

    expect(() => validateFamilyShotIntents(family, catalog)).toThrow(
      /non-detail body shot must use garmentFocus "silhouette"/,
    );
  });

  it("throws on tight_crop non-macro shot with garmentFocus 'silhouette'", () => {
    const badShot: TemplateFamilyShot = {
      ...DEFAULT_DETAIL_SHOT,
      compositionType: "front_facing",
      cropClass: "tight_crop",
      garmentFocus: "silhouette",
    };
    const family = makeFamily([DEFAULT_BODY_SHOT, badShot]);
    const catalog = catalogFor(family.shots);

    expect(() => validateFamilyShotIntents(family, catalog)).toThrow(
      /tight_crop.*must not use garmentFocus "silhouette"/,
    );
  });

  it("throws on flat_lay with non-flat_full_product cropClass", () => {
    const badShot: TemplateFamilyShot = {
      ...DEFAULT_DETAIL_SHOT,
      compositionType: "flat_lay",
      cropClass: "tight_crop",
      bodyDirection: "not_applicable",
      handPlacement: "not_applicable",
      headDirection: "not_applicable",
      detailPresentation: "flat_or_macro",
    };
    const family = makeFamily([DEFAULT_BODY_SHOT, badShot]);
    const catalog = catalogFor(family.shots);

    expect(() => validateFamilyShotIntents(family, catalog)).toThrow(
      /flat_lay composition should use cropClass "flat_full_product"/,
    );
  });

  it("throws on flat_lay with non-not_applicable body fields", () => {
    const badShot: TemplateFamilyShot = {
      ...DEFAULT_DETAIL_SHOT,
      compositionType: "flat_lay",
      cropClass: "flat_full_product",
      bodyDirection: "front",
      handPlacement: "at_sides",
      headDirection: "to_camera",
      detailPresentation: "flat_or_macro",
    };
    const family = makeFamily([DEFAULT_BODY_SHOT, badShot]);
    const catalog = catalogFor(family.shots);

    expect(() => validateFamilyShotIntents(family, catalog)).toThrow(
      /flat_lay\/macro_crop must have bodyDirection, handPlacement, headDirection all set to "not_applicable"/,
    );
  });

  it("throws on reference image not found in catalog", () => {
    const family = makeFamily([DEFAULT_BODY_SHOT]);
    const emptyCatalog: ReturnType<typeof catalogFor> = [];

    expect(() => validateFamilyShotIntents(family, emptyCatalog)).toThrow(
      /reference image.*not found in catalog/,
    );
  });

  // ── Shipped families pass ──

  it("all 3 current families pass validation without throwing", () => {
    for (const family of [rivieraFamily, silkShirtFamily, teeDressFamily]) {
      const catalog = buildCatalogForFamily(family);
      expect(() => validateFamilyShotIntents(family, catalog)).not.toThrow();
    }
  });

  it("all 3 shipped families produce zero warnings and zero errors", () => {
    for (const family of [rivieraFamily, silkShirtFamily, teeDressFamily]) {
      const catalog = buildCatalogForFamily(family);
      let result: FamilyValidationResult;
      expect(() => {
        result = validateFamilyShotIntents(family, catalog);
      }).not.toThrow();
      expect(result!.warnings).toHaveLength(0);
    }
  });
});
