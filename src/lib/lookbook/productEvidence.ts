import type {
  ProductFamily,
  ShotCategory,
  EvidenceType,
  EvidencePriority,
  EvidenceRequirement,
  FamilyEvidenceSpec,
  ItemEvidenceOverride,
  ResolvedEvidencePlan,
  DisplayZone,
  LookbookInput,
} from "./types";

// ── Default weights per priority ──

const DEFAULT_WEIGHTS: Record<EvidencePriority, number> = {
  required: 10,
  recommended: 6,
  optional: 3,
  discouraged: -5,
};

function req(evidence: EvidenceType, priority: EvidencePriority, weight?: number): EvidenceRequirement {
  return { evidence, priority, weight };
}

// ── Family Evidence Specifications ──

export const FAMILY_EVIDENCE: Record<ProductFamily, FamilyEvidenceSpec> = {
  apparel: {
    family: "apparel",
    evidenceRequirements: [
      req("full_silhouette", "required"),
      req("fit_on_body", "required"),
      req("fabric_drape", "required"),
      req("logo_placement", "recommended"),
      req("texture_detail", "recommended"),
      req("body_scale", "recommended"),
      req("construction_quality", "optional"),
      req("movement_behavior", "optional"),
      req("styling_context", "optional"),
    ],
    categoryRoleMix: { hero: 1, silhouette: 1, detail: 1, editorial: 1 },
    productZones: ["full_body", "torso_front", "torso_back", "shoulder", "waist"],
  },

  footwear: {
    family: "footwear",
    evidenceRequirements: [
      req("on_foot_presence", "required"),
      req("sole_profile", "required"),
      req("texture_detail", "required"),
      req("full_silhouette", "recommended"),
      req("movement_behavior", "recommended"),
      req("profile_depth", "recommended"),
      req("construction_quality", "optional"),
      req("body_scale", "optional"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 1 },
    productZones: ["foot", "knee_down", "ankle"],
  },

  bags: {
    family: "bags",
    evidenceRequirements: [
      req("full_silhouette", "required"),
      req("carry_method", "required"),
      req("hardware_detail", "required"),
      req("body_scale", "required"),
      req("texture_detail", "recommended"),
      req("construction_quality", "recommended"),
      req("dimensional_depth", "recommended"),
      req("attachment_point", "recommended"),
      req("closure_mechanism", "optional"),
      req("interior_capacity", "optional"),
      req("surface_reflection", "optional"),
      req("movement_behavior", "optional"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 2 },
    productZones: ["shoulder", "shoulder_line", "hip", "hand", "side_body"],
  },

  jewelry: {
    family: "jewelry",
    evidenceRequirements: [
      req("face_scale", "required"),
      req("texture_detail", "required"),
      req("surface_reflection", "required"),
      req("styling_context", "recommended"),
      req("attachment_point", "recommended"),
      req("symmetry_validation", "recommended"),
      req("scale_reference", "optional"),
      req("profile_depth", "optional"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 2, detail: 2 },
    productZones: ["ear", "neckline", "collarbone", "wrist", "hand"],
  },

  eyewear: {
    family: "eyewear",
    evidenceRequirements: [
      req("face_framing", "required"),
      req("side_profile", "required"),
      req("face_scale", "required"),
      req("texture_detail", "recommended"),
      req("surface_reflection", "recommended"),
      req("logo_placement", "optional"),
      req("profile_depth", "optional"),
      req("styling_context", "optional"),
      req("full_silhouette", "optional"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 1 },
    productZones: ["face", "ear"],
  },

  watches: {
    family: "watches",
    evidenceRequirements: [
      req("wrist_visibility", "required"),
      req("texture_detail", "required"),
      req("surface_reflection", "required"),
      req("hardware_detail", "recommended"),
      req("dimensional_depth", "recommended"),
      req("closure_mechanism", "recommended"),
      req("face_scale", "optional"),
      req("profile_depth", "optional"),
      req("styling_context", "optional"),
      req("full_silhouette", "optional"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 2 },
    productZones: ["wrist", "hand"],
  },

  headwear: {
    family: "headwear",
    evidenceRequirements: [
      req("face_framing", "required"),
      req("face_scale", "required"),
      req("full_silhouette", "recommended"),
      req("side_profile", "recommended"),
      req("texture_detail", "recommended"),
      req("styling_context", "optional"),
      req("body_scale", "optional"),
      req("attachment_point", "optional"),
      req("profile_depth", "optional"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, silhouette: 1 },
    productZones: ["face", "upper_body"],
  },

  belts: {
    family: "belts",
    evidenceRequirements: [
      req("waist_anchoring", "required"),
      req("hardware_detail", "required"),
      req("closure_mechanism", "required"),
      req("texture_detail", "recommended"),
      req("full_silhouette", "recommended"),
      req("body_scale", "recommended"),
      req("surface_reflection", "optional"),
      req("profile_depth", "optional"),
    ],
    categoryRoleMix: { hero: 1, detail: 2, product_focus: 1 },
    productZones: ["waist", "waist_front", "hip"],
  },

  scarves: {
    family: "scarves",
    evidenceRequirements: [
      req("fabric_drape", "required"),
      req("texture_detail", "required"),
      req("styling_context", "recommended"),
      req("full_silhouette", "recommended"),
      req("body_scale", "recommended"),
      req("movement_behavior", "optional"),
      req("attachment_point", "optional"),
    ],
    categoryRoleMix: { hero: 1, editorial: 1, detail: 1 },
    productZones: ["neckline", "shoulder", "shoulder_line", "upper_body"],
  },

  small_accessories: {
    family: "small_accessories",
    evidenceRequirements: [
      req("scale_reference", "required"),
      req("texture_detail", "required"),
      req("construction_quality", "recommended"),
      req("surface_reflection", "recommended"),
      req("closure_mechanism", "optional"),
      req("profile_depth", "optional"),
      req("styling_context", "optional"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 2 },
    productZones: ["hand", "wrist", "product_only"],
  },

  full_look: {
    family: "full_look",
    evidenceRequirements: [
      req("full_silhouette", "required"),
      req("fit_on_body", "required"),
      req("styling_context", "required"),
      req("fabric_drape", "recommended"),
      req("movement_behavior", "recommended"),
      req("body_scale", "recommended"),
      req("back_shape", "optional"),
      req("dimensional_depth", "optional"),
    ],
    categoryRoleMix: { hero: 1, silhouette: 1, editorial: 1 },
    productZones: ["full_body"],
  },
};

// ── Item Evidence Overrides ──

export const ITEM_EVIDENCE_OVERRIDES: ItemEvidenceOverride[] = [
  {
    items: ["earring", "earrings", "stud earring", "drop earring", "hoop earring"],
    family: "jewelry",
    label: "Earrings",
    evidenceOverrides: [
      req("ear_visibility", "required"),
      req("pair_symmetry", "required"),
      req("neckline_visibility", "recommended"),
    ],
    productZones: ["ear", "face"],
  },
  {
    items: ["necklace", "pendant", "chain", "choker"],
    family: "jewelry",
    label: "Necklace",
    evidenceOverrides: [
      req("neckline_visibility", "required"),
    ],
    productZones: ["neckline", "collarbone"],
  },
  {
    items: ["bracelet", "bangle", "cuff bracelet"],
    family: "jewelry",
    label: "Bracelet",
    evidenceOverrides: [
      req("wrist_visibility", "required"),
    ],
    productZones: ["wrist", "hand"],
  },
  {
    items: ["ring", "signet ring", "band ring"],
    family: "jewelry",
    label: "Ring",
    evidenceOverrides: [
      req("finger_visibility", "required"),
    ],
    productZones: ["hand"],
  },
  {
    items: ["shoulder bag", "crossbody bag", "sling bag"],
    family: "bags",
    label: "Shoulder Bag",
    evidenceOverrides: [
      req("side_profile", "required"),
      req("interior_capacity", "recommended"),
    ],
    productZones: ["shoulder", "shoulder_line", "hip", "hand", "side_body"],
  },
  {
    items: ["tote", "tote bag", "shopper bag"],
    family: "bags",
    label: "Tote",
    evidenceOverrides: [
      req("interior_capacity", "required"),
    ],
    productZones: ["hand", "hip", "shoulder"],
  },
  {
    items: ["blazer", "suit jacket", "sports coat", "tailored jacket"],
    family: "apparel",
    label: "Blazer / Suit Jacket",
    evidenceOverrides: [
      req("construction_quality", "required"),
      req("side_profile", "recommended"),
    ],
    productZones: ["full_body", "torso_front", "torso_back", "shoulder", "shoulder_line", "waist"],
  },
  {
    items: ["dress", "gown", "maxi dress", "midi dress"],
    family: "apparel",
    label: "Dress",
    evidenceOverrides: [
      req("movement_behavior", "recommended"),
    ],
  },
  {
    items: ["sneaker", "sneakers", "trainers", "running shoe"],
    family: "footwear",
    label: "Sneakers",
    evidenceOverrides: [
      req("movement_behavior", "recommended"),
      req("construction_quality", "recommended"),
    ],
  },
  {
    items: ["sport watch", "dive watch", "digital watch"],
    family: "watches",
    label: "Sport Watch",
    evidenceOverrides: [
      req("movement_behavior", "optional"),
    ],
  },
  {
    items: ["dress watch", "formal watch", "classic watch"],
    family: "watches",
    label: "Dress Watch",
    evidenceOverrides: [
      req("construction_quality", "recommended"),
    ],
  },
  {
    items: ["leather belt", "dress belt"],
    family: "belts",
    label: "Leather Belt",
    evidenceOverrides: [
      req("construction_quality", "recommended"),
    ],
  },
  {
    items: ["silk scarf", "neck scarf"],
    family: "scarves",
    label: "Silk Scarf",
    evidenceOverrides: [
      req("movement_behavior", "recommended"),
    ],
  },
  {
    items: ["sunglasses", "aviator sunglasses", "cat-eye sunglasses"],
    family: "eyewear",
    label: "Sunglasses",
    // No override needed beyond family
  },
  {
    items: ["optical glasses", "reading glasses", "eyeglasses"],
    family: "eyewear",
    label: "Optical Glasses",
    // No override needed beyond family
  },

  // ── Headwear Items ──
  {
    items: ["cap", "baseball cap", "trucker cap"],
    family: "headwear",
    label: "Cap",
    evidenceOverrides: [
      req("logo_placement", "recommended"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 1 },
  },
  {
    items: ["beanie", "knit beanie", "wool beanie"],
    family: "headwear",
    label: "Beanie",
    evidenceOverrides: [
      req("texture_detail", "required"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 1 },
  },
  {
    items: ["beret", "flat cap"],
    family: "headwear",
    label: "Beret",
    evidenceOverrides: [
      req("texture_detail", "required"),
      req("styling_context", "recommended"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, editorial: 1 },
  },
  {
    items: ["bucket hat", "sun hat", "wide brim hat", "fedora"],
    family: "headwear",
    label: "Brimmed Hat",
    evidenceOverrides: [
      req("side_profile", "required"),
      req("profile_depth", "recommended"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 1 },
  },

  // ── Small Accessories Items ──
  {
    items: ["wallet", "bifold wallet", "long wallet", "zip wallet"],
    family: "small_accessories",
    label: "Wallet",
    evidenceOverrides: [
      req("closure_mechanism", "recommended"),
      req("interior_capacity", "optional"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 2 },
  },
  {
    items: ["cardholder", "card holder", "card case", "card wallet"],
    family: "small_accessories",
    label: "Cardholder",
    evidenceOverrides: [
      req("profile_depth", "recommended"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 2 },
  },
  {
    items: ["keychain", "key holder", "key ring", "key fob"],
    family: "small_accessories",
    label: "Keychain",
    evidenceOverrides: [
      req("attachment_point", "recommended"),
      req("hardware_detail", "recommended"),
    ],
    categoryRoleMix: { hero: 1, detail: 1 },
  },
  {
    items: ["coin purse", "pouch", "small pouch"],
    family: "small_accessories",
    label: "Coin Purse / Pouch",
    evidenceOverrides: [
      req("closure_mechanism", "recommended"),
    ],
    categoryRoleMix: { hero: 1, product_focus: 1, detail: 1 },
  },
  {
    items: ["wool scarf", "cashmere scarf", "knit scarf", "winter scarf"],
    family: "scarves",
    label: "Wool/Cashmere Scarf",
    evidenceOverrides: [
      req("texture_detail", "required"),
      req("movement_behavior", "recommended"),
    ],
  },
];

// ── Evidence Sell Phrases ──

export const EVIDENCE_SELL_PHRASES: Record<EvidenceType, string> = {
  full_silhouette: "shape, proportion, and presence",
  side_profile: "profile line and dimensional form",
  back_shape: "rear construction and finishing",
  fit_on_body: "fit, drape, and how it sits when worn",
  carry_method: "carry style, strap drop, and body interaction",
  wrist_visibility: "wrist presence and natural fit",
  ear_visibility: "placement, sparkle, and scale against the ear",
  neckline_visibility: "chain drape and neckline placement",
  finger_visibility: "ring scale and hand context",
  face_framing: "face framing and how it complements the wearer",
  on_foot_presence: "on-foot silhouette and ground contact",
  waist_anchoring: "waist anchoring and buckle position",
  fabric_drape: "fabric weight, drape, and movement",
  texture_detail: "material grain, weave, and surface finish",
  hardware_detail: "metal finish, buckle quality, and hardware precision",
  sole_profile: "sole architecture and ground presence",
  interior_capacity: "interior volume and pocket structure",
  construction_quality: "stitching precision, edge finishing, and joint integrity",
  closure_mechanism: "closure action and mechanism detail",
  surface_reflection: "light play across the surface",
  logo_placement: "brand mark placement and legibility",
  label_detail: "label and tag finishing",
  movement_behavior: "product behaviour in motion",
  styling_context: "lifestyle context and styled intention",
  scale_reference: "product scale against the body",
  face_scale: "proportion relative to the face",
  body_scale: "proportion relative to the body",
  profile_depth: "depth and thickness from the side",
  dimensional_depth: "volume, structure, and three-dimensional form",
  attachment_point: "connection point and body interaction",
  pair_symmetry: "matched-pair balance and visual harmony",
  symmetry_validation: "rendering accuracy across both sides",
};

// ── Family-Aware Fallback Sells Language ──

const FAMILY_ITEM_NOUN: Record<ProductFamily, string> = {
  apparel: "the garment",
  footwear: "the shoes",
  bags: "the bag",
  jewelry: "the piece",
  eyewear: "the frames",
  watches: "the watch",
  headwear: "the headpiece",
  belts: "the belt",
  scarves: "the scarf",
  small_accessories: "the accessory",
  full_look: "the ensemble",
};

const FAMILY_DETAIL_NOUN: Record<ProductFamily, string> = {
  apparel: "fabric and construction",
  footwear: "sole and material quality",
  bags: "hardware and construction",
  jewelry: "sparkle and setting detail",
  eyewear: "lens and temple detail",
  watches: "dial and case detail",
  headwear: "material and structure",
  belts: "buckle and leather quality",
  scarves: "weave and texture quality",
  small_accessories: "craftsmanship and finish",
  full_look: "fabric and styling detail",
};

export const FAMILY_FALLBACK_SELLS: Record<ProductFamily, Record<ShotCategory, string>> = {
  apparel: {
    hero: "Complete visibility of the garment. The buyer sees shape, fit, and proportions at a glance.",
    silhouette: "The garment's shape and profile. Shows how it looks from a different angle.",
    detail: "Construction and fabric detail. Texture, stitching, and finish quality.",
    motion: "How the garment moves. Buyers see fabric behaviour that static shots cannot show.",
    editorial: "Lifestyle context and brand aspiration. Elevates the garment from an item to a story.",
    product_focus: "Focused view of the garment in its intended wear context.",
  },
  footwear: {
    hero: "Complete visibility of the shoes on foot. Shape, silhouette, and ground presence at a glance.",
    silhouette: "The shoe's shape and profile from a different perspective.",
    detail: "Sole construction, material quality, and stitching detail.",
    motion: "How the shoes perform in motion. Buyers see stride and ground contact.",
    editorial: "Lifestyle context showing the shoes in a styled setting.",
    product_focus: "Focused view of the shoes, emphasising sole and on-foot presence.",
  },
  bags: {
    hero: "Complete visibility of the bag against the body. Shape, scale, and carry method at a glance.",
    silhouette: "The bag's shape and structure from a different angle.",
    detail: "Hardware quality, construction, and material craftsmanship up close.",
    motion: "How the bag behaves in motion. Strap swing and body interaction.",
    editorial: "Lifestyle context showing the bag as part of a styled outfit.",
    product_focus: "Focused view of the bag's carry method, strap drop, and body proportion.",
  },
  jewelry: {
    hero: "The piece in context against the skin. Scale, sparkle, and placement at a glance.",
    silhouette: "The piece's outline and how it sits on the body.",
    detail: "Setting detail, stone quality, and metalwork craftsmanship up close.",
    motion: "How the piece catches light and moves with the body.",
    editorial: "Lifestyle context showing the piece as part of a styled look.",
    product_focus: "Focused view of the piece, emphasising scale and surface quality.",
  },
  eyewear: {
    hero: "The frames on the face. Shape, scale, and face framing at a glance.",
    silhouette: "The frames' profile from the side, showing temple length and depth.",
    detail: "Lens quality, hinge construction, and material finish up close.",
    motion: "How the frames sit during natural movement.",
    editorial: "Lifestyle context showing the frames as part of a styled look.",
    product_focus: "Focused view of the frames, emphasising face framing and proportion.",
  },
  watches: {
    hero: "The watch on the wrist. Dial visibility, case proportions, and wrist presence at a glance.",
    silhouette: "The watch's profile showing case thickness and strap drop.",
    detail: "Dial detail, bezel construction, and surface finish up close.",
    motion: "How the watch sits during natural wrist movement.",
    editorial: "Lifestyle context showing the watch as part of a styled look.",
    product_focus: "Focused view of the watch, emphasising dial and wrist proportion.",
  },
  headwear: {
    hero: "The headpiece on the head. Shape, scale, and face framing at a glance.",
    silhouette: "The headpiece's profile from the side.",
    detail: "Material quality, construction, and texture up close.",
    motion: "How the headpiece behaves during movement.",
    editorial: "Lifestyle context showing the headpiece in a styled setting.",
    product_focus: "Focused view of the headpiece, emphasising face framing and proportion.",
  },
  belts: {
    hero: "The belt at the waist. Buckle, leather, and fit at a glance.",
    silhouette: "The belt's profile around the waist from a different angle.",
    detail: "Buckle construction, leather quality, and edge finishing up close.",
    motion: "How the belt sits during natural movement.",
    editorial: "Lifestyle context showing the belt as part of a styled outfit.",
    product_focus: "Focused view of the belt buckle and waist anchoring.",
  },
  scarves: {
    hero: "The scarf draped and styled. Fabric quality, drape, and styling at a glance.",
    silhouette: "The scarf's drape and how it falls from a different angle.",
    detail: "Weave quality, texture, and edge finishing up close.",
    motion: "How the scarf moves and drapes during natural movement.",
    editorial: "Lifestyle context showing the scarf as part of a styled look.",
    product_focus: "Focused view of the scarf, emphasising drape and texture.",
  },
  small_accessories: {
    hero: "The accessory in context. Scale, craftsmanship, and presence at a glance.",
    silhouette: "The accessory's outline and form.",
    detail: "Construction quality, material finish, and surface detail up close.",
    motion: "How the accessory behaves during use or movement.",
    editorial: "Lifestyle context showing the accessory as part of a styled look.",
    product_focus: "Focused view of the accessory, emphasising craftsmanship and scale.",
  },
  full_look: {
    hero: "The full ensemble from head to toe. Styling coherence and proportions at a glance.",
    silhouette: "The ensemble's overall line and shape from a different angle.",
    detail: "Fabric and construction detail across key pieces of the outfit.",
    motion: "How the full outfit moves together. Fabric interaction and styling flow.",
    editorial: "Full lifestyle context and brand storytelling for the complete look.",
    product_focus: "Focused view highlighting specific styling choices within the ensemble.",
  },
};

// ── Resolution ──

function fuzzyItemMatch(specificItem: string, candidates: string[]): boolean {
  const lower = specificItem.toLowerCase();
  return candidates.some((c) => lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower));
}

function findItemOverride(input: LookbookInput): ItemEvidenceOverride | null {
  if (!input.specificItem) return null;
  return (
    ITEM_EVIDENCE_OVERRIDES.find(
      (o) => o.family === input.productFamily && fuzzyItemMatch(input.specificItem!, o.items)
    ) ?? null
  );
}

export function resolveEvidencePlan(input: LookbookInput): ResolvedEvidencePlan {
  const familySpec = FAMILY_EVIDENCE[input.productFamily];
  const itemOverride = findItemOverride(input);

  // Start with family evidence
  const evidenceMap = new Map<EvidenceType, EvidenceRequirement>();
  for (const er of familySpec.evidenceRequirements) {
    evidenceMap.set(er.evidence, er);
  }

  // Merge item overrides (item takes precedence)
  if (itemOverride?.evidenceOverrides) {
    for (const er of itemOverride.evidenceOverrides) {
      evidenceMap.set(er.evidence, er);
    }
  }

  // Sort: required first, then recommended, then optional, then discouraged
  const priorityOrder: Record<EvidencePriority, number> = {
    required: 0,
    recommended: 1,
    optional: 2,
    discouraged: 3,
  };
  const orderedEvidence = Array.from(evidenceMap.values()).sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Resolve category role mix (item override > family)
  const categoryRoleMix = itemOverride?.categoryRoleMix ?? familySpec.categoryRoleMix;

  // Resolve product zones (item override > family)
  const productZones = itemOverride?.productZones ?? familySpec.productZones;

  return { orderedEvidence, categoryRoleMix, productZones };
}

// ── Helpers ──

export function getEvidenceWeight(er: EvidenceRequirement): number {
  return er.weight ?? DEFAULT_WEIGHTS[er.priority];
}

export function getItemNoun(family: ProductFamily, specificItem?: string): string {
  if (specificItem) return specificItem.toLowerCase();
  return FAMILY_ITEM_NOUN[family];
}

export function getDetailNoun(family: ProductFamily): string {
  return FAMILY_DETAIL_NOUN[family];
}

/** Compose a "what it sells" sentence from evidence types using category-native tone. */
export function composeEvidenceSells(
  evidenceTypes: EvidenceType[],
  item: string,
  category: ShotCategory
): string {
  const phrases = evidenceTypes
    .slice(0, 3)
    .map((e) => EVIDENCE_SELL_PHRASES[e]);

  const joined = phrases.join("; ");

  // Category-native tone: premium, concise, buyer-facing
  const cap = item[0].toUpperCase() + item.slice(1);
  if (category === "hero") {
    return `${cap} at first glance. Buyer sees: ${joined}.`;
  }
  if (category === "detail") {
    return `Close-up proof: ${joined}.`;
  }
  if (category === "product_focus") {
    return `${cap} in focus. Buyer evaluates: ${joined}.`;
  }
  if (category === "editorial") {
    return `Desirability and context: ${joined}.`;
  }
  if (category === "silhouette") {
    return `Shape and outline: ${joined}.`;
  }
  if (category === "motion") {
    return `In motion: ${joined}.`;
  }

  return `${cap}: ${joined}.`;
}

/** Families eligible for product_only display zone shots. */
export const PRODUCT_ONLY_ELIGIBLE_FAMILIES: ProductFamily[] = [
  "jewelry", "watches", "small_accessories", "eyewear", "bags",
  "footwear", "scarves", "belts",
];

/** Categories allowed for product_only shots. */
export const PRODUCT_ONLY_ELIGIBLE_CATEGORIES: ShotCategory[] = [
  "detail", "product_focus", "hero",
];
