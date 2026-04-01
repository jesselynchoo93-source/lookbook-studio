/**
 * Commerce Prompt Compiler
 *
 * Builds reference-locked prompt packages for commerce generation.
 * Each prompt instructs the renderer to use the reference image as
 * the exact template, swapping only the product and/or model identity.
 *
 * Key principles:
 * - Reference image is the authority for pose, framing, camera, background, lighting
 * - Text reinforces the lock; it does not restate what the image already shows
 * - No editorial language, no taste language, no permissive phrasing
 * - Product truth comes exclusively from the user's fingerprint, never from the template
 *
 * STRUCTURAL RULE: This module may import from:
 * - @/lib/lookbook/types (ProductFamily, GenderPresentation)
 * - @/lib/lookbook/productTruth (buildFingerprintTruth)
 * - @/lib/commerce/* (commerce engine modules)
 * It must NOT import from taste/world/editorial modules.
 */

import type { ProductFingerprint } from "@/lib/lookbook/types";
import type {
  TemplateFamilyDefinition,
  TemplateFamilyShot,
  CatalogReferenceImage,
  CommercePromptPackage,
  CommerceGenerationPlan,
  CommerceSwapMode,
  CommerceShotRole,
  SceneConstraints,
  BackgroundClass,
  GarmentFeatureToken,
  ShotRoleStrategy,
  GenerationSchedule,
  ShotIntent,
  CompositionType,
  CropClass,
  GarmentFocus,
  BackgroundAuthority,
} from "./referenceLibrary.types";
import { normalizeToFeatureToken } from "./referenceLibrary.types";
import { sanitizeBackgroundDetail } from "./sanitizeSceneText";
import { buildCommerceNegativePrompt } from "./commerceNegatives";
import { FAMILY_DRIFT_NEGATIVES } from "@/lib/lookbook/productTruth";
import type { ProductFamily } from "@/lib/lookbook/types";
import {
  assertNoEditorialLanguage,
  assertLiteralCommerceRegister,
  assertNoBannedPhrasing,
} from "./commerceLanguageGuard";

// ── Scene Constraint Whitelist ──
// Only these fields may be interpolated into compiled prompts.

function buildSceneConstraintBlock(
  constraints: SceneConstraints,
  backgroundFamily: BackgroundClass,
): string {
  const bgDetail = sanitizeBackgroundDetail(
    constraints.backgroundDetail,
    backgroundFamily,
  );

  const lines: string[] = [
    `Camera at ${constraints.cameraHeight}, ~${constraints.estimatedFocalLength}, ${constraints.estimatedDistance} distance.`,
    `Subject ${constraints.subjectPlacement}.`,
    `${constraints.lightDirection} ${constraints.lightQuality} light.`,
    bgDetail,
  ];

  return lines.join(" ");
}

// ── Garment Visibility Block ──

function buildVisibilityBlock(
  constraints: SceneConstraints,
): string {
  const lines: string[] = [];

  if (constraints.visibleProductZones.length > 0) {
    lines.push(
      `Visible zones: ${constraints.visibleProductZones.join(", ")}.`,
    );
  }

  if (constraints.occludedProductZones.length > 0) {
    const occluded = constraints.occludedProductZones
      .map((o) => `${o.zone} (${o.reason})`)
      .join(", ");
    lines.push(`Occluded zones: ${occluded}.`);
  }

  lines.push(`Replacement safety: ${constraints.replacementSafety}.`);

  if (constraints.replacementSafety === "risky") {
    lines.push(
      "Warning: high occlusion in this pose. Do not add garment details that are not visible in the reference.",
    );
  }

  return lines.join(" ");
}

// ── Swap Mode Instructions ──

function buildReplacementInstruction(
  swapMode: CommerceSwapMode,
  productTruth: string,
): string {
  switch (swapMode) {
    case "garment_only":
    case "identity_and_garment":
      return `Replace only the garment with: ${productTruth} Keep exact fit silhouette and body interaction as in the reference.`;
    case "face_only":
      return "Keep the existing garment exactly as shown in the reference.";
  }
}

function buildModelInstruction(
  swapMode: CommerceSwapMode,
  modelDescription?: string,
): string | undefined {
  switch (swapMode) {
    case "face_only":
      return "Replace only the face, skin tone, and hair with the model reference. Keep the existing body shape and garment exactly as shown. Do NOT copy any clothing, accessories, or styling from the model reference.";
    case "identity_and_garment":
      return modelDescription
        ? `Replace the model with: ${modelDescription}. Use the model reference for face, skin tone, body proportions, and hair. Do NOT copy any clothing, accessories, outerwear, styling, or scene from the model reference image. All garment details come from the product reference only.`
        : "Replace the model identity using the model reference. Use the model reference for face, skin tone, body proportions, and hair. Do NOT copy any clothing, accessories, outerwear, styling, or scene from the model reference image. All garment details come from the product reference only.";
    case "garment_only":
      return undefined;
  }
}

// ── Reference Lock ──

const REFERENCE_LOCK =
  "Use the reference image exactly for pose, framing, camera angle, background, and lighting. Do not change the composition.";

// ── Forbidden Block ──

const FORBIDDEN_BLOCK =
  "Do not change the background. Do not add props. Do not modify lighting. Do not alter pose. Do not add editorial mood. Do not change camera angle.";

// ── Shot-Class Types (V3.2.6) ──

export type ShotClass = "body" | "worn_detail" | "flat_lay" | "macro";

// ── Body Geometry Lock (body shots only) ──

const BODY_GEOMETRY_LOCK =
  "BODY GEOMETRY LOCK: Match the template reference image exactly for head angle, shoulder line angle, torso rotation, spine angle, arm bend, elbow position, hand placement, hip angle, and weight distribution. " +
  "Do not re-pose the body. Do not adjust any joint angle. " +
  "The template body geometry is authoritative.";

// ── Template Background Lock (body shots only) ──

const TEMPLATE_BACKGROUND_LOCK =
  "TEMPLATE BACKGROUND LOCK: Do not change anything from the given reference template background. " +
  "The template reference image background is the exact authority. " +
  "Match the template background colour exactly. " +
  "Match the template background brightness exactly. " +
  "Match the template background texture and falloff exactly. " +
  "Do not darken the background. Do not lighten the background. " +
  "Do not warm or cool the background colour. " +
  "Do not add gradient or falloff not present in the template reference. " +
  "Do not replace the background with a new studio backdrop. " +
  "The background must remain visually identical to the template reference, not merely similar.";

// ── Worn Detail Background Lock (worn_detail shots only) ──

const WORN_DETAIL_BACKGROUND_LOCK =
  "BACKGROUND COHERENCE: The family template background is the final authority for background appearance. " +
  "Use the anchor shot for this family as a continuity reference only. " +
  "If the anchor background differs from the family template background, match the template, not the anchor. " +
  "The anchor must not override the template background identity. " +
  "Do not darken the background. Do not lighten the background. " +
  "Do not warm or cool the background colour. " +
  "Do not introduce a new background.";

// ── Surface Lock (flat_lay and macro shots only) ──

const SURFACE_LOCK =
  "SURFACE LOCK: Use the reference image as the sole authority for the surface the product rests on. " +
  "Match the surface colour, texture, and lighting exactly. " +
  "Do not change the surface. Do not add a studio background. Do not add shadow gradients not present in the reference.";

// ── Flat Lay Garment Isolation (flat_lay shots only) ──

const FLAT_LAY_GARMENT_ISOLATION =
  "FLAT LAY GARMENT ISOLATION: The reference surface/background is authority for the surface only. " +
  "All garment colour, material, and texture must come from the product reference only. " +
  "Do not copy garment colour, material, or texture from the template/reference garment. " +
  "Do not let the template garment appearance influence the product appearance.";

// ── Contamination Guards (split from old monolithic block) ──

const GARMENT_CONTAMINATION_GUARD =
  "The model reference provides face, skin tone, hair, and body proportions ONLY. " +
  "Do NOT copy clothing, accessories, outerwear, jewellery, or shoes from the model reference. " +
  "All garment details come from the product reference.";

const BACKGROUND_CONTAMINATION_GUARD =
  "Do not copy background, lighting direction, or lighting colour from the model reference.";

const POSE_CONTAMINATION_GUARD =
  "Do not copy pose, body angle, or camera angle from the model reference. " +
  "All composition comes from the template reference.";

// ── Template Garment Isolation Block (worn-detail: template ref authority boundary) ──

const TEMPLATE_GARMENT_ISOLATION_BLOCK =
  "TEMPLATE GARMENT ISOLATION: The template reference image shows a DIFFERENT garment in a different colour and material. " +
  "IGNORE that garment's colour, material, texture, sheen, and construction entirely. " +
  "The template reference provides pose, framing, and body orientation ONLY. " +
  "All garment appearance (colour, material, texture, finish, construction) comes EXCLUSIVELY from the product reference image and the product truth text.";

// ── Absence Constraint Block (garment-truth negatives) ──
// Reinforcement layer: the primary defense against structural conflicts is shot
// skipping/dropping (Fix 2). This block handles residual contamination in shots
// that survive compatibility checks.

/** Behavioral expansions: for each forbidden feature, also forbid the pose/behavior it implies. */
const BEHAVIORAL_EXPANSIONS: Record<string, string[]> = {
  pockets: ["hand in pocket", "pocket opening", "seam opening for pocket", "pocket construction"],
  pocket_flaps: ["flap pocket"],
  belt: ["belt loop", "cinched waist with belt"],
  belt_loops: ["belt loop"],
  hood: ["hood drape", "hood shadow"],
  zipper: ["zipper pull", "visible zip track"],
  buttons: ["button placket", "button row"],
  collar: ["collar fold", "collar stand"],
  lapels: ["lapel fold", "notch lapel"],
  structured_waist_seam: ["waist seam implying pocket construction"],
  epaulettes: ["shoulder tab", "shoulder button"],
  cuffs: ["turned cuff", "button cuff"],
};

const ABSENCE_CONSTRAINT_PREFIX =
  "GARMENT ABSENCE CONSTRAINTS (override template reference if conflicting):";

function buildAbsenceConstraintBlock(
  fingerprint: ProductFingerprint | Record<string, unknown>,
): string | null {
  const fp = fingerprint as Record<string, unknown>;
  const forbidden = Array.isArray(fp.forbiddenElements) ? (fp.forbiddenElements as string[]) : [];

  // Derive implicit absences from structural fields (apparel)
  const derived: string[] = [];
  if (fp.closureType === "pull-on") {
    derived.push("visible zipper", "buttons", "snaps");
  }

  const all = [...new Set([...forbidden, ...derived])].filter(Boolean);
  if (all.length === 0) return null;

  // Build literal absence lines
  const lines = all.map((f) => `This garment has NO ${f}.`);

  // Expand behavioral negatives
  const behavioralNegatives: string[] = [];
  for (const f of all) {
    const key = f.toLowerCase().replace(/\s+/g, "_");
    const expansions = BEHAVIORAL_EXPANSIONS[key] || BEHAVIORAL_EXPANSIONS[f.toLowerCase()];
    if (expansions) {
      behavioralNegatives.push(...expansions);
    }
  }
  if (behavioralNegatives.length > 0) {
    lines.push(`Do not show: ${[...new Set(behavioralNegatives)].join(", ")}.`);
  }

  lines.push("Do not generate any of these features or behaviors regardless of what the template reference shows.");

  return `${ABSENCE_CONSTRAINT_PREFIX}\n${lines.join(" ")}`;
}

/** Build fingerprint-specific negatives including behavioral expansions for the negative prompt. */
function buildFingerprintNegatives(
  fingerprint: ProductFingerprint | Record<string, unknown>,
): string {
  const fp = fingerprint as Record<string, unknown>;
  const forbidden = Array.isArray(fp.forbiddenElements) ? (fp.forbiddenElements as string[]) : [];
  if (forbidden.length === 0) return "";

  const allNegatives = [...forbidden];
  for (const f of forbidden) {
    const key = f.toLowerCase().replace(/\s+/g, "_");
    const expansions = BEHAVIORAL_EXPANSIONS[key] || BEHAVIORAL_EXPANSIONS[f.toLowerCase()];
    if (expansions) allNegatives.push(...expansions);
  }
  return [...new Set(allNegatives)].join(", ");
}

// ── Role-Specific Generation Strategies ──

const BODY_STRATEGY: ShotRoleStrategy = {
  includeModelRef: true,
  includeConsistencyTarget: true,
  runDriftCheck: true,
  maxDriftRetries: 2,
};

export const ROLE_STRATEGIES: Record<CommerceShotRole, ShotRoleStrategy> = {
  front_seller: BODY_STRATEGY,
  three_quarter_seller: BODY_STRATEGY,
  side_fit_proof: BODY_STRATEGY,
  back_fit_proof: BODY_STRATEGY,
  motion_drape_proof: BODY_STRATEGY,
  seated_drape_proof: BODY_STRATEGY,
  detail_construction: {
    includeModelRef: false,
    includeConsistencyTarget: false,
    runDriftCheck: false,
    maxDriftRetries: 0,
    focusDirective: "Show construction detail clearly.",
    additionalInstructions: "Focus on stitching, seams, closures, and construction quality.",
  },
  detail_material: {
    includeModelRef: false,
    includeConsistencyTarget: false,
    runDriftCheck: false,
    maxDriftRetries: 0,
    additionalInstructions: "Show fabric weave, sheen, texture, and material quality at close range.",
  },
};

export const DETAIL_ROLES: CommerceShotRole[] = ["detail_construction", "detail_material"];

// ── ShotIntent Resolution (V3.2.5) ──

const COMPOSITION_LABELS: Record<CompositionType, string> = {
  front_facing: "front-facing view",
  three_quarter: "three-quarter angle view",
  back_view: "back view",
  side_view: "side view",
  flat_lay: "flat lay",
  macro_crop: "macro detail crop",
  seated: "seated view",
};

const CROP_LABELS: Record<CropClass, string> = {
  full_body: "full body",
  upper_body: "upper body",
  mid_body: "mid body",
  tight_crop: "tight detail crop",
  flat_full_product: "full product view",
};

const FOCUS_LABELS: Record<GarmentFocus, string> = {
  silhouette: "overall garment silhouette and fit",
  construction: "construction details (seams, closures, stitching)",
  material: "material and fabric properties",
  neckline: "neckline and collar area",
  waist: "waist construction and fit",
  hem: "hemline and lower edge",
  sleeve: "sleeve construction and drape",
};

function formatEnum(value: string): string {
  return value.replace(/_/g, " ");
}

export function resolveShotIntent(shot: TemplateFamilyShot): ShotIntent {
  const { compositionType, cropClass, garmentFocus, bodyDirection, handPlacement, headDirection } = shot;

  const isDetail = DETAIL_ROLES.includes(shot.role);
  const isWorn = isDetail && isIdentityBearingDetail(shot);
  const backgroundAuthority: BackgroundAuthority =
    isWorn ? "anchor" : (isDetail && !isWorn) ? "none" : "template";

  const visualIntentKey = [
    compositionType, cropClass, garmentFocus,
    bodyDirection, handPlacement, headDirection,
    shot.detailPresentation ?? "none",
  ].join(":");

  return {
    role: shot.role,
    compositionType, cropClass, garmentFocus,
    bodyDirection, handPlacement, headDirection,
    detailPresentation: shot.detailPresentation,
    backgroundAuthority,
    visualIntentKey,
  };
}

export function resolveShotClass(intent: ShotIntent): ShotClass {
  if (intent.compositionType === "flat_lay") return "flat_lay";
  if (intent.compositionType === "macro_crop") return "macro";
  const isDetail = DETAIL_ROLES.includes(intent.role);
  if (isDetail && intent.detailPresentation === "worn_on_body") return "worn_detail";
  if (isDetail) return "flat_lay"; // flat_or_macro fallback
  return "body";
}

function renderShotIntent(intent: ShotIntent): string {
  const lines: string[] = [];

  lines.push(`Exact shot composition: ${COMPOSITION_LABELS[intent.compositionType]}, ${CROP_LABELS[intent.cropClass]}.`);

  if (intent.bodyDirection !== "not_applicable") {
    const parts: string[] = [`body facing ${formatEnum(intent.bodyDirection)}`];
    if (intent.handPlacement !== "not_applicable") {
      parts.push(`hands ${formatEnum(intent.handPlacement)}`);
    }
    if (intent.headDirection !== "not_applicable") {
      parts.push(`head ${formatEnum(intent.headDirection)}`);
    }
    lines.push(`Exact pose: ${parts.join(", ")}.`);
  }

  if (intent.garmentFocus) {
    lines.push(`Focus on: ${FOCUS_LABELS[intent.garmentFocus]}.`);
  }

  return lines.join(" ");
}

function renderFocusDirective(strategy: ShotRoleStrategy): string | null {
  return strategy.focusDirective ?? null;
}

// ── Family Validation (V3.2.5) ──

export interface FamilyValidationResult {
  errors: string[];
  warnings: string[];
}

const BODY_COMPOSITIONS: CompositionType[] = ["front_facing", "three_quarter", "back_view", "side_view"];

export function validateFamilyShotIntents(
  family: TemplateFamilyDefinition,
  catalog: CatalogReferenceImage[],
): FamilyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const intentKeys = new Map<string, number>();

  for (const shot of family.shots) {
    // Phase 1: Validate raw field presence BEFORE resolving intent
    const requiredFields: Record<string, unknown> = {
      compositionType: shot.compositionType,
      cropClass: shot.cropClass,
      garmentFocus: shot.garmentFocus,
      bodyDirection: shot.bodyDirection,
      handPlacement: shot.handPlacement,
      headDirection: shot.headDirection,
    };
    const missing = Object.entries(requiredFields)
      .filter(([, v]) => v === undefined || v === null)
      .map(([k]) => k);
    if (missing.length > 0) {
      errors.push(`Shot ${shot.position}: missing required structured fields: ${missing.join(", ")}`);
      continue;
    }

    // Reference image must exist in catalog
    const image = catalog.find(c => c.id === shot.referenceImageId);
    if (!image) {
      errors.push(`Shot ${shot.position}: reference image ${shot.referenceImageId} not found in catalog`);
      continue;
    }

    // Phase 2: Resolve intent from validated metadata
    const intent = resolveShotIntent(shot);

    // Phase 3: Intent-level validation

    // Duplicate resolved visual intent within this family (hard error)
    const existing = intentKeys.get(intent.visualIntentKey);
    if (existing !== undefined) {
      errors.push(
        `Shot ${shot.position} and Shot ${existing} have identical resolved visual intent: "${intent.visualIntentKey}"`
      );
    }
    intentKeys.set(intent.visualIntentKey, shot.position);

    // Detail shot must have detailPresentation
    if (DETAIL_ROLES.includes(shot.role) && !shot.detailPresentation) {
      errors.push(`Shot ${shot.position}: detail shot missing detailPresentation tag`);
    }

    // Non-detail body shots must use "silhouette"
    if (!DETAIL_ROLES.includes(shot.role) && shot.garmentFocus !== "silhouette") {
      errors.push(`Shot ${shot.position}: non-detail body shot must use garmentFocus "silhouette", got "${shot.garmentFocus}"`);
    }

    // Detail shots garmentFocus must NOT be "silhouette"
    if (DETAIL_ROLES.includes(shot.role) && shot.garmentFocus === "silhouette") {
      errors.push(`Shot ${shot.position}: detail shot must NOT use garmentFocus "silhouette"`);
    }

    // cropClass consistency: body shots cannot use flat_full_product
    if (BODY_COMPOSITIONS.includes(intent.compositionType) && intent.cropClass === "flat_full_product") {
      errors.push(`Shot ${shot.position}: body composition "${intent.compositionType}" cannot use cropClass "flat_full_product"`);
    }

    // cropClass consistency: flat_lay should use flat_full_product
    if (intent.compositionType === "flat_lay" && intent.cropClass !== "flat_full_product") {
      errors.push(`Shot ${shot.position}: flat_lay composition should use cropClass "flat_full_product", got "${intent.cropClass}"`);
    }

    // tight_crop (non-macro) must not have garmentFocus "silhouette"
    if (intent.cropClass === "tight_crop" && intent.compositionType !== "macro_crop" && shot.garmentFocus === "silhouette") {
      errors.push(`Shot ${shot.position}: tight_crop (non-macro) must not use garmentFocus "silhouette"`);
    }

    // Flat lay and macro shots: bodyDirection, handPlacement, headDirection must all be not_applicable
    if (intent.compositionType === "flat_lay" || intent.compositionType === "macro_crop") {
      if (shot.bodyDirection !== "not_applicable" || shot.handPlacement !== "not_applicable" || shot.headDirection !== "not_applicable") {
        errors.push(`Shot ${shot.position}: flat_lay/macro_crop must have bodyDirection, handPlacement, headDirection all set to "not_applicable"`);
      }
    }

    // Tight body crops: handPlacement/headDirection should be not_applicable
    if (BODY_COMPOSITIONS.includes(intent.compositionType) && intent.cropClass === "tight_crop") {
      if (shot.handPlacement !== "not_applicable") {
        warnings.push(`Shot ${shot.position}: tight body crop has handPlacement "${shot.handPlacement}" but hands are likely not visible`);
      }
      if (shot.headDirection !== "not_applicable") {
        warnings.push(`Shot ${shot.position}: tight body crop has headDirection "${shot.headDirection}" but head direction is likely moot`);
      }
    }

    // Warnings: cross-check reference image gross composition vs authored metadata
    if (image.bodyDirection === "back" && intent.compositionType === "front_facing") {
      warnings.push(`Shot ${shot.position}: reference image shows back but compositionType is front_facing`);
    }
    if (image.bodyDirection === "front" && intent.compositionType === "back_view") {
      warnings.push(`Shot ${shot.position}: reference image shows front but compositionType is back_view`);
    }
    if (image.poseClass === "flat_lay" && intent.compositionType !== "flat_lay") {
      warnings.push(`Shot ${shot.position}: reference image is flat_lay but compositionType is ${intent.compositionType}`);
    }
  }

  // Validation errors are real invariants. Fail in ALL environments.
  if (errors.length > 0) {
    const msg = `[FamilyValidation] ${family.id}: ${errors.length} errors: ${errors.join("; ")}`;
    console.error(msg);
    throw new Error(msg);
  }

  if (process.env.NODE_ENV !== "production" && warnings.length > 0) {
    console.warn(`[FamilyValidation] ${family.id}: ${warnings.length} warnings`, warnings);
  }

  return { errors, warnings };
}

// ── Worn Detail Strategies (identity-bearing detail shots) ──
// These wire into the SAME anchor coherence pipeline as body shots.
// No parallel pipeline. Same consistency target, drift check, retry path.

const WORN_DETAIL_CONSTRUCTION_STRATEGY: ShotRoleStrategy = {
  includeModelRef: true,
  includeConsistencyTarget: true,
  runDriftCheck: true,
  maxDriftRetries: 2,
  additionalInstructions: "Show construction details (seams, closures, stitching) on the worn garment.",
};

const WORN_DETAIL_MATERIAL_STRATEGY: ShotRoleStrategy = {
  includeModelRef: true,
  includeConsistencyTarget: true,
  runDriftCheck: true,
  maxDriftRetries: 2,
  additionalInstructions: "Show material details (texture, drape, sheen) on the worn garment.",
};

// ── Strategy Resolution ──

/** Resolve the generation strategy for a shot, selecting worn detail strategies
 *  for identity-bearing detail shots. Used by compileSingleShot and exported
 *  for per-shot generation anchor dependency checks. */
export function resolveStrategy(
  shot: TemplateFamilyShot,
  fallbackBase?: ShotRoleStrategy,
): ShotRoleStrategy {
  const base = fallbackBase ?? ROLE_STRATEGIES[shot.role];
  if (!DETAIL_ROLES.includes(shot.role)) return base;
  if (!isIdentityBearingDetail(shot)) return base;

  // Worn detail: use the dedicated strategy for this role
  return shot.role === "detail_construction"
    ? WORN_DETAIL_CONSTRUCTION_STRATEGY
    : WORN_DETAIL_MATERIAL_STRATEGY;
}

/** Check if a shot needs the anchor image for consistency (drift check / consistency target).
 *  Flat/macro detail shots return false and can generate independently. */
export function needsAnchorForConsistency(shot: TemplateFamilyShot): boolean {
  const strategy = resolveStrategy(shot);
  return !!(strategy.includeConsistencyTarget || strategy.runDriftCheck);
}

// ── Identity-Bearing Detail Check ──

const BODY_INDICATORS = [
  "body", "shoulders", "neck", "back", "face", "head",
  "upper body", "mid body", "three-quarter crop",
];

/** Check if a detail shot shows visible human body (identity-bearing).
 *  Primary signal: detailPresentation tag. Fallback: text matching for untagged shots. */
export function isIdentityBearingDetail(shot: TemplateFamilyShot): boolean {
  if (shot.detailPresentation === "worn_on_body") return true;
  if (shot.detailPresentation === "flat_or_macro") return false;

  // Fallback: infer from framing/pose text when tag is missing
  const text = `${shot.framingVariation ?? ""} ${shot.poseVariation ?? ""}`.toLowerCase();
  return BODY_INDICATORS.some((indicator) => text.includes(indicator));
}

// ── Product Truth Builder ──

/**
 * Build product truth text for commerce prompts from a fingerprint.
 * Uses the existing buildFingerprintTruth from productTruth.ts.
 *
 * Validates that no template defaults leak into the truth.
 */
function buildCommerceProductTruth(
  fingerprint: ProductFingerprint | Record<string, unknown>,
): string {
  const parts: string[] = [];
  const fp = fingerprint as Record<string, unknown>;

  // Material and colour
  if (fp.materialFinish || fp.materialColour) {
    parts.push(`Material: ${fp.materialFinish || "unknown"} ${fp.materialColour || ""}.`.trim());
  }

  // Hardware
  if (fp.hardwareFinish && fp.hardwareFinish !== "none") {
    parts.push(`Hardware: ${fp.hardwareFinish} finish.`);
  }

  // Logo
  if (fp.logoScale && fp.logoScale !== "none" && fp.logoPlacement) {
    parts.push(`Logo: ${fp.logoStyle || ""} ${fp.logoScale} at ${fp.logoPlacement}.`);
  }

  // Forbidden elements
  if (Array.isArray(fp.forbiddenElements) && fp.forbiddenElements.length > 0) {
    parts.push(`Do not add: ${fp.forbiddenElements.join(", ")}.`);
  }

  // Fallback: use specificItem if no structured data
  if (parts.length === 0 && fp.specificItem) {
    parts.push(`Product: ${fp.specificItem}.`);
  }

  return parts.join(" ") || "Product as shown in reference image.";
}

/** Material-focused product truth for detail_material shots. */
function buildMaterialProductTruth(
  fingerprint: ProductFingerprint | Record<string, unknown>,
): string {
  const fp = fingerprint as Record<string, unknown>;
  const parts: string[] = [];
  if (fp.materialFinish) parts.push(`Finish: ${fp.materialFinish}.`);
  if (fp.materialColour) parts.push(`Colour: ${fp.materialColour}.`);
  if (fp.material) parts.push(`Material: ${fp.material}.`);
  if (fp.constructionStyle) parts.push(`Construction: ${fp.constructionStyle}.`);
  if (parts.length === 0) return buildCommerceProductTruth(fingerprint);
  return parts.join(" ");
}

// ── Compile Single Shot ──

interface CompileShotInput {
  shot: TemplateFamilyShot;
  image: CatalogReferenceImage;
  swapMode: CommerceSwapMode;
  productTruth: string;
  fingerprint: ProductFingerprint | Record<string, unknown>;
  modelDescription?: string;
  backgroundFamily: BackgroundClass;
}

function compileSingleShot(input: CompileShotInput): CommercePromptPackage {
  const { shot, image, swapMode, productTruth, fingerprint, modelDescription, backgroundFamily } = input;

  const constraints = image.extractedConstraints;
  const baseStrategy = ROLE_STRATEGIES[shot.role];

  // Resolve strategy: worn detail shots use dedicated strategies that wire into
  // the same anchor coherence pipeline as body shots (not a spread override).
  const strategy: ShotRoleStrategy = resolveStrategy(shot, baseStrategy);

  // For detail_material shots, use material-focused product truth
  const effectiveProductTruth = shot.role === "detail_material"
    ? buildMaterialProductTruth(fingerprint)
    : productTruth;

  // Build prompt sections
  const sections: string[] = [];

  // Resolve ShotIntent and ShotClass from structured metadata (V3.2.5 + V3.2.6)
  const intent = resolveShotIntent(shot);
  const shotClass = resolveShotClass(intent);

  // [1] REFERENCE LOCK
  sections.push(REFERENCE_LOCK);

  // [2] SHOT INTENT (composition, pose, focus — ONLY source of framing text)
  sections.push(renderShotIntent(intent));

  // [3] BODY GEOMETRY LOCK (body only)
  if (shotClass === "body") {
    sections.push(BODY_GEOMETRY_LOCK);
  }

  // [4] PRODUCT REPLACEMENT
  const replacementInstruction = buildReplacementInstruction(swapMode, effectiveProductTruth);
  if (swapMode !== "face_only") {
    sections.push(replacementInstruction);
  }

  // [5] IDENTITY SWAP (body + worn_detail when model ref active)
  const modelInstruction = strategy.includeModelRef
    ? buildModelInstruction(swapMode, modelDescription)
    : undefined;
  if (modelInstruction) {
    sections.push(modelInstruction);
  }

  // [6] SCENE CONSTRAINTS
  if (constraints) {
    sections.push(buildSceneConstraintBlock(constraints, backgroundFamily));
  }

  // [7] BACKGROUND/SURFACE AUTHORITY (shot-class switch)
  switch (shotClass) {
    case "body":
      sections.push(TEMPLATE_BACKGROUND_LOCK);
      break;
    case "worn_detail":
      sections.push(WORN_DETAIL_BACKGROUND_LOCK);
      break;
    case "flat_lay":
      sections.push(SURFACE_LOCK);
      sections.push(FLAT_LAY_GARMENT_ISOLATION);
      break;
    case "macro":
      sections.push(SURFACE_LOCK);
      break;
  }

  // [8] COMPOSITION FIDELITY (worn_detail only)
  if (shotClass === "worn_detail") {
    sections.push(
      "COMPOSITION FIDELITY: Match the template reference shot's crop, body orientation, pose family, and neckline/upper-body framing exactly. Match the framing only, not the garment.",
    );
    // [9] TEMPLATE GARMENT ISOLATION (worn_detail only)
    sections.push(TEMPLATE_GARMENT_ISOLATION_BLOCK);
  }

  // [10] FOCUS DIRECTIVE (garment-subject emphasis only, never composition)
  const focusDir = renderFocusDirective(strategy);
  if (focusDir) {
    sections.push(focusDir);
  }

  // [11] GARMENT VISIBILITY
  if (constraints) {
    sections.push(buildVisibilityBlock(constraints));
  }

  // [12] ADDITIONAL INSTRUCTIONS (role-specific)
  if (strategy.additionalInstructions) {
    sections.push(strategy.additionalInstructions);
  }

  // [13] CONTAMINATION GUARDS (when model ref active + not garment_only)
  if (strategy.includeModelRef && swapMode !== "garment_only") {
    // [13a] GARMENT_CONTAMINATION_GUARD (body + worn_detail)
    if (shotClass === "body" || shotClass === "worn_detail") {
      sections.push(GARMENT_CONTAMINATION_GUARD);
    }
    // [13b] BACKGROUND_CONTAMINATION_GUARD (body + worn_detail)
    if (shotClass === "body" || shotClass === "worn_detail") {
      sections.push(BACKGROUND_CONTAMINATION_GUARD);
    }
    // [13c] POSE_CONTAMINATION_GUARD (body only)
    if (shotClass === "body") {
      sections.push(POSE_CONTAMINATION_GUARD);
    }
  }

  // [14] ABSENCE CONSTRAINTS (garment-truth negatives, reinforces skip/drop)
  const absenceBlock = buildAbsenceConstraintBlock(fingerprint);
  if (absenceBlock) {
    sections.push(absenceBlock);
  }

  // [15] FORBIDDEN
  sections.push(FORBIDDEN_BLOCK);

  const positivePrompt = sections.join("\n\n");

  // Build negative prompt (commerce + family drift + fingerprint absences)
  const commerceNegatives = buildCommerceNegativePrompt();
  const familyDrift = FAMILY_DRIFT_NEGATIVES[image.productFamily as ProductFamily] || "";
  const fingerprintNegatives = buildFingerprintNegatives(fingerprint);
  let negativePrompt = commerceNegatives;
  if (familyDrift) negativePrompt += `, ${familyDrift}`;
  if (fingerprintNegatives) negativePrompt += `, ${fingerprintNegatives}`;

  // Run language guards (dev: throws; production: logs + rewrites)
  assertNoEditorialLanguage(positivePrompt, `shot-${shot.position}`);
  assertNoBannedPhrasing(positivePrompt, `shot-${shot.position}`);
  const { cleanedPrompt } = assertLiteralCommerceRegister(
    positivePrompt,
    `shot-${shot.position}`,
  );

  return {
    referenceImagePath: image.relativePath,
    positivePrompt: cleanedPrompt,
    negativePrompt,
    referenceLock: REFERENCE_LOCK,
    swapMode,
    replacementInstruction,
    modelInstruction,
    productTruth: effectiveProductTruth,
    shotRole: shot.role,
    position: shot.position,
    isAnchor: shot.isAnchor,
    replacementSafety: shot.replacementSafety,
    roleStrategy: strategy,
    isWornDetail: shotClass === "worn_detail",
  };
}

// ── Swap Mode Auto-Selection ──

function autoSelectSwapMode(
  hasModelRef: boolean,
  hasProductRef: boolean,
): CommerceSwapMode {
  if (hasModelRef && hasProductRef) return "identity_and_garment";
  if (hasModelRef && !hasProductRef) return "face_only";
  return "garment_only";
}

// ── Generation Order ──
// Anchor first, then required roles by priority, then optional roles.

const ROLE_PRIORITY: Record<CommerceShotRole, number> = {
  front_seller: 1,
  three_quarter_seller: 2,
  side_fit_proof: 3,
  back_fit_proof: 4,
  detail_construction: 5,
  detail_material: 6,
  motion_drape_proof: 7,
  seated_drape_proof: 8,
};

function buildGenerationOrder(
  shots: TemplateFamilyShot[],
): number[] {
  const anchor = shots.find((s) => s.isAnchor);
  const rest = shots
    .filter((s) => !s.isAnchor)
    .sort((a, b) => ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role]);

  const order: number[] = [];
  if (anchor) order.push(anchor.position);
  for (const s of rest) order.push(s.position);
  return order;
}

// ── Generation Schedule (3-phase: anchor -> core body -> detail/texture) ──

const CORE_BODY_ROLES: CommerceShotRole[] = [
  "front_seller", "three_quarter_seller", "side_fit_proof", "back_fit_proof",
  "motion_drape_proof", "seated_drape_proof",
];

function buildGenerationSchedule(
  shots: TemplateFamilyShot[],
): GenerationSchedule {
  const anchor = shots.find((s) => s.isAnchor)!;
  return {
    anchor: anchor.position,
    coreBody: shots
      .filter((s) => !s.isAnchor && CORE_BODY_ROLES.includes(s.role))
      .map((s) => s.position),
    detailTexture: shots
      .filter((s) => DETAIL_ROLES.includes(s.role))
      .map((s) => s.position),
  };
}

// ── Shot Compatibility Check ──

/** Structural features where the pose depends on the feature existing.
 *  These almost always require skip/drop, not just prompt adaptation. */
const STRUCTURAL_FEATURES: GarmentFeatureToken[] = [
  "pockets", "pocket_flaps", "belt", "belt_loops", "hood",
  "structured_waist_seam", "lapels", "epaulettes",
];

const REQUIRED_BODY_ROLES: CommerceShotRole[] = [
  "front_seller", "three_quarter_seller", "side_fit_proof", "back_fit_proof",
];

export interface ShotCompatibilityResult {
  compatible: boolean;
  conflicts: GarmentFeatureToken[];
  severity: "skip" | "warn";
}

export function checkShotCompatibility(
  shot: TemplateFamilyShot,
  fingerprint: ProductFingerprint | Record<string, unknown>,
): ShotCompatibilityResult {
  const fp = fingerprint as Record<string, unknown>;
  const rawForbidden = Array.isArray(fp.forbiddenElements) ? (fp.forbiddenElements as string[]) : [];
  const forbidden = rawForbidden.map(normalizeToFeatureToken).filter(Boolean) as GarmentFeatureToken[];
  const implied = (shot.impliedGarmentFeatures || []);

  // Exact token match only
  const conflicts = implied.filter((f) => forbidden.includes(f));

  if (conflicts.length === 0) return { compatible: true, conflicts: [], severity: "warn" };

  const hasStructuralConflict = conflicts.some((c) => STRUCTURAL_FEATURES.includes(c));

  // Default: skip. Only warn for cosmetic (non-structural) conflicts on optional detail roles.
  let severity: "skip" | "warn" = "skip";
  if (!hasStructuralConflict && !REQUIRED_BODY_ROLES.includes(shot.role)) {
    severity = "warn";
  }

  return { compatible: false, conflicts, severity };
}

// ── Public API ──

export interface CompileCommerceInput {
  family: TemplateFamilyDefinition;
  images: CatalogReferenceImage[];
  fingerprint: ProductFingerprint | Record<string, unknown>;
  hasModelRef: boolean;
  hasProductRef: boolean;
  modelDescription?: string;
  /** Override the auto-selected family-level swap mode */
  swapModeOverride?: CommerceSwapMode;
  /** Per-shot swap mode overrides (shot position -> mode) */
  shotSwapOverrides?: Record<number, CommerceSwapMode>;
}

/**
 * Compile a commerce generation plan with compatibility checking.
 *
 * Incompatible shots are skipped (structural conflicts) or warned (cosmetic conflicts).
 * A reduced set (4-5 shots) is valid output when shots are skipped.
 *
 * @returns CommerceGenerationPlan with prompt packages, skip/warn metadata, and effective shot count
 */
export function compileCommercePlan(
  input: CompileCommerceInput,
): CommerceGenerationPlan {
  const {
    family,
    images,
    fingerprint,
    hasModelRef,
    hasProductRef,
    modelDescription,
    swapModeOverride,
    shotSwapOverrides = {},
  } = input;

  const defaultSwapMode = swapModeOverride || autoSelectSwapMode(hasModelRef, hasProductRef);
  const productTruth = buildCommerceProductTruth(fingerprint);

  const shots: CommercePromptPackage[] = [];
  const skippedShots: Array<{ position: number; role: CommerceShotRole; reason: string }> = [];
  const shotWarnings: Record<number, string[]> = {};

  for (const shot of family.shots) {
    // Run compatibility check
    const compat = checkShotCompatibility(shot, fingerprint);

    if (!compat.compatible && compat.severity === "skip") {
      skippedShots.push({
        position: shot.position,
        role: shot.role,
        reason: `Template implies ${compat.conflicts.join(", ")}, garment has none`,
      });
      continue;
    }

    // Drop detail shots that have caution safety AND any conflicts
    // A clean reduced set is better than a wrong detail shot
    if (
      DETAIL_ROLES.includes(shot.role) &&
      shot.replacementSafety === "caution" &&
      !compat.compatible
    ) {
      skippedShots.push({
        position: shot.position,
        role: shot.role,
        reason: `Detail shot with caution safety and conflicts (${compat.conflicts.join(", ")})`,
      });
      continue;
    }

    const image = images.find((i) => i.id === shot.referenceImageId);
    if (!image) {
      throw new Error(
        `[CommercePromptCompiler] Shot ${shot.position} references image "${shot.referenceImageId}" not found in catalog`,
      );
    }

    const shotSwapMode = shotSwapOverrides[shot.position] || defaultSwapMode;

    const compiled = compileSingleShot({
      shot,
      image,
      swapMode: shotSwapMode,
      productTruth,
      fingerprint,
      modelDescription,
      backgroundFamily: family.backgroundFamily,
    });

    // Inject override warning for "warn" severity shots
    if (!compat.compatible && compat.severity === "warn") {
      const warningText = `WARNING: Template reference shows ${compat.conflicts.join(", ")} which this garment does NOT have. Ignore that element in the reference pose.`;
      compiled.positivePrompt = compiled.positivePrompt.replace(
        REFERENCE_LOCK,
        `${REFERENCE_LOCK}\n\n${warningText}`,
      );
      shotWarnings[shot.position] = [
        `Template implies ${compat.conflicts.join(", ")} (adapted)`,
      ];
    }

    shots.push(compiled);
  }

  // Build generation order from surviving shots only
  const survivingShots = family.shots.filter(
    (s) => !skippedShots.some((sk) => sk.position === s.position),
  );

  // Canonical anchor identity: set once at plan creation.
  // All per-shot generation, resume, and persistence code must consume these fields.
  const anchorShot = shots.find((s) => s.isAnchor);
  const anchorShotIndex = anchorShot ? shots.indexOf(anchorShot) : 0;
  const anchorImageKey = anchorShot ? `shot-${anchorShot.position}` : `shot-${shots[0]?.position ?? 0}`;

  return {
    templateFamily: family,
    productFingerprint: fingerprint as unknown as Record<string, unknown>,
    shots,
    generationOrder: buildGenerationOrder(survivingShots),
    generationSchedule: buildGenerationSchedule(survivingShots),
    defaultSwapMode,
    shotSwapOverrides,
    skippedShots,
    shotWarnings,
    effectiveShotCount: shots.length,
    anchorShotIndex,
    anchorImageKey,
  };
}
