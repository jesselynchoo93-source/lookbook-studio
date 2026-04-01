/**
 * Commerce Clipboard Formatter
 *
 * Formats a CommerceGenerationPlan into copy-paste text for manual
 * generation workflows. Each shot block tells the user which reference
 * image to upload alongside the text prompt.
 *
 * No editorial language, no taste language.
 * Uses only data from the prompt packages (no raw notes, no extracted
 * constraint notes).
 */

import type {
  CommerceGenerationPlan,
  CommercePromptPackage,
} from "./referenceLibrary.types";
import { COMMERCE_SHOT_ROLE_LABELS, SWAP_MODE_LABELS } from "./referenceLibrary.types";

// ── Shot Block Formatter ──

function formatShotBlock(
  shot: CommercePromptPackage,
  index: number,
): string {
  const roleLabel = COMMERCE_SHOT_ROLE_LABELS[shot.shotRole];
  const anchorTag = shot.isAnchor ? " [Anchor]" : "";
  const safetyTag = shot.replacementSafety !== "safe"
    ? ` [${shot.replacementSafety.toUpperCase()}]`
    : "";
  const swapLabel = SWAP_MODE_LABELS[shot.swapMode];

  const lines: string[] = [
    `SHOT ${index + 1}: ${roleLabel.toUpperCase()}${anchorTag}${safetyTag}`,
    `Swap mode: ${swapLabel}`,
    `Upload reference: ${shot.referenceImagePath}`,
    "",
    "Positive prompt:",
    shot.positivePrompt,
    "",
    "Negative prompt:",
    shot.negativePrompt,
  ];

  return lines.join("\n");
}

// ── Public API ──

/**
 * Format a commerce generation plan as clipboard text.
 * Shots are ordered by the plan's generationOrder (anchor first).
 */
export function formatCommerceClipboard(
  plan: CommerceGenerationPlan,
): string {
  const familyName = plan.templateFamily.name;
  const swapLabel = SWAP_MODE_LABELS[plan.defaultSwapMode];
  const shotCount = plan.shots.length;

  const header = [
    "COMMERCE GENERATION QUEUE",
    `Template: ${familyName} | ${swapLabel} | ${shotCount} shots`,
  ].join("\n");

  // Order shots by generation order
  const orderedShots = plan.generationOrder.map((position) => {
    const shot = plan.shots.find((s) => s.position === position);
    if (!shot) {
      throw new Error(`[CommerceClipboard] Shot at position ${position} not found in plan`);
    }
    return shot;
  });

  const shotBlocks = orderedShots.map((shot, i) => formatShotBlock(shot, i));

  return [header, "", "---", "", shotBlocks.join("\n\n---\n\n")].join("\n");
}

/**
 * Format a single shot for clipboard (for per-shot copy).
 */
export function formatSingleShotClipboard(
  shot: CommercePromptPackage,
): string {
  const roleLabel = COMMERCE_SHOT_ROLE_LABELS[shot.shotRole];
  const anchorTag = shot.isAnchor ? " [Anchor]" : "";

  const lines: string[] = [
    `${roleLabel.toUpperCase()}${anchorTag}`,
    `Upload reference: ${shot.referenceImagePath}`,
    "",
    shot.positivePrompt,
  ];

  return lines.join("\n");
}
