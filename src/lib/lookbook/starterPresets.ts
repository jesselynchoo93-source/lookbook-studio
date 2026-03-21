import type { StarterPreset } from "./types";

export const STARTER_PRESETS: StarterPreset[] = [
  {
    id: "product_seller",
    label: "Product Seller",
    description: "Maximum product clarity. Clean, front-facing hero shots with high branding visibility.",
    defaults: {
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "high",
      creativityLevel: "safe",
      targetStyle: "commercial",
      shotCount: 6,
    },
  },
  {
    id: "balanced_lookbook",
    label: "Balanced Lookbook",
    description: "Mix of clarity, silhouette, and editorial interest. Works for most brands.",
    defaults: {
      campaignGoal: "product_clarity",
      logoVisibilityPriority: "medium",
      creativityLevel: "balanced",
      targetStyle: "luxury",
      shotCount: 6,
    },
  },
  {
    id: "editorial_campaign",
    label: "Editorial Campaign",
    description: "Directional, mood-driven shots for brand storytelling and social content.",
    defaults: {
      campaignGoal: "mood",
      logoVisibilityPriority: "low",
      creativityLevel: "directional",
      targetStyle: "editorial",
      shotCount: 6,
    },
  },
  {
    id: "accessory_focus",
    label: "Accessory Focus",
    description: "Detail crops and interaction shots optimised for jewelry, eyewear, and small accessories.",
    defaults: {
      campaignGoal: "detail_focus",
      logoVisibilityPriority: "medium",
      creativityLevel: "balanced",
      targetStyle: "luxury",
      shotCount: 6,
    },
  },
  {
    id: "tailoring_set",
    label: "Tailoring Set",
    description: "Lapel touches, cuff adjustments, and silhouette emphasis for structured garments.",
    defaults: {
      campaignGoal: "premium_branding",
      logoVisibilityPriority: "medium",
      creativityLevel: "balanced",
      targetStyle: "tailoring",
      shotCount: 6,
    },
  },
  {
    id: "brand_heavy_merch",
    label: "Brand-Heavy Merch",
    description: "Front-facing, logo-safe shots for branded merchandise and streetwear.",
    defaults: {
      campaignGoal: "premium_branding",
      logoVisibilityPriority: "high",
      creativityLevel: "safe",
      targetStyle: "street",
      shotCount: 6,
    },
  },
];
