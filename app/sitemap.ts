// app/sitemap.ts
// Native Next.js sitemap — auto-served at https://www.goutsyde.com/sitemap.xml
// Lists the pages you WANT Google to index. Add new vendor/product pages here
// as they go live so they get crawled.
//
// WHERE THIS GOES:  outsyde-web/app/sitemap.ts

import type { MetadataRoute } from "next";

const BASE = "https://www.goutsyde.com";

// Dia Lux product detail slugs (keep in sync with lib/dialux-products.ts)
const DIALUX_SLUGS = [
  "filipino-raw-straight",
  "vietnamese-raw-wavy",
  "raw-burmese-curly",
  "wavy-bundle-deal-18-20-22",
  "wavy-bundle-deal-20-22-24",
  "straight-bundle-deal-18-20-22",
  "straight-bundle-deal-20-22-24",
  "curly-bundle-deal-20-22-24",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Public, indexable pages. (Intentionally excluded: /cart, /shop/lotus/checkout,
  // and all /api/* routes — these have no SEO value and shouldn't be indexed.)
  const routes = [
    "",                       // homepage
    "/shop",                  // marketplace
    "/shop/lotus",            // Lotus storefront
    "/shop/lotus/about",
    "/shop/lotus/terms",
    "/shop/lotus/wholesale",
    "/shop/dialux",           // Dia Lux storefront
    "/shop/royalelite",       // Royal Elite
    "/coming-soon",
    ...DIALUX_SLUGS.map((s) => `/shop/dialux/${s}`),
  ];

  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}