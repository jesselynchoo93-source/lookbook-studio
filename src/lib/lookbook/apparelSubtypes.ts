/**
 * Apparel Subtype Inference and Subtype-Specific Product Locks.
 *
 * Separated from providerCompiler so subtype knowledge is reusable
 * across evidence planning, shot delta, and prompt compilation.
 */

import type { LookbookInput } from "./types";

// ── Apparel Subtypes ──

export type ApparelSubtype =
  | "dress"
  | "blazer"
  | "trousers"
  | "knitwear"
  | "coat"
  | "shirt"
  | "skirt"
  | "top"
  | "unknown";

/**
 * Derive the apparel subtype from the specific item string.
 *
 * Rule-based initial implementation. When vision structural hints
 * are available (from classify-product API), they should refine this.
 */
export function deriveApparelSubtype(input: LookbookInput): ApparelSubtype {
  if (input.productFamily !== "apparel") return "unknown";

  const item = (input.specificItem || "").toLowerCase();

  if (item.includes("dress") || item.includes("gown") || item.includes("slip")) return "dress";
  if (item.includes("blazer") || item.includes("sport coat")) return "blazer";
  if (
    item.includes("trouser") ||
    item.includes("pant") ||
    item.includes("chino") ||
    item.includes("jean")
  )
    return "trousers";
  if (
    item.includes("knit") ||
    item.includes("sweater") ||
    item.includes("jumper") ||
    item.includes("cardigan") ||
    item.includes("pullover")
  )
    return "knitwear";
  if (
    item.includes("coat") ||
    item.includes("jacket") ||
    item.includes("parka") ||
    item.includes("bomber")
  )
    return "coat";
  if (item.includes("shirt") || item.includes("blouse")) return "shirt";
  if (item.includes("skirt")) return "skirt";
  if (
    item.includes("top") ||
    item.includes("tank") ||
    item.includes("tee") ||
    item.includes("t-shirt") ||
    item.includes("cami")
  )
    return "top";

  return "unknown";
}

// ── Subtype-Specific Product Lock Prose ──
// Each subtype gets garment-native lock vocabulary that tells the generator
// exactly which structural features to preserve from the reference.

export const APPAREL_SUBTYPE_LOCK: Record<ApparelSubtype, string> = {
  dress:
    "Use the uploaded product reference exactly for neckline shape, strap placement and width, " +
    "waist and hip line, hem length, back configuration, and fabric fall/sheen/bias behaviour.",
  blazer:
    "Use the uploaded product reference exactly for lapel shape, shoulder line, button stance and count, " +
    "pocket placement, sleeve length, cuff treatment, hem length, and vent structure.",
  trousers:
    "Use the uploaded product reference exactly for waistband/rise, pleat count, pocket line, " +
    "leg silhouette, hem width, inseam break, and drape through thigh and calf.",
  knitwear:
    "Use the uploaded product reference exactly for neckline, shoulder line, cuff finish, hem finish, " +
    "rib placement, knit texture/gauge, and body fit.",
  coat:
    "Use the uploaded product reference exactly for lapel/collar shape, closure line, shoulder width, " +
    "sleeve volume, pocket placement, hem length, vent structure, and fabric weight.",
  shirt:
    "Use the uploaded product reference exactly for collar shape, button count and spacing, cuff style, " +
    "placket width, and hem shape.",
  skirt:
    "Use the uploaded product reference exactly for waistband, pleat/gather detail, hem length, " +
    "silhouette shape, and fabric drape.",
  top:
    "Use the uploaded product reference exactly for neckline, sleeve/strap style, hem length, " +
    "and fabric texture.",
  unknown:
    "Use the uploaded product reference exactly for silhouette shape, neckline/opening, " +
    "sleeve/strap configuration, closure and edge details, hem length, and fabric behaviour.",
};
