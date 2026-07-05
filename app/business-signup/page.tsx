// app/business-signup/page.tsx
// Public vendor signup page — /business-signup
//
// Flow:
//   1. Collect account + business details in one form.
//   2. POST to /api/business-signup (BFF → outsyde-backend
//      /api/auth/vendor/signup). The BFF forwards the session cookie the
//      backend sets, so the vendor is logged in on outsyde-web immediately.
//   3. Show a success state confirming the application is pending approval.
//
// Styling: inline <style> block, .bs-* namespace, reuses --gold / --cream /
// --black tokens established in app/accept-invite/page.tsx and
// app/coming-soon/page.tsx.

"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const BUSINESS_CATEGORIES = [
  "Food & Drinks",
  "Beauty & Wellness",
  "Health & Fitness",
  "Shopping & Retail",
  "Home Services",
  "Professional Services",
  "Entertainment",
  "Arts & Crafts",
];

const INDUSTRIES = [
  "Clothing & Fashion",
  "Beauty Products",
  "Beauty Services",
  "Food & Dining",
  "Fitness & Wellness",
  "Home & Decor",
  "Arts & Crafts",
  "Professional Services",
];

const YEARS_IN_BUSINESS = [
  { value: "less-than-1", label: "Less than 1 year" },
  { value: "1-2", label: "1\u20132 years" },
  { value: "3-5", label: "3\u20135 years" },
  { value: "5-10", label: "5\u201310 years" },
  { value: "10+", label: "10+ years" },
];

const BUSINESS_STRUCTURES = [
  { value: "sole-proprietor", label: "Sole proprietorship" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "nonprofit", label: "Non-profit" },
];

type OfferType = "products" | "services" | "both" | "";
type SubmitState = "idle" | "submitting" | "error";
type UsernameAvailability = "idle" | "checking" | "available" | "taken";

function validateUsernameFormat(value: string): string {
  if (!value.trim()) return "Username is required.";
  if (!USERNAME_RE.test(value.trim())) {
    return "3\u201320 characters: lowercase letters, numbers, or underscores only.";
  }
  return "";
}

export default function BusinessSignupPage() {
  // account
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // username field: inline format/availability feedback (same pattern as accept-invite)
  const [usernameError, setUsernameError] = useState("");
  const [usernameAvailability, setUsernameAvailability] = useState<UsernameAvailability>("idle");

  // business
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [businessDescription, setBusinessDescription] = useState("");
  const [offerType, setOfferType] = useState<OfferType>("");

  // business details
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [businessType, setBusinessType] = useState("");

  // location
  const [hasPhysicalLocation, setHasPhysicalLocation] = useState(true);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");

  // online presence
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialMedia, setSocialMedia] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<{ message: string; businessName: string } | null>(null);

  function toggleIndustry(name: string) {
    setIndustries((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]));
  }

  async function handleUsernameBlur() {
    const value = username.trim();
    const formatErr = validateUsernameFormat(value);
    if (formatErr) {
      setUsernameError(formatErr);
      setUsernameAvailability("idle");
      return;
    }
    setUsernameError("");
    setUsernameAvailability("checking");
    try {
      const res = await fetch(`/api/accept-invite/check-username?username=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) {
        setUsernameAvailability("idle");
        return;
      }
      setUsernameAvailability(data.available === true ? "available" : "taken");
      if (data.available === false) {
        setUsernameError("That username is already taken.");
      }
    } catch {
      setUsernameAvailability("idle");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    const usernameFmtErr = validateUsernameFormat(username);
    if (usernameFmtErr) {
      setUsernameError(usernameFmtErr);
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setSubmitError("First and last name are required.");
      return;
    }
    if (!email.trim().includes("@")) {
      setSubmitError("A valid email is required.");
      return;
    }
    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords don\u2019t match.");
      return;
    }
    if (!businessName.trim()) {
      setSubmitError("Business name is required.");
      return;
    }
    if (!businessCategory) {
      setSubmitError("Select a business category.");
      return;
    }
    if (!offerType) {
      setSubmitError("Let us know what your business offers.");
      return;
    }
    if (!acceptedTerms) {
      setSubmitError("You\u2019ll need to accept the vendor terms to continue.");
      return;
    }

    setSubmitState("submitting");

    try {
      const res = await fetch("/api/business-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim().toLowerCase(),
          password,
          username: username.trim().toLowerCase(),
          businessName: businessName.trim(),
          businessCategory,
          industries,
          businessDescription: businessDescription.trim() || undefined,
          offerType,
          yearsInBusiness: yearsInBusiness || undefined,
          businessType: businessType || undefined,
          hasPhysicalLocation,
          address: hasPhysicalLocation ? address.trim() || undefined : undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zipCode: hasPhysicalLocation ? zipCode.trim() || undefined : undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          socialMedia: socialMedia.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitState("error");
        if (data.field === "username" && data.error) {
          setUsernameError(data.error);
          setUsernameAvailability("taken");
          return;
        }
        setSubmitError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSuccess({
        message: data.message || "Your application has been submitted and is pending approval.",
        businessName: businessName.trim(),
      });
    } catch {
      setSubmitState("error");
      setSubmitError("Couldn\u2019t reach the server. Please try again.");
    }
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{
  --black:#000000; --gold:#E8B930; --cream:#F5F0E6;
  --emerald:#1A3C34; --emerald-light:#244e44; --off-black:#04100d;
  --serif:'Bebas Neue',Impact,sans-serif; --sans:'Hanken Grotesk',system-ui,sans-serif;
}
html{scroll-behavior:smooth;}
body{font-family:var(--sans);background:var(--black);color:var(--cream);overflow-x:hidden;}

.bs-wrap{position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:56px 24px;overflow:hidden;}
.bs-bg{position:absolute;inset:0;background:var(--off-black);overflow:hidden;z-index:0;}
.bs-bg::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 70% 65% at 22% 58%,rgba(26,60,52,.9) 0%,transparent 52%),radial-gradient(ellipse 55% 45% at 78% 22%,rgba(232,185,48,.1) 0%,transparent 48%),radial-gradient(ellipse 60% 70% at 62% 85%,rgba(26,60,52,.55) 0%,transparent 52%),#04100d;}
.bs-veil{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3),rgba(0,0,0,.72));z-index:1;}
.bs-inner{position:relative;z-index:2;max-width:560px;width:100%;}

.bs-logo{display:inline-flex;align-items:center;gap:12px;margin-bottom:28px;}
.bs-y{width:42px;height:42px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:24px;color:var(--black);}
.bs-word{font-family:var(--serif);font-size:22px;letter-spacing:.16em;color:var(--cream);text-transform:uppercase;}

.bs-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;}
.bs-h1{font-family:var(--serif);font-size:clamp(34px,6vw,48px);letter-spacing:.03em;color:var(--cream);margin-bottom:14px;text-transform:uppercase;}
.bs-h1 span{color:var(--gold);}
.bs-sub{font-size:14px;line-height:1.65;color:rgba(245,240,230,.65);max-width:460px;margin:0 auto 32px;text-align:center;}

.bs-card{background:rgba(255,255,255,.05);border:1px solid rgba(245,240,230,.12);border-radius:8px;padding:32px 28px;text-align:left;}

.bs-section-label{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 14px;}
.bs-section-label:not(:first-child){margin-top:8px;padding-top:22px;border-top:1px solid rgba(245,240,230,.1);}

.bs-row{display:flex;gap:10px;}
.bs-row > *{flex:1;min-width:0;}

.bs-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.bs-field label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.5);}
.bs-field input, .bs-field select, .bs-field textarea{background:rgba(0,0,0,.35);color:var(--cream);border:1px solid rgba(245,240,230,.16);border-radius:4px;padding:12px 13px;font-family:var(--sans);font-size:14px;width:100%;outline:none;transition:border-color .18s;}
.bs-field input:focus, .bs-field select:focus, .bs-field textarea:focus{border-color:var(--gold);}
.bs-field input::placeholder, .bs-field textarea::placeholder{color:rgba(245,240,230,.3);}
.bs-field select{cursor:pointer;}
.bs-field select option{background:var(--off-black);color:var(--cream);}
.bs-field textarea{resize:vertical;min-height:64px;}
.bs-hint{font-size:11px;line-height:1.4;color:rgba(245,240,230,.4);}

.bs-field-hint{font-size:11.5px;line-height:1.4;}
.bs-field-hint.err{color:#ff8080;}
.bs-field-hint.ok{color:#5cbe8a;}
.bs-field-hint.muted{color:rgba(245,240,230,.45);}

.bs-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;}
.bs-chip{padding:7px 13px;border-radius:20px;border:1px solid rgba(245,240,230,.18);font-size:12px;color:rgba(245,240,230,.6);background:transparent;cursor:pointer;transition:background .15s,color .15s,border-color .15s;font-family:var(--sans);}
.bs-chip.active{background:var(--gold);color:var(--black);border-color:var(--gold);font-weight:600;}

.bs-toggle{display:flex;gap:8px;margin-bottom:20px;}
.bs-toggle-btn{flex:1;padding:11px 8px;border-radius:6px;border:1px solid rgba(245,240,230,.18);background:transparent;color:rgba(245,240,230,.6);font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.03em;cursor:pointer;transition:background .15s,color .15s,border-color .15s;}
.bs-toggle-btn.active{background:var(--gold);color:var(--black);border-color:var(--gold);}

.bs-terms{font-size:12px;color:rgba(245,240,230,.55);display:flex;align-items:flex-start;gap:9px;margin-bottom:20px;line-height:1.5;}
.bs-terms input{margin-top:2px;flex-shrink:0;}

.bs-submit{width:100%;margin-top:4px;padding:14px;background:var(--gold);color:var(--black);border:none;border-radius:4px;font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .15s,opacity .2s;}
.bs-submit:hover:not(:disabled){background:#f2c835;transform:translateY(-1px);}
.bs-submit:disabled{opacity:.55;cursor:not-allowed;}

.bs-err{margin-top:14px;font-size:13px;color:#ff8080;line-height:1.5;}

.bs-status{text-align:center;padding:8px 0;}
.bs-status-icon{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;font-size:22px;margin-bottom:18px;background:var(--emerald);color:var(--gold);}
.bs-status h2{font-family:var(--serif);font-size:clamp(24px,5vw,36px);letter-spacing:.05em;color:var(--cream);margin-bottom:12px;text-transform:uppercase;}
.bs-status p{font-size:14px;font-weight:300;line-height:1.7;color:rgba(245,240,230,.78);max-width:400px;margin:0 auto;}
.bs-status p strong{color:var(--cream);font-weight:600;}

.bs-back{display:inline-block;margin-top:32px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.45);text-decoration:none;transition:color .2s;}
.bs-back:hover{color:var(--gold);}

@media (max-width:600px){.bs-card{padding:24px 18px;}.bs-row{flex-direction:column;}}
`,
        }}
      />

      <main className="bs-wrap">
        <div className="bs-bg" aria-hidden="true" />
        <div className="bs-veil" aria-hidden="true" />

        <div className="bs-inner">
          <a href="/" className="bs-logo" aria-label="Go OutsYde home">
            <span className="bs-y" aria-hidden="true">Y</span>
            <span className="bs-word">Go OutsYde</span>
          </a>

          {success ? (
            <div className="bs-status">
              <div className="bs-status-icon" aria-hidden="true">✓</div>
              <h2>Application Submitted</h2>
              <p>
                {success.message} You&rsquo;re logged in, and we&rsquo;ll email{" "}
                <strong>{email}</strong> once <strong>{success.businessName}</strong> has been
                reviewed.
              </p>
            </div>
          ) : (
            <>
              <p className="bs-eyebrow">Sell and book on Outsyde</p>
              <h1 className="bs-h1">
                Join as a <span>Vendor</span>
              </h1>
              <p className="bs-sub">
                Create your business profile and submit for approval. You&rsquo;ll be logged in
                right away to build everything else &mdash; your shop goes live once approved and
                subscribed.
              </p>

              <div className="bs-card">
                <form onSubmit={handleSubmit} noValidate>
                  <p className="bs-section-label">Account</p>
                  <div className="bs-row">
                    <div className="bs-field">
                      <label htmlFor="bs-first">First name</label>
                      <input
                        id="bs-first"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jane"
                        required
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="bs-field">
                      <label htmlFor="bs-last">Last name</label>
                      <input
                        id="bs-last"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        required
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  <div className="bs-row">
                    <div className="bs-field">
                      <label htmlFor="bs-middle">Middle name (optional)</label>
                      <input
                        id="bs-middle"
                        type="text"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        placeholder="Optional"
                        autoComplete="additional-name"
                      />
                    </div>
                    <div className="bs-field">
                      <label htmlFor="bs-phone">Phone number</label>
                      <input
                        id="bs-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div className="bs-field">
                    <label htmlFor="bs-email">Email</label>
                    <input
                      id="bs-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="bs-field">
                    <label htmlFor="bs-username">Username</label>
                    <input
                      id="bs-username"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const v = e.target.value.toLowerCase();
                        setUsername(v);
                        if (usernameAvailability !== "idle") setUsernameAvailability("idle");
                        if (usernameError) setUsernameError("");
                      }}
                      onBlur={handleUsernameBlur}
                      placeholder="e.g. jane_smith"
                      required
                      autoComplete="username"
                      style={
                        usernameError
                          ? { borderColor: "#ff8080" }
                          : usernameAvailability === "available"
                            ? { borderColor: "#5cbe8a" }
                            : undefined
                      }
                    />
                    {usernameError && (
                      <span className="bs-field-hint err" role="alert">{usernameError}</span>
                    )}
                    {!usernameError && usernameAvailability === "checking" && (
                      <span className="bs-field-hint muted">Checking&hellip;</span>
                    )}
                    {!usernameError && usernameAvailability === "available" && (
                      <span className="bs-field-hint ok">✓ Username available</span>
                    )}
                    {!usernameError && usernameAvailability === "idle" && (
                      <span className="bs-hint">Lowercase letters, numbers, underscores only &middot; 3&ndash;20 characters</span>
                    )}
                  </div>

                  <div className="bs-row">
                    <div className="bs-field">
                      <label htmlFor="bs-password">Password</label>
                      <input
                        id="bs-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="bs-field">
                      <label htmlFor="bs-confirm">Confirm password</label>
                      <input
                        id="bs-confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <p className="bs-section-label">Business</p>
                  <div className="bs-field">
                    <label htmlFor="bs-bizname">Business name</label>
                    <input
                      id="bs-bizname"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your business name"
                      required
                    />
                  </div>

                  <div className="bs-field">
                    <label htmlFor="bs-category">Business category</label>
                    <select
                      id="bs-category"
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      required
                    >
                      <option value="">Select a category</option>
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bs-field">
                    <label>Industries (select all that apply)</label>
                  </div>
                  <div className="bs-chips">
                    {INDUSTRIES.map((ind) => (
                      <button
                        type="button"
                        key={ind}
                        className={`bs-chip${industries.includes(ind) ? " active" : ""}`}
                        onClick={() => toggleIndustry(ind)}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>

                  <div className="bs-field">
                    <label htmlFor="bs-desc">Description</label>
                    <textarea
                      id="bs-desc"
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      placeholder="Describe your business"
                      rows={3}
                    />
                  </div>

                  <div className="bs-field">
                    <label>What do you offer?</label>
                  </div>
                  <div className="bs-toggle" role="group" aria-label="What your business offers">
                    <button
                      type="button"
                      className={`bs-toggle-btn${offerType === "products" ? " active" : ""}`}
                      onClick={() => setOfferType("products")}
                    >
                      Products
                    </button>
                    <button
                      type="button"
                      className={`bs-toggle-btn${offerType === "services" ? " active" : ""}`}
                      onClick={() => setOfferType("services")}
                    >
                      Services
                    </button>
                    <button
                      type="button"
                      className={`bs-toggle-btn${offerType === "both" ? " active" : ""}`}
                      onClick={() => setOfferType("both")}
                    >
                      Both
                    </button>
                  </div>

                  <p className="bs-section-label">Business details</p>
                  <div className="bs-row">
                    <div className="bs-field">
                      <label htmlFor="bs-years">Years in business</label>
                      <select
                        id="bs-years"
                        value={yearsInBusiness}
                        onChange={(e) => setYearsInBusiness(e.target.value)}
                      >
                        <option value="">Select</option>
                        {YEARS_IN_BUSINESS.map((y) => (
                          <option key={y.value} value={y.value}>{y.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="bs-field">
                      <label htmlFor="bs-structure">Business structure</label>
                      <select
                        id="bs-structure"
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                      >
                        <option value="">Select</option>
                        {BUSINESS_STRUCTURES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="bs-section-label">Location</p>
                  <div className="bs-toggle" role="group" aria-label="Location type">
                    <button
                      type="button"
                      className={`bs-toggle-btn${hasPhysicalLocation ? " active" : ""}`}
                      onClick={() => setHasPhysicalLocation(true)}
                    >
                      Physical location
                    </button>
                    <button
                      type="button"
                      className={`bs-toggle-btn${!hasPhysicalLocation ? " active" : ""}`}
                      onClick={() => setHasPhysicalLocation(false)}
                    >
                      Online only
                    </button>
                  </div>

                  <div className="bs-row">
                    <div className="bs-field">
                      <label htmlFor="bs-city">City you&rsquo;re repping</label>
                      <input
                        id="bs-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Freeport"
                        autoComplete="address-level2"
                      />
                    </div>
                    <div className="bs-field">
                      <label htmlFor="bs-state">State</label>
                      <input
                        id="bs-state"
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="NY"
                        autoComplete="address-level1"
                      />
                    </div>
                  </div>
                  <p className="bs-hint" style={{ margin: "-6px 0 16px 2px" }}>
                    Every business shows a city and state, even online-only ones.
                  </p>

                  {hasPhysicalLocation && (
                    <>
                      <div className="bs-field">
                        <label htmlFor="bs-address">Street address</label>
                        <input
                          id="bs-address"
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Main Street"
                          autoComplete="street-address"
                        />
                      </div>
                      <div className="bs-field">
                        <label htmlFor="bs-zip">ZIP code</label>
                        <input
                          id="bs-zip"
                          type="text"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          placeholder="11520"
                          autoComplete="postal-code"
                        />
                      </div>
                    </>
                  )}

                  <p className="bs-section-label">Online presence</p>
                  <div className="bs-field">
                    <label htmlFor="bs-website">Website (optional)</label>
                    <input
                      id="bs-website"
                      type="text"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourbusiness.com"
                      autoComplete="url"
                    />
                  </div>
                  <div className="bs-field">
                    <label htmlFor="bs-social">Instagram or social handle (optional)</label>
                    <input
                      id="bs-social"
                      type="text"
                      value={socialMedia}
                      onChange={(e) => setSocialMedia(e.target.value)}
                      placeholder="@yourbusiness"
                    />
                  </div>

                  <label className="bs-terms">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                    I agree to Outsyde&rsquo;s vendor terms and subscription requirement.
                  </label>

                  {submitState === "error" && submitError && (
                    <p className="bs-err" role="alert">{submitError}</p>
                  )}

                  <button type="submit" className="bs-submit" disabled={submitState === "submitting"}>
                    {submitState === "submitting" ? "Please wait\u2026" : "Create Business Account"}
                  </button>
                </form>
              </div>
            </>
          )}

          <a href="/" className="bs-back">← Back to Home</a>
        </div>
      </main>
    </>
  );
}