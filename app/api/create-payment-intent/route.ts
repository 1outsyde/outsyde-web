// app/api/create-payment-intent/route.ts
// Native checkout — creates a destination-charge PaymentIntent.
// Ports your Wix createPaymentIntent to Next.js + Stripe SDK.
//
// WHERE THIS GOES:  outsyde-web/app/api/create-payment-intent/route.ts
//
// Needs (in .env.local):  STRIPE_SECRET_KEY  (+ STRIPE_TAX_ENABLED optional)
// Install:  npm install stripe

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  VENDOR_ACCOUNT_ID,
  SERVICE_FEE_RATE,
  VENDOR_FEE_RATE,
  PRICE_IDS,
  TEST_PRICE_IDS,
  STRIPE_TAX_ENABLED,
} from "@/lib/stripe-config";

const SECRET = process.env.STRIPE_SECRET_KEY as string;
const stripe = new Stripe(SECRET);
const IS_TEST = SECRET.startsWith("sk_test");

type IncomingItem = { id: string; name?: string; qty?: number };

export async function POST(req: NextRequest) {
  try {
    const { items, shipping, email, phone } = (await req.json()) as {
      items: IncomingItem[];
      shipping?: {
        fullName?: string; addressLine1?: string; city?: string;
        state?: string; zipCode?: string; country?: string;
      };
      email?: string;
      phone?: string;
    };

    if (!items?.length) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    // 1) AUTHORITATIVE base price — pulled from the connected account's price IDs
    //    (never trust the amount the browser sends)
    let baseTotalCents = 0;
    const lineSummaries: { name: string; quantity: number; amount: number }[] = [];

    const priceMap = IS_TEST ? { ...PRICE_IDS, ...TEST_PRICE_IDS } : PRICE_IDS;
    for (const it of items) {
      const priceId = priceMap[it.id];
      if (!priceId) {
        return NextResponse.json({ error: `Unknown product: ${it.id}` }, { status: 400 });
      }
      // TEST: read price from platform. LIVE: read from the vendor's connected account.
      const price = IS_TEST
        ? await stripe.prices.retrieve(priceId)
        : await stripe.prices.retrieve(priceId, {}, { stripeAccount: VENDOR_ACCOUNT_ID });
      const unit = price.unit_amount ?? 0;
      const qty = Math.max(1, Number(it.qty) || 1);
      baseTotalCents += unit * qty;
      lineSummaries.push({ name: it.name || priceId, quantity: qty, amount: unit * qty });
    }

    // 2) FEES (locked model): customer +5% service fee, vendor base −7%
    const serviceFeeCents = Math.round(baseTotalCents * SERVICE_FEE_RATE);
    const vendorPayoutCents = Math.round(baseTotalCents * (1 - VENDOR_FEE_RATE));

    // 3) TAX (Stripe Tax) — only runs when enabled + a shipping address is present
    let taxCents = 0;
    let taxCalculationId = "";
    if (STRIPE_TAX_ENABLED && shipping?.addressLine1) {
      const calc = await stripe.tax.calculations.create({
        currency: "usd",
        line_items: [
          { amount: baseTotalCents + serviceFeeCents, reference: "order", tax_behavior: "exclusive" },
        ],
        customer_details: {
          address: {
            line1: shipping.addressLine1 || "",
            city: shipping.city || "",
            state: shipping.state || "",
            postal_code: shipping.zipCode || "",
            country: shipping.country || "US",
          },
          address_source: "shipping",
        },
      });
      taxCents = calc.tax_amount_exclusive ?? 0;
      taxCalculationId = calc.id;
    }

    // 4) Total the customer pays = base + service fee + tax
    const amount = baseTotalCents + serviceFeeCents + taxCents;
    // Outsyde gross (before Stripe's fee) = service fee + 7% of base
    const platformFeeCents = amount - vendorPayoutCents - taxCents;

    // 5) DESTINATION CHARGE — funds flow through Outsyde, vendor receives their cut
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      // TEST mode can't transfer to a live connected account, so skip the split there.
      ...(IS_TEST ? {} : { transfer_data: { destination: VENDOR_ACCOUNT_ID, amount: vendorPayoutCents } }),
      ...(email ? { receipt_email: email } : {}),
      metadata: {
        vendor_account_id: VENDOR_ACCOUNT_ID,
        base_total_cents: String(baseTotalCents),
        service_fee_cents: String(serviceFeeCents),
        tax_cents: String(taxCents),
        customer_total_cents: String(amount),
        vendor_payout_cents: String(vendorPayoutCents),
        platform_fee_cents: String(platformFeeCents),
        tax_calculation_id: taxCalculationId,
        customer_email: email || "",
        customer_phone: phone || "",
        customer_name: shipping?.fullName || "",
        address_line1: shipping?.addressLine1 || "",
        city: shipping?.city || "",
        state: shipping?.state || "",
        zip: shipping?.zipCode || "",
        country: shipping?.country || "US",
        items_json: JSON.stringify(lineSummaries).slice(0, 480),
      },
    });

    return NextResponse.json({
      clientSecret: pi.client_secret,
      breakdown: {
        subtotal: baseTotalCents / 100,
        serviceFee: serviceFeeCents / 100,
        tax: taxCents / 100,
        total: amount / 100,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment.";
    console.error("create-payment-intent error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}