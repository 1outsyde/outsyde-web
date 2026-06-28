// lib/stripe-config.ts
// SAFE values only (IDs + rates). NO secret keys here — those live in .env.local.
//
// WHERE THIS GOES:  outsyde-web/lib/stripe-config.ts

export const VENDOR_ACCOUNT_ID = "acct_1SQl9ZRvtSpkHygW"; // Lotus House Blends connected account

// Fee model (LOCKED):
export const SERVICE_FEE_RATE = 0.05; // customer-facing service fee (5%)
export const VENDOR_FEE_RATE = 0.07;  // platform commission taken from vendor base (7%)

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