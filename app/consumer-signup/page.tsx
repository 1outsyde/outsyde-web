"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

declare global {
  interface Window {
    google: typeof google;
    initAutocomplete: () => void;
  }
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  address: string;
  aptUnit: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  billingSameAsHome: boolean;
  billingStreet: string;
  billingAptUnit: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  dateOfBirth: string;
  gender: string;
  ethnicity: string;
  shoppingFrequency: string;
  selectedIndustries: string[];
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

const GENDERS = ["Man","Woman","Non-binary","Prefer not to say","Other"];

const ETHNICITIES = [
  "Asian / Pacific Islander","Black / African American","Hispanic / Latino",
  "Middle Eastern / North African","Native American / Alaska Native",
  "White / Caucasian","Multiracial","Prefer not to say","Other",
];

const SHOPPING_FREQUENCIES = [
  "Daily","A few times a week","Weekly","A few times a month","Monthly","Rarely",
];

const INDUSTRIES = [
  "Fashion & Apparel","Beauty & Wellness","Food & Beverage","Fitness & Sports",
  "Home & Garden","Technology","Travel & Adventure","Art & Culture",
  "Health & Medical","Finance","Education","Entertainment","Automotive",
  "Pets","Sustainability","Other",
];

const STEPS = ["Account", "Address", "Profile"];

function validateStep(step: number, form: FormData): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (!form.email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = "Enter a valid email address";

    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 6)
      errors.password = "Password must be at least 6 characters";

    if (!form.confirmPassword) errors.confirmPassword = "Please confirm your password";
    else if (form.confirmPassword !== form.password)
      errors.confirmPassword = "Passwords do not match";

    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";

    if (!form.username.trim()) errors.username = "Username is required";
    else if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username))
      errors.username = "3–30 characters: letters, numbers, and underscores only";

    if (!form.phone.trim()) errors.phone = "Phone number is required";
  }

  if (step === 1) {
    if (form.billingSameAsHome) {
      if (!form.address.trim()) errors.address = "Street address is required for billing";
      if (!form.city.trim()) errors.city = "City is required for billing";
      if (!form.state) errors.state = "State is required for billing";
    } else {
      if (!form.billingStreet.trim()) errors.billingStreet = "Billing street address is required";
      if (!form.billingCity.trim()) errors.billingCity = "Billing city is required";
      if (!form.billingState) errors.billingState = "Billing state is required";
    }
  }

  return errors;
}

export default function ConsumerSignupPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const billingInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const billingAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameTimer, setUsernameTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<FormData>({
    email: "", password: "", confirmPassword: "",
    firstName: "", lastName: "", username: "", phone: "",
    address: "", aptUnit: "", city: "", state: "", zipCode: "",
    country: "United States",
    billingSameAsHome: true,
    billingStreet: "", billingAptUnit: "", billingCity: "",
    billingState: "", billingZip: "", billingCountry: "United States",
    dateOfBirth: "", gender: "", ethnicity: "",
    shoppingFrequency: "", selectedIndustries: [],
  });

  // Load Google Maps script
  useEffect(() => {
    if (document.getElementById("gmaps-script")) return;
    const script = document.createElement("script");
    script.id = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initAutocomplete`;
    script.async = true;
    script.defer = true;
    window.initAutocomplete = () => {}; // will be overridden per step
    document.head.appendChild(script);
  }, []);

  // Init autocomplete when step 1 mounts
  useEffect(() => {
    if (step !== 1) return;
    const init = () => {
      if (addressInputRef.current && window.google?.maps?.places) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          { componentRestrictions: { country: "us" }, fields: ["address_components"] }
        );
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current!.getPlace();
          fillAddress(place.address_components ?? [], false);
        });
      }
      if (billingInputRef.current && window.google?.maps?.places) {
        billingAutocompleteRef.current = new window.google.maps.places.Autocomplete(
          billingInputRef.current,
          { componentRestrictions: { country: "us" }, fields: ["address_components"] }
        );
        billingAutocompleteRef.current.addListener("place_changed", () => {
          const place = billingAutocompleteRef.current!.getPlace();
          fillAddress(place.address_components ?? [], true);
        });
      }
    };
    if (window.google?.maps?.places) {
      init();
    } else {
      window.initAutocomplete = init;
    }
  }, [step]);

  function fillAddress(
    components: google.maps.GeocoderAddressComponent[],
    isBilling: boolean
  ) {
    const get = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name ?? "";
    const getShort = (type: string) =>
      components.find((c) => c.types.includes(type))?.short_name ?? "";

    const streetNum = get("street_number");
    const route = get("route");
    const street = [streetNum, route].filter(Boolean).join(" ");
    const city = get("locality") || get("sublocality") || get("neighborhood");
    const state = get("administrative_area_level_1");
    const zip = get("postal_code");

    if (isBilling) {
      setForm((f) => ({ ...f, billingStreet: street, billingCity: city, billingState: state, billingZip: zip }));
      setErrors((e) => ({ ...e, billingStreet: undefined, billingCity: undefined, billingState: undefined }));
    } else {
      setForm((f) => ({ ...f, address: street, city, state, zipCode: zip }));
      setErrors((e) => ({ ...e, address: undefined, city: undefined, state: undefined }));
    }
  }

  function set(field: keyof FormData, value: string | boolean | string[]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function fieldClass(field: keyof FormData) {
    return errors[field] ? "input-field input-error" : "input-field";
  }

  function handleUsernameChange(val: string) {
    set("username", val);
    setUsernameAvailable(null);
    if (usernameTimer) clearTimeout(usernameTimer);
    if (!val || val.length < 3) return;
    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(val)}`);
        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);
    setUsernameTimer(timer);
  }

  function toggleIndustry(ind: string) {
    setForm((f) => {
      const has = f.selectedIndustries.includes(ind);
      return { ...f, selectedIndustries: has ? f.selectedIndustries.filter((i) => i !== ind) : [...f.selectedIndustries, ind] };
    });
  }

  function scrollTop() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToFirstError(errs: FieldErrors) {
    const firstKey = Object.keys(errs)[0] as keyof FormData;
    if (!firstKey) return;
    const el = document.querySelector(`[data-field="${firstKey}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleNext() {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      scrollToFirstError(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
    scrollTop();
  }

  function handleBack() {
    setStep((s) => s - 1);
    scrollTop();
  }

  async function handleSubmit() {
    const errs = validateStep(2, form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      scrollToFirstError(errs);
      return;
    }
    if (usernameAvailable === false) {
      setErrors({ username: "That username is already taken" });
      setStep(0);
      scrollTop();
      return;
    }

    setLoading(true);
    setSubmitError("");

    const payload: Record<string, unknown> = {
      email: form.email,
      password: form.password,
      name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim(),
      phone: form.phone.trim(),
      address: form.address || undefined,
      aptUnit: form.aptUnit || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      zipCode: form.zipCode || undefined,
      country: form.country || "United States",
      billingSameAsHome: form.billingSameAsHome,
      billingStreet: form.billingSameAsHome ? undefined : form.billingStreet,
      billingAptUnit: form.billingSameAsHome ? undefined : (form.billingAptUnit || undefined),
      billingCity: form.billingSameAsHome ? undefined : form.billingCity,
      billingState: form.billingSameAsHome ? undefined : form.billingState,
      billingZip: form.billingSameAsHome ? undefined : (form.billingZip || undefined),
      billingCountry: form.billingSameAsHome ? undefined : (form.billingCountry || "United States"),
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      ethnicity: form.ethnicity || undefined,
      shoppingFrequency: form.shoppingFrequency || undefined,
      selectedIndustries: form.selectedIndustries,
      industryNiches: {},
      industryValues: {},
    };

    try {
      const res = await fetch("/api/consumer-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.message || data.error || "Something went wrong. Please try again.");
        return;
      }
      router.push("/");
    } catch {
      setSubmitError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        .page {
          min-height: 100vh;
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 16px 80px;
          font-family: 'Hanken Grotesk', sans-serif;
          color: #f5f0e8;
        }
        .logo-link {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 0.12em;
          color: #c9a84c;
          text-decoration: none;
          margin-bottom: 8px;
        }
        .tagline { font-size: 13px; color: #888; letter-spacing: 0.04em; margin-bottom: 40px; }
        .card {
          width: 100%;
          max-width: 540px;
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          overflow: hidden;
        }
        .steps { display: flex; border-bottom: 1px solid #2a2a2a; }
        .step-tab {
          flex: 1;
          padding: 14px 8px;
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #555;
          border-bottom: 2px solid transparent;
          transition: color 0.2s, border-color 0.2s;
        }
        .step-tab.active { color: #c9a84c; border-bottom-color: #c9a84c; }
        .step-tab.done { color: #555; }
        .form-body { padding: 32px 32px 24px; }
        .step-heading {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 0.08em;
          color: #c9a84c;
          margin-bottom: 4px;
        }
        .step-sub { font-size: 13px; color: #666; margin-bottom: 28px; line-height: 1.5; }
        .field-group { margin-bottom: 18px; }
        label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 6px;
        }
        .req { color: #c0392b; margin-left: 2px; }
        .input-field {
          width: 100%;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          border-radius: 6px;
          padding: 11px 14px;
          font-size: 14px;
          color: #f5f0e8;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
          -webkit-appearance: none;
        }
        .input-field:focus { border-color: #c9a84c; }
        .input-field.input-error { border-color: #c0392b; }
        .input-field::placeholder { color: #444; }
        select.input-field option { background: #141414; color: #f5f0e8; }
        .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .row-3 { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; }
        .error-msg { font-size: 12px; color: #c0392b; margin-top: 5px; }
        .username-hint { font-size: 12px; margin-top: 5px; }
        .username-hint.checking { color: #888; }
        .username-hint.available { color: #27ae60; }
        .username-hint.taken { color: #c0392b; }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          margin-bottom: 18px;
        }
        .checkbox-label input[type="checkbox"] {
          width: 16px; height: 16px;
          accent-color: #c9a84c;
          cursor: pointer; flex-shrink: 0;
        }
        .checkbox-label span { font-size: 13px; color: #aaa; }
        .section-divider {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #444;
          border-bottom: 1px solid #1e1e1e;
          padding-bottom: 8px;
          margin: 24px 0 18px;
        }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid #2a2a2a;
          background: #0a0a0a;
          color: #888;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .chip:hover { border-color: #555; color: #ccc; }
        .chip.selected { border-color: #c9a84c; color: #c9a84c; background: #1a1505; }
        .actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 32px 28px;
          border-top: 1px solid #1e1e1e;
          gap: 12px;
        }
        .btn-back {
          background: transparent;
          border: 1px solid #2a2a2a;
          border-radius: 6px;
          color: #888;
          font-size: 14px;
          font-family: inherit;
          padding: 11px 24px;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .btn-back:hover { border-color: #555; color: #ccc; }
        .btn-next {
          flex: 1;
          background: #c9a84c;
          border: none;
          border-radius: 6px;
          color: #0a0a0a;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          padding: 12px 24px;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: background 0.15s, opacity 0.15s;
        }
        .btn-next:hover { background: #d4b060; }
        .btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
        .submit-error {
          font-size: 13px;
          color: #c0392b;
          text-align: center;
          padding: 0 32px 16px;
          line-height: 1.5;
        }
        .signin-link { margin-top: 20px; font-size: 13px; color: #666; text-align: center; }
        .signin-link a { color: #c9a84c; text-decoration: none; }
        .signin-link a:hover { text-decoration: underline; }
        /* Google Maps autocomplete dropdown */
        .pac-container {
          background: #1a1a1a !important;
          border: 1px solid #2a2a2a !important;
          border-radius: 6px !important;
          font-family: 'Hanken Grotesk', sans-serif !important;
          margin-top: 2px;
        }
        .pac-item {
          color: #f5f0e8 !important;
          border-top: 1px solid #2a2a2a !important;
          padding: 8px 12px !important;
          cursor: pointer;
        }
        .pac-item:hover { background: #242424 !important; }
        .pac-item-selected { background: #242424 !important; }
        .pac-matched { color: #c9a84c !important; }
        .pac-icon { display: none !important; }
        @media (max-width: 480px) {
          .form-body { padding: 24px 20px 16px; }
          .actions { padding: 16px 20px 24px; }
          .row-2 { grid-template-columns: 1fr; }
          .row-3 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page" ref={formRef}>
        <Link href="/" className="logo-link">OUTSYDE</Link>
        <p className="tagline">Create your account</p>

        <div className="card">
          <div className="steps">
            {STEPS.map((label, i) => (
              <div key={label} className={`step-tab${i === step ? " active" : i < step ? " done" : ""}`}>
                {i < step ? `✓ ${label}` : label}
              </div>
            ))}
          </div>

          {/* ── Step 0: Account ── */}
          {step === 0 && (
            <div className="form-body">
              <div className="step-heading">Your account</div>
              <div className="step-sub">How you'll sign in and be known on Outsyde.</div>

              <div className="field-group" data-field="email">
                <label>Email <span className="req">*</span></label>
                <input className={fieldClass("email")} type="email" placeholder="you@example.com"
                  value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
                {errors.email && <div className="error-msg">{errors.email}</div>}
              </div>

              <div className="row-2">
                <div className="field-group" data-field="password">
                  <label>Password <span className="req">*</span></label>
                  <input className={fieldClass("password")} type="password" placeholder="Min. 6 characters"
                    value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
                  {errors.password && <div className="error-msg">{errors.password}</div>}
                </div>
                <div className="field-group" data-field="confirmPassword">
                  <label>Confirm password <span className="req">*</span></label>
                  <input className={fieldClass("confirmPassword")} type="password" placeholder="Repeat password"
                    value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} autoComplete="new-password" />
                  {errors.confirmPassword && <div className="error-msg">{errors.confirmPassword}</div>}
                </div>
              </div>

              <div className="row-2">
                <div className="field-group" data-field="firstName">
                  <label>First name <span className="req">*</span></label>
                  <input className={fieldClass("firstName")} type="text" placeholder="First"
                    value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />
                  {errors.firstName && <div className="error-msg">{errors.firstName}</div>}
                </div>
                <div className="field-group" data-field="lastName">
                  <label>Last name <span className="req">*</span></label>
                  <input className={fieldClass("lastName")} type="text" placeholder="Last"
                    value={form.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" />
                  {errors.lastName && <div className="error-msg">{errors.lastName}</div>}
                </div>
              </div>

              <div className="row-2">
                <div className="field-group" data-field="username">
                  <label>Username <span className="req">*</span></label>
                  <input className={fieldClass("username")} type="text" placeholder="your_handle"
                    value={form.username} onChange={(e) => handleUsernameChange(e.target.value)} autoComplete="username" />
                  {errors.username && <div className="error-msg">{errors.username}</div>}
                  {!errors.username && form.username.length >= 3 && (
                    <div className={`username-hint${usernameChecking ? " checking" : usernameAvailable === true ? " available" : usernameAvailable === false ? " taken" : ""}`}>
                      {usernameChecking ? "Checking…" : usernameAvailable === true ? "✓ Available" : usernameAvailable === false ? "✗ Already taken" : ""}
                    </div>
                  )}
                </div>
                <div className="field-group" data-field="phone">
                  <label>Phone <span className="req">*</span></label>
                  <input className={fieldClass("phone")} type="tel" placeholder="(555) 000-0000"
                    value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
                  {errors.phone && <div className="error-msg">{errors.phone}</div>}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Address ── */}
          {step === 1 && (
            <div className="form-body">
              <div className="step-heading">Mailing address</div>
              <div className="step-sub">
                Used for local discovery and orders. A billing address is required.
              </div>

              <div className="field-group" data-field="address">
                <label>
                  Street address
                  {form.billingSameAsHome && <span className="req"> *</span>}
                </label>
                <input
                  ref={addressInputRef}
                  className={fieldClass("address")}
                  type="text"
                  placeholder="Start typing your address…"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  autoComplete="off"
                />
                {errors.address && <div className="error-msg">{errors.address}</div>}
              </div>

              <div className="field-group">
                <label>Apt / Unit</label>
                <input className="input-field" type="text" placeholder="Apt 4B"
                  value={form.aptUnit} onChange={(e) => set("aptUnit", e.target.value)} />
              </div>

              <div className="row-3">
                <div className="field-group" data-field="city">
                  <label>City {form.billingSameAsHome && <span className="req">*</span>}</label>
                  <input className={fieldClass("city")} type="text" placeholder="New York"
                    value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
                  {errors.city && <div className="error-msg">{errors.city}</div>}
                </div>
                <div className="field-group" data-field="state">
                  <label>State {form.billingSameAsHome && <span className="req">*</span>}</label>
                  <select className={fieldClass("state")} value={form.state} onChange={(e) => set("state", e.target.value)}>
                    <option value="">—</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <div className="error-msg">{errors.state}</div>}
                </div>
                <div className="field-group">
                  <label>ZIP</label>
                  <input className="input-field" type="text" placeholder="10001"
                    value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} maxLength={10} />
                </div>
              </div>

              <div className="section-divider">Billing address <span className="req">*</span></div>

              <label className="checkbox-label">
                <input type="checkbox" checked={form.billingSameAsHome}
                  onChange={(e) => set("billingSameAsHome", e.target.checked)} />
                <span>Same as home address</span>
              </label>

              {!form.billingSameAsHome && (
                <>
                  <div className="field-group" data-field="billingStreet">
                    <label>Billing street <span className="req">*</span></label>
                    <input
                      ref={billingInputRef}
                      className={fieldClass("billingStreet")}
                      type="text"
                      placeholder="Start typing your billing address…"
                      value={form.billingStreet}
                      onChange={(e) => set("billingStreet", e.target.value)}
                      autoComplete="off"
                    />
                    {errors.billingStreet && <div className="error-msg">{errors.billingStreet}</div>}
                  </div>
                  <div className="field-group">
                    <label>Apt / Unit</label>
                    <input className="input-field" type="text" placeholder="Suite 100"
                      value={form.billingAptUnit} onChange={(e) => set("billingAptUnit", e.target.value)} />
                  </div>
                  <div className="row-3">
                    <div className="field-group" data-field="billingCity">
                      <label>City <span className="req">*</span></label>
                      <input className={fieldClass("billingCity")} type="text" placeholder="New York"
                        value={form.billingCity} onChange={(e) => set("billingCity", e.target.value)} />
                      {errors.billingCity && <div className="error-msg">{errors.billingCity}</div>}
                    </div>
                    <div className="field-group" data-field="billingState">
                      <label>State <span className="req">*</span></label>
                      <select className={fieldClass("billingState")} value={form.billingState}
                        onChange={(e) => set("billingState", e.target.value)}>
                        <option value="">—</option>
                        {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.billingState && <div className="error-msg">{errors.billingState}</div>}
                    </div>
                    <div className="field-group">
                      <label>ZIP</label>
                      <input className="input-field" type="text" placeholder="10001"
                        value={form.billingZip} onChange={(e) => set("billingZip", e.target.value)} maxLength={10} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Profile ── */}
          {step === 2 && (
            <div className="form-body">
              <div className="step-heading">Your profile</div>
              <div className="step-sub">Helps us personalise your Outsyde experience. All fields are optional.</div>

              <div className="row-2">
                <div className="field-group">
                  <label>Date of birth</label>
                  <input className="input-field" type="date" value={form.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)} style={{ colorScheme: "dark" }} />
                </div>
                <div className="field-group">
                  <label>Gender</label>
                  <select className="input-field" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">Select…</option>
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="row-2">
                <div className="field-group">
                  <label>Ethnicity</label>
                  <select className="input-field" value={form.ethnicity} onChange={(e) => set("ethnicity", e.target.value)}>
                    <option value="">Select…</option>
                    {ETHNICITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label>Shopping frequency</label>
                  <select className="input-field" value={form.shoppingFrequency} onChange={(e) => set("shoppingFrequency", e.target.value)}>
                    <option value="">Select…</option>
                    {SHOPPING_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label>Interests — pick any</label>
                <div className="chips">
                  {INDUSTRIES.map((ind) => (
                    <button key={ind} type="button"
                      className={`chip${form.selectedIndustries.includes(ind) ? " selected" : ""}`}
                      onClick={() => toggleIndustry(ind)}>
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {submitError && <div className="submit-error">{submitError}</div>}

          <div className="actions">
            {step > 0 && <button className="btn-back" onClick={handleBack}>← Back</button>}
            {step < 2
              ? <button className="btn-next" onClick={handleNext}>Continue →</button>
              : <button className="btn-next" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </button>
            }
          </div>
        </div>

        <p className="signin-link">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </>
  );
}