// Realism rulebook for Higgsfield / Nano Banana Pro.

export interface RuleSection {
  section: string;
  rules: string[];
  avoid: string[];
}

export const REALISM_RULEBOOK: RuleSection[] = [
  {
    section: "camera",
    rules: [
      "Lock the camera on a tripod at chest height for full-body shots.",
      "Use 85mm as the default lens for full-body editorial.",
      "Use f/5.6 as the baseline aperture for full-body clarity.",
      "Position the camera approximately 4 meters from the subject for full-body shots.",
      "Allow slight upward angle only when it supports fashion perspective.",
      "Use natural optical falloff, not artificially exaggerated blur.",
      "For detail crops, tighter apertures like f/2.8 or f/4 are acceptable.",
      "For half-body and portrait shots, 2 meters is a typical distance.",
    ],
    avoid: [
      "Extreme dutch angles or tilted horizon lines.",
      "Drone or overhead perspectives for fashion editorial.",
      "Fish-eye or ultra-wide distortion.",
      "Exaggerated bokeh that looks digital or painted.",
    ],
  },
  {
    section: "lighting",
    rules: [
      "Default to soft directional natural light from camera-right.",
      "Late-morning or golden-hour quality light is the safest baseline.",
      "Preserve controlled highlights with visible specular detail.",
      "Maintain shadow depth without crushing to black.",
      "Use natural bounce fill to open shadows gently.",
      "For detail shots, even directional light helps show texture.",
    ],
    avoid: [
      "Neon, mixed colour temperature, or theatrical lighting.",
      "Flat HDR with lifted shadows and no contrast.",
      "Blown-out surfaces with no highlight detail.",
      "Synthetic CGI lighting descriptions.",
      "Over-bright exposure that washes out fabric texture.",
    ],
  },
  {
    section: "face",
    rules: [
      "Natural skin texture with visible pores and subtle tonal variation.",
      "Eyes focused slightly past the camera for editorial feel.",
      "Allow subtle asymmetry in facial features.",
      "Relaxed, non-performative expression.",
    ],
    avoid: [
      "Fixed AI stare directly into the lens.",
      "Perfect bilateral facial symmetry.",
      "Plastic or porcelain skin texture.",
      "Beauty-retouch language that flattens skin detail.",
    ],
  },
  {
    section: "body",
    rules: [
      "Feet grounded with natural weight distribution.",
      "Correct finger count and natural joint angles.",
      "Natural body balance and asymmetry.",
      "Relaxed shoulders, not tensed or lifted.",
      "Hands visible with purposeful placement.",
    ],
    avoid: [
      "Warped anatomy or impossible joint positions.",
      "Floating or disconnected feet.",
      "Identical mirrored limb positions.",
      "Generic hands-in-pockets filler on every shot.",
    ],
  },
  {
    section: "hair",
    rules: [
      "Natural hair with irregular strands and fine edge detail.",
      "Individual flyaway hairs visible at the silhouette edge.",
      "Hair responds to wind or motion when motion is present.",
    ],
    avoid: [
      "Helmet-like solid hair masses.",
      "Perfectly smooth hair edges with no irregularity.",
      "Hair that looks like a 3D render rather than real strands.",
    ],
  },
  {
    section: "branding",
    rules: [
      "Preserve all visible logos and printed text with full legibility.",
      "Printed text should follow the natural contour of the fabric.",
      "Minor curvature from body shape is acceptable and realistic.",
      "Logo-heavy products should prefer front-facing, visibility-safe shots.",
    ],
    avoid: [
      "Mirrored, reversed, or flipped text.",
      "Pseudo-text or fake typography that resembles but does not match the brand.",
      "Destructive distortion that makes logos unreadable.",
      "Simplification or stylisation of brand marks.",
    ],
  },
  {
    section: "promptDiscipline",
    rules: [
      "Use practical photography direction, not cinematic language.",
      "One person per shot unless the brief explicitly requires multiple.",
      "Keep the garment consistent across the set.",
      "Reference real photography terms: aperture, focal length, camera height.",
      "Keep shot briefs concise and directive.",
    ],
    avoid: [
      "Cinematic fluff: 'epic', 'masterpiece', 'breathtaking', 'stunning'.",
      "Repetitive generic filler: 'standing confidently', 'looking stylish'.",
      "Fantasy or supernatural elements.",
      "Contradictory directions in the same brief.",
      "Over-description that confuses the model.",
    ],
  },
];

export const NEGATIVE_DEFAULTS =
  "distorted logos, pseudo-text, fake typography, mirrored text, plastic skin, " +
  "perfect facial symmetry, fixed AI stare, direct lens stare, overly smooth textures, " +
  "warped anatomy, exaggerated bokeh, CGI lighting, artificial background, " +
  "washed-out HDR, over-bright exposure, flat contrast, lifted shadows";

export function getRealismProfile(style: string): string {
  if (style === "editorial" || style === "avant_garde") {
    return "Editorial realism: natural skin, controlled lighting, allow expressive poses. " +
      "Slightly wider creative latitude on composition while maintaining physical believability.";
  }
  if (style === "luxury" || style === "tailoring") {
    return "Premium realism: pristine fabric rendering, controlled highlights, precise branding. " +
      "Clean backgrounds with subtle depth. Every detail must look considered.";
  }
  if (style === "street" || style === "contemporary") {
    return "Urban realism: natural environmental context, relaxed body language, organic lighting. " +
      "Texture and grain are acceptable. Avoid over-polished studio feel.";
  }
  if (style === "minimal") {
    return "Clean realism: simple composition, neutral tones, minimal distractions. " +
      "Product and model are the sole focus. Negative space is a feature.";
  }
  return "Standard editorial realism: natural light, grounded anatomy, controlled fabric rendering. " +
    "85mm baseline, chest-height camera, natural optical falloff.";
}
