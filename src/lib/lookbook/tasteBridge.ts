/**
 * Taste Bridge: Derivation layer between product attributes and aesthetic direction.
 *
 * Three pure derivation functions:
 *   1. deriveProductSensibility  -- what kind of product is this?
 *   2. deriveTasteBridge         -- what aesthetic character should the set have?
 *   3. deriveSecondaryObjectPolicy -- should competing objects appear?
 *
 * Priority cascade for sensibility:
 *   material/construction > subtype/item > family > style (last resort)
 */
import type {
  LookbookInput,
  ProductSensibility,
  TasteBridge,
  WorldTone,
  LightAttitude,
  EmotionalRegister,
  SurfaceTone,
  SecondaryObjectPolicy,
  TargetStyle,
  PrimaryObjective,
  ProductFamily,
} from "./types";
import { deriveApparelSubtype } from "./apparelSubtypes";

// ── 1. Product Sensibility ──

/** Material keywords that signal sensibility (checked first, strongest signal) */
const FLUID_MATERIALS = ["silk", "satin", "chiffon", "bias", "organza", "crepe", "charmeuse", "tulle", "georgette", "flowing"];
const STRUCTURED_CONSTRUCTION = ["tailored", "structured", "canvassed", "lined", "darted", "pressed"];
const RELAXED_CONSTRUCTION = ["relaxed", "oversized", "knit", "jersey", "fleece", "terry", "loopback"];
const TECH_MATERIALS = ["tech", "performance", "neoprene", "gore-tex", "ripstop", "cordura", "mesh"];

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function sensibilityFromMaterial(fingerprint: LookbookInput["productFingerprint"]): ProductSensibility | null {
  if (!fingerprint) return null;

  const material = fingerprint.materialFinish?.toLowerCase() || "";
  // Apparel-specific fields
  const construction = "constructionStyle" in fingerprint
    ? (fingerprint as { constructionStyle?: string }).constructionStyle?.toLowerCase() || ""
    : "";
  const fit = "fitType" in fingerprint
    ? (fingerprint as { fitType?: string }).fitType?.toLowerCase() || ""
    : "";

  const combined = `${material} ${construction} ${fit}`;

  if (matchesAny(combined, FLUID_MATERIALS)) return "fluid_sensual";
  if (matchesAny(combined, STRUCTURED_CONSTRUCTION)) return "structured_tailored";
  if (matchesAny(combined, RELAXED_CONSTRUCTION)) return "soft_casual";
  if (matchesAny(combined, TECH_MATERIALS)) return "technical_sport";

  return null;
}

function sensibilityFromSubtype(input: LookbookInput): ProductSensibility | null {
  if (input.productFamily === "apparel") {
    const subtype = deriveApparelSubtype(input);
    switch (subtype) {
      case "dress": return "fluid_sensual";
      case "blazer": return "structured_tailored";
      case "trousers": return "structured_tailored";
      case "coat": return "structured_tailored";
      case "knitwear": return "soft_casual";
      case "shirt": return "structured_tailored";
      case "skirt": return "fluid_sensual";
      case "top": return "soft_casual";
      default: break;
    }
  }

  // Non-apparel item keywords
  const item = (input.specificItem || "").toLowerCase();
  if (item.includes("slip") || item.includes("gown")) return "fluid_sensual";
  if (item.includes("sneaker") || item.includes("sport")) return "technical_sport";
  if (item.includes("diamond") || item.includes("gemstone") || item.includes("crystal")) return "ornamental_decorative";

  return null;
}

function sensibilityFromFamily(family: ProductFamily): ProductSensibility | null {
  switch (family) {
    case "jewelry": return "ornamental_decorative";
    case "eyewear": return "minimal_refined";
    case "watches": return "minimal_refined";
    case "belts": return "minimal_refined";
    case "scarves": return "soft_casual";
    case "small_accessories": return "minimal_refined";
    case "footwear": return "minimal_refined";
    case "headwear": return "soft_casual";
    case "full_look": return null; // depends on items, fall through to style
    default: return null;
  }
}

const STYLE_FALLBACK: Partial<Record<TargetStyle, ProductSensibility>> = {
  luxury: "minimal_refined",
  street: "soft_casual",
  minimal: "minimal_refined",
  commercial: "minimal_refined",
  resort: "soft_casual",
  tailoring: "structured_tailored",
  contemporary: "minimal_refined",
  avant_garde: "structured_tailored",
  // editorial: no override, let product decide
};

export function deriveProductSensibility(input: LookbookInput): ProductSensibility {
  // Priority 1: material/construction (strongest signal)
  const fromMaterial = sensibilityFromMaterial(input.productFingerprint);
  if (fromMaterial) return fromMaterial;

  // Priority 2: subtype/item
  const fromSubtype = sensibilityFromSubtype(input);
  if (fromSubtype) return fromSubtype;

  // Priority 3: product family
  const fromFamily = sensibilityFromFamily(input.productFamily);
  if (fromFamily) return fromFamily;

  // Priority 4: style (last resort)
  return STYLE_FALLBACK[input.targetStyle] || "minimal_refined";
}

// ── 2. Taste Bridge ──

interface TasteDefaults {
  worldTone: WorldTone;
  lightAttitude: LightAttitude;
  emotionalRegister: EmotionalRegister;
  surfaceTone: SurfaceTone;
}

const SENSIBILITY_TASTE_DEFAULTS: Record<ProductSensibility, TasteDefaults> = {
  fluid_sensual:       { worldTone: "soft",      lightAttitude: "skin_friendly", emotionalRegister: "sensual",   surfaceTone: "tactile" },
  structured_tailored: { worldTone: "sharp",     lightAttitude: "sculptural",    emotionalRegister: "confident", surfaceTone: "hard" },
  soft_casual:         { worldTone: "airy",      lightAttitude: "neutral",       emotionalRegister: "quiet",     surfaceTone: "soft" },
  technical_sport:     { worldTone: "urban_raw",  lightAttitude: "graphic",       emotionalRegister: "sharp",     surfaceTone: "hard" },
  ornamental_decorative: { worldTone: "intimate", lightAttitude: "skin_friendly", emotionalRegister: "quiet",     surfaceTone: "polished" },
  minimal_refined:     { worldTone: "soft",      lightAttitude: "neutral",       emotionalRegister: "quiet",     surfaceTone: "polished" },
};

/**
 * Derive the taste bridge from sensibility + objective + style.
 * Objective adjusts intensity. Sensibility determines character.
 * Each override shifts at most one dimension by one step.
 */
export function deriveTasteBridge(
  sensibility: ProductSensibility,
  objective: PrimaryObjective,
  style: TargetStyle,
): TasteBridge {
  const base = { ...SENSIBILITY_TASTE_DEFAULTS[sensibility] };

  // Objective overrides (intensity, not character)
  switch (objective) {
    case "editorial_story":
      // Intensify the sensibility's natural register
      if (sensibility === "fluid_sensual") base.emotionalRegister = "sensual";
      else if (sensibility === "structured_tailored") base.emotionalRegister = "confident";
      else if (sensibility === "technical_sport") base.emotionalRegister = "sharp";
      // For quiet sensibilities, nudge slightly toward more presence
      else if (base.emotionalRegister === "quiet") base.emotionalRegister = "confident";
      break;

    case "sell_clearly":
      // Reduce world intensity by one step, but keep tonal family
      base.worldTone = quieterWorldTone(base.worldTone);
      break;

    case "craftsmanship":
      // Reveal construction through sculptural light
      base.lightAttitude = "sculptural";
      break;
  }

  // Style override (bounded, only surfaceTone)
  if (style === "luxury" && base.surfaceTone !== "tactile") {
    base.surfaceTone = "polished";
  }

  return base;
}

/** Shift a world tone one step quieter while keeping its tonal family */
function quieterWorldTone(tone: WorldTone): WorldTone {
  switch (tone) {
    case "monumental": return "sharp";
    case "urban_raw": return "airy";
    case "sharp": return "soft";
    // Already quiet
    case "soft": return "soft";
    case "intimate": return "intimate";
    case "airy": return "airy";
  }
}

// ── 3. Secondary Object Policy ──

export function deriveSecondaryObjectPolicy(input: LookbookInput): SecondaryObjectPolicy {
  // Full look family allows full styling
  if (input.productFamily === "full_look") return "allow_full_styling";

  // Editorial with styling emphasis allows supporting objects
  if (input.primaryObjective === "editorial_story" && input.secondaryEmphasis === "styling") {
    return "allow_supporting_only";
  }

  // Everything else: hero product only
  return "forbid";
}
