import type {
  LookbookInput,
  MasterShootDNA,
  TargetStyle,
  CampaignGoal,
  LogoVisibilityPriority,
} from "./types";
import { PRODUCT_FAMILY_LABELS, GOAL_LABELS, STYLE_LABELS } from "./types";
import { getRealismProfile } from "./realismRules";
import { getFamilyBlueprint } from "./shotBlueprints";

// ── DNA Resolvers ──
// Each resolver checks the family blueprint's dnaHints first.
// Falls back to style/goal/family heuristics only when hints are generic.

function resolveEnvironment(input: LookbookInput): string {
  const bp = getFamilyBlueprint(input.productFamily);
  if (bp.dnaHints.environment) return bp.dnaHints.environment;

  // Fallback heuristics
  if (input.campaignGoal === "mood" || input.campaignGoal === "styling_story") {
    return "Environmental location: urban architecture, natural landscape, or curated interior that supports the brand narrative.";
  }
  if (input.targetStyle === "street" || input.targetStyle === "contemporary") {
    return "Urban exterior: clean concrete, minimal signage, neutral walls with natural light.";
  }
  if (input.targetStyle === "resort") {
    return "Natural exterior: warm-toned architecture, soft greenery, open air with golden-hour quality light.";
  }
  if (input.targetStyle === "editorial" || input.targetStyle === "avant_garde") {
    return "Controlled studio or minimalist location: clean backdrop, no distracting elements, focus on the model and garment.";
  }
  return "Clean neutral studio or minimal location: seamless backdrop or simple architectural surface, no competing visual elements.";
}

function resolveLighting(input: LookbookInput): string {
  const bp = getFamilyBlueprint(input.productFamily);
  if (bp.dnaHints.lighting) return bp.dnaHints.lighting;

  // Fallback heuristics
  if (input.targetStyle === "editorial" || input.targetStyle === "avant_garde") {
    return "Directional studio light with controlled contrast. Key light from camera-right, subtle fill. Allow dramatic shadow play when it supports the editorial mood.";
  }
  if (input.campaignGoal === "mood") {
    return "Golden-hour natural light or warm directional light. Preserved shadow depth with soft transitions. Backlight edge separation when compositionally useful.";
  }
  if (input.targetStyle === "luxury" || input.targetStyle === "tailoring") {
    return "Soft directional late-morning light from camera-right. Clean highlights on fabric surfaces. Gentle bounce fill to open shadows without flattening contrast.";
  }
  return "Soft directional natural light from camera-right with natural bounce fill. Late-morning quality. Controlled highlights, preserved shadow depth.";
}

function resolveLens(input: LookbookInput): string {
  const bp = getFamilyBlueprint(input.productFamily);
  if (bp.dnaHints.lens) return bp.dnaHints.lens;

  // Fallback heuristics
  if (input.campaignGoal === "detail_focus") {
    return "Portrait/detail lens family: 85mm primary, f/2.8-f/4 for shallow depth on product. Tighter crops encouraged.";
  }
  if (input.campaignGoal === "mood" || input.campaignGoal === "styling_story") {
    return "Environmental lens family: 35mm-50mm for wider context shots, 85mm for closer frames. f/4-f/5.6 baseline.";
  }
  return "Editorial lens family: 85mm primary at f/5.6 baseline. Natural optical falloff. No forced bokeh.";
}

function resolveFraming(input: LookbookInput): string {
  const bp = getFamilyBlueprint(input.productFamily);
  if (bp.dnaHints.framing) return bp.dnaHints.framing;

  // Fallback heuristics
  if (input.campaignGoal === "silhouette") {
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
  const bp = getFamilyBlueprint(input.productFamily);
  if (bp.dnaHints.generationNotes) return bp.dnaHints.generationNotes;

  // Fallback
  const notes: string[] = [];
  notes.push("Generate the safest anchor shots first (hero, clarity, branding).");
  notes.push("Then generate medium-risk editorial and silhouette variations.");
  notes.push("Save the most directional or motion-heavy shots for last.");

  if (input.logoVisibilityPriority === "high") {
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
    environmentFamily: resolveEnvironment(input),
    lightingFamily: resolveLighting(input),
    lensFamily: resolveLens(input),
    framingFamily: resolveFraming(input),
    realismProfile: getRealismProfile(input.targetStyle),
    brandingVisibilityRules: resolveBrandingRules(input.logoVisibilityPriority),
    motionAllowance: resolveMotion(input.campaignGoal, input.creativityLevel),
    finishFamily: resolveFinish(input.targetStyle),
    generationPriorityNotes: resolveGenerationNotes(input),
  };
}
