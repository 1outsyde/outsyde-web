// Shared photographer specialty list and signup answer choices, served by outsyde-backend
// (GET /api/taxonomy/photographer, source: outsyde-backend shared/photographerTaxonomy.ts,
// approved by Legend 2026-10-18). The app and this site both load it so every photographer
// signup asks the same questions. Specialty codes are stored and never change; labels may.

export interface PhotographerSpecialty {
  code: string;
  label: string;
}

export interface PhotographerOption {
  value: string;
  label: string;
}

export interface PhotographerTaxonomy {
  version: number;
  maxSpecialties: number;
  otherMax: number;
  specialties: PhotographerSpecialty[];
  options: Record<string, PhotographerOption[]>;
}

export const PHOTO_OTHER_CODE = "photo.other";

export function isPhotographerTaxonomy(v: unknown): v is PhotographerTaxonomy {
  const t = v as PhotographerTaxonomy;
  return !!t && Array.isArray(t.specialties) && typeof t.maxSpecialties === "number" && !!t.options && typeof t.options === "object";
}
