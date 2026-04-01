/**
 * Dev-only debug utility for ShotIntent inspection.
 *
 * Not called from compileCommercePlan(). Opt-in only.
 * To enable in browser: localStorage.setItem("LOOKBOOK_DEBUG_SHOT_INTENT", "1")
 */

import { resolveShotIntent } from "./commercePromptCompiler";
import type {
  TemplateFamilyDefinition,
  CommerceGenerationPlan,
} from "./referenceLibrary.types";

export function debugShotIntent(
  family: TemplateFamilyDefinition,
  plan: CommerceGenerationPlan,
): void {
  if (process.env.NODE_ENV === "production") return;

  console.group(`[ShotIntent Debug] ${family.id}`);
  for (const shot of family.shots) {
    const intent = resolveShotIntent(shot);
    const compiled = plan.shots.find((s) => s.position === shot.position);

    console.group(`Shot ${shot.position} (${shot.role})`);
    console.table({
      compositionType: intent.compositionType,
      cropClass: intent.cropClass,
      garmentFocus: intent.garmentFocus,
      bodyDirection: intent.bodyDirection,
      handPlacement: intent.handPlacement,
      headDirection: intent.headDirection,
      backgroundAuthority: intent.backgroundAuthority,
      visualIntentKey: intent.visualIntentKey,
    });
    if (compiled) {
      console.log(
        "Compiled prompt (first 300 chars):",
        compiled.positivePrompt.slice(0, 300),
      );
    }
    console.groupEnd();
  }
  console.groupEnd();
}
