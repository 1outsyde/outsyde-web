// Friend referrals (2026-10-23). Rules live on the backend: 2,500 points each ($5) when the
// friend's first purchase of $10 or more is final; a code is used once, within 30 days of signing
// up, by a new customer. Copy rules: real punctuation, no dashes, never a percentage.

const CODE_RE = /^[A-Za-z0-9]{1,20}$/;

/** A referral code as the backend expects it (letters and digits, up to 20), or null. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim();
  return CODE_RE.test(code) ? code.toUpperCase() : null;
}

/** Where the invite page's Join button goes. */
export function signupHrefForCode(code: string): string {
  return `/consumer-signup?ref=${encodeURIComponent(code.toUpperCase())}`;
}

export const REFERRAL_COPY = {
  invitedTitle: "You're invited to Outsyde",
  offer:
    "Join with this code and you and your friend each get 2,500 Outsyde loyalty rewards points, worth $5, when your first purchase of $10 or more is complete.",
  fineprint: "For new Outsyde customers. Use the code within 30 days of joining.",
  codeApplied: "Invite code applied. You and your friend each get 2,500 points after your first purchase of $10 or more.",
  cardTitle: "Invite friends",
  cardBody:
    "Share your link. When a friend joins and makes a first purchase of $10 or more, you each get 2,500 Outsyde loyalty rewards points, worth $5.",
  invalid: "This invite link isn't valid. You can still join Outsyde.",
} as const;
