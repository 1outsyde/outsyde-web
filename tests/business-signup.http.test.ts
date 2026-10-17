/**
 * Business signup BFF + admin detail BFF (2026-10-17) — HTTP tests.
 *
 * Run with: npx tsx tests/business-signup.http.test.ts
 *
 * LOCAL ONLY. Needs this site running (`next start`) with OUTSYDE_BACKEND_URL pointing at a
 * localhost outsyde-backend (backend #304 + migration 047) on a scratch Postgres, and a fake
 * R2 for logo uploads. Environment variables:
 *   BS_WEB_URL     e.g. http://localhost:3100   (must be localhost)
 *   BS_PG_URL      the backend's scratch database (localhost only; reads + cleans up)
 *   BS_ADMIN_TOKEN a JWT for an allowed admin user on that backend (for the admin BFF check)
 *   BS_BACKEND_DIR path to an outsyde-backend checkout; `pg` is loaded from its node_modules
 *                  (this site does not depend on pg)
 * Skips (exit 0) when BS_WEB_URL is unset.
 *
 * Mutation check: remove `deferAdminNotification: logo ? true : undefined` from the BFF payload
 * → "logo signup: exactly one admin alert" fails (two alerts: backend + this route).
 */
import { createRequire } from "module";

const WEB = process.env.BS_WEB_URL;
const PG_URL = process.env.BS_PG_URL;
const ADMIN_TOKEN = process.env.BS_ADMIN_TOKEN;

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.error(`  ❌ ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 500)); }
}
const isLocal = (u: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);

// 2x2 red JPEG.
const TINY_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

async function post(path: string, body: unknown) {
  const res = await fetch(new URL(path, WEB), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null), setCookie: res.headers.get("set-cookie") };
}

(async () => {
  if (!WEB) { console.log("⏭  skipped: set BS_WEB_URL + BS_PG_URL to run"); process.exit(0); }
  if (!PG_URL || !isLocal(WEB) || !isLocal(PG_URL)) throw new Error("refusing to run: BS_WEB_URL and BS_PG_URL must both be localhost");
  if (!process.env.BS_BACKEND_DIR) throw new Error("set BS_BACKEND_DIR to an outsyde-backend checkout (for pg)");
  const pg = createRequire(`${process.env.BS_BACKEND_DIR.replace(/\/+$/, "")}/package.json`)("pg");
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();
  const q = async (t: string, p: unknown[] = []) => (await db.query(t, p)).rows as any[];

  const P = `wb${Date.now().toString(36)}`;
  const email = (s: string) => `${P}-${s}@test.local`;
  const body = (s: string, over: Record<string, unknown> = {}) => ({
    firstName: "Dede", middleName: "L", lastName: s, phone: "5165550101", email: email(s), password: "secret123",
    username: `${P}${s}`.slice(0, 20), businessName: `${P} ${s}`, businessCategory: "Beauty & Personal Care",
    categoryCode: "beauty", specialties: ["beauty.service.braids_locs"], businessDescription: "We braid",
    offerType: "services", isStartup: true, isMultiStaff: true, employeeCount: "2-5", yearsInBusiness: "1-2 years",
    businessType: "LLC", hasPhysicalLocation: false, city: "Freeport", state: "NY",
    billingAddress: "2 Bill Rd", billingCity: "Hempstead", billingState: "NY", billingZipCode: "11550",
    websiteUrl: "https://braids.test", socialMedia: "@braidstest",
    ...over,
  });
  const biz = async (s: string) => (await q(`SELECT * FROM businesses WHERE name = $1`, [`${P} ${s}`]))[0];
  const users = async (s: string) => (await q(`SELECT count(*)::int n FROM users WHERE email = $1`, [email(s)]))[0].n;
  const alerts = async (id: string) =>
    (await q(`SELECT count(*)::int n FROM notifications WHERE type = 'new_vendor_application' AND reference_id = $1`, [id]))[0].n;

  try {
    console.log("GET /api/taxonomy/business-categories");
    const tx = await fetch(new URL("/api/taxonomy/business-categories", WEB));
    const txb = await tx.json();
    assert(tx.status === 200 && txb.categories?.length === 11 && txb.maxSpecialties === 3, "shared list via the site");

    console.log("Signup with logo (online only, all new questions)");
    const withLogo = await post("/api/business-signup", body("logo", { logoDataUrl: TINY_JPEG, specialties: ["beauty.service.braids_locs", "beauty.service.other"], otherDescription: "Loc jewelry installs" }));
    assert(withLogo.status === 200 && withLogo.body?.ok === true, "200 ok", withLogo);
    assert(!!withLogo.setCookie, "session cookie still forwarded to the browser");
    const lb = await biz("logo");
    assert(lb?.category === "Beauty & Personal Care" && lb?.category_code === "beauty", "industry saved", lb && { c: lb.category, cc: lb.category_code });
    assert(JSON.stringify(lb?.specialties) === JSON.stringify(["beauty.service.braids_locs", "beauty.service.other"]) && lb?.other_description === "Loc jewelry installs", "what they do + Other description saved");
    assert(lb?.is_startup === true && lb?.is_multi_staff === true && lb?.employee_count === "2-5" && lb?.years_in_business === "1-2 years" && lb?.business_type === "LLC", "startup, multi staff, employees, years, structure saved");
    assert(lb?.has_physical_location === false && lb?.billing_address?.line1 === "2 Bill Rd" && lb?.billing_address?.postalCode === "11550", "online only: billing address saved", lb?.billing_address);
    assert(typeof lb?.logo_image === "string" && lb.logo_image.startsWith("https://media.test/logos/"), "logo uploaded and saved on the business", lb?.logo_image);
    assert(lb && (await alerts(lb.id)) === 1, "logo signup: exactly one admin alert", lb && (await alerts(lb.id)));
    const [owner] = await q(`SELECT name, phone FROM users WHERE email = $1`, [email("logo")]);
    assert(owner?.name === "Dede L logo" && owner?.phone === "5165550101", "owner full name + phone saved", owner);

    console.log("Signup without logo, physical location");
    const plain = await post("/api/business-signup", body("plain", { hasPhysicalLocation: true, address: "1 Main St", zipCode: "11520", offerType: "both", specialties: ["beauty.service.nails", "beauty.product.hair_care"] }));
    const pb = await biz("plain");
    assert(plain.status === 200 && pb && (await alerts(pb.id)) === 1, "no logo: backend sends the one alert at signup");
    assert(pb?.logo_image === null, "no logo saved");
    assert(pb?.billing_address?.line1 === "1 Main St" && pb?.billing_address?.city === "Freeport", "physical location: billing = business address (same rule as the app)", pb?.billing_address);

    console.log("Products only drops multi staff");
    const prod = await post("/api/business-signup", body("prod", { offerType: "products", isMultiStaff: true, specialties: ["beauty.product.hair_wigs_extensions"] }));
    const prb = await biz("prod");
    assert(prod.status === 200 && prb?.is_multi_staff === false && prb?.has_products === true && prb?.has_services === false, "products only: multi staff false");

    console.log("Rejections (nothing created)");
    const r1 = await post("/api/business-signup", body("badind", { specialties: ["food.service.catering"] }));
    assert(r1.status === 400 && r1.body?.field === "industry" && (await users("badind")) === 0, "wrong-category pick → 400 industry, no user", r1);
    const r2 = await post("/api/business-signup", body("nocat", { categoryCode: "" }));
    assert(r2.status === 400 && r2.body?.field === "industry" && (await users("nocat")) === 0, "missing industry → 400", r2);
    const r3 = await post("/api/business-signup", body("badlogo", { logoDataUrl: "data:text/html;base64,PHNjcmlwdD4=" }));
    assert(r3.status === 400 && r3.body?.field === "logo" && (await users("badlogo")) === 0, "non-image logo → 400 logo, no user", r3);
    const r4 = await post("/api/business-signup", body("biglogo", { logoDataUrl: "data:image/jpeg;base64," + Buffer.alloc(2 * 1024 * 1024 + 10).toString("base64") }));
    assert(r4.status === 400 && r4.body?.field === "logo" && (await users("biglogo")) === 0, "logo over 2 MB → 400, no user", r4.status);
    const r5 = await post("/api/business-signup", body("otherreq", { specialties: ["beauty.service.other"] }));
    assert(r5.status === 400 && r5.body?.field === "industry" && (await users("otherreq")) === 0, "Other without description → 400", r5);

    if (ADMIN_TOKEN) {
      console.log("Admin detail BFF");
      const det = await fetch(new URL(`/api/admin/applications/${lb.id}`, WEB), { headers: { Cookie: `outsyde_access_token=${ADMIN_TOKEN}` } });
      const detb = await det.json();
      const rows = Object.fromEntries((detb.application?.signupDetails?.sections ?? []).flatMap((s: any) => s.rows.map((r: any) => [r.label, r.value])));
      assert(det.status === 200 && rows["Industry"] === "Beauty & Personal Care", "detail BFF returns signupDetails", det.status);
      assert(rows["What they do"] === "Braids & locs (service), Other service (service)" && rows["Their own words (Other)"] === "Loc jewelry installs", "detail shows what they do + Other", rows["What they do"]);
      assert(rows["Logo"]?.startsWith("https://media.test/logos/") && rows["Billing address"] === "2 Bill Rd, Hempstead, NY 11550" && rows["Phone"] === "5165550101", "detail shows logo, billing, phone");
      assert(!JSON.stringify(detb).includes("stripeAccountId"), "no Stripe ids reach the browser");
      const anon = await fetch(new URL(`/api/admin/applications/${lb.id}`, WEB));
      assert(anon.status === 401, "detail BFF without login → 401", anon.status);
      const page = await fetch(new URL(`/admin/applications/${lb.id}`, WEB), { headers: { Cookie: `outsyde_access_token=${ADMIN_TOKEN}` } });
      assert(page.status === 200, "detail page renders (200)", page.status);
    }
  } finally {
    await q(`DELETE FROM notifications WHERE reference_id IN (SELECT id FROM businesses WHERE name LIKE $1)`, [`${P} %`]);
    await q(`DELETE FROM businesses WHERE name LIKE $1`, [`${P} %`]);
    await q(`DELETE FROM sessions WHERE sess::text LIKE ANY (SELECT '%' || id || '%' FROM users WHERE email LIKE $1)`, [`${P}-%`]).catch(() => {});
    await q(`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [`${P}-%`]);
    await q(`DELETE FROM users WHERE email LIKE $1`, [`${P}-%`]);
    await db.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
