// app/api/stripe-webhook/route.ts
// Fires after a successful native payment. Verifies signature, sends the 3 emails,
// and finalizes the Stripe Tax record for filing.
//
// WHERE THIS GOES:  outsyde-web/app/api/stripe-webhook/route.ts
//
// Needs (in .env.local / Vercel):  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//
// NOTE: signature verification (incl. the replay/timestamp check you had disabled on Wix)
// is handled correctly + automatically by stripe.webhooks.constructEvent below.
//
// NOTE 2: payment_intent.succeeded fires for EVERY successful PaymentIntent on the
// account — not just storefront orders. Vendor platform subscription charges (Stripe
// Billing invoices), manual charges, etc. also land here. Only PaymentIntents created
// by our own /api/create-payment-intent route carry vendor_account_id + items_json
// metadata, so we gate on that before doing any order processing or sending emails.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  sendOutsydeSaleNotification,
  sendLotusOrderNotification,
  sendCustomerOrderConfirmation,
} from "@/lib/emails";

function getStripe() {
  const SECRET = process.env.STRIPE_SECRET_KEY;
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!SECRET) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return { stripe: new Stripe(SECRET), WEBHOOK_SECRET };
}

export async function POST(req: NextRequest) {
  const { stripe, WEBHOOK_SECRET } = getStripe();

  const body = await req.text(); // RAW body required for signature verification
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad signature";
    console.error("❌ Webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const m = pi.metadata || {};

    // Only process PaymentIntents created by our own storefront checkout flow.
    // Vendor subscription/platform-billing PaymentIntents (and anything else not
    // created via /api/create-payment-intent) won't have this metadata — skip them
    // so we don't send "New Sale" emails with zeroed-out, fabricated order data.
    if (!m.vendor_account_id || !m.items_json) {
      console.log(`⏭️  Skipping ${pi.id} — not a storefront order (no checkout metadata).`);
      return NextResponse.json({ received: true });
    }

    const items = parseItems(m.items_json);
    const shippingAddress = {
      line1: m.address_line1 || "",
      city: m.city || "",
      state: m.state || "",
      postal_code: m.zip || "",
      country: m.country || "",
    };

    // Finalize Stripe Tax transaction (for your tax filing) if tax was calculated
    if (m.tax_calculation_id) {
      try {
        await stripe.tax.transactions.createFromCalculation({
          calculation: m.tax_calculation_id,
          reference: pi.id,
        });
      } catch (e) {
        console.error("tax transaction error:", e);
      }
    }

    try {
      await Promise.all([
        sendOutsydeSaleNotification({
          customerName: m.customer_name || "Customer",
          customerEmail: m.customer_email || "",
          customerPhone: m.customer_phone || "",
          orderId: pi.id,
          items,
          baseTotalCents: Number(m.base_total_cents || 0),
          customerTotalCents: Number(m.customer_total_cents || 0),
          platformFeeCents: Number(m.platform_fee_cents || 0),
          vendorPayoutCents: Number(m.vendor_payout_cents || 0),
          shippingAddress,
        }),
        sendLotusOrderNotification({
          customerName: m.customer_name || "Customer",
          customerEmail: m.customer_email || "",
          customerPhone: m.customer_phone || "",
          orderId: pi.id,
          items,
          vendorPayoutCents: Number(m.vendor_payout_cents || 0),
          shippingAddress,
        }),
        m.customer_email
          ? sendCustomerOrderConfirmation({
              customerName: m.customer_name || "Customer",
              customerEmail: m.customer_email,
              orderId: pi.id,
              items,
              customerTotalCents: Number(m.customer_total_cents || 0),
              shippingAddress,
            })
          : Promise.resolve(),
      ]);
      console.log(`✅ Emails sent for order ${pi.id}`);
    } catch (e) {
      console.error("email send error:", e);
    }
  }

  return NextResponse.json({ received: true });
}

// Rebuild the item shape your email templates expect
function parseItems(json?: string) {
  try {
    const arr = JSON.parse(json || "[]") as { name: string; quantity: number; amount: number }[];
    return arr.map((i) => ({
      description: i.name,
      title: i.name,
      quantity: i.quantity,
      amount_total: i.amount,
    }));
  } catch {
    return [];
  }
}