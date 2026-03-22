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
    explanation: {
      shotMix: "Hero and product-focus shots dominate. Minimal editorial.",
      brandingPriority: "High. Logos and brand marks stay readable.",
      creativityPosture: "Safe. Clean, proven poses only.",
      balance: "Fully commercial. Every shot is a selling image.",
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
    explanation: {
      shotMix: "Even spread of hero, silhouette, detail, and editorial.",
      brandingPriority: "Medium. Branding appears naturally, not forced.",
      creativityPosture: "Balanced. Mix of commercial and fashion-forward.",
      balance: "Half commercial, half editorial. Versatile set.",
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
    explanation: {
      shotMix: "Editorial and motion shots lead. Fewer product-focus shots.",
      brandingPriority: "Low. Branding is subtle or hidden.",
      creativityPosture: "Directional. Fashion-forward poses, higher risk.",
      balance: "Mostly editorial. Mood and identity over product detail.",
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
    explanation: {
      shotMix: "Heavy on detail and product-focus. Fewer full-body shots.",
      brandingPriority: "Medium. Branding where naturally visible.",
      creativityPosture: "Balanced. Clean crops with some editorial flair.",
      balance: "Product-led. Craftsmanship and texture take priority.",
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
    explanation: {
      shotMix: "Silhouette and detail shots prominent. Construction emphasis.",
      brandingPriority: "Medium. Quality speaks for itself.",
      creativityPosture: "Balanced. Refined poses, no streetwear energy.",
      balance: "Premium commercial. Sophisticated, not flashy.",
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
    explanation: {
      shotMix: "Hero-heavy. Logo and brand mark always visible.",
      brandingPriority: "High. Every shot must show the brand clearly.",
      creativityPosture: "Safe. Straightforward streetwear poses.",
      balance: "Fully commercial. Brand identity is the product.",
    },
  },
];
