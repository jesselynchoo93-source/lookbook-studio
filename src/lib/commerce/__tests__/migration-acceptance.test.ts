/**
 * V3.2.5: Migration acceptance tests (Section 8G)
 *
 * Enforces that the migration is complete: all shipped families have
 * structured fields, and no strategy uses the old framingOverride.
 */

import { describe, it, expect } from "vitest";
import {
  ROLE_STRATEGIES,
  resolveStrategy,
} from "../commercePromptCompiler";
import type { TemplateFamilyShot } from "../referenceLibrary.types";
import {
  rivieraFamily,
  silkShirtFamily,
  teeDressFamily,
  ALL_FAMILIES,
} from "./test-helpers";

describe("migration acceptance", () => {
  it("all shipped families have zero inferred fields", () => {
    for (const family of ALL_FAMILIES) {
      for (const shot of family.shots) {
        expect(shot.compositionType).toBeDefined();
        expect(shot.cropClass).toBeDefined();
        expect(shot.garmentFocus).toBeDefined();
        expect(shot.bodyDirection).toBeDefined();
        expect(shot.handPlacement).toBeDefined();
        expect(shot.headDirection).toBeDefined();
      }
    }
  });

  it("no ROLE_STRATEGIES object contains framingOverride", () => {
    for (const [, strategy] of Object.entries(ROLE_STRATEGIES)) {
      expect(strategy).not.toHaveProperty("framingOverride");
    }
  });

  it("worn detail strategies (via resolveStrategy) have no framingOverride", () => {
    const wornConstructionShot: TemplateFamilyShot = {
      position: 1,
      role: "detail_construction",
      referenceImageId: "x",
      isAnchor: false,
      poseVariation: "",
      framingVariation: "",
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
    const wornMaterialShot: TemplateFamilyShot = {
      ...wornConstructionShot,
      role: "detail_material",
      garmentFocus: "material",
    };

    expect(resolveStrategy(wornConstructionShot)).not.toHaveProperty("framingOverride");
    expect(resolveStrategy(wornMaterialShot)).not.toHaveProperty("framingOverride");
  });

  it("all shipped family shots have correct garmentFocus convention", () => {
    const DETAIL_ROLES = ["detail_construction", "detail_material"];

    for (const family of ALL_FAMILIES) {
      for (const shot of family.shots) {
        if (!DETAIL_ROLES.includes(shot.role)) {
          // Non-detail body shots must use "silhouette"
          expect(shot.garmentFocus).toBe("silhouette");
        } else {
          // Detail shots must NOT use "silhouette"
          expect(shot.garmentFocus).not.toBe("silhouette");
        }
      }
    }
  });
});
