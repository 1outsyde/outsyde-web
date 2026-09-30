import type { Metadata } from "next";

// The claim link carries a secret token in its path. `referrer: "no-referrer"` renders
// <meta name="referrer" content="no-referrer"> so nothing on this page can leak the URL through a
// Referer header (next.config.ts also sends the Referrer-Policy header for this path).
export const metadata: Metadata = {
  title: "Claim your free plan",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function FreePlanClaimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
