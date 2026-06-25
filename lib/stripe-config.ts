// lib/stripe-config.ts
// SAFE values only (IDs + rates). NO secret keys here — those live in .env.local.

export const VENDOR_ACCOUNT_ID = "acct_1SQl9ZRvtSpkHygW"; // Lotus House Blends connected account

// Fee model (LOCKED):
export const SERVICE_FEE_RATE = 0.05; // customer-facing service fee (5%)
export const VENDOR_FEE_RATE = 0.07;  // platform commission taken from vendor base (7%)

// Cart product id -> Stripe price ID (LIVE prices, on the connected account)
export const PRICE_IDS: Record<string, string> = {
  "dt-cones": "price_1SSJ9NRvtSpkHygWXUuZaaHJ",
  "dt-herbs": "price_1SSJBoRvtSpkHygWyXqRJNAw",
  "dt-tea":   "price_1SSJAURvtSpkHygWwQNuZv5l",
  "hf-herbs": "price_1SSJK9RvtSpkHygWTOJg9uys",
  "hf-tea":   "price_1SSJDjRvtSpkHygWBJ7NlA9D",
  "hf-cones": "price_1SSJEpRvtSpkHygW4fSLLbzm",
  "rb-herbs": "price_1SSJLKRvtSpkHygWf79wG39N",
  "rb-tea":   "price_1SSJMqRvtSpkHygWzd1tzUOj",
  "rb-cones": "price_1SSJUrRvtSpkHygW9oDllVwa",
};

// TEST-mode price IDs (live on the PLATFORM account). Only items listed here can be
// tested in test mode; everything else uses live PRICE_IDS above.
export const TEST_PRICE_IDS: Record<string, string> = {
  "dt-cones": "price_1SQkXDRxWOny76kZqP18cVMm", // Dream Temple Herbal Cones (TEST)
};

// Flip to true ONLY after you enable Stripe Tax + register nexus (set in .env.local)
export const STRIPE_TAX_ENABLED = process.env.STRIPE_TAX_ENABLED === "true";