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
}

// ── Starter Presets ──

export interface StarterPreset {
  id: string;
  label: string;
  description: string;
  defaults: Partial<LookbookInput>;
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
}

// ── Output Types ──

export interface ScoredArchetype {
  archetype: ShotArchetype;
  score: number;
  matchReasons: string[];
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
  exportText: string;
  diagnostics: PlanDiagnostics;
}
