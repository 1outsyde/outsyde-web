"use client";

// Customer interests picker (2026-10-18): industries from the shared business list, then for
// each picked industry what they're into (services and products) and what matters most, plus
// a text box for Other. Same list and order as the app. All optional.
// Styling uses the page's own .chips / .chip / label / .input-field classes.

import { useEffect, useState } from "react";
import {
  type CustomerInterestTaxonomy, type InterestAnswers,
  isCustomerInterestTaxonomy, toggleIndustry, togglePick,
} from "@/lib/customer-interests";

export default function InterestsPicker({ value, onChange }: { value: InterestAnswers; onChange: (next: InterestAnswers) => void }) {
  const [taxonomy, setTaxonomy] = useState<CustomerInterestTaxonomy | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/taxonomy/customer-interests")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (isCustomerInterestTaxonomy(data)) setTaxonomy(data);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, []);

  if (failed) {
    return <p className="interests-note">Interests couldn&apos;t load. You can add them later.</p>;
  }
  if (!taxonomy) {
    return <p className="interests-note">Loading interests…</p>;
  }

  const picked = taxonomy.categories.filter((c) => value.selectedIndustries.includes(c.code));

  return (
    <div className="interests" data-testid="interests-picker">
      <div className="field-group">
        <label>What are you into? Pick any</label>
        <div className="chips">
          {taxonomy.categories.map((c) => (
            <button key={c.code} type="button" data-code={c.code}
              className={`chip${value.selectedIndustries.includes(c.code) ? " selected" : ""}`}
              onClick={() => onChange(toggleIndustry(value, c.code))}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {picked.map((c) => {
        const services = c.specialties.filter((s) => s.kind === "service");
        const products = c.specialties.filter((s) => s.kind === "product");
        const niches = value.industryNiches[c.code] ?? [];
        const values = value.industryValues[c.code] ?? [];
        return (
          <div className="interest-block" key={c.code} data-industry={c.code}>
            <div className="interest-title">{c.label}</div>
            {c.code === "other" && (
              <div className="field-group">
                <label htmlFor="interest-other">Tell us what you&apos;re into</label>
                <textarea id="interest-other" className="input-field" rows={2} maxLength={taxonomy.otherMax}
                  value={value.interestOther} placeholder="For example, vintage cars or board games"
                  onChange={(e) => onChange({ ...value, interestOther: e.target.value })} />
              </div>
            )}
            {[["Services", services], ["Products", products]].map(([title, list]) =>
              (list as typeof services).length ? (
                <div className="field-group" key={title as string}>
                  <label>{title as string}</label>
                  <div className="chips">
                    {(list as typeof services).map((s) => (
                      <button key={s.code} type="button" data-code={s.code}
                        className={`chip${niches.includes(s.code) ? " selected" : ""}`}
                        onClick={() => onChange(togglePick(value, "industryNiches", c.code, s.code))}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null)}
            {c.values.length > 0 && (
              <div className="field-group">
                <label>What matters most</label>
                <div className="chips">
                  {c.values.map((v) => (
                    <button key={v.id} type="button" data-value={v.id}
                      className={`chip${values.includes(v.id) ? " selected" : ""}`}
                      onClick={() => onChange(togglePick(value, "industryValues", c.code, v.id))}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
