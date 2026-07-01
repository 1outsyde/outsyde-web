// lib/stripe-config.ts
// SAFE values only (IDs + rates). NO secret keys here — those live in .env.local.
//
// WHERE THIS GOES:  outsyde-web/lib/stripe-config.ts

export const VENDOR_ACCOUNT_ID = "acct_1SQl9ZRvtSpkHygW"; // Lotus House Blends connected account

// ============================================================
// FEE MODEL (LOCKED) — single source of truth.
// Both the checkout page and the payment-intent route import
// calculateFee() from here. Never recompute a fee inline anywhere
// else — that's how web and mobile silently drift apart.
//
// 5% vendor-side + 5% client upcharge, everywhere. $1.50 floor on
// the vendor fee applies to products only.
// ============================================================
export const FEE_RATES = {
  product: { vendor: 0.05, client: 0.05 },
  booking: { vendor: 0.05, client: 0.05 },
  staff:   { vendor: 0.035, client: 0 },
} as const;

export const PRODUCT_FLOOR_CENTS = 150; // $1.50 minimum vendor fee — products only

export type TransactionType = keyof typeof FEE_RATES;

export function calculateFee(amountCents: number, transactionType: TransactionType = "product") {
  const { vendor, client } = FEE_RATES[transactionType];

  let vendorFeeCents = Math.round(amountCents * vendor);
  if (transactionType === "product") {
    vendorFeeCents = Math.max(vendorFeeCents, PRODUCT_FLOOR_CENTS);
  }

  const clientUpchargeCents = Math.round(amountCents * client);
  const applicationFeeCents = vendorFeeCents + clientUpchargeCents;

  return { vendorFeeCents, clientUpchargeCents, applicationFeeCents };
}

// Kept for any code that still references the old flat constants directly.
// Prefer calculateFee() for anything actually computing a charge.
export const SERVICE_FEE_RATE = FEE_RATES.product.client; // 0.05
export const VENDOR_FEE_RATE = FEE_RATES.product.vendor;  // 0.05 — corrected from 0.07

// Cart product id -> Stripe price ID (LIVE prices, on the connected account)
export const PRICE_IDS: Record<string, string> = {
  "dt-cones": "price_1SSJ9NRvtSpkHygWXUuZaaHJ", // Dream Temple Herbal Cones
  "dt-herbs": "price_1SSJBoRvtSpkHygWyXqRJNAw", // Dream Temple Loose-Herbs
  "dt-tea":   "price_1SSJAURvtSpkHygWwQNuZv5l", // Dream Temple Tea Box
  "hf-herbs": "price_1SSJK9RvtSpkHygWTOJg9uys", // Heart Flow Loose-Herbs
  "hf-tea":   "price_1SSJDjRvtSpkHygWBJ7NlA9D", // Heart Flow Tea Box
  "hf-cones": "price_1SSJEpRvtSpkHygW4fSLLbzm", // Heart Flow Herbal Cones
  "rb-herbs": "price_1SSJLKRvtSpkHygWf79wG39N", // Rise & Bloom Loose-Herbs
  "rb-tea":   "price_1SSJMqRvtSpkHygWzd1tzUOj", // Rise & Bloom Tea Box
  "rb-cones": "price_1SSJUrRvtSpkHygW9oDllVwa", // Rise & Bloom Herbal Cones
};

// TEST-mode price overrides — NOW EMPTY (fully live).
// Kept (empty) only so the API route's import doesn't break. Never used in live mode.
export const TEST_PRICE_IDS: Record<string, string> = {};

// Flip to true ONLY after you enable Stripe Tax + register nexus (set in .env.local)
export const STRIPE_TAX_ENABLED = process.env.STRIPE_TAX_ENABLED === "true";