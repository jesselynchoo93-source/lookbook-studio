import type {
  ShotArchetype,
  LookbookInput,
  MasterShootDNA,
  RecommendedShot,
  ScoredArchetype,
  ResolvedBlueprint,
} from "./types";
import { PRODUCT_FAMILY_LABELS } from "./types";
import { NEGATIVE_DEFAULTS } from "./realismRules";

// ── Delta Brief Builder ──

function buildDeltaBrief(
  archetype: ShotArchetype,
  dna: MasterShootDNA,
  input: LookbookInput,
  blueprint: ResolvedBlueprint
): string {
  const item = input.specificItem || PRODUCT_FAMILY_LABELS[input.productFamily].toLowerCase();
  const gender =
    input.genderPresentation === "menswear" ? "Male"
    : input.genderPresentation === "womenswear" ? "Female"
    : "Model";

  let brief = archetype.deltaBlueprint;

  // Replace placeholders
  brief = brief.replace(/\{item\}/g, item);
  brief = brief.replace(/\{gender\}/g, gender.toLowerCase());
  brief = brief.replace(/\{framing\}/g, archetype.defaultFraming);
  brief = brief.replace(/\{lens\}/g, archetype.defaultLens);
  brief = brief.replace(/\{aperture\}/g, archetype.defaultAperture);

  // Add branding line based on blueprint emphasis
  if (blueprint.brandingEmphasis === "product_first") {
    brief += ` Product visibility replaces logo branding. Ensure the ${item} is fully visible and catching light.`;
  } else if (blueprint.brandingEmphasis === "logo_first" && archetype.logoVisibilitySuitability === "high") {
    brief += " Preserve all visible branding and printed text with full legibility.";
  }

  // Add item-specific delta brief suffix from blueprint
  if (blueprint.deltaBriefSuffix) {
    brief += ` ${blueprint.deltaBriefSuffix}`;
  }

  // Realism guardrail
  brief += " Natural skin texture, no AI stare, grounded anatomy.";

  return brief;
}

// ── Negative Cues ──

function buildNegativeCues(archetype: ShotArchetype, input: LookbookInput, blueprint: ResolvedBlueprint): string {
  const extras: string[] = [];

  if (archetype.anatomyRisk === "high" || archetype.anatomyRisk === "medium") {
    extras.push("warped hands", "incorrect finger count", "unnatural joint angles");
  }
  if (archetype.logoRisk === "high" || archetype.logoRisk === "medium") {
    extras.push("obscured logos", "distorted branding", "broken text");
  }
  if (archetype.occlusionRisk === "high" || archetype.occlusionRisk === "medium") {
    extras.push("hidden product details", "occluded garment features");
  }
  if (archetype.shotCategory === "motion") {
    extras.push("frozen mid-air pose", "unnatural stride length");
  }

  // Blueprint-driven negative cues
  extras.push(...blueprint.additionalNegativeCues);

  return extras.length > 0
    ? `${NEGATIVE_DEFAULTS}, ${extras.join(", ")}`
    : NEGATIVE_DEFAULTS;
}

// ── Badges ──

function buildBadges(
  archetype: ShotArchetype,
  input: LookbookInput,
  blueprint: ResolvedBlueprint
): string[] {
  const badges: string[] = [];

  if (blueprint.requiredArchetypeIds.includes(archetype.id)) {
    badges.push("Blueprint required");
  }

  if (input.creativityLevel === "safe" && archetype.creativityBand.includes("safe")) {
    badges.push("Safe");
  }
  if (input.creativityLevel === "balanced" && archetype.creativityBand.includes("balanced")) {
    badges.push("Balanced");
  }
  if (input.creativityLevel === "directional" && archetype.creativityBand.includes("directional")) {
    badges.push("Directional");
  }
  if (archetype.logoVisibilitySuitability === "high" && input.logoVisibilityPriority !== "low") {
    badges.push("Logo-safe");
  }
  if (archetype.detailSuitability === "high") {
    badges.push("High detail");
  }
  if (archetype.shotCategory === "motion") {
    badges.push("Motion");
  }
  if (archetype.higgsfieldReliability === "high") {
    badges.push("High reliability");
  }
  if (archetype.difficulty === "hard" || archetype.higgsfieldReliability === "low") {
    badges.push("Higher risk");
  }

  return badges;
}

// ── Shot Purpose ──

function deriveShotPurpose(archetype: ShotArchetype, _input: LookbookInput): string {
  const purposes: Record<string, string> = {
    hero: "Anchor shot establishing the product clearly for the buyer.",
    silhouette: "Shows garment shape, proportions, and overall line.",
    detail: "Highlights construction, texture, and branding details.",
    motion: "Adds life and energy, showing how the product moves.",
    editorial: "Creates mood and narrative interest for the brand.",
    product_focus: "Directs attention to the specific product being featured.",
  };
  return purposes[archetype.shotCategory] || archetype.role;
}

// ── What It Sells ──

function deriveWhatItSells(archetype: ShotArchetype, input: LookbookInput, blueprint: ResolvedBlueprint): string {
  const item = input.specificItem || PRODUCT_FAMILY_LABELS[input.productFamily].toLowerCase();

  // Blueprint category-specific "what it sells" language (highest priority)
  const blueprintSells = blueprint.whatItSellsByCategory[archetype.shotCategory];
  if (blueprintSells) return blueprintSells;

  // Blueprint sells focus hints
  if (blueprint.sellsFocus.length > 0) {
    const sellsHints = blueprint.sellsFocus.slice(0, 3).join("; ");
    if (archetype.shotCategory === "hero") {
      return `Primary visibility of the ${item}. Key selling points: ${sellsHints}.`;
    }
    if (archetype.shotCategory === "detail") {
      return `Craftsmanship and detail of the ${item}. Focus: ${sellsHints}.`;
    }
  }

  // Generic fallback
  if (archetype.shotCategory === "hero") {
    return `Complete visibility of the ${item}. The buyer sees fit, proportions, and the full product at a glance.`;
  }
  if (archetype.shotCategory === "silhouette") {
    return `The shape and line of the ${item}. Shows how the product drapes and sits on the body from a different angle.`;
  }
  if (archetype.shotCategory === "detail") {
    return `Craftsmanship and branding details of the ${item}. Texture, construction quality, and finish.`;
  }
  if (archetype.shotCategory === "motion") {
    return `How the ${item} moves and drapes in motion. Buyers see fabric behaviour that static shots cannot show.`;
  }
  if (archetype.shotCategory === "editorial") {
    return `Brand aspiration and lifestyle context for the ${item}. Elevates the product from an item to a story.`;
  }
  return `The ${item} in its intended use context. Buyers see the product as it would be worn or carried.`;
}

// ── Framing/Pose Deltas ──

function deriveFramingDelta(archetype: ShotArchetype, _dna: MasterShootDNA): string {
  return `${archetype.defaultFraming} at ${archetype.defaultLens} ${archetype.defaultAperture}, ` +
    `camera at ${archetype.defaultCameraHeight}, ~${archetype.defaultCameraDistance} from subject.`;
}

function derivePoseDelta(archetype: ShotArchetype): string {
  return `${archetype.poseFamily}: ${archetype.bodyDirection}. ` +
    `Hands: ${archetype.handBehavior}. Legs: ${archetype.legBehavior}. ` +
    `Head: ${archetype.headDirection}.`;
}

// ── Risk Summary ──

function deriveRiskSummary(archetype: ShotArchetype): string {
  const risks: string[] = [];
  if (archetype.logoRisk !== "low") risks.push(`logo risk: ${archetype.logoRisk}`);
  if (archetype.anatomyRisk !== "low") risks.push(`anatomy risk: ${archetype.anatomyRisk}`);
  if (archetype.occlusionRisk !== "low") risks.push(`occlusion risk: ${archetype.occlusionRisk}`);
  if (risks.length === 0) return "Low risk across all dimensions.";
  return risks.join(", ") + `. Difficulty: ${archetype.difficulty}.`;
}

// ── Build Recommended Shot ──

export function buildRecommendedShot(
  scored: ScoredArchetype,
  position: number,
  priority: number,
  dna: MasterShootDNA,
  input: LookbookInput,
  blueprint: ResolvedBlueprint
): RecommendedShot {
  const archetype = scored.archetype;

  return {
    position,
    archetype,
    shotPurpose: deriveShotPurpose(archetype, input),
    whatItSells: deriveWhatItSells(archetype, input, blueprint),
    framingDelta: deriveFramingDelta(archetype, dna),
    poseDelta: derivePoseDelta(archetype),
    productEmphasis: archetype.role,
    brandingSafety:
      archetype.logoVisibilitySuitability === "high"
        ? "Logo-safe: branding fully visible in this framing."
        : archetype.logoVisibilitySuitability === "medium"
        ? "Moderate: branding partially visible depending on angle."
        : "Low visibility: branding may be obscured by pose or crop.",
    realismNote: archetype.realismNotes,
    riskSummary: deriveRiskSummary(archetype),
    generationPriority: priority,
    badges: buildBadges(archetype, input, blueprint),
    deltaBrief: buildDeltaBrief(archetype, dna, input, blueprint),
    negativeCues: buildNegativeCues(archetype, input, blueprint),
  };
}
