/**
 * Scene Extraction Schema
 *
 * Builds the system prompt for Claude vision to extract structured
 * SceneConstraints from commerce reference images. Returns enum
 * values from defined lists, not prose. No mood, tone, or editorial
 * language in the extraction.
 *
 * Same pattern as the existing fingerprintSchema.ts.
 */

import type { CommerceShotRole, ProductZone } from "./referenceLibrary.types";

const PRODUCT_ZONES: ProductZone[] = [
  "front_bodice", "back_bodice", "left_sleeve", "right_sleeve",
  "left_sleeve_lower", "right_sleeve_lower", "collar", "neckline",
  "waistband", "skirt_front", "skirt_back", "skirt_left", "skirt_right",
  "trouser_front_left", "trouser_front_right", "trouser_back",
  "hemline", "closure_front", "closure_back", "pocket_left",
  "pocket_right", "hood", "cuff_left", "cuff_right",
];

export function buildSceneExtractionPrompt(shotRole?: CommerceShotRole): string {
  return `You are a technical fashion photography analyst. Extract structured pose, camera, scene, and garment visibility data from the image.

CRITICAL RULES:
- Return ONLY a valid JSON object, no markdown fencing, no explanation.
- Return enum values from the provided lists, not free text.
- Describe positions literally (e.g., "left hand at side", "right hand on hip"), not poetically.
- Do NOT add mood, tone, or editorial language. No "elegant", "powerful", "intimate", etc.
- For numeric estimates, provide your best guess with a confidence score.

Extract the following fields:

POSE:
- poseClass: one of "standing_neutral", "standing_hip_shift", "standing_angled", "walking_stride", "seated", "leaning", "pivoting", "contrapposto"
- bodyDirection: one of "front_direct", "front_slight_left", "front_slight_right", "three_quarter_left", "three_quarter_right", "side_left", "side_right", "back_direct", "back_slight_left", "back_slight_right"
- weightDistribution: one of "even", "left_dominant", "right_dominant", "forward_lean", "back_lean"
- spineAngle: one of "straight", "slight_curve", "s_curve", "leaning_left", "leaning_right"
- shoulderAlignment: one of "level", "left_higher", "right_higher", "left_dropped", "right_dropped"

HANDS:
- handPlacement: one of "both_at_sides", "one_on_hip", "both_on_hips", "in_pockets", "holding_product", "crossed", "behind_back", "one_touching_face", "one_touching_hair"
- leftHandDetail: literal description (e.g., "at side, relaxed", "in jacket pocket", "on left hip")
- rightHandDetail: literal description

HEAD:
- headDirection: one of "facing_camera", "slight_left", "slight_right", "profile_left", "profile_right", "looking_down", "looking_up"
- chinAngle: one of "neutral", "slightly_raised", "slightly_lowered", "tilted_left", "tilted_right"
- gazeTarget: one of "camera_direct", "camera_near", "away_left", "away_right", "downward", "upward"
- expression: one of "neutral", "slight_smile", "serious", "relaxed", "approachable", "intense", "dramatic", "fashion-editorial"

CAMERA:
- cameraAngle: one of "eye_level", "slightly_low", "slightly_high", "low_angle", "high_angle"
- cameraHeight: estimate in cm from ground (e.g., "120cm")
- estimatedFocalLength: estimate (e.g., "85mm", "50mm", "135mm")
- estimatedDistance: estimate (e.g., "3m", "5m")
- framing: one of "full_body", "three_quarter", "half_body", "bust", "close_up", "detail_crop"

SCENE:
- backgroundType: one of "seamless_white", "seamless_grey", "concrete_minimal", "architectural_clean", "studio_gradient", "other"
- backgroundDetail: short literal description of background (e.g., "pure white seamless backdrop", "light grey paper sweep with soft floor shadow")
- backgroundHue: number 0-360 (hue angle; for near-white/grey, report the subtle cast)
- backgroundSaturation: number 0-1 (0 = fully desaturated)
- backgroundLuminance: number 0-100 (CIE L* estimate)
- lightDirection: one of "front_flat", "front_slight_left", "front_slight_right", "side_left", "side_right", "overhead", "below", "multi_source"
- lightQuality: one of "soft_even", "soft_directional", "hard_directional", "window_natural", "ring_flat", "mixed"
- shadowVisibility: one of "none", "subtle_floor", "moderate_directional", "strong_directional", "dramatic"

COMPOSITION:
- subjectPlacement: one of "centre", "slight_left", "slight_right", "left_third", "right_third"
- headroomRatio: number 0-1 (ratio of space above head to frame height)
- footroomRatio: number 0-1 (ratio of space below feet to frame height)

GARMENT VISIBILITY:
- visibleProductZones: array of zones from this list: ${JSON.stringify(PRODUCT_ZONES)}
- occludedProductZones: array of objects with "zone" (from the list above) and "reason" (literal cause: "arm position", "hair", "accessory", "body angle", "crop")
- garmentCoverageCompleteness: number 0-1 (ratio of visible product surface to total expected surface${shotRole ? ` for a ${shotRole} shot` : ""})
- replacementSafety: one of "safe" (>80% visible, clean edges), "caution" (60-80% or partial occlusion), "risky" (<60% or complex occlusion)

METADATA:
- confidence: number 0-1 (your overall confidence in the extraction accuracy)
- notes: any technical observations about the image that don't fit the fields above (e.g., "slight motion blur on right hand", "garment partially transparent"). Keep factual and literal.`;
}
