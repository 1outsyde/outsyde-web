// app/business-signup/page.tsx
// Public vendor signup page — /business-signup
//
// Flow:
//   1. Collect account + business details in one form. Industry choices come from the
//      shared list (GET /api/taxonomy/business-categories), the same list the app uses.
//   2. POST to /api/business-signup (BFF → outsyde-backend
//      /api/auth/vendor/signup). The BFF forwards the session cookie the
//      backend sets, so the vendor is logged in on outsyde-web immediately.
//   3. Show a success state confirming the application is pending approval.
//
// Styling: inline <style> block, .bs-* namespace, reuses --gold / --cream /
// --black tokens established in app/accept-invite/page.tsx and
// app/coming-soon/page.tsx.

"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { normalizeReferralCode, BUSINESS_REFERRAL_COPY } from "@/lib/referral";
import { Eye, EyeOff } from "lucide-react";
import ExistingAccountHint, { isAlreadyRegistered } from "@/components/ExistingAccountHint";
import { isOtherCode, isTaxonomy, specialtiesFor, type BusinessTaxonomy, type TaxonomySpecialty } from "@/lib/business-taxonomy";

const noopSubscribe = () => () => {};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// Same stored values as the app (BusinessSignupScreen.tsx), so both signups save identical data.
const YEARS_IN_BUSINESS = [
  "Just starting",
  "Less than 1 year",
  "1-2 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
];

const EMPLOYEE_COUNTS = ["Just me", "2-5", "6-10", "11-25", "26-50", "51-100", "100+"];

const BUSINESS_STRUCTURES = ["Sole Proprietor", "LLC", "Corporation", "Partnership", "Nonprofit", "Other"];

const OTHER_DESCRIPTION_MAX = 500;
const LOGO_MAX_SIDE = 512;

/** Resize a picked image in the browser to a small JPEG data URL (max 512px on the long side). */
function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // username field: inline format/availability feedback (same pattern as accept-invite)
  const [usernameError, setUsernameError] = useState("");
  const [usernameAvailability, setUsernameAvailability] = useState<UsernameAvailability>("idle");

  // business
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [offerType, setOfferType] = useState<OfferType>("");

  // industry (shared list from the backend)
  const [taxonomy, setTaxonomy] = useState<BusinessTaxonomy | null>(null);
  const [taxonomyError, setTaxonomyError] = useState(false);
  const [categoryCode, setCategoryCode] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [otherDescription, setOtherDescription] = useState("");

  // logo (optional)
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoError, setLogoError] = useState("");

  // business details
  const [isStartup, setIsStartup] = useState<boolean | null>(null);
  const [isMultiStaff, setIsMultiStaff] = useState<boolean | null>(null);
  const [employeeCount, setEmployeeCount] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [businessType, setBusinessType] = useState("");

  // location
  const [hasPhysicalLocation, setHasPhysicalLocation] = useState(true);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZipCode, setBillingZipCode] = useState("");

  // online presence
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialMedia, setSocialMedia] = useState("");

  // Referral code (2026-10-24): prefilled from ?ref= (the /r/<CODE> invite page), editable, optional.
  // Read from the URL on the client so nothing changes for signups without a code.
  const search = useSyncExternalStore(noopSubscribe, () => window.location.search, () => "");
  const [typedReferral, setTypedReferral] = useState<string | null>(null);
  const referralInput = typedReferral ?? normalizeReferralCode(new URLSearchParams(search).get("ref")) ?? "";
  const referralCode = normalizeReferralCode(referralInput);
  const referralInvalid = referralInput.trim() !== "" && !referralCode;

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<{ message: string; businessName: string; referralApplied: boolean } | null>(null);

  const [currentStep, setCurrentStep] = useState<0 | 1>(0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);

  async function fetchTaxonomy(): Promise<BusinessTaxonomy | null> {
    try {
      const res = await fetch("/api/taxonomy/business-categories");
      const data: unknown = await res.json().catch(() => null);
      return res.ok && isTaxonomy(data) ? data : null;
    } catch {
      return null;
    }
  }

  function applyTaxonomy(t: BusinessTaxonomy | null) {
    if (t) setTaxonomy(t);
    else setTaxonomyError(true);
  }

  function loadTaxonomy() {
    setTaxonomyError(false);
    fetchTaxonomy().then(applyTaxonomy);
  }

  useEffect(() => {
    let cancelled = false;
    fetchTaxonomy().then((t) => {
      if (!cancelled) applyTaxonomy(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const category = useMemo(
    () => taxonomy?.categories.find((c) => c.code === categoryCode),
    [taxonomy, categoryCode],
  );
  const maxSpecialties = taxonomy?.maxSpecialties ?? 3;
  const availableSpecialties = specialtiesFor(category, offerType);
  const serviceChoices = availableSpecialties.filter((s) => s.kind === "service");
  const productChoices = availableSpecialties.filter((s) => s.kind === "product");
  const needsOtherDescription = categoryCode === "other" || specialties.some(isOtherCode);
  const offersServices = offerType === "services" || offerType === "both";

  function chooseOffer(next: OfferType) {
    setOfferType(next);
    // Drop picks that no longer fit (e.g. product picks after switching to services only).
    const allowed = new Set(specialtiesFor(category, next).map((s) => s.code));
    setSpecialties((prev) => prev.filter((c) => allowed.has(c)));
    if (next === "products") setIsMultiStaff(null);
  }

  function chooseCategory(code: string) {
    if (code === categoryCode) return;
    setCategoryCode(code);
    setSpecialties([]);
  }

  function toggleSpecialty(code: string) {
    setSpecialties((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= maxSpecialties) return prev;
      return [...prev, code];
    });
  }

  async function handleLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setLogoError("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(file.type)) {
      setLogoError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    try {
      const dataUrl = await resizeLogo(file);
      if (dataUrl.length > 2_000_000) {
        setLogoError("That image is too large. Please choose a smaller one.");
        return;
      }
      setLogoDataUrl(dataUrl);
    } catch {
      setLogoError("We couldn\u2019t read that image. Please try a JPG or PNG.");
    }
  }

  function renderSpecialtyChips(list: TaxonomySpecialty[]) {
    return (
      <div className="bs-chips">
        {list.map((sp) => {
          const active = specialties.includes(sp.code);
          const full = !active && specialties.length >= maxSpecialties;
          return (
            <button
              type="button"
              key={sp.code}
              className={`bs-chip${active ? " active" : ""}`}
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
    if (!offerType) {
      setSubmitError("Let us know what your business offers.");
      return;
    }
    if (!category) {
      setSubmitError(taxonomyError ? "We couldn\u2019t load the industry list. Please try again." : "Choose your industry.");
      return;
    }
    if (categoryCode !== "other" && specialties.length === 0) {
      setSubmitError("Choose at least one thing you do.");
      return;
    }
    if (needsOtherDescription && !otherDescription.trim()) {
      setSubmitError("Tell us what your business does.");
      return;
    }
    if (otherDescription.trim().length > OTHER_DESCRIPTION_MAX) {
      setSubmitError(`Please keep your description under ${OTHER_DESCRIPTION_MAX} characters.`);
      return;
    }
    if (!acceptedTerms) {
      setSubmitError("You\u2019ll need to accept the vendor terms to continue.");
      return;
    }

    if (currentStep === 0) {
      setCurrentStep(1);
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
          businessCategory: category.label,
          categoryCode,
          specialties,
          otherDescription: needsOtherDescription ? otherDescription.trim() : undefined,
          businessDescription: businessDescription.trim() || undefined,
          offerType,
          isStartup: isStartup ?? undefined,
          isMultiStaff: offersServices ? isMultiStaff ?? undefined : false,
          employeeCount: employeeCount || undefined,
          yearsInBusiness: yearsInBusiness || undefined,
          businessType: businessType || undefined,
          hasPhysicalLocation,
          address: hasPhysicalLocation ? address.trim() || undefined : undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zipCode: hasPhysicalLocation ? zipCode.trim() || undefined : undefined,
          billingAddress: !hasPhysicalLocation ? billingAddress.trim() || undefined : undefined,
          billingCity: !hasPhysicalLocation ? billingCity.trim() || undefined : undefined,
          billingState: !hasPhysicalLocation ? billingState.trim() || undefined : undefined,
          billingZipCode: !hasPhysicalLocation ? billingZipCode.trim() || undefined : undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          socialMedia: socialMedia.trim() || undefined,
          logoDataUrl: logoDataUrl || undefined,
          ...(referralCode ? { referralCode } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitState("error");
        if (data.field === "username" && data.error) {
          setUsernameError(data.error);
          setUsernameAvailability("taken");
          // The username field is on the first step.
          setCurrentStep(0);
          return;
        }
        if (data.field === "industry" || data.field === "logo") {
          setSubmitError(data.error || "Please check your industry choices.");
          setCurrentStep(0);
          return;
        }
        setSubmitError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSuccess({
        message: data.message || "Your application has been submitted and is pending approval.",
        businessName: businessName.trim(),
        referralApplied: data.referralApplied === true,
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
.pw-wrap{position:relative;}
.pw-wrap input{padding-right:42px;}
.pw-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(245,240,230,.45);padding:0;display:flex;align-items:center;line-height:1;}
.pw-toggle:hover{color:rgba(245,240,230,.8);}
.bs-field-hint.ok{color:#5cbe8a;}
.bs-field-hint.muted{color:rgba(245,240,230,.45);}

.bs-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;}
.bs-chip{padding:7px 13px;border-radius:20px;border:1px solid rgba(245,240,230,.18);font-size:12px;color:rgba(245,240,230,.6);background:transparent;cursor:pointer;transition:background .15s,color .15s,border-color .15s;font-family:var(--sans);}
.bs-chip.active{background:var(--gold);color:var(--black);border-color:var(--gold);font-weight:600;}
.bs-chip:disabled{opacity:.35;cursor:not-allowed;}
.bs-sub-label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.45);margin:0 0 8px;}
.bs-link-btn{background:none;border:none;padding:0;color:var(--gold);font-family:var(--sans);font-size:12px;cursor:pointer;text-decoration:underline;}
.bs-logo-row{display:flex;align-items:center;gap:14px;}
.bs-field .bs-logo-pick{width:72px;height:72px;border-radius:50%;border:1px dashed rgba(232,185,48,.6);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;font-size:11px;color:var(--gold);letter-spacing:.06em;text-transform:none !important;}
.bs-field .bs-logo-pick img{width:100%;height:100%;object-fit:cover;}

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

/* ── Vendor Agreement Step ── */
.bs-agreement-card{background:rgba(255,255,255,.97);border-radius:8px;max-width:640px;width:100%;margin:0 auto;text-align:left;}
.bs-agreement-title{font-family:var(--serif);font-size:26px;letter-spacing:.04em;color:#000;margin-bottom:6px;text-transform:uppercase;}
.bs-agreement-subtitle{font-size:14px;color:#555;margin-bottom:20px;}
.bs-agreement-scroll{max-height:380px;overflow-y:scroll;border:1px solid #ddd;border-radius:8px;padding:20px;background:#fafafa;scroll-behavior:smooth;}
.bs-ag-section-header{font-weight:700;font-size:12px;color:#000;margin-top:18px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;}
.bs-ag-subsection{font-weight:600;font-size:13px;color:#222;margin-top:12px;margin-bottom:2px;}
.bs-ag-body{font-size:13px;color:#444;line-height:1.65;margin-bottom:4px;}
.bs-ag-warning{font-size:13px;color:#c0392b;font-weight:600;margin-bottom:8px;}
.bs-ag-scroll-hint{font-size:12px;color:var(--gold);text-align:center;margin-top:10px;font-style:italic;}
.bs-ag-checkbox-row{display:flex;align-items:flex-start;gap:12px;margin-top:18px;cursor:pointer;}
.bs-ag-checkbox-disabled{opacity:.4;cursor:not-allowed;}
.bs-ag-checkbox-input{width:18px;height:18px;margin-top:2px;accent-color:var(--gold);flex-shrink:0;cursor:inherit;}
.bs-ag-checkbox-label{font-size:14px;color:#111;line-height:1.5;}
.bs-ag-actions{display:flex;align-items:center;justify-content:space-between;margin-top:28px;gap:16px;}
.bs-ag-back-btn{background:transparent;border:1px solid #ccc;border-radius:6px;padding:10px 20px;font-size:14px;color:#555;cursor:pointer;font-family:var(--sans);}
.bs-ag-back-btn:hover{border-color:#000;color:#000;}
.bs-submit-disabled{opacity:.45;cursor:not-allowed;}
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
              {success.referralApplied && <p>{BUSINESS_REFERRAL_COPY.codeApplied}</p>}
            </div>
          ) : currentStep === 1 ? (
            <div className="bs-card bs-agreement-card">
              <form onSubmit={handleSubmit} noValidate>
                <h2 className="bs-agreement-title">Vendor Agreement</h2>
                <p className="bs-agreement-subtitle">Read the full agreement below, then check the box to confirm.</p>

                <div
                  className="bs-agreement-scroll"
                  onScroll={(e: React.UIEvent<HTMLDivElement>) => {
                    const el = e.currentTarget;
                    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
                    if (atBottom && !hasScrolledToBottom) setHasScrolledToBottom(true);
                  }}
                >
                  <p className="bs-ag-section-header">OUTSYDE VENDOR MARKETPLACE AGREEMENT</p>
                  <p className="bs-ag-body"><em>Payment Processing Compliance &amp; Permitted Products Addendum</em></p>

                  <p className="bs-ag-section-header">1. Parties &amp; Purpose</p>
                  <p className="bs-ag-body">This agreement is between Outsyde, LLC and you, the Vendor, governing your access to the Outsyde marketplace. It establishes explicit standards for permitted products and protects both parties from payment processing disruptions caused by violations of Stripe&rsquo;s policies.</p>

                  <p className="bs-ag-section-header">2. Payment Processor Compliance</p>
                  <p className="bs-ag-body">Outsyde processes all vendor payments through Stripe Connect. Stripe maintains a Prohibited and Restricted Businesses list. Violations may result in immediate account termination and fund holds of 90&ndash;180+ days without prior notice. This step exists to ensure no vendor listing puts the Platform or fellow vendors at risk.</p>

                  <p className="bs-ag-section-header">3. Explicitly Permitted Products</p>
                  <p className="bs-ag-body">Approved without additional review: physical goods (apparel, home goods, art, electronics, beauty products without medical claims, packaged food and non-alcoholic beverages, fitness equipment, pet products, outdoor gear); digital products (downloads, photography, creative services, coaching, courses, event planning); event services (ticketing, catering, entertainment bookings, photography); professional services (moving, cleaning, contracting, notary).</p>

                  <p className="bs-ag-section-header">4. Explicitly Prohibited Products &mdash; Read Carefully</p>
                  <p className="bs-ag-warning">The following are strictly prohibited and may not be listed on Outsyde under any circumstances:</p>

                  <p className="bs-ag-subsection">Tobacco &amp; Smoking Products</p>
                  <p className="bs-ag-body">Cigarettes (tobacco or herbal), pre-rolled cones or sticks of ANY plant material intended for smoking &mdash; including hemp, lavender, chamomile, eucalyptus, or any other botanical &mdash; herbal cigarettes, loose smoking blends, vape pens, vape cartridges, e-cigarette products of any kind. Labeling a pre-rolled product as &ldquo;aromatherapy&rdquo; does not exempt it. The physical form of the product controls its classification.</p>

                  <p className="bs-ag-subsection">Cannabis &amp; CBD</p>
                  <p className="bs-ag-body">THC-containing products of any kind, CBD products exceeding 0.3% THC by dry weight, CBD edibles or ingestibles, hemp flower sold for smoking.</p>

                  <p className="bs-ag-subsection">Alcohol</p>
                  <p className="bs-ag-body">Alcoholic beverages of any kind &mdash; beer, wine, spirits, hard seltzers &mdash; and alcohol subscription boxes or delivery services.</p>

                  <p className="bs-ag-subsection">Adult Content &amp; Services</p>
                  <p className="bs-ag-body">Pornographic or sexually explicit content in any format, escort or companionship services, adult novelty products, AI-generated adult content.</p>

                  <p className="bs-ag-subsection">Gambling &amp; Games of Chance</p>
                  <p className="bs-ag-body">Online casino services, poker, sports betting, fantasy sports with real-money prizes, lotteries, sweepstakes where prizes are contingent on purchase, bidding-fee auctions.</p>

                  <p className="bs-ag-subsection">Weapons &amp; Dangerous Items</p>
                  <p className="bs-ag-body">Firearms, ammunition, switchblades or other weapons prohibited by law, explosives, pyrotechnics, replica or unregistered weapon facsimiles.</p>

                  <p className="bs-ag-subsection">Pharmaceutical &amp; Medical Products</p>
                  <p className="bs-ag-body">Prescription medications, supplements or vitamins making disease-prevention or cure claims (FDA prohibited without approval), prescription veterinary products.</p>

                  <p className="bs-ag-subsection">Financial Services &amp; Fraud</p>
                  <p className="bs-ag-body">Unlicensed investment or securities services, cryptocurrency or NFT sales, payday loans, debt settlement or credit repair services, pyramid schemes or MLM structures with recruitment-based income.</p>

                  <p className="bs-ag-subsection">Counterfeit Goods &amp; IP Violations</p>
                  <p className="bs-ag-body">Counterfeit goods of any brand, pirated software or media, products using trademarked names or logos without authorization, fake identification documents or credentials.</p>

                  <p className="bs-ag-subsection">Illegal Activity</p>
                  <p className="bs-ag-body">Any product or service that is illegal under applicable federal, state, or local law.</p>

                  <p className="bs-ag-section-header">5. Restricted Categories &mdash; Prior Approval Required</p>
                  <p className="bs-ag-body">The following require written approval from Outsyde before listing: herbal supplements and ingestible wellness products, food products with health claims, age-restricted products (18+/21+), subscription box services, extended warranties over 12 months, telehealth or wellness consultation services. Email vendors@outsyde.com with subject &ldquo;Category Approval Request&rdquo; before listing any of these.</p>

                  <p className="bs-ag-section-header">6. Vendor Representations</p>
                  <p className="bs-ag-body">By agreeing, you confirm: (a) all your listed products fall within permitted categories or you have received written approval; (b) all listings are truthful and not deceptively described to evade compliance review; (c) you will notify Outsyde immediately if any product may conflict with this Agreement; (d) you hold all required licenses, permits, and regulatory approvals for your products.</p>

                  <p className="bs-ag-section-header">7. Enforcement</p>
                  <p className="bs-ag-body">Violations may result in immediate listing removal, account suspension, payout holds up to 90 days, or permanent termination. If Outsyde&rsquo;s Stripe account incurs holds, fund freezes, or penalties as a direct result of your prohibited product listings, you may be held financially liable for documented losses including held funds, chargeback fees, and platform remediation costs.</p>

                  <p className="bs-ag-section-header">8. Governing Law</p>
                  <p className="bs-ag-body">This Agreement is governed by the laws of the State of New York. Disputes are resolved by binding arbitration under AAA rules in Nassau County, NY.</p>

                  <p className="bs-ag-body" style={{ marginTop: "16px", fontStyle: "italic" }}>
                    By checking the box below, you confirm you have read this Agreement in full and agree to be bound by its terms.
                  </p>
                </div>

                {!hasScrolledToBottom && (
                  <p className="bs-ag-scroll-hint">↓ Scroll through the agreement to enable the checkbox</p>
                )}

                <label className={`bs-ag-checkbox-row${!hasScrolledToBottom ? " bs-ag-checkbox-disabled" : ""}`}>
                  <input
                    type="checkbox"
                    className="bs-ag-checkbox-input"
                    checked={agreementChecked}
                    disabled={!hasScrolledToBottom}
                    onChange={(e) => setAgreementChecked(e.target.checked)}
                  />
                  <span className="bs-ag-checkbox-label">
                    I have read the Outsyde Vendor Agreement in full and agree to its terms
                  </span>
                </label>

                {submitState === "error" && submitError && (
                  <><p className="bs-err" role="alert">{submitError}</p>{isAlreadyRegistered(submitError) && <ExistingAccountHint email={email} />}</>
                )}

                <div className="bs-ag-actions">
                  <button
                    type="button"
                    className="bs-ag-back-btn"
                    onClick={() => {
                      setCurrentStep(0);
                      setHasScrolledToBottom(false);
                      setAgreementChecked(false);
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className={`bs-submit${!agreementChecked ? " bs-submit-disabled" : ""}`}
                    disabled={!agreementChecked || submitState === "submitting"}
                  >
                    {submitState === "submitting" ? "Please wait…" : "Confirm & Submit Application"}
                  </button>
                </div>
              </form>
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
                        if (/[^a-z0-9_]/.test(v)) {
                          setUsernameError("Only letters, numbers, and underscores allowed.");
                        } else if (usernameError) {
                          setUsernameError("");
                        }
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
                      <span className="bs-hint">Only letters, numbers, and underscores allowed. 3&ndash;20 characters.</span>
                    )}
                  </div>

                  <div className="bs-row">
                    <div className="bs-field">
                      <label htmlFor="bs-password">Password</label>
                      <div className="pw-wrap">
                        <input
                          id="bs-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                          required
                          autoComplete="new-password"
                        />
                        <button type="button" className="pw-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="bs-field">
                      <label htmlFor="bs-confirm">Confirm password</label>
                      <div className="pw-wrap">
                        <input
                          id="bs-confirm"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          required
                          autoComplete="new-password"
                        />
                        <button type="button" className="pw-toggle" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
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
                    <label>Logo (optional)</label>
                    <div className="bs-logo-row">
                      <label className="bs-logo-pick" htmlFor="bs-logo">
                        {logoDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoDataUrl} alt="Your logo" />
                        ) : (
                          <span>Add logo</span>
                        )}
                      </label>
                      <input
                        id="bs-logo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        onChange={handleLogoPick}
                        style={{ display: "none" }}
                      />
                      {logoDataUrl && (
                        <button type="button" className="bs-link-btn" onClick={() => setLogoDataUrl("")}>
                          Remove
                        </button>
                      )}
                    </div>
                    {logoError && <span className="bs-field-hint err" role="alert">{logoError}</span>}
                  </div>

                  <div className="bs-field">
                    <label>What do you offer?</label>
                  </div>
                  <div className="bs-toggle" role="group" aria-label="What your business offers">
                    <button
                      type="button"
                      className={`bs-toggle-btn${offerType === "products" ? " active" : ""}`}
                      onClick={() => chooseOffer("products")}
                    >
                      Products
                    </button>
                    <button
                      type="button"
                      className={`bs-toggle-btn${offerType === "services" ? " active" : ""}`}
                      onClick={() => chooseOffer("services")}
                    >
                      Services
                    </button>
                    <button
                      type="button"
                      className={`bs-toggle-btn${offerType === "both" ? " active" : ""}`}
                      onClick={() => chooseOffer("both")}
                    >
                      Both
                    </button>
                  </div>

                  <div className="bs-field">
                    <label>Industry</label>
                  </div>
                  {taxonomyError ? (
                    <p className="bs-field-hint err" style={{ marginBottom: 20 }}>
                      We couldn&rsquo;t load the industry list.{" "}
                      <button type="button" className="bs-link-btn" onClick={loadTaxonomy}>Try again</button>
                    </p>
                  ) : !taxonomy ? (
                    <p className="bs-hint" style={{ marginBottom: 20 }}>Loading industries&hellip;</p>
                  ) : (
                    <div className="bs-chips" role="radiogroup" aria-label="Industry">
                      {taxonomy.categories.map((c) => (
                        <button
                          type="button"
                          key={c.code}
                          role="radio"
                          aria-checked={categoryCode === c.code}
                          className={`bs-chip${categoryCode === c.code ? " active" : ""}`}
                          onClick={() => chooseCategory(c.code)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {category && category.code !== "other" && (
                    <>
                      <div className="bs-field">
                        <label>What do you do? (pick up to {maxSpecialties})</label>
                        {!offerType && (
                          <span className="bs-hint">Choose products, services or both above to see your options.</span>
                        )}
                      </div>
                      {offerType === "both" ? (
                        <>
                          <p className="bs-sub-label">Services</p>
                          {renderSpecialtyChips(serviceChoices)}
                          <p className="bs-sub-label">Products</p>
                          {renderSpecialtyChips(productChoices)}
                        </>
                      ) : (
                        offerType && renderSpecialtyChips(availableSpecialties)
                      )}
                    </>
                  )}

                  {needsOtherDescription && (
                    <div className="bs-field">
                      <label htmlFor="bs-other">Tell us what you do</label>
                      <textarea
                        id="bs-other"
                        value={otherDescription}
                        onChange={(e) => setOtherDescription(e.target.value.slice(0, OTHER_DESCRIPTION_MAX))}
                        placeholder="Describe your business in your own words"
                        rows={3}
                        maxLength={OTHER_DESCRIPTION_MAX}
                      />
                      <span className="bs-hint">{otherDescription.length}/{OTHER_DESCRIPTION_MAX}</span>
                    </div>
                  )}

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

                  <p className="bs-section-label">Business details</p>
                  <div className="bs-field">
                    <label>Is this a startup? (less than 2 years old)</label>
                  </div>
                  <div className="bs-toggle" role="group" aria-label="Is this a startup">
                    <button
                      type="button"
                      className={`bs-toggle-btn${isStartup === true ? " active" : ""}`}
                      onClick={() => setIsStartup(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`bs-toggle-btn${isStartup === false ? " active" : ""}`}
                      onClick={() => setIsStartup(false)}
                    >
                      No
                    </button>
                  </div>

                  {offersServices && (
                    <>
                      <div className="bs-field">
                        <label>Do team members each take their own appointments?</label>
                        <span className="bs-hint">
                          Choose Yes if each person books their own clients, like barbers or stylists in one shop.
                          Choose No if one person manages all bookings.
                        </span>
                      </div>
                      <div className="bs-toggle" role="group" aria-label="Multiple team members take appointments">
                        <button
                          type="button"
                          className={`bs-toggle-btn${isMultiStaff === true ? " active" : ""}`}
                          onClick={() => setIsMultiStaff(true)}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`bs-toggle-btn${isMultiStaff === false ? " active" : ""}`}
                          onClick={() => setIsMultiStaff(false)}
                        >
                          No
                        </button>
                      </div>
                    </>
                  )}

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
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="bs-field">
                      <label htmlFor="bs-employees">Number of employees</label>
                      <select
                        id="bs-employees"
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(e.target.value)}
                      >
                        <option value="">Select</option>
                        {EMPLOYEE_COUNTS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="bs-field">
                    <label htmlFor="bs-structure">Business structure</label>
                    <select
                      id="bs-structure"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                    >
                      <option value="">Select</option>
                      {BUSINESS_STRUCTURES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
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

                  {!hasPhysicalLocation && (
                    <>
                      <div className="bs-field">
                        <label htmlFor="bs-bill-street">Billing address</label>
                        <span className="bs-hint">Used for payout verification only. Not shown publicly.</span>
                        <input
                          id="bs-bill-street"
                          type="text"
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          placeholder="123 Main Street"
                          autoComplete="billing street-address"
                        />
                      </div>
                      <div className="bs-row">
                        <div className="bs-field">
                          <label htmlFor="bs-bill-city">Billing city</label>
                          <input
                            id="bs-bill-city"
                            type="text"
                            value={billingCity}
                            onChange={(e) => setBillingCity(e.target.value)}
                            autoComplete="billing address-level2"
                          />
                        </div>
                        <div className="bs-field">
                          <label htmlFor="bs-bill-state">State</label>
                          <input
                            id="bs-bill-state"
                            type="text"
                            value={billingState}
                            onChange={(e) => setBillingState(e.target.value)}
                            autoComplete="billing address-level1"
                          />
                        </div>
                        <div className="bs-field">
                          <label htmlFor="bs-bill-zip">ZIP</label>
                          <input
                            id="bs-bill-zip"
                            type="text"
                            value={billingZipCode}
                            onChange={(e) => setBillingZipCode(e.target.value)}
                            autoComplete="billing postal-code"
                          />
                        </div>
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
                  <div className="bs-field">
                    <label htmlFor="bs-referral">{BUSINESS_REFERRAL_COPY.fieldLabel}</label>
                    <input
                      id="bs-referral"
                      type="text"
                      value={referralInput}
                      onChange={(e) => setTypedReferral(e.target.value)}
                      placeholder="ABC12345"
                      autoCapitalize="characters"
                      autoComplete="off"
                      maxLength={20}
                      aria-invalid={referralInvalid || undefined}
                      aria-describedby={referralInvalid ? "bs-referral-hint" : undefined}
                    />
                    {referralInvalid && (
                      <p id="bs-referral-hint" className="bs-hint">Codes use letters and numbers only.</p>
                    )}
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
                    <><p className="bs-err" role="alert">{submitError}</p>{isAlreadyRegistered(submitError) && <ExistingAccountHint email={email} />}</>
                  )}

                  <button type="submit" className="bs-submit" disabled={submitState === "submitting"}>
                    {submitState === "submitting" ? "Please wait\u2026" : "Submit Application"}
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