/**
 * V3.2.5: Compiled prompt snapshot tests
 *
 * Verifies that compiled prompts contain the correct ShotIntent-derived
 * composition, pose, and focus text for specific shots.
 */

import { describe, it, expect } from "vitest";
import {
  rivieraFamily,
  silkShirtFamily,
  teeDressFamily,
  compileFamilyPlan,
} from "./test-helpers";

describe("compiled prompt snapshots", () => {
  // ── Riviera ──

  it("Riviera Shot 1 prompt contains front-facing composition", () => {
    const plan = compileFamilyPlan(rivieraFamily);
    const shot1 = plan.shots.find((s) => s.position === 1)!;
    expect(shot1.positivePrompt).toContain("front-facing view");
    expect(shot1.positivePrompt).toContain("body facing front");
    expect(shot1.positivePrompt).toContain("hands at sides");
  });

  it("Riviera Shot 2 prompt contains three-quarter composition", () => {
    const plan = compileFamilyPlan(rivieraFamily);
    const shot2 = plan.shots.find((s) => s.position === 2)!;
    expect(shot2.positivePrompt).toContain("three-quarter angle view");
    expect(shot2.positivePrompt).toContain("body facing three quarter left");
    expect(shot2.positivePrompt).toContain("hands hand in pocket");
  });

  it("Riviera Shot 3 prompt contains back view", () => {
    const plan = compileFamilyPlan(rivieraFamily);
    const shot3 = plan.shots.find((s) => s.position === 3)!;
    expect(shot3.positivePrompt).toContain("back view");
    expect(shot3.positivePrompt).toContain("body facing back");
    expect(shot3.positivePrompt).toContain("head away from camera");
  });

  it("Riviera Shot 5 (material) contains material-focused language", () => {
    const plan = compileFamilyPlan(rivieraFamily);
    const shot5 = plan.shots.find((s) => s.position === 5)!;
    expect(shot5.positivePrompt).toContain("material");
  });

  it("Riviera Shot 6 (flat lay) contains flat lay composition", () => {
    const plan = compileFamilyPlan(rivieraFamily);
    const shot6 = plan.shots.find((s) => s.position === 6)!;
    expect(shot6.positivePrompt).toContain("flat lay");
    expect(shot6.positivePrompt).toContain("full product view");
  });

  // ── Tee Dress ──

  it("Tee Dress Shot 4 prompt contains flat-lay, not macro", () => {
    const plan = compileFamilyPlan(teeDressFamily);
    const shot4 = plan.shots.find((s) => s.position === 4)!;
    expect(shot4.positivePrompt).toContain("flat lay");
    expect(shot4.positivePrompt).toContain("full product view");
    expect(shot4.positivePrompt).not.toContain("Tight macro crop");
  });

  it("Tee Dress Shot 3 prompt contains neckline focus", () => {
    const plan = compileFamilyPlan(teeDressFamily);
    const shot3 = plan.shots.find((s) => s.position === 3)!;
    expect(shot3.positivePrompt).toContain("neckline");
  });

  // ── Silk Shirt ──

  it("Silk Shirt Shot 3 prompt contains back view orientation", () => {
    const plan = compileFamilyPlan(silkShirtFamily);
    const shot3 = plan.shots.find((s) => s.position === 3)!;
    expect(shot3.positivePrompt).toContain("back view");
    expect(shot3.positivePrompt).toContain("body facing back");
  });

  it("Silk Shirt Shot 5 (material) contains material-focused language", () => {
    const plan = compileFamilyPlan(silkShirtFamily);
    const shot5 = plan.shots.find((s) => s.position === 5)!;
    expect(shot5.positivePrompt).toContain("fabric");
    expect(shot5.positivePrompt).toContain("texture");
  });

  it("Silk Shirt Shot 6 (flat lay) contains flat lay, not macro", () => {
    const plan = compileFamilyPlan(silkShirtFamily);
    const shot6 = plan.shots.find((s) => s.position === 6)!;
    expect(shot6.positivePrompt).toContain("flat lay");
    expect(shot6.positivePrompt).not.toContain("Tight macro crop");
  });
});
