// Shared customer interests list, served by outsyde-backend
// (GET /api/taxonomy/customer-interests, source: outsyde-backend shared/customerInterests.ts).
// Industries come from the shared business list, so customers can be matched to businesses.
// Codes are stored by the backend and never change; labels may.

export interface InterestSpecialty {
  code: string;
  label: string;
  kind: "service" | "product";
}

export interface InterestValue {
  id: string;
  label: string;
}

export interface InterestCategory {
  code: string;
  label: string;
  specialties: InterestSpecialty[];
  values: InterestValue[];
}

export interface CustomerInterestTaxonomy {
  version: number;
  otherMax: number;
  categories: InterestCategory[];
}

export interface InterestAnswers {
  selectedIndustries: string[];
  industryNiches: Record<string, string[]>;
  industryValues: Record<string, string[]>;
  interestOther: string;
}

export const EMPTY_INTERESTS: InterestAnswers = { selectedIndustries: [], industryNiches: {}, industryValues: {}, interestOther: "" };

export function isCustomerInterestTaxonomy(v: unknown): v is CustomerInterestTaxonomy {
  const t = v as CustomerInterestTaxonomy;
  return !!t && Array.isArray(t.categories) && typeof t.otherMax === "number" &&
    t.categories.every((c) => typeof c.code === "string" && Array.isArray(c.specialties) && Array.isArray(c.values));
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Adds or removes an industry. Removing it also clears its picks. */
export function toggleIndustry(a: InterestAnswers, code: string): InterestAnswers {
  if (a.selectedIndustries.includes(code)) {
    const niches = { ...a.industryNiches };
    const values = { ...a.industryValues };
    delete niches[code];
    delete values[code];
    return { ...a, selectedIndustries: a.selectedIndustries.filter((c) => c !== code), industryNiches: niches, industryValues: values,
      interestOther: code === "other" ? "" : a.interestOther };
  }
  return { ...a, selectedIndustries: [...a.selectedIndustries, code] };
}

export function togglePick(a: InterestAnswers, field: "industryNiches" | "industryValues", industry: string, item: string): InterestAnswers {
  const next = toggle(a[field][industry] ?? [], item);
  const map = { ...a[field] };
  if (next.length) map[industry] = next; else delete map[industry];
  return { ...a, [field]: map };
}

/** What gets sent to the backend (only picked industries; Other text only when Other is picked). */
export function interestsPayload(a: InterestAnswers) {
  const keep = (m: Record<string, string[]>) =>
    Object.fromEntries(Object.entries(m).filter(([k, v]) => a.selectedIndustries.includes(k) && v.length));
  return {
    selectedIndustries: a.selectedIndustries,
    industryNiches: keep(a.industryNiches),
    industryValues: keep(a.industryValues),
    interestOther: a.selectedIndustries.includes("other") ? a.interestOther.trim() || undefined : undefined,
  };
}
