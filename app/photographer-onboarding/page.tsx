"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

const STEPS = [
  "Identity",
  "Location",
  "Rates & Portfolio",
  "Specialties",
  "Review",
];

interface FormState {
  displayName: string;
  bio: string;
  city: string;
  state: string;
  willTravel: boolean;
  hourlyRate: string;
  portfolioUrl: string;
  specialties: string[];
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

function validateStep(step: number, form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 0) {
    if (!form.displayName.trim()) errors.displayName = "Display name is required";
  }
  if (step === 1) {
    if (!form.city.trim()) errors.city = "City is required";
    if (!form.state) errors.state = "State is required";
  }
  if (step === 2) {
    if (!form.hourlyRate) errors.hourlyRate = "Hourly rate is required";
    else if (isNaN(Number(form.hourlyRate)) || Number(form.hourlyRate) < 1)
      errors.hourlyRate = "Enter a valid rate (minimum $1)";
    if (!form.portfolioUrl.trim()) errors.portfolioUrl = "Portfolio URL is required";
    else if (!/^https?:\/\/.+/.test(form.portfolioUrl.trim()))
      errors.portfolioUrl = "Enter a valid URL starting with http:// or https://";
  }
  return errors;
}

export default function PhotographerOnboardingPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormState>({
    displayName: "",
    bio: "",
    city: "",
    state: "",
    willTravel: false,
    hourlyRate: "",
    portfolioUrl: "",
    specialties: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.status === 401) { router.push("/login"); return; }
        const meData = await meRes.json();
        if (meData.role !== "photographer") { router.push("/"); return; }

        const profileRes = await fetch("/api/photographer/me");
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.isProfileComplete === true) {
            router.push("/photographer-dashboard");
            return;
          }
        }
      } catch {
        // network error — allow page to render
      } finally {
        setAuthChecking(false);
      }
    })();
  }, [router]);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field as keyof FieldErrors]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function toggleSpecialty(s: string) {
    setForm((f) => {
      const has = f.specialties.includes(s);
      return { ...f, specialties: has ? f.specialties.filter((x) => x !== s) : [...f.specialties, s] };
    });
  }

  function scrollTop() {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleNext() {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
    scrollTop();
  }

  function handleBack() {
    setStep((s) => s - 1);
    scrollTop();
  }

  async function handleSubmit() {
    setLoading(true);
    setSubmitError("");

    const payload = {
      displayName: form.displayName.trim(),
      bio: form.bio.trim() || undefined,
      city: form.city.trim(),
      state: form.state,
      willTravel: form.willTravel,
      hourlyRate: Math.round(Number(form.hourlyRate) * 100),
      portfolioUrl: form.portfolioUrl.trim(),
      specialties: form.specialties,
    };

    try {
      const res = await fetch("/api/photographer/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data.setupRequired) {
          setSubmitError("Your profile could not be found. Please contact support.");
          return;
        }
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

  if (authChecking) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#555", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  const fieldClass = (field: keyof FieldErrors) =>
    errors[field] ? "input-field input-error" : "input-field";

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
          letter-spacing: 0.12em; color: #c9a84c; text-decoration: none; margin-bottom: 8px;
        }
        .tagline { font-size: 13px; color: #888; letter-spacing: 0.04em; margin-bottom: 40px; }
        .card {
          width: 100%; max-width: 540px; background: #141414;
          border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden;
        }
        .steps { display: flex; border-bottom: 1px solid #2a2a2a; overflow-x: auto; }
        .step-tab {
          flex: 1; min-width: 80px; padding: 14px 8px; text-align: center;
          font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase;
          color: #555; border-bottom: 2px solid transparent; transition: color 0.2s, border-color 0.2s;
          white-space: nowrap;
        }
        .step-tab.active { color: #c9a84c; border-bottom-color: #c9a84c; }
        .step-tab.done { color: #444; }
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
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip {
          padding: 6px 14px; border-radius: 999px; border: 1px solid #2a2a2a;
          background: #0a0a0a; color: #888; font-size: 12px; font-family: inherit;
          cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .chip:hover { border-color: #555; color: #ccc; }
        .chip.selected { border-color: #c9a84c; color: #c9a84c; background: #1a1505; }
        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; background: #0a0a0a; border: 1px solid #2a2a2a;
          border-radius: 6px; cursor: pointer; user-select: none;
        }
        .toggle-label { font-size: 14px; color: #f5f0e8; }
        .toggle-sub { font-size: 12px; color: #666; margin-top: 2px; }
        .toggle-switch {
          width: 40px; height: 22px; border-radius: 11px; position: relative;
          background: #2a2a2a; transition: background 0.2s; flex-shrink: 0;
        }
        .toggle-switch.on { background: #c9a84c; }
        .toggle-knob {
          position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
          border-radius: 50%; background: #fff; transition: left 0.2s;
        }
        .toggle-switch.on .toggle-knob { left: 21px; }
        .review-section { margin-bottom: 20px; }
        .review-label {
          font-size: 11px; font-weight: 500; letter-spacing: 0.06em;
          text-transform: uppercase; color: #555; margin-bottom: 6px;
        }
        .review-value { font-size: 14px; color: #f5f0e8; line-height: 1.6; }
        .review-value.muted { color: #666; font-style: italic; }
        .review-specialties { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .review-chip {
          padding: 4px 12px; border-radius: 999px; border: 1px solid #c9a84c;
          color: #c9a84c; background: #1a1505; font-size: 12px;
        }
        .review-card {
          background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 8px;
          padding: 20px 22px;
        }
        .review-divider { border: none; border-top: 1px solid #1e1e1e; margin: 16px 0; }
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
        @media (max-width: 480px) {
          .form-body { padding: 24px 20px 16px; }
          .actions { padding: 16px 20px 24px; }
          .row-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page">
        <Link href="/" className="logo-link">OUTSYDE</Link>
        <p className="tagline">Complete your photographer profile</p>

        <div className="card" ref={cardRef}>
          <div className="steps">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={`step-tab${i === step ? " active" : i < step ? " done" : ""}`}
              >
                {i < step ? `✓` : `${i + 1}`}. {label}
              </div>
            ))}
          </div>

          {/* Step 0 — Display Name + Bio */}
          {step === 0 && (
            <div className="form-body">
              <div className="step-heading">Your identity</div>
              <div className="step-sub">This is how clients will see you on Outsyde.</div>

              <div className="field-group">
                <label>Display name <span className="req">*</span></label>
                <input
                  className={fieldClass("displayName")}
                  type="text"
                  placeholder="e.g. James Meyers Photography"
                  value={form.displayName}
                  onChange={(e) => set("displayName", e.target.value)}
                />
                {errors.displayName && <div className="error-msg">{errors.displayName}</div>}
              </div>

              <div className="field-group">
                <label>Bio <span style={{ color: "#555", textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                <textarea
                  className="input-field"
                  placeholder="Tell clients about your style, experience, and what makes you unique…"
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 1 — City + State + Will Travel */}
          {step === 1 && (
            <div className="form-body">
              <div className="step-heading">Your location</div>
              <div className="step-sub">Where are you based, and are you open to traveling for shoots?</div>

              <div className="row-2" style={{ marginBottom: 18 }}>
                <div className="field-group">
                  <label>City <span className="req">*</span></label>
                  <input
                    className={fieldClass("city")}
                    type="text"
                    placeholder="e.g. Austin"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                  {errors.city && <div className="error-msg">{errors.city}</div>}
                </div>
                <div className="field-group">
                  <label>State <span className="req">*</span></label>
                  <select
                    className={fieldClass("state")}
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                  >
                    <option value="">—</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <div className="error-msg">{errors.state}</div>}
                </div>
              </div>

              <div className="field-group">
                <label>Will travel</label>
                <div
                  className="toggle-row"
                  onClick={() => set("willTravel", !form.willTravel)}
                >
                  <div>
                    <div className="toggle-label">Available for travel shoots</div>
                    <div className="toggle-sub">Clients outside your city can book you</div>
                  </div>
                  <div className={`toggle-switch${form.willTravel ? " on" : ""}`}>
                    <div className="toggle-knob" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Hourly Rate + Portfolio URL */}
          {step === 2 && (
            <div className="form-body">
              <div className="step-heading">Rates & portfolio</div>
              <div className="step-sub">Set your starting hourly rate and link your portfolio so clients can see your work.</div>

              <div className="field-group">
                <label>Hourly rate ($) <span className="req">*</span></label>
                <input
                  className={fieldClass("hourlyRate")}
                  type="number"
                  placeholder="150"
                  min="1"
                  value={form.hourlyRate}
                  onChange={(e) => set("hourlyRate", e.target.value)}
                />
                {errors.hourlyRate && <div className="error-msg">{errors.hourlyRate}</div>}
              </div>

              <div className="field-group">
                <label>Portfolio URL <span className="req">*</span></label>
                <input
                  className={fieldClass("portfolioUrl")}
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={form.portfolioUrl}
                  onChange={(e) => set("portfolioUrl", e.target.value)}
                />
                {errors.portfolioUrl && <div className="error-msg">{errors.portfolioUrl}</div>}
              </div>
            </div>
          )}

          {/* Step 3 — Specialties */}
          {step === 3 && (
            <div className="form-body">
              <div className="step-heading">Specialties</div>
              <div className="step-sub">Select all the types of photography you offer.</div>

              <div className="field-group">
                <label>Pick all that apply</label>
                <div className="chips">
                  {SPECIALTIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`chip${form.specialties.includes(s) ? " selected" : ""}`}
                      onClick={() => toggleSpecialty(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <div className="form-body">
              <div className="step-heading">Review & submit</div>
              <div className="step-sub">Make sure everything looks right before saving your profile.</div>

              <div className="review-card">
                <div className="review-section">
                  <div className="review-label">Display name</div>
                  <div className="review-value">{form.displayName}</div>
                </div>

                {form.bio && (
                  <>
                    <hr className="review-divider" />
                    <div className="review-section">
                      <div className="review-label">Bio</div>
                      <div className="review-value">{form.bio}</div>
                    </div>
                  </>
                )}

                <hr className="review-divider" />
                <div className="review-section">
                  <div className="review-label">Location</div>
                  <div className="review-value">
                    {form.city}, {form.state}
                    {form.willTravel && <span style={{ marginLeft: 8, fontSize: 12, color: "#c9a84c" }}>· Will travel</span>}
                  </div>
                </div>

                <hr className="review-divider" />
                <div className="review-section">
                  <div className="review-label">Hourly rate</div>
                  <div className="review-value">${Number(form.hourlyRate).toFixed(2)} / hr</div>
                </div>

                <hr className="review-divider" />
                <div className="review-section">
                  <div className="review-label">Portfolio</div>
                  <div className="review-value" style={{ wordBreak: "break-all" }}>{form.portfolioUrl}</div>
                </div>

                <hr className="review-divider" />
                <div className="review-section">
                  <div className="review-label">Specialties</div>
                  {form.specialties.length > 0 ? (
                    <div className="review-specialties">
                      {form.specialties.map((s) => (
                        <span key={s} className="review-chip">{s}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="review-value muted">None selected</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {submitError && <div className="submit-error">{submitError}</div>}

          <div className="actions">
            {step > 0 && (
              <button className="btn-back" onClick={handleBack}>← Back</button>
            )}
            {step < STEPS.length - 1 ? (
              <button className="btn-next" onClick={handleNext}>Continue →</button>
            ) : (
              <button className="btn-next" onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving…" : "Save profile"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
