/**
 * World refinement by TasteBridge.
 *
 * Same world family can resolve to different backdrop/ground/lighting
 * depending on the product's taste bridge. A fluid silk dress and a
 * structured wool blazer both in architectural_interior should feel
 * visibly different.
 *
 * Only applies when world source is "normalized_gemini" or "preset_fallback".
 * Manual locks and high-confidence Gemini extractions are preserved.
 *
 * Word budget: backdrop <= 5 words, groundPlane <= 5 words,
 * lightingDescription <= 8 words (matching normalizeExtractedTokens discipline).
 */
import type {
  WorldFamily,
  WorldTone,
  TasteBridge,
  WorldProfile,
  TonalTemperature,
  LightingCharacter,
} from "./types";

interface WorldRefinement {
  backdrop?: string;
  groundPlane?: string;
  lightingDescription?: string;
  tonalTemperature?: TonalTemperature;
  lightingCharacter?: LightingCharacter;
}

const TASTE_WORLD_REFINEMENTS: Partial<Record<WorldFamily, Partial<Record<WorldTone, WorldRefinement>>>> = {

  // ── architectural_interior (most common, most important) ──
  architectural_interior: {
    soft: {
      backdrop: "warm plaster wall with filtered daylight",
      groundPlane: "pale limestone floor",
      tonalTemperature: "warm",
      lightingDescription: "soft filtered interior daylight, gentle fill",
      lightingCharacter: "soft_even",
    },
    sharp: {
      backdrop: "clean stone wall with geometric shadow",
      groundPlane: "polished concrete floor",
      tonalTemperature: "cool",
      lightingDescription: "sculptural directional daylight, crisp edges",
      lightingCharacter: "directional_daylight",
    },
    intimate: {
      backdrop: "textured warm plaster, close wall",
      groundPlane: "worn stone floor",
      tonalTemperature: "warm",
      lightingDescription: "soft side window light, shallow depth",
      lightingCharacter: "window_light",
    },
    monumental: {
      backdrop: "tall stone wall, high ceiling",
      groundPlane: "polished stone floor",
      tonalTemperature: "neutral",
      lightingDescription: "overhead directional daylight, architectural scale",
      lightingCharacter: "directional_daylight",
    },
    airy: {
      backdrop: "light plaster wall, open space",
      groundPlane: "light wood or pale stone",
      tonalTemperature: "neutral",
      lightingDescription: "diffused daylight from large windows",
      lightingCharacter: "soft_even",
    },
    urban_raw: {
      backdrop: "exposed concrete or brick wall",
      groundPlane: "raw concrete floor",
      tonalTemperature: "cool",
      lightingDescription: "mixed directional daylight, harder edges",
      lightingCharacter: "hard_directional",
    },
  },

  // ── studio_minimal ──
  studio_minimal: {
    soft: {
      backdrop: "warm grey seamless backdrop",
      lightingDescription: "soft diffused overhead, gentle wraparound fill",
      lightingCharacter: "soft_even",
      tonalTemperature: "warm",
    },
    sharp: {
      backdrop: "cool grey seamless backdrop",
      lightingDescription: "directional key with controlled shadow",
      lightingCharacter: "soft_directional",
      tonalTemperature: "cool",
    },
    intimate: {
      backdrop: "dark warm seamless backdrop",
      lightingDescription: "soft side light, intimate falloff",
      lightingCharacter: "soft_directional",
      tonalTemperature: "warm",
    },
    airy: {
      backdrop: "bright white seamless backdrop",
      lightingDescription: "even diffused overhead, clean fill",
      lightingCharacter: "soft_even",
      tonalTemperature: "neutral",
    },
    urban_raw: {
      backdrop: "dark charcoal seamless backdrop",
      lightingDescription: "high contrast directional key light",
      lightingCharacter: "hard_directional",
      tonalTemperature: "cool",
    },
  },

  // ── architectural_exterior ──
  architectural_exterior: {
    soft: {
      backdrop: "warm stone facade, gentle daylight",
      groundPlane: "pale paved courtyard",
      lightingDescription: "soft open shade, warm bounce light",
      tonalTemperature: "warm",
      lightingCharacter: "overcast_outdoor",
    },
    sharp: {
      backdrop: "geometric concrete facade, hard shadow",
      groundPlane: "polished stone paving",
      lightingDescription: "direct sunlight with sharp architectural shadows",
      tonalTemperature: "cool",
      lightingCharacter: "hard_directional",
    },
    monumental: {
      backdrop: "tall stone columns or facade",
      groundPlane: "wide stone steps or plaza",
      lightingDescription: "overhead sun, strong vertical shadows",
      tonalTemperature: "neutral",
      lightingCharacter: "directional_daylight",
    },
    airy: {
      backdrop: "light rendered wall, open sky",
      groundPlane: "light paving or terrace",
      lightingDescription: "bright overcast daylight, even exposure",
      tonalTemperature: "neutral",
      lightingCharacter: "overcast_outdoor",
    },
  },

  // ── furnished_interior ──
  furnished_interior: {
    soft: {
      backdrop: "warm neutral room, soft furnishings",
      groundPlane: "wooden floor or warm rug",
      lightingDescription: "window light with warm interior fill",
      tonalTemperature: "warm",
      lightingCharacter: "window_light",
    },
    sharp: {
      backdrop: "minimal dark furniture, clean lines",
      groundPlane: "dark wood or polished floor",
      lightingDescription: "directional window light, controlled shadow",
      tonalTemperature: "cool",
      lightingCharacter: "soft_directional",
    },
    intimate: {
      backdrop: "close warm interior, textured wall",
      groundPlane: "worn wood floor or soft rug",
      lightingDescription: "low side light, warm intimate glow",
      tonalTemperature: "warm",
      lightingCharacter: "window_light",
    },
  },

  // ── urban_exterior ──
  urban_exterior: {
    sharp: {
      backdrop: "clean concrete wall or storefront",
      groundPlane: "dark asphalt or paving",
      lightingDescription: "hard directional daylight, urban shadow",
      tonalTemperature: "cool",
      lightingCharacter: "hard_directional",
    },
    urban_raw: {
      backdrop: "raw brick or industrial wall",
      groundPlane: "worn pavement or concrete",
      lightingDescription: "mixed hard light, gritty urban contrast",
      tonalTemperature: "cool",
      lightingCharacter: "hard_directional",
    },
    airy: {
      backdrop: "open street or wide sidewalk",
      groundPlane: "clean pavement",
      lightingDescription: "bright overcast urban daylight",
      tonalTemperature: "neutral",
      lightingCharacter: "overcast_outdoor",
    },
  },

  // ── natural_exterior ──
  natural_exterior: {
    soft: {
      backdrop: "soft greenery or meadow edge",
      groundPlane: "grass or soft earth path",
      lightingDescription: "dappled shade, warm natural light",
      tonalTemperature: "warm",
      lightingCharacter: "soft_directional",
    },
    airy: {
      backdrop: "open landscape or beach edge",
      groundPlane: "sand or pale earth",
      lightingDescription: "bright open daylight, natural fill",
      tonalTemperature: "neutral",
      lightingCharacter: "overcast_outdoor",
    },
    intimate: {
      backdrop: "dense foliage or garden wall",
      groundPlane: "mossy ground or leaf litter",
      lightingDescription: "filtered canopy light, warm tones",
      tonalTemperature: "warm",
      lightingCharacter: "soft_directional",
    },
  },
};

/**
 * Refine a resolved WorldProfile using the product's taste bridge.
 *
 * Only applies to auto-resolved worlds (normalized_gemini, preset_fallback).
 * Manual locks and high-confidence Gemini extractions are preserved as-is.
 */
export function refineWorldByTasteBridge(
  world: WorldProfile,
  taste: TasteBridge,
): WorldProfile {
  // Respect user/Gemini-chosen specifics
  if (world.source === "manual_lock" || world.source === "gemini_tokens") {
    return world;
  }

  const familyRefinements = TASTE_WORLD_REFINEMENTS[world.family];
  if (!familyRefinements) return world;

  const refinement = familyRefinements[taste.worldTone];
  if (!refinement) return world;

  return {
    ...world,
    ...refinement,
  };
}
