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

// ── User-Facing Control Types (new hierarchy) ──

export type PrimaryObjective =
  | "sell_clearly"
  | "shape_and_fit"
  | "craftsmanship"
  | "editorial_story";

export type SecondaryEmphasis =
  | "branding"
  | "movement"
  | "mood"
  | "styling"
  | "detail";

/** Risk budget for archetype eligibility and motion allowance */
export type PoseDirection = "safe" | "balanced" | "directional";

// ── Taste Translation ──

export type ProductSensibility =
  | "fluid_sensual"
  | "structured_tailored"
  | "soft_casual"
  | "technical_sport"
  | "ornamental_decorative"
  | "minimal_refined";

export type WorldTone =
  | "soft"
  | "sharp"
  | "intimate"
  | "monumental"
  | "airy"
  | "urban_raw";

export type LightAttitude = "skin_friendly" | "sculptural" | "neutral" | "graphic";
/** Controls how archetype-specific lighting overrides blend with DNA-level lighting.
 * strict: ignore archetype lighting, use DNA/attitude defaults only.
 * guided: extract direction hint from archetype, compose with DNA quality/temperature.
 * free: archetype lighting replaces everything (legacy behavior). */
export type LightingConsistencyMode = "strict" | "guided" | "free";
export type EmotionalRegister = "sensual" | "confident" | "quiet" | "sharp";
export type SurfaceTone = "tactile" | "polished" | "hard" | "soft";

export interface TasteBridge {
  worldTone: WorldTone;
  lightAttitude: LightAttitude;
  emotionalRegister: EmotionalRegister;
  surfaceTone: SurfaceTone;
}

/** Policy strength for secondary objects in the set */
export type SecondaryObjectPolicy = "forbid" | "allow_supporting_only" | "allow_full_styling";

/** Editorial rhythm beat: abstract emotional role for each slot in an editorial set */
export type EditorialBeat =
  | "establish"   // anchor: set the world and character
  | "build"       // contrast1: introduce visual tension
  | "pivot"       // contrast2: change energy or angle
  | "breathe"     // release: visual rest, intimacy
  | "resolve"     // movement: emotional resolution through motion
  | "reveal";     // detail_close: reveal product truth

/** How much logo/label evidence should appear in the set */
export type BrandVisibility = "low" | "medium" | "high";

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

/** Canonical display labels for shot categories. Use everywhere a category is shown to the user. */
export const SHOT_CATEGORY_LABELS: Record<ShotCategory, string> = {
  hero: "Hero",
  silhouette: "Silhouette",
  detail: "Detail",
  motion: "Motion",
  editorial: "Editorial",
  product_focus: "Product Focus",
};

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
  /** Visual rhythm slot-fill log: which slots were filled, relaxed, or failed */
  slotFillLog?: SlotFillEntry[];
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

// ── New Control Label Maps ──

export const PRIMARY_OBJECTIVE_LABELS: Record<PrimaryObjective, string> = {
  sell_clearly: "Sell the product clearly",
  shape_and_fit: "Emphasise shape and fit",
  craftsmanship: "Highlight craftsmanship and detail",
  editorial_story: "Tell a brand/editorial story",
};

export const SECONDARY_EMPHASIS_LABELS: Record<SecondaryEmphasis, string> = {
  branding: "Branding visibility",
  movement: "Movement",
  mood: "Mood",
  styling: "Styling",
  detail: "Detail",
};

export const POSE_DIRECTION_LABELS: Record<PoseDirection, string> = {
  safe: "Conservative",
  balanced: "Balanced",
  directional: "Expressive",
};

export const BRAND_VISIBILITY_LABELS: Record<BrandVisibility, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// ── Core Inputs ──

export interface LookbookInput {
  productFamily: ProductFamily;
  specificItem?: string;
  genderPresentation: GenderPresentation;
  targetStyle: TargetStyle;
  /** What the set should achieve (strongest driver) */
  primaryObjective: PrimaryObjective;
  /** Optional additional bias (single-select, can be omitted) */
  secondaryEmphasis?: SecondaryEmphasis;
  /** How much logo/label evidence should appear */
  brandVisibility: BrandVisibility;
  /** Risk budget for archetype eligibility and motion */
  poseDirection: PoseDirection;
  shotCount: number;
  notes?: string;
  /** F7: Reference-grounded product fingerprint. */
  productFingerprint?: ProductFingerprint;
  /** World lock mode: "auto" uses references, named families force override. */
  worldLockMode?: WorldLockMode;
  /** Raw Gemini extraction from styling reference (environment-only). */
  extractedWorld?: ExtractedWorldTokens;
}

// ── Settings Driver ──

export type SettingsDriver =
  | "ai_recommended"  // AI recommendation auto-applied (default)
  | "custom";         // User manually edited goal/logo/creativity

// ── Master Shoot DNA ──

export interface MasterShootDNA {
  campaignDirection: string;
  productFamily: ProductFamily;
  specificItem?: string;
  genderPresentation: GenderPresentation;
  targetStyle: TargetStyle;
  primaryObjective: PrimaryObjective;
  secondaryEmphasis?: SecondaryEmphasis;
  brandVisibility: BrandVisibility;
  poseDirection: PoseDirection;
  worldProfile: WorldProfile;
  worldSummary: string;
  lightingSummary: string;
  lensFamily: string;
  framingFamily: string;
  realismProfile: string;
  brandingVisibilityRules: string;
  motionAllowance: string;
  finishFamily: string;
  generationPriorityNotes: string;
  brandGuidelines?: string;
  sensibility: ProductSensibility;
  tasteBridge: TasteBridge;
  secondaryObjectPolicy: SecondaryObjectPolicy;
  lightingConsistency: LightingConsistencyMode;
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
  /** When set, this archetype is only eligible for these families. Replaces hardcoded semantic gates. */
  exclusiveTo?: ProductFamily[];
  /** Item-specific title overrides. Key is a normalized subtype (e.g. "dress", "skirt"). */
  titleOverrides?: Record<string, string>;
  /** Item-specific role overrides. Key is a normalized subtype (e.g. "dress", "skirt"). */
  roleOverrides?: Record<string, string>;
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

// ── Visual Rhythm System ──

export type RhythmSlot = "anchor" | "contrast1" | "contrast2" | "release" | "movement" | "detail_close";

export interface RhythmSlotSpec {
  slot: RhythmSlot;
  /** Descriptive label for diagnostics (e.g. "Back/Profile Contrast") */
  label: string;
  /** What this slot achieves compositionally */
  description: string;
  /** Allowed angles for this slot (empty/undefined = any) */
  requiredAngle?: AngleBucket[];
  /** Allowed poses for this slot (empty/undefined = any) */
  requiredPose?: PoseBucket[];
  /** Allowed framing buckets for this slot (empty/undefined = any) */
  requiredFraming?: string[];
  /** Shot categories that naturally fit this slot */
  preferredCategories: ShotCategory[];
  /** Must this slot be filled, or is it a preferred beat? */
  required: boolean;
  /** Editorial rhythm beat (only set when objective is editorial_story) */
  editorialBeat?: EditorialBeat;
}

export interface SlotFillEntry {
  slot: RhythmSlot;
  label: string;
  status: "filled" | "relaxed" | "failed" | "skipped_optional" | "backfilled";
  archetypeId?: string;
  relaxReason?: string;
}

export interface SetRhythm {
  /** Recommended role sequence for the 6 shots (presentation order, not generation) */
  idealSequence: ShotRole[];
  /** Which roles MUST appear in the set */
  requiredRoles: ShotRole[];
  /** Product-only preference level for this family */
  productOnlyPreference: ProductOnlyPreference;
  /** Visual rhythm slot definitions for composition-driven selection */
  rhythmSlots?: RhythmSlotSpec[];
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
  /** Visual rhythm slot this shot fills (assigned during selection) */
  rhythmSlot?: RhythmSlot;
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
  /** V2: why this shot should be generated at this priority (first 3 only) */
  whyGenerateNow?: string;
  /** V2.1: one-line explanation of why this shot was selected for the set */
  whySelected?: string;
  /** Visual rhythm slot this shot fills */
  rhythmSlot?: RhythmSlot;
  /** Item-resolved title (e.g. "Seated Drape Line" instead of "Seated Full Trouser Line" for dresses) */
  resolvedTitle?: string;
  /** Item-resolved role description */
  resolvedRole?: string;
  /** Editorial beat assigned to this shot (only for editorial sets) */
  editorialBeat?: EditorialBeat;
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
  /**
   * Whether this reference is a source-of-truth asset (product) vs inspiration (styling).
   * @deprecated Set but never read by any engine file. Primary selection flows
   * through isPrimary -> vision extraction -> ProductFingerprint instead.
   */
  isSourceOfTruth: boolean;
  addedAt: string;
}

// ── Engine Selection ──

export type StudioEngine = "editorial" | "commerce";

// ── V4.1: Persistence Types ──

export const PROJECT_SCHEMA_VERSION = 4;

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
  /**
   * Whether this reference is a source-of-truth asset (product) vs inspiration (styling).
   * @deprecated Set but never read by any engine file. Primary selection flows
   * through isPrimary -> vision extraction -> ProductFingerprint instead.
   */
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
  /** Commerce run isolation: family + run + reference identity */
  familyId?: string;
  runId?: string;
  referenceImageId?: string;
  configHash?: string;
}

/** Session-only version with preview URL restored from blob. */
export interface GeneratedImageAsset extends PersistedGeneratedImage {
  previewUrl: string;
}

/** Blob record for generated images, stored in its own table. */
export interface GeneratedBlobRecord {
  /** Deterministic key: `${projectId}_${familyId}_${runId}_shot_${shotPosition}` (commerce) or `${projectId}_shot_${shotPosition}` (editorial) */
  id: string;
  projectId: string;
  blob: Blob;
}

// ── Commerce Run Isolation ──

/** Commerce run metadata persisted alongside the project for resume validation. */
export interface CommerceRunMeta {
  runId: string;
  familyId: string;
  configHash: string;
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

  /** V4: Studio engine. "editorial" (default) or "commerce" (reference-locked). */
  engine: StudioEngine;

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

  // V5: Commerce run isolation metadata
  commerceRunMeta?: CommerceRunMeta;

  // V5.1: Commerce generation plan (persisted for resume)
  commercePlan?: import("@/lib/commerce/referenceLibrary.types").CommerceGenerationPlan;

  // V5.1: Selected template family ID (persisted for setup resume)
  selectedFamilyId?: string;
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

export interface EyewearFingerprint extends ProductFingerprintBase {
  family: "eyewear";
  eyewearType: string; // sunglasses, optical, reading
  frameShape: string; // aviator, wayfarer, cat-eye, round, rectangular, oversized
  frameMaterial: string; // acetate, metal, titanium, mixed
  lensType: string; // tinted, gradient, mirrored, clear, polarised
  lensColour: string;
  templeStyle: string; // straight, curved, wire
  bridgeType: string; // keyhole, saddle, adjustable-nose-pad
  constructionStyle: string;
}

export interface ApparelFingerprint extends ProductFingerprintBase {
  family: "apparel";
  apparelType: string; // jacket, coat, dress, shirt, trousers, skirt, blazer
  fitType: string; // slim, regular, oversized, tailored, relaxed
  neckline: string; // crew, v-neck, collar, lapel, mock, turtleneck
  sleeveLength: string; // sleeveless, short, three-quarter, long
  hemLength: string; // cropped, hip, knee, midi, maxi, floor
  closureType: string; // button, zip, snap, pull-on, wrap, toggle
  constructionStyle: string;
}

export interface FootwearFingerprint extends ProductFingerprintBase {
  family: "footwear";
  footwearType: string; // sneaker, boot, loafer, heel, sandal, flat, oxford, mule
  heelHeight: string; // flat, low, mid, high, platform
  toeShape: string; // round, pointed, square, almond, open
  soleType: string; // rubber, leather, platform, espadrille, wedge
  closureType: string; // lace-up, slip-on, buckle, zip, strap, velcro
  ankleHeight: string; // low, ankle, mid-calf, knee, over-knee
  constructionStyle: string;
}

export interface HeadwearFingerprint extends ProductFingerprintBase {
  family: "headwear";
  headwearType: string; // cap, beanie, fedora, bucket, beret, visor, wide-brim
  crownShape: string; // structured, unstructured, flat-top, round
  brimStyle: string; // flat, curved, wide, narrow, none
  closureType: string; // adjustable-strap, snapback, fitted, elastic, none
  constructionStyle: string;
}

export interface ScarfFingerprint extends ProductFingerprintBase {
  family: "scarves";
  scarfType: string; // scarf, shawl, bandana, wrap, stole, necktie
  dimensions: string; // square, rectangular, long-narrow, oversized
  fabricWeight: string; // sheer, lightweight, medium, heavy
  patternType: string; // solid, printed, woven, jacquard, embroidered
  edgeFinish: string; // fringed, hemmed, raw, rolled, tasselled
  constructionStyle: string;
}

export interface SmallAccessoryFingerprint extends ProductFingerprintBase {
  family: "small_accessories";
  accessoryType: string; // wallet, card-holder, key-ring, phone-case, pouch, coin-purse
  openingType: string; // fold, zip, snap, slip
  cardSlots?: number;
  compartmentCount?: number;
  constructionStyle: string;
}

export interface FullLookFingerprint extends ProductFingerprintBase {
  family: "full_look";
  primaryPiece: string; // the hero garment or accessory
  layeringCount: number; // number of visible layers
  colourPalette: string; // dominant colour scheme
  styleDirection: string; // casual, formal, streetwear, editorial, athleisure
  constructionStyle: string;
}

export type ProductFingerprint =
  | BagFingerprint
  | WatchFingerprint
  | BeltFingerprint
  | JewelryFingerprint
  | EyewearFingerprint
  | ApparelFingerprint
  | FootwearFingerprint
  | HeadwearFingerprint
  | ScarfFingerprint
  | SmallAccessoryFingerprint
  | FullLookFingerprint;

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

/**
 * @deprecated Replaced by WorldProfile + ExtractedWorldTokens.
 * Kept temporarily for migration compatibility.
 */
export interface ContinuityWorldTokens {
  backdrop: string;
  lighting: string;
  tonalTemperature: string;
  styling: string;
}

/**
 * @deprecated Replaced by WORLD_FAMILY_DEFAULTS in worldProfiles.ts.
 */
export interface WorldPreset {
  id: string;
  label: string;
  tokens: ContinuityWorldTokens;
}

// ── World System ──

export type WorldFamily =
  | "studio_minimal"
  | "architectural_interior"
  | "architectural_exterior"
  | "furnished_interior"
  | "urban_exterior"
  | "natural_exterior";

export type LightingCharacter =
  | "soft_even"
  | "soft_directional"
  | "directional_daylight"
  | "window_light"
  | "overcast_outdoor"
  | "hard_directional";

export type TonalTemperature = "cool" | "neutral" | "warm";

export type PropDensity = "none" | "minimal" | "sparse";

export type WorldInteractionLevel =
  | "none"
  | "lean_only"
  | "sit_or_lean"
  | "full_light_interaction";

export type WorldLockMode =
  | "auto"
  | "studio_minimal"
  | "architectural_interior"
  | "architectural_exterior"
  | "furnished_interior"
  | "urban_exterior"
  | "natural_exterior";

export type WorldQuietness = "silent" | "quiet" | "present";

/** Resolved set-level world. Derived in buildMasterShootDNA(), never stored on LookbookInput. */
export interface WorldProfile {
  family: WorldFamily;

  // Set-level locks (constant across all shots)
  tonalTemperature: TonalTemperature;
  lightingCharacter: LightingCharacter;
  lightingDescription: string;
  propDensity: PropDensity;
  interactionLevel: WorldInteractionLevel;
  continuityPriority: "strict" | "balanced" | "flexible";
  quietness: WorldQuietness;

  // Shot-variable base values (anchors for micro-variation)
  backdrop: string;
  groundPlane: string;
  furnitureElements: string[];
  architecturalElements: string[];
  naturalElements: string[];
  allowedMicroVariations: string[];

  // Provenance
  source: "manual_lock" | "gemini_tokens" | "normalized_gemini" | "preset_fallback";
  sourceNotes?: string[];
}

/** Raw Gemini extraction (environment-only, no styling). */
export interface ExtractedWorldTokens {
  backdrop?: string;
  groundPlane?: string;
  lighting?: string;
  tonalTemperature?: string;
  architecturalElements?: string[];
  furnitureElements?: string[];
  naturalElements?: string[];
  environmentMood?: string;
  suggestedFamily?: WorldFamily;
}

/** Per-shot world slice for prompt compilation. */
export interface ShotWorldSlice {
  backdropClause: string;
  groundClause: string;
  lightingClause: string;
  interactionClause?: string;
  variationClause?: string;
}

// ── F8: Bag Shot Classification & Proof Zones ──

/** Classifies a bag shot by its primary purpose. */
export type BagShotClass =
  | "proof_hero"
  | "proof_profile"
  | "proof_macro_construction"
  | "proof_macro_attachment_or_brand_zone"
  | "proof_open_top_or_capacity"
  | "editorial_desire";

/** Specific zones on a bag that can be proven in a shot. */
export type BagProofZone =
  | "silhouette"
  | "handle_attachment"
  | "closure"
  | "panel_seam"
  | "logo_zone"
  | "opening_geometry"
  | "interior"
  | "hardware_finish"
  | "leather_surface"
  | "edge_finishing";

/** Physical behavior constraint for a shot. */
export interface PhysicalBehaviorConstraint {
  zone: string;
  behavior: string;
  antiPattern: string;
}

/** Critic violation found during prompt review. */
export type CriticSeverity = "error" | "warning";

export interface CriticViolation {
  severity: CriticSeverity;
  code: string;
  message: string;
  /** If the critic can auto-fix, the replacement fragment. */
  fix?: string;
}

/** F8: Extended provider prompt output with critic metadata. */
export interface ProviderPromptOutputV2 extends ProviderPromptOutput {
  shotClass?: BagShotClass;
  criticViolations: CriticViolation[];
  /** Whether the normalizer was applied. */
  normalized: boolean;
}
