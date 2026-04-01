/**
 * V3.2.5: Framing authority invariant tests
 *
 * Section 8D: Strategy cannot contradict ShotIntent.
 * Section 8E: Single framing authority (renderShotIntent is the ONLY source).
 */

import { describe, it, expect } from "vitest";
import {
  resolveShotIntent,
  ROLE_STRATEGIES,
  resolveStrategy,
} from "../commercePromptCompiler";
import type { TemplateFamilyShot } from "../referenceLibrary.types";
import {
  rivieraFamily,
  silkShirtFamily,
  teeDressFamily,
  ALL_FAMILIES,
  compileFamilyPlan,
} from "./test-helpers";

// ── 8D: Strategy cannot contradict ShotIntent ──

describe("strategy cannot contradict ShotIntent", () => {
  const MACRO_CROP_PHRASES = ["Tight macro crop", "Close-up crop", "macro crop"];
  const FULL_BODY_PHRASES = ["full body", "Full body"];
  const FLAT_LAY_PHRASES = ["flat lay", "Flat lay"];

  it("flat_lay shots never contain macro/close-up language", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const intent = resolveShotIntent(
          family.shots[shot.position - 1] as TemplateFamilyShot,
        );
        if (intent.compositionType === "flat_lay") {
          for (const phrase of MACRO_CROP_PHRASES) {
            expect(shot.positivePrompt).not.toContain(phrase);
          }
        }
      }
    }
  });

  it("macro_crop shots never contain flat-lay language", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const intent = resolveShotIntent(
          family.shots[shot.position - 1] as TemplateFamilyShot,
        );
        if (intent.compositionType === "macro_crop") {
          for (const phrase of FLAT_LAY_PHRASES) {
            expect(shot.positivePrompt).not.toContain(phrase);
          }
        }
      }
    }
  });

  it("tight_crop shots never contain full-body language", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const intent = resolveShotIntent(
          family.shots[shot.position - 1] as TemplateFamilyShot,
        );
        if (intent.cropClass === "tight_crop") {
          for (const phrase of FULL_BODY_PHRASES) {
            expect(shot.positivePrompt).not.toContain(phrase);
          }
        }
      }
    }
  });

  it("back_view shots never contain front-facing language", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const intent = resolveShotIntent(
          family.shots[shot.position - 1] as TemplateFamilyShot,
        );
        if (intent.compositionType === "back_view") {
          expect(shot.positivePrompt).not.toContain("front-facing");
          expect(shot.positivePrompt).not.toContain("body facing front");
        }
      }
    }
  });

  it("no compiled prompt contains legacy framing fragments", () => {
    const LEGACY_FRAGMENTS = [
      "Close-up crop.",
      "Tight macro crop",
      "Do NOT show full body",
      "This is NOT a full-body shot",
      "while keeping the model visible",
    ];
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        for (const fragment of LEGACY_FRAGMENTS) {
          expect(shot.positivePrompt).not.toContain(fragment);
        }
      }
    }
  });
});

// ── 8E: Single framing authority ──

describe("single framing authority", () => {
  const LEGACY_FRAMING_PHRASES = [
    "close-up crop",
    "tight crop",
    "macro crop",
    "full body",
    "full-body",
    "close-up",
    "tight macro",
  ];

  it("no strategy string field contains legacy framing phrases", () => {
    // Check all exported role strategies
    for (const [, strategy] of Object.entries(ROLE_STRATEGIES)) {
      for (const [, value] of Object.entries(strategy)) {
        if (typeof value !== "string") continue;
        const lower = value.toLowerCase();
        for (const phrase of LEGACY_FRAMING_PHRASES) {
          expect(lower).not.toContain(phrase);
        }
      }
    }

    // Also check worn detail strategies via resolveStrategy
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

    for (const shot of [wornConstructionShot, wornMaterialShot]) {
      const strategy = resolveStrategy(shot);
      for (const [, value] of Object.entries(strategy)) {
        if (typeof value !== "string") continue;
        const lower = value.toLowerCase();
        for (const phrase of LEGACY_FRAMING_PHRASES) {
          expect(lower).not.toContain(phrase);
        }
      }
    }
  });

  it("each compiled prompt mentions composition type exactly once", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const matches = shot.positivePrompt.match(/Exact shot composition:/g);
        expect(matches?.length).toBe(1);
      }
    }
  });

  it("not_applicable shots have zero Exact pose: lines", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        if (meta.bodyDirection === "not_applicable") {
          const poseMatches = shot.positivePrompt.match(/Exact pose:/g);
          expect(poseMatches).toBeNull();
        }
      }
    }
  });

  it("flat_lay/macro_crop compiled prompts contain zero human pose directives", () => {
    const POSE_DIRECTIVES = ["body facing", "hands ", "head "];
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        if (
          meta.compositionType === "flat_lay" ||
          meta.compositionType === "macro_crop"
        ) {
          for (const directive of POSE_DIRECTIVES) {
            expect(shot.positivePrompt).not.toContain(directive);
          }
        }
      }
    }
  });

  it("body/worn shots with real bodyDirection have exactly one Exact pose: line", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        if (meta.bodyDirection !== "not_applicable") {
          const poseMatches = shot.positivePrompt.match(/Exact pose:/g);
          expect(poseMatches?.length).toBe(1);
        }
      }
    }
  });
});
