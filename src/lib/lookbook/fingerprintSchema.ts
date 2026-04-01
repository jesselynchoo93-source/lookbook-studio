/**
 * F7 Vision Extractor: family-specific extraction schemas, normaliser, and enum coercion.
 *
 * Stage 1 (Vision Extractor) sends these schemas as prompt context.
 * Stage 2 (Normaliser) validates and coerces raw model output into typed ProductFingerprint.
 */

import type {
  ProductFamily,
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

// ── Extraction schemas (sent to the vision model as JSON field descriptions) ──

export const BAG_EXTRACTION_SCHEMA = {
  family: '"bags" (literal)',
  silhouettePrimary: "primary silhouette type: tote, crossbody, clutch, satchel, bucket, hobo, baguette, shoulder, backpack, briefcase, or similar",
  silhouetteShape: "geometric shape: trapezoid, rectangular, bucket, round, half-moon, square, barrel, or similar",
  handleCount: "number: 0, 1, or 2",
  handleType: "handle style: rolled leather, flat leather, chain, bamboo, resin, woven, tubular, braided, or similar",
  handleAttachment: "how handles connect: covered studs, rings, sewn, rivets, d-ring, loop, integrated, or similar",
  strapPresent: "boolean: true if a removable or attached strap exists",
  strapType: "strap description if present, otherwise omit",
  closureType: "one of: open-top, zipper, flap, magnetic, drawstring, buckle",
  constructionStyle: "construction: structured, semi-structured, soft, quilted, woven, or similar",
  materialFinish: "surface texture: smooth, pebbled, suede, patent, saffiano, canvas, nylon, or similar",
  materialColour: "primary colour name",
  hardwareFinish: "colour of CLEARLY VISIBLE EXPOSED METAL PARTS ONLY (buckles, clasps, zippers, d-rings, feet). Do NOT base this on logo colour or foil stamping. Leather-covered studs = not hardware. If no bare metal is visible, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "where the logo appears: centre-front, side, tongue, base, handle, or empty if none visible",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: structural features clearly ABSENT that an AI generator might add (e.g., crossbody strap, chain handle, zipper, flap closure, extra buckle, extra rings). Only include elements confidently absent.",
  additionalNotes: "anything notable not captured above, or empty string",
};

export const WATCH_EXTRACTION_SCHEMA = {
  family: '"watches" (literal)',
  caseShape: "one of: round, rectangular, cushion, tonneau, square",
  caseSize: "approximate case diameter or description",
  dialColour: "dial colour name",
  dialType: "dial style: sunburst, matte, textured, skeleton, guilloché, or similar",
  bezelType: "one of: fixed-smooth, rotating, fluted, none",
  strapType: "strap material: leather, metal bracelet, rubber, nato, mesh, or similar",
  strapColour: "strap colour name",
  crownPosition: "crown position: 3 o'clock, 2 o'clock, 4 o'clock, or similar",
  complicationCount: "number of sub-dials or complications visible",
  constructionStyle: "construction: polished, brushed, mixed-finish, or similar",
  materialFinish: "case material finish: polished steel, brushed titanium, ceramic, or similar",
  materialColour: "case colour name",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS ONLY (buckles, clasps, crowns, studs, feet). Do NOT base this on logo colour. If no metal hardware, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "logo position on dial or case",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: features clearly ABSENT (e.g., chronograph pushers, rotating bezel, date window)",
  additionalNotes: "anything notable, or empty string",
};

export const BELT_EXTRACTION_SCHEMA = {
  family: '"belts" (literal)',
  beltWidth: "approximate width description: narrow, medium, wide",
  buckleType: "buckle mechanism: pin, slide, plate, toggle, or similar",
  buckleShape: "buckle shape: rectangular, round, square, d-ring, or similar",
  tipStyle: "belt tip: pointed, squared, rounded, or similar",
  constructionStyle: "construction: single-layer, stitched-edge, bonded, woven, or similar",
  materialFinish: "surface: smooth, pebbled, suede, patent, braided, or similar",
  materialColour: "primary colour name",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS ONLY (buckles, clasps, crowns, studs, feet). Do NOT base this on logo colour. If no metal hardware, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "logo position if visible",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: features clearly ABSENT",
  additionalNotes: "anything notable, or empty string",
};

export const JEWELRY_EXTRACTION_SCHEMA = {
  family: '"jewelry" (literal)',
  jewelryType: "type: ring, necklace, bracelet, earrings, brooch, or similar",
  pairSymmetry: "boolean: true if earrings or paired pieces",
  dropLength: "drop or pendant length description if applicable",
  chainType: "chain style if applicable: cable, box, rope, snake, or similar",
  settingType: "setting: prong, bezel, channel, pavé, or similar",
  stonePresent: "boolean: true if gemstones are visible",
  stoneType: "stone description if present",
  constructionStyle: "construction: cast, handcrafted, wire-wrapped, or similar",
  materialFinish: "metal finish: polished, matte, hammered, brushed, or similar",
  materialColour: "metal colour: yellow gold, white gold, rose gold, silver, etc.",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS ONLY (buckles, clasps, crowns, studs, feet). Do NOT base this on logo colour. If no metal hardware, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "logo position if visible",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: features clearly ABSENT",
  additionalNotes: "anything notable, or empty string",
};

export const EYEWEAR_EXTRACTION_SCHEMA = {
  family: '"eyewear" (literal)',
  eyewearType: "type: sunglasses, optical, reading",
  frameShape: "frame shape: aviator, wayfarer, cat-eye, round, rectangular, oversized, clubmaster, wrap, geometric, or similar",
  frameMaterial: "frame material: acetate, metal, titanium, mixed, nylon, wood, or similar",
  lensType: "lens type: tinted, gradient, mirrored, clear, polarised, photochromic, or similar",
  lensColour: "lens colour name",
  templeStyle: "temple arm style: straight, curved, wire, thick, thin, or similar",
  bridgeType: "bridge type: keyhole, saddle, adjustable-nose-pad, double-bridge, or similar",
  constructionStyle: "construction: moulded, assembled, handmade, or similar",
  materialFinish: "frame surface finish: glossy, matte, brushed, tortoiseshell, transparent, or similar",
  materialColour: "primary frame colour name",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS ONLY (hinges, nose pads, temple tips). If no metal hardware visible, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "logo position if visible: temple, lens, bridge, or empty if none",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: features clearly ABSENT (e.g., nose pads, double bridge, chain attachment)",
  additionalNotes: "anything notable, or empty string",
};

export const APPAREL_EXTRACTION_SCHEMA = {
  family: '"apparel" (literal)',
  apparelType: "type: jacket, coat, dress, shirt, blouse, trousers, skirt, blazer, jumpsuit, knitwear, or similar",
  fitType: "fit: slim, regular, oversized, tailored, relaxed, cropped, or similar",
  neckline: "neckline: crew, v-neck, collar, lapel, mock, turtleneck, scoop, boat, halter, or similar",
  sleeveLength: "sleeve: sleeveless, short, three-quarter, long, or similar",
  hemLength: "hem: cropped, hip, knee, midi, maxi, floor, or similar",
  closureType: "closure: button, zip, snap, pull-on, wrap, toggle, hook, or similar",
  constructionStyle: "construction: tailored, knit, woven, bonded, quilted, or similar",
  materialFinish: "fabric finish: smooth, textured, ribbed, twill, satin, matte, or similar",
  materialColour: "primary colour name",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS ONLY (buttons, zippers, snaps). If no metal hardware, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "logo position if visible",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: structural AND behavioral features clearly ABSENT that an AI might add. Include: pockets, pocket flaps, belt, belt loops, hood, structured seams, buttons, zipper, collar, lapels. If no pockets exist, include 'pockets'. If no structured waistband, include 'structured waist seam'. Focus on features that template poses might imply but this garment does not have.",
  additionalNotes: "anything notable, or empty string",
};

export const FOOTWEAR_EXTRACTION_SCHEMA = {
  family: '"footwear" (literal)',
  footwearType: "type: sneaker, boot, loafer, heel, sandal, flat, oxford, mule, espadrille, or similar",
  heelHeight: "heel: flat, low, mid, high, platform, or similar",
  toeShape: "toe: round, pointed, square, almond, open, peep, or similar",
  soleType: "sole: rubber, leather, platform, espadrille, wedge, crepe, or similar",
  closureType: "closure: lace-up, slip-on, buckle, zip, strap, velcro, or similar",
  ankleHeight: "height: low, ankle, mid-calf, knee, over-knee, or similar",
  constructionStyle: "construction: cemented, stitched, welted, moulded, or similar",
  materialFinish: "surface: smooth, pebbled, suede, patent, canvas, knit, or similar",
  materialColour: "primary colour name",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS ONLY (buckles, eyelets, zippers). If no metal hardware, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "logo position if visible: tongue, heel, side, sole, or empty if none",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: features clearly ABSENT (e.g., laces, buckle, platform sole)",
  additionalNotes: "anything notable, or empty string",
};

export const HEADWEAR_EXTRACTION_SCHEMA = {
  family: '"headwear" (literal)',
  headwearType: "type: cap, beanie, fedora, bucket, beret, visor, wide-brim, turban, or similar",
  crownShape: "crown: structured, unstructured, flat-top, round, pinched, or similar",
  brimStyle: "brim: flat, curved, wide, narrow, none, or similar",
  closureType: "closure: adjustable-strap, snapback, fitted, elastic, drawstring, none, or similar",
  constructionStyle: "construction: woven, knit, felt, moulded, panelled, or similar",
  materialFinish: "surface: smooth, textured, ribbed, felted, canvas, or similar",
  materialColour: "primary colour name",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS ONLY (buckles, eyelets, grommets). If no metal hardware, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "logo position if visible: front-centre, side, back, brim, or empty if none",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: features clearly ABSENT (e.g., brim, ear flaps, chin strap)",
  additionalNotes: "anything notable, or empty string",
};

export const SCARF_EXTRACTION_SCHEMA = {
  family: '"scarves" (literal)',
  scarfType: "type: scarf, shawl, bandana, wrap, stole, necktie, pocket-square, or similar",
  dimensions: "shape: square, rectangular, long-narrow, oversized, triangular, or similar",
  fabricWeight: "weight: sheer, lightweight, medium, heavy, or similar",
  patternType: "pattern: solid, printed, woven, jacquard, embroidered, striped, plaid, or similar",
  edgeFinish: "edge: fringed, hemmed, raw, rolled, tasselled, or similar",
  constructionStyle: "construction: woven, knit, printed, hand-dyed, or similar",
  materialFinish: "fabric: silk, cashmere, wool, cotton, linen, polyester, or similar",
  materialColour: "primary colour name",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS ONLY. If no metal hardware, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "logo position if visible",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: features clearly ABSENT (e.g., fringe, tassels, embroidery)",
  additionalNotes: "anything notable, or empty string",
};

export const SMALL_ACCESSORY_EXTRACTION_SCHEMA = {
  family: '"small_accessories" (literal)',
  accessoryType: "type: wallet, card-holder, key-ring, phone-case, pouch, coin-purse, passport-holder, or similar",
  openingType: "opening: fold, zip, snap, slip, button, magnetic, or similar",
  cardSlots: "number of card slots visible, or 0 if not applicable",
  compartmentCount: "number of compartments visible, or 0 if unclear",
  constructionStyle: "construction: stitched, bonded, moulded, woven, or similar",
  materialFinish: "surface: smooth, pebbled, saffiano, canvas, nylon, or similar",
  materialColour: "primary colour name",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS ONLY (zippers, clasps, studs). If no metal hardware, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "logo position if visible",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: features clearly ABSENT",
  additionalNotes: "anything notable, or empty string",
};

export const FULL_LOOK_EXTRACTION_SCHEMA = {
  family: '"full_look" (literal)',
  primaryPiece: "the hero garment or accessory in the look",
  layeringCount: "number of visible layers or pieces in the outfit",
  colourPalette: "dominant colour scheme: monochrome, tonal, contrast, neutral, or describe",
  styleDirection: "style: casual, formal, streetwear, editorial, athleisure, minimalist, or similar",
  constructionStyle: "overall construction quality: tailored, casual, mixed, or similar",
  materialFinish: "dominant fabric finish across the look",
  materialColour: "primary colour of the hero piece",
  hardwareFinish: "colour of FUNCTIONAL METAL PARTS across the look. If no metal hardware, use 'none'. One of: gold, silver, gunmetal, rose-gold, brass, matte-black, none",
  logoPlacement: "primary logo position if visible",
  logoScale: "one of: subtle, medium, prominent, none",
  logoStyle: "one of: foil, embossed, engraved, metal-plate, printed, none",
  forbiddenElements: "string array: styling elements clearly ABSENT from the look",
  additionalNotes: "anything notable, or empty string",
};

export function getExtractionSchema(family: ProductFamily): Record<string, string> | null {
  switch (family) {
    case "bags": return BAG_EXTRACTION_SCHEMA;
    case "watches": return WATCH_EXTRACTION_SCHEMA;
    case "belts": return BELT_EXTRACTION_SCHEMA;
    case "jewelry": return JEWELRY_EXTRACTION_SCHEMA;
    case "eyewear": return EYEWEAR_EXTRACTION_SCHEMA;
    case "apparel": return APPAREL_EXTRACTION_SCHEMA;
    case "footwear": return FOOTWEAR_EXTRACTION_SCHEMA;
    case "headwear": return HEADWEAR_EXTRACTION_SCHEMA;
    case "scarves": return SCARF_EXTRACTION_SCHEMA;
    case "small_accessories": return SMALL_ACCESSORY_EXTRACTION_SCHEMA;
    case "full_look": return FULL_LOOK_EXTRACTION_SCHEMA;
    default: return null;
  }
}

// ── Enum coercion maps ──

const HARDWARE_FINISH_MAP: Record<string, string> = {
  "gold": "gold", "gold-tone": "gold", "golden": "gold", "yellow gold": "gold", "light gold": "gold",
  "silver": "silver", "silver-tone": "silver", "chrome": "silver", "stainless": "silver", "steel": "silver",
  "gunmetal": "gunmetal", "dark silver": "gunmetal", "anthracite": "gunmetal", "pewter": "gunmetal",
  "rose-gold": "rose-gold", "rose gold": "rose-gold", "pink gold": "rose-gold",
  "brass": "brass", "antique brass": "brass", "aged brass": "brass",
  "matte-black": "matte-black", "matte black": "matte-black", "black": "matte-black", "blackened": "matte-black",
  "none": "none", "n/a": "none", "": "none",
};

const LOGO_SCALE_MAP: Record<string, string> = {
  "subtle": "subtle", "small": "subtle", "discreet": "subtle", "minimal": "subtle",
  "medium": "medium", "moderate": "medium", "standard": "medium",
  "prominent": "prominent", "large": "prominent", "bold": "prominent", "big": "prominent",
  "none": "none", "n/a": "none", "": "none", "not visible": "none", "no logo": "none",
};

const LOGO_STYLE_MAP: Record<string, string> = {
  "foil": "foil", "hot-stamped": "foil", "gold foil": "foil", "stamped": "foil",
  "embossed": "embossed", "debossed": "embossed", "raised": "embossed", "blind embossed": "embossed",
  "engraved": "engraved", "etched": "engraved", "laser engraved": "engraved",
  "metal-plate": "metal-plate", "metal plate": "metal-plate", "plaque": "metal-plate",
  "printed": "printed", "screen-printed": "printed", "digital": "printed",
  "none": "none", "n/a": "none", "": "none", "not visible": "none",
};

const CLOSURE_TYPE_MAP: Record<string, string> = {
  "open-top": "open-top", "open top": "open-top", "open": "open-top", "no closure": "open-top",
  "zipper": "zipper", "zip": "zipper", "zipped": "zipper",
  "flap": "flap", "flap closure": "flap", "turnlock": "flap",
  "magnetic": "magnetic", "magnetic snap": "magnetic", "mag snap": "magnetic",
  "drawstring": "drawstring", "cinch": "drawstring",
  "buckle": "buckle", "buckle closure": "buckle",
};

const BEZEL_TYPE_MAP: Record<string, string> = {
  "fixed-smooth": "fixed-smooth", "fixed": "fixed-smooth", "smooth": "fixed-smooth",
  "rotating": "rotating", "dive bezel": "rotating", "unidirectional": "rotating",
  "fluted": "fluted",
  "none": "none", "n/a": "none", "": "none",
};

function coerceEnum(value: string | undefined, map: Record<string, string>, fallback: string): string {
  if (!value) return fallback;
  const normalised = value.trim().toLowerCase();
  if (map[normalised]) return map[normalised];
  // Fuzzy: check if any key is contained in the value
  for (const [key, mapped] of Object.entries(map)) {
    if (key && normalised.includes(key)) return mapped;
  }
  return fallback;
}

// ── Forbidden elements cleanup ──

function normaliseForbiddenElements(elements: unknown): string[] {
  if (!Array.isArray(elements)) return [];
  return elements
    .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
    .map((e) => e.trim().toLowerCase().replace(/^no\s+/, "")) // "no crossbody strap" -> "crossbody strap"
    .filter((e, i, arr) => arr.indexOf(e) === i); // deduplicate
}

// ── Normaliser: raw model JSON -> typed ProductFingerprint ──

export interface NormalisedExtractionResult {
  fingerprint: ProductFingerprint;
  confidence: "high" | "medium" | "low";
  notes: string[];
}

export function normaliseExtractedFingerprint(
  family: ProductFamily,
  raw: Record<string, unknown>,
): NormalisedExtractionResult {
  const notes: string[] = [];
  const rawNotes = Array.isArray(raw._notes) ? raw._notes.filter((n): n is string => typeof n === "string") : [];
  notes.push(...rawNotes);

  // Model confidence
  const rawConfidence = typeof raw._confidence === "string" ? raw._confidence.toLowerCase() : "";
  let confidence: "high" | "medium" | "low" = "medium";
  if (rawConfidence.includes("high")) confidence = "high";
  else if (rawConfidence.includes("low")) confidence = "low";

  // Shared base fields
  const base = {
    materialFinish: str(raw.materialFinish, ""),
    materialColour: str(raw.materialColour, ""),
    hardwareFinish: coerceEnum(str(raw.hardwareFinish, ""), HARDWARE_FINISH_MAP, "none") as ProductFingerprint["hardwareFinish"],
    logoPlacement: str(raw.logoPlacement, ""),
    logoScale: coerceEnum(str(raw.logoScale, ""), LOGO_SCALE_MAP, "none") as ProductFingerprint["logoScale"],
    logoStyle: coerceEnum(str(raw.logoStyle, ""), LOGO_STYLE_MAP, "none") as ProductFingerprint["logoStyle"],
    forbiddenElements: normaliseForbiddenElements(raw.forbiddenElements),
    additionalNotes: str(raw.additionalNotes, ""),
  };

  let fingerprint: ProductFingerprint;
  let filledCount = 0;
  let totalFields = 0;

  switch (family) {
    case "bags": {
      const fp: BagFingerprint = {
        ...base,
        family: "bags",
        silhouettePrimary: str(raw.silhouettePrimary, ""),
        silhouetteShape: str(raw.silhouetteShape, ""),
        handleCount: num(raw.handleCount, 0),
        handleType: str(raw.handleType, ""),
        handleAttachment: str(raw.handleAttachment, ""),
        strapPresent: bool(raw.strapPresent, false),
        strapType: bool(raw.strapPresent, false) ? str(raw.strapType, "") : undefined,
        closureType: coerceEnum(str(raw.closureType, ""), CLOSURE_TYPE_MAP, "open-top"),
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 15;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "watches": {
      const fp: WatchFingerprint = {
        ...base,
        family: "watches",
        caseShape: str(raw.caseShape, ""),
        caseSize: str(raw.caseSize, ""),
        dialColour: str(raw.dialColour, ""),
        dialType: str(raw.dialType, ""),
        bezelType: coerceEnum(str(raw.bezelType, ""), BEZEL_TYPE_MAP, "none"),
        strapType: str(raw.strapType, ""),
        strapColour: str(raw.strapColour, ""),
        crownPosition: str(raw.crownPosition, ""),
        complicationCount: num(raw.complicationCount, 0),
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 18;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "belts": {
      const fp: BeltFingerprint = {
        ...base,
        family: "belts",
        beltWidth: str(raw.beltWidth, ""),
        buckleType: str(raw.buckleType, ""),
        buckleShape: str(raw.buckleShape, ""),
        tipStyle: str(raw.tipStyle, ""),
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 13;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "jewelry": {
      const fp: JewelryFingerprint = {
        ...base,
        family: "jewelry",
        jewelryType: str(raw.jewelryType, ""),
        pairSymmetry: bool(raw.pairSymmetry, false),
        dropLength: str(raw.dropLength, undefined),
        chainType: str(raw.chainType, undefined),
        settingType: str(raw.settingType, undefined),
        stonePresent: bool(raw.stonePresent, false),
        stoneType: bool(raw.stonePresent, false) ? str(raw.stoneType, "") : undefined,
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 15;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "eyewear": {
      const fp: EyewearFingerprint = {
        ...base,
        family: "eyewear",
        eyewearType: str(raw.eyewearType, ""),
        frameShape: str(raw.frameShape, ""),
        frameMaterial: str(raw.frameMaterial, ""),
        lensType: str(raw.lensType, ""),
        lensColour: str(raw.lensColour, ""),
        templeStyle: str(raw.templeStyle, ""),
        bridgeType: str(raw.bridgeType, ""),
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 16;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "apparel": {
      const fp: ApparelFingerprint = {
        ...base,
        family: "apparel",
        apparelType: str(raw.apparelType, ""),
        fitType: str(raw.fitType, ""),
        neckline: str(raw.neckline, ""),
        sleeveLength: str(raw.sleeveLength, ""),
        hemLength: str(raw.hemLength, ""),
        closureType: str(raw.closureType, ""),
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 15;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "footwear": {
      const fp: FootwearFingerprint = {
        ...base,
        family: "footwear",
        footwearType: str(raw.footwearType, ""),
        heelHeight: str(raw.heelHeight, ""),
        toeShape: str(raw.toeShape, ""),
        soleType: str(raw.soleType, ""),
        closureType: str(raw.closureType, ""),
        ankleHeight: str(raw.ankleHeight, ""),
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 15;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "headwear": {
      const fp: HeadwearFingerprint = {
        ...base,
        family: "headwear",
        headwearType: str(raw.headwearType, ""),
        crownShape: str(raw.crownShape, ""),
        brimStyle: str(raw.brimStyle, ""),
        closureType: str(raw.closureType, ""),
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 13;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "scarves": {
      const fp: ScarfFingerprint = {
        ...base,
        family: "scarves",
        scarfType: str(raw.scarfType, ""),
        dimensions: str(raw.dimensions, ""),
        fabricWeight: str(raw.fabricWeight, ""),
        patternType: str(raw.patternType, ""),
        edgeFinish: str(raw.edgeFinish, ""),
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 14;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "small_accessories": {
      const fp: SmallAccessoryFingerprint = {
        ...base,
        family: "small_accessories",
        accessoryType: str(raw.accessoryType, ""),
        openingType: str(raw.openingType, ""),
        cardSlots: num(raw.cardSlots, 0) || undefined,
        compartmentCount: num(raw.compartmentCount, 0) || undefined,
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 13;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    case "full_look": {
      const fp: FullLookFingerprint = {
        ...base,
        family: "full_look",
        primaryPiece: str(raw.primaryPiece, ""),
        layeringCount: num(raw.layeringCount, 1),
        colourPalette: str(raw.colourPalette, ""),
        styleDirection: str(raw.styleDirection, ""),
        constructionStyle: str(raw.constructionStyle, ""),
      };
      fingerprint = fp;
      totalFields = 13;
      filledCount = countFilled(fp, ["family"]);
      break;
    }
    default:
      throw new Error(`Unsupported fingerprint family: ${family}`);
  }

  // Adjust confidence based on fill rate
  const fillRate = filledCount / totalFields;
  if (fillRate < 0.5 && confidence !== "low") {
    confidence = "low";
    notes.push(`Only ${Math.round(fillRate * 100)}% of fields detected. Review carefully.`);
  } else if (fillRate < 0.8 && confidence === "high") {
    confidence = "medium";
  }

  return { fingerprint, confidence, notes };
}

// ── Helpers ──

function str(v: unknown, fallback: string): string;
function str(v: unknown, fallback: undefined): string | undefined;
function str(v: unknown, fallback: string | undefined): string | undefined {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = parseInt(v, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v.toLowerCase() === "true" || v.toLowerCase() === "yes") return true;
    if (v.toLowerCase() === "false" || v.toLowerCase() === "no") return false;
  }
  return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countFilled(obj: any, skip: string[]): number {
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (skip.includes(key)) continue;
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    count++;
  }
  return count;
}

// ── System prompt builder for the vision extractor ──

export function buildExtractionPrompt(family: ProductFamily, specificItem?: string): string {
  const schema = getExtractionSchema(family);
  if (!schema) {
    return `Describe this ${family} product in detail. Focus on material, colour, construction, and distinctive features.`;
  }

  const schemaText = Object.entries(schema)
    .map(([key, desc]) => `  "${key}": ${desc}`)
    .join("\n");

  return `You are a product photography analyst for a luxury fashion AI lookbook tool.
Your job is to extract precise, structured attributes from a product reference image.
These attributes guide AI image generation, so accuracy is critical: wrong attributes lead to wrong photos.

Extract the product fingerprint for this ${family}${specificItem ? ` (${specificItem})` : ""}.

Return a JSON object with EXACTLY these fields:
{
${schemaText}
}

Also include these metadata fields:
  "_confidence": "high" | "medium" | "low" (how confident you are in the extraction)
  "_notes": string[] (any caveats, e.g. "logo not clearly visible", "closure type uncertain")

Rules:
- Use descriptive but concise values. "smooth cognac leather" not "the material appears to be a smooth type of leather in a dark cognac colour."
- For enum fields, pick the closest match from the allowed values.
- CRITICAL: hardwareFinish refers to CLEARLY VISIBLE, EXPOSED FUNCTIONAL METAL PARTS (buckles, clasps, zippers, d-rings, feet), NOT the logo. A gold foil logo does NOT mean gold hardware. Leather-covered studs or hidden hardware = "none". Only report a colour if bare metal is unmistakably visible. When in doubt, use "none".
- For forbiddenElements, list structural AND behavioral features ABSENT from the product that an AI generator might incorrectly add. Include pockets, belt, hood, collar, lapels, structured seams, and similar. Focus on features that template poses might imply but this product does not have.
- If you cannot determine a field, use an empty string for text fields or the most neutral default for enum fields, and add a note.
- If the image does not appear to show a ${family} product, add a note flagging this.
- Return ONLY valid JSON. No markdown fences, no explanation outside the JSON.`;
}
