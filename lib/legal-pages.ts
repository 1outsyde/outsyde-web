// lib/legal-pages.ts
// The one list of goutsyde.com legal pages and the old Wix legal URLs that
// redirect to them. Read by the homepage footer, app/sitemap.ts,
// next.config.ts redirects() and components/LegalLayout.tsx.

export type LegalHref = "/terms" | "/privacy" | "/refund-policy" | "/shipping-policy";

export const LEGAL_PAGES: ReadonlyArray<{ href: LegalHref; label: string }> = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/shipping-policy", label: "Shipping Policy" },
];

// Old Wix URLs that Google still crawls (Search Console, Oct 2026).
export const LEGAL_REDIRECTS: ReadonlyArray<{ source: string; destination: LegalHref }> = [
  { source: "/terms-and-conditions", destination: "/terms" },
  { source: "/english-privacy-policy", destination: "/privacy" },
  { source: "/english-refund-policy", destination: "/refund-policy" },
  { source: "/english-shipping-policy", destination: "/shipping-policy" },
];
