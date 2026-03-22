import type {
  UniversalBlueprintRules,
  FamilyShotBlueprint,
  ItemShotOverride,
  ResolvedBlueprint,
  LookbookInput,
  ProductFamily,
  ShotCategory,
} from "./types";
import { resolveEvidencePlan } from "./productEvidence";

// ═══════════════════════════════════════════════
// LAYER 1: UNIVERSAL RULES
// ═══════════════════════════════════════════════

export const UNIVERSAL_RULES: UniversalBlueprintRules = {
  maxShotsPerCategory: 2,
  guaranteeClarityShot: true,
  guaranteeEditorialWhenCreative: true,
  defaultMaxMotionShots: 2,
  noDuplicateArchetypes: true,
  generationOrderStrategy: "reliability_first",
};

// ═══════════════════════════════════════════════
// LAYER 2: FAMILY BLUEPRINTS
// ═══════════════════════════════════════════════

const FAMILY_BLUEPRINTS: Record<ProductFamily, FamilyShotBlueprint> = {
  apparel: {
    family: "apparel",
    label: "Apparel",
    sellsFocus: ["fit and proportions", "fabric drape and texture", "silhouette line", "styling versatility", "branding and logo visibility"],
    preferredFramingFamily: "full_body",
    preferredCropFamily: "full",
    preferredMovementLevel: "moderate",
    maxMotionShots: 2,
    brandingEmphasis: "balanced",
    occlusionPenalties: ["garment hidden by arm crossing", "logo covered by hand placement"],
    generationCategoryOrder: ["hero", "silhouette", "product_focus", "detail", "editorial", "motion"],
    dnaHints: {
      environment: "Clean neutral studio or minimal location: seamless backdrop or simple architectural surface, no competing visual elements.",
      lighting: "Soft directional natural light from camera-right with natural bounce fill. Late-morning quality. Controlled highlights, preserved shadow depth.",
      lens: "Editorial lens family: 85mm primary at f/5.6 baseline. Natural optical falloff. No forced bokeh.",
      framing: "Full-body primary with 3/4 and half-body variations. Detail crops for branding and construction.",
      generationNotes: "Generate the safest anchor shots first (hero, clarity, branding). Then generate medium-risk editorial and silhouette variations. Save the most directional or motion-heavy shots for last.",
    },
  },

  footwear: {
    family: "footwear",
    label: "Footwear",
    sellsFocus: ["shoe shape and profile", "sole design and construction", "material texture", "on-foot presence and stance", "ground contact and movement"],
    preferredFramingFamily: "mixed",
    preferredCropFamily: "full",
    preferredMovementLevel: "moderate",
    maxMotionShots: 2,
    brandingEmphasis: "balanced",
    occlusionPenalties: ["trouser hem covering shoe detail", "shoe floating above ground surface"],
    generationCategoryOrder: ["hero", "product_focus", "silhouette", "motion", "detail", "editorial"],
    dnaHints: {
      environment: "Clean surface with visible ground plane. Urban concrete, studio floor, or minimal architectural surface. Ground texture matters for realism.",
      lighting: "Soft directional light with ground-level fill to define sole edges and material texture. Avoid overhead-only lighting that loses ground detail.",
      lens: "Mixed lens family: 85mm for full-body, 35mm for low-angle ground-focus shots. f/4-f/5.6 baseline.",
      framing: "Mixed framing: full-body for context, low-angle crops for product emphasis. Ground-level detail shots.",
      generationNotes: "Generate full-body hero first to validate shoe rendering. Then low-angle product focus. Motion shots last, as stride mechanics are harder for AI.",
    },
  },

  bags: {
    family: "bags",
    label: "Bags",
    sellsFocus: ["bag shape and structure", "carry method and strap behaviour", "body scale and proportion", "hardware and closure detail", "material texture and construction"],
    preferredFramingFamily: "three_quarter",
    preferredCropFamily: "waist_up",
    preferredMovementLevel: "subtle",
    maxMotionShots: 1,
    brandingEmphasis: "balanced",
    occlusionPenalties: ["bag hidden behind body", "strap occluded by arm", "hardware covered by hand grip"],
    generationCategoryOrder: ["hero", "product_focus", "detail", "silhouette", "editorial", "motion"],
    dnaHints: {
      environment: "Clean neutral studio or minimal urban surface. Background should not compete with the bag's shape and hardware.",
      lighting: "Directional key light to define bag shape and hardware. Controlled highlights on leather or fabric surfaces.",
      lens: "Editorial lens family: 85mm primary at f/4-f/5.6. Enough depth to keep the full bag in focus.",
      framing: "Three-quarter to full-body primary. Profile angle for carry shots. Detail crops for hardware and construction.",
      generationNotes: "Generate hero first to validate bag rendering against body. Then carry-profile for scale and strap drop. Detail crops for hardware and construction. Editorial mood last.",
    },
  },

  jewelry: {
    family: "jewelry",
    label: "Jewelry",
    sellsFocus: ["product visibility against skin", "scale near face or hands", "sparkle and metal finish", "stone and setting detail", "elegance and placement context"],
    preferredFramingFamily: "close_up",
    preferredCropFamily: "face_detail",
    preferredMovementLevel: "static",
    maxMotionShots: 0,
    brandingEmphasis: "product_first",
    occlusionPenalties: ["hands covering product zone", "hair blocking jewelry", "clothing covering the piece", "strong rotation hiding the product"],
    generationCategoryOrder: ["hero", "product_focus", "detail", "editorial", "silhouette", "motion"],
    dnaHints: {
      environment: "Clean neutral studio: seamless backdrop or solid matte surface. No competing patterns or textures. The product and skin are the only visual elements.",
      lighting: "Soft directional key light from camera-right with catchlight on metal and stone surfaces. Gentle fill to prevent harsh shadows on skin. Avoid flat overhead lighting that kills sparkle.",
      lens: "Portrait/detail lens family: 85mm primary, f/2.8-f/4 for shallow depth on product. Tighter crops encouraged.",
      framing: "Half-body and close-up crops as primary. Full-body only if explicitly needed for context.",
      generationNotes: "Generate the clean portrait hero first to validate product rendering on skin. Then angled/profile views for dimensional detail. Detail crops for construction. Mood portraits last.",
    },
  },

  eyewear: {
    family: "eyewear",
    label: "Eyewear",
    sellsFocus: ["frame shape on face", "bridge and nose fit", "temple arm profile", "lens tint and finish", "face-framing effect"],
    preferredFramingFamily: "half_body",
    preferredCropFamily: "face_detail",
    preferredMovementLevel: "static",
    maxMotionShots: 0,
    brandingEmphasis: "product_first",
    occlusionPenalties: ["hands touching frames", "hair covering temple arms", "lens glare hiding eyes"],
    generationCategoryOrder: ["hero", "product_focus", "detail", "editorial", "silhouette", "motion"],
    dnaHints: {
      environment: "Clean studio or minimal backdrop. Nothing competing with the frames on the face.",
      lighting: "Soft beauty light from above with gentle fill. Controlled to prevent lens glare while maintaining catchlight in lenses.",
      lens: "Portrait lens family: 85mm primary, f/2.8-f/4 for face and frame clarity.",
      framing: "Half-body and portrait crops as primary. Profile shots for temple arm visibility.",
      generationNotes: "Generate front-facing portrait hero first to validate frame rendering on face. Then three-quarter for frame depth. Profile for temple arms. Editorial mood last.",
    },
  },

  watches: {
    family: "watches",
    label: "Watches",
    sellsFocus: ["case shape and dial visibility", "wrist scale and fit", "strap material and closure", "crown and pusher detail", "on-wrist lifestyle context"],
    preferredFramingFamily: "close_up",
    preferredCropFamily: "product_zone",
    preferredMovementLevel: "static",
    maxMotionShots: 0,
    brandingEmphasis: "product_first",
    occlusionPenalties: ["sleeve covering watch face", "hand position hiding dial", "wrist angle hiding case profile"],
    generationCategoryOrder: ["product_focus", "hero", "detail", "editorial", "silhouette", "motion"],
    dnaHints: {
      environment: "Clean studio or minimal setting. Dark matte surfaces work well for watch photography.",
      lighting: "Directional key light to catch dial reflections and case edges. Controlled fill to prevent strap shadow from hiding detail.",
      lens: "Portrait/macro lens family: 85mm primary, f/2.8 for wrist-level detail. Tight crops encouraged.",
      framing: "Wrist-level close-ups as primary. Half-body for lifestyle context.",
      generationNotes: "Generate wrist close-up first to validate watch rendering. Then lifestyle half-body. Detail crop for dial. Mood portrait last.",
    },
  },

  headwear: {
    family: "headwear",
    label: "Headwear",
    sellsFocus: ["shape and crown structure", "brim or visor profile", "fit on head", "fabric and construction detail", "styling context"],
    preferredFramingFamily: "half_body",
    preferredCropFamily: "chest_up",
    preferredMovementLevel: "subtle",
    maxMotionShots: 1,
    brandingEmphasis: "balanced",
    occlusionPenalties: ["hair hiding hat structure", "hand covering brim detail"],
    generationCategoryOrder: ["hero", "product_focus", "silhouette", "detail", "editorial", "motion"],
    dnaHints: {
      environment: "Clean studio or urban exterior. Background should not compete with the headwear shape.",
      lighting: "Directional light from camera-right to define crown and brim shape. Avoid top-down lighting that flattens the hat.",
      lens: "Portrait lens family: 85mm primary at f/4. Half-body framing to show hat in head context.",
      framing: "Half-body and portrait crops as primary. Profile for brim shape. Full-body only for styling context.",
      generationNotes: "Generate front-facing portrait first to validate hat rendering. Then profile for brim/crown shape. Logo detail if branded. Editorial last.",
    },
  },

  belts: {
    family: "belts",
    label: "Belts",
    sellsFocus: ["buckle design and hardware", "leather or material quality", "waist definition and styling", "width and proportion", "how it anchors the outfit"],
    preferredFramingFamily: "three_quarter",
    preferredCropFamily: "waist_up",
    preferredMovementLevel: "static",
    maxMotionShots: 0,
    brandingEmphasis: "balanced",
    occlusionPenalties: ["jacket covering belt buckle", "arms blocking waist view", "untucked shirt hiding belt"],
    generationCategoryOrder: ["hero", "detail", "product_focus", "silhouette", "editorial", "motion"],
    dnaHints: {
      environment: "Clean studio or minimal location. Waist area must be well-lit and unobstructed.",
      lighting: "Directional key light at waist level to define buckle hardware and leather texture.",
      lens: "Editorial lens family: 85mm primary at f/4. Waist-level detail crops for buckle.",
      framing: "Three-quarter and full-body for styling context. Waist-level detail crop for buckle and hardware.",
      generationNotes: "Generate full-body hero first to show belt in outfit context. Then waist-level buckle detail. Silhouette for proportion. Editorial last.",
    },
  },

  scarves: {
    family: "scarves",
    label: "Scarves",
    sellsFocus: ["drape and fold pattern", "fabric texture and weight", "print or pattern visibility", "styling method (tied, draped, wrapped)", "colour vibrancy"],
    preferredFramingFamily: "half_body",
    preferredCropFamily: "chest_up",
    preferredMovementLevel: "subtle",
    maxMotionShots: 1,
    brandingEmphasis: "balanced",
    occlusionPenalties: ["scarf bunched and unreadable", "print hidden by tight wrapping"],
    generationCategoryOrder: ["hero", "product_focus", "detail", "silhouette", "editorial", "motion"],
    dnaHints: {
      environment: "Clean studio or minimal location. Background should not compete with scarf pattern or colour.",
      lighting: "Even, soft directional light to show fabric texture and print detail. Avoid harsh shadows that obscure the pattern.",
      lens: "Portrait lens family: 85mm primary at f/4. Half-body framing to show drape and styling.",
      framing: "Half-body and portrait crops as primary. Detail crop for fabric texture and print.",
      generationNotes: "Generate portrait hero first showing the scarf drape and styling. Then detail crop for print/texture. Editorial mood last.",
    },
  },

  small_accessories: {
    family: "small_accessories",
    label: "Small Accessories",
    sellsFocus: ["product detail and craftsmanship", "scale in hand or on body", "material and finish quality", "functional context", "gift appeal"],
    preferredFramingFamily: "close_up",
    preferredCropFamily: "product_zone",
    preferredMovementLevel: "static",
    maxMotionShots: 0,
    brandingEmphasis: "product_first",
    occlusionPenalties: ["fingers covering product detail", "product lost in wide framing"],
    generationCategoryOrder: ["product_focus", "detail", "hero", "editorial", "silhouette", "motion"],
    dnaHints: {
      environment: "Clean studio with neutral surface. Product should be the only visual focus.",
      lighting: "Focused directional light to catch material detail and finish. Macro-style lighting for small objects.",
      lens: "Portrait/macro lens family: 85mm primary, f/2.8 for shallow depth isolating the product.",
      framing: "Close-up and product-zone crops as primary. Half-body only for lifestyle context.",
      generationNotes: "Generate hand-interaction shot first to validate product rendering. Then detail crop for craftsmanship. Lifestyle context last.",
    },
  },

  full_look: {
    family: "full_look",
    label: "Full Look",
    sellsFocus: ["outfit coordination and proportion", "styling story across pieces", "head-to-toe visual coherence", "layering and interaction", "brand world and lifestyle"],
    preferredFramingFamily: "full_body",
    preferredCropFamily: "full",
    preferredMovementLevel: "moderate",
    maxMotionShots: 2,
    brandingEmphasis: "balanced",
    occlusionPenalties: [],
    generationCategoryOrder: ["hero", "silhouette", "editorial", "motion", "product_focus", "detail"],
    dnaHints: {
      environment: "Environmental location or clean studio depending on style. The setting should support the outfit story.",
      lighting: "Soft directional natural light. Full-body illumination with controlled shadow depth.",
      lens: "Editorial lens family: 85mm for most shots, 35mm for environmental context. f/5.6 baseline.",
      framing: "Full-body dominant. Every shot must show the complete outfit. Detail crops only for specific construction details.",
      generationNotes: "Generate full-body hero first. Then silhouette for proportion confirmation. Editorial mood for styling story. Motion last.",
    },
  },
};

// ═══════════════════════════════════════════════
// LAYER 3: ITEM OVERRIDES
// ═══════════════════════════════════════════════

const ITEM_OVERRIDES: ItemShotOverride[] = [
  // ── Jewelry Items ──
  {
    items: ["earrings", "earring", "ear cuff", "hoop", "stud", "drop earring"],
    family: "jewelry",
    label: "Earrings",
    sellsFocus: ["ear visibility and placement", "scale near face and jawline", "sparkle and metal finish", "skin and neckline relationship", "pair readability and symmetry", "elegance near jawline and neck"],
    preferredCropFamily: "face_detail",
    addOcclusionPenalties: ["hands covering ear area", "hair blocking earrings", "chin occluding earring", "crop cutting the jewelry awkwardly"],
    whatItSellsByCategory: {
      hero: "Ear visibility and placement against the face. The buyer sees scale, sparkle, and how the piece frames the jawline.",
      product_focus: "Earring dimension, drop length, and how it catches light from different angles near the jaw and neck.",
      detail: "Stone setting, metal finish, clasp quality, and earring construction at full magnification.",
      editorial: "Aspirational mood showing the earring in context. The buyer sees who wears this piece and when.",
      silhouette: "Earring outline and drop shape against negative space. Shows the exact profile and movement potential.",
    },
    additionalNegativeCues: ["hair covering earrings", "hands near ear area", "earring floating off earlobe", "mismatched earring sizes"],
    deltaBriefSuffix: "Hair swept behind the featured ear. No hands near ear or jaw area.",
  },

  {
    items: ["necklace", "pendant", "choker", "chain"],
    family: "jewelry",
    label: "Necklace",
    sellsFocus: ["chain drape and pendant position", "scale against collarbone and chest", "metal finish and clasp detail", "neckline relationship", "layering potential"],
    preferredCropFamily: "chest_up",
    addOcclusionPenalties: ["hands covering neckline", "hair covering pendant", "clothing collar hiding chain"],
    whatItSellsByCategory: {
      hero: "Chain drape and pendant position against the collarbone. The buyer sees scale, length, and how the piece sits on skin.",
      detail: "Chain link quality, pendant setting, clasp mechanism, and metal finish at full magnification.",
      product_focus: "Close view of pendant detail, chain links, and clasp with skin context.",
      editorial: "The necklace in lifestyle context, showing how it completes a look while remaining visible.",
    },
    additionalNegativeCues: ["necklace floating above skin", "chain links merging", "pendant clipping through clothing"],
    deltaBriefSuffix: "Neckline area clear and unobstructed. Chin slightly lifted to expose the chain.",
  },

  {
    items: ["bracelet", "bangle", "cuff bracelet"],
    family: "jewelry",
    label: "Bracelet",
    sellsFocus: ["wrist placement and fit", "clasp and closure detail", "metal or bead finish", "stacking potential", "hand elegance context"],
    preferredCropFamily: "product_zone",
    addOcclusionPenalties: ["sleeve covering bracelet", "hand position hiding clasp"],
    whatItSellsByCategory: {
      hero: "Wrist-level visibility showing the bracelet's scale, fit, and relationship to the hand.",
      product_focus: "Close interaction showing the bracelet on the wrist with natural hand positioning.",
      detail: "Clasp detail, link quality, stone setting, and metalwork finish at close range.",
      editorial: "The bracelet in styling context, showing how it pairs with clothing and other accessories.",
    },
    additionalNegativeCues: ["bracelet floating above wrist", "clasp rendering errors", "warped hand anatomy near bracelet"],
    deltaBriefSuffix: "Wrist area fully visible. Sleeve pulled back if present.",
  },

  {
    items: ["ring", "signet ring", "engagement ring", "band"],
    family: "jewelry",
    label: "Ring",
    sellsFocus: ["stone visibility and setting", "finger framing and hand posture", "band width and profile", "metal finish", "scale on hand"],
    preferredCropFamily: "product_zone",
    addOcclusionPenalties: ["other fingers covering ring", "hand clenched hiding the stone"],
    whatItSellsByCategory: {
      hero: "Ring visibility on the finger, showing scale, stone setting, and band width.",
      product_focus: "Close view of the ring on the hand with natural finger positioning for scale.",
      detail: "Stone facets, prong setting, band engravings, and metal finish at full magnification.",
      editorial: "The ring in a lifestyle moment, showing occasion and styling context.",
    },
    additionalNegativeCues: ["ring floating off finger", "warped finger anatomy", "incorrect finger count near ring"],
    deltaBriefSuffix: "Hand posed elegantly with fingers naturally spread. Ring finger prominent.",
  },

  // ── Eyewear Items ──
  {
    items: ["sunglasses", "aviators", "wayfarers"],
    family: "eyewear",
    label: "Sunglasses",
    sellsFocus: ["frame shape on face", "lens tint and reflection", "temple arm profile", "bridge fit", "style and attitude"],
    addOcclusionPenalties: ["harsh glare hiding frame detail", "hair covering temple arms"],
    whatItSellsByCategory: {
      hero: "Frame shape and lens tint on the face. Buyer sees fit, style, and face-framing effect.",
      product_focus: "Three-quarter view showing frame depth, temple arm, and lens profile.",
      detail: "Frame construction, hinge detail, lens coating, and brand markings close-up.",
      editorial: "Lifestyle mood with visible sunglasses, showing attitude and occasion.",
    },
    additionalNegativeCues: ["lens glare hiding eyes completely", "frame floating off face", "asymmetric temple arm alignment"],
    deltaBriefSuffix: "Controlled lighting to prevent harsh lens reflections while maintaining catchlight.",
  },

  {
    items: ["optical glasses", "glasses", "optical frames"],
    family: "eyewear",
    label: "Optical Glasses",
    sellsFocus: ["frame shape and face compatibility", "bridge and nose pad fit", "temple arm design", "lens clarity", "intellectual/professional styling"],
    addOcclusionPenalties: ["lens reflection hiding eyes", "frame distortion at angle"],
    whatItSellsByCategory: {
      hero: "Frame shape and fit on the face. Buyer sees how the glasses frame their features.",
      product_focus: "Angled view showing frame thickness, temple design, and nose bridge fit.",
      detail: "Hinge mechanism, material finish, and any branded temple details.",
      editorial: "Professional or lifestyle context showing who wears these frames and when.",
    },
    additionalNegativeCues: ["lens glare obscuring eyes", "frame asymmetry on face"],
    deltaBriefSuffix: "Even lighting on both sides of the face for frame symmetry comparison.",
  },

  // ── Apparel Items ──
  {
    items: ["blazer", "suit jacket", "sport coat", "tuxedo"],
    family: "apparel",
    label: "Blazer",
    sellsFocus: ["lapel construction and shoulder line", "fabric drape and button stance", "interior lining glimpse", "layering and styling versatility", "silhouette and proportion"],
    preferredCropFamily: "full",
    whatItSellsByCategory: {
      hero: "Complete blazer visibility: shoulder line, button stance, length, and proportions at a glance.",
      product_focus: "Lapel construction, stitching detail, and button quality close-up.",
      detail: "Interior lining, label, and construction quality. Craftsmanship validation.",
      editorial: "The blazer in a styled context, showing how it elevates the look.",
      silhouette: "Garment outline showing drape, shoulder structure, and length from a side angle.",
    },
    additionalNegativeCues: ["lapel shape distortion", "button misalignment", "shoulder line asymmetry"],
    deltaBriefSuffix: "Shoulders and lapels must be crisp and symmetrical.",
  },

  {
    items: ["dress", "gown", "maxi dress", "midi dress"],
    family: "apparel",
    label: "Dress",
    sellsFocus: ["silhouette and length", "fabric drape and movement", "neckline and bodice detail", "waist definition", "hem line and finishing"],
    preferredFramingFamily: "full_body",
    whatItSellsByCategory: {
      hero: "Complete dress visibility: silhouette, length, neckline, and waist definition at a glance.",
      silhouette: "Dress outline and drape from a side angle, showing how the fabric falls on the body.",
      motion: "Fabric movement and hem behaviour during a controlled stride. Buyers see the dress in motion.",
      editorial: "The dress in an aspirational context, showing occasion and styling.",
      detail: "Neckline construction, fabric texture, and any embellishment detail.",
    },
    additionalNegativeCues: ["hem clipped by frame edge", "waist definition lost", "neckline distortion"],
    deltaBriefSuffix: "Full hem must be visible in hero shots. Show the complete length.",
  },

  // ── Footwear Items ──
  {
    items: ["sneakers", "trainers"],
    family: "footwear",
    label: "Sneakers",
    sellsFocus: ["sole design and profile", "upper construction and material", "lacing system", "on-foot stance and energy", "ground presence and movement"],
    maxMotionShots: 2,
    whatItSellsByCategory: {
      hero: "Complete sneaker visibility on foot: shape, lacing, sole profile, and material at a glance.",
      product_focus: "Low-angle close-up of sole design, material texture, and construction quality.",
      motion: "Sneaker in stride showing sole flex, upper movement, and ground energy.",
      detail: "Lacing detail, tongue construction, heel tab, and material close-up.",
      editorial: "Street or lifestyle context showing the sneaker's attitude and styling.",
    },
    additionalNegativeCues: ["shoe floating above ground", "lace rendering errors", "sole-ground gap"],
    deltaBriefSuffix: "Both shoes grounded and in contact with the surface. Laces naturally rendered.",
  },

  // ── Bag Items ──
  {
    items: ["shoulder bag", "hobo bag", "shoulder"],
    family: "bags",
    label: "Shoulder Bag",
    sellsFocus: ["bag shape and structure on the shoulder", "strap drop and carry position", "body scale and proportion", "hardware and closure visibility", "profile readability and opening"],
    generationCategoryOrder: ["hero", "product_focus", "detail", "silhouette", "editorial", "motion"],
    whatItSellsByCategory: {
      hero: "Complete shoulder bag visibility: shape, strap drop, and scale against the body at a glance.",
      product_focus: "Profile carry showing strap position on the shoulder, bag depth, and how it sits against the hip.",
      detail: "Hardware quality, closure mechanism, stitching, and material texture at close range.",
      silhouette: "Bag profile from the side showing shape, depth, and how it sits when carried.",
      editorial: "Lifestyle context showing who carries this bag and where, with the bag as the focal point.",
    },
    additionalNegativeCues: ["bag shape collapsed", "strap floating off shoulder", "hardware rendering artifacts", "bag merging with clothing"],
    deltaBriefSuffix: "Bag should maintain its structure on the shoulder. Strap naturally draped, not floating.",
  },

  {
    items: ["tote", "tote bag", "shopper"],
    family: "bags",
    label: "Tote Bag",
    sellsFocus: ["bag shape and structure when carried", "handle drop length", "interior depth glimpse", "body scale and proportion", "material and stitching"],
    whatItSellsByCategory: {
      hero: "Complete tote visibility: shape, handles, and scale against the body.",
      product_focus: "Profile carry showing handle drop, bag depth, and how it sits at the side.",
      detail: "Stitching quality, hardware, interior pocket detail, and material texture.",
      editorial: "Lifestyle context showing who carries this tote and where.",
    },
    additionalNegativeCues: ["bag shape collapsed", "handle floating off shoulder", "interior rendering artifacts"],
    deltaBriefSuffix: "Bag should maintain its structure and not appear collapsed or floppy.",
  },

  // ── Watch Items ──
  {
    items: ["sport watch", "dive watch", "digital watch"],
    family: "watches",
    label: "Sport Watch",
    sellsFocus: ["case size and presence on wrist", "dial legibility and markers", "bezel function and detail", "strap durability and material", "active lifestyle context"],
    maxMotionShots: 1,
    whatItSellsByCategory: {
      hero: "Watch on wrist showing case size, dial, and strap in a natural position.",
      product_focus: "Wrist-level close-up of dial, bezel, and case construction.",
      detail: "Crown, pushers, bezel markings, and strap closure at full magnification.",
      editorial: "Active or outdoor lifestyle context with visible watch.",
    },
    additionalNegativeCues: ["watch floating off wrist", "dial text illegible", "crown misplaced"],
    deltaBriefSuffix: "Wrist angled to present the dial face toward camera. Sleeve pulled back fully.",
  },

  {
    items: ["dress watch", "luxury watch", "automatic watch"],
    family: "watches",
    label: "Dress Watch",
    sellsFocus: ["case elegance and thinness", "dial craftsmanship", "strap leather or metal quality", "formal wrist presence", "understated luxury"],
    whatItSellsByCategory: {
      hero: "Watch on wrist in a refined, formal context. Case shape and strap quality visible.",
      product_focus: "Wrist-level close-up showing dial detail, case profile, and strap finish.",
      detail: "Dial complications, case edge finishing, and clasp mechanism at close range.",
      editorial: "Formal or luxury lifestyle context with the watch as the focal accessory.",
    },
    additionalNegativeCues: ["watch floating off wrist", "dial rendering errors", "strap clasp artifacts"],
    deltaBriefSuffix: "Shirt cuff positioned to frame the watch elegantly. Wrist angled for dial visibility.",
  },

  // ── Belt Items ──
  {
    items: ["leather belt", "dress belt"],
    family: "belts",
    label: "Leather Belt",
    sellsFocus: ["buckle design and hardware", "leather grain and finish", "width and proportion at waist", "stitching and edge detail", "outfit anchoring effect"],
    whatItSellsByCategory: {
      hero: "Belt visible at the waist, anchoring the outfit. Buckle, width, and leather finish all readable.",
      detail: "Buckle hardware, leather grain, edge stitching, and keeper loop at close range.",
      product_focus: "Waist-level view showing how the belt defines the midsection and interacts with clothing.",
      editorial: "The belt as part of a styled look, showing how it completes the outfit.",
    },
    additionalNegativeCues: ["buckle hardware distortion", "leather texture lost", "belt floating off waist"],
    deltaBriefSuffix: "Shirt tucked to expose the belt fully. Buckle facing camera.",
  },

  {
    items: ["statement belt", "chain belt", "wide belt"],
    family: "belts",
    label: "Statement Belt",
    sellsFocus: ["buckle or hardware as focal point", "width and visual impact", "styling as a feature piece", "outfit transformation effect"],
    whatItSellsByCategory: {
      hero: "Statement belt visible as a styling centrepiece. Full outfit context with belt as focal point.",
      detail: "Hardware, chain links, or decorative elements at full magnification.",
      editorial: "The belt transforming a simple outfit into a styled look.",
    },
    additionalNegativeCues: ["hardware chain links merging", "belt proportions distorted"],
    deltaBriefSuffix: "Belt positioned as the outfit's visual anchor point. Waist area well-lit.",
  },

  // ── Headwear Items ──
  {
    items: ["cap", "baseball cap", "trucker cap"],
    family: "headwear",
    label: "Cap",
    sellsFocus: ["crown shape and structure", "brim curve and depth", "front logo or embroidery", "fit on head", "face-framing effect"],
    whatItSellsByCategory: {
      hero: "Cap on head, front-facing. Buyer sees crown shape, brim curve, and face-framing effect.",
      product_focus: "Side profile showing brim depth, crown height, and how the cap sits on the head.",
      detail: "Embroidery, stitching, eyelets, and fabric texture at close range.",
      editorial: "The cap in a lifestyle context, showing attitude and styling.",
    },
    additionalNegativeCues: ["brim shape distortion", "crown collapsing", "logo embroidery blurred"],
    deltaBriefSuffix: "Cap sitting naturally on the head. Brim curve consistent.",
  },
  {
    items: ["beanie", "knit beanie", "wool beanie"],
    family: "headwear",
    label: "Beanie",
    sellsFocus: ["knit texture and density", "crown slouch or structure", "fit around hairline and ears", "warmth and cosiness appeal"],
    whatItSellsByCategory: {
      hero: "Beanie on head, front-facing. Buyer sees knit texture, fit, and face framing.",
      product_focus: "Side view showing crown height, how the beanie sits, and ear coverage.",
      detail: "Knit pattern, yarn quality, and edge ribbing at close range.",
      editorial: "The beanie in a lifestyle context, showing warmth and styling attitude.",
    },
    additionalNegativeCues: ["knit pattern inconsistency", "beanie floating off head"],
    deltaBriefSuffix: "Beanie sitting naturally, not too tight or too loose. Knit texture visible.",
  },
  {
    items: ["bucket hat", "sun hat", "wide brim hat", "fedora"],
    family: "headwear",
    label: "Brimmed Hat",
    sellsFocus: ["brim width and shape", "crown structure", "shade effect on face", "styling versatility", "material quality"],
    whatItSellsByCategory: {
      hero: "Hat on head, front-facing. Buyer sees brim width, crown shape, and face-shading effect.",
      product_focus: "Side profile showing full brim depth, crown height, and dimensional form.",
      detail: "Material quality, hatband, brim edge, and construction finishing.",
      editorial: "The hat in a lifestyle context, showing occasion and styling.",
    },
    additionalNegativeCues: ["brim warping", "crown shape collapse", "hat floating above head"],
    deltaBriefSuffix: "Hat sitting at natural depth on the head. Brim shape consistent all around.",
  },

  // ── Small Accessories Items ──
  {
    items: ["wallet", "bifold wallet", "long wallet", "zip wallet"],
    family: "small_accessories",
    label: "Wallet",
    sellsFocus: ["leather or material quality", "card slot organisation", "closure type", "thickness and pocket fit", "edge and stitching detail"],
    whatItSellsByCategory: {
      hero: "Wallet in hand at natural scale. Buyer sees size, material quality, and form.",
      product_focus: "Wallet presented open or partially open, showing card slots and interior layout.",
      detail: "Leather grain, edge stitching, logo stamp, and closure mechanism at close range.",
      editorial: "The wallet in a daily-life moment: on a desk, emerging from a pocket, or in hand.",
    },
    additionalNegativeCues: ["wallet scale inconsistent with hand", "card slots merging", "edge paint blurred"],
    deltaBriefSuffix: "Wallet at natural hand scale. Leather grain clearly visible.",
  },
  {
    items: ["cardholder", "card holder", "card case", "card wallet"],
    family: "small_accessories",
    label: "Cardholder",
    sellsFocus: ["slim profile and pocket fit", "leather or material quality", "card slot visibility", "edge finishing", "logo placement"],
    whatItSellsByCategory: {
      hero: "Cardholder in hand showing slim profile and material quality.",
      product_focus: "Cardholder with a card partially inserted to show slot depth and fit.",
      detail: "Edge finishing, leather grain, and logo stamp at close range.",
      editorial: "The cardholder in a minimal lifestyle setting.",
    },
    additionalNegativeCues: ["cardholder scale wrong relative to hand", "card floating out of slot"],
    deltaBriefSuffix: "Cardholder at natural hand scale. Slim profile visible from the side.",
  },
  {
    items: ["keychain", "key holder", "key ring", "key fob"],
    family: "small_accessories",
    label: "Keychain",
    sellsFocus: ["hardware quality and weight", "attachment mechanism", "material and finish", "tactile appeal", "daily use context"],
    whatItSellsByCategory: {
      hero: "Keychain in hand showing scale, hardware, and material quality.",
      detail: "Hardware mechanism, metal finish, and engraving detail at close range.",
      editorial: "The keychain in a daily-life context, suggesting premium daily carry.",
    },
    additionalNegativeCues: ["hardware floating", "chain links merging", "scale inconsistent with hand"],
    deltaBriefSuffix: "Keychain at natural scale. Hardware details sharp and readable.",
  },
];

// ═══════════════════════════════════════════════
// RESOLVER: Merge item > family > universal
// ═══════════════════════════════════════════════

function findItemOverride(input: LookbookInput): ItemShotOverride | null {
  const itemLower = (input.specificItem || "").toLowerCase();
  if (!itemLower) return null;

  return ITEM_OVERRIDES.find((o) =>
    o.family === input.productFamily &&
    o.items.some((i) => itemLower.includes(i) || i.includes(itemLower))
  ) || null;
}

export function resolveBlueprint(input: LookbookInput): ResolvedBlueprint {
  const familyBP = FAMILY_BLUEPRINTS[input.productFamily];
  const itemOverride = findItemOverride(input);

  const sourceParts = [itemOverride?.label, familyBP.label, "universal"].filter(Boolean);

  return {
    source: sourceParts.join(" > "),
    family: input.productFamily,

    sellsFocus: itemOverride?.sellsFocus ?? familyBP.sellsFocus,

    preferredFramingFamily: itemOverride?.preferredFramingFamily ?? familyBP.preferredFramingFamily,
    preferredCropFamily: itemOverride?.preferredCropFamily ?? familyBP.preferredCropFamily,
    preferredMovementLevel: itemOverride?.maxMotionShots !== undefined
      ? (itemOverride.maxMotionShots === 0 ? "static" : familyBP.preferredMovementLevel)
      : familyBP.preferredMovementLevel,
    maxMotionShots: itemOverride?.maxMotionShots ?? familyBP.maxMotionShots,
    brandingEmphasis: itemOverride?.brandingEmphasis ?? familyBP.brandingEmphasis,

    occlusionPenalties: [
      ...familyBP.occlusionPenalties,
      ...(itemOverride?.addOcclusionPenalties ?? []),
    ],

    generationCategoryOrder: itemOverride?.generationCategoryOrder ?? familyBP.generationCategoryOrder,

    whatItSellsByCategory: itemOverride?.whatItSellsByCategory ?? {},

    additionalNegativeCues: itemOverride?.additionalNegativeCues ?? [],
    deltaBriefSuffix: itemOverride?.deltaBriefSuffix ?? "",

    // ── Evidence-based planning ──
    evidencePlan: resolveEvidencePlan(input),
  };
}

/** Get the family blueprint for DNA resolver use. */
export function getFamilyBlueprint(family: ProductFamily): FamilyShotBlueprint {
  return FAMILY_BLUEPRINTS[family];
}

export { FAMILY_BLUEPRINTS, ITEM_OVERRIDES, UNIVERSAL_RULES as UNIVERSAL };
