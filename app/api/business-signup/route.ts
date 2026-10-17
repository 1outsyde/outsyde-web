// app/api/business-signup/route.ts
// BFF proxy: creates a vendor account + business application server-side.
//
// POST /api/business-signup
// Body: {
//   firstName, middleName?, lastName, phone?, email, password, username,
//   businessName, businessCategory (label), categoryCode, specialties[], otherDescription?,
//   businessDescription?, offerType: "products" | "services" | "both",
//   isStartup?, isMultiStaff?, employeeCount?, yearsInBusiness?, businessType?,
//   hasPhysicalLocation, address?, city?, state?, zipCode?,
//   billingAddress?, billingCity?, billingState?, billingZipCode?,
//   websiteUrl?, socialMedia?, logoDataUrl? (small JPEG/PNG/WebP data URL, resized in the browser)
// }
//
//   → proxies POST ${OUTSYDE_BACKEND_URL}/api/auth/vendor/signup (industry is validated there
//     against the shared list; a 400 { field: "industry" } is passed through)
//   → forwards Set-Cookie from the backend so the vendor is logged in on outsyde-web
//   → with a logo: the backend holds the admin alert (deferAdminNotification), this route
//     uploads the logo with the new owner's session, saves it on the business, then sends the
//     admin alert itself, so Legend's email includes the logo (2026-10-17)
//   → returns { ok: true, business } on success
//
// firstName / middleName / lastName are joined into the backend's single `name` field.
// The admin alert email comes from the backend only (the old second alert from this site
// was removed 2026-10-17); this route still sends the applicant their confirmation.

import { NextResponse } from "next/server";
import { sendBusinessSignupConfirmation } from "@/lib/emails";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const OFFER_TYPES = new Set(["products", "services", "both"]);
const LOGO_DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

/** `name=value` pairs from Set-Cookie headers, joined for a Cookie request header. */
function cookieHeaderFrom(setCookies: string[]): string {
  return setCookies.map((c) => c.split(";")[0]).filter((c) => c.includes("=")).join("; ");
}

interface BusinessSignupBody {
  firstName?: unknown;
  middleName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  email?: unknown;
  password?: unknown;
  username?: unknown;
  businessName?: unknown;
  businessCategory?: unknown;
  businessDescription?: unknown;
  categoryCode?: unknown;
  specialties?: unknown;
  otherDescription?: unknown;
  offerType?: unknown;
  isStartup?: unknown;
  isMultiStaff?: unknown;
  employeeCount?: unknown;
  yearsInBusiness?: unknown;
  businessType?: unknown;
  hasPhysicalLocation?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zipCode?: unknown;
  websiteUrl?: unknown;
  socialMedia?: unknown;
  billingAddress?: unknown;
  billingCity?: unknown;
  billingState?: unknown;
  billingZipCode?: unknown;
  logoDataUrl?: unknown;
}

export async function POST(req: Request) {
  let body: BusinessSignupBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    firstName,
    middleName,
    lastName,
    phone,
    email,
    password,
    username,
    businessName,
    businessCategory,
    businessDescription,
    categoryCode,
    specialties,
    otherDescription,
    offerType,
    isStartup,
    isMultiStaff,
    employeeCount,
    yearsInBusiness,
    businessType,
    hasPhysicalLocation,
    address,
    city,
    state,
    zipCode,
    websiteUrl,
    socialMedia,
    billingAddress,
    billingCity,
    billingState,
    billingZipCode,
    logoDataUrl,
  } = body;

  // --- input validation ---
  if (typeof firstName !== "string" || !firstName.trim()) {
    return NextResponse.json({ error: "First name is required.", field: "firstName" }, { status: 400 });
  }
  if (typeof lastName !== "string" || !lastName.trim()) {
    return NextResponse.json({ error: "Last name is required.", field: "lastName" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required.", field: "email" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters.", field: "password" },
      { status: 400 },
    );
  }
  if (typeof username !== "string" || !USERNAME_RE.test(username.trim())) {
    return NextResponse.json(
      { error: "Username must be 3\u201320 lowercase letters, numbers, or underscores.", field: "username" },
      { status: 400 },
    );
  }
  if (typeof businessName !== "string" || !businessName.trim()) {
    return NextResponse.json({ error: "Business name is required.", field: "businessName" }, { status: 400 });
  }
  if (typeof businessCategory !== "string" || !businessCategory.trim()) {
    return NextResponse.json({ error: "Business category is required.", field: "businessCategory" }, { status: 400 });
  }
  if (typeof offerType !== "string" || !OFFER_TYPES.has(offerType)) {
    return NextResponse.json({ error: "Select what your business offers.", field: "offerType" }, { status: 400 });
  }
  if (typeof categoryCode !== "string" || !categoryCode.trim()) {
    return NextResponse.json({ error: "Choose your industry.", field: "industry" }, { status: 400 });
  }
  if (!Array.isArray(specialties) || !specialties.every((x) => typeof x === "string")) {
    return NextResponse.json({ error: "Choose what you do.", field: "industry" }, { status: 400 });
  }

  // Optional logo: a small image data URL made in the browser. Decoded here, uploaded after
  // the account exists (the upload needs the new owner's login).
  let logo: { mime: string; bytes: Buffer } | null = null;
  if (logoDataUrl !== undefined && logoDataUrl !== null && logoDataUrl !== "") {
    const m = typeof logoDataUrl === "string" ? LOGO_DATA_URL_RE.exec(logoDataUrl) : null;
    const bytes = m ? Buffer.from(m[2], "base64") : null;
    if (!m || !bytes || bytes.length === 0 || bytes.length > LOGO_MAX_BYTES) {
      return NextResponse.json(
        { error: "Your logo must be a JPG, PNG or WebP image under 2 MB.", field: "logo" },
        { status: 400 },
      );
    }
    logo = { mime: m[1], bytes };
  }

  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  // Backend only stores a single `name` field today — combine parts here.
  const fullName = [firstName, typeof middleName === "string" ? middleName : "", lastName]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");

  const payload = {
    email: email.trim().toLowerCase(),
    password,
    name: fullName,
    phone: str(phone),
    username: username.trim().toLowerCase(),
    businessName: businessName.trim(),
    // Readable label; the backend stores the label of categoryCode from the shared list.
    businessCategory: businessCategory.trim(),
    categoryCode: categoryCode.trim(),
    specialties: (specialties as string[]).map((x) => x.trim()),
    otherDescription: str(otherDescription),
    businessDescription: str(businessDescription),
    offerType,
    isStartup: bool(isStartup),
    isMultiStaff: offerType === "products" ? false : bool(isMultiStaff),
    employeeCount: str(employeeCount),
    yearsInBusiness: str(yearsInBusiness),
    businessType: str(businessType),
    hasPhysicalLocation: hasPhysicalLocation === true,
    address: str(address),
    city: str(city),
    state: str(state),
    zipCode: str(zipCode),
    // Same rule as the app: billing is the business address unless the business is online only.
    billingAddress: hasPhysicalLocation === true ? str(address) : str(billingAddress),
    billingCity: hasPhysicalLocation === true ? str(city) : str(billingCity),
    billingState: hasPhysicalLocation === true ? str(state) : str(billingState),
    billingZipCode: hasPhysicalLocation === true ? str(zipCode) : str(billingZipCode),
    websiteUrl: str(websiteUrl),
    socialMedia: str(socialMedia),
    // Signup form requires the vendor terms/subscription checkbox before this
    // route is ever called — always true by the time we get here.
    acceptedSubscription: true,
    vendorAgreementAccepted: true,
    vendorAgreementAcceptedAt: new Date().toISOString(),
    // With a logo, this route sends the admin alert itself once the logo is saved.
    deferAdminNotification: logo ? true : undefined,
  };

  let signupRes: Response;
  try {
    signupRes = await fetch(`${backendUrl}/api/auth/vendor/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("business-signup: upstream fetch failed", err);
    return NextResponse.json({ error: "Couldn\u2019t reach the server. Please try again." }, { status: 502 });
  }

  let signupData: Record<string, unknown>;
  try {
    signupData = await signupRes.json();
  } catch {
    return NextResponse.json(
      { error: "Unexpected response from server. Please try again." },
      { status: 502 },
    );
  }

  if (!signupRes.ok) {
    const msg =
      typeof signupData.message === "string"
        ? signupData.message
        : typeof signupData.error === "string"
          ? signupData.error
          : "Could not submit your application. Please try again.";
    // Username conflicts (409) and email-already-registered (400) both come
    // back as plain messages from the backend — tag username specifically so
    // the UI can point at the right field.
    if (signupRes.status === 409) {
      return NextResponse.json({ error: msg, field: "username" }, { status: 409 });
    }
    if (signupData.field === "industry") {
      return NextResponse.json({ error: msg, field: "industry" }, { status: signupRes.status });
    }
    return NextResponse.json({ error: msg }, { status: signupRes.status });
  }

  const setCookies =
    typeof signupRes.headers.getSetCookie === "function"
      ? signupRes.headers.getSetCookie()
      : signupRes.headers.get("set-cookie")
        ? [signupRes.headers.get("set-cookie") as string]
        : [];

  const business = (signupData.business ?? null) as { id?: string } | null;
  if (logo && business?.id) {
    await finishLogoAndNotify(backendUrl, business.id, logo, setCookies, payload.email, password);
  }

  // MUST be awaited — on Vercel, a serverless function can be frozen/killed
  // right after the response is returned, which would silently drop any
  // in-flight fetch() to Resend that wasn't awaited first. Failures here are
  // logged but never change the response: the signup itself already
  // succeeded upstream, so an email hiccup shouldn't make it look broken.
  try {
    await sendBusinessSignupConfirmation({
      email: payload.email,
      businessName: payload.businessName,
      ownerName: fullName,
    });
  } catch (err) {
    console.error("business-signup: confirmation email failed", err);
  }

  // Success — forward the session cookie the backend set so the vendor is
  // actually logged in on outsyde-web, not just in the backend's database.
  const response = NextResponse.json({
    ok: true,
    business: signupData.business ?? null,
    message:
      typeof signupData.message === "string"
        ? signupData.message
        : "Your application has been submitted and is pending approval.",
  });

  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie);
  }

  return response;
}

/**
 * Logo signup only: upload the logo as the new owner, save it on the business, then send the
 * admin alert the backend held back. Never throws and never fails the signup. The admin alert
 * is attempted whatever happens to the logo, so Legend always hears about the application.
 */
async function finishLogoAndNotify(
  backendUrl: string,
  businessId: string,
  logo: { mime: string; bytes: Buffer },
  setCookies: string[],
  email: string,
  password: string,
): Promise<void> {
  // The signup response logs the owner in with a session cookie; use it server side.
  let auth: Record<string, string> | null = null;
  const cookie = cookieHeaderFrom(setCookies);
  if (cookie) auth = { Cookie: cookie };

  // Fallback: no session cookie came back, so log in once with the same credentials.
  if (!auth) {
    try {
      const loginRes = await fetch(`${backendUrl}/api/auth/mobile/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = (await loginRes.json().catch(() => ({}))) as { accessToken?: unknown };
      if (loginRes.ok && typeof loginData.accessToken === "string") {
        auth = { Authorization: `Bearer ${loginData.accessToken}` };
      }
    } catch (err) {
      console.error("business-signup: login for logo upload failed", err);
    }
  }

  if (!auth) {
    console.error(`business-signup: ADMIN ALERT NOT SENT for business ${businessId}: no owner session after signup`);
    return;
  }

  try {
    const form = new FormData();
    const ext = logo.mime.split("/")[1] || "jpg";
    form.append("file", new Blob([new Uint8Array(logo.bytes)], { type: logo.mime }), `logo.${ext}`);
    form.append("folder", "logos");
    const uploadRes = await fetch(`${backendUrl}/api/media/upload-image`, { method: "POST", headers: auth, body: form });
    const uploadData = (await uploadRes.json().catch(() => ({}))) as { url?: unknown };
    if (uploadRes.ok && typeof uploadData.url === "string") {
      const saveRes = await fetch(`${backendUrl}/api/vendor/my-business`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ logoImage: uploadData.url }),
      });
      if (!saveRes.ok) console.error(`business-signup: saving logo failed (${saveRes.status}) for business ${businessId}`);
    } else {
      console.error(`business-signup: logo upload failed (${uploadRes.status}) for business ${businessId}`);
    }
  } catch (err) {
    console.error("business-signup: logo upload error", err);
  }

  try {
    const notifyRes = await fetch(`${backendUrl}/api/admin/notifications/business-application`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    if (!notifyRes.ok) console.error(`business-signup: admin alert failed (${notifyRes.status}) for business ${businessId}`);
  } catch (err) {
    console.error("business-signup: admin alert error", err);
  }
}
