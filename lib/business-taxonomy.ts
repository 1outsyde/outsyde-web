// Shared business industry list, served by outsyde-backend
// (GET /api/taxonomy/business-categories, source: outsyde-backend shared/businessTaxonomy.ts).
// The app and this site both load it so every signup offers the same choices.
// Codes are stored by the backend and never change; labels may.

export type SpecialtyKind = "service" | "product";

export interface TaxonomySpecialty {
  code: string;
  label: string;
  kind: SpecialtyKind;
}

export interface TaxonomyCategory {
  code: string;
  label: string;
  specialties: TaxonomySpecialty[];
}

export interface BusinessTaxonomy {
  version: number;
  maxSpecialties: number;
  categories: TaxonomyCategory[];
}

export type OfferType = "products" | "services" | "both";

export function isOtherCode(code: string): boolean {
  return code === "other" || code.endsWith(".other");
}

/** Specialties a business can pick for its offer type (services → service, products → product). */
export function specialtiesFor(category: TaxonomyCategory | undefined, offer: OfferType | ""): TaxonomySpecialty[] {
  if (!category || !offer) return [];
  return category.specialties.filter((s) =>
    offer === "both" ? true : offer === "services" ? s.kind === "service" : s.kind === "product",
  );
}

export function isTaxonomy(v: unknown): v is BusinessTaxonomy {
  const t = v as BusinessTaxonomy;
  return !!t && Array.isArray(t.categories) && typeof t.maxSpecialties === "number";
}
