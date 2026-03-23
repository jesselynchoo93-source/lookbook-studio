// Lookbook Studio type system — standalone, no imports from prompt-generator.

// ── Product Taxonomy ──

export type ProductFamily =
  | "apparel"
  | "footwear"
  | "bags"
  | "jewelry"
  | "eyewear"
  | "watches"
  | "headwear"
  | "belts"
  | "scarves"
  | "small_accessories"
  | "full_look";

export type GenderPresentation = "menswear" | "womenswear" | "unisex";

export type TargetStyle =
  | "commercial"
  | "editorial"
  | "luxury"
  | "minimal"
  | "street"
  | "resort"
  | "tailoring"
  | "contemporary"
  | "avant_garde";

export type CampaignGoal =
  | "product_clarity"
  | "premium_branding"
  | "silhouette"
  | "movement"
  | "mood"
  | "detail_focus"
  | "styling_story";

export type LogoVisibilityPriority = "high" | "medium" | "low";
export type CreativityLevel = "safe" | "balanced" | "directional";

export type SuitabilityRating = "high" | "medium" | "low";
export type DifficultyLevel = "easy" | "moderate" | "hard";
export type RiskLevel = "low" | "medium" | "high";
export type ShotCategory =
  | "hero"
  | "silhouette"
  | "detail"
  | "motion"
  | "editorial"
  | "product_focus";

// ── Evidence & Capability Model ──

/**
 * What a photograph can prove about a product. Each type is a distinct
 * visual claim that helps a buyer evaluate the product.
 *
 * Scale evidence precedence:
 * - `face_scale`: preferred when face is materially visible in the frame
 * - `body_scale`: preferred when torso or full body is visible
 * - `scale_reference`: generic fallback only when neither face nor torso is visible
 */
export type EvidenceType =
  // Shape and structure
  | "full_silhouette"       // complete outline of the product, head to toe
  | "side_profile"          // product shape from ~90-degree angle
  | "back_shape"            // rear view showing construction
  // Wear and carry
  | "fit_on_body"           // how the product sits when worn
  | "carry_method"          // how a bag is held, slung, or gripped
  | "wrist_visibility"      // product on wrist, visible
  | "ear_visibility"        // product on ear, visible
  | "neckline_visibility"   // product at neckline/collarbone, visible
  | "finger_visibility"     // product on finger, visible
  | "face_framing"          // how eyewear/headwear frames the face
  | "on_foot_presence"      // shoe on foot in context
  | "waist_anchoring"       // belt at waist, visible
  // Material and construction
  | "fabric_drape"          // how fabric falls and moves
  | "texture_detail"        // close-up material grain, weave, leather
  | "hardware_detail"       // buckles, clasps, zippers, chain links
  | "sole_profile"          // shoe sole from low angle
  | "interior_capacity"     // bag interior, lining, pockets
  | "construction_quality"  // stitching, edge finishing, joints
  | "closure_mechanism"     // how a bag/watch/belt closes (clasp, buckle, snap, zipper)
  | "surface_reflection"    // how light plays on metal, glass, patent leather, gemstones
  // Branding
  | "logo_placement"        // brand mark visibility
  | "label_detail"          // interior label, tag
  // Dynamic
  | "movement_behavior"     // how the product moves (stride, swing, drape)
  // Context
  | "styling_context"       // product in a lifestyle/editorial setting
  // Scale (ordered by specificity: face_scale > body_scale > scale_reference)
  | "scale_reference"       // product size relative to ANY body part (generic fallback only)
  | "face_scale"            // product size relative to face (preferred when face visible)
  | "body_scale"            // product size relative to full body/torso (preferred when torso visible)
  // Depth and dimension
  | "profile_depth"         // 3D depth/thickness visible from side angle
  | "dimensional_depth"     // product volume and 3D form (bag structure, watch case thickness)
  | "attachment_point"      // where the product connects to the body (strap drop, ear hook, clasp)
  // Symmetry
  | "pair_symmetry"         // visual confirmation that a matched pair looks balanced (buyer-facing claim)
  | "symmetry_validation";  // AI rendered both halves correctly (generation quality check)

/** Body region that a camera framing can prominently or partially show. */
export type DisplayZone =
  | "full_body"
  | "upper_body"
  | "lower_body"
  | "face"
  | "ear"
  | "neckline"
  | "collarbone"       // distinct from neckline; relevant for necklace chain length
  | "shoulder"
  | "shoulder_line"    // neck-to-shoulder-tip line; relevant for bag straps, scarves
  | "wrist"
  | "hand"
  | "waist"
  | "waist_front"      // front waist specifically; relevant for belt buckle visibility
  | "hip"
  | "side_body"        // lateral torso/hip view; relevant for bag carry profiles
  | "torso_front"
  | "torso_back"
  | "knee_down"
  | "foot"
  | "ankle"            // between knee_down and foot; ankle boots, ankle bracelets
  | "product_only";    // no body context; pure product shot (flat lay, isolated)

export type EvidencePriority = "required" | "recommended" | "optional" | "discouraged";

export interface EvidenceRequirement {
  evidence: EvidenceType;
  priority: EvidencePriority;
  /** Scoring weight. Defaults: required=10, recommended=6, optional=3, discouraged=-5 */
  weight?: number;
}

/** Family-level evidence specification. */
export interface FamilyEvidenceSpec {
  family: ProductFamily;
  evidenceRequirements: EvidenceRequirement[];
  /** Target category distribution, e.g. { hero: 1, detail: 1, product_focus: 2 } */
  categoryRoleMix: Partial<Record<ShotCategory, number>>;
  /** Display zones where the product lives (used for redundancy detection) */
  productZones: DisplayZone[];
}

/** Item-level evidence override. Merged on top of family spec. */
export interface ItemEvidenceOverride {
  items: string[];
  family: ProductFamily;
  label: string;
  /** Add or override specific evidence requirements */
  evidenceOverrides?: EvidenceRequirement[];
  /** Override category role mix */
  categoryRoleMix?: Partial<Record<ShotCategory, number>>;
  /** Override product zones */
  productZones?: DisplayZone[];
}

/** Resolved evidence plan after merging item override > family. */
export interface ResolvedEvidencePlan {
  /** Ordered list: required evidence first, then recommended, then optional */
  orderedEvidence: EvidenceRequirement[];
  /** Target category distribution */
  categoryRoleMix: Partial<Record<ShotCategory, number>>;
  /** Zones where the product is worn/carried */
  productZones: DisplayZone[];
}

export type RedundancySeverity = "critical" | "warning" | "info";

export interface RedundancyWarning {
  severity: RedundancySeverity;
  shotA: number; // position (1-based)
  shotB: number;
  sharedEvidence: EvidenceType[];
  message: string;
}

export interface PlanDiagnostics {
  requiredEvidenceCovered: EvidenceType[];
  recommendedEvidenceCovered: EvidenceType[];
  /** @deprecated Use uncoveredRequired + uncoveredRecommended instead */
  uncoveredEvidence: EvidenceType[];
  uncoveredRequired: EvidenceType[];
  uncoveredRecommended: EvidenceType[];
  uncoveredOptional: EvidenceType[];
  redundancyWarnings: RedundancyWarning[];
  roleMixActual: Partial<Record<ShotCategory, number>>;
  roleMixTarget: Partial<Record<ShotCategory, number>>;
  shotCountRequested: number;
  shotCountActual: number;
  /** F5a: visual variety diagnostic (informational, not blocking) */
  varietyScore?: {
    score: number;       // 0-100, higher = more varied
    flags: string[];     // human-readable warnings
  };
}

// ── Label Maps ──

export const PRODUCT_FAMILY_LABELS: Record<ProductFamily, string> = {
  apparel: "Apparel",
  footwear: "Footwear",
  bags: "Bags",
  jewelry: "Jewelry",
  eyewear: "Eyewear",
  watches: "Watches",
  headwear: "Headwear",
  belts: "Belts",
  scarves: "Scarves",
  small_accessories: "Small Accessories",
  full_look: "Full Look",
};

export const GENDER_LABELS: Record<GenderPresentation, string> = {
  menswear: "Menswear",
  womenswear: "Womenswear",
  unisex: "Unisex",
};

export const STYLE_LABELS: Record<TargetStyle, string> = {
  commercial: "Commercial",
  editorial: "Editorial",
  luxury: "Luxury",
  minimal: "Minimal",
  street: "Street",
  resort: "Resort",
  tailoring: "Tailoring",
  contemporary: "Contemporary",
  avant_garde: "Avant-Garde",
};

export const GOAL_LABELS: Record<CampaignGoal, string> = {
  product_clarity: "Product Clarity",
  premium_branding: "Premium Branding",
  silhouette: "Silhouette",
  movement: "Movement",
  mood: "Mood",
  detail_focus: "Detail Focus",
  styling_story: "Styling Story",
};

export const LOGO_LABELS: Record<LogoVisibilityPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const CREATIVITY_LABELS: Record<CreativityLevel, string> = {
  safe: "Safe",
  balanced: "Balanced",
  directional: "Directional",
};

// ── Core Inputs ──

export interface LookbookInput {
  productFamily: ProductFamily;
  specificItem?: string;
  genderPresentation: GenderPresentation;
  targetStyle: TargetStyle;
  campaignGoal: CampaignGoal;
  logoVisibilityPriority: LogoVisibilityPriority;
  creativityLevel: CreativityLevel;
  shotCount: number;
  notes?: string;
  /** F7: Reference-grounded product fingerprint. */
  productFingerprint?: ProductFingerprint;
  /** F7: Concrete visual continuity tokens. */
  continuityWorld?: ContinuityWorldTokens;
}

// ── Settings Driver ──

export type SettingsDriver =
  | "preset"          // User selected a creative direction preset
  | "ai_recommended"  // AI recommendation auto-applied (no preset selected)
  | "custom"          // User manually edited goal/logo/creativity from scratch
  | "modified_preset"; // User started from a preset then manually changed settings

// ── Starter Presets ──

export interface PresetExplanation {
  shotMix: string;
  brandingPriority: string;
  creativityPosture: string;
  balance: string;
}

export interface StarterPreset {
  id: string;
  label: string;
  description: string;
  defaults: Partial<LookbookInput>;
  explanation: PresetExplanation;
}

// ── Master Shoot DNA ──

export interface MasterShootDNA {
  campaignDirection: string;
  productFamily: ProductFamily;
  specificItem?: string;
  genderPresentation: GenderPresentation;
  targetStyle: TargetStyle;
  campaignGoal: CampaignGoal;
  logoVisibilityPriority: LogoVisibilityPriority;
  creativityLevel: CreativityLevel;
  environmentFamily: string;
  lightingFamily: string;
  lensFamily: string;
  framingFamily: string;
  realismProfile: string;
  brandingVisibilityRules: string;
  motionAllowance: string;
  finishFamily: string;
  generationPriorityNotes: string;
}

// ── Shot Archetype ──

export interface ShotArchetype {
  id: string;
  title: string;
  role: string;
  shotCategory: ShotCategory;
  suitableFamilies: ProductFamily[];
  suitableItems: string[];
  suitableGoals: CampaignGoal[];
  suitableStyles: TargetStyle[];
  suitableGenderPresentation: GenderPresentation[];
  creativityBand: CreativityLevel[];
  logoVisibilitySuitability: SuitabilityRating;
  productClaritySuitability: SuitabilityRating;
  silhouetteSuitability: SuitabilityRating;
  detailSuitability: SuitabilityRating;
  movementSuitability: SuitabilityRating;
  editorialStrength: SuitabilityRating;
  higgsfieldReliability: SuitabilityRating;
  difficulty: DifficultyLevel;
  logoRisk: RiskLevel;
  anatomyRisk: RiskLevel;
  occlusionRisk: RiskLevel;
  bestUsedWhen: string;
  avoidWhen: string;
  defaultFraming: string;
  defaultLens: string;
  defaultAperture: string;
  defaultCameraHeight: string;
  defaultCameraDistance: string;
  defaultAngle: string;
  defaultLighting: string;
  poseFamily: string;
  bodyDirection: string;
  handBehavior: string;
  legBehavior: string;
  headDirection: string;
  realismNotes: string;
  whyItWorks: string;
  deltaBlueprint: string;
  // ── Evidence capability fields ──
  evidenceCapabilities: EvidenceType[];
  primaryDisplayZones: DisplayZone[];
  secondaryDisplayZones: DisplayZone[];
  showsProductInMotion: boolean;
  showsFullProduct: boolean;
}

// ── 3-Layer Blueprint System ──

export type FramingFamily = "full_body" | "three_quarter" | "half_body" | "close_up" | "mixed";
export type MovementLevel = "static" | "subtle" | "moderate" | "active";
export type CropFamily = "full" | "waist_up" | "chest_up" | "face_detail" | "product_zone";
export type BrandingEmphasis = "logo_first" | "product_first" | "balanced" | "secondary";

/** Layer 1: Universal rules that apply to every lookbook regardless of product. */
export interface UniversalBlueprintRules {
  maxShotsPerCategory: number;
  guaranteeClarityShot: boolean;
  guaranteeEditorialWhenCreative: boolean;
  defaultMaxMotionShots: number;
  noDuplicateArchetypes: boolean;
  generationOrderStrategy: "reliability_first" | "category_priority";
}

/** Layer 2: Family-level blueprint. One per ProductFamily. */
export interface FamilyShotBlueprint {
  family: ProductFamily;
  label: string;
  /** What this family is mainly trying to sell */
  sellsFocus: string[];
  preferredFramingFamily: FramingFamily;
  preferredCropFamily: CropFamily;
  preferredMovementLevel: MovementLevel;
  maxMotionShots: number;
  brandingEmphasis: BrandingEmphasis;
  /** Occlusion zones that penalise archetypes for this family */
  occlusionPenalties: string[];
  /** Category priority for generation order (lower index = generate first) */
  generationCategoryOrder: ShotCategory[];
  /** DNA resolver hints */
  dnaHints: {
    environment: string;
    lighting: string;
    lens: string;
    framing: string;
    generationNotes: string;
  };
  /** F5a: set composition rhythm for presentation order and diagnostics */
  setRhythm?: SetRhythm;
}

/** Layer 3: Item-level override. Overrides specific fields from the family blueprint. */
export interface ItemShotOverride {
  /** Items this override applies to (lowercase, matched loosely) */
  items: string[];
  family: ProductFamily;
  label: string;
  /** Override sells focus (replaces family-level) */
  sellsFocus?: string[];
  /** Override preferred crop family */
  preferredCropFamily?: CropFamily;
  /** Override framing family */
  preferredFramingFamily?: FramingFamily;
  /** Override branding emphasis */
  brandingEmphasis?: BrandingEmphasis;
  /** Override max motion shots */
  maxMotionShots?: number;
  /** Additional occlusion penalties (merged with family) */
  addOcclusionPenalties?: string[];
  /** Override generation category order */
  generationCategoryOrder?: ShotCategory[];
  /** Category-keyed "what it sells" language */
  whatItSellsByCategory?: Partial<Record<ShotCategory, string>>;
  /** Additional negative cues for this item */
  additionalNegativeCues?: string[];
  /** Delta brief suffix appended to every shot for this item */
  deltaBriefSuffix?: string;
}

/** The resolved blueprint after merging item override > family > universal. */
export interface ResolvedBlueprint {
  source: string; // e.g. "earrings > jewelry > universal"
  family: ProductFamily;
  sellsFocus: string[];
  preferredFramingFamily: FramingFamily;
  preferredCropFamily: CropFamily;
  preferredMovementLevel: MovementLevel;
  maxMotionShots: number;
  brandingEmphasis: BrandingEmphasis;
  occlusionPenalties: string[];
  generationCategoryOrder: ShotCategory[];
  whatItSellsByCategory: Partial<Record<ShotCategory, string>>;
  additionalNegativeCues: string[];
  deltaBriefSuffix: string;
  // ── Evidence-based planning ──
  evidencePlan: ResolvedEvidencePlan;
  // ── F5a: Composition rhythm ──
  setRhythm?: SetRhythm;
}

// ── Output Types ──

// ── F5a: Visual Diversity Buckets (diagnostic, not selection) ──

export type AngleBucket = "frontal" | "three_quarter" | "profile" | "rear";
export type DistanceBucket = "intimate" | "medium" | "environmental";
export type PoseBucket = "standing" | "seated" | "leaning" | "walking" | "product_only";

export type ShotRole = "hero" | "proof" | "contrast" | "release" | "editorial_finish" | "product_only";

export type ProductOnlyPreference = "strong" | "medium" | "low" | "none";

export interface SetRhythm {
  /** Recommended role sequence for the 6 shots (presentation order, not generation) */
  idealSequence: ShotRole[];
  /** Which roles MUST appear in the set */
  requiredRoles: ShotRole[];
  /** Product-only preference level for this family */
  productOnlyPreference: ProductOnlyPreference;
}

export interface ScoredArchetype {
  archetype: ShotArchetype;
  score: number;
  matchReasons: string[];
  /** F5a: angle bucket derived from defaultAngle */
  angleBucket: AngleBucket;
  /** F5a: distance bucket derived from defaultCameraDistance */
  distanceBucket: DistanceBucket;
  /** F5a: pose bucket derived from poseFamily + primaryDisplayZones */
  poseBucket: PoseBucket;
}

export interface RecommendedShot {
  position: number;
  archetype: ShotArchetype;
  shotPurpose: string;
  whatItSells: string;
  framingDelta: string;
  poseDelta: string;
  productEmphasis: string;
  brandingSafety: string;
  realismNote: string;
  riskSummary: string;
  generationPriority: number;
  badges: string[];
  deltaBrief: string;
  negativeCues: string;
  evidenceProvided: EvidenceType[];
  /** V2: shot-specific realism guardrail (replaces global boilerplate) */
  realismGuardrail: string;
  /** V2: why this shot should be generated at this priority (first 3 only) */
  whyGenerateNow?: string;
  /** V2.1: one-line explanation of why this shot was selected for the set */
  whySelected?: string;
}

export interface CoverageSummary {
  clarity: number;
  branding: number;
  silhouette: number;
  editorial: number;
  detail: number;
  motion: number;
  evidenceCoverage: Partial<Record<EvidenceType, number>>;
}

export interface LookbookPlanResult {
  input: LookbookInput;
  dna: MasterShootDNA;
  shots: RecommendedShot[];
  coverage: CoverageSummary;
  generationOrder: number[];
  /** F5a: gallery/collage display order (contrast-maximised, separate from generation) */
  presentationOrder: number[];
  exportText: string;
  diagnostics: PlanDiagnostics;
}

// ── V3: Generation Workflow Types ──

/** Where this shot sits in the practical generation order */
export type GenerationPhase =
  | "anchor"              // hero + product_focus: generate first, validate product rendering
  | "detail_validation"   // detail: confirm material/hardware renders correctly at close range
  | "editorial";          // editorial + silhouette + motion: atmospheric, generate last

/** Why a shot was rejected and needs retry */
export type RetryReason =
  | "pose"
  | "product_structure"
  | "face"
  | "hands"
  | "lighting"
  | "branding_text"
  | "composition"
  | "consistency"
  | "other";

/** Why an accepted shot may not fit the rest of the set */
export type ContinuityConcern =
  | "face_drift"
  | "lighting_drift"
  | "product_scale_drift"
  | "background_drift"
  | "finish_drift"
  | "mood_drift"
  | "other";

/** Continuity review state for a single shot */
export type ContinuityVerdict = "unreviewed" | "ok" | "concern";

/** Skin polish handoff state */
export type SkinPolishStatus = "not_applicable" | "ready" | "done";

/** Tracker state persisted to localStorage */
export interface TrackerState {
  planKey: string;
  createdAt: string;
  shots: Record<number, ShotStatus>;
}

/** Per-shot status in the tracker */
export interface ShotStatus {
  status: GenerationStatus;
  retryCount: number;
  retryReasons: RetryReason[];
  continuity: ContinuityVerdict;
  continuityConcerns: ContinuityConcern[];
  skinPolish: SkinPolishStatus;
  /** V4.3: Final set review mark. null = unmarked. */
  finalMark: FinalMark;
  lastUpdated: string;
}

/** V4.3: Per-shot final review decision. */
export type FinalMark = "keep" | "replace_later" | "best_in_set" | null;

/** V4.3: Set-level readiness tier (advisory, never blocking). */
export type SetReadinessTier = "not_ready" | "ready_with_issues" | "ready_to_finalise";

/** V4.3: Result of set readiness computation. */
export interface SetReadinessResult {
  tier: SetReadinessTier;
  reasons: string[];
}

/** Per-shot status in the manual generation workflow */
export type GenerationStatus =
  | "pending"
  | "generating"
  | "needs_retry"
  | "accepted"
  | "enhancing"
  | "done";

/** Visual world constraints carried from MasterShootDNA. Immutable per set. */
export interface ContinuityLock {
  environment: string;
  lighting: string;
  lensFamily: string;
  framingFamily: string;
  finish: string;
  realism: string;
  brandingRules: string;
}

// ── V4: Reference Asset Types ──

export type ReferenceType = "model" | "product" | "styling";

/** A single uploaded reference image. Session-only, no persistence in V4.0. */
export interface ReferenceAsset {
  id: string;
  type: ReferenceType;
  /** Original file name from the upload */
  fileName: string;
  /** MIME type, e.g. "image/jpeg", "image/png" */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Object URL from URL.createObjectURL(). Valid for the current session only. */
  previewUrl: string;
  /** Whether this is the primary reference in its group (model or product) */
  isPrimary: boolean;
  /** Whether this reference is a source-of-truth asset (product) vs inspiration (styling) */
  isSourceOfTruth: boolean;
  addedAt: string;
}

// ── V4.1: Persistence Types ──

export const PROJECT_SCHEMA_VERSION = 2;

/** Derived project status, always recomputed on save (cached convenience). */
export type ProjectStatus =
  | "draft"         // has input but no plan yet
  | "planned"       // has a plan, no generation activity
  | "in_progress"   // at least one shot has moved past pending
  | "complete";     // all shots are done

/** ReferenceAsset as stored in IndexedDB (no previewUrl, that's session-only). */
export interface PersistedReferenceAsset {
  id: string;
  type: ReferenceType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  isSourceOfTruth: boolean;
  addedAt: string;
}

/** Image blob stored separately from the project record. */
export interface ReferenceBlobRecord {
  id: string;         // matches PersistedReferenceAsset.id
  projectId: string;
  blob: Blob;
}

// ── V4.2: Generated Image Types ──

/** Metadata for a generated image attached to a shot position (persisted). */
export interface PersistedGeneratedImage {
  shotPosition: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  addedAt: string;
}

/** Session-only version with preview URL restored from blob. */
export interface GeneratedImageAsset extends PersistedGeneratedImage {
  previewUrl: string;
}

/** Blob record for generated images, stored in its own table. */
export interface GeneratedBlobRecord {
  /** Deterministic key: `${projectId}_shot_${shotPosition}` */
  id: string;
  projectId: string;
  blob: Blob;
}

/** Top-level project record stored in IndexedDB. */
export interface ProjectRecord {
  id: string;
  schemaVersion: number;
  name: string;
  /** True if the user has manually edited the project name. */
  nameEdited: boolean;
  createdAt: string;
  updatedAt: string;
  /** Cached convenience, always recomputed on save. */
  status: ProjectStatus;

  // Core data
  input: LookbookInput;
  references: {
    model: PersistedReferenceAsset[];
    product: PersistedReferenceAsset[];
    styling: PersistedReferenceAsset[];
  };

  // Plan (null until generated)
  plan: LookbookPlanResult | null;

  // Tracker (null until plan exists)
  tracker: TrackerState | null;

  // V4.2: Generated images (one per shot position)
  generatedImages: Record<number, PersistedGeneratedImage>;

  // V4.3: Vision extraction metadata
  fingerprintMeta?: FingerprintMeta;
}

/** Generation-ready prompt package for a single shot. */
export interface GenerationPromptPackage {
  // Identity
  shotPosition: number;
  archetypeId: string;
  archetypeTitle: string;

  // Generation workflow
  generationPriority: number;
  generationPhase: GenerationPhase;
  reliabilityLabel: "High reliability" | "Moderate reliability" | "Higher risk";

  // Separated prompt layers
  shootDNA: string;
  shotBrief: string;
  generatorPrompt: string;
  negativePrompt: string;
  guardrailChecklist: string[];

  // Continuity locks (from DNA, immutable per set)
  continuity: ContinuityLock;

  // Context from planner
  evidenceProvided: EvidenceType[];
  whySelected: string;
  whyGenerateNow?: string;

  // Tracker state (mutable at runtime)
  status: GenerationStatus;
  retryReason?: RetryReason;
  retryCount: number;

  // Enhancor handoff
  enhancorNotes: string[];

  // F4: Structured prompt layers (for UI display and debugging)
  promptLayers?: {
    campaignContinuityLock: string;  // Layer 1: from DNA
    productTruthLock: string;        // Layer 2: family invariants
    scaleLock: string;               // Layer 3: proportion rules
    shotDelta: string;               // Layer 4: per-shot framing/angle/pose
  };
  negativeLayers?: {
    globalDefaults: string;          // Tier 1: universal negatives
    familyDrift: string;             // Tier 2: family drift negatives
    shotSpecific: string;            // Tier 3: per-shot negative cues
  };

  // F7: Provider-compiled prompt (short, generation-native)
  providerPrompt?: ProviderPromptOutput;
}

// ── F7: Provider-Facing Prompt Compiler Types ──

/** Provider compilation mode based on shot type. */
export type ProviderCompilationMode = "on-body" | "product-only" | "detail";

/** Output from the provider prompt compiler. */
export interface ProviderPromptOutput {
  positive: string;
  negative: string;
  mode: ProviderCompilationMode;
  wordCount: number;
}

/** Provider-level settings for prompt compilation. */
export interface ProviderPromptConfig {
  provider: "higgsfield" | "generic";
  model: string;
  maxPromptWords: number;
  renderLogoText: boolean;
}

// ── F7: Product Fingerprint Types ──

/** Base fingerprint fields shared by all accessory families. */
export interface ProductFingerprintBase {
  materialFinish: string;
  materialColour: string;
  hardwareFinish: "gold" | "silver" | "gunmetal" | "rose-gold" | "brass" | "matte-black" | "none";
  logoPlacement: string;
  logoScale: "subtle" | "medium" | "prominent" | "none";
  logoStyle: "foil" | "embossed" | "engraved" | "metal-plate" | "printed" | "none";
  forbiddenElements: string[];
  additionalNotes?: string;
}

export interface BagFingerprint extends ProductFingerprintBase {
  family: "bags";
  silhouettePrimary: string;
  silhouetteShape: string;
  handleCount: number;
  handleType: string;
  handleAttachment: string;
  strapPresent: boolean;
  strapType?: string;
  closureType: string;
  constructionStyle: string;
}

export interface WatchFingerprint extends ProductFingerprintBase {
  family: "watches";
  caseShape: string;
  caseSize: string;
  dialColour: string;
  dialType: string;
  bezelType: string;
  strapType: string;
  strapColour: string;
  crownPosition: string;
  complicationCount: number;
  constructionStyle: string;
}

export interface BeltFingerprint extends ProductFingerprintBase {
  family: "belts";
  beltWidth: string;
  buckleType: string;
  buckleShape: string;
  tipStyle: string;
  constructionStyle: string;
}

export interface JewelryFingerprint extends ProductFingerprintBase {
  family: "jewelry";
  jewelryType: string;
  pairSymmetry?: boolean;
  dropLength?: string;
  chainType?: string;
  settingType?: string;
  stonePresent: boolean;
  stoneType?: string;
  constructionStyle: string;
}

export type ProductFingerprint =
  | BagFingerprint
  | WatchFingerprint
  | BeltFingerprint
  | JewelryFingerprint;

// ── F7: Fingerprint Extraction Metadata ──

/** How the product fingerprint was produced. */
export type FingerprintSource = "auto" | "manual" | "edited";

/** Metadata about the vision extraction stored on ProjectRecord. */
export interface FingerprintMeta {
  /** SHA-256 of the primary product image blob used for extraction. */
  signature: string;
  /** Overall confidence of the extraction result. */
  confidence: "high" | "medium" | "low";
  /** Caveats or notes from the extraction/normalisation pass. */
  notes: string[];
  /** How the fingerprint was produced. */
  source: FingerprintSource;
  /** ISO timestamp of when extraction completed. */
  extractedAt: string;
}

// ── F7: Continuity World Tokens ──

/** Concrete visual tokens for provider continuity. */
export interface ContinuityWorldTokens {
  backdrop: string;
  lighting: string;
  tonalTemperature: string;
  styling: string;
  modelTokens: string;
}

/** Named world preset. */
export interface WorldPreset {
  id: string;
  label: string;
  tokens: ContinuityWorldTokens;
}
