/** Unit tests for the quick sign up sheet rules. No server needed: npx tsx tests/quick-auth-logic.test.ts */
import { GENERIC_ERROR } from "../app/e/_shared/format";
import { validateQuickSignup, validateQuickLogin, quickErrorCopy, phoneDigits, QUICK_COPY, existsCopy, loginOutcome, pendingReturnPath } from "../app/e/[slug]/quickAuthLogic";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}

const good = { firstName: "Maya", email: "maya@email.com", phone: "(516) 555 0142", password: "secret1" };

console.log("copy (exact)");
eq(QUICK_COPY.firstName, "Add your first name.", "first name copy");
eq(QUICK_COPY.email, "Enter a valid email.", "email copy");
eq(QUICK_COPY.phone, "Enter a phone number with at least 10 digits.", "phone copy");
eq(QUICK_COPY.password, "Use at least 6 characters.", "password copy");
eq(QUICK_COPY.exists, "That email already has an Outsyde account. Log in to get your tickets.", "409 copy");
eq(QUICK_COPY.limit, "Too many sign ups from this network. Please try again in a few minutes.", "429 copy");
eq(QUICK_COPY.mismatch, "That password doesn't match. Try again or reset it.", "login 401 copy");
eq(QUICK_COPY.photo, "We couldn't add your photo. You can add it later in your account.", "photo failure copy");
for (const [k, v] of Object.entries(QUICK_COPY)) eq(/[–—]| - /.test(v), false, `no dashes in ${k}`);

console.log("validateQuickSignup");
eq(validateQuickSignup(good), {}, "all good → no errors");
eq(validateQuickSignup({ ...good, firstName: "   " }), { firstName: QUICK_COPY.firstName }, "first name missing");
eq(validateQuickSignup({ ...good, email: "maya@" }), { email: QUICK_COPY.email }, "bad email");
eq(validateQuickSignup({ ...good, email: "  maya@email.com " }), {}, "'  maya@email.com ' is valid after trim");
eq(validateQuickSignup({ ...good, phone: "(516) 555 0142" }), {}, "'(516) 555 0142' is valid");
eq(validateQuickSignup({ ...good, phone: "+1 516 555 0142" }), {}, "'+1 516 555 0142' is valid");
eq(validateQuickSignup({ ...good, phone: "555 0142" }), { phone: QUICK_COPY.phone }, "'555 0142' is invalid");
eq(validateQuickSignup({ ...good, phone: "" }), { phone: QUICK_COPY.phone }, "empty phone is invalid");
eq(validateQuickSignup({ ...good, password: "12345" }), { password: QUICK_COPY.password }, "5 character password");
eq(validateQuickSignup({ ...good, password: "123456" }), {}, "6 character password ok");
eq(Object.keys(validateQuickSignup({ firstName: "", email: "", phone: "", password: "" })), ["firstName", "email", "phone", "password"], "all four flagged, in form order");
eq(phoneDigits("+1 (516) 555-0142"), "15165550142", "phoneDigits strips everything but digits");

console.log("validateQuickLogin");
eq(validateQuickLogin({ email: "maya@email.com", password: "x" }), {}, "login: any password typed is fine");
eq(validateQuickLogin({ email: "nope", password: "" }), { email: QUICK_COPY.email, password: QUICK_COPY.passwordRequired }, "login: email and password flagged");

console.log("quickErrorCopy");
eq(quickErrorCopy(409, { code: "EMAIL_EXISTS", message: "That email already has an Outsyde account." }), { message: QUICK_COPY.exists, switchToLogin: true }, "409 → switch to log in, never the raw text");
eq(quickErrorCopy(409, null), { message: QUICK_COPY.exists, switchToLogin: true }, "409 without a body still switches");
eq(quickErrorCopy(429, { code: "RATE_LIMITED" }), { message: QUICK_COPY.limit, switchToLogin: false }, "429 sign up limit");
eq(quickErrorCopy(429, {}, "login"), { message: QUICK_COPY.loginLimit, switchToLogin: false }, "429 in log in mode is about tries, not sign ups");
eq(quickErrorCopy(401, { error: "Invalid email/username or password." }, "login"), { message: QUICK_COPY.mismatch, switchToLogin: false }, "login 401 → mismatch line");
eq(quickErrorCopy(401, { error: "Set up your account first.", code: "ACCOUNT_NEEDS_SETUP" }, "login"), { message: "Set up your account first.", switchToLogin: false }, "passwordless account: backend's own line");
eq(quickErrorCopy(400, { code: "PHONE_REQUIRED" }), { message: QUICK_COPY.phone, switchToLogin: false }, "400 PHONE_REQUIRED → phone copy");
eq(quickErrorCopy(400, { error: "Invalid data", details: [{ path: ["password"] }] }), { message: QUICK_COPY.password, switchToLogin: false }, "400 password detail → password copy");
eq(quickErrorCopy(400, { error: "Invalid data", details: [{ path: ["email"] }] }), { message: QUICK_COPY.email, switchToLogin: false }, "400 email detail → email copy");
eq(quickErrorCopy(400, { error: "Invalid data", details: [{ path: ["name"] }] }), { message: QUICK_COPY.firstName, switchToLogin: false }, "400 name detail → first name copy");
eq(quickErrorCopy(400, { error: "Email already registered" }), { message: GENERIC_ERROR, switchToLogin: false }, "unknown 400 → generic, never raw backend text");
eq(quickErrorCopy(500, { error: "boom" }), { message: GENERIC_ERROR, switchToLogin: false }, "500 → GENERIC_ERROR");
eq(quickErrorCopy(502, { error: "Couldn’t reach the server. Please try again." }), { message: GENERIC_ERROR, switchToLogin: false }, "502 → GENERIC_ERROR");

console.log("existsCopy (per purpose)");
eq(existsCopy("checkout"), QUICK_COPY.exists, "checkout keeps the mockup 43 line");
eq(existsCopy("rsvp"), QUICK_COPY.exists, "rsvp keeps the mockup 43 line");
eq(existsCopy("follow"), "That email already has an Outsyde account. Log in to follow.", "follow says follow");

console.log("loginOutcome (special accounts)");
eq(loginOutcome(401, { code: "ACCOUNT_NEEDS_SETUP", error: "We emailed you a 6-digit code." }), { kind: "claim" }, "passwordless account → finish setup on /claim");
eq(loginOutcome(401, { code: "OAUTH_ONLY", error: "This account uses Apple sign-in. Please continue with Apple." }), { kind: "oauth", message: "This account uses Apple sign-in. Please continue with Apple." }, "Apple or Google only → their own line");
eq(loginOutcome(401, { code: "OAUTH_ONLY" }), { kind: "oauth", message: QUICK_COPY.oauth }, "OAUTH_ONLY with no text → our line");
eq(loginOutcome(401, { error: "Invalid email/username or password." }), { kind: "error", message: QUICK_COPY.mismatch, wrongPassword: true }, "plain 401 → mismatch");
eq(loginOutcome(429, {}), { kind: "error", message: QUICK_COPY.loginLimit, wrongPassword: false }, "429 → tries line");
eq(/[\u2013\u2014]| - /.test(QUICK_COPY.oauth), false, "no dashes in oauth copy");

console.log("pendingReturnPath");
eq(pendingReturnPath("late-night", { kind: "checkout", typeId: "t1", qty: 2 }), "/e/late-night?checkout=t1&qty=2", "checkout path");
eq(pendingReturnPath("late-night", { kind: "rsvp", typeId: "t2", qty: 1 }), "/e/late-night?rsvp=t2&qty=1", "rsvp path (preselect on return)");
eq(pendingReturnPath("late-night", { kind: "follow" }), "/e/late-night", "follow path");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
