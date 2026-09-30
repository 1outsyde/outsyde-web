/**
 * Free ("complimentary" / waived) plan helpers shared by the admin vendors page, the claim page
 * and the subscription manage page. Pure functions only (no React, no fetch) so they can be
 * unit-tested with `npx tsx tests/free-plan.test.ts`.
 *
 * Every date is shown in America/New_York. A "permanent" grant is written by the backend as
 * 2099-01-01T00:00:00Z, which is Dec 31, 2098 in New York — so permanence is always tested
 * BEFORE any formatting.
 */

export const ET_TIMEZONE = "America/New_York";

/** Permanent grants end here (backend PERMANENT_EXPIRY_ISO). */
const PERMANENT_FROM_MS = Date.UTC(2099, 0, 1);

export interface AdminSubscriptionSummary {
  tierName: string;
  tierDisplayName: string;
  isComplimentary: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  hasStripeSubscription: boolean;
}

function toMs(value: string | Date | null | undefined): number | null {
  if (value == null || value === "") return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function isPermanentEnd(value: string | Date | null | undefined): boolean {
  const ms = toMs(value);
  return ms !== null && ms >= PERMANENT_FROM_MS;
}

/** "October 7, 2026", in New York time. */
export function formatEtDate(value: string | Date): string {
  const ms = toMs(value);
  if (ms === null) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    timeZone: ET_TIMEZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Today's date in New York as YYYY-MM-DD. */
export function etToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: ET_TIMEZONE });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when `dateStr` (YYYY-MM-DD from <input type="date">) is strictly after today in New York. */
export function isAfterEtToday(dateStr: string, now: Date = new Date()): boolean {
  return DATE_RE.test(dateStr) && dateStr > etToday(now);
}

/**
 * End of the picked day in New York, as an ISO-8601 string WITH the DST-correct offset
 * (-04:00 in summer, -05:00 in winter). The offset is read at noon that day: New York's clock
 * changes at 2am, so noon is never ambiguous.
 */
export function etEndOfDayIso(dateStr: string): string {
  if (!DATE_RE.test(dateStr)) throw new Error("Invalid date");
  const [y, m, d] = dateStr.split("-").map(Number);
  const noonEt = new Date(Date.UTC(y, m - 1, d, 17, 0, 0)); // 12:00 EST / 13:00 EDT
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: ET_TIMEZONE, timeZoneName: "longOffset" }).formatToParts(noonEt);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(raw);
  const offset = match ? `${match[1]}${match[2].padStart(2, "0")}:${match[3] ?? "00"}` : "+00:00";
  return `${dateStr}T23:59:59${offset}`;
}

export type FreePlanEndKind = "permanent" | "until" | "ended";

/**
 * The end-state of a free plan. Order matters:
 *  1. permanent (end >= 2099-01-01) is tested FIRST, before any formatting;
 *  2. ended when the status is canceled OR the end is in the past (the daily expiry job can lag,
 *     so a row may still say 'active' after its end);
 *  3. otherwise "until".
 */
export function describeFreePlanEnd(
  plan: { status?: string | null; currentPeriodEnd?: string | Date | null },
  now: Date = new Date(),
): { kind: FreePlanEndKind; label: string } {
  if (isPermanentEnd(plan.currentPeriodEnd)) return { kind: "permanent", label: "Free — permanent" };
  const end = toMs(plan.currentPeriodEnd);
  const canceled = (plan.status ?? "").toLowerCase() === "canceled";
  if (canceled || (end !== null && end <= now.getTime())) {
    return { kind: "ended", label: end !== null ? `Free plan ended ${formatEtDate(plan.currentPeriodEnd as string | Date)}` : "Free plan ended" };
  }
  if (end === null) return { kind: "until", label: "Free plan" };
  return { kind: "until", label: `Free until ${formatEtDate(plan.currentPeriodEnd as string | Date)}` };
}

export interface PlanLabelInput {
  subscription?: AdminSubscriptionSummary | null;
  hasConnectAccount?: boolean | null;
  stripeOnboardingComplete?: boolean | null;
}

export interface PlanLabel {
  kind: "none" | "free" | "paid";
  /** Text to show under the business name; null when there is no subscription. */
  text: string | null;
  /** Free plan only. */
  end?: FreePlanEndKind;
  /** True for a free plan that has not ended (what "Extend" and "Revoke" apply to). */
  activeFree: boolean;
  /** Show the "Needs Stripe Connect" chip. */
  needsStripeConnect: boolean;
}

/** Admin vendors page: the plan label under a business name. */
export function planLabel(row: PlanLabelInput, now: Date = new Date()): PlanLabel {
  const sub = row.subscription;
  if (!sub) return { kind: "none", text: null, activeFree: false, needsStripeConnect: false };

  if (!sub.isComplimentary || sub.hasStripeSubscription) {
    return { kind: "paid", text: `${sub.tierDisplayName} · ${sub.status ?? ""}`, activeFree: false, needsStripeConnect: false };
  }

  const end = describeFreePlanEnd({ status: sub.status, currentPeriodEnd: sub.currentPeriodEnd }, now);
  const activeFree = end.kind !== "ended";
  return {
    kind: "free",
    text: end.label,
    end: end.kind,
    activeFree,
    needsStripeConnect: activeFree && (!row.hasConnectAccount || !row.stripeOnboardingComplete),
  };
}

/** Manage page: a free row is priced 0 and has no Stripe subscription. Paid rows are never free. */
export function isComplimentarySubscription(sub: {
  priceInCents?: number | null;
  stripeSubscriptionId?: string | null;
}): boolean {
  return sub.priceInCents === 0 && !sub.stripeSubscriptionId;
}

export type ClaimLinkStatus = "pending" | "claimed" | "revoked" | "expired";

export interface ClaimLinkRow {
  id: string;
  planExpiresAt: string | null;
  linkExpiresAt: string | null;
  createdAt: string | null;
  redeemedAt: string | null;
  revokedAt: string | null;
}

/** Pending / Claimed {date} / Revoked / Expired for the pending-links list. */
export function claimLinkStatus(
  link: Pick<ClaimLinkRow, "linkExpiresAt" | "redeemedAt" | "revokedAt">,
  now: Date = new Date(),
): { status: ClaimLinkStatus; label: string } {
  if (link.redeemedAt) return { status: "claimed", label: `Claimed ${formatEtDate(link.redeemedAt)}` };
  if (link.revokedAt) return { status: "revoked", label: "Revoked" };
  const end = toMs(link.linkExpiresAt);
  if (end !== null && end <= now.getTime()) return { status: "expired", label: "Expired" };
  return { status: "pending", label: "Pending" };
}

const SYNC_HINT_TRIGGER = "paid subscription that is still live";
export const SYNC_HINT = "If their paid plan was already canceled in Stripe, sync the subscription first.";

/** The extra hint line, only for the "paid subscription that is still live" 409. */
export function errorHint(message: string): string | null {
  return message.includes(SYNC_HINT_TRIGGER) ? SYNC_HINT : null;
}
