// lib/dialux-products.ts
// Single source of truth for Dia Lux Kollection products.
// Imported by BOTH the storefront (app/shop/dialux/page.tsx) and the
// product detail pages (app/shop/dialux/[slug]/page.tsx) so they never drift.
//
// WHERE THIS GOES:  outsyde-web/lib/dialux-products.ts

// ── Per-inch price ladder for single bundles (12"–32") ──
export const LENGTH_PRICES: Record<number, number> = {
  12: 125, 14: 135, 16: 145, 18: 155, 20: 165, 22: 175,
  24: 185, 26: 195, 28: 205, 30: 225, 32: 235,
};
export const LENGTHS = Object.keys(LENGTH_PRICES).map(Number);

export type DialuxKind = "single" | "deal";

export type DialuxProduct = {
  slug: string;
  id: string;            // base id (singles append -<length> at add-to-cart)
  name: string;
  texture: "Straight" | "Wavy" | "Curly";
  kind: DialuxKind;
  image: string;
  blurb: string;         // short, for cards
  long: string;          // full description, for detail page
  details: string[];     // bullet points
  // singles only:
  basePrice?: number;    // shown as "from $X"
  // deals only:
  price?: number;        // fixed price
  lengths?: string;      // e.g. "18″ · 20″ · 22″"
};

export const DIALUX_PRODUCTS: DialuxProduct[] = [
  // ── SINGLE BUNDLES ──
  {
    slug: "filipino-raw-straight",
    id: "dlx-straight",
    name: "Filipino Raw Straight",
    texture: "Straight",
    kind: "single",
    image: "/dialux-straight.jpg",
    blurb: "Sleek, bone-straight density with natural shine. Colors, styles, and heat-treats beautifully.",
    long: "Our Filipino Raw Straight bundles deliver a sleek, smooth finish with natural shine and full density, designed for flawless installs and everyday wear. Sourced from a single donor, each bundle lies perfectly flat with a natural luster that mimics the look and feel of your own hair.",
    details: [
      "100% raw Filipino hair",
      "Naturally straight with a soft, silky texture",
      "Minimal shedding and tangling",
      "Can be colored, styled, and heat-treated",
      "Maintains smoothness after washing",
    ],
    basePrice: 125,
  },
  {
    slug: "vietnamese-raw-wavy",
    id: "dlx-wavy",
    name: "Vietnamese Raw Wavy",
    texture: "Wavy",
    kind: "single",
    image: "/dialux-wavy.jpg",
    blurb: "Soft, full-bodied waves with effortless movement and a luxurious drape.",
    long: "The perfect balance between straight and curly. Our Vietnamese Raw Wavy bundles bring a natural, effortless wave pattern that moves beautifully and holds its texture wash after wash. Sourced from a single Vietnamese donor, these bundles are full, dense, and tangle-resistant — wear them air-dried for natural waves or flat-ironed for sleek versatility.",
    details: [
      "100% raw Vietnamese hair",
      "Natural, effortless wave pattern",
      "Full, dense, and tangle-resistant",
      "Can be colored, styled, and heat-treated",
      "Holds texture wash after wash",
    ],
    basePrice: 125,
  },
  {
    slug: "raw-burmese-curly",
    id: "dlx-curly",
    name: "Raw Burmese Curly",
    texture: "Curly",
    kind: "single",
    image: "/dialux-curly.jpg",
    blurb: "Defined, springy curls with rich texture and fullness from root to tip.",
    long: "Defined, springy curls with rich texture and fullness from root to tip. Our Raw Burmese Curly bundles hold their pattern with bounce and body, blending seamlessly for a bold, voluminous install. Sourced raw and single-donor, they can be styled, colored, and revived wash after wash.",
    details: [
      "100% raw Burmese hair",
      "Defined, springy curl pattern",
      "Rich texture and fullness root to tip",
      "Can be colored, styled, and heat-treated",
      "Revives beautifully after washing",
    ],
    basePrice: 125,
  },

  // ── BUNDLE DEALS (fixed 3-bundle sets) ──
  {
    slug: "wavy-bundle-deal-18-20-22",
    id: "dlx-deal-wavy-375",
    name: "Vietnamese Raw Wavy · 18\u2033 / 20\u2033 / 22\u2033",
    texture: "Wavy",
    kind: "deal",
    image: "/dialux-wavy.jpg",
    blurb: "Three raw wavy bundles, ready to install. Our most popular starter length.",
    long: "Three raw wavy bundles, ready to install. Our most popular starter length — natural, effortless movement that holds wash after wash. A complete, single-donor set built for a full, seamless install.",
    details: ["3-bundle set", "Includes 18\u2033 · 20\u2033 · 22\u2033", "100% raw Vietnamese wavy hair", "Single-donor consistency"],
    price: 375,
    lengths: "18\u2033 · 20\u2033 · 22\u2033",
  },
  {
    slug: "wavy-bundle-deal-20-22-24",
    id: "dlx-deal-wavy-415",
    name: "Vietnamese Raw Wavy · 20\u2033 / 22\u2033 / 24\u2033",
    texture: "Wavy",
    kind: "deal",
    image: "/dialux-wavy.jpg",
    blurb: "Three raw wavy bundles in longer lengths for full, dramatic volume.",
    long: "Three raw wavy bundles in longer lengths for full, dramatic volume with an effortless drape. A single-donor set that delivers length and body for a show-stopping install.",
    details: ["3-bundle set", "Includes 20\u2033 · 22\u2033 · 24\u2033", "100% raw Vietnamese wavy hair", "Single-donor consistency"],
    price: 415,
    lengths: "20\u2033 · 22\u2033 · 24\u2033",
  },
  {
    slug: "straight-bundle-deal-18-20-22",
    id: "dlx-deal-straight-395",
    name: "Filipino Raw Straight · 18\u2033 / 20\u2033 / 22\u2033",
    texture: "Straight",
    kind: "deal",
    image: "/dialux-straight.jpg",
    blurb: "Three raw straight bundles, single-donor and sleek. The perfect foundation length.",
    long: "Three raw straight bundles, single-donor and sleek. The perfect foundation length for a flawless, polished install — bone-straight density with a natural shine that lasts.",
    details: ["3-bundle set", "Includes 18\u2033 · 20\u2033 · 22\u2033", "100% raw Filipino straight hair", "Single-donor consistency"],
    price: 395,
    lengths: "18\u2033 · 20\u2033 · 22\u2033",
  },
  {
    slug: "straight-bundle-deal-20-22-24",
    id: "dlx-deal-straight-450",
    name: "Filipino Raw Straight · 20\u2033 / 22\u2033 / 24\u2033",
    texture: "Straight",
    kind: "deal",
    image: "/dialux-straight.jpg",
    blurb: "Three raw straight bundles in longer lengths — bone-straight density and natural shine.",
    long: "Three raw straight bundles in longer lengths — bone-straight density and natural shine from root to tip. A single-donor set built for a sleek, dramatic, full-length install.",
    details: ["3-bundle set", "Includes 20\u2033 · 22\u2033 · 24\u2033", "100% raw Filipino straight hair", "Single-donor consistency"],
    price: 450,
    lengths: "20\u2033 · 22\u2033 · 24\u2033",
  },
  {
    slug: "curly-bundle-deal-20-22-24",
    id: "dlx-deal-curly-415",
    name: "Raw Burmese Curly · 20\u2033 / 22\u2033 / 24\u2033",
    texture: "Curly",
    kind: "deal",
    image: "/dialux-curly.jpg",
    blurb: "Three raw curly bundles with defined, springy texture and rich fullness.",
    long: "Three raw curly bundles with defined, springy texture and rich fullness for a bold, voluminous install. A single-donor set that holds its pattern with bounce and body wash after wash.",
    details: ["3-bundle set", "Includes 20\u2033 · 22\u2033 · 24\u2033", "100% raw Burmese curly hair", "Single-donor consistency"],
    price: 415,
    lengths: "20\u2033 · 22\u2033 · 24\u2033",
  },
];

export function getDialuxProduct(slug: string): DialuxProduct | undefined {
  return DIALUX_PRODUCTS.find((p) => p.slug === slug);
}

// Related = other products sharing the same texture, excluding the current one.
export function relatedByTexture(slug: string): DialuxProduct[] {
  const current = getDialuxProduct(slug);
  if (!current) return [];
  return DIALUX_PRODUCTS.filter(
    (p) => p.texture === current.texture && p.slug !== current.slug
  );
}