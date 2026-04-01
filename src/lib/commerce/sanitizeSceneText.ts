/**
 * Scene Text Sanitization
 *
 * Standalone module for sanitizing vision-extracted text fields
 * before interpolation into commerce prompts. Prevents template
 * garment/model language from leaking into compiled prompts.
 *
 * Primary function: sanitizeBackgroundDetail() strips garment and
 * model descriptors from backgroundDetail strings, keeping only
 * scene/environment language.
 */

import type { BackgroundClass } from "./referenceLibrary.types";

// ── Garment Keywords ──

const GARMENT_TERMS = [
  "dress", "dresses", "gown", "blazer", "jacket", "coat", "shirt",
  "blouse", "top", "skirt", "trouser", "trousers", "pants", "jeans",
  "shorts", "jumpsuit", "romper", "cardigan", "sweater", "hoodie",
  "vest", "waistcoat", "suit", "tuxedo", "cape", "poncho", "kimono",
  "tunic", "bodysuit", "leotard", "corset", "bra", "lingerie",
  "swimsuit", "bikini", "garment", "outfit", "clothing", "apparel",
  "knitwear", "outerwear", "tailoring",
];

// ── Material Keywords ──

const MATERIAL_TERMS = [
  "silk", "satin", "cotton", "linen", "wool", "cashmere", "polyester",
  "nylon", "rayon", "viscose", "chiffon", "organza", "tulle", "lace",
  "denim", "leather", "suede", "velvet", "corduroy", "tweed", "jersey",
  "crepe", "georgette", "taffeta", "brocade", "jacquard", "mesh",
  "sequin", "sequined", "beaded", "embroidered", "knit", "knitted",
  "woven", "ribbed", "pleated", "quilted",
];

// ── Model / Person Keywords ──

const MODEL_TERMS = [
  "woman", "women", "man", "men", "model", "person", "figure",
  "wearing", "dressed", "dressed in", "clad", "styled", "modeling",
  "modelling", "posing", "standing", "seated", "walking",
];

// ── Colour-as-Garment Patterns ──
// Match colour terms that modify garment/material terms.
// "black silk dress" should be caught, but "white backdrop" should not.

const COLOUR_GARMENT_PATTERN = new RegExp(
  `(?:black|white|navy|red|blue|green|grey|gray|beige|cream|ivory|tan|brown|pink|purple|burgundy|maroon|olive|charcoal|camel|nude|blush|coral|teal|emerald|gold|silver|mustard|rust|sage|lavender|mauve|mint|peach|plum|wine|khaki|cobalt|cerulean|magenta|fuchsia|amber|copper|bronze|champagne|taupe|oatmeal|slate|stone|sand|terracotta|indigo|saffron|scarlet|midnight|forest|ocean|rose|lilac|periwinkle|turquoise)\\s+(?:${[...GARMENT_TERMS, ...MATERIAL_TERMS].join("|")})`,
  "i",
);

// ── Combined Keyword Set (for clause-level matching) ──

const ALL_BLOCKED_TERMS = [...GARMENT_TERMS, ...MATERIAL_TERMS, ...MODEL_TERMS];

function clauseContainsBlockedTerm(clause: string): boolean {
  const lower = clause.toLowerCase();

  // Check colour + garment/material compound
  if (COLOUR_GARMENT_PATTERN.test(lower)) return true;

  // Check individual blocked terms as whole words
  for (const term of ALL_BLOCKED_TERMS) {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
    if (regex.test(lower)) return true;
  }

  return false;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Public API ──

/**
 * Sanitize a backgroundDetail string by removing clauses that
 * contain garment, material, or model descriptors.
 *
 * If the result is empty after sanitization, falls back to the
 * backgroundType enum value.
 *
 * @param detail - Raw backgroundDetail from vision extraction
 * @param backgroundType - Fallback backgroundType enum value
 * @returns Sanitized string safe for prompt interpolation
 */
export function sanitizeBackgroundDetail(
  detail: string,
  backgroundType: BackgroundClass,
): string {
  if (!detail || !detail.trim()) {
    return backgroundType;
  }

  // Split into clauses by comma or period
  const clauses = detail.split(/[,.]/).map((c) => c.trim()).filter(Boolean);

  const kept = clauses.filter((clause) => !clauseContainsBlockedTerm(clause));

  const result = kept.join(", ").trim();

  if (!result) {
    return backgroundType;
  }

  return result;
}
