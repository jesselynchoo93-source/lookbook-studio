import type {
  ShotArchetype,
  LookbookInput,
  MasterShootDNA,
  RecommendedShot,
  ScoredArchetype,
  ShotBlueprint,
} from "./types";
import { PRODUCT_FAMILY_LABELS } from "./types";
import { NEGATIVE_DEFAULTS } from "./realismRules";

// ── Item-Specific "What It Sells" Language ──

const ITEM_SELLS_MAP: Record<string, Record<string, string>> = {
  earrings: {
    hero: "Ear visibility and placement against the face. The buyer sees scale, sparkle, and how the piece frames the jawline at a glance.",
    product_focus: "Three-dimensional view of the earring near the jaw and neck. Shows drop length, dimension, and how the piece catches light from different angles.",
    detail: "Craftsmanship close-up: stone setting, metal finish, clasp quality, and earring construction at full magnification.",
    editorial: "Aspirational mood showing the earring in context. The buyer sees who wears this piece and when, while the earring remains readable.",
    silhouette: "The earring's outline and drop shape against negative space. Buyers see the exact profile and movement potential of the piece.",
    motion: "How the earring moves and catches light during natural head movement.",
  },
  earring: { /* alias */ },
  necklace: {
    hero: "Chain drape and pendant position against the collarbone. The buyer sees scale, length, and how the piece sits on skin.",
    product_focus: "Close view of pendant detail, chain links, and clasp. Shows metalwork quality and layering potential.",
    detail: "Construction close-up: chain link quality, pendant setting, clasp mechanism, and metal finish at full magnification.",
    editorial: "The necklace in lifestyle context, showing how it completes a look while remaining visible and aspirational.",
    silhouette: "Necklace drape line against the neck and chest, showing length and proportions from profile.",
    motion: "How the chain and pendant move during natural body movement.",
  },
  bracelet: {
    hero: "Wrist-level visibility showing the bracelet's scale, fit, and relationship to the hand and forearm.",
    product_focus: "Close interaction showing the bracelet on the wrist with natural hand positioning for scale context.",
    detail: "Clasp detail, link quality, stone setting, and metalwork finish at close range.",
    editorial: "The bracelet in styling context, showing how it pairs with clothing and other accessories.",
    silhouette: "Bracelet profile showing width, thickness, and how it sits on the wrist.",
    motion: "How the bracelet moves on the wrist during natural hand gestures.",
  },
  ring: {
    hero: "Ring visibility on the finger, showing scale, stone setting, and band width.",
    product_focus: "Close view of the ring on the hand, showing how it sits on the finger with natural hand positioning.",
    detail: "Stone and setting magnification: facets, prongs, band engravings, and metal finish quality.",
    editorial: "The ring in a lifestyle moment, showing who wears it and the occasion it belongs to.",
    silhouette: "Ring profile from the side showing band thickness and stone height.",
    motion: "Subtle hand gesture showing the ring catching light from different angles.",
  },
};

// Copy earring alias
ITEM_SELLS_MAP["earring"] = ITEM_SELLS_MAP["earrings"];
ITEM_SELLS_MAP["ear cuff"] = ITEM_SELLS_MAP["earrings"];
ITEM_SELLS_MAP["hoop"] = ITEM_SELLS_MAP["earrings"];
ITEM_SELLS_MAP["stud"] = ITEM_SELLS_MAP["earrings"];
ITEM_SELLS_MAP["drop earring"] = ITEM_SELLS_MAP["earrings"];
ITEM_SELLS_MAP["pendant"] = ITEM_SELLS_MAP["necklace"];
ITEM_SELLS_MAP["choker"] = ITEM_SELLS_MAP["necklace"];
ITEM_SELLS_MAP["chain"] = ITEM_SELLS_MAP["necklace"];

// ── Delta Brief Builder ──

function buildDeltaBrief(
  archetype: ShotArchetype,
  dna: MasterShootDNA,
  input: LookbookInput,
  blueprint: ShotBlueprint | null
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

  // Add branding line based on blueprint emphasis or DNA logo priority
  if (blueprint) {
    if (blueprint.brandingEmphasis === "product_first") {
      brief += ` Product visibility replaces logo branding. Ensure the ${item} is fully visible and catching light.`;
    } else if (blueprint.brandingEmphasis === "logo_first" && archetype.logoVisibilitySuitability === "high") {
      brief += " Preserve all visible branding and printed text with full legibility.";
    }
  } else if (
    dna.logoVisibilityPriority === "high" &&
    archetype.logoVisibilitySuitability === "high"
  ) {
    brief += " Preserve all visible branding and printed text with full legibility.";
  }

  // Add occlusion guardrails for jewelry
  if (blueprint && blueprint.occlusionPenalties.length > 0) {
    const itemLower = (input.specificItem || "").toLowerCase();
    if (itemLower.includes("earring") || itemLower === "ear cuff" || itemLower === "hoop" || itemLower === "stud") {
      brief += " Hair swept behind the featured ear. No hands near ear or jaw area.";
    }
  }

  // Realism guardrail
  brief += " Natural skin texture, no AI stare, grounded anatomy.";

  return brief;
}

// ── Negative Cues ──

function buildNegativeCues(archetype: ShotArchetype, input: LookbookInput, blueprint: ShotBlueprint | null): string {
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

  // Item-specific negatives
  const itemLower = (input.specificItem || "").toLowerCase();
  if (itemLower.includes("earring") || itemLower === "ear cuff" || itemLower === "hoop" || itemLower === "stud") {
    extras.push("hair covering earrings", "hands near ear area", "earring floating off earlobe", "mismatched earring sizes");
  }
  if (itemLower === "necklace" || itemLower === "pendant" || itemLower === "choker" || itemLower === "chain") {
    extras.push("necklace floating above skin", "chain links merging", "pendant clipping through clothing");
  }
  if (itemLower === "bracelet" || itemLower === "bangle") {
    extras.push("bracelet floating above wrist", "clasp rendering errors");
  }

  return extras.length > 0
    ? `${NEGATIVE_DEFAULTS}, ${extras.join(", ")}`
    : NEGATIVE_DEFAULTS;
}

// ── Badges ──

function buildBadges(
  archetype: ShotArchetype,
  input: LookbookInput,
  blueprint: ShotBlueprint | null
): string[] {
  const badges: string[] = [];

  if (blueprint && blueprint.requiredRoles.includes(archetype.id)) {
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

function deriveShotPurpose(archetype: ShotArchetype, input: LookbookInput): string {
  const itemLower = (input.specificItem || "").toLowerCase();

  // Item-specific purpose overrides
  if (itemLower.includes("earring") || itemLower === "ear cuff" || itemLower === "hoop" || itemLower === "stud") {
    const earringPurposes: Record<string, string> = {
      hero: "Anchor portrait showing earring placement, scale, and sparkle against the face.",
      product_focus: "Secondary angle revealing earring dimension, drop, and how it sits against the jaw.",
      detail: "Close-up validation of construction, stone quality, and metal finish.",
      editorial: "Mood portrait combining brand atmosphere with visible earring.",
      silhouette: "Profile showing earring outline and drop shape against negative space.",
      motion: "Subtle movement showing earring swing and light catch.",
    };
    return earringPurposes[archetype.shotCategory] || archetype.role;
  }

  if (itemLower === "necklace" || itemLower === "pendant" || itemLower === "choker") {
    const neckPurposes: Record<string, string> = {
      hero: "Anchor portrait showing necklace drape and position against the collarbone.",
      product_focus: "Close view of pendant or chain detail with skin context.",
      detail: "Construction close-up of chain links, clasp, and pendant setting.",
      editorial: "Lifestyle portrait with visible necklace for brand storytelling.",
      silhouette: "Profile showing necklace drape line along the neck.",
      motion: "Natural movement showing chain behaviour and pendant swing.",
    };
    return neckPurposes[archetype.shotCategory] || archetype.role;
  }

  // Generic fallback
  const purposes: Record<string, string> = {
    hero: "Anchor shot establishing the product clearly for the buyer.",
    silhouette: "Shows garment shape, proportions, and overall line.",
    detail: "Highlights construction, texture, and branding details.",
    motion: "Adds life and energy, showing how the garment moves.",
    editorial: "Creates mood and narrative interest for the brand.",
    product_focus: "Directs attention to the specific product being featured.",
  };
  return purposes[archetype.shotCategory] || archetype.role;
}

// ── What It Sells ──

function deriveWhatItSells(archetype: ShotArchetype, input: LookbookInput, blueprint: ShotBlueprint | null): string {
  const item = input.specificItem || PRODUCT_FAMILY_LABELS[input.productFamily].toLowerCase();
  const itemLower = (input.specificItem || "").toLowerCase();

  // Archetype-specific overrides (higher priority than category-level)
  if (archetype.id === "pair_symmetry_validation") {
    return `Pair readability and symmetry of the ${item}. Both pieces visible side by side for matching confirmation. Reduces purchase anxiety for e-commerce buyers.`;
  }
  if (archetype.id === "profile_jewelry_focus") {
    return `Silhouette and drop shape of the ${item} against negative space. Shows the exact profile, movement potential, and how the piece relates to the jawline.`;
  }

  // Check item-specific sells language
  const itemMap = ITEM_SELLS_MAP[itemLower];
  if (itemMap) {
    const specific = itemMap[archetype.shotCategory];
    if (specific) return specific;
  }

  // Blueprint sells language hints
  if (blueprint && blueprint.sellsLanguage.length > 0) {
    const sellsHints = blueprint.sellsLanguage.slice(0, 3).join("; ");
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

function deriveFramingDelta(archetype: ShotArchetype, dna: MasterShootDNA): string {
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
  blueprint: ShotBlueprint | null = null
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
