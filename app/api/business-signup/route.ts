// app/api/business-signup/route.ts
// BFF proxy — creates a vendor account + business application server-side.
//
// POST /api/business-signup
// Body: {
//   firstName, middleName?, lastName, phone?, email, password, username,
//   businessName, businessCategory, businessDescription?, industries?,
//   offerType: "products" | "services" | "both",
//   yearsInBusiness?, businessType?,
//   hasPhysicalLocation, address?, city?, state?, zipCode?,
//   websiteUrl?, socialMedia?
// }
//
//   → proxies POST ${OUTSYDE_BACKEND_URL}/api/auth/vendor/signup
//   → forwards Set-Cookie from the backend so the vendor is logged in on
//     outsyde-web immediately (unlike accept-invite/complete, which never
//     establishes a browser session — this route intentionally does)
//   → returns { ok: true, business } on success
//
// NOTE — two fields are collected here but NOT yet persisted by the backend
// as of this writing:
//   - firstName / lastName are concatenated into a single `name` field
//     because vendorSignupSchema only has `name`, not separate columns.
//   - `industries` has no matching column read by the route handler (closest
//     candidate is the `knownFor` jsonb array on businesses, but the current
//     /api/auth/vendor/signup handler doesn't map it). Sent anyway so this
//     starts working the moment the backend adds support — check with the
//     backend before assuming these are saved.

import { NextResponse } from "next/server";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const OFFER_TYPES = new Set(["products", "services", "both"]);

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
  industries?: unknown;
  offerType?: unknown;
  yearsInBusiness?: unknown;
  businessType?: unknown;
  hasPhysicalLocation?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zipCode?: unknown;
  websiteUrl?: unknown;
  socialMedia?: unknown;
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
    industries,
    offerType,
    yearsInBusiness,
    businessType,
    hasPhysicalLocation,
    address,
    city,
    state,
    zipCode,
    websiteUrl,
    socialMedia,
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
    // Sent alongside `name` in case the backend adds column support later —
    // harmless today since the schema only reads `name`.
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
    username: username.trim().toLowerCase(),
    businessName: businessName.trim(),
    businessCategory: businessCategory.trim(),
    businessDescription:
      typeof businessDescription === "string" && businessDescription.trim()
        ? businessDescription.trim()
        : undefined,
    // See note at top of file — not yet mapped by the backend handler.
    industries: Array.isArray(industries) ? industries : undefined,
    offerType,
    yearsInBusiness:
      typeof yearsInBusiness === "string" && yearsInBusiness.trim() ? yearsInBusiness.trim() : undefined,
    businessType: typeof businessType === "string" && businessType.trim() ? businessType.trim() : undefined,
    hasPhysicalLocation: hasPhysicalLocation === true,
    address: typeof address === "string" && address.trim() ? address.trim() : undefined,
    city: typeof city === "string" && city.trim() ? city.trim() : undefined,
    state: typeof state === "string" && state.trim() ? state.trim() : undefined,
    zipCode: typeof zipCode === "string" && zipCode.trim() ? zipCode.trim() : undefined,
    websiteUrl: typeof websiteUrl === "string" && websiteUrl.trim() ? websiteUrl.trim() : undefined,
    socialMedia: typeof socialMedia === "string" && socialMedia.trim() ? socialMedia.trim() : undefined,
    // Signup form requires the vendor terms/subscription checkbox before this
    // route is ever called — always true by the time we get here.
    acceptedSubscription: true,
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
    return NextResponse.json({ error: msg }, { status: signupRes.status });
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

  const setCookies =
    typeof signupRes.headers.getSetCookie === "function"
      ? signupRes.headers.getSetCookie()
      : signupRes.headers.get("set-cookie")
        ? [signupRes.headers.get("set-cookie") as string]
        : [];

  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie);
  }

  return response;
}