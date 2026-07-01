// app/api/create-payment-intent/route.ts
// Native checkout — creates a destination-charge PaymentIntent for Lotus products.
//
// FEE MODEL: 5% vendor-side + 5% client upcharge, $1.50 floor on the vendor fee.
// All fee math lives in calculateFee() in lib/stripe-config.ts — this route
// never computes a fee inline.
//
// STRIPE FEE HANDLING (confirmed):
// This is a destination charge. Stripe bills its processing fee to Outsyde's
// platform balance on every transaction — with or without on_behalf_of — per
// Stripe's Connect documentation. There is no on_behalf_of here, and none
// should be added: it wouldn't shift that liability to the vendor on this
// charge type. That's intentional — Outsyde absorbing Stripe's fee is what
// gives every vendor the same take-home percentage at every price point.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  VENDOR_ACCOUNT_ID,
  PRICE_IDS,
  TEST_PRICE_IDS,
  STRIPE_TAX_ENABLED,
  calculateFee,
} from "@/lib/stripe-config";

function getStripe() {
  const SECRET = process.env.STRIPE_SECRET_KEY;
  if (!SECRET) throw new Error("STRIPE_SECRET_KEY is not set");
  return { stripe: new Stripe(SECRET), isTest: SECRET.startsWith("sk_test") };
}

type IncomingItem = { id: string; name?: string; qty?: number };

export async function POST(req: NextRequest) {
  try {
    const { stripe, isTest: IS_TEST } = getStripe();

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
    //    (never trust the amount the browser sends) — unchanged.
    let baseTotalCents = 0;
    const lineSummaries: { name: string; quantity: number; amount: number }[] = [];

    const priceMap = IS_TEST ? { ...PRICE_IDS, ...TEST_PRICE_IDS } : PRICE_IDS;
    for (const it of items) {
      const priceId = priceMap[it.id];
      if (!priceId) {
        return NextResponse.json({ error: `Unknown product: ${it.id}` }, { status: 400 });
      }
      const price = IS_TEST
        ? await stripe.prices.retrieve(priceId)
        : await stripe.prices.retrieve(priceId, {}, { stripeAccount: VENDOR_ACCOUNT_ID });
      const unit = price.unit_amount ?? 0;
      const qty = Math.max(1, Number(it.qty) || 1);
      baseTotalCents += unit * qty;
      lineSummaries.push({ name: it.name || priceId, quantity: qty, amount: unit * qty });
    }

    // 2) FEES — single source of truth, from lib/stripe-config.ts.
    const { vendorFeeCents, clientUpchargeCents, applicationFeeCents } =
      calculateFee(baseTotalCents, "product");

    // 3) TAX — unchanged
    let taxCents = 0;
    let taxCalculationId = "";
    if (STRIPE_TAX_ENABLED && shipping?.addressLine1) {
      const calc = await stripe.tax.calculations.create({
        currency: "usd",
        line_items: [
          { amount: baseTotalCents + clientUpchargeCents, reference: "order", tax_behavior: "exclusive" },
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
      taxCalculationId = calc.id ?? "";
    }

    // 4) Total the customer pays = base + client upcharge + tax
    const amount = baseTotalCents + clientUpchargeCents + taxCents;

    // 5) DESTINATION CHARGE — application_fee_amount is the platform's cut.
    //    Stripe transfers (amount - applicationFeeCents) to the vendor.
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      ...(IS_TEST
        ? {}
        : {
            transfer_data: { destination: VENDOR_ACCOUNT_ID },
            application_fee_amount: applicationFeeCents,
          }),
      ...(email ? { receipt_email: email } : {}),
      metadata: {
        vendor_account_id: VENDOR_ACCOUNT_ID,
        base_total_cents: String(baseTotalCents),
        vendor_fee_cents: String(vendorFeeCents),
        service_fee_cents: String(clientUpchargeCents),
        application_fee_cents: String(applicationFeeCents),
        tax_cents: String(taxCents),
        customer_total_cents: String(amount),
        // Reporting only — Stripe's processing fee is billed to Outsyde's
        // platform balance on this charge type, not the vendor's.
        estimated_stripe_fee_cents_charged_to_platform: String(
          Math.round(amount * 0.029 + 30)
        ),
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
        serviceFee: clientUpchargeCents / 100,
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