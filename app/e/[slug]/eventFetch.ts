import type { EventPayload } from "./types";

export const SLUG_RE = /^[a-z0-9-]{1,80}$/;

export type Fetched = { payload: EventPayload | null; notFound: boolean };

/**
 * Anonymous, cacheable fetch straight from the backend (no cookie, no token). Used for the first paint,
 * the metadata and the link share image. The client part refetches through the BFF with the viewer's cookie.
 */
export async function fetchAnonymous(slug: string): Promise<Fetched> {
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
