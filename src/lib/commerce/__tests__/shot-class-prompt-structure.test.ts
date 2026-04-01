/**
 * V3.2.6: Shot-class prompt structure tests
 *
 * Validates that the shot-class generation path separation is correct:
 * - ShotClass resolution
 * - Body geometry lock presence/absence
 * - Template background lock (blocker tests)
 * - Contamination guard split
 * - Mutual exclusivity of class-specific blocks
 * - Contradiction tests (conflicting authority absent)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  resolveShotIntent,
  resolveShotClass,
  ROLE_STRATEGIES,
} from "../commercePromptCompiler";
import type { ShotIntent } from "../referenceLibrary.types";
import type { TemplateFamilyShot } from "../referenceLibrary.types";
import {
  rivieraFamily,
  silkShirtFamily,
  teeDressFamily,
  ALL_FAMILIES,
  compileFamilyPlan,
} from "./test-helpers";

// ── 6A: ShotClass resolution ──

describe("resolveShotClass", () => {
  it("body roles resolve to 'body'", () => {
    for (const role of ["front_seller", "three_quarter_seller", "back_fit_proof", "side_fit_proof"] as const) {
      const intent: ShotIntent = {
        role,
        compositionType: "front_facing",
        cropClass: "full_body",
        garmentFocus: "silhouette",
        bodyDirection: "front",
        handPlacement: "at_sides",
        headDirection: "to_camera",
        detailPresentation: undefined,
        backgroundAuthority: "template",
        visualIntentKey: "test",
      };
      expect(resolveShotClass(intent)).toBe("body");
    }
  });

  it("worn_on_body detail resolves to 'worn_detail'", () => {
    const intent: ShotIntent = {
      role: "detail_construction",
      compositionType: "back_view",
      cropClass: "upper_body",
      garmentFocus: "construction",
      bodyDirection: "back",
      handPlacement: "not_applicable",
      headDirection: "not_applicable",
      detailPresentation: "worn_on_body",
      backgroundAuthority: "anchor",
      visualIntentKey: "test",
    };
    expect(resolveShotClass(intent)).toBe("worn_detail");
  });

  it("flat_lay compositionType resolves to 'flat_lay'", () => {
    const intent: ShotIntent = {
      role: "detail_material",
      compositionType: "flat_lay",
      cropClass: "flat_full_product",
      garmentFocus: "material",
      bodyDirection: "not_applicable",
      handPlacement: "not_applicable",
      headDirection: "not_applicable",
      detailPresentation: "flat_or_macro",
      backgroundAuthority: "none",
      visualIntentKey: "test",
    };
    expect(resolveShotClass(intent)).toBe("flat_lay");
  });

  it("macro_crop compositionType resolves to 'macro'", () => {
    const intent: ShotIntent = {
      role: "detail_material",
      compositionType: "macro_crop",
      cropClass: "tight_crop",
      garmentFocus: "material",
      bodyDirection: "not_applicable",
      handPlacement: "not_applicable",
      headDirection: "not_applicable",
      detailPresentation: "flat_or_macro",
      backgroundAuthority: "none",
      visualIntentKey: "test",
    };
    expect(resolveShotClass(intent)).toBe("macro");
  });

  it("flat_or_macro detail with body compositionType resolves to 'flat_lay'", () => {
    const intent: ShotIntent = {
      role: "detail_construction",
      compositionType: "front_facing",
      cropClass: "tight_crop",
      garmentFocus: "construction",
      bodyDirection: "not_applicable",
      handPlacement: "not_applicable",
      headDirection: "not_applicable",
      detailPresentation: "flat_or_macro",
      backgroundAuthority: "none",
      visualIntentKey: "test",
    };
    expect(resolveShotClass(intent)).toBe("flat_lay");
  });
});

// ── 6B: Body geometry lock presence ──

describe("body geometry lock", () => {
  it("every compiled body shot contains BODY GEOMETRY LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        const shotClass = resolveShotClass(intent);
        if (shotClass === "body") {
          expect(shot.positivePrompt).toContain("BODY GEOMETRY LOCK");
          expect(shot.positivePrompt).toContain("Do not re-pose");
        }
      }
    }
  });

  it("no non-body shot contains BODY GEOMETRY LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        const shotClass = resolveShotClass(intent);
        if (shotClass !== "body") {
          expect(shot.positivePrompt).not.toContain("BODY GEOMETRY LOCK");
        }
      }
    }
  });
});

// ── 6C: Template background lock (blocker tests) ──

describe("template background lock", () => {
  it("every body shot contains TEMPLATE BACKGROUND LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).toContain("TEMPLATE BACKGROUND LOCK");
        }
      }
    }
  });

  it("every body shot contains 'Do not change anything from the given reference template background'", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).toContain("Do not change anything from the given reference template background");
        }
      }
    }
  });

  it("every body shot contains 'Do not darken the background'", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).toContain("Do not darken the background");
        }
      }
    }
  });

  it("every body shot contains 'Do not lighten the background'", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).toContain("Do not lighten the background");
        }
      }
    }
  });

  it("every body shot contains 'Do not warm or cool the background'", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).toContain("Do not warm or cool the background colour");
        }
      }
    }
  });

  it("every body shot contains 'Do not add gradient or falloff'", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).toContain("Do not add gradient or falloff not present in the template reference");
        }
      }
    }
  });

  it("every body shot contains 'Do not replace the background'", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).toContain("Do not replace the background with a new studio backdrop");
        }
      }
    }
  });

  it("no body shot uses soft background coherence wording ('coherent background', 'consistent background', 'similar background')", () => {
    const SOFT_PHRASES = ["coherent background", "consistent background", "similar background"];
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          for (const phrase of SOFT_PHRASES) {
            expect(shot.positivePrompt).not.toContain(phrase);
          }
        }
      }
    }
  });

  it("every worn_detail shot contains BACKGROUND COHERENCE", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "worn_detail") {
          expect(shot.positivePrompt).toContain("BACKGROUND COHERENCE");
        }
      }
    }
  });

  it("every worn_detail shot contains 'The family template background is the final authority for background appearance'", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "worn_detail") {
          expect(shot.positivePrompt).toContain("The family template background is the final authority for background appearance");
        }
      }
    }
  });

  it("every worn_detail shot contains 'Do not darken the background'", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "worn_detail") {
          expect(shot.positivePrompt).toContain("Do not darken the background");
        }
      }
    }
  });

  it("every flat_lay shot contains SURFACE LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "flat_lay") {
          expect(shot.positivePrompt).toContain("SURFACE LOCK");
        }
      }
    }
  });

  it("every macro shot contains SURFACE LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "macro") {
          expect(shot.positivePrompt).toContain("SURFACE LOCK");
        }
      }
    }
  });

  it("no body shot contains SURFACE LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).not.toContain("SURFACE LOCK");
        }
      }
    }
  });

  it("no flat_lay/macro shot contains TEMPLATE BACKGROUND LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        const sc = resolveShotClass(intent);
        if (sc === "flat_lay" || sc === "macro") {
          expect(shot.positivePrompt).not.toContain("TEMPLATE BACKGROUND LOCK");
        }
      }
    }
  });

  it("no flat_lay/macro shot contains BODY GEOMETRY LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        const sc = resolveShotClass(intent);
        if (sc === "flat_lay" || sc === "macro") {
          expect(shot.positivePrompt).not.toContain("BODY GEOMETRY LOCK");
        }
      }
    }
  });
});

// ── 6D: Contamination guard split ──

describe("contamination guards", () => {
  it("body shots with model ref contain all three guards", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).toContain("The model reference provides face, skin tone, hair, and body proportions ONLY");
          expect(shot.positivePrompt).toContain("Do not copy background, lighting direction, or lighting colour from the model reference");
          expect(shot.positivePrompt).toContain("Do not copy pose, body angle, or camera angle from the model reference");
        }
      }
    }
  });

  it("worn_detail shots with model ref contain garment + background guards, not pose", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "worn_detail") {
          expect(shot.positivePrompt).toContain("The model reference provides face, skin tone, hair, and body proportions ONLY");
          expect(shot.positivePrompt).toContain("Do not copy background, lighting direction, or lighting colour from the model reference");
          expect(shot.positivePrompt).not.toContain("Do not copy pose, body angle, or camera angle from the model reference");
        }
      }
    }
  });

  it("flat_lay shots contain FLAT_LAY_GARMENT_ISOLATION", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "flat_lay") {
          expect(shot.positivePrompt).toContain("FLAT LAY GARMENT ISOLATION");
        }
      }
    }
  });

  it("flat_lay/macro shots do not contain body/worn_detail contamination guards", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        const sc = resolveShotClass(intent);
        if (sc === "flat_lay" || sc === "macro") {
          expect(shot.positivePrompt).not.toContain("The model reference provides face, skin tone, hair, and body proportions ONLY");
          expect(shot.positivePrompt).not.toContain("Do not copy pose, body angle, or camera angle from the model reference");
        }
      }
    }
  });

  it("old ANTI_CONTAMINATION_BLOCK text is absent from all shots", () => {
    const OLD_TEXT = "All clothing comes from the product reference. All composition comes from the template reference.";
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        expect(shot.positivePrompt).not.toContain(OLD_TEXT);
      }
    }
  });
});

// ── 6E: Mutual exclusivity of class-specific blocks ──

describe("shot class mutual exclusivity", () => {
  it("body shots contain BODY GEOMETRY LOCK, not COMPOSITION FIDELITY or SURFACE LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).toContain("BODY GEOMETRY LOCK");
          expect(shot.positivePrompt).not.toContain("COMPOSITION FIDELITY");
          expect(shot.positivePrompt).not.toContain("SURFACE LOCK");
        }
      }
    }
  });

  it("worn_detail shots contain COMPOSITION FIDELITY, not BODY GEOMETRY LOCK or SURFACE LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "worn_detail") {
          expect(shot.positivePrompt).toContain("COMPOSITION FIDELITY");
          expect(shot.positivePrompt).not.toContain("BODY GEOMETRY LOCK");
          expect(shot.positivePrompt).not.toContain("SURFACE LOCK");
        }
      }
    }
  });

  it("flat_lay/macro shots contain SURFACE LOCK, not BODY GEOMETRY LOCK or COMPOSITION FIDELITY", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        const sc = resolveShotClass(intent);
        if (sc === "flat_lay" || sc === "macro") {
          expect(shot.positivePrompt).toContain("SURFACE LOCK");
          expect(shot.positivePrompt).not.toContain("BODY GEOMETRY LOCK");
          expect(shot.positivePrompt).not.toContain("COMPOSITION FIDELITY");
        }
      }
    }
  });

  it("every shot has exactly one of: TEMPLATE BACKGROUND LOCK, BACKGROUND COHERENCE, SURFACE LOCK", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        const sc = resolveShotClass(intent);

        const hasTBL = shot.positivePrompt.includes("TEMPLATE BACKGROUND LOCK");
        const hasBC = shot.positivePrompt.includes("BACKGROUND COHERENCE");
        const hasSL = shot.positivePrompt.includes("SURFACE LOCK");

        // Exactly one should be true
        const count = [hasTBL, hasBC, hasSL].filter(Boolean).length;
        expect(count).toBe(1);

        // Verify correct one per class
        if (sc === "body") expect(hasTBL).toBe(true);
        if (sc === "worn_detail") expect(hasBC).toBe(true);
        if (sc === "flat_lay" || sc === "macro") expect(hasSL).toBe(true);
      }
    }
  });
});

// ── 6F: Contradiction tests (conflicting authority absent) ──

describe("no conflicting authority in compiled prompts", () => {
  it("no body shot contains anchor-background authority language", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "body") {
          expect(shot.positivePrompt).not.toContain("anchor shot");
          expect(shot.positivePrompt).not.toContain("anchor background");
          expect(shot.positivePrompt).not.toContain("continuity reference only");
          expect(shot.positivePrompt).not.toContain("If the anchor background differs");
          expect(shot.positivePrompt).not.toContain("BACKGROUND COHERENCE");
          expect(shot.positivePrompt).not.toContain("match the template, not the anchor");
        }
      }
    }
  });

  it("no flat_lay/macro shot contains studio or anchor background language", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        const sc = resolveShotClass(intent);
        if (sc === "flat_lay" || sc === "macro") {
          expect(shot.positivePrompt).not.toContain("TEMPLATE BACKGROUND LOCK");
          expect(shot.positivePrompt).not.toContain("BACKGROUND COHERENCE");
          expect(shot.positivePrompt).not.toContain("BODY GEOMETRY LOCK");
          expect(shot.positivePrompt).not.toContain("anchor shot");
          expect(shot.positivePrompt).not.toContain("studio backdrop");
          expect(shot.positivePrompt).not.toContain("The family template background");
          expect(shot.positivePrompt).not.toContain("continuity reference only");
          expect(shot.positivePrompt).not.toContain("match the template, not the anchor");
        }
      }
    }
  });

  it("no worn_detail shot allows anchor to override template background", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "worn_detail") {
          expect(shot.positivePrompt).toContain("family template background is the final authority");
          expect(shot.positivePrompt).toContain("continuity reference only");
          expect(shot.positivePrompt).toContain("match the template, not the anchor");
          expect(shot.positivePrompt).not.toContain("TEMPLATE BACKGROUND LOCK");
        }
      }
    }
  });

  it("no prompt mixes exact background lock with soft coherence wording", () => {
    const SOFT_PHRASES = ["similar background", "coherent background", "consistent background"];
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        if (shot.positivePrompt.includes("TEMPLATE BACKGROUND LOCK")) {
          for (const phrase of SOFT_PHRASES) {
            expect(shot.positivePrompt).not.toContain(phrase);
          }
        }
      }
    }
  });

  it("Tee Dress Shot 4 flat-lay contains exact garment isolation language and no template-garment authority", () => {
    const plan = compileFamilyPlan(teeDressFamily);
    const shot4 = plan.shots.find((s) => s.position === 4)!;
    expect(shot4.positivePrompt).toContain("FLAT LAY GARMENT ISOLATION");
    expect(shot4.positivePrompt).toContain(
      "All garment colour, material, and texture must come from the product reference only",
    );
    expect(shot4.positivePrompt).not.toContain("template garment is");
    expect(shot4.positivePrompt).toContain(
      "Do not copy garment colour, material, or texture from the template/reference garment",
    );
  });

  it("Riviera Shot 1 body prompt contains complete template background lock (snapshot)", () => {
    const plan = compileFamilyPlan(rivieraFamily);
    const shot1 = plan.shots.find((s) => s.position === 1)!;
    expect(shot1.positivePrompt).toContain("Do not change anything from the given reference template background");
    expect(shot1.positivePrompt).toContain("Match the template background colour exactly");
    expect(shot1.positivePrompt).toContain("Match the template background brightness exactly");
    expect(shot1.positivePrompt).toContain("The background must remain visually identical to the template reference, not merely similar");
  });

  it("worn_detail compiled prompt contains all 3 precedence rules", () => {
    for (const family of ALL_FAMILIES) {
      const plan = compileFamilyPlan(family);
      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1];
        const intent = resolveShotIntent(meta);
        if (resolveShotClass(intent) === "worn_detail") {
          expect(shot.positivePrompt).toContain("family template background is the final authority");
          expect(shot.positivePrompt).toContain("continuity reference only");
          expect(shot.positivePrompt).toContain("match the template, not the anchor");
        }
      }
    }
  });
});

// ── 6G: Route-level anchor override regression ──
// The anchor must never be framed as overriding the template background.
// This test reads the route source to catch regressions at the string level.

describe("route-level anchor override regression", () => {
  let routeSource: string;

  beforeAll(async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routePath = path.resolve(
      __dirname,
      "../../../app/api/generate-commerce-shot/route.ts",
    );
    routeSource = fs.readFileSync(routePath, "utf-8");
  });

  it("route never says anchor overrides template background", () => {
    const bannedPhrases = [
      "anchor OVERRIDES",
      "anchor overrides the template",
      "overrides the template reference for",
      "This anchor OVERRIDES",
    ];
    for (const phrase of bannedPhrases) {
      expect(routeSource).not.toContain(phrase);
    }
  });

  it("route never grants anchor authority over background or lighting", () => {
    // The anchor annotation text should never claim authority over background.
    // Search for lines that mention "anchor" AND "authority" together,
    // which would indicate the anchor is being given scene authority.
    const lines = routeSource.split("\n");
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("anchor") && lower.includes("authority")) {
        // Only acceptable pattern: "anchor must not override" / "sole authority" referring to template
        expect(lower).not.toMatch(/anchor.*(?:is|as).*authority/);
      }
    }
  });

  it("body-shot template annotation frames template as base scene", () => {
    // The body-shot path must frame the template as "the base scene" not just a reference
    expect(routeSource).toContain("This image defines the base scene");
  });

  it("flat-lay template annotation frames template as surface, not pose reference", () => {
    expect(routeSource).toContain("This image defines the surface");
    // Flat-lay annotation must explicitly say it is NOT a pose reference
    const surfaceLine = routeSource
      .split("\n")
      .find((l) => l.includes("This image defines the surface"));
    expect(surfaceLine).toBeDefined();
    expect(surfaceLine!).toContain("NOT a pose");
    // Must not say "preserve pose" or "match pose" (positive pose instruction)
    expect(surfaceLine!.toLowerCase()).not.toMatch(/preserve.*pose|match.*pose/);
  });
});
