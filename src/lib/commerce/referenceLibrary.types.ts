/**
 * Commerce Reference Library Types
 *
 * Core types for the curated reference shot library that powers the
 * commerce engine. These types define catalog entries, shot roles,
 * source tiering, safety scores, and the controlled vocabularies
 * used throughout the commerce pipeline.
 *
 * STRUCTURAL RULE: This module may import shared enums from
 * @/lib/lookbook/types (ProductFamily, GenderPresentation).
 * It must NOT import from tasteBridge, worldProfiles, shootDNA,
 * scoring, recommendShots, realismNormalizer, or providerCompiler.
 */

import type { ProductFamily, GenderPresentation } from "@/lib/lookbook/types";

// ── Commerce Shot-Role Taxonomy ──

export type CommerceShotRole =
  | "front_seller"
  | "three_quarter_seller"
  | "side_fit_proof"
  | "back_fit_proof"
  | "detail_construction"
  | "detail_material"
  | "motion_drape_proof"
  | "seated_drape_proof";

export const COMMERCE_SHOT_ROLE_LABELS: Record<CommerceShotRole, string> = {
  front_seller: "Front Seller",
  three_quarter_seller: "Three-Quarter Seller",
  side_fit_proof: "Side Fit Proof",
  back_fit_proof: "Back Fit Proof",
  detail_construction: "Detail: Construction",
  detail_material: "Detail: Material",
  motion_drape_proof: "Motion Drape Proof",
  seated_drape_proof: "Seated Drape Proof",
};

export const REQUIRED_COMMERCE_ROLES: CommerceShotRole[] = [
  "front_seller",
  "three_quarter_seller",
  "side_fit_proof",
  "back_fit_proof",
];

export const OPTIONAL_COMMERCE_ROLES: CommerceShotRole[] = [
  "detail_construction",
  "detail_material",
  "motion_drape_proof",
  "seated_drape_proof",
];

// ── Source Tiering ──
// Tier assignment is review-based, not brand-name-based.
// Brand names seed sourcing; approval is always image-level and family-level.

export type SourceTier = "A" | "B" | "C";

export type SourceType = "pdp" | "catalog" | "wholesale_linesheet" | "press_kit";

// ── Background & Lighting Classes ──

export type BackgroundClass =
  | "seamless_white"
  | "seamless_grey"
  | "concrete_minimal"
  | "architectural_clean"
  | "studio_gradient";

export type LightingClass =
  | "soft_even"
  | "soft_directional"
  | "hard_directional"
  | "window_natural";

// ── Best-For Product Tags (controlled vocabulary) ──

export type BestForTag =
  | "dresses"
  | "tops"
  | "blouses"
  | "tailoring"
  | "outerwear"
  | "knitwear"
  | "skirts"
  | "trousers"
  | "bags"
  | "accessories";

// ── Approval & Quality ──

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ReplacementSafety = "safe" | "caution" | "risky";

export type CoverageQuality = "complete" | "strong" | "partial";

// ── Stability Badges (controlled vocabulary for UI) ──

export type StabilityBadge = "Very stable" | "Flexible" | "Motion-friendly";

// ── Swap Modes ──

export type CommerceSwapMode =
  | "face_only"
  | "identity_and_garment"
  | "garment_only";

export const SWAP_MODE_LABELS: Record<CommerceSwapMode, string> = {
  face_only: "Face Only",
  identity_and_garment: "Identity + Garment",
  garment_only: "Garment Only",
};

// ── Safety Scores ──

export interface CommerceSafetyScores {
  /** How completely the product is shown (5 = fully visible, no occlusion) */
  productVisibilityScore: number;
  /** How neutral/clean the background is (5 = seamless studio white/grey) */
  backgroundNeutralityScore: number;
  /** How likely the pose drifts during generation (1 = static front-on, 5 = complex motion) */
  poseDeviationRisk: number;
  /** Risk of accessories/styling contaminating the product (1 = product-only, 5 = heavy layering) */
  stylingContaminationRisk: number;
  /** How hard it is to swap the garment cleanly (1 = simple swap, 5 = complex drape/construction) */
  garmentReplacementDifficulty: number;
  /** How hard it is to swap just the face (1 = face clearly visible/neutral, 5 = face occluded/extreme angle) */
  faceSwapDifficulty: number;
  /** How hard it is to swap full identity including body proportions (1 = standard pose, 5 = body heavily layered/occluded) */
  fullIdentitySwapDifficulty: number;
}

// ── Catalog Reference Image ──

export interface CatalogReferenceImage {
  /** SHA-256 hash of the image file */
  id: string;
  fileName: string;
  relativePath: string;

  // Source metadata
  // sourceType and sourceTier are independent fields.
  // Tier must never be inferred from source type or brand name.
  sourceUrl: string;
  sourceBrand: string;
  sourceType: SourceType;
  sourceTier: SourceTier;

  // Shot metadata
  shotRole: CommerceShotRole;

  // Camera
  angle: string;
  framing: string;
  cameraHeight: string;

  // Pose
  poseClass: string;
  bodyDirection: string;
  handPlacement: string;
  headDirection: string;

  // Scene
  backgroundClass: BackgroundClass;
  lightingClass: LightingClass;

  // Context
  productFamily: ProductFamily;
  genderPresentation: GenderPresentation;

  // Quality & safety
  qualityScore: number;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  safetyScores: CommerceSafetyScores;

  // Family linkage
  familyId?: string;

  // Vision extraction (populated in Phase 3)
  extractedConstraints?: SceneConstraints;
}

// ── Scene Constraints (Vision Extraction Output) ──

/**
 * Zones of the garment visible or occluded in the reference image.
 * Used for replacement safety assessment.
 */
export type ProductZone =
  | "front_bodice"
  | "back_bodice"
  | "left_sleeve"
  | "right_sleeve"
  | "left_sleeve_lower"
  | "right_sleeve_lower"
  | "collar"
  | "neckline"
  | "waistband"
  | "skirt_front"
  | "skirt_back"
  | "skirt_left"
  | "skirt_right"
  | "trouser_front_left"
  | "trouser_front_right"
  | "trouser_back"
  | "hemline"
  | "closure_front"
  | "closure_back"
  | "pocket_left"
  | "pocket_right"
  | "hood"
  | "cuff_left"
  | "cuff_right";

export interface OccludedZone {
  zone: ProductZone;
  reason: string;
}

export interface SceneConstraints {
  // Pose
  poseClass: string;
  bodyDirection: string;
  weightDistribution: string;
  spineAngle: string;
  shoulderAlignment: string;

  // Hands
  handPlacement: string;
  leftHandDetail: string;
  rightHandDetail: string;

  // Head
  headDirection: string;
  chinAngle: string;
  gazeTarget: string;
  expression: string;

  // Camera
  cameraAngle: string;
  cameraHeight: string;
  estimatedFocalLength: string;
  estimatedDistance: string;
  framing: string;

  // Scene
  backgroundType: string;
  backgroundDetail: string;
  backgroundHue: number;
  backgroundSaturation: number;
  backgroundLuminance: number;
  lightDirection: string;
  lightQuality: string;
  shadowVisibility: string;

  // Composition
  subjectPlacement: string;
  headroomRatio: number;
  footroomRatio: number;

  // Garment visibility/occlusion
  visibleProductZones: ProductZone[];
  occludedProductZones: OccludedZone[];
  /** 0-1 ratio of visible product surface to total expected surface for this shot role */
  garmentCoverageCompleteness: number;
  /** safe = >80% visible, clean edges; caution = 60-80% or partial occlusion; risky = <60% or complex occlusion */
  replacementSafety: ReplacementSafety;

  /** Vision extraction confidence (0-1) */
  confidence: number;
  /**
   * CURATOR-ONLY: do not interpolate into prompts or clipboard output.
   * Raw AI extraction text that may contain descriptive contamination.
   */
  notes: string;
}

// ── Template Family ──

/** Whether a detail shot shows the garment on a body or as a flat/macro product shot. */
export type DetailPresentation = "worn_on_body" | "flat_or_macro";

// ── Shot Composition Vocabulary (V3.2.5) ──

export type CompositionType =
  | "front_facing"
  | "three_quarter"
  | "back_view"
  | "side_view"
  | "flat_lay"
  | "macro_crop"
  | "seated";

export type CropClass =
  | "full_body"
  | "upper_body"
  | "mid_body"
  | "tight_crop"
  | "flat_full_product";

export type GarmentFocus =
  | "silhouette"
  | "construction"
  | "material"
  | "neckline"
  | "waist"
  | "hem"
  | "sleeve";

export type BodyDirection =
  | "front"
  | "three_quarter_left"
  | "three_quarter_right"
  | "back"
  | "side_left"
  | "side_right"
  | "not_applicable";

export type HandPlacement =
  | "at_sides"
  | "hand_in_pocket"
  | "both_hands_visible"
  | "one_hand_on_hip"
  | "arms_crossed"
  | "arms_relaxed"
  | "not_applicable";

export type HeadDirection =
  | "to_camera"
  | "away_from_camera"
  | "left"
  | "right"
  | "downward"
  | "not_applicable";

export type BackgroundAuthority =
  | "template"
  | "anchor"
  | "none";

// ── ShotIntent (resolved at compile time) ──

export interface ShotIntent {
  role: CommerceShotRole;
  compositionType: CompositionType;
  cropClass: CropClass;
  garmentFocus: GarmentFocus;
  bodyDirection: BodyDirection;
  handPlacement: HandPlacement;
  headDirection: HeadDirection;
  detailPresentation: DetailPresentation | undefined;
  /** Derived from role + detailPresentation. Not authored metadata. */
  backgroundAuthority: BackgroundAuthority;
  /** Composite key for duplicate intent detection within a family. */
  visualIntentKey: string;
}

// ── Garment Feature Vocabulary ──
// Controlled tokens for compatibility checking. All impliedGarmentFeatures
// and forbiddenElements must use these exact tokens.

export const GARMENT_FEATURE_TOKENS = [
  "pockets",
  "pocket_flaps",
  "belt",
  "belt_loops",
  "hood",
  "structured_waist_seam",
  "buttons",
  "zipper",
  "collar",
  "lapels",
  "structured_seams",
  "cuffs",
  "epaulettes",
] as const;

export type GarmentFeatureToken = (typeof GARMENT_FEATURE_TOKENS)[number];

/** Map common free-text extraction outputs to canonical tokens. */
const FEATURE_TOKEN_MAP: Record<string, GarmentFeatureToken> = {
  pockets: "pockets",
  pocket: "pockets",
  "pocket flaps": "pocket_flaps",
  "pocket flap": "pocket_flaps",
  pocket_flaps: "pocket_flaps",
  belt: "belt",
  "belt loops": "belt_loops",
  "belt loop": "belt_loops",
  belt_loops: "belt_loops",
  hood: "hood",
  "structured waist seam": "structured_waist_seam",
  "structured waistband": "structured_waist_seam",
  structured_waist_seam: "structured_waist_seam",
  buttons: "buttons",
  button: "buttons",
  zipper: "zipper",
  zip: "zipper",
  collar: "collar",
  lapels: "lapels",
  lapel: "lapels",
  "structured seams": "structured_seams",
  structured_seams: "structured_seams",
  cuffs: "cuffs",
  cuff: "cuffs",
  epaulettes: "epaulettes",
  epaulette: "epaulettes",
};

/** Normalize a free-text feature string to a canonical token. Returns null for unknown values. */
export function normalizeToFeatureToken(raw: string): GarmentFeatureToken | null {
  const key = raw.trim().toLowerCase();
  return FEATURE_TOKEN_MAP[key] ?? null;
}

export interface TemplateFamilyShot {
  position: number;
  role: CommerceShotRole;
  referenceImageId: string;
  /** Path relative to /commerce-refs/, e.g. "apparel/everlane-riviera-dress/shot-02.jpg" */
  thumbnailPath?: string;
  isAnchor: boolean;
  /** Human-readable pose description. Documentation only, never used by compiler. */
  poseVariation: string;
  /** Human-readable framing description. Documentation only, never used by compiler. */
  framingVariation: string;
  /** Denormalized from extracted constraints at family assembly time */
  replacementSafety: ReplacementSafety;
  /** Denormalized from catalog entry */
  sourceTier: SourceTier;
  /** Garment features this shot's pose/framing implies (e.g., "pockets", "belt").
   *  Used for compatibility checking against fingerprint.forbiddenElements. */
  impliedGarmentFeatures?: GarmentFeatureToken[];
  /** For detail_construction and detail_material roles only.
   *  "worn_on_body" = shot shows body/skin/shoulders/face, needs model ref.
   *  "flat_or_macro" = flat lay or macro crop, no body visible, no model ref needed. */
  detailPresentation?: DetailPresentation;

  /** Structured shot composition fields (V3.2.5). Required for all families. */
  compositionType: CompositionType;
  cropClass: CropClass;
  garmentFocus: GarmentFocus;
  bodyDirection: BodyDirection;
  handPlacement: HandPlacement;
  headDirection: HeadDirection;
}

export interface CameraLogic {
  primaryLens: string;
  aperture: string;
  heightRange: string;
  distanceConsistency: string;
}

export type StylingStrictness = "identical" | "consistent";

export interface TemplateFamilyDefinition {
  id: string;
  name: string;
  description: string;
  /** One-sentence user-facing description answering "what does this set give me?" */
  userDescription?: string;

  // Visual system locks (enforced at family level, not per-shot)
  backgroundFamily: BackgroundClass;
  lightingFamily: LightingClass;
  cameraLogic: CameraLogic;
  stylingStrictness: StylingStrictness;

  // Product scope
  productFamilies: ProductFamily[];
  genderPresentation: GenderPresentation;

  /**
   * Curated tags from controlled vocabulary, set during family assembly.
   * Never auto-inferred. If uncertain about suitability, omit.
   * A family with no tags is valid; it ranks lower in filtered searches.
   */
  bestForProductTypes: BestForTag[];

  // Shots (exactly 6)
  shots: TemplateFamilyShot[];

  /**
   * Must reference a Tier A image with shotRole: front_seller or three_quarter_seller.
   */
  anchorShotId: string;

  // Quality
  coherenceScore: number;
  approvalStatus: ApprovalStatus;

  /**
   * complete: all 4 required roles filled with "safe" shots + at least 1 detail or drape-proof role
   * strong: all 4 required roles filled with "safe" shots, remaining slots caution or optional roles missing
   * partial: 1+ required roles missing or filled with "caution" shots
   */
  coverageQuality: CoverageQuality;
}

// ── Shot Role Strategy ──

export interface ShotRoleStrategy {
  /** Include model reference image in API call? */
  includeModelRef: boolean;
  /** Inject anchor consistency target text? */
  includeConsistencyTarget: boolean;
  /** Run post-generation drift comparison? */
  runDriftCheck: boolean;
  /** Garment-subject emphasis only. Never composition/crop framing. */
  focusDirective?: string;
  /** Extra role-specific prompt text */
  additionalInstructions?: string;
  /** Max retries for drift failure */
  maxDriftRetries: number;
}

// ── Commerce Prompt Package ──

export interface CommercePromptPackage {
  referenceImagePath: string;
  positivePrompt: string;
  negativePrompt: string;
  referenceLock: string;
  swapMode: CommerceSwapMode;
  replacementInstruction: string;
  modelInstruction?: string;
  productTruth: string;
  shotRole: CommerceShotRole;
  position: number;
  isAnchor: boolean;
  replacementSafety: ReplacementSafety;
  roleStrategy: ShotRoleStrategy;
  /** True for identity-bearing detail shots (worn on body). Used by API route for image authority ordering. */
  isWornDetail: boolean;
}

// ── Generation Schedule ──

export interface GenerationSchedule {
  /** Anchor shot position (generated first, serial) */
  anchor: number;
  /** Core body shot positions (generated in one parallel batch after anchor) */
  coreBody: number[];
  /** Detail/texture shot positions (generated in one parallel batch after core) */
  detailTexture: number[];
}

export interface CommerceGenerationPlan {
  templateFamily: TemplateFamilyDefinition;
  productFingerprint: Record<string, unknown>;
  shots: CommercePromptPackage[];
  generationOrder: number[];
  /** Structured 3-phase schedule: anchor -> core body -> detail/texture */
  generationSchedule: GenerationSchedule;
  defaultSwapMode: CommerceSwapMode;
  /** Per-shot swap mode overrides (shot position -> mode) */
  shotSwapOverrides: Record<number, CommerceSwapMode>;
  /** Shots skipped due to template-garment incompatibility */
  skippedShots: Array<{ position: number; role: CommerceShotRole; reason: string }>;
  /** Per-shot warnings (position -> warning messages) */
  shotWarnings: Record<number, string[]>;
  /** Effective shot count after skips. Displayed to user. */
  effectiveShotCount: number;
  /** Canonical anchor shot index within the `shots` array. Set at plan creation.
   *  All per-shot generation, resume, and persistence code must consume this field.
   *  No component may derive anchor identity independently. */
  anchorShotIndex: number;
  /** Canonical key for looking up the anchor's generated image in the results map.
   *  Format: `shot-{position}`. Set at plan creation alongside anchorShotIndex. */
  anchorImageKey: string;
}
