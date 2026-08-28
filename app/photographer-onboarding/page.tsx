"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

declare global {
  interface Window {
    google: typeof google;
    initOnboardingAutocomplete: () => void;
  }
}

interface FormData {
  displayName: string;
  bio: string;
  city: string;
  state: string;
  hourlyRate: string;
  portfolioUrl: string;
  specialties: string[];
  shootLocation: string;
  experienceLevel: string;
  equipmentLevel: string;
  travelRadius: string;
  deliveryTime: string;
}

type FieldErrors = Partial<Record<keyof FormData, string>>;

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const SPECIALTIES = [
  "Portraits","Weddings","Events","Commercial","Real Estate","Fashion",
  "Sports","Wildlife","Street","Food","Architecture","Travel",
  "Newborn & Family","Boudoir","Product","Other",
];

const SHOOT_LOCATIONS = [
  "On location (client's choice)",
  "Studio only",
  "Studio + on location",
  "Outdoor only",
];

const EXPERIENCE_LEVELS = [
  "Hobbyist","Semi-professional","Professional","Industry veteran (10+ years)",
];

const EQUIPMENT_LEVELS = [
  "Entry-level DSLR / mirrorless",
  "Mid-range professional",
  "High-end professional",
  "Cinema / commercial grade",
];

const DELIVERY_TIMES = [
  "24–48 hours","3–5 days","1 week","2 weeks","3–4 weeks","Negotiable",
];

const STEPS = ["About you", "Location & rates", "Details"];

function validateStep(step: number, form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 0) {
    if (!form.displayName.trim()) errors.displayName = "Display name is required";
  }
  if (step === 1) {
    if (!form.city.trim()) errors.city = "City is required";
    if (!form.state) errors.state = "State is required";
    if (!form.hourlyRate) errors.hourlyRate = "Hourly rate is required";
    else if (isNaN(Number(form.hourlyRate)) || Number(form.hourlyRate) < 1)
      errors.hourlyRate = "Enter a valid rate (minimum $1)";
    if (form.portfolioUrl.trim() && !/^https?:\/\/.+/.test(form.portfolioUrl.trim()))
      errors.portfolioUrl = "Enter a valid URL starting with http:// or https://";
  }
  return errors;
}

export default function PhotographerOnboardingPage() {
  const router = useRouter();
  const cityInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [form, setForm] = useState<FormData>({
    displayName: "", bio: "", city: "", state: "",
    hourlyRate: "", portfolioUrl: "", specialties: [],
    shootLocation: "", experienceLevel: "", equipmentLevel: "",
    travelRadius: "", deliveryTime: "",
  });

  // Auth guard: must be a photographer with incomplete profile
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) { router.push("/login"); return; }
        const meData = await meRes.json();
        if (!meData.authenticated) { router.push("/login"); return; }
        if (meData.user?.role !== "photographer" && !meData.user?.photographerId) { router.push("/"); return; }

        const profileRes = await fetch("/api/photographer/me");
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.displayName && profileData.hourlyRate && profileData.city) {
            router.push("/photographer-dashboard");
            return;
          }
        }
      } catch {
        router.push("/login");
        return;
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  // Load Google Maps
  useEffect(() => {
    if (document.getElementById("gmaps-onboarding")) return;
    const script = document.createElement("script");
    script.id = "gmaps-onboarding";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initOnboardingAutocomplete`;
    script.async = true;
    script.defer = true;
    window.initOnboardingAutocomplete = () => {};
    document.head.appendChild(script);
  }, []);

  // City autocomplete on step 1
  useEffect(() => {
    if (step !== 1) return;
    const init = () => {
      if (cityInputRef.current && window.google?.maps?.places) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          cityInputRef.current,
          { componentRestrictions: { country: "us" }, types: ["(cities)"], fields: ["address_components"] }
        );
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current!.getPlace();
          const components = place.address_components ?? [];
          const city =
            components.find((c) => c.types.includes("locality"))?.long_name ||
            components.find((c) => c.types.includes("sublocality"))?.long_name || "";
          const state =
            components.find((c) => c.types.includes("administrative_area_level_1"))?.long_name || "";
          setForm((f) => ({ ...f, city, state }));
          setErrors((e) => ({ ...e, city: undefined, state: undefined }));
        });
      }
    };
    if (window.google?.maps?.places) init();
    else window.initOnboardingAutocomplete = init;
  }, [step]);

  function set(field: keyof FormData, value: string | string[]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field as keyof FieldErrors]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function fieldClass(field: keyof FormData) {
    return errors[field] ? "input-field input-error" : "input-field";
  }

  function toggleSpecialty(s: string) {
    setForm((f) => {
      const has = f.specialties.includes(s);
      return { ...f, specialties: has ? f.specialties.filter((x) => x !== s) : [...f.specialties, s] };
    });
  }

  function handleNext() {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    const errs = validateStep(1, form);
    if (Object.keys(errs).length > 0) { setErrors(errs); setStep(1); return; }

    setLoading(true);
    setSubmitError("");

    const payload: Record<string, unknown> = {
      displayName: form.displayName.trim(),
      bio: form.bio.trim() || undefined,
      city: form.city.trim(),
      state: form.state,
      hourlyRate: Number(form.hourlyRate),
      specialties: form.specialties,
    };
    if (form.portfolioUrl.trim()) payload.portfolioUrl = form.portfolioUrl.trim();
    if (form.shootLocation) payload.shootLocation = form.shootLocation;
    if (form.experienceLevel) payload.experienceLevel = form.experienceLevel;
    if (form.equipmentLevel) payload.equipmentLevel = form.equipmentLevel;
    if (form.travelRadius) payload.travelRadius = form.travelRadius;
    if (form.deliveryTime) payload.deliveryTime = form.deliveryTime;

    try {
      const res = await fetch("/api/photographer/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.message || data.error || "Something went wrong. Please try again.");
        return;
      }
      router.push("/photographer-dashboard");
    } catch {
      setSubmitError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#555", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        .page {
          min-height: 100vh; background: #0a0a0a;
          display: flex; flex-direction: column; align-items: center;
          padding: 48px 16px 80px;
          font-family: 'Hanken Grotesk', sans-serif; color: #f5f0e8;
        }
        .logo-link {
          font-family: 'Bebas Neue', sans-serif; font-size: 28px;
          letter-spacing: 0.12em; color: #c9a84c; text-decoration: none; margin-bottom: 6px;
        }
        .tagline { font-size: 13px; color: #888; letter-spacing: 0.04em; margin-bottom: 36px; }
        .card {
          width: 100%; max-width: 540px; background: #141414;
          border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden;
        }
        .steps { display: flex; border-bottom: 1px solid #2a2a2a; }
        .step-tab {
          flex: 1; padding: 14px 8px; text-align: center;
          font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase;
          color: #555; border-bottom: 2px solid transparent;
        }
        .step-tab.active { color: #c9a84c; border-bottom-color: #c9a84c; }
        .step-tab.done { color: #555; }
        .form-body { padding: 32px 32px 24px; }
        .step-heading {
          font-family: 'Bebas Neue', sans-serif; font-size: 22px;
          letter-spacing: 0.08em; color: #c9a84c; margin-bottom: 4px;
        }
        .step-sub { font-size: 13px; color: #666; margin-bottom: 28px; line-height: 1.5; }
        .field-group { margin-bottom: 18px; }
        label {
          display: block; font-size: 12px; font-weight: 500;
          letter-spacing: 0.05em; text-transform: uppercase; color: #888; margin-bottom: 6px;
        }
        .req { color: #c0392b; margin-left: 2px; }
        .input-field {
          width: 100%; background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 6px;
          padding: 11px 14px; font-size: 14px; color: #f5f0e8; font-family: inherit;
          outline: none; transition: border-color 0.15s; -webkit-appearance: none;
        }
        .input-field:focus { border-color: #c9a84c; }
        .input-field.input-error { border-color: #c0392b; }
        .input-field::placeholder { color: #444; }
        textarea.input-field { resize: vertical; min-height: 90px; line-height: 1.5; }
        select.input-field option { background: #141414; color: #f5f0e8; }
        .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .error-msg { font-size: 12px; color: #c0392b; margin-top: 5px; }
        .section-divider {
          font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
          color: #444; border-bottom: 1px solid #1e1e1e; padding-bottom: 8px; margin: 24px 0 18px;
        }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip {
          padding: 6px 14px; border-radius: 999px; border: 1px solid #2a2a2a;
          background: #0a0a0a; color: #888; font-size: 12px; font-family: inherit;
          cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .chip:hover { border-color: #555; color: #ccc; }
        .chip.selected { border-color: #c9a84c; color: #c9a84c; background: #1a1505; }
        .actions {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 32px 28px; border-top: 1px solid #1e1e1e; gap: 12px;
        }
        .btn-back {
          background: transparent; border: 1px solid #2a2a2a; border-radius: 6px;
          color: #888; font-size: 14px; font-family: inherit; padding: 11px 24px;
          cursor: pointer; transition: border-color 0.15s, color 0.15s; white-space: nowrap;
        }
        .btn-back:hover { border-color: #555; color: #ccc; }
        .btn-next {
          flex: 1; background: #c9a84c; border: none; border-radius: 6px;
          color: #0a0a0a; font-size: 14px; font-weight: 600; font-family: inherit;
          padding: 12px 24px; cursor: pointer; letter-spacing: 0.03em;
          transition: background 0.15s, opacity 0.15s;
        }
        .btn-next:hover { background: #d4b060; }
        .btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
        .submit-error {
          font-size: 13px; color: #c0392b; text-align: center;
          padding: 0 32px 16px; line-height: 1.5;
        }
        .info-note {
          font-size: 12px; color: #666; background: #0f0f0f;
          border: 1px solid #1e1e1e; border-radius: 6px;
          padding: 12px 14px; margin-top: 24px; line-height: 1.6;
        }
        .pac-container {
          background: #1a1a1a !important; border: 1px solid #2a2a2a !important;
          border-radius: 6px !important; font-family: 'Hanken Grotesk', sans-serif !important; margin-top: 2px;
        }
        .pac-item {
          color: #f5f0e8 !important; border-top: 1px solid #2a2a2a !important;
          padding: 8px 12px !important; cursor: pointer;
        }
        .pac-item:hover { background: #242424 !important; }
        .pac-item-selected { background: #242424 !important; }
        .pac-matched { color: #c9a84c !important; }
        .pac-icon { display: none !important; }
        @media (max-width: 480px) {
          .form-body { padding: 24px 20px 16px; }
          .actions { padding: 16px 20px 24px; }
          .row-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page">
        <Link href="/" className="logo-link">OUTSYDE</Link>
        <p className="tagline">Complete your photographer profile</p>

        <div className="card">
          <div className="steps">
            {STEPS.map((label, i) => (
              <div key={label} className={`step-tab${i === step ? " active" : i < step ? " done" : ""}`}>
                {i < step ? `✓ ${label}` : label}
              </div>
            ))}
          </div>

          {/* Step 0: About you */}
          {step === 0 && (
            <div className="form-body">
              <div className="step-heading">About you</div>
              <div className="step-sub">This is how you'll appear to clients on Outsyde.</div>

              <div className="field-group" data-field="displayName">
                <label>Display name <span className="req">*</span></label>
                <input
                  className={fieldClass("displayName")} type="text"
                  placeholder="e.g. James Meyers Photography"
                  value={form.displayName}
                  onChange={(e) => set("displayName", e.target.value)}
                />
                {errors.displayName && <div className="error-msg">{errors.displayName}</div>}
              </div>

              <div className="field-group">
                <label>Bio</label>
                <textarea
                  className="input-field"
                  placeholder="Tell clients about your style, experience, and what makes you unique…"
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                />
              </div>

              <div className="section-divider">Specialties</div>
              <div className="field-group">
                <label>Pick all that apply</label>
                <div className="chips">
                  {SPECIALTIES.map((s) => (
                    <button key={s} type="button"
                      className={`chip${form.specialties.includes(s) ? " selected" : ""}`}
                      onClick={() => toggleSpecialty(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Location & rates */}
          {step === 1 && (
            <div className="form-body">
              <div className="step-heading">Location & rates</div>
              <div className="step-sub">Where you're based and what you charge.</div>

              <div className="row-2">
                <div className="field-group" data-field="city">
                  <label>City <span className="req">*</span></label>
                  <input
                    ref={cityInputRef}
                    className={fieldClass("city")}
                    type="text"
                    placeholder="Start typing your city…"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    autoComplete="off"
                  />
                  {errors.city && <div className="error-msg">{errors.city}</div>}
                </div>
                <div className="field-group" data-field="state">
                  <label>State <span className="req">*</span></label>
                  <select className={fieldClass("state")} value={form.state} onChange={(e) => set("state", e.target.value)}>
                    <option value="">—</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <div className="error-msg">{errors.state}</div>}
                </div>
              </div>

              <div className="row-2">
                <div className="field-group" data-field="hourlyRate">
                  <label>Hourly rate ($) <span className="req">*</span></label>
                  <input className={fieldClass("hourlyRate")} type="number" placeholder="150" min="1"
                    value={form.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value)} />
                  {errors.hourlyRate && <div className="error-msg">{errors.hourlyRate}</div>}
                </div>
                <div className="field-group">
                  <label>Travel radius (miles)</label>
                  <input className="input-field" type="number" placeholder="25" min="0"
                    value={form.travelRadius} onChange={(e) => set("travelRadius", e.target.value)} />
                </div>
              </div>

              <div className="field-group" data-field="portfolioUrl">
                <label>Portfolio URL</label>
                <input className={fieldClass("portfolioUrl")} type="url" placeholder="https://yourportfolio.com"
                  value={form.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} />
                {errors.portfolioUrl && <div className="error-msg">{errors.portfolioUrl}</div>}
              </div>
            </div>
          )}

          {/* Step 2: Details (optional) */}
          {step === 2 && (
            <div className="form-body">
              <div className="step-heading">Additional details</div>
              <div className="step-sub">Optional — helps clients find the right fit.</div>

              <div className="row-2">
                <div className="field-group">
                  <label>Shoot location</label>
                  <select className="input-field" value={form.shootLocation} onChange={(e) => set("shootLocation", e.target.value)}>
                    <option value="">Select…</option>
                    {SHOOT_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label>Experience level</label>
                  <select className="input-field" value={form.experienceLevel} onChange={(e) => set("experienceLevel", e.target.value)}>
                    <option value="">Select…</option>
                    {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="row-2">
                <div className="field-group">
                  <label>Equipment level</label>
                  <select className="input-field" value={form.equipmentLevel} onChange={(e) => set("equipmentLevel", e.target.value)}>
                    <option value="">Select…</option>
                    {EQUIPMENT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label>Delivery time</label>
                  <select className="input-field" value={form.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)}>
                    <option value="">Select…</option>
                    {DELIVERY_TIMES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="info-note">
                You can always update these details later from your dashboard.
              </div>
            </div>
          )}

          {submitError && <div className="submit-error">{submitError}</div>}

          <div className="actions">
            {step > 0 && <button className="btn-back" onClick={handleBack}>← Back</button>}
            {step < STEPS.length - 1
              ? <button className="btn-next" onClick={handleNext}>Continue →</button>
              : <button className="btn-next" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Saving…" : "Complete setup →"}
                </button>
            }
          </div>
        </div>
      </div>
    </>
  );
}
