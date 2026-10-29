import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import EventClient from "./EventClient";
import { SLUG_RE, fetchAnonymous } from "./eventFetch";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug.toLowerCase();
  if (!SLUG_RE.test(slug)) return { title: "Event not found", robots: { index: false, follow: false } };
  const { payload } = await fetchAnonymous(slug);
  if (!payload) return { title: "Event", robots: { index: false, follow: false } };
  const e = payload.event;
  // Never any address field here: title and description only. The share image comes from
  // opengraph-image.tsx / twitter-image.tsx next to this page (the whole flyer over a blur).
  const description = (e.description || "").replace(/\s+/g, " ").trim().slice(0, 160) || `${e.title} on Outsyde.`;
  return {
    title: e.title,
    description,
    alternates: { canonical: `/e/${e.slug}` },
    openGraph: { title: e.title, description, url: `/e/${e.slug}`, type: "website" },
    twitter: { card: "summary_large_image", title: e.title, description },
    robots: e.visibility === "unlisted" || e.status !== "published" ? { index: false, follow: false } : undefined,
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug.toLowerCase();
  if (!SLUG_RE.test(slug)) notFound();
  const { payload, notFound: missing } = await fetchAnonymous(slug);
  if (missing) {
    // A draft is a 404 for anonymous callers. If the visitor has a session cookie the client may still
    // load the host's draft preview, so only crawlers and signed-out visitors get the real 404 status.
    const jar = await cookies();
    if (!jar.get("outsyde_access_token")?.value) notFound();
  }
  return <EventClient slug={slug} initial={payload} />;
}
