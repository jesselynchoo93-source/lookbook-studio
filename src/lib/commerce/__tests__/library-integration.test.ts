/**
 * V3.2.5: Whole-library compiled-prompt integration test (Section 8F)
 *
 * Compiles all current families end-to-end and validates every shot.
 * Catches drift across the entire library.
 */

import { describe, it, expect } from "vitest";
import { resolveShotIntent } from "../commercePromptCompiler";
import {
  assertNoEditorialLanguage,
  assertLiteralCommerceRegister,
} from "../commerceLanguageGuard";
import type { TemplateFamilyShot } from "../referenceLibrary.types";
import {
  rivieraFamily,
  silkShirtFamily,
  teeDressFamily,
  ALL_FAMILIES,
  compileFamilyPlan,
} from "./test-helpers";

const CONTRADICTION_MAP: Record<string, string[]> = {
  flat_lay: ["Tight macro crop", "Close-up crop", "macro crop"],
  macro_crop: ["flat lay", "Flat lay", "full product"],
  front_facing: ["back view", "body facing back"],
  back_view: ["front-facing", "body facing front"],
};

describe("whole-library compiled prompt sweep", () => {
  for (const family of ALL_FAMILIES) {
    describe(family.id, () => {
      const plan = compileFamilyPlan(family);

      for (const shot of plan.shots) {
        const meta = family.shots[shot.position - 1] as TemplateFamilyShot;
        const intent = resolveShotIntent(meta);

        it(`Shot ${shot.position}: has exactly one "Exact shot composition:" line`, () => {
          const matches = shot.positivePrompt.match(
            /Exact shot composition:/g,
          );
          expect(matches?.length).toBe(1);
        });

        it(`Shot ${shot.position}: no contradictory framing for ${intent.compositionType}`, () => {
          const banned = CONTRADICTION_MAP[intent.compositionType] ?? [];
          for (const phrase of banned) {
            expect(shot.positivePrompt).not.toContain(phrase);
          }
        });

        it(`Shot ${shot.position}: passes language guard with zero drops`, () => {
          const logs = assertNoEditorialLanguage(
            shot.positivePrompt,
            `${family.id}-${shot.position}`,
          );
          expect(logs).toHaveLength(0);

          const { logs: registerLogs } = assertLiteralCommerceRegister(
            shot.positivePrompt,
            `${family.id}-${shot.position}`,
          );
          expect(registerLogs).toHaveLength(0);
        });
      }
    });
  }
});
