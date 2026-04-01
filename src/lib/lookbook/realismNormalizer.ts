/**
 * F8: Deterministic Realism Normalizer
 *
 * Code-based normalization layer applied to every provider prompt before
 * display/copy. Inspired by the old prompt-generator pipeline.
 *
 * Four normalization passes:
 *   A. Camera geometry — lock lens, aperture, height, distance
 *   B. Lighting direction — explicit directional setup, campaign-consistent
 *   C. Human realism — gaze, skin, hair, facial asymmetry, anti-mannequin
 *   D. Material realism — highlight rolloff, grain, anti-CGI
 */
import type { ProviderCompilationMode, LightAttitude, LightingConsistencyMode } from "./types";

// ── A. Camera Geometry ──
// Hard-lock camera parameters. No vague "editorial lens family" phrasing.

interface CameraLock {
  lens: string;
  aperture: string;
  height: string;
  distance: string;
}

const CAMERA_ON_BODY: CameraLock = {
  lens: "85mm",
  aperture: "f/5.6",
  height: "chest height",
  distance: "4m",
};

const CAMERA_PRODUCT_ONLY: CameraLock = {
  lens: "90mm macro",
  aperture: "f/8",
  height: "45-degree overhead",
  distance: "0.8m",
};

const CAMERA_DETAIL: CameraLock = {
  lens: "100mm macro",
  aperture: "f/4",
  height: "subject level",
  distance: "0.3m",
};

function getCameraLock(mode: ProviderCompilationMode): CameraLock {
  switch (mode) {
    case "on-body": return CAMERA_ON_BODY;
    case "product-only": return CAMERA_PRODUCT_ONLY;
    case "detail": return CAMERA_DETAIL;
  }
}

export interface CameraOverrides {
  height?: string;
  lens?: string;
  aperture?: string;
  distance?: string;
}

export function compileCameraLock(mode: ProviderCompilationMode, overrides?: CameraOverrides): string {
  const cam = getCameraLock(mode);
  const height = overrides?.height || cam.height;
  const lens = overrides?.lens || cam.lens;
  const aperture = overrides?.aperture || cam.aperture;
  const distance = overrides?.distance || cam.distance;
  if (mode === "detail") {
    return `${lens} ${aperture}, ${height}, shallow depth of field.`;
  }
  if (mode === "product-only") {
    return `${lens} ${aperture}, ${height}, ${distance} distance.`;
  }
  return `${lens} ${aperture}, camera at ${height}, ${distance} from subject.`;
}

// ── B. Lighting Direction ──
// Normalize ambiguous lighting into one explicit directional setup.

interface LightingSetup {
  key: string;
  quality: string;
  temperature: string;
}

const LIGHTING_ON_BODY: LightingSetup = {
  key: "key light camera-right",
  quality: "soft directional, controlled highlights, preserved shadow depth",
  temperature: "natural daylight balance",
};

const LIGHTING_PRODUCT_ONLY: LightingSetup = {
  key: "diffused overhead with gentle camera-left fill",
  quality: "even with soft gradients, no hard shadows",
  temperature: "neutral 5500K",
};

const LIGHTING_DETAIL: LightingSetup = {
  key: "raking light from upper-left",
  quality: "directional to reveal surface texture and grain",
  temperature: "neutral daylight",
};

// ── LightAttitude-aware on-body setups ──
// When no archetype-specific lighting is set, the taste bridge's lightAttitude
// shapes the normalizer's directional lighting rather than using a single default.

const LIGHTING_ON_BODY_BY_ATTITUDE: Record<LightAttitude, LightingSetup> = {
  skin_friendly: {
    key: "key light camera-right with broad fill",
    quality: "soft wrap-around, gentle highlight rolloff, minimal shadow depth",
    temperature: "warm daylight balance",
  },
  sculptural: {
    key: "key light camera-right, tight fill ratio",
    quality: "directional modelling light, pronounced shadow depth, controlled edge",
    temperature: "natural daylight balance",
  },
  neutral: LIGHTING_ON_BODY,
  graphic: {
    key: "hard key light camera-right, minimal fill",
    quality: "high-contrast directional, crisp shadow edges, clean specular",
    temperature: "cool daylight balance",
  },
};

// LightAttitude influence on detail mode: sculptural and graphic shift
// toward more directional raking to reveal surface. Others stay default.
const LIGHTING_DETAIL_BY_ATTITUDE: Partial<Record<LightAttitude, LightingSetup>> = {
  sculptural: {
    key: "steep raking light from upper-left",
    quality: "strongly directional to reveal construction depth and surface relief",
    temperature: "neutral daylight",
  },
  graphic: {
    key: "raking light from upper-left, hard edge",
    quality: "high-contrast directional, sharp texture reveal",
    temperature: "neutral daylight",
  },
};

function getLightingSetup(mode: ProviderCompilationMode, lightAttitude?: LightAttitude): LightingSetup {
  if (lightAttitude && mode === "on-body") {
    return LIGHTING_ON_BODY_BY_ATTITUDE[lightAttitude];
  }
  if (lightAttitude && mode === "detail") {
    const override = LIGHTING_DETAIL_BY_ATTITUDE[lightAttitude];
    if (override) return override;
  }
  switch (mode) {
    case "on-body": return LIGHTING_ON_BODY;
    case "product-only": return LIGHTING_PRODUCT_ONLY;
    case "detail": return LIGHTING_DETAIL;
  }
}

/**
 * Extract a directional hint from archetype-specific lighting text.
 * Returns a short positional phrase (e.g. "from camera-right", "backlit edge")
 * or null if no confident direction can be extracted.
 */
function extractDirectionHint(archetypeLighting: string): string | null {
  const lower = archetypeLighting.toLowerCase();
  // Match explicit directional phrases
  const patterns: [RegExp, string][] = [
    [/\bbackl(?:it|ight)\b/, "backlit edge"],
    [/\braking\s+light\s+from\s+([\w-]+)/, "raking from $1"],
    [/\bfrom\s+(camera[- ](?:right|left)|upper[- ](?:left|right))/, "from $1"],
    [/\bcamera[- ](right|left)\b/, "from camera-$1"],
    [/\bupper[- ](left|right)\b/, "from upper-$1"],
    [/\boverhead\b/, "overhead"],
    [/\bwindow\s+light\b/, "window light"],
    [/\bedge\s+light\b/, "edge light"],
    [/\brim\s+light\b/, "rim light"],
    [/\bside\s+light\b/, "side light"],
  ];
  for (const [regex, template] of patterns) {
    const match = lower.match(regex);
    if (match) {
      return template.replace(/\$1/g, match[1] || "");
    }
  }
  return null;
}

export function compileLightingLock(
  mode: ProviderCompilationMode,
  lightingOverride?: string,
  lightAttitude?: LightAttitude,
  lightingConsistency?: LightingConsistencyMode,
): string {
  const consistency = lightingConsistency ?? "guided";

  // Free mode: archetype lighting replaces everything (legacy behavior)
  if (consistency === "free" && lightingOverride) {
    return lightingOverride;
  }

  // Get the DNA-level lighting (quality, temperature, key direction)
  const light = getLightingSetup(mode, lightAttitude);

  // Strict mode: ignore archetype lighting entirely
  if (consistency === "strict" || !lightingOverride) {
    return `${light.key}, ${light.quality}, ${light.temperature}.`;
  }

  // Guided mode: extract direction hint from archetype, compose with DNA quality/temperature
  const hint = extractDirectionHint(lightingOverride);
  if (hint) {
    return `${light.key} with ${hint} emphasis, ${light.quality}, ${light.temperature}.`;
  }

  // No extractable direction: fall back to DNA lighting only
  return `${light.key}, ${light.quality}, ${light.temperature}.`;
}

// ── C. Human Realism ──
// Anti-AI cues for on-body shots. Reduces mannequin-perfect rendering.

const GAZE_OVERRIDE = "Eyes focused slightly past the camera, soft gaze.";

const FACIAL_REALISM = [
  "Natural facial micro-asymmetry in eyelids and lips",
  "visible skin texture with pores and subtle tonal variation",
  "calm editorial expression with natural muscle tension",
].join(", ") + ".";

const HAIR_REALISM = "Natural hair with irregular strands and fine edge detail at hairline. Slight movement.";

// Compressed variants for hero/anchor shots where identity lock takes prompt budget priority
const FACIAL_REALISM_COMPRESSED = "Natural skin texture, subtle asymmetry, calm expression.";
const HAIR_REALISM_COMPRESSED = "Natural hair, colour and parting match reference.";
const MATERIAL_REALISM_COMPRESSED = "Natural material texture, controlled sheen, realistic drape.";

const GAZE_MOTION = "Eyes looking in direction of movement, natural and engaged.";

const FACIAL_MOTION = [
  "Natural facial micro-asymmetry in eyelids and lips",
  "visible skin texture with pores and subtle tonal variation",
  "relaxed expression with natural movement energy",
].join(", ") + ".";

const HAIR_MOTION = "Natural hair responding to movement, strands lifting slightly with momentum.";

export function compileHumanRealismBlock(isMotion?: boolean, gazeDirection?: string, compressed?: boolean): string {
  // Use shot-specific gaze when available, otherwise fall back to defaults
  const gaze = gazeDirection
    ? `${gazeDirection}.`
    : isMotion ? GAZE_MOTION : GAZE_OVERRIDE;

  if (isMotion) {
    return [gaze, FACIAL_MOTION, HAIR_MOTION].join(" ");
  }
  if (compressed) {
    return [gaze, FACIAL_REALISM_COMPRESSED, HAIR_REALISM_COMPRESSED].join(" ");
  }
  return [gaze, FACIAL_REALISM, HAIR_REALISM].join(" ");
}

export function compileHumanRealismNegatives(): string {
  return "fixed AI stare, direct lens stare, perfect bilateral symmetry, plastic-smooth skin, helmet hair, uniform hair edges, mannequin posture, rigid symmetry";
}

// ── D. Material Realism ──
// Anti-CGI cues for leather, metal, fabric.

const MATERIAL_CUES: Record<string, string> = {
  leather: "Natural highlight rolloff on leather surface. Visible grain and micro-texture variation.",
  metal: "Metal catches directional light naturally. Visible surface micro-imperfections at macro scale.",
  fabric: "Visible thread and weave pattern under light. Natural drape following gravity.",
  generic: "Natural material surface with visible micro-texture. Controlled specular highlights.",
};

export function compileMaterialRealism(materialHint?: string): string {
  if (!materialHint) return MATERIAL_CUES.generic;

  const hint = materialHint.toLowerCase();
  if (hint.includes("leather") || hint.includes("suede") || hint.includes("nubuck")) {
    return MATERIAL_CUES.leather;
  }
  if (hint.includes("metal") || hint.includes("gold") || hint.includes("silver") || hint.includes("brass")) {
    return MATERIAL_CUES.metal;
  }
  if (hint.includes("canvas") || hint.includes("nylon") || hint.includes("fabric") || hint.includes("cotton") || hint.includes("wool")) {
    return MATERIAL_CUES.fabric;
  }
  return MATERIAL_CUES.generic;
}

export function compileMaterialRealismNegatives(): string {
  return "CGI smoothness, rubbery deformation, chrome-mirror perfection, over-clean render";
}

// ── Exposure & Color Grade ──

export const EXPOSURE_CONTROL = "Exposure balanced for natural photography. Controlled highlights preserving surface detail. Shadow areas retain natural depth.";

// ── Main Normalizer ──

export interface NormalizerConfig {
  mode: ProviderCompilationMode;
  /** Material hint from fingerprint (e.g. "smooth cognac leather") */
  materialHint?: string;
  /** Whether to include human realism cues (on-body only) */
  includeHumanRealism: boolean;
  /** Override the default camera height for this shot (e.g. "waist height") */
  cameraHeight?: string;
  /** Override the default lens for this shot (e.g. "35mm") */
  cameraLens?: string;
  /** Override the default aperture for this shot (e.g. "f/2.8") */
  cameraAperture?: string;
  /** Override the default camera distance for this shot (e.g. "~1.5m") */
  cameraDistance?: string;
  /** Override the default lighting with archetype-specific direction */
  lightingDirection?: string;
  /** Taste bridge light attitude: shapes normalizer lighting defaults when no archetype override exists */
  lightAttitude?: LightAttitude;
  /** Controls how archetype lighting blends with DNA lighting (strict/guided/free) */
  lightingConsistency?: LightingConsistencyMode;
  /** True when the shot involves walking, turning, or other body motion */
  isMotionShot?: boolean;
  /** Shot-specific gaze/head direction from the archetype (e.g. "Looking off-camera or down") */
  gazeDirection?: string;
  /**
   * Compression level for realism prose. "compressed" saves ~25 words by
   * shortening human/hair/material cues and dropping exposure control.
   * Used for hero/anchor shots where identity lock takes prompt budget priority.
   */
  compressionLevel?: "full" | "compressed";
}

/**
 * Generate a normalised realism block to insert into the positive prompt.
 * This replaces the old style-keyed REALISM_ANCHORS with deterministic,
 * physically-grounded direction.
 */
export function normalizePositive(config: NormalizerConfig): string {
  const blocks: string[] = [];
  const compressed = config.compressionLevel === "compressed";

  // Camera (use shot-specific overrides when provided)
  blocks.push(compileCameraLock(config.mode, {
    height: config.cameraHeight,
    lens: config.cameraLens,
    aperture: config.cameraAperture,
    distance: config.cameraDistance,
  }));

  // Lighting (guided: blend archetype direction with DNA quality/temperature; strict: DNA only; free: archetype replaces all)
  blocks.push(compileLightingLock(config.mode, config.lightingDirection, config.lightAttitude, config.lightingConsistency));

  // Human realism (on-body only, motion-aware, compression-aware)
  if (config.includeHumanRealism && config.mode === "on-body") {
    blocks.push(compileHumanRealismBlock(config.isMotionShot, config.gazeDirection, compressed));
  }

  // Material realism (compression-aware)
  if (compressed) {
    blocks.push(MATERIAL_REALISM_COMPRESSED);
  } else {
    blocks.push(compileMaterialRealism(config.materialHint));
  }

  // Exposure (skip for compressed to save prompt budget)
  if (!compressed) {
    blocks.push(EXPOSURE_CONTROL);
  }

  return blocks.join(" ");
}

/**
 * Generate normalised negative prompt additions.
 */
export function normalizeNegative(config: NormalizerConfig): string {
  const parts: string[] = [];

  if (config.includeHumanRealism && config.mode === "on-body") {
    parts.push(compileHumanRealismNegatives());
  }

  parts.push(compileMaterialRealismNegatives());

  return parts.join(", ");
}
