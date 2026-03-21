import type {
  ShotBlueprint,
  LookbookInput,
} from "./types";

// ── Blueprint Definitions ──

const BLUEPRINTS: ShotBlueprint[] = [
  // ── Earrings ──
  {
    id: "earrings_commercial_balanced",
    label: "Earrings — Commercial Balanced",
    description:
      "Portrait-led set for earrings sold in a commercial context. Prioritises ear visibility, pair validation, and detail close-ups over full-body fashion shots.",
    requiredRoles: [
      "portrait_hero_clean",
      "three_quarter_ear_reveal",
      "ear_detail_crop",
    ],
    optionalRoles: [
      "pair_symmetry_validation",
      "profile_jewelry_focus",
      "mood_portrait_jewelry",
      "jewelry_neckline_focus",
    ],
    bannedArchetypeIds: [
      "hero_full_body_seller",
      "clean_silhouette_fullbody",
      "relaxed_contrapposto",
      "detail_crop_logo_focus",
      "accessory_hand_interaction",
      "back_view_shape",
      "open_jacket_ease",
      "tailoring_lapel_touch",
      "cuff_adjustment_tailoring",
      "controlled_half_stride",
      "pivot_step",
      "seated_edge_pose",
      "seated_forward_lean",
      "bag_carry_profile",
      "footwear_ground_focus",
      "side_silhouette",
    ],
    preferredFramingFamily: "close_up",
    preferredMovementLevel: "static",
    preferredCropFamily: "face_detail",
    maxMotionShots: 0,
    brandingEmphasis: "product_first",
    occlusionPenalties: [
      "hands covering ear area",
      "hair blocking earrings",
      "strong rotation hiding the product",
      "crop cutting the jewelry awkwardly",
      "chin occluding earring",
    ],
    sellsLanguage: [
      "ear visibility and placement",
      "scale near face and jawline",
      "sparkle, metal finish, and stone readability",
      "skin and neckline relationship",
      "pair readability and symmetry",
      "elegance near jawline and neck",
    ],
  },

  {
    id: "earrings_editorial_directional",
    label: "Earrings — Editorial Directional",
    description:
      "Editorial-leaning earring set allowing mood and atmosphere while keeping the product readable. More creative angles and lighting.",
    requiredRoles: [
      "portrait_hero_clean",
      "profile_jewelry_focus",
      "mood_portrait_jewelry",
    ],
    optionalRoles: [
      "three_quarter_ear_reveal",
      "ear_detail_crop",
      "jewelry_neckline_focus",
    ],
    bannedArchetypeIds: [
      "hero_full_body_seller",
      "clean_silhouette_fullbody",
      "relaxed_contrapposto",
      "detail_crop_logo_focus",
      "accessory_hand_interaction",
      "back_view_shape",
      "open_jacket_ease",
      "tailoring_lapel_touch",
      "cuff_adjustment_tailoring",
      "controlled_half_stride",
      "pivot_step",
      "bag_carry_profile",
      "footwear_ground_focus",
      "side_silhouette",
    ],
    preferredFramingFamily: "half_body",
    preferredMovementLevel: "subtle",
    preferredCropFamily: "face_detail",
    maxMotionShots: 0,
    brandingEmphasis: "secondary",
    occlusionPenalties: [
      "hands covering ear area",
      "hair blocking earrings",
      "strong rotation hiding the product",
      "crop cutting the jewelry awkwardly",
    ],
    sellsLanguage: [
      "elegance near jawline and neck",
      "sparkle and light play on the piece",
      "mood and aspiration",
      "skin and neckline relationship",
    ],
  },

  // ── Necklace ──
  {
    id: "necklace_commercial",
    label: "Necklace — Commercial",
    description:
      "Portrait and neckline-focused set for necklaces. Prioritises chain/pendant visibility against the collarbone and chest.",
    requiredRoles: [
      "portrait_hero_clean",
      "jewelry_neckline_focus",
    ],
    optionalRoles: [
      "three_quarter_ear_reveal",
      "mood_portrait_jewelry",
      "profile_jewelry_focus",
      "ear_detail_crop",
    ],
    bannedArchetypeIds: [
      "hero_full_body_seller",
      "clean_silhouette_fullbody",
      "relaxed_contrapposto",
      "back_view_shape",
      "accessory_hand_interaction",
      "open_jacket_ease",
      "tailoring_lapel_touch",
      "cuff_adjustment_tailoring",
      "bag_carry_profile",
      "footwear_ground_focus",
    ],
    preferredFramingFamily: "half_body",
    preferredMovementLevel: "static",
    preferredCropFamily: "chest_up",
    maxMotionShots: 0,
    brandingEmphasis: "product_first",
    occlusionPenalties: [
      "hands covering neckline",
      "hair covering pendant",
      "clothing collar hiding chain",
    ],
    sellsLanguage: [
      "chain drape and pendant position",
      "scale against collarbone and chest",
      "metal finish and clasp detail",
      "layering potential",
    ],
  },

  // ── Bracelet ──
  {
    id: "bracelet_detail_focus",
    label: "Bracelet — Detail Focus",
    description:
      "Hand and wrist-focused set for bracelets. Allows the hand interaction archetype and prioritises wrist-level crops.",
    requiredRoles: [
      "accessory_hand_interaction",
      "jewelry_neckline_focus",
    ],
    optionalRoles: [
      "portrait_hero_clean",
      "mood_portrait_jewelry",
      "ear_detail_crop",
    ],
    bannedArchetypeIds: [
      "hero_full_body_seller",
      "clean_silhouette_fullbody",
      "relaxed_contrapposto",
      "back_view_shape",
      "bag_carry_profile",
      "footwear_ground_focus",
      "open_jacket_ease",
      "tailoring_lapel_touch",
      "cuff_adjustment_tailoring",
    ],
    preferredFramingFamily: "close_up",
    preferredMovementLevel: "static",
    preferredCropFamily: "product_zone",
    maxMotionShots: 0,
    brandingEmphasis: "product_first",
    occlusionPenalties: [
      "sleeve covering bracelet",
      "hand position hiding clasp",
    ],
    sellsLanguage: [
      "wrist scale and fit",
      "clasp and closure detail",
      "metal or bead finish",
      "stacking potential",
    ],
  },

  // ── Eyewear ──
  {
    id: "eyewear_minimal_branding",
    label: "Eyewear — Minimal Branding",
    description:
      "Portrait-led set for eyewear with minimal branding emphasis. Focuses on frame shape, face fit, and style over logo.",
    requiredRoles: [
      "eyewear_portrait_halfbody",
      "portrait_hero_clean",
    ],
    optionalRoles: [
      "three_quarter_ear_reveal",
      "profile_jewelry_focus",
      "mood_portrait_jewelry",
    ],
    bannedArchetypeIds: [
      "hero_full_body_seller",
      "clean_silhouette_fullbody",
      "relaxed_contrapposto",
      "detail_crop_logo_focus",
      "back_view_shape",
      "accessory_hand_interaction",
      "bag_carry_profile",
      "footwear_ground_focus",
      "open_jacket_ease",
      "tailoring_lapel_touch",
      "cuff_adjustment_tailoring",
    ],
    preferredFramingFamily: "half_body",
    preferredMovementLevel: "static",
    preferredCropFamily: "face_detail",
    maxMotionShots: 0,
    brandingEmphasis: "secondary",
    occlusionPenalties: [
      "hands touching frames",
      "hair covering temple arms",
      "lens glare hiding eyes",
    ],
    sellsLanguage: [
      "frame shape on face",
      "temple arm fit",
      "lens tint and finish",
      "bridge fit and nose pad placement",
    ],
  },

  // ── Apparel: Blazer ──
  {
    id: "blazer_luxury_balanced",
    label: "Blazer — Luxury Balanced",
    description:
      "Full-body and tailoring-focused set for blazers. Includes hero, silhouette, lapel detail, and editorial angles.",
    requiredRoles: [
      "hero_full_body_seller",
      "tailoring_lapel_touch",
    ],
    optionalRoles: [
      "clean_silhouette_fullbody",
      "open_jacket_ease",
      "relaxed_contrapposto",
      "torso_turn_editorial",
      "cuff_adjustment_tailoring",
      "mood_environmental_hero",
    ],
    bannedArchetypeIds: [
      "bag_carry_profile",
      "footwear_ground_focus",
      "eyewear_portrait_halfbody",
      "jewelry_neckline_focus",
      "ear_detail_crop",
      "three_quarter_ear_reveal",
      "profile_jewelry_focus",
      "pair_symmetry_validation",
    ],
    preferredFramingFamily: "full_body",
    preferredMovementLevel: "subtle",
    preferredCropFamily: "full",
    maxMotionShots: 1,
    brandingEmphasis: "balanced",
    occlusionPenalties: [
      "jacket closed hiding construction",
    ],
    sellsLanguage: [
      "lapel construction and shoulder line",
      "fabric drape and button stance",
      "full garment silhouette",
      "layering and interior detail",
    ],
  },

  // ── Full Look ──
  {
    id: "full_look_editorial_balanced",
    label: "Full Look — Editorial Balanced",
    description:
      "Multi-piece styling set. Full-body shots dominate to show the complete outfit, with editorial mood and detail variations.",
    requiredRoles: [
      "hero_full_body_seller",
      "relaxed_contrapposto",
    ],
    optionalRoles: [
      "clean_silhouette_fullbody",
      "torso_turn_editorial",
      "controlled_half_stride",
      "relaxed_lean",
      "mood_environmental_hero",
      "detail_crop_logo_focus",
    ],
    bannedArchetypeIds: [
      "bag_carry_profile",
      "footwear_ground_focus",
      "eyewear_portrait_halfbody",
      "jewelry_neckline_focus",
      "ear_detail_crop",
      "three_quarter_ear_reveal",
      "profile_jewelry_focus",
      "pair_symmetry_validation",
      "accessory_hand_interaction",
    ],
    preferredFramingFamily: "full_body",
    preferredMovementLevel: "moderate",
    preferredCropFamily: "full",
    maxMotionShots: 2,
    brandingEmphasis: "balanced",
    occlusionPenalties: [],
    sellsLanguage: [
      "complete outfit coordination",
      "proportions and styling story",
      "garment interaction and layering",
      "movement and fabric behaviour together",
    ],
  },
];

// ── Blueprint Selection Logic ──

export function selectBlueprint(input: LookbookInput): ShotBlueprint | null {
  const { productFamily, specificItem, targetStyle, campaignGoal, creativityLevel } = input;
  const item = (specificItem || "").toLowerCase();

  // Earrings
  if (productFamily === "jewelry" && (item === "earrings" || item === "earring" || item === "ear cuff" || item === "hoop" || item === "stud" || item === "drop earring")) {
    if (creativityLevel === "directional" || targetStyle === "editorial" || targetStyle === "avant_garde") {
      return findBlueprint("earrings_editorial_directional");
    }
    return findBlueprint("earrings_commercial_balanced");
  }

  // Necklace
  if (productFamily === "jewelry" && (item === "necklace" || item === "pendant" || item === "choker" || item === "chain")) {
    return findBlueprint("necklace_commercial");
  }

  // Bracelet
  if (productFamily === "jewelry" && (item === "bracelet" || item === "bangle" || item === "cuff bracelet")) {
    return findBlueprint("bracelet_detail_focus");
  }

  // Ring (no specific blueprint; falls through to generic jewelry handling)
  if (productFamily === "jewelry" && item === "ring") {
    return findBlueprint("bracelet_detail_focus"); // rings use similar hand-focused approach
  }

  // Generic jewelry without specific item
  if (productFamily === "jewelry") {
    return findBlueprint("earrings_commercial_balanced"); // default jewelry blueprint
  }

  // Eyewear
  if (productFamily === "eyewear") {
    return findBlueprint("eyewear_minimal_branding");
  }

  // Blazer / suit jacket
  if (productFamily === "apparel" && (item === "blazer" || item === "suit jacket" || item === "sport coat" || item === "tuxedo")) {
    if (targetStyle === "luxury" || targetStyle === "tailoring") {
      return findBlueprint("blazer_luxury_balanced");
    }
  }

  // Full look
  if (productFamily === "full_look") {
    return findBlueprint("full_look_editorial_balanced");
  }

  // No specific blueprint; engine will use generic scoring
  return null;
}

function findBlueprint(id: string): ShotBlueprint | null {
  return BLUEPRINTS.find((b) => b.id === id) || null;
}

export { BLUEPRINTS };
