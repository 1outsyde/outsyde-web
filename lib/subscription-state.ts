/**
 * What a paid plan's state means for the vendor (step 1.0b subscription lifecycle).
 * The backend sends status (Stripe's: active, trialing, past_due, canceled, ...) plus, since
 * backend #342, graceEndsAt (the day listings pause) and listingsPaused.
 * Copy rules: commas and periods, no dashes, never the service fee percentage.
 */

export interface PaidPlanFields {
  status: string;
  graceEndsAt?: string | null;
  listingsPaused?: boolean | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}

export type PaidPlanKind = "active" | "late" | "paused" | "other";

export interface PaidPlanState {
  kind: PaidPlanKind;
  pill: string;
  /** Explanation shown under the plan, or null when nothing needs saying. */
  note: string | null;
  /** Show "Renews on" / "Cancels on" only when the plan is paid up. */
  showRenewal: boolean;
}

export function formatPlanDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export function describePaidPlan(sub: PaidPlanFields): PaidPlanState {
  if (sub.listingsPaused) {
    return {
      kind: "paused",
      pill: "Paused",
      note: "Your listings are paused because your plan payment hasn't come through. Update your payment and they go live again on their own.",
      showRenewal: false,
    };
  }
  if (sub.status === "past_due" || sub.status === "unpaid") {
    const when = sub.graceEndsAt ? `by ${formatPlanDay(sub.graceEndsAt)}` : "soon";
    return {
      kind: "late",
      pill: "Payment late",
      note: `We couldn't take your last plan payment. Update your payment ${when} so your listings stay live.`,
      showRenewal: false,
    };
  }
  if (sub.status === "active" || sub.status === "trialing") {
    return { kind: "active", pill: "Active", note: null, showRenewal: true };
  }
  const label = sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1).replace(/_/g, " ") : "Unknown";
  return { kind: "other", pill: label, note: null, showRenewal: false };
}

/**
 * The charge line under "Switch to This Plan" (decided 2026-10-19: switching charges the full new
 * price now, the billing date restarts today, no credit for unused time). Null when it doesn't apply.
 */
export function switchChargeNote(params: {
  currentIsPaid: boolean;
  currentStatus: string | null | undefined;
  targetPriceInCents: number | null | undefined;
}): string | null {
  const { currentIsPaid, currentStatus, targetPriceInCents } = params;
  if (!currentIsPaid || !targetPriceInCents || targetPriceInCents <= 0) return null;
  if (currentStatus !== "active" && currentStatus !== "trialing") return null;
  const price = `$${(targetPriceInCents / 100).toFixed(2)}`;
  return `You'll be charged ${price} today and your billing date moves to today. There's no credit for time left on your current plan.`;
}

/** The success page counts a plan as live when Stripe says active or trialing. */
export function isPlanLive(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
