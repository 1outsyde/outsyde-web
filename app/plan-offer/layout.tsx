import type { Metadata } from "next";

// The confirm page for a hidden plan offer is private to one owner: never indexed. The app opens it with
// ?token=, so it also sends no Referer (next.config.ts headers).
export const metadata: Metadata = {
  title: "Confirm your plan",
  robots: { index: false, follow: false },
};

export default function PlanOfferLayout({ children }: { children: React.ReactNode }) {
  return children;
}
