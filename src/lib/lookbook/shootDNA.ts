import type {
  LookbookInput,
  MasterShootDNA,
  TargetStyle,
  BrandVisibility,
} from "./types";
import {
  PRODUCT_FAMILY_LABELS,
  STYLE_LABELS,
  PRIMARY_OBJECTIVE_LABELS,
  SECONDARY_EMPHASIS_LABELS,
  POSE_DIRECTION_LABELS,
} from "./types";
import { getRealismProfile } from "./realismRules";
import { getFamilyBlueprint } from "./shotBlueprints";
import { deriveGoals } from "./deriveGoals";
import { resolveWorldProfile } from "./worldProfiles";
import { deriveProductSensibility, deriveTasteBridge, deriveSecondaryObjectPolicy } from "./tasteBridge";
import { refineWorldByTasteBridge } from "./tasteWorldRefinements";

// ── DNA Resolvers ──
// Each resolver checks the family blueprint's dnaHints first.
// Falls back to style/goal/family heuristics only when hints are generic.

function resolveLens(input: LookbookInput): string {
  const bp = getFamilyBlueprint(input.productFamily);
  if (bp.dnaHints.lens) return bp.dnaHints.lens;

  // Fallback heuristics
  if (input.primaryObjective === "craftsmanship") {
    return "Portrait/detail lens family: 85mm primary, f/2.8-f/4 for shallow depth on product. Tighter crops encouraged.";
  }
  if (input.primaryObjective === "editorial_story") {
    return "Environmental lens family: 35mm-50mm for wider context shots, 85mm for closer frames. f/4-f/5.6 baseline.";
  }
  return "Editorial lens family: 85mm primary at f/5.6 baseline. Natural optical falloff. No forced bokeh.";
}

function resolveFraming(input: LookbookInput): string {
  const bp = getFamilyBlueprint(input.productFamily);
  if (bp.dnaHints.framing) return bp.dnaHints.framing;

  // Fallback heuristics
  if (input.primaryObjective === "shape_and_fit") {
    return "Full-body dominant: prioritise complete figure framing to show garment proportions and line.";
  }
  return "Full-body primary with 3/4 and half-body variations. Detail crops for branding and construction.";
}

function resolveMotion(input: LookbookInput): string {
  const derived = deriveGoals(input.primaryObjective, input.secondaryEmphasis);
  if (derived.allEffectiveGoals.includes("movement")) {
    return "Active motion encouraged: walking, stride, pivot. Up to 2 motion shots in the set.";
  }
  if (input.poseDirection === "directional") {
    return "Moderate motion allowed: one controlled stride or pivot shot, rest static or subtle movement.";
  }
  if (input.poseDirection === "safe") {
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

function resolveBrandingRules(brandVisibility: BrandVisibility): string {
  if (brandVisibility === "high") {
    return "Logo-first approach: all shots must preserve visible branding. Prefer front-facing frames. " +
      "Avoid cropping, occluding, or obscuring any printed text or logo. Detail crop mandatory for branding zone.";
  }
  if (brandVisibility === "medium") {
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
  const objective = PRIMARY_OBJECTIVE_LABELS[input.primaryObjective];

  let direction = `${style} lookbook for ${product}. Primary objective: ${objective.toLowerCase()}.`;
  if (input.secondaryEmphasis) {
    direction += ` Secondary emphasis: ${SECONDARY_EMPHASIS_LABELS[input.secondaryEmphasis].toLowerCase()}.`;
  }
  direction += ` Pose direction: ${POSE_DIRECTION_LABELS[input.poseDirection]}.`;
  const heroName = input.specificItem || PRODUCT_FAMILY_LABELS[input.productFamily].toLowerCase();
  direction += ` Every shot in this set must feature the ${heroName} as the hero.`;
  direction += ` This set should feel like one cohesive photoshoot, not six unrelated images.`;
  return direction;
}

function resolveGenerationNotes(input: LookbookInput): string {
  const bp = getFamilyBlueprint(input.productFamily);
  if (bp.dnaHints.generationNotes) return bp.dnaHints.generationNotes;

  // Fallback
  const notes: string[] = [];
  notes.push("Generate the safest anchor shots first (hero, clarity, branding).");
  notes.push("Then generate medium-risk editorial and silhouette variations.");
  notes.push("Save the most directional or motion-heavy shots for last.");

  if (input.brandVisibility === "high") {
    notes.push("Prioritise front-facing shots to validate branding rendering before attempting angled shots.");
  }
  if (input.poseDirection === "directional") {
    notes.push("For directional shots, expect more variation between generations. Pick the best from multiple drafts.");
  }
  return notes.join(" ");
}

export function buildMasterShootDNA(input: LookbookInput): MasterShootDNA {
  const rawWorldProfile = resolveWorldProfile({
    lockMode: input.worldLockMode,
    extracted: input.extractedWorld,
    input,
  });

  const sensibility = deriveProductSensibility(input);
  const tasteBridge = deriveTasteBridge(sensibility, input.primaryObjective, input.targetStyle);
  const secondaryObjectPolicy = deriveSecondaryObjectPolicy(input);

  // Apply taste-driven world refinement (only for auto-resolved worlds)
  const worldProfile = refineWorldByTasteBridge(rawWorldProfile, tasteBridge);

  return {
    campaignDirection: resolveCampaignDirection(input),
    productFamily: input.productFamily,
    specificItem: input.specificItem,
    genderPresentation: input.genderPresentation,
    targetStyle: input.targetStyle,
    primaryObjective: input.primaryObjective,
    secondaryEmphasis: input.secondaryEmphasis,
    brandVisibility: input.brandVisibility,
    poseDirection: input.poseDirection,
    worldProfile,
    worldSummary: `${worldProfile.backdrop}, ${worldProfile.groundPlane}`,
    lightingSummary: `${worldProfile.lightingDescription}. Tonal temperature: ${worldProfile.tonalTemperature}.`,
    lensFamily: resolveLens(input),
    framingFamily: resolveFraming(input),
    realismProfile: getRealismProfile(input.targetStyle),
    brandingVisibilityRules: resolveBrandingRules(input.brandVisibility),
    motionAllowance: resolveMotion(input),
    finishFamily: resolveFinish(input.targetStyle),
    generationPriorityNotes: resolveGenerationNotes(input),
    brandGuidelines: input.notes || undefined,
    sensibility,
    tasteBridge,
    secondaryObjectPolicy,
    lightingConsistency: "guided",
  };
}
