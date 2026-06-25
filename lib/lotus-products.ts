// lib/lotus-products.ts
// Single source of truth for the 9 Lotus House Blends products.
// Used by the product detail pages (app/shop/lotus/[slug]/page.tsx).
//
// WHERE THIS GOES:  outsyde-web/lib/lotus-products.ts
//
// IDs match lib/stripe-config.ts PRICE_IDS and the cart ids on the storefront.
// Slugs match the existing card links (so the storefront find/replace is one line).
// COMPLIANCE: shopper-facing copy says "Aromatherapy Cones" (never "pre-rolls").
// The slug keeps "pre-rolls" (URL only, not shopper copy) — that's fine.

export type LotusFormat = "cones" | "herbs" | "tea";

export type LotusProduct = {
  id: string;          // cart id + Stripe price map key (e.g. "dt-cones")
  slug: string;        // URL segment (e.g. "dream-temple-pre-rolls")
  name: string;        // exact cart/checkout/email name
  blend: string;       // "Dream Temple"
  blendTime: string;   // "Night Blend"
  blendNote: string;   // one-line mood
  format: LotusFormat;
  formatLabel: string; // "Aromatherapy Cones" | "Loose Herbs" | "Tea Box"
  price: number;
  bundle: string;      // "3 for $20"
  image: string;       // /public path
  short: string;       // one-line description
  long: string;        // detail paragraph
  details: string[];   // spec bullets
};

// All copy below is synced to the live Lotus storefront (app/shop/lotus/page.tsx).
// To change a product's wording, edit it here — the detail pages read from this file.
export const LOTUS_PRODUCTS: LotusProduct[] = [
  // ---------- DREAM TEMPLE — NIGHT ----------
  {
    id: "dt-cones", slug: "dream-temple-pre-rolls",
    name: "Dream Temple Herbal Cones",
    blend: "Dream Temple", blendTime: "Night Blend",
    blendNote: "Ease into rest · Calm the nervous system",
    format: "cones", formatLabel: "Herbal Cones",
    price: 10.0, bundle: "3 for $20", image: "/dream-temple-prerolls.jpg",
    short: "Four herbal cones. Eases stress and tension, promotes deep sleep, supports dream clarity, and relaxes the nervous system.",
    long: "Dream Temple is our night blend. Each herbal cone is a slow evening ritual — easing stress and tension, promoting deep sleep, supporting dream clarity, and relaxing the nervous system.",
    details: ["4 herbal cones per pack", "Night blend", "No tobacco · No nicotine · No cannabis"],
  },
  {
    id: "dt-herbs", slug: "dream-temple-loose-herbs",
    name: "Dream Temple Loose-Herbs",
    blend: "Dream Temple", blendTime: "Night Blend",
    blendNote: "Ease into rest · Calm the nervous system",
    format: "herbs", formatLabel: "Loose Herbs",
    price: 18.75, bundle: "3 for $35", image: "/dream-temple-loose-herbs.jpg",
    short: "Loose herbal blend. Eases stress and tension, promotes deep sleep, and calms inflammation from stress.",
    long: "The loose-herb form of our Dream Temple night blend — for tea, ritual, or your own preparation. Eases stress and tension, promotes deep sleep, and calms inflammation from stress.",
    details: ["Loose botanical blend", "Night blend", "No tobacco · No nicotine · No cannabis"],
  },
  {
    id: "dt-tea", slug: "dream-temple-tea-box",
    name: "Dream Temple Tea Box",
    blend: "Dream Temple", blendTime: "Night Blend",
    blendNote: "Ease into rest · Calm the nervous system",
    format: "tea", formatLabel: "Tea Box",
    price: 12.5, bundle: "3 for $25", image: "/dream-temple-tea-box.jpg",
    short: "Five tea bags. Promotes deep sleep, supports dream clarity, relaxes the nervous system, and calms inflammation.",
    long: "Dream Temple as a ready-to-steep evening tea. Five bags of our night blend to promote deep sleep, support dream clarity, relax the nervous system, and calm inflammation.",
    details: ["5 tea bags per box", "Night blend", "No tobacco · No nicotine · No cannabis"],
  },

  // ---------- HEART FLOW — MIDDAY ----------
  {
    id: "hf-cones", slug: "heart-flow-pre-rolls",
    name: "Heart Flow Herbal Cones",
    blend: "Heart Flow", blendTime: "Midday Blend",
    blendNote: "Stay balanced & grounded · Supports digestion",
    format: "cones", formatLabel: "Herbal Cones",
    price: 10.0, bundle: "3 for $20", image: "/heart-flow-prerolls.jpg",
    short: "Four herbal cones. Keeps you balanced and grounded. Reduces hormonal inflammation and promotes emotional clarity.",
    long: "Heart Flow is our midday blend. Each herbal cone keeps you balanced and grounded through the middle of the day — reducing hormonal inflammation and promoting emotional clarity.",
    details: ["4 herbal cones per pack", "Midday blend", "No tobacco · No nicotine · No cannabis"],
  },
  {
    id: "hf-herbs", slug: "heart-flow-loose-herbs",
    name: "Heart Flow Loose-Herbs",
    blend: "Heart Flow", blendTime: "Midday Blend",
    blendNote: "Stay balanced & grounded · Supports digestion",
    format: "herbs", formatLabel: "Loose Herbs",
    price: 18.75, bundle: "3 for $35", image: "/heart-flow-loose-herbs.jpg",
    short: "Loose herbal blend. Balances mood, calms the nervous system, reduces hormonal inflammation, and supports digestion and emotional clarity.",
    long: "The loose-herb form of our Heart Flow midday blend. Balances mood, calms the nervous system, reduces hormonal inflammation, and supports digestion and emotional clarity.",
    details: ["Loose botanical blend", "Midday blend", "No tobacco · No nicotine · No cannabis"],
  },
  {
    id: "hf-tea", slug: "heart-flow-tea-box",
    name: "Heart Flow Tea Box",
    blend: "Heart Flow", blendTime: "Midday Blend",
    blendNote: "Stay balanced & grounded · Supports digestion",
    format: "tea", formatLabel: "Tea Box",
    price: 12.5, bundle: "3 for $25", image: "/heart-flow-tea-box.jpg",
    short: "Five tea bags. Keeps you balanced and grounded through midday. Promotes emotional clarity and supports digestion.",
    long: "Heart Flow as a ready-to-steep tea. Five bags of our midday blend to keep you balanced and grounded — promoting emotional clarity and supporting digestion.",
    details: ["5 tea bags per box", "Midday blend", "No tobacco · No nicotine · No cannabis"],
  },

  // ---------- RISE & BLOOM — MORNING ----------
  {
    id: "rb-cones", slug: "rise-bloom-pre-rolls",
    name: "Rise & Bloom Herbal Cones",
    blend: "Rise & Bloom", blendTime: "Morning Blend",
    blendNote: "Clear the mind · Get the day moving",
    format: "cones", formatLabel: "Herbal Cones",
    price: 10.0, bundle: "3 for $20", image: "/rise-bloom-prerolls.png",
    short: "Four herbal cones. Clears brain fog, reduces inflammation, supports focus and clarity, and gets the day moving.",
    long: "Rise & Bloom is our morning blend. Each herbal cone helps clear brain fog, reduce inflammation, and support focus and clarity to get the day moving.",
    details: ["4 herbal cones per pack", "Morning blend", "No tobacco · No nicotine · No cannabis"],
  },
  {
    id: "rb-herbs", slug: "rise-bloom-loose-herbs",
    name: "Rise & Bloom Loose-Herbs",
    blend: "Rise & Bloom", blendTime: "Morning Blend",
    blendNote: "Clear the mind · Get the day moving",
    format: "herbs", formatLabel: "Loose Herbs",
    price: 18.75, bundle: "3 for $35", image: "/rise-bloom-loose-herbs.jpg",
    short: "Loose herbal blend. Clears brain fog, reduces inflammation, opens the lungs, supports focus and clarity, and gently boosts energy.",
    long: "The loose-herb form of our Rise & Bloom morning blend. Clears brain fog, reduces inflammation, opens the lungs, supports focus and clarity, and gently boosts energy.",
    details: ["Loose botanical blend", "Morning blend", "No tobacco · No nicotine · No cannabis"],
  },
  {
    id: "rb-tea", slug: "rise-bloom-tea-box",
    name: "Rise & Bloom Tea Box",
    blend: "Rise & Bloom", blendTime: "Morning Blend",
    blendNote: "Clear the mind · Get the day moving",
    format: "tea", formatLabel: "Tea Box",
    price: 12.5, bundle: "3 for $25", image: "/rise-bloom-tea-box.jpg",
    short: "Five tea bags. Clears brain fog, reduces inflammation, opens the lungs, supports focus, and gently boosts energy.",
    long: "Rise & Bloom as a ready-to-steep morning tea. Five bags of our morning blend to clear brain fog, reduce inflammation, open the lungs, support focus, and gently boost energy.",
    details: ["5 tea bags per box", "Morning blend", "No tobacco · No nicotine · No cannabis"],
  },
];

export function getLotusProduct(slug: string): LotusProduct | undefined {
  return LOTUS_PRODUCTS.find((p) => p.slug === slug);
}

// Other formats within the same blend family (for "complete the ritual").
export function relatedInBlend(slug: string): LotusProduct[] {
  const p = getLotusProduct(slug);
  if (!p) return [];
  return LOTUS_PRODUCTS.filter((x) => x.blend === p.blend && x.slug !== p.slug);
}