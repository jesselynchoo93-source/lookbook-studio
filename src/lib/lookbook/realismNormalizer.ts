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
import type { ProviderCompilationMode } from "./types";

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

export function compileCameraLock(mode: ProviderCompilationMode): string {
  const cam = getCameraLock(mode);
  if (mode === "detail") {
    return `${cam.lens} ${cam.aperture}, ${cam.height}, shallow depth of field.`;
  }
  if (mode === "product-only") {
    return `${cam.lens} ${cam.aperture}, ${cam.height}, ${cam.distance} distance.`;
  }
  return `${cam.lens} ${cam.aperture}, camera at ${cam.height}, ${cam.distance} from subject.`;
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

function getLightingSetup(mode: ProviderCompilationMode): LightingSetup {
  switch (mode) {
    case "on-body": return LIGHTING_ON_BODY;
    case "product-only": return LIGHTING_PRODUCT_ONLY;
    case "detail": return LIGHTING_DETAIL;
  }
}

export function compileLightingLock(mode: ProviderCompilationMode): string {
  const light = getLightingSetup(mode);
  return `${light.key}, ${light.quality}, ${light.temperature}.`;
}

// ── C. Human Realism ──
// Anti-AI cues for on-body shots. Reduces mannequin-perfect rendering.

const GAZE_OVERRIDE = "Eyes focused slightly past the camera, not directly into the lens.";

const FACIAL_REALISM = [
  "Natural facial micro-asymmetry in eyelids and lips",
  "visible skin texture with pores and subtle tonal variation",
  "calm editorial expression with natural muscle tension",
].join(", ") + ".";

const HAIR_REALISM = "Natural hair with irregular strands and fine edge detail at hairline. Slight movement. Avoid uniform or overly perfect hair edges.";

const SKIN_REALISM = "Natural skin tone variation, not airbrushed. Controlled highlights on skin, subtle warmth on illuminated surfaces, slightly cooler shadows.";

const BODY_REALISM = "Believable weight distribution and body balance. Natural posture, grounded stance.";

export function compileHumanRealismBlock(): string {
  return [
    GAZE_OVERRIDE,
    FACIAL_REALISM,
    HAIR_REALISM,
  ].join(" ");
}

export function compileHumanRealismNegatives(): string {
  return "fixed AI stare, direct lens stare, perfect bilateral symmetry, plastic-smooth skin, helmet hair, uniform hair edges, mannequin posture, rigid symmetry";
}

// ── D. Material Realism ──
// Anti-CGI cues for leather, metal, fabric.

const MATERIAL_CUES: Record<string, string> = {
  leather: "Natural highlight rolloff on leather surface. Visible grain and micro-texture variation. No rubbery deformation, no CGI smoothness.",
  metal: "Metal catches directional light naturally. Visible surface micro-imperfections at macro scale. No chrome-mirror perfection.",
  fabric: "Visible thread and weave pattern under light. Natural drape following gravity. No CGI-flat cloth.",
  generic: "Natural material surface with visible micro-texture. Controlled specular highlights. No CGI smoothness.",
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
  return "CGI smoothness, rubbery deformation, chrome-mirror perfection, over-clean render, washed-out HDR";
}

// ── Exposure & Color Grade ──

export const EXPOSURE_CONTROL = "Exposure balanced for natural photography. Highlights remain controlled with no blown-out surfaces. Shadow areas retain natural depth without artificial lifting.";

export const COLOR_GRADE = "Natural cinematic contrast with rich midtones, controlled highlights, and preserved shadow depth. Subtle warm tones on illuminated surfaces, slightly cooler shadows.";

// ── Main Normalizer ──

export interface NormalizerConfig {
  mode: ProviderCompilationMode;
  /** Material hint from fingerprint (e.g. "smooth cognac leather") */
  materialHint?: string;
  /** Whether to include human realism cues (on-body only) */
  includeHumanRealism: boolean;
}

/**
 * Generate a normalised realism block to insert into the positive prompt.
 * This replaces the old style-keyed REALISM_ANCHORS with deterministic,
 * physically-grounded direction.
 */
export function normalizePositive(config: NormalizerConfig): string {
  const blocks: string[] = [];

  // Camera
  blocks.push(compileCameraLock(config.mode));

  // Lighting
  blocks.push(compileLightingLock(config.mode));

  // Human realism (on-body only)
  if (config.includeHumanRealism && config.mode === "on-body") {
    blocks.push(compileHumanRealismBlock());
  }

  // Material realism
  blocks.push(compileMaterialRealism(config.materialHint));

  // Exposure
  blocks.push(EXPOSURE_CONTROL);

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
