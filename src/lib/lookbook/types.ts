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
