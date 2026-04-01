/**
 * Shared test helpers for commerce engine tests.
 */

import type {
  TemplateFamilyDefinition,
  TemplateFamilyShot,
  CatalogReferenceImage,
} from "../referenceLibrary.types";
import { compileCommercePlan } from "../commercePromptCompiler";
import type { CommerceGenerationPlan } from "../referenceLibrary.types";
import familiesJson from "../../../../public/commerce-refs/families.json";

// ── Shipped family data ──

export const rivieraFamily = familiesJson.find(
  (f) => f.id === "everlane-riviera-grey-f",
)! as unknown as TemplateFamilyDefinition;

export const silkShirtFamily = familiesJson.find(
  (f) => f.id === "everlane-silk-shirt-grey-f",
)! as unknown as TemplateFamilyDefinition;

export const teeDressFamily = familiesJson.find(
  (f) => f.id === "everlane-tee-dress-grey-f",
)! as unknown as TemplateFamilyDefinition;

export const ALL_FAMILIES = [rivieraFamily, silkShirtFamily, teeDressFamily];

// ── Generic product fingerprint (no forbidden elements) ──

export const GENERIC_FINGERPRINT = {
  specificItem: "test dress",
  material: "cotton",
  forbiddenElements: [],
};

// ── Catalog image stub ──

export function buildTestImage(
  id: string,
  overrides?: Partial<CatalogReferenceImage>,
): CatalogReferenceImage {
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
    ...overrides,
  };
}

// ── Build catalog images for a family ──

export function buildCatalogForFamily(
  family: TemplateFamilyDefinition,
): CatalogReferenceImage[] {
  return family.shots.map((shot) => {
    const overrides: Partial<CatalogReferenceImage> = {};

    // Set body direction based on shot metadata
    if (shot.bodyDirection === "back") {
      overrides.bodyDirection = "back";
    }
    if (shot.compositionType === "flat_lay") {
      overrides.poseClass = "flat_lay";
      overrides.bodyDirection = "not_applicable";
    }
    if (shot.compositionType === "macro_crop") {
      overrides.poseClass = "macro";
      overrides.bodyDirection = "not_applicable";
    }

    return buildTestImage(shot.referenceImageId, overrides);
  });
}

// ── Compile a plan for a family with default settings ──

export function compileFamilyPlan(
  family: TemplateFamilyDefinition,
): CommerceGenerationPlan {
  const images = buildCatalogForFamily(family);
  return compileCommercePlan({
    family,
    images,
    fingerprint: GENERIC_FINGERPRINT,
    hasModelRef: true,
    hasProductRef: true,
  });
}
