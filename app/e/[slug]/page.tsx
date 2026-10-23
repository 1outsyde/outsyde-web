import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import EventClient from "./EventClient";
import type { EventPayload } from "./types";

const SLUG_RE = /^[a-z0-9-]{1,80}$/;

type Fetched = { payload: EventPayload | null; notFound: boolean };

/**
 * Anonymous, cacheable fetch straight from the backend (no cookie, no token). Used for the first paint
 * and for metadata. The client part refetches through the BFF with the viewer's cookie.
 */
async function fetchAnonymous(slug: string): Promise<Fetched> {
  const base = process.env.OUTSYDE_BACKEND_URL;
  if (!base) return { payload: null, notFound: false };
  try {
    const res = await fetch(`${base}/api/events/slug/${slug}`, { next: { revalidate: 60 } });
    if (res.status === 404) return { payload: null, notFound: true };
    if (!res.ok) return { payload: null, notFound: false };
    const body = await res.json();
    if (!body?.event) return { payload: null, notFound: false };
    return { payload: { event: body.event, ticketTypes: body.ticketTypes ?? [] }, notFound: false };
  } catch {
    return { payload: null, notFound: false };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug.toLowerCase();
  if (!SLUG_RE.test(slug)) return { title: "Event not found", robots: { index: false, follow: false } };
  const { payload } = await fetchAnonymous(slug);
  if (!payload) return { title: "Event", robots: { index: false, follow: false } };
  const e = payload.event;
  // Never any address field here: title, description and cover image only.
  const description = (e.description || "").replace(/\s+/g, " ").trim().slice(0, 160) || `${e.title} on Outsyde.`;
  const images = e.coverImageUrl ? [{ url: e.coverImageUrl }] : undefined;
  return {
    title: e.title,
    description,
    alternates: { canonical: `/e/${e.slug}` },
    openGraph: { title: e.title, description, url: `/e/${e.slug}`, type: "website", ...(images ? { images } : {}) },
    twitter: { card: images ? "summary_large_image" : "summary", title: e.title, description, ...(images ? { images: [e.coverImageUrl as string] } : {}) },
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
