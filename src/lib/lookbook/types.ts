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
  /** Archetype IDs that are strongly preferred for this family */
  preferredArchetypeIds: string[];
  /** Archetype IDs that should never appear for this family */
  restrictedArchetypeIds: string[];
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
  /** Additional archetype IDs to prefer (merged with family) */
  addPreferredArchetypeIds?: string[];
  /** Additional archetype IDs to ban (merged with family) */
  addRestrictedArchetypeIds?: string[];
  /** Archetype IDs that must appear in the set */
  requiredArchetypeIds?: string[];
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
  preferredArchetypeIds: string[];
  restrictedArchetypeIds: string[];
  requiredArchetypeIds: string[];
  occlusionPenalties: string[];
  generationCategoryOrder: ShotCategory[];
  whatItSellsByCategory: Partial<Record<ShotCategory, string>>;
  additionalNegativeCues: string[];
  deltaBriefSuffix: string;
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
}

export interface CoverageSummary {
  clarity: number;
  branding: number;
  silhouette: number;
  editorial: number;
  detail: number;
  motion: number;
}

export interface LookbookPlanResult {
  input: LookbookInput;
  dna: MasterShootDNA;
  shots: RecommendedShot[];
  coverage: CoverageSummary;
  generationOrder: number[];
  exportText: string;
}
