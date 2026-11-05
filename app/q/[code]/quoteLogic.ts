/**
 * Quote page decisions (Quotes step 5b). Pure: no React, no network. Tested in tests/quotes-logic.test.ts.
 *
 * Legend 2026-11-05 (step 5 calls): one goutsyde.com page in the business's look; signed out shows a preview and
 * Sign in to pay; another account sees no details. Copy uses commas and periods only and never the fee rate.
 * Money lines always come from the backend's amounts, never worked out here.
 */

export type Amounts = {
  totalCents: number; depositOrTotalCents: number; serviceFeeCents: number; payNowCents: number; balanceCents: number;
  balanceServiceFeeCents: number; balanceTotalCents: number; restPaid: "outsyde" | "outside"; paidDirectlyCents: number;
};
export type Business = { id: string; name: string | null; logoImage: string | null; coverImage: string | null; brandColors: { primary?: string; secondary?: string } | null };
export type Preview = {
  status: string; kind: string; title: string; jobDate: string | null; startTime: string | null; durationMinutes: number | null; timeZone: string | null;
  dueDate: string | null; totalCents: number; paymentMode: "deposit" | "full"; depositCents: number | null; restPaid: string; amounts: Amounts;
  expiresAt: string; business: Business;
};
export type Extra = { id: string; description: string; amountCents: number; serviceFeeCents: number; totalCents: number; status: string; canApprove: boolean; canDecline: boolean; canWithdraw: boolean };
export type Quote = Preview & {
  id: string; version: number; businessName: string | null; customerId: string; conversationId: string; details: string | null; extrasNote: string | null;
  paying: boolean; appointmentId: string | null; paidAt: string | null; linkCode: string;
  balance: { status: string; holdCents: number; capturedCents: number | null; needsNewCard: boolean; completedAt: string | null } | null;
  window: { state: string; endsAt: string | null; canConfirm: boolean; canReport: boolean } | null;
  report: { status: "open" | "decided"; outcome: "pay_full" | "partial_refund" | "full_refund" | null; refundCents: number | null } | null;
  payout?: unknown;
  extras: Extra[];
  extrasPayment: { status: string; approvedCents: number; holdCents: number; capturedCents: number | null; needsNewCard: boolean; unpaid: boolean } | null;
};

export function money(cents: number | null | undefined): string {
  const c = Number(cents ?? 0);
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sat, Nov 8 at 9:00 AM, 3 hours". The job's own wall clock date and time, never shifted by the viewer's zone. */
export function whenLine(p: Pick<Preview, "jobDate" | "startTime" | "durationMinutes" | "dueDate" | "kind">): string {
  if (p.kind === "product") return p.dueDate ? `Due ${dateLabel(p.dueDate)}` : "";
  if (!p.jobDate) return "";
  const parts = [dateLabel(p.jobDate) + (p.startTime ? ` at ${timeLabel(p.startTime)}` : "")];
  if (p.durationMinutes) parts.push(durationLabel(p.durationMinutes));
  return parts.join(", ");
}
export function dateLabel(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
export function timeLabel(hm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hm);
  if (!m) return hm;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}
export function durationLabel(min: number): string {
  if (min < 60) return `${min} minutes`;
  const h = Math.floor(min / 60), r = min % 60;
  return `${h} ${h === 1 ? "hour" : "hours"}${r ? ` ${r} minutes` : ""}`;
}

export type Line = { label: string; cents: number; total?: boolean; muted?: boolean };

/** The money lines before paying. The rest paid directly reads as such, with no hold. */
export function payLines(a: Amounts, paymentMode: "deposit" | "full"): Line[] {
  if (paymentMode === "full") return [
    { label: "Quote total", cents: a.totalCents },
    { label: "Service fee", cents: a.serviceFeeCents },
    { label: "Pay now", cents: a.payNowCents, total: true },
  ];
  const lines: Line[] = [
    { label: "Quote total", cents: a.totalCents },
    { label: "Deposit today", cents: a.depositOrTotalCents },
    { label: "Service fee", cents: a.serviceFeeCents },
    { label: "Pay now", cents: a.payNowCents, total: true },
  ];
  if (a.restPaid === "outside") lines.push({ label: "The rest, paid to the business directly", cents: a.paidDirectlyCents, muted: true });
  else if (a.balanceTotalCents > 0) lines.push({ label: "Balance, held on your card the day before", cents: a.balanceTotalCents, muted: true });
  return lines;
}

export type Stage = "pay" | "paying" | "closed" | "booked" | "window" | "reported" | "decided" | "complete";

export function stageOf(q: Pick<Quote, "status" | "paying" | "window" | "report">): Stage {
  if (q.status === "sent") return q.paying ? "paying" : "pay";
  if (q.status !== "paid") return "closed";
  if (q.report?.status === "decided") return "decided";
  if (q.report || q.window?.state === "reported") return "reported";
  if (q.window?.state === "open") return "window";
  if (q.window && ["confirmed", "closed"].includes(q.window.state)) return "complete";
  return "booked";
}

export function closedLine(status: string): string {
  if (status === "withdrawn") return "The business took this quote back. Message them if you still want the job.";
  if (status === "declined") return "You declined this quote.";
  if (status === "expired") return "This quote has expired. Message the business for a new one.";
  return "This quote can't be paid now.";
}

export type Action = { kind: "balance-card" | "extras-card"; label: string };

/** The balance as the customer sees it after paying. */
export function balanceLine(q: Pick<Quote, "amounts" | "balance" | "paymentMode">): { text: string; action?: Action } | null {
  if (q.paymentMode === "full") return null;
  if (q.amounts.restPaid === "outside") return { text: `The rest, ${money(q.amounts.paidDirectlyCents)}, is paid to the business directly.` };
  const b = q.balance;
  if (!b || b.status === "none") return null;
  const amt = money(b.holdCents);
  switch (b.status) {
    case "scheduled": return { text: `The balance, ${amt}, is held on your card the day before the job.` };
    case "holding": return { text: `We're holding the balance, ${amt}, on your card.` };
    case "held": case "capturing": return { text: `The balance, ${amt}, is on hold on your card. It is charged when the job is complete.` };
    case "captured": return { text: `The balance, ${money(b.capturedCents ?? b.holdCents)}, was charged.` };
    case "hold_failed":
      return b.needsNewCard
        ? { text: `We couldn't hold the balance, ${amt}, on your card. Update your card to keep this booking.`, action: { kind: "balance-card", label: "Update your card" } }
        : { text: `We couldn't hold the balance, ${amt}, on your card. We'll try again before the job.` };
    default: return null;
  }
}

/** The extras payment line (B4 backup, E3 Update your card). */
export function extrasPaymentLine(p: Quote["extrasPayment"]): { text: string; action?: Action } | null {
  if (!p || p.approvedCents <= 0) return null;
  const amt = money(p.holdCents);
  if (p.unpaid) return { text: `We couldn't charge your card for the extras, ${amt}. Pay for extras to finish your booking.`, action: { kind: "extras-card", label: "Pay for extras" } };
  if (p.needsNewCard) return { text: `We couldn't hold the extras, ${amt}, on your card. Update your card so the job can be marked complete.`, action: { kind: "extras-card", label: "Update your card" } };
  if (p.status === "captured") return { text: `Extras charged: ${money(p.capturedCents ?? p.holdCents)}.` };
  if (p.status === "scheduled") return { text: `Approved extras, ${amt}, are held on your card the day before the job.` };
  if (p.status === "held") return { text: `Approved extras, ${amt}, are on hold on your card. They are charged when the job is complete.` };
  return null;
}

export function extraStatusLine(x: Pick<Extra, "status">): string {
  switch (x.status) {
    case "proposed": return "Nothing is charged unless you approve.";
    case "approving": return "Waiting for your bank to confirm.";
    case "approved": return "Approved. It is charged when the job is complete.";
    case "declined": return "Declined. Nothing was added.";
    case "withdrawn": return "The business took this back. Nothing was added.";
    case "lapsed": return "Not answered before the job was complete. Nothing was added.";
    case "canceled": return "The booking ended. Nothing was added.";
    default: return "";
  }
}

/** A Stripe answer for each kind of card step. hold: a held card (manual capture); pay: charged now; setup: card checked. */
export type IntentKind = "hold" | "pay" | "setup";
export function intentOutcome(kind: IntentKind, r: { thrown?: boolean; errorCode?: string | null; errorMessage?: string | null; status?: string | null }): { next: "done" } | { next: "check" } | { next: "failed"; message: string } {
  if (r.thrown) return { next: "check" };
  const ok = kind === "hold" ? ["requires_capture", "succeeded"] : kind === "pay" ? ["succeeded", "processing"] : ["succeeded", "processing"];
  if (r.status && ok.includes(r.status)) return { next: "done" };
  if (r.errorCode === "payment_intent_unexpected_state" || r.errorCode === "setup_intent_unexpected_state") return { next: "check" };
  if (r.errorCode || r.errorMessage) return { next: "failed", message: r.errorMessage || "Your card couldn't be used. Check the details and try again." };
  return { next: "failed", message: "Your card couldn't be used. Try again." };
}

/** Where Sign in goes and comes back to. */
export function loginHref(code: string): string {
  return `/login?return=${encodeURIComponent(`/q/${code}`)}`;
}

/** "4 h 52 min left" in the 6 hour window. */
export function windowLeft(endsAt: string | null, nowMs: number): string {
  if (!endsAt) return "";
  const ms = new Date(endsAt).getTime() - nowMs;
  if (!(ms > 0)) return "The 6 hours are over.";
  const mins = Math.ceil(ms / 60_000);
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h} h ${m} min left` : `${m} min left`;
}

export const REASON_MIN = 10, REASON_MAX = 1000, MAX_PHOTOS = 5;
export function reportProblem(reason: string, photos: number): string | null {
  const t = reason.trim();
  if (t.length < REASON_MIN) return `Tell us what went wrong in at least ${REASON_MIN} characters.`;
  if (t.length > REASON_MAX) return "Keep it to 1,000 characters.";
  if (photos > MAX_PHOTOS) return `Add up to ${MAX_PHOTOS} photos.`;
  return null;
}

export function decidedLine(r: NonNullable<Quote["report"]>, businessName: string): string {
  const name = businessName || "The business";
  if (r.outcome === "full_refund") return "Outsyde reviewed your report. You get a full refund.";
  if (r.outcome === "partial_refund") return `Outsyde reviewed your report. You get ${money(r.refundCents)} back and the rest is paid to ${name}.`;
  return `Outsyde reviewed your report. ${name} is paid in full.`;
}

/** The status chip in Requests and quotes. */
export function quoteChip(q: Pick<Quote, "status" | "paying" | "window" | "report">): string {
  const s = stageOf(q);
  return ({ pay: "Ready to pay", paying: "Paying", closed: q.status === "withdrawn" ? "Withdrawn" : q.status === "declined" ? "Declined" : "Expired",
    booked: "Booked", window: "Confirm or report", reported: "Under review", decided: "Reviewed", complete: "Complete" } as Record<Stage, string>)[s];
}
export function requestChip(status: string): string {
  return ({ new: "Waiting for a quote", called: "Waiting for a quote", quoted: "Quoted", booked: "Booked", closed: "Closed" } as Record<string, string>)[status] ?? "Sent";
}

/** A brand color the page can use safely (a 3 or 6 digit hex), else the Outsyde gold. */
export function brandColor(b: Pick<Business, "brandColors"> | null | undefined): string {
  const c = b?.brandColors?.primary;
  return typeof c === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : "#E2BE4B";
}
/** Dark or light text on the brand color. */
export function inkOn(hex: string): string {
  const h = hex.length === 4 ? hex.slice(1).split("").map((x) => x + x).join("") : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#141413" : "#FFFFFF";
}
/** Only https images (our uploads) are shown. */
export function safeImage(u: string | null | undefined): string | null {
  return typeof u === "string" && /^https:\/\//i.test(u) ? u : null;
}
