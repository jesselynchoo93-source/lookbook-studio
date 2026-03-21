import type {
  LookbookInput,
  MasterShootDNA,
  ProductFamily,
  TargetStyle,
  CampaignGoal,
  LogoVisibilityPriority,
} from "./types";
import { PRODUCT_FAMILY_LABELS, GOAL_LABELS, STYLE_LABELS } from "./types";
import { getRealismProfile } from "./realismRules";

function resolveEnvironment(style: TargetStyle, goal: CampaignGoal, family?: ProductFamily): string {
  // Jewelry-specific: clean backdrop to let the piece stand out against skin
  if (family === "jewelry" || family === "eyewear" || family === "watches") {
    if (goal === "mood" || goal === "styling_story") {
      return "Minimal environmental setting with soft natural light. Background falls away to keep focus on face and product zone.";
    }
    return "Clean neutral studio: seamless backdrop or solid matte surface. No competing patterns or textures. The product and skin are the only visual elements.";
  }

  if (goal === "mood" || goal === "styling_story") {
    return "Environmental location: urban architecture, natural landscape, or curated interior that supports the brand narrative.";
  }
  if (style === "street" || style === "contemporary") {
    return "Urban exterior: clean concrete, minimal signage, neutral walls with natural light.";
  }
  if (style === "resort") {
    return "Natural exterior: warm-toned architecture, soft greenery, open air with golden-hour quality light.";
  }
  if (style === "editorial" || style === "avant_garde") {
    return "Controlled studio or minimalist location: clean backdrop, no distracting elements, focus on the model and garment.";
  }
  return "Clean neutral studio or minimal location: seamless backdrop or simple architectural surface, no competing visual elements.";
}

function resolveLighting(style: TargetStyle, goal: CampaignGoal, family?: ProductFamily): string {
  // Jewelry-specific: directional light to catch reflections and sparkle
  if (family === "jewelry") {
    if (style === "editorial" || style === "avant_garde") {
      return "Directional key light from camera-right with controlled fill. Designed to catch metal reflections and gemstone sparkle. Allow intentional shadow play on skin for editorial depth.";
    }
    return "Soft directional key light from camera-right with catchlight on metal and stone surfaces. Gentle fill to prevent harsh shadows on skin. Avoid flat overhead lighting that kills sparkle.";
  }
  if (style === "editorial" || style === "avant_garde") {
    return "Directional studio light with controlled contrast. Key light from camera-right, subtle fill. Allow dramatic shadow play when it supports the editorial mood.";
  }
  if (goal === "mood") {
    return "Golden-hour natural light or warm directional light. Preserved shadow depth with soft transitions. Backlight edge separation when compositionally useful.";
  }
  if (style === "luxury" || style === "tailoring") {
    return "Soft directional late-morning light from camera-right. Clean highlights on fabric surfaces. Gentle bounce fill to open shadows without flattening contrast.";
  }
  return "Soft directional natural light from camera-right with natural bounce fill. Late-morning quality. Controlled highlights, preserved shadow depth.";
}

function resolveLens(family: ProductFamily, goal: CampaignGoal): string {
  const isAccessory = ["jewelry", "eyewear", "watches", "small_accessories"].includes(family);
  if (isAccessory || goal === "detail_focus") {
    return "Portrait/detail lens family: 85mm primary, f/2.8-f/4 for shallow depth on product. Tighter crops encouraged.";
  }
  if (goal === "mood" || goal === "styling_story") {
    return "Environmental lens family: 35mm-50mm for wider context shots, 85mm for closer frames. f/4-f/5.6 baseline.";
  }
  return "Editorial lens family: 85mm primary at f/5.6 baseline. Natural optical falloff. No forced bokeh.";
}

function resolveFraming(family: ProductFamily, goal: CampaignGoal): string {
  const isAccessory = ["jewelry", "eyewear", "watches", "small_accessories"].includes(family);
  if (isAccessory) {
    return "Mixed framing: half-body and close-up crops as primary. Full-body only for context shots.";
  }
  if (family === "footwear") {
    return "Mixed framing: full-body for context, low-angle crops for product emphasis. Ground-level detail shots.";
  }
  if (goal === "silhouette") {
    return "Full-body dominant: prioritise complete figure framing to show garment proportions and line.";
  }
  return "Full-body primary with 3/4 and half-body variations. Detail crops for branding and construction.";
}

function resolveMotion(goal: CampaignGoal, creativity: string): string {
  if (goal === "movement") {
    return "Active motion encouraged: walking, stride, pivot. Up to 2 motion shots in the set.";
  }
  if (creativity === "directional") {
    return "Moderate motion allowed: one controlled stride or pivot shot, rest static or subtle movement.";
  }
  if (creativity === "safe") {
    return "Minimal motion: static or subtle weight shifts only. Avoid walking or mid-stride shots.";
  }
  return "Balanced motion: one motion shot allowed, rest static with natural asymmetry and weight shifts.";
}

function resolveFinish(style: TargetStyle): string {
  if (style === "luxury" || style === "tailoring") {
    return "Premium matte finish: controlled highlights, rich midtones, deep shadows. No heavy grain or vintage treatment.";
  }
  if (style === "street" || style === "contemporary") {
    return "Natural finish: subtle contrast, allow minor grain, organic tones. Not over-polished.";
  }
  if (style === "editorial" || style === "avant_garde") {
    return "Editorial finish: high contrast allowed, intentional tonal choices, clean but expressive processing.";
  }
  return "Clean natural finish: balanced exposure, true-to-life colours, controlled contrast.";
}

function resolveBrandingRules(logo: LogoVisibilityPriority): string {
  if (logo === "high") {
    return "Logo-first approach: all shots must preserve visible branding. Prefer front-facing frames. " +
      "Avoid cropping, occluding, or obscuring any printed text or logo. Detail crop mandatory for branding zone.";
  }
  if (logo === "medium") {
    return "Balanced branding: maintain legibility where visible but do not sacrifice composition for logo placement. " +
      "Include at least one logo-safe hero shot. Allow editorial angles that partially obscure branding.";
  }
  return "Branding is secondary: prioritise composition, mood, and editorial strength over logo visibility. " +
    "Logos may be partially hidden by pose, angle, or crop.";
}

function resolveCampaignDirection(input: LookbookInput): string {
  const product = input.specificItem
    ? `${input.specificItem} (${PRODUCT_FAMILY_LABELS[input.productFamily]})`
    : PRODUCT_FAMILY_LABELS[input.productFamily];
  const style = STYLE_LABELS[input.targetStyle];
  const goal = GOAL_LABELS[input.campaignGoal];

  return `${style} lookbook for ${product}. Primary objective: ${goal.toLowerCase()}. ` +
    `Creativity posture: ${input.creativityLevel}. ` +
    `This set should feel like one cohesive photoshoot, not six unrelated images.`;
}

function resolveGenerationNotes(input: LookbookInput): string {
  const notes: string[] = [];
  const isJewelry = ["jewelry", "eyewear", "watches"].includes(input.productFamily);

  if (isJewelry) {
    notes.push("Generate the clean portrait hero first to validate product rendering on skin.");
    notes.push("Then generate the angled/profile views to confirm dimensional detail.");
    notes.push("Save mood and editorial portraits for last.");
    notes.push("For each shot, confirm the product is visible and catching light before proceeding.");
  } else {
    notes.push("Generate the safest anchor shots first (hero, clarity, branding).");
    notes.push("Then generate medium-risk editorial and silhouette variations.");
    notes.push("Save the most directional or motion-heavy shots for last.");
  }

  if (input.logoVisibilityPriority === "high" && !isJewelry) {
    notes.push("Prioritise front-facing shots to validate branding rendering before attempting angled shots.");
  }
  if (input.creativityLevel === "directional") {
    notes.push("For directional shots, expect more variation between generations. Pick the best from multiple drafts.");
  }
  return notes.join(" ");
}

export function buildMasterShootDNA(input: LookbookInput): MasterShootDNA {
  return {
    campaignDirection: resolveCampaignDirection(input),
    productFamily: input.productFamily,
    specificItem: input.specificItem,
    genderPresentation: input.genderPresentation,
    targetStyle: input.targetStyle,
    campaignGoal: input.campaignGoal,
    logoVisibilityPriority: input.logoVisibilityPriority,
    creativityLevel: input.creativityLevel,
    environmentFamily: resolveEnvironment(input.targetStyle, input.campaignGoal, input.productFamily),
    lightingFamily: resolveLighting(input.targetStyle, input.campaignGoal, input.productFamily),
    lensFamily: resolveLens(input.productFamily, input.campaignGoal),
    framingFamily: resolveFraming(input.productFamily, input.campaignGoal),
    realismProfile: getRealismProfile(input.targetStyle),
    brandingVisibilityRules: resolveBrandingRules(input.logoVisibilityPriority),
    motionAllowance: resolveMotion(input.campaignGoal, input.creativityLevel),
    finishFamily: resolveFinish(input.targetStyle),
    generationPriorityNotes: resolveGenerationNotes(input),
  };
}
