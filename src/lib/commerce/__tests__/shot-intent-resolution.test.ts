/**
 * V3.2.5: ShotIntent resolution tests
 *
 * Tests resolveShotIntent() directly: verifies that structured metadata
 * resolves to the correct canonical ShotIntent for each shot.
 */

import { describe, it, expect } from "vitest";
import { resolveShotIntent } from "../commercePromptCompiler";
import type { TemplateFamilyShot } from "../referenceLibrary.types";
import familiesJson from "../../../../public/commerce-refs/families.json";

// Load shipped families
const rivieraFamily = familiesJson.find((f) => f.id === "everlane-riviera-grey-f")!;
const silkShirtFamily = familiesJson.find((f) => f.id === "everlane-silk-shirt-grey-f")!;
const teeDressFamily = familiesJson.find((f) => f.id === "everlane-tee-dress-grey-f")!;

describe("resolveShotIntent", () => {
  // ── Riviera ──

  it("Riviera Shot 1 resolves to front-facing full body", () => {
    const intent = resolveShotIntent(rivieraFamily.shots[0] as TemplateFamilyShot);
    expect(intent.compositionType).toBe("front_facing");
    expect(intent.cropClass).toBe("full_body");
    expect(intent.garmentFocus).toBe("silhouette");
    expect(intent.bodyDirection).toBe("front");
    expect(intent.handPlacement).toBe("at_sides");
    expect(intent.headDirection).toBe("to_camera");
    expect(intent.backgroundAuthority).toBe("template");
  });

  it("Riviera Shot 2 resolves to three-quarter with hand in pocket", () => {
    const intent = resolveShotIntent(rivieraFamily.shots[1] as TemplateFamilyShot);
    expect(intent.compositionType).toBe("three_quarter");
    expect(intent.cropClass).toBe("full_body");
    expect(intent.bodyDirection).toBe("three_quarter_left");
    expect(intent.handPlacement).toBe("hand_in_pocket");
    expect(intent.backgroundAuthority).toBe("template");
  });

  it("Riviera Shot 3 resolves to back view", () => {
    const intent = resolveShotIntent(rivieraFamily.shots[2] as TemplateFamilyShot);
    expect(intent.compositionType).toBe("back_view");
    expect(intent.bodyDirection).toBe("back");
    expect(intent.headDirection).toBe("away_from_camera");
  });

  it("Riviera Shot 4 resolves to worn detail construction", () => {
    const intent = resolveShotIntent(rivieraFamily.shots[3] as TemplateFamilyShot);
    expect(intent.compositionType).toBe("three_quarter");
    expect(intent.cropClass).toBe("mid_body");
    expect(intent.garmentFocus).toBe("construction");
    expect(intent.backgroundAuthority).toBe("anchor");
  });

  it("Riviera Shot 5 resolves to worn detail material", () => {
    const intent = resolveShotIntent(rivieraFamily.shots[4] as TemplateFamilyShot);
    expect(intent.compositionType).toBe("back_view");
    expect(intent.cropClass).toBe("upper_body");
    expect(intent.garmentFocus).toBe("material");
    expect(intent.backgroundAuthority).toBe("anchor");
  });

  it("Riviera Shot 6 resolves to flat lay", () => {
    const intent = resolveShotIntent(rivieraFamily.shots[5] as TemplateFamilyShot);
    expect(intent.compositionType).toBe("flat_lay");
    expect(intent.cropClass).toBe("flat_full_product");
    expect(intent.bodyDirection).toBe("not_applicable");
    expect(intent.backgroundAuthority).toBe("none");
  });

  // ── Tee Dress ──

  it("Tee Dress Shot 4 resolves to flat-lay", () => {
    const intent = resolveShotIntent(teeDressFamily.shots[3] as TemplateFamilyShot);
    expect(intent.compositionType).toBe("flat_lay");
    expect(intent.cropClass).toBe("flat_full_product");
    expect(intent.backgroundAuthority).toBe("none");
  });

  it("Tee Dress Shot 5 resolves to macro crop", () => {
    const intent = resolveShotIntent(teeDressFamily.shots[4] as TemplateFamilyShot);
    expect(intent.compositionType).toBe("macro_crop");
    expect(intent.cropClass).toBe("tight_crop");
    expect(intent.backgroundAuthority).toBe("none");
  });

  // ── Silk Shirt ──

  it("Silk Shirt Shot 5 resolves to macro crop material", () => {
    const intent = resolveShotIntent(silkShirtFamily.shots[4] as TemplateFamilyShot);
    expect(intent.compositionType).toBe("macro_crop");
    expect(intent.garmentFocus).toBe("material");
    expect(intent.backgroundAuthority).toBe("none");
  });

  // ── Uniqueness ──

  it("no two Riviera shots share a visualIntentKey", () => {
    const keys = rivieraFamily.shots.map(
      (s) => resolveShotIntent(s as TemplateFamilyShot).visualIntentKey,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("no two Silk Shirt shots share a visualIntentKey", () => {
    const keys = silkShirtFamily.shots.map(
      (s) => resolveShotIntent(s as TemplateFamilyShot).visualIntentKey,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("no two Tee Dress shots share a visualIntentKey", () => {
    const keys = teeDressFamily.shots.map(
      (s) => resolveShotIntent(s as TemplateFamilyShot).visualIntentKey,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
