// app/robots.ts
// Native Next.js robots — auto-served at https://www.goutsyde.com/robots.txt
// Tells crawlers what they may index and where the sitemap lives.
//
// WHERE THIS GOES:  outsyde-web/app/robots.ts

import type { MetadataRoute } from "next";

const BASE = "https://www.goutsyde.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep crawlers out of paths with no SEO value / private flows.
      disallow: ["/api/", "/cart", "/shop/lotus/checkout"],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}