import type { WorldPreset } from "./types";

/**
 * @deprecated Replaced by the structured WorldProfile system in worldProfiles.ts.
 * The 4-preset approach discards raw Gemini tokens and forces every reference
 * into hardcoded values. Use resolveWorldProfile() instead.
 *
 * Kept temporarily for reference. Do not import in new code.
 */
export const WORLD_PRESETS: WorldPreset[] = [
  {
    id: "neutral_studio",
    label: "Neutral Studio",
    tokens: {
      backdrop: "seamless grey backdrop, clean floor",
      lighting: "even soft lighting, minimal shadows",
      tonalTemperature: "neutral",
      styling: "clean minimal, dark or neutral tones",
    },
  },
  {
    id: "warm_editorial",
    label: "Warm Editorial",
    tokens: {
      backdrop: "warm concrete wall, matte grey floor",
      lighting: "key light camera-right, soft warm",
      tonalTemperature: "warm neutral",
      styling: "earth tones, tailored, textured fabrics",
    },
  },
  {
    id: "cool_modern",
    label: "Cool Modern",
    tokens: {
      backdrop: "dark slate wall, polished concrete",
      lighting: "hard directional, cool 5500K",
      tonalTemperature: "cool neutral",
      styling: "monochrome, structured, minimal",
    },
  },
  {
    id: "natural_light",
    label: "Natural Light",
    tokens: {
      backdrop: "light plaster wall, wood floor",
      lighting: "window camera-left, daylight",
      tonalTemperature: "warm daylight",
      styling: "relaxed, linen and cotton, organic palette",
    },
  },
];
