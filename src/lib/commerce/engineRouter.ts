/**
 * Engine Router
 *
 * Recommends the appropriate studio engine (editorial vs commerce)
 * based on the user's input selections. Advisory only, never forced.
 */

import type {
  PrimaryObjective,
  TargetStyle,
  StudioEngine,
} from "@/lib/lookbook/types";

export interface EngineRecommendation {
  recommended: StudioEngine;
  confidence: "strong" | "moderate" | "weak";
  reason: string;
}

/**
 * Recommend an engine based on user intent signals.
 * Returns a recommendation with confidence level and human-readable reason.
 */
export function recommendEngine(input: {
  primaryObjective?: PrimaryObjective;
  targetStyle?: TargetStyle;
}): EngineRecommendation {
  const { primaryObjective, targetStyle } = input;

  // Strong commerce signals
  if (primaryObjective === "sell_clearly") {
    if (targetStyle === "commercial" || targetStyle === "minimal") {
      return {
        recommended: "commerce",
        confidence: "strong",
        reason: "Product-selling objective with clean commercial style suits reference-locked commerce generation.",
      };
    }
    return {
      recommended: "commerce",
      confidence: "moderate",
      reason: "Product-selling objective detected. Commerce mode produces more consistent catalog imagery.",
    };
  }

  // Moderate commerce signals
  if (primaryObjective === "shape_and_fit" && targetStyle === "commercial") {
    return {
      recommended: "commerce",
      confidence: "moderate",
      reason: "Shape and fit focus with commercial style. Commerce mode provides consistent pose coverage.",
    };
  }

  // Default: editorial
  return {
    recommended: "editorial",
    confidence: "strong",
    reason: "Editorial mode provides full creative control for campaign and brand storytelling.",
  };
}
