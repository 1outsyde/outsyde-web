/**
 * Hidden plan offers (Plan Offers board, step 2): pure helpers shared by the popup, the banner, the
 * /plan-offer confirm page and the admin vendors page. No React, no fetch, so they can be tested with
 * `npx tsx tests/plan-offer.test.ts`.
 *
 * Backend contract: GET /api/vendor/plan-offer, POST /api/vendor/plan-offer/accept (outsyde-backend #346).
 * Screens follow the "Hidden Plan Offer Flow" canvas (20 artboards). Copy rules: commas and periods,
 * no dashes, never the service fee percentage.
 */
import { formatEtDate } from "./free-plan";

export type OfferPlan = "grandfathered" | "free";

export type OfferOutcome =
  | "start_free"
  | "replace_paid_with_free"
  | "start_paid"
  | "switch_paid"
  | "start_paid_after_free"
  | "replace_free_with_paid"
  | "invoice_billed"
  | "paid_plan_late"
  | "already_on_plan";

export interface PlanOffer {
  id: string;
  plan: OfferPlan;
  tierId: string;
  planName: string;
  priceInCents: number | null;
  maxStaff: number | null;
  freeExpiresAt: string | null;
  permanent: boolean;
  createdAt: string | null;
  businessId: string;
  businessName: string;
  username: string | null;
  outcome: OfferOutcome;
  dueTodayCents: number | null;
  billingStartsAt: string | null;
  currentPlanName: string | null;
  savedCard: { brand: string | null; last4: string | null } | null;
}

/** The latest offer on a GET /api/admin/businesses row. */
export interface AdminOfferSummary {
  id: string;
  plan: OfferPlan;
  status: "pending" | "accepted" | "withdrawn";
  freeExpiresAt: string | null;
  permanent: boolean;
  createdAt: string | null;
  acceptedAt: string | null;
  withdrawnAt: string | null;
}

/** "$40.99". */
export function formatMoney(cents: number | null | undefined): string {
  return typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "";
}

/** The pages where the popup and banner never show (they'd cover the flow itself or another site). */
const SKIP_PREFIXES = [
  "/admin",
  "/login",
  "/signup",
  "/claim",
  "/finish",
  "/forgot-password",
  "/reset-password",
  "/plan-offer",
  "/subscription",
  "/subscribe",
  "/shop",
  "/checkout",
  "/order-success",
];

export function shouldShowOfferPrompt(pathname: string | null | undefined): boolean {
  const p = (pathname || "/").toLowerCase();
  return !SKIP_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/** Which confirm page artboard the offer opens on. */
export type ConfirmScreen =
  | "free"          // FreeOffer: claim in place
  | "card"          // 2a ConfirmCard
  | "nocard"        // 2b ConfirmNoCard
  | "after_free"    // 2c ConfirmAfterFree
  | "ends_free"     // 2d ConfirmEndsFree
  | "switch"        // 2e ConfirmSwitch
  | "late"          // PlanLate
  | "invoice"       // InvoiceBilled
  | "gone";         // OfferGone

export function confirmScreen(offer: PlanOffer | null): ConfirmScreen {
  if (!offer) return "gone";
  if (offer.plan === "free") return "free";
  switch (offer.outcome) {
    case "paid_plan_late":
      return "late";
    case "invoice_billed":
      return "invoice";
    case "switch_paid":
      return "switch";
    case "start_paid_after_free":
      return "after_free";
    case "replace_free_with_paid":
      return "ends_free";
    case "already_on_plan":
      return "gone";
    default:
      return offer.savedCard ? "card" : "nocard";
  }
}

/** What an accept error means for the screen (backend codes), or null to show its message inline. */
export type ErrorScreen = "late" | "invoice" | "gone" | "busy";

export function errorScreen(status: number, code: string | null | undefined): ErrorScreen | null {
  if (code === "PLAN_LATE") return "late";
  if (code === "NOT_SWITCHABLE") return "invoice";
  if (code === "OFFER_BUSY") return "busy";
  if (code === "OFFER_NOT_AVAILABLE" || code === "OFFER_NOT_FOUND" || status === 404) return "gone";
  return null;
}

/** Plan price line under the plan name. */
export function priceLine(offer: Pick<PlanOffer, "plan" | "priceInCents" | "freeExpiresAt" | "permanent">): string {
  if (offer.plan === "free") return offer.permanent || !offer.freeExpiresAt ? "Free, no end date" : `Free until ${formatEtDate(offer.freeExpiresAt)}`;
  return `${formatMoney(offer.priceInCents)} a month`;
}

/** The primary button on the confirm page. */
export function acceptLabel(screen: ConfirmScreen, offer: Pick<PlanOffer, "dueTodayCents">): string {
  const due = formatMoney(offer.dueTodayCents);
  switch (screen) {
    case "free":
      return "Claim free plan";
    case "card":
    case "ends_free":
      return `Confirm and pay ${due}`;
    case "nocard":
      return "Add card and confirm";
    case "after_free":
      return "Confirm plan";
    case "switch":
      return `Switch and pay ${due}`;
    default:
      return "Close";
  }
}

/** Banner text (artboard Reminder). */
export function bannerText(offer: Pick<PlanOffer, "plan" | "planName" | "priceInCents" | "freeExpiresAt" | "permanent">): { title: string; body: string } {
  if (offer.plan === "free") {
    return { title: "Your free Outsyde plan is waiting", body: `${priceLine(offer)}. Tap to claim it.` };
  }
  return { title: `Your ${offer.planName} plan is waiting`, body: `${formatMoney(offer.priceInCents)} a month, reserved for you. Tap to review.` };
}

/** Per visit keys: the popup shows once per visit, then the banner; the banner's X hides it until the next visit. */
export const popupSeenKey = (offerId: string) => `outsyde_offer_popup_seen_${offerId}`;
export const bannerHiddenKey = (offerId: string) => `outsyde_offer_banner_hidden_${offerId}`;

/** Admin row: the offer column text. */
export function adminOfferText(o: AdminOfferSummary | null | undefined): { text: string; tone: "none" | "pending" | "accepted" | "withdrawn" } {
  if (!o) return { text: "No offer", tone: "none" };
  const plan = o.plan === "free" ? (o.permanent || !o.freeExpiresAt ? "Free plan, no end date" : `Free plan until ${formatEtDate(o.freeExpiresAt)}`) : "Grandfathered";
  if (o.status === "pending") return { text: `${plan} offer sent ${o.createdAt ? formatEtDate(o.createdAt) : ""}. Waiting for them to accept.`.replace(" .", "."), tone: "pending" };
  if (o.status === "accepted") return { text: `${plan} accepted ${o.acceptedAt ? formatEtDate(o.acceptedAt) : ""}`.trim(), tone: "accepted" };
  return { text: `${plan} offer withdrawn ${o.withdrawnAt ? formatEtDate(o.withdrawnAt) : ""}`.trim(), tone: "withdrawn" };
}
