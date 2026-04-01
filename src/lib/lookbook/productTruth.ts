/**
 * F4 Layer 2 & 3: Product Truth Lock and Scale/Proportion Lock.
 *
 * Family-specific invariant physical properties (Layer 2) and
 * product-to-body sizing rules (Layer 3) that must hold across
 * every shot in the set.
 *
 * Also provides family drift negatives (Layer 5 tier 2).
 */

import type {
  ProductFamily,
  LookbookInput,
  ProductFingerprint,
  BagFingerprint,
  WatchFingerprint,
  BeltFingerprint,
  JewelryFingerprint,
  EyewearFingerprint,
  ApparelFingerprint,
  FootwearFingerprint,
  HeadwearFingerprint,
  ScarfFingerprint,
  SmallAccessoryFingerprint,
  FullLookFingerprint,
} from "./types";

// ── Layer 2: Product Truth ──
// Invariant physical properties that must be consistent as in the reference.

export interface ProductTruthSpec {
  /** Prose description of invariant physical properties. */
  truthLock: string;
  /** Key visual invariants to check. */
  invariants: string[];
}

export const FAMILY_PRODUCT_TRUTH: Record<ProductFamily, ProductTruthSpec> = {
  jewelry: {
    truthLock:
      "Metal colour and finish must be identical as in the reference. Stone count, cut shape, and setting style " +
      "are fixed. If earrings, both pieces must match in size, drop length, and metal tone. Chain thickness " +
      "and link pattern do not change from the reference.",
    invariants: [
      "metal colour consistency",
      "stone count and shape",
      "pair symmetry (earrings)",
      "chain/link pattern",
      "clasp style",
    ],
  },
  bags: {
    truthLock:
      "Bag body shape, proportion, and silhouette are fixed. Hardware colour (gold, silver, gunmetal) is " +
      "consistent as in the reference. Strap attachment points, buckle style, and closure mechanism do not change. " +
      "Interior lining colour and pocket layout remain the same when visible.",
    invariants: [
      "body shape and proportion",
      "hardware metal colour",
      "strap attachment points",
      "closure mechanism type",
      "interior lining colour",
    ],
  },
  watches: {
    truthLock:
      "Dial layout, index style, and hand design are fixed. Case shape (round, rectangular, cushion) and " +
      "material finish (polished, brushed, matte) do not change. Crown position is at 3 o'clock unless " +
      "the design specifies otherwise. Strap material and colour are consistent.",
    invariants: [
      "dial layout and indices",
      "case shape and finish",
      "crown position",
      "strap material and colour",
      "bezel markings",
    ],
  },
  eyewear: {
    truthLock:
      "Frame shape, bridge width, and temple arm length are fixed. Lens tint and coating are identical " +
      "in both lenses as in the reference. Hinge style and any logo placement on the temple are consistent. " +
      "Nose pad style does not change.",
    invariants: [
      "frame shape and width",
      "lens tint consistency",
      "temple arm style",
      "hinge design",
      "nose pad type",
    ],
  },
  belts: {
    truthLock:
      "Buckle shape, prong count, and metal finish are fixed. Leather width, colour, and edge paint are " +
      "consistent. Hole spacing and keeper loop position do not change. Any embossed pattern or stitching " +
      "detail is identical as in the reference.",
    invariants: [
      "buckle shape and metal finish",
      "leather width and colour",
      "hole spacing",
      "edge paint colour",
      "stitching pattern",
    ],
  },
  footwear: {
    truthLock:
      "Shoe silhouette, sole profile, and upper construction are fixed. Lacing system (eyelets, lace colour, " +
      "lace pattern) is consistent. Sole colour and tread pattern do not change. Any branding on the tongue " +
      "or heel tab is identical as in the reference.",
    invariants: [
      "shoe silhouette",
      "sole profile and colour",
      "lacing system",
      "upper material and colour",
      "heel tab / tongue branding",
    ],
  },
  apparel: {
    truthLock:
      "Garment colour, fabric texture, and pattern are fixed. Button count, spacing, and colour are " +
      "consistent. Collar shape, cuff style, and hem length do not change. Any embroidery, applique, " +
      "or print is identical as in the reference.",
    invariants: [
      "fabric colour and pattern",
      "button count and spacing",
      "collar shape",
      "cuff and hem style",
      "print or embroidery placement",
    ],
  },
  headwear: {
    truthLock:
      "Crown shape, brim width, and material are fixed. Any band, badge, or logo placement is consistent. " +
      "Interior sweatband colour does not change when visible. Stiffness and structure level are the same " +
      "as in the reference.",
    invariants: [
      "crown shape and height",
      "brim width and curvature",
      "band/badge placement",
      "material texture",
      "structural stiffness",
    ],
  },
  scarves: {
    truthLock:
      "Fabric weight, weave pattern, and print are fixed. Fringe length and density (if present) are " +
      "consistent. Edge hemming style does not change. Colour saturation and print registration are " +
      "identical as in the reference.",
    invariants: [
      "weave pattern",
      "print registration",
      "fringe detail",
      "edge hemming",
      "fabric weight and drape character",
    ],
  },
  small_accessories: {
    truthLock:
      "Product dimensions, material finish, and hardware are fixed. Clasp or closure mechanism type is " +
      "consistent. Any embossing, logo, or surface pattern is identical as in the reference. Edge finishing " +
      "and stitching detail do not change.",
    invariants: [
      "product dimensions",
      "material finish",
      "hardware type and colour",
      "clasp/closure mechanism",
      "edge finishing",
    ],
  },
  full_look: {
    truthLock:
      "Each garment and accessory in the ensemble maintains its own product truth. Layering order is " +
      "consistent. Colour palette and styling choices (tucked, untucked, buttoned, open) are fixed " +
      "as in the reference unless the brief specifies a styling change.",
    invariants: [
      "layering order",
      "colour palette",
      "styling choices per piece",
      "accessory placement",
      "fabric interaction at overlap points",
    ],
  },
};

// ── Layer 3: Scale/Proportion Rules ──
// Product-to-body sizing that must hold.

export interface ScaleRuleSpec {
  /** Prose description of scale rules. */
  scaleLock: string;
}

export const FAMILY_SCALE_RULES: Record<ProductFamily, ScaleRuleSpec> = {
  jewelry: {
    scaleLock:
      "Earrings are visible but do not dominate the earlobe. Necklace chain drapes naturally with " +
      "pendant resting at the intended length. Bracelet fits the wrist without gaps or compression. " +
      "Ring is proportional to the finger, not oversized.",
  },
  bags: {
    scaleLock:
      "Bag body sits at the correct height relative to the hip or torso. Strap drop places the bag " +
      "where it would naturally hang. Bag does not appear miniaturised or oversized against the model's frame.",
  },
  watches: {
    scaleLock:
      "Case diameter is proportional to the wrist. Strap width matches the lug width. The watch does " +
      "not appear like a wall clock on a thin wrist or a toy on a large wrist.",
  },
  eyewear: {
    scaleLock:
      "Frame width matches the face width at the temples. Lenses do not extend below the cheekbone. " +
      "Bridge sits naturally on the nose without pinching or floating.",
  },
  belts: {
    scaleLock:
      "Belt width is proportional to the trouser loops. Buckle is scaled to the belt width. " +
      "The belt wraps the waist with a natural tail length, not excessively long or short.",
  },
  footwear: {
    scaleLock:
      "Shoe size matches the model's foot. Sole thickness is proportional to the upper. " +
      "The shoe does not look like a clown shoe or a child's shoe on an adult.",
  },
  apparel: {
    scaleLock:
      "Garment fits the model's body as intended by the design (fitted, relaxed, oversized). " +
      "Shoulder seams sit at the correct point. Hem falls at the intended length.",
  },
  headwear: {
    scaleLock:
      "Hat sits on the head at the intended position (not too high, not too low). " +
      "Brim width is proportional to the head and shoulders. Crown height is consistent.",
  },
  scarves: {
    scaleLock:
      "Scarf length and width are proportional to the model's torso. Drape weight follows gravity. " +
      "When wrapped, the scarf does not bulk disproportionately.",
  },
  small_accessories: {
    scaleLock:
      "Product is proportional to the hand or surface it rests on. A wallet fits a hand naturally. " +
      "A keychain is pocket-sized, not oversized.",
  },
  full_look: {
    scaleLock:
      "Each piece in the ensemble fits its own scale rules. Proportions between layered pieces " +
      "look intentional. Accessories are scaled correctly against the garments.",
  },
};

// ── Layer 5 Tier 2: Family Drift Negatives ──
// Common AI generation drift patterns specific to each family.

export const FAMILY_DRIFT_NEGATIVES: Record<ProductFamily, string> = {
  jewelry:
    "mismatched metal colours from the reference, floating earring not attached to ear, " +
    "stone count changing between angles, chain links merging into solid band, " +
    "clasp appearing on wrong side",
  bags:
    "hardware colour shifting from the reference, strap attachment points moving, " +
    "bag body shape morphing between angles, interior colour changing, " +
    "zipper teeth merging into smooth surface",
  watches:
    "dial indices shifting position, crown migrating from 3 o'clock, " +
    "case shape changing between angles, strap material switching, " +
    "hands pointing to different times as in the reference",
  eyewear:
    "lens tint mismatch between left and right, frame shape warping between angles, " +
    "temple arms different lengths, hinge disappearing in profile view, " +
    "nose pads changing style",
  belts:
    "buckle shape changing from the reference, leather width inconsistent, " +
    "hole spacing shifting, edge paint colour drifting, " +
    "prong count changing",
  footwear:
    "sole profile changing from the reference, lacing pattern inconsistent, " +
    "shoe silhouette morphing, heel height shifting, " +
    "upper material colour drifting between angles",
  apparel:
    "button count changing, collar shape morphing, pattern scale shifting, " +
    "hem length inconsistent from the reference, fabric colour drifting, " +
    "pocket placement moving",
  headwear:
    "crown shape collapsing or inflating from the reference, brim width changing, " +
    "badge or logo placement shifting, material texture switching, " +
    "structural stiffness inconsistent",
  scarves:
    "print pattern scale shifting from the reference, fringe length changing, " +
    "fabric weight appearing inconsistent, colour saturation drifting, " +
    "edge hemming style switching",
  small_accessories:
    "product dimensions changing from the reference, hardware colour drifting, " +
    "clasp mechanism type switching, edge finishing inconsistent, " +
    "logo placement shifting",
  full_look:
    "layering order changing from the reference, colour palette drifting, " +
    "styling choices (tucked/untucked) switching unintentionally, " +
    "accessory placement moving, fabric overlap points inconsistent",
};

// ── Item-Level Overrides ──
// Specific items that need additional truth or scale rules beyond their family.

interface ItemTruthOverride {
  items: string[];
  family: ProductFamily;
  /** Additional truth constraints appended to the family truth lock. */
  additionalTruth?: string;
  /** Additional scale constraints appended to the family scale lock. */
  additionalScale?: string;
  /** Additional drift negatives appended to the family drift negatives. */
  additionalDriftNegatives?: string;
}

const ITEM_TRUTH_OVERRIDES: ItemTruthOverride[] = [
  {
    items: ["earring", "earrings", "stud earring", "drop earring", "hoop earring"],
    family: "jewelry",
    additionalTruth: "Both earrings must be identical in size and drop length. Backing type (post, hook, clip) is fixed.",
    additionalScale: "Drop length is proportional to the ear, not reaching past the jawline unless design specifies.",
    additionalDriftNegatives: "single earring rendered when pair expected, earring size mismatch between left and right",
  },
  {
    items: ["necklace", "pendant", "chain", "choker"],
    family: "jewelry",
    additionalTruth: "Chain length and pendant position relative to the collarbone are fixed.",
    additionalScale: "Chain sits at the intended length (choker at throat, pendant at mid-chest).",
  },
  {
    items: ["shoulder bag", "crossbody bag", "sling bag"],
    family: "bags",
    additionalTruth: "Strap drop length is fixed. Cross-body positioning (left or right hip) is consistent.",
    additionalDriftNegatives: "strap routing switching sides from the reference, strap drop length changing",
  },
  {
    items: ["tote", "tote bag", "shopper bag"],
    family: "bags",
    additionalTruth: "Handle drop length is fixed. Bag does not appear rigid when it should be soft, or vice versa.",
  },
  {
    items: ["dress watch", "formal watch", "classic watch"],
    family: "watches",
    additionalScale: "Case sits close to the wrist with minimal gap. Strap tapers correctly from lug to buckle.",
  },
  {
    items: ["sport watch", "dive watch", "digital watch"],
    family: "watches",
    additionalTruth: "Bezel markings and digital display elements are consistent as in the reference.",
    additionalDriftNegatives: "bezel graduation marks shifting, digital display content changing",
  },
];

// ── Resolver Functions ──

function fuzzyItemMatch(specificItem: string, candidates: string[]): boolean {
  const lower = specificItem.toLowerCase();
  return candidates.some(
    (c) => lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower),
  );
}

function findItemTruthOverride(input: LookbookInput): ItemTruthOverride | null {
  if (!input.specificItem) return null;
  return (
    ITEM_TRUTH_OVERRIDES.find(
      (o) => o.family === input.productFamily && fuzzyItemMatch(input.specificItem!, o.items),
    ) ?? null
  );
}

// ── Fingerprint-Specific Product Truth ──
// When a ProductFingerprint exists (from vision extraction or manual entry),
// build a concrete truth lock with actual product attributes instead of
// generic family placeholders.

function buildFingerprintTruth(fp: ProductFingerprint): string {
  const parts: string[] = [];

  switch (fp.family) {
    case "bags": {
      const bag = fp as BagFingerprint;
      parts.push(
        `${bag.silhouetteShape} ${bag.silhouettePrimary} silhouette is fixed.`,
        `${bag.handleCount} ${bag.handleType} handle(s)${bag.handleAttachment ? ` with ${bag.handleAttachment} attachment` : ""}, consistent as in the reference.`,
        `Closure: ${bag.closureType}. Construction: ${bag.constructionStyle}.`,
      );
      if (bag.strapPresent && bag.strapType) {
        parts.push(`Strap: ${bag.strapType}, attachment points do not change.`);
      }
      break;
    }
    case "watches": {
      const w = fp as WatchFingerprint;
      parts.push(
        `${w.caseShape} ${w.caseSize} case is fixed.`,
        `Dial: ${w.dialColour} ${w.dialType}. Bezel: ${w.bezelType}.`,
        `Strap: ${w.strapColour} ${w.strapType}, consistent as in the reference.`,
        `Crown at ${w.crownPosition}.`,
      );
      if (w.complicationCount > 0) {
        parts.push(`${w.complicationCount} complication(s), layout does not change.`);
      }
      break;
    }
    case "belts": {
      const b = fp as BeltFingerprint;
      parts.push(
        `${b.beltWidth} width belt is fixed.`,
        `Buckle: ${b.buckleShape} ${b.buckleType}. Tip: ${b.tipStyle}.`,
        `Construction: ${b.constructionStyle}, consistent as in the reference.`,
      );
      break;
    }
    case "jewelry": {
      const j = fp as JewelryFingerprint;
      parts.push(
        `${j.jewelryType}, ${j.constructionStyle} construction is fixed.`,
      );
      if (j.chainType) parts.push(`Chain: ${j.chainType}.`);
      if (j.settingType) parts.push(`Setting: ${j.settingType}.`);
      if (j.stonePresent && j.stoneType) parts.push(`Stone: ${j.stoneType}, count and cut do not change.`);
      if (j.dropLength) parts.push(`Drop: ${j.dropLength}.`);
      break;
    }
    case "eyewear": {
      const e = fp as EyewearFingerprint;
      parts.push(
        `${e.frameShape} ${e.frameMaterial} frame is fixed.`,
        `Lens: ${e.lensColour} ${e.lensType}. Bridge: ${e.bridgeType}.`,
        `Temples: ${e.templeStyle}, consistent as in the reference.`,
        `Construction: ${e.constructionStyle}.`,
      );
      break;
    }
    case "apparel": {
      const a = fp as ApparelFingerprint;
      parts.push(
        `${a.fitType} fit ${a.apparelType} is fixed.`,
        `Neckline: ${a.neckline}. Sleeve: ${a.sleeveLength}. Hem: ${a.hemLength}.`,
        `Closure: ${a.closureType}. Construction: ${a.constructionStyle}.`,
      );
      break;
    }
    case "footwear": {
      const f = fp as FootwearFingerprint;
      parts.push(
        `${f.footwearType} with ${f.toeShape} toe is fixed.`,
        `Sole: ${f.soleType}. Heel: ${f.heelHeight}. Ankle: ${f.ankleHeight}.`,
        `Closure: ${f.closureType}. Construction: ${f.constructionStyle}.`,
      );
      break;
    }
    case "headwear": {
      const h = fp as HeadwearFingerprint;
      parts.push(
        `${h.crownShape} crown ${h.headwearType} is fixed.`,
        `Brim: ${h.brimStyle}. Closure: ${h.closureType}.`,
        `Construction: ${h.constructionStyle}, consistent as in the reference.`,
      );
      break;
    }
    case "scarves": {
      const s = fp as ScarfFingerprint;
      parts.push(
        `${s.dimensions} ${s.scarfType} is fixed.`,
        `Fabric: ${s.fabricWeight} weight. Pattern: ${s.patternType}.`,
        `Edge: ${s.edgeFinish}. Construction: ${s.constructionStyle}.`,
      );
      break;
    }
    case "small_accessories": {
      const sa = fp as SmallAccessoryFingerprint;
      parts.push(
        `${sa.accessoryType}, ${sa.openingType} opening is fixed.`,
        `Construction: ${sa.constructionStyle}, consistent as in the reference.`,
      );
      if (sa.cardSlots) parts.push(`${sa.cardSlots} card slot(s), layout does not change.`);
      if (sa.compartmentCount) parts.push(`${sa.compartmentCount} compartment(s).`);
      break;
    }
    case "full_look": {
      const fl = fp as FullLookFingerprint;
      parts.push(
        `${fl.styleDirection} full look with ${fl.primaryPiece} as hero piece.`,
        `${fl.layeringCount} visible layer(s). Palette: ${fl.colourPalette}.`,
        `Construction: ${fl.constructionStyle}, layering order does not change.`,
      );
      break;
    }
  }

  // Common attributes
  parts.push(
    `Material: ${fp.materialFinish} ${fp.materialColour}.`,
    `Hardware: ${fp.hardwareFinish} finish, consistent as in the reference.`,
  );
  if (fp.logoScale !== "none" && fp.logoPlacement) {
    parts.push(`Logo: ${fp.logoStyle} ${fp.logoScale} at ${fp.logoPlacement}, does not move.`);
  }
  if (fp.forbiddenElements.length > 0) {
    parts.push(`Must NOT appear: ${fp.forbiddenElements.join(", ")}.`);
  }

  return parts.join(" ");
}

/** Resolve the product truth lock text for Layer 2. */
export function resolveProductTruth(input: LookbookInput): string {
  // When a fingerprint exists, use concrete extracted attributes
  if (input.productFingerprint) {
    return buildFingerprintTruth(input.productFingerprint);
  }

  // Fallback: generic family-level truth
  const family = FAMILY_PRODUCT_TRUTH[input.productFamily];
  const override = findItemTruthOverride(input);
  let truth = family.truthLock;
  if (override?.additionalTruth) {
    truth += " " + override.additionalTruth;
  }
  return truth;
}

/** Resolve the scale/proportion lock text for Layer 3. */
export function resolveScaleLock(input: LookbookInput): string {
  const family = FAMILY_SCALE_RULES[input.productFamily];
  const override = findItemTruthOverride(input);
  let scale = family.scaleLock;
  if (override?.additionalScale) {
    scale += " " + override.additionalScale;
  }
  return scale;
}

/** Resolve the family drift negatives for Layer 5 tier 2. */
export function resolveDriftNegatives(input: LookbookInput): string {
  const family = FAMILY_DRIFT_NEGATIVES[input.productFamily];
  const override = findItemTruthOverride(input);
  if (override?.additionalDriftNegatives) {
    return `${family}, ${override.additionalDriftNegatives}`;
  }
  return family;
}
