"use client";

// Industry section of the vendor dashboard's Edit Storefront tab (2026-10-17).
// Same choices as /business-signup, from the shared list (GET /api/taxonomy/business-categories).
// The backend (PATCH /api/vendor/my-business, #311) checks every change against the list and
// the business's products/services, and keeps the readable category in step with the code.
// Products/Services/Both is shown read only here (Legend, 2026-10-17).

import { isOtherCode, specialtiesFor, type BusinessTaxonomy, type OfferType, type TaxonomySpecialty } from "@/lib/business-taxonomy";

export const OTHER_DESCRIPTION_MAX = 500;

export interface IndustryValue {
  categoryCode: string;
  specialties: string[];
  otherDescription: string;
}

export function offerTypeOf(hasProducts?: boolean, hasServices?: boolean): OfferType | "" {
  if (hasProducts && hasServices) return "both";
  if (hasProducts) return "products";
  if (hasServices) return "services";
  return "";
}

/** Returns a message to show, or "" when the selection can be saved. */
export function industryProblem(value: IndustryValue, offer: OfferType | ""): string {
  if (!value.categoryCode) return "Choose your industry.";
  if (!offer) return "Your business has no products or services set. Contact Outsyde to update it.";
  if (value.categoryCode !== "other" && value.specialties.length === 0) return "Choose at least one thing you do.";
  const needsDescription = value.categoryCode === "other" || value.specialties.some(isOtherCode);
  if (needsDescription && !value.otherDescription.trim()) return "Tell us what you do when you choose Other.";
  if (value.otherDescription.trim().length > OTHER_DESCRIPTION_MAX) return `Keep the description to ${OTHER_DESCRIPTION_MAX} characters or less.`;
  return "";
}

interface Props {
  taxonomy: BusinessTaxonomy | null;
  taxonomyError: boolean;
  onRetry: () => void;
  offer: OfferType | "";
  value: IndustryValue;
  onChange: (next: IndustryValue) => void;
}

const OFFER_TEXT: Record<OfferType, string> = {
  services: "You offer services.",
  products: "You sell products.",
  both: "You offer services and sell products.",
};

export default function IndustrySection({ taxonomy, taxonomyError, onRetry, offer, value, onChange }: Props) {
  const category = taxonomy?.categories.find((c) => c.code === value.categoryCode);
  const maxSpecialties = taxonomy?.maxSpecialties ?? 3;
  const available = specialtiesFor(category, offer);
  const needsDescription = value.categoryCode === "other" || value.specialties.some(isOtherCode);

  function chooseCategory(code: string) {
    if (code === value.categoryCode) return;
    onChange({ ...value, categoryCode: code, specialties: [] });
  }

  function toggleSpecialty(code: string) {
    const has = value.specialties.includes(code);
    if (!has && value.specialties.length >= maxSpecialties) return;
    onChange({ ...value, specialties: has ? value.specialties.filter((c) => c !== code) : [...value.specialties, code] });
  }

  function chips(list: TaxonomySpecialty[]) {
    return (
      <div className="sf-chips">
        {list.map((sp) => {
          const active = value.specialties.includes(sp.code);
          const full = !active && value.specialties.length >= maxSpecialties;
          return (
            <button
              type="button"
              key={sp.code}
              className={`sf-chip${active ? " active" : ""}`}
              onClick={() => toggleSpecialty(sp.code)}
              disabled={full}
              aria-pressed={active}
            >
              {sp.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="sf-section" id="industry">
      <div className="sf-section-title">Industry</div>
      <p className="sf-help">
        Helps customers who are looking for what you do find you. {offer ? OFFER_TEXT[offer] : ""}
      </p>

      {taxonomyError ? (
        <p className="sf-help">
          We couldn&rsquo;t load the industry list.{" "}
          <button type="button" className="sf-link-btn" onClick={onRetry}>Try again</button>
        </p>
      ) : !taxonomy ? (
        <p className="sf-help">Loading industries&hellip;</p>
      ) : (
        <>
          <div className="sf-field">
            <span className="sf-label" id="sf-industry-label">Your industry</span>
            <div className="sf-chips" role="radiogroup" aria-labelledby="sf-industry-label">
              {taxonomy.categories.map((c) => (
                <button
                  type="button"
                  key={c.code}
                  role="radio"
                  aria-checked={value.categoryCode === c.code}
                  className={`sf-chip${value.categoryCode === c.code ? " active" : ""}`}
                  onClick={() => chooseCategory(c.code)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {category && category.code !== "other" && offer && (
            <div className="sf-field">
              <span className="sf-label">What do you do? (pick up to {maxSpecialties})</span>
              {offer === "both" ? (
                <>
                  <p className="sf-sub-label">Services</p>
                  {chips(available.filter((s) => s.kind === "service"))}
                  <p className="sf-sub-label">Products</p>
                  {chips(available.filter((s) => s.kind === "product"))}
                </>
              ) : (
                chips(available)
              )}
            </div>
          )}

          {needsDescription && (
            <div className="sf-field">
              <label className="sf-label" htmlFor="sf-other">Tell us what you do</label>
              <textarea
                id="sf-other"
                className="sf-textarea"
                value={value.otherDescription}
                onChange={(e) => onChange({ ...value, otherDescription: e.target.value.slice(0, OTHER_DESCRIPTION_MAX) })}
                placeholder="Describe your business in your own words"
                maxLength={OTHER_DESCRIPTION_MAX}
              />
              <span className="sf-help">{value.otherDescription.length}/{OTHER_DESCRIPTION_MAX}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
