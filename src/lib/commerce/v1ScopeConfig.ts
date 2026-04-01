/**
 * V1 Scope Configuration
 *
 * Single source of truth for what the V1 commerce engine supports.
 * The template family picker, selector, and sourcing workflow all
 * reference this file. Deferred types exist in the schema but are
 * hidden from V1 UI selection.
 *
 * To expand scope for V1.5/V2, update these constants.
 * No schema migration needed.
 */

import type { ProductFamily } from "@/lib/lookbook/types";
import type { BackgroundClass, LightingClass } from "./referenceLibrary.types";

export const V1_ALLOWED_BACKGROUNDS: BackgroundClass[] = [
  "seamless_white",
  "seamless_grey",
  "concrete_minimal",
];

export const V1_ALLOWED_LIGHTING: LightingClass[] = [
  "soft_even",
  "soft_directional",
];

/**
 * V1 focuses on apparel. If reliability is uneven across apparel,
 * narrow further by removing entries (e.g., keep only "apparel").
 */
export const V1_ALLOWED_PRODUCT_FAMILIES: ProductFamily[] = [
  "apparel",
];

export function isV1Background(bg: BackgroundClass): boolean {
  return V1_ALLOWED_BACKGROUNDS.includes(bg);
}

export function isV1Lighting(lg: LightingClass): boolean {
  return V1_ALLOWED_LIGHTING.includes(lg);
}

export function isV1ProductFamily(pf: ProductFamily): boolean {
  return V1_ALLOWED_PRODUCT_FAMILIES.includes(pf);
}
