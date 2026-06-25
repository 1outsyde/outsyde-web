// app/api/stripe-webhook/route.ts
// Fires after a successful native payment. Verifies signature, sends the 3 emails,
// and finalizes the Stripe Tax record for filing.
//
// WHERE THIS GOES:  outsyde-web/app/api/stripe-webhook/route.ts
//
// Needs (in .env.local):  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//
// NOTE: signature verification (incl. the replay/timestamp check you had disabled on Wix)
// is handled correctly + automatically by stripe.webhooks.constructEvent below.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  sendOutsydeSaleNotification,
  sendLotusOrderNotification,
  sendCustomerOrderConfirmation,
} from "@/lib/emails";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: NextRequest) {
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