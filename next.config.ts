import type { NextConfig } from "next";
import { LEGAL_REDIRECTS } from "./lib/legal-pages";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-3eedcbff3d38496598a620e7bc45085b.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'image.mux.com',
      },
      {
        protocol: 'https',
        hostname: 'stream.mux.com',
      },
    ],
  },
  async redirects() {
    // Old Wix legal URLs that Google still crawls → the new legal pages (308).
    return LEGAL_REDIRECTS.map((r) => ({ ...r, permanent: true }));
  },
  async headers() {
    return [
      {
        // Free-plan claim links carry a secret token in the path: never send it in a Referer.
        source: "/subscribe/free/:token",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // The app opens the plan offer confirm page with ?token= (its sign in): never send it in a Referer.
        source: "/plan-offer",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // iOS universal links: Apple fetches this file (no extension) and needs it as JSON.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default nextConfig;