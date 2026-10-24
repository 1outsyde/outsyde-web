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

// Business referrals (2026-10-24). Anyone who refers a business earns $25 cash once the business is
// approved, on a paid plan whose first charge cleared, has a feed post and something live, all within
// 90 days. The $25 goes out 7 days later. Rules live on the backend (GET /api/referral/business).

/** Where the invite page's business button goes. */
export function businessSignupHrefForCode(code: string): string {
  return `/business-signup?ref=${encodeURIComponent(code.toUpperCase())}`;
}

export type BusinessReferralPayout = {
  status: string;
  amountCents: number;
  payableAfter: string;
  paidAt: string | null;
  holdReason: string | null;
};
export type BusinessReferral = {
  businessName: string;
  status: string;
  qualifiedAt: string | null;
  expiresAt: string;
  payout: BusinessReferralPayout | null;
};

export const BUSINESS_REFERRAL_COPY = {
  cardTitle: "Refer a business, get $25",
  cardBody:
    "Know a business that belongs on Outsyde? Share your link. You get $25 cash when they're approved, on a paid plan, and have a post and a service or product live within 90 days.",
  invitedLine: "Own a business?",
  invitedButton: "Join as a business",
  invitedFineprint: "Your friend gets $25 once your business is set up on a paid plan and live.",
  fieldLabel: "Referral code (optional)",
  codeAdded: "Referral code added.",
  codeApplied: "Referral code applied. Whoever referred you gets a thank you once you're live.",
  setupPayouts: "Set up payouts",
  setupPayoutsBody: "Connect a bank account through Stripe so we can send your $25.",
  empty: "No businesses yet. Share your link to get started.",
} as const;

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

/** One plain line for a referred business's status. `now` is for tests. */
export function businessReferralLine(r: BusinessReferral, now: Date = new Date()): string {
  const p = r.payout;
  if (r.status === "blocked") return "This one doesn't qualify for the $25.";
  if (r.status === "expired") return "Didn't finish setting up within 90 days.";
  if (r.status === "pending" || !p) {
    return `Waiting for them to go live on a paid plan, by ${shortDate(r.expiresAt)}.`;
  }
  switch (p.status) {
    case "paid":
      return `$25 sent${p.paidAt ? ` on ${shortDate(p.paidAt)}` : ""}.`;
    case "cancelled":
      return "Their plan payment was refunded, so the $25 was cancelled.";
    case "review":
      return "We're checking this payout. No action needed.";
    case "held":
      if (p.holdReason === "stripe_not_ready") return "$25 earned. Stripe is still checking your payout account.";
      return "$25 earned. Set up payouts so we can send it.";
    default: {
      const after = new Date(p.payableAfter);
      return after.getTime() > now.getTime()
        ? `$25 earned. We send it on ${shortDate(p.payableAfter)}.`
        : "$25 earned. Sending soon.";
    }
  }
}

/** True when a held payout is waiting on the referrer to connect or finish a payout account. */
export function needsPayoutSetup(rs: BusinessReferral[]): boolean {
  return rs.some((r) => r.payout?.status === "held" && (r.payout.holdReason === "no_account" || r.payout.holdReason === "not_complete"));
}
