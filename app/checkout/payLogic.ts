/**
 * Shop checkout payment step (2026-10-29, Apple Pay on goutsyde.com). Pure decisions, unit tested with tsx.
 * Flow: details -> Continue to payment (the backend creates the order and the PaymentIntent and answers with the
 * exact charge) -> Apple Pay or card. Apple Pay must show the exact amount before its sheet opens, so the charge has
 * to exist first. Any change to what is being bought after Continue sends the buyer back to details.
 */

type SigItem = { id: string; vendorId: string; qty: number; priceCents: number; isExternalProduct?: boolean };
type SigAddr = { name: string; address: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string } } | null;

/** Everything that decides the order or its total. Display-only fields (names, images) are left out. */
export function checkoutSignature(s: { items: SigItem[]; shipping: SigAddr; promoCodeId: string | null }): string {
  return JSON.stringify({
    items: s.items.map((i) => [i.id, i.vendorId, i.qty, i.priceCents, !!i.isExternalProduct]),
    shipping: s.shipping
      ? [s.shipping.name, s.shipping.address.line1, s.shipping.address.line2 ?? "", s.shipping.address.city,
        s.shipping.address.state, s.shipping.address.postal_code, s.shipping.address.country]
      : null,
    promo: s.promoCodeId,
  });
}

export type PayStage = "details" | "payment";

/** On the payment step only while the prepared payment is for exactly this order. */
export function payStage(prepared: { signature: string } | null, current: string): PayStage {
  return prepared && prepared.signature === current ? "payment" : "details";
}

/** What the card or Apple Pay is charged: the server's amount (single shop, after codes) or its multi shop total. */
export function chargedCentsFrom(
  fb: { amountChargedCents?: number; totalChargedToConsumerCents: number } | undefined,
  fallbackCents: number,
): number {
  return fb?.amountChargedCents ?? fb?.totalChargedToConsumerCents ?? fallbackCents;
}

/** The order-success page's query, same for card and Apple Pay. */
export function successQuery(p: { itemCount: number; totalCharged: number; pointsEarned: number; orderId?: string; orderGroupId?: string }): string {
  return new URLSearchParams({
    itemCount: String(p.itemCount),
    totalCharged: String(p.totalCharged),
    pointsEarned: String(p.pointsEarned),
    ...(p.orderId ? { orderId: p.orderId } : {}),
    ...(p.orderGroupId ? { orderGroupId: p.orderGroupId } : {}),
  }).toString();
}

/** Apple Pay click: always resolve or reject. Opens only on the payment step with nothing else paying. */
export function shopApplePayClick(s: { inFlight: boolean; stage: PayStage }): "resolve" | "reject" {
  return !s.inFlight && s.stage === "payment" ? "resolve" : "reject";
}

/** Paid = Stripe says succeeded and there is no error. Anything else keeps the buyer on the payment step. */
export function isPaid(r: { error?: unknown; paymentIntent?: { status?: string } | null } | null): boolean {
  return !!r && !r.error && r.paymentIntent?.status === "succeeded";
}

type StripeAnswer = {
  error?: { code?: string; payment_intent?: { status?: string } | null } | null;
  paymentIntent?: { status?: string } | null;
} | null;

/**
 * One reading of a payment answer (card result, Apple Pay result, or Stripe's own status):
 *  paid       succeeded, including Stripe's "already succeeded" error on a retry, so a buyer who paid always reaches the order page
 *  refresh    the PaymentIntent was cancelled (another checkout took the same code): Continue again for a new one
 *  processing Stripe is still working on it
 *  failed     declined or unknown: try again on the same payment
 */
export function paymentAnswer(r: StripeAnswer): "paid" | "refresh" | "processing" | "failed" {
  if (!r) return "failed";
  const status = r.error ? r.error.payment_intent?.status : r.paymentIntent?.status;
  if (status === "succeeded") return "paid";
  if (status === "canceled") return "refresh";
  if (status === "processing") return "processing";
  return "failed";
}

type Totals = { subtotalCents: number; feeCents: number; discountCents: number; totalCents: number };

/** What the summary shows: the server's breakdown field by field (multi shop sends only the total), else the estimate. */
export function shownTotals(
  fb: { basePriceCents?: number; consumerUpchargeCents?: number; discountCents?: number; amountChargedCents?: number; totalChargedToConsumerCents?: number } | null,
  estimate: Totals,
): Totals {
  if (!fb) return estimate;
  return {
    subtotalCents: fb.basePriceCents ?? estimate.subtotalCents,
    feeCents: fb.consumerUpchargeCents ?? estimate.feeCents,
    discountCents: fb.discountCents ?? estimate.discountCents,
    totalCents: fb.amountChargedCents ?? fb.totalChargedToConsumerCents ?? estimate.totalCents,
  };
}

/** The contact and billing checks Continue makes, made again right before paying. Null = fine. */
export function contactProblem(s: { email: string; phone: string; billingSame: boolean; billComplete: boolean; hasBillAddr: boolean }): string | null {
  if (!s.email.includes("@")) return "Please enter a valid email.";
  if (!s.phone.trim()) return "Please enter a phone number.";
  if (!s.billingSame && (!s.billComplete || !s.hasBillAddr)) return "Please complete your billing address.";
  return null;
}
