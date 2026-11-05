import type { Metadata } from "next";
import QuoteClient from "./QuoteClient";

/**
 * goutsyde.com/q/<code> (Quotes step 5b): the quote page for customers without the app, in the business's look.
 * The link is private to the people it was sent to, so it is never indexed. The title names only the business.
 */
const CODE_RE = /^[A-Za-z0-9_-]{8,64}$/;

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const robots = { index: false, follow: false };
  if (!CODE_RE.test(code) || !process.env.OUTSYDE_BACKEND_URL) return { title: "Quote", robots };
  try {
    const r = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/quotes/link/${code}`, { cache: "no-store" });
    const body = (await r.json().catch(() => null)) as { preview?: { business?: { name?: string | null } } } | null;
    const name = body?.preview?.business?.name?.trim();
    return { title: name ? `Your quote from ${name}` : "Quote", robots };
  } catch {
    return { title: "Quote", robots };
  }
}

export default async function QuotePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <QuoteClient code={CODE_RE.test(code) ? code : ""} />;
}
