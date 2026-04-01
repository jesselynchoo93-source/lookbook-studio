/**
 * Catalog Loader
 *
 * Reads and filters the commerce reference catalog.
 * The catalog lives at public/commerce-refs/catalog.json
 * and contains all CatalogReferenceImage entries.
 */

import type { ProductFamily, GenderPresentation } from "@/lib/lookbook/types";
import type {
  CatalogReferenceImage,
  TemplateFamilyDefinition,
} from "./referenceLibrary.types";

let catalogCache: CatalogReferenceImage[] | null = null;
let familiesCache: TemplateFamilyDefinition[] | null = null;

export async function loadCatalog(): Promise<CatalogReferenceImage[]> {
  if (catalogCache) return catalogCache;

  const res = await fetch("/commerce-refs/catalog.json");
  if (!res.ok) {
    console.warn("Commerce catalog not found or failed to load.");
    return [];
  }

  const data: CatalogReferenceImage[] = await res.json();
  catalogCache = data;
  return data;
}

export async function loadFamilies(): Promise<TemplateFamilyDefinition[]> {
  if (familiesCache) return familiesCache;

  const res = await fetch("/commerce-refs/families.json");
  if (!res.ok) {
    console.warn("Commerce families not found or failed to load.");
    return [];
  }

  const data: TemplateFamilyDefinition[] = await res.json();
  familiesCache = data;
  return data;
}

export function getImagesByFamily(
  catalog: CatalogReferenceImage[],
  familyId: string,
): CatalogReferenceImage[] {
  return catalog.filter((img) => img.familyId === familyId);
}

export function filterCatalogEntries(
  catalog: CatalogReferenceImage[],
  productFamily: ProductFamily,
  genderPresentation: GenderPresentation,
): CatalogReferenceImage[] {
  return catalog.filter(
    (img) =>
      img.productFamily === productFamily &&
      img.genderPresentation === genderPresentation,
  );
}

export function invalidateCatalogCache(): void {
  catalogCache = null;
  familiesCache = null;
}
