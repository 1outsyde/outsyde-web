/** Quick sign up / log in sheet rules (p4-quicksignup, mockups 42 and 43). Pure, no React, no network. */
import { GENERIC_ERROR } from "../_shared/format";

export type QuickMode = "signup" | "login";
export type QuickPurpose = "checkout" | "rsvp" | "follow";

/** What to do once the person is signed in. */
export type Pending =
  | { kind: "checkout"; typeId: string; qty: number }
  | { kind: "rsvp"; typeId: string; qty: number }
  | { kind: "follow" };

export const QUICK_COPY = {
  firstName: "Add your first name.",
  email: "Enter a valid email.",
  phone: "Enter a phone number with at least 10 digits.",
  password: "Use at least 6 characters.",
  passwordRequired: "Enter your password.",
  exists: "That email already has an Outsyde account. Log in to get your tickets.",
  existsFollow: "That email already has an Outsyde account. Log in to follow.",
  oauth: "This account uses Apple or Google sign in. Continue on the log in page.",
  limit: "Too many sign ups from this network. Please try again in a few minutes.",
  loginLimit: "Too many tries. Please wait a few minutes and try again.",
  mismatch: "That password doesn't match. Try again or reset it.",
  photo: "We couldn't add your photo. You can add it later in your account.",
} as const;

type Field = "firstName" | "email" | "phone" | "password";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const phoneDigits = (phone: string) => phone.replace(/\D/g, "");
const validEmail = (email: string) => EMAIL_RE.test(email.trim());

export function validateQuickSignup(f: { firstName: string; email: string; phone: string; password: string }): Partial<Record<Field, string>> {
  const out: Partial<Record<Field, string>> = {};
  if (!f.firstName.trim()) out.firstName = QUICK_COPY.firstName;
  if (!validEmail(f.email)) out.email = QUICK_COPY.email;
  if (phoneDigits(f.phone).length < 10) out.phone = QUICK_COPY.phone;
  if (f.password.length < 6) out.password = QUICK_COPY.password;
  return out;
}

export function validateQuickLogin(f: { email: string; password: string }): Partial<Record<"email" | "password", string>> {
  const out: Partial<Record<"email" | "password", string>> = {};
  if (!validEmail(f.email)) out.email = QUICK_COPY.email;
  if (!f.password) out.password = QUICK_COPY.passwordRequired;
  return out;
}

const field400: Record<string, string> = {
  password: QUICK_COPY.password,
  email: QUICK_COPY.email,
  name: QUICK_COPY.firstName,
  firstName: QUICK_COPY.firstName,
  phone: QUICK_COPY.phone,
};

/** Copy for a failed sign up or log in. Raw backend text is never shown, except a passwordless account's own line. */
export function quickErrorCopy(status: number, body: unknown, mode: QuickMode = "signup"): { message: string; switchToLogin: boolean } {
  const b = (body && typeof body === "object" ? body : {}) as { code?: unknown; error?: unknown; details?: unknown };
  const code = typeof b.code === "string" ? b.code : "";
  if (status === 409) return { message: QUICK_COPY.exists, switchToLogin: true };
  if (status === 429) return { message: mode === "login" ? QUICK_COPY.loginLimit : QUICK_COPY.limit, switchToLogin: false };
  if (mode === "login" && status === 401) {
    if (code === "ACCOUNT_NEEDS_SETUP" && typeof b.error === "string" && b.error.trim()) return { message: b.error, switchToLogin: false };
    return { message: QUICK_COPY.mismatch, switchToLogin: false };
  }
  if (status === 400) {
    if (code === "PHONE_REQUIRED") return { message: QUICK_COPY.phone, switchToLogin: false };
    if (Array.isArray(b.details)) {
      for (const d of b.details) {
        const key = Array.isArray((d as { path?: unknown })?.path) ? String((d as { path: unknown[] }).path[0]) : "";
        if (field400[key]) return { message: field400[key], switchToLogin: false };
      }
    }
  }
  return { message: GENERIC_ERROR, switchToLogin: false };
}

/** The mockup 43 note, worded for what the sheet was opened for. */
export function existsCopy(purpose: QuickPurpose): string {
  return purpose === "follow" ? QUICK_COPY.existsFollow : QUICK_COPY.exists;
}

export type LoginOutcome =
  | { kind: "claim" }
  | { kind: "oauth"; message: string }
  | { kind: "error"; message: string; wrongPassword: boolean };

/**
 * A failed log in from the sheet. A passwordless (imported) account finishes setup on /claim, where
 * the backend's emailed code is entered (same as /login). An Apple or Google only account gets its
 * own line and a link to the log in page, never "wrong password".
 */
export function loginOutcome(status: number, body: unknown): LoginOutcome {
  const b = (body && typeof body === "object" ? body : {}) as { code?: unknown; error?: unknown };
  const code = typeof b.code === "string" ? b.code : "";
  if (code === "ACCOUNT_NEEDS_SETUP") return { kind: "claim" };
  if (code === "OAUTH_ONLY") return { kind: "oauth", message: typeof b.error === "string" && b.error.trim() ? b.error : QUICK_COPY.oauth };
  const copy = quickErrorCopy(status, body, "login");
  return { kind: "error", message: copy.message, wrongPassword: status === 401 && copy.message === QUICK_COPY.mismatch };
}

/** Where to come back to on this event page if the person has to leave it to sign in. */
export function pendingReturnPath(slug: string, pending: Pending): string {
  const base = `/e/${slug}`;
  if (pending.kind === "checkout") return `${base}?checkout=${encodeURIComponent(pending.typeId)}&qty=${pending.qty}`;
  if (pending.kind === "rsvp") return `${base}?rsvp=${encodeURIComponent(pending.typeId)}&qty=${pending.qty}`;
  return base;
}
