/**
 * World System: Structured WorldProfile resolution.
 *
 * Replaces the coarse 4-preset system with a normalized, confidence-aware
 * world model. One set = one world family, one lighting character, controlled
 * micro-variation per shot role.
 *
 * Resolver priority:
 *   1. Manual lock (user chose a specific family)
 *   2. Gemini raw tokens (confidence-aware inference)
 *   3. Normalized mapping (objective + style + product family)
 *   4. Preset fallback (studio_minimal)
 */

import type {
  WorldFamily,
  WorldProfile,
  ExtractedWorldTokens,
  WorldLockMode,
  WorldQuietness,
  LightingCharacter,
  TonalTemperature,
  PropDensity,
  WorldInteractionLevel,
  ShotWorldSlice,
  LookbookInput,
  RecommendedShot,
  PrimaryObjective,
  TargetStyle,
  ProductFamily,
  EditorialBeat,
} from "./types";

// ── Display Labels ──

export const WORLD_FAMILY_LABELS: Record<WorldFamily, string> = {
  studio_minimal: "Studio minimal",
  architectural_interior: "Architectural interior",
  architectural_exterior: "Architectural exterior",
  furnished_interior: "Furnished interior",
  urban_exterior: "Urban exterior",
  natural_exterior: "Natural exterior",
};

// ── Family Defaults ──

export const WORLD_FAMILY_DEFAULTS: Record<WorldFamily, WorldProfile> = {
  studio_minimal: {
    family: "studio_minimal",
    tonalTemperature: "neutral",
    lightingCharacter: "soft_directional",
    lightingDescription: "soft directional studio light",
    propDensity: "none",
    interactionLevel: "none",
    continuityPriority: "strict",
    quietness: "quiet",
    backdrop: "matte seamless backdrop",
    groundPlane: "clean studio floor",
    furnitureElements: [],
    architecturalElements: [],
    naturalElements: [],
    allowedMicroVariations: [
      "background tone shift within same neutral family",
      "slightly tighter or wider framing",
      "floor-to-wall transition visible or hidden",
    ],
    source: "preset_fallback",
  },
  architectural_interior: {
    family: "architectural_interior",
    tonalTemperature: "neutral",
    lightingCharacter: "window_light",
    lightingDescription: "soft directional interior daylight",
    propDensity: "minimal",
    interactionLevel: "lean_only",
    continuityPriority: "strict",
    quietness: "quiet",
    backdrop: "clean plaster or stone interior wall",
    groundPlane: "stone or concrete floor",
    furnitureElements: [],
    architecturalElements: ["wall plane", "corner", "corridor edge"],
    naturalElements: [],
    allowedMicroVariations: [
      "different wall section in same space",
      "corner vs flat wall",
      "same surface used for seated crop only if allowed",
    ],
    source: "preset_fallback",
  },
  architectural_exterior: {
    family: "architectural_exterior",
    tonalTemperature: "warm",
    lightingCharacter: "directional_daylight",
    lightingDescription: "diffused outdoor daylight",
    propDensity: "none",
    interactionLevel: "lean_only",
    continuityPriority: "balanced",
    quietness: "quiet",
    backdrop: "clean exterior masonry or plaster wall",
    groundPlane: "paved courtyard or walkway",
    furnitureElements: [],
    architecturalElements: ["courtyard wall", "facade edge", "steps"],
    naturalElements: [],
    allowedMicroVariations: [
      "wall section changes within same building",
      "standing near steps or flat wall",
      "wider and tighter crops in same exterior zone",
    ],
    source: "preset_fallback",
  },
  furnished_interior: {
    family: "furnished_interior",
    tonalTemperature: "warm",
    lightingCharacter: "window_light",
    lightingDescription: "soft window light",
    propDensity: "sparse",
    interactionLevel: "sit_or_lean",
    continuityPriority: "balanced",
    quietness: "quiet",
    backdrop: "clean design-led interior with restrained furnishings",
    groundPlane: "wood or polished concrete floor",
    furnitureElements: ["bench", "chair"],
    architecturalElements: ["wall plane", "window edge"],
    naturalElements: [],
    allowedMicroVariations: [
      "standing near furniture",
      "seated crop on same bench or chair",
      "detail crop on same tabletop or surface",
    ],
    source: "preset_fallback",
  },
  urban_exterior: {
    family: "urban_exterior",
    tonalTemperature: "neutral",
    lightingCharacter: "overcast_outdoor",
    lightingDescription: "diffused outdoor daylight",
    propDensity: "none",
    interactionLevel: "full_light_interaction",
    continuityPriority: "balanced",
    quietness: "quiet",
    backdrop: "weathered urban wall or facade",
    groundPlane: "paved urban surface",
    furnitureElements: [],
    architecturalElements: ["facade", "street wall", "courtyard edge"],
    naturalElements: [],
    allowedMicroVariations: [
      "different facade section in same area",
      "wall, doorway edge, or pavement zone",
      "standing, walking, or light lean in same block",
    ],
    source: "preset_fallback",
  },
  natural_exterior: {
    family: "natural_exterior",
    tonalTemperature: "warm",
    lightingCharacter: "overcast_outdoor",
    lightingDescription: "soft outdoor daylight",
    propDensity: "none",
    interactionLevel: "full_light_interaction",
    continuityPriority: "balanced",
    quietness: "quiet",
    backdrop: "restrained natural landscape",
    groundPlane: "sand, grass, or natural soil",
    furnitureElements: [],
    architecturalElements: [],
    naturalElements: ["foliage", "coast", "rock"],
    allowedMicroVariations: [
      "standing and walking within same terrain",
      "same horizon and light family with tighter crop",
      "detail crop using same natural surface",
    ],
    source: "preset_fallback",
  },
};

// ── Inference ──

interface FamilyInference {
  family: WorldFamily;
  confidence: "high" | "medium" | "low";
}

const FAMILY_KEYWORDS: Record<WorldFamily, { strong: string[]; weak: string[] }> = {
  studio_minimal: {
    strong: ["seamless", "cyclorama", "sweep", "studio floor", "plain wall"],
    weak: ["backdrop", "clean wall", "neutral"],
  },
  architectural_interior: {
    strong: ["corridor", "colonnade", "gallery", "arch", "hallway", "lobby"],
    weak: ["plaster", "stone wall", "concrete wall", "room", "hall", "interior wall"],
  },
  architectural_exterior: {
    strong: ["facade", "portico", "courtyard", "colonnade"],
    weak: ["steps", "exterior wall", "building", "masonry"],
  },
  furnished_interior: {
    strong: ["sofa", "chair", "lamp", "table", "desk", "bed", "living room", "domestic"],
    weak: ["furniture", "interior", "cushion", "shelf"],
  },
  urban_exterior: {
    strong: ["sidewalk", "alley", "street", "graffiti", "urban", "pavement", "kerb"],
    weak: ["bollard", "parking", "industrial", "warehouse"],
  },
  natural_exterior: {
    strong: ["grass", "dunes", "coast", "trees", "forest", "beach", "field", "meadow"],
    weak: ["rock", "sand", "soil", "foliage", "greenery", "landscape"],
  },
};

export function inferWorldFamily(extracted?: ExtractedWorldTokens): FamilyInference {
  if (!extracted) return { family: "studio_minimal", confidence: "low" };

  const text = [
    extracted.backdrop,
    extracted.groundPlane,
    extracted.environmentMood,
    ...(extracted.architecturalElements || []),
    ...(extracted.furnitureElements || []),
    ...(extracted.naturalElements || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text.trim()) return { family: "studio_minimal", confidence: "low" };

  // If Gemini suggested a family, use it as a signal
  const suggested = extracted.suggestedFamily;

  // Score each family
  const scores: { family: WorldFamily; strong: number; weak: number }[] = [];
  for (const [fam, keywords] of Object.entries(FAMILY_KEYWORDS) as [WorldFamily, { strong: string[]; weak: string[] }][]) {
    const strong = keywords.strong.filter((k) => text.includes(k)).length;
    const weak = keywords.weak.filter((k) => text.includes(k)).length;
    scores.push({ family: fam, strong, weak });
  }

  // Sort by strong matches first, then weak
  scores.sort((a, b) => b.strong - a.strong || b.weak - a.weak);
  const best = scores[0];

  // Disambiguation: check for interior vs exterior cues
  const hasExteriorCues = /\b(sky|outdoor|outside|exterior|open air)\b/.test(text);
  const hasInteriorCues = /\b(window|room|hall|indoor|interior|inside)\b/.test(text);

  let family = best.family;

  // Resolve architectural ambiguity
  if (family === "architectural_interior" && hasExteriorCues && !hasInteriorCues) {
    family = "architectural_exterior";
  } else if (family === "architectural_exterior" && hasInteriorCues && !hasExteriorCues) {
    family = "architectural_interior";
  }

  // If Gemini suggested and our inference is weak, prefer Gemini's suggestion
  if (suggested && best.strong === 0 && best.weak <= 1) {
    family = suggested;
  }

  // Confidence
  let confidence: "high" | "medium" | "low";
  if (best.strong >= 2) {
    confidence = "high";
  } else if (best.strong === 1 || best.weak >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return { family, confidence };
}

// ── Normalization ──

// Clutter tokens that should be stripped from any extracted description
const CLUTTER_TOKENS = [
  "bins", "trash", "trash can", "dumpster", "parked cars", "car", "vehicle",
  "barrier", "bollard", "cables", "cable", "utility pole", "power line",
  "pedestrian", "people", "person", "construction", "scaffolding", "fence",
  "fencing", "signage", "sign", "poster", "flyer", "advertisement",
  "graffiti", "street art", "mural", "tag",
];

function stripClutter(text: string): string {
  let cleaned = text.toLowerCase();
  for (const token of CLUTTER_TOKENS) {
    // Remove the clutter word and surrounding connective phrases
    cleaned = cleaned.replace(new RegExp(`\\b(with\\s+)?${token}s?\\b`, "gi"), "");
  }
  // Clean up leftover artifacts
  cleaned = cleaned
    .replace(/,\s*,/g, ",")
    .replace(/\band\s+and\b/g, "and")
    .replace(/,\s*$/g, "")
    .replace(/^\s*,\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

function collapseOverSpecificMaterial(text: string): string {
  // Collapse overly specific material descriptions to categories
  return text
    .replace(/\b(red-?brown|grey-?brown|dark|light|pale|aged|old|worn)\s+(clinker\s+)?brick\b/gi, "masonry")
    .replace(/\bwith\s+(lime\s+)?mortar\s+(pointing|joints)\b/gi, "")
    .replace(/\b(rough|smooth|polished|cracked)\s+aggregate\s+concrete\b/gi, "concrete")
    .replace(/\b(cracked|broken|uneven)\s+asphalt\b/gi, "paved surface")
    .replace(/\b(weathered|aged|old|worn)\s+(red\s+)?brick\b/gi, "weathered masonry")
    .replace(/\bwith\s+puddles?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function capLength(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

function capArray(arr: string[], max: number): string[] {
  return arr.slice(0, max);
}

function inferLightingCharacter(raw?: string): LightingCharacter {
  if (!raw) return "soft_directional";
  const text = raw.toLowerCase();
  if (/\b(overcast|flat sky|diffused outdoor|cloudy)\b/.test(text)) return "overcast_outdoor";
  if (/\b(window|side light from window)\b/.test(text)) return "window_light";
  if (/\b(bright daylight|direct sun|harsh sun|strong daylight)\b/.test(text)) return "directional_daylight";
  if (/\b(hard directional|hard light|sharp)\b/.test(text)) return "hard_directional";
  if (/\b(soft|even|flat|diffused|gentle)\b/.test(text)) return "soft_even";
  if (/\b(directional|key light|side light)\b/.test(text)) return "soft_directional";
  return "soft_directional";
}

function inferTonalTemperature(raw?: string): TonalTemperature {
  if (!raw) return "neutral";
  const text = raw.toLowerCase();
  if (/\b(warm|golden|amber|sunset)\b/.test(text)) return "warm";
  if (/\b(cool|blue|cold|icy)\b/.test(text)) return "cool";
  return "neutral";
}

export function normalizeExtractedTokens(
  extracted: ExtractedWorldTokens,
  family: WorldFamily,
): Partial<WorldProfile> {
  const defaults = WORLD_FAMILY_DEFAULTS[family];
  const lightChar = inferLightingCharacter(extracted.lighting);
  const tonal = inferTonalTemperature(extracted.tonalTemperature);

  // Normalize backdrop
  let backdrop = extracted.backdrop
    ? capLength(collapseOverSpecificMaterial(stripClutter(extracted.backdrop)), 5)
    : defaults.backdrop;
  if (!backdrop) backdrop = defaults.backdrop;

  // Normalize ground
  let groundPlane = extracted.groundPlane
    ? capLength(collapseOverSpecificMaterial(stripClutter(extracted.groundPlane)), 4)
    : defaults.groundPlane;
  if (!groundPlane) groundPlane = defaults.groundPlane;

  // Normalize lighting description
  let lightingDesc = extracted.lighting
    ? capLength(stripClutter(extracted.lighting), 5)
    : defaults.lightingDescription;
  if (!lightingDesc) lightingDesc = defaults.lightingDescription;

  // Normalize elements
  const archElements = capArray(
    (extracted.architecturalElements || []).map((e) => stripClutter(e)).filter(Boolean),
    3,
  );
  const furnElements = capArray(
    (extracted.furnitureElements || []).map((e) => stripClutter(e)).filter(Boolean),
    3,
  );
  const natElements = capArray(
    (extracted.naturalElements || []).map((e) => stripClutter(e)).filter(Boolean),
    3,
  );

  return {
    tonalTemperature: tonal,
    lightingCharacter: lightChar,
    lightingDescription: lightingDesc,
    backdrop,
    groundPlane,
    architecturalElements: archElements.length > 0 ? archElements : defaults.architecturalElements,
    furnitureElements: furnElements.length > 0 ? furnElements : defaults.furnitureElements,
    naturalElements: natElements.length > 0 ? natElements : defaults.naturalElements,
  };
}

// ── Constraints ──

function constrainByObjectiveAndStyle(
  family: WorldFamily,
  input: LookbookInput,
): WorldFamily {
  const { primaryObjective, targetStyle, productFamily } = input;

  // natural_exterior discouragement
  if (family === "natural_exterior") {
    if (targetStyle === "resort") return family; // Allow
    if (targetStyle === "editorial" && primaryObjective === "editorial_story") return family; // Allow
    if (targetStyle === "street") return "urban_exterior";
    if (["commercial", "luxury", "minimal", "tailoring"].includes(targetStyle)) return "architectural_exterior";
    if (primaryObjective === "sell_clearly" || primaryObjective === "shape_and_fit") return "architectural_exterior";
    if (primaryObjective === "craftsmanship") return "studio_minimal";
    if (["jewelry", "watches", "small_accessories"].includes(productFamily)) return "studio_minimal";
  }

  // furnished_interior discouragement for proof-heavy objectives
  if (family === "furnished_interior") {
    if (primaryObjective === "sell_clearly" || primaryObjective === "shape_and_fit") {
      // Downgrade prop density but keep the family if editorial supports it
      if (targetStyle !== "editorial" && targetStyle !== "luxury") {
        return "architectural_interior";
      }
    }
  }

  // urban_exterior discouragement for luxury/tailoring
  if (family === "urban_exterior") {
    if (targetStyle === "luxury" || targetStyle === "tailoring") {
      return "architectural_exterior";
    }
  }

  // Small product families prefer cleaner worlds
  if (["jewelry", "watches", "small_accessories"].includes(productFamily)) {
    if (family === "urban_exterior" || family === "natural_exterior") {
      return "studio_minimal";
    }
    if (family === "furnished_interior") {
      return "architectural_interior";
    }
  }

  return family;
}

// ── Quietness ──

export function deriveWorldQuietness(input: LookbookInput): WorldQuietness {
  if (input.primaryObjective === "craftsmanship") return "silent";
  if (input.primaryObjective === "sell_clearly" || input.primaryObjective === "shape_and_fit") return "quiet";
  return "present";
}

// ── Style/Objective -> Family Mapping (Priority 3) ──

export function inferFamilyFromContext(input: LookbookInput): WorldFamily {
  const { targetStyle, primaryObjective, productFamily } = input;

  // Product family overrides
  if (["jewelry", "watches", "small_accessories"].includes(productFamily)) return "studio_minimal";
  if (productFamily === "eyewear") {
    if (targetStyle === "street") return "urban_exterior";
    return "architectural_interior";
  }
  if (productFamily === "footwear") {
    if (targetStyle === "street") return "urban_exterior";
    return "architectural_exterior";
  }

  // Objective overrides
  if (primaryObjective === "craftsmanship") return "studio_minimal";

  // Style-based
  if (targetStyle === "street") return "urban_exterior";
  if (targetStyle === "resort") return "natural_exterior";
  if (targetStyle === "luxury" || targetStyle === "tailoring") return "architectural_interior";
  if (targetStyle === "editorial") return "architectural_exterior";
  if (targetStyle === "minimal") return "studio_minimal";

  // Default
  return "studio_minimal";
}

// ── Main Resolver ──

export function resolveWorldProfile(args: {
  lockMode?: WorldLockMode;
  extracted?: ExtractedWorldTokens;
  input: LookbookInput;
}): WorldProfile {
  const { lockMode, extracted, input } = args;
  const quietness = deriveWorldQuietness(input);

  // Priority 1: Manual lock
  if (lockMode && lockMode !== "auto") {
    const family = lockMode as WorldFamily;
    const defaults = { ...WORLD_FAMILY_DEFAULTS[family] };

    // Merge extracted detail tokens into the locked family's defaults
    if (extracted) {
      const normalized = normalizeExtractedTokens(extracted, family);
      Object.assign(defaults, normalized);
    }

    return {
      ...defaults,
      family,
      quietness,
      source: "manual_lock",
      sourceNotes: [`locked to ${WORLD_FAMILY_LABELS[family]}`],
    };
  }

  // Priority 2: Gemini raw tokens (confidence-aware)
  if (extracted) {
    const inference = inferWorldFamily(extracted);

    if (inference.confidence !== "low") {
      // Apply objective/style constraints
      const constrainedFamily = constrainByObjectiveAndStyle(inference.family, input);
      const defaults = { ...WORLD_FAMILY_DEFAULTS[constrainedFamily] };
      const normalized = normalizeExtractedTokens(extracted, constrainedFamily);

      const notes: string[] = [];
      if (inference.confidence === "medium") {
        notes.push(`medium-confidence inference: ${inference.family} from extracted tokens`);
      }
      if (constrainedFamily !== inference.family) {
        notes.push(`downgraded from ${WORLD_FAMILY_LABELS[inference.family]} to ${WORLD_FAMILY_LABELS[constrainedFamily]}`);
      }

      return {
        ...defaults,
        ...normalized,
        family: constrainedFamily,
        propDensity: defaults.propDensity,
        interactionLevel: defaults.interactionLevel,
        continuityPriority: defaults.continuityPriority,
        allowedMicroVariations: defaults.allowedMicroVariations,
        quietness,
        source: inference.confidence === "high" ? "gemini_tokens" : "normalized_gemini",
        sourceNotes: notes.length > 0 ? notes : undefined,
      };
    }
    // Low confidence: fall through to Priority 3
  }

  // Priority 3: Normalized mapping from objective/style/family
  const contextFamily = constrainByObjectiveAndStyle(inferFamilyFromContext(input), input);
  const defaults = { ...WORLD_FAMILY_DEFAULTS[contextFamily] };

  // If we had weak extracted tokens, still try to use transferable traits
  if (extracted) {
    const tonal = inferTonalTemperature(extracted.tonalTemperature);
    const lightChar = inferLightingCharacter(extracted.lighting);
    defaults.tonalTemperature = tonal;
    defaults.lightingCharacter = lightChar;
  }

  return {
    ...defaults,
    family: contextFamily,
    quietness,
    source: "normalized_gemini",
    sourceNotes: extracted
      ? ["low-confidence extraction, fell through to style/objective mapping"]
      : undefined,
  };
}

// ── Shot-Level World Slices ──

function getShotRole(shot: RecommendedShot): "anchor" | "contrast" | "release" | "motion" | "detail" | "product_only" {
  const cat = shot.archetype.shotCategory;
  if (cat === "hero") return "anchor";
  if (cat === "product_focus") return "product_only";
  if (cat === "detail") return "detail";

  // Use archetype hints for editorial/motion/silhouette
  const id = shot.archetype.id.toLowerCase();
  if (id.includes("motion") || id.includes("stride") || id.includes("walking")) return "motion";
  if (id.includes("release") || id.includes("relaxed") || id.includes("seated")) return "release";
  return "contrast";
}

export function deriveShotWorldSlice(
  world: WorldProfile,
  shot: RecommendedShot,
  editorialBeat?: EditorialBeat,
): ShotWorldSlice {
  const role = getShotRole(shot);
  const q = world.quietness;

  // Silent: only anchor gets full clause
  if (q === "silent" && role !== "anchor") {
    if (role === "detail" || role === "product_only") {
      return {
        backdropClause: "",
        groundClause: "",
        lightingClause: world.lightingDescription,
      };
    }
    return {
      backdropClause: "same world",
      groundClause: "",
      lightingClause: "consistent light",
    };
  }

  // Quiet: anchor + contrast get clauses, others get shorthand
  // Editorial beat exceptions: breathe/establish get full world, reveal gets minimal
  const beatFallthrough = q === "quiet" && editorialBeat && (
    (editorialBeat === "breathe" && role === "release") ||
    (editorialBeat === "establish" && role === "anchor")
  );
  if (beatFallthrough) {
    // Fall through to the full clause switch below
  } else if (q === "quiet" && role !== "anchor" && role !== "contrast") {
    if (role === "detail") {
      return {
        backdropClause: `same ${world.backdrop.split(" ").slice(-1)[0]} surface`,
        groundClause: "",
        lightingClause: world.lightingDescription,
      };
    }
    if (role === "product_only") {
      return {
        backdropClause: "clean surface",
        groundClause: "",
        lightingClause: world.lightingDescription,
      };
    }
    return {
      backdropClause: `same ${WORLD_FAMILY_LABELS[world.family].toLowerCase()} world`,
      groundClause: "",
      lightingClause: "consistent light",
    };
  }

  // Full clauses by role
  switch (role) {
    case "anchor":
      return {
        backdropClause: world.backdrop,
        groundClause: world.groundPlane,
        lightingClause: world.lightingDescription,
      };

    case "contrast": {
      // ONE alternative from micro-variations
      const variation = world.allowedMicroVariations[0];
      return {
        backdropClause: world.backdrop,
        groundClause: world.groundPlane,
        lightingClause: world.lightingDescription,
        variationClause: variation,
      };
    }

    case "release": {
      // Add interaction if allowed; editorial "breathe" beat strengthens the interaction
      let interactionClause: string | undefined;
      if (world.interactionLevel === "sit_or_lean" || world.interactionLevel === "full_light_interaction") {
        interactionClause = editorialBeat === "breathe"
          ? "model settles into the environment, resting against surface or seated on available element"
          : "model may lean against surface or sit on available element";
      } else if (world.interactionLevel === "lean_only") {
        interactionClause = editorialBeat === "breathe"
          ? "model rests lightly against surface, settling into the space"
          : "model may lean lightly against surface";
      }
      return {
        backdropClause: world.backdrop,
        groundClause: world.groundPlane,
        lightingClause: world.lightingDescription,
        interactionClause,
      };
    }

    case "motion":
      return {
        backdropClause: world.backdrop,
        // Editorial "resolve" beat: motion through the world, not just across it
        groundClause: editorialBeat === "resolve"
          ? `moving through the ${world.groundPlane}`
          : `across the same ${world.groundPlane}`,
        lightingClause: world.lightingDescription,
      };

    case "detail":
      // Editorial "reveal" beat: minimal world, product is the subject
      if (editorialBeat === "reveal") {
        return {
          backdropClause: "soft blur",
          groundClause: "",
          lightingClause: world.lightingDescription,
        };
      }
      return {
        backdropClause: `same ${world.backdrop.split(" ").slice(-1)[0]} surface`,
        groundClause: "",
        lightingClause: world.lightingDescription,
      };

    case "product_only":
      return {
        backdropClause: world.family === "studio_minimal" ? "clean surface" : `same ${world.groundPlane}`,
        groundClause: "",
        lightingClause: world.lightingDescription,
      };

    default:
      return {
        backdropClause: world.backdrop,
        groundClause: world.groundPlane,
        lightingClause: world.lightingDescription,
      };
  }
}
