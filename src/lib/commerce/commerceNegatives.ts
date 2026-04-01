/**
 * Commerce Negatives
 *
 * Commerce-specific negative prompt terms. Stricter than editorial
 * negatives because commerce prompts must prevent any drift from
 * the reference image.
 */

// ── Background Drift ──

const BACKGROUND_DRIFT = [
  "colored background",
  "textured wall",
  "outdoor scene",
  "gradient backdrop",
  "environmental context",
  "patterned background",
  "busy background",
  "natural setting",
  "street scene",
  "interior setting",
  "window view",
  "plant",
  "furniture",
  "props",
  "darker background than reference",
  "dimmer lighting than reference",
  "underexposed background",
];

// ── Pose Drift ──

const POSE_DRIFT = [
  "different pose than reference",
  "editorial gesture",
  "dramatic angle",
  "fashion-forward posing",
  "exaggerated pose",
  "jumping",
  "running",
  "dance pose",
  "unusual body angle",
  "crossed legs different from reference",
];

// ── Lighting Drift ──

const LIGHTING_DRIFT = [
  "harsh shadows",
  "colored lighting",
  "moody atmosphere",
  "rim light",
  "backlight",
  "neon light",
  "colored gel",
  "dramatic lighting",
  "spotlight",
  "lens flare",
  "light leak",
];

// ── Editorial Contamination ──

const EDITORIAL_CONTAMINATION = [
  "artistic blur",
  "grain",
  "vintage filter",
  "mood lighting",
  "dramatic composition",
  "cinematic",
  "film grain",
  "vignette",
  "bokeh",
  "tilt-shift",
  "double exposure",
  "motion blur",
  "long exposure",
  "desaturated",
  "cross-processed",
];

// ── Garment Hallucination ──

const GARMENT_HALLUCINATION = [
  "extra clothing",
  "additional accessories",
  "jewelry not in reference",
  "scarf",
  "hat",
  "sunglasses",
  "belt not in reference",
  "different shoes",
  "layered clothing not in reference",
];

// ── Identity Drift ──

const IDENTITY_DRIFT = [
  "different face",
  "different skin tone",
  "different hair",
  "different body proportions",
  "aged appearance",
  "different ethnicity",
];

// ── Combined Commerce Negatives ──

export const COMMERCE_NEGATIVES: string[] = [
  ...BACKGROUND_DRIFT,
  ...POSE_DRIFT,
  ...LIGHTING_DRIFT,
  ...EDITORIAL_CONTAMINATION,
  ...GARMENT_HALLUCINATION,
  ...IDENTITY_DRIFT,
];

/**
 * Build the full negative prompt string for a commerce shot.
 * Combines all commerce-specific negatives into a single string.
 */
export function buildCommerceNegativePrompt(): string {
  return COMMERCE_NEGATIVES.join(", ");
}
