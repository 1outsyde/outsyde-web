import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const TOKEN_COOKIE = "outsyde_access_token";

/**
 * Route Handler token extraction — matches the pattern already established in
 * app/api/account/profile/route.ts: regex over the raw Cookie header rather than
 * req.cookies.get(). Kept identical on purpose so this repo doesn't end up with
 * two different cookie-reading conventions.
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") || "";
  return cookie.match(new RegExp(`${TOKEN_COOKIE}=([^;]+)`))?.[1] ?? null;
}

/**
 * Standard headers to forward to outsyde-backend for an authenticated request.
 * Mirrors the dual Authorization + Cookie forward already used in the account
 * routes — the backend accepts either, and this repo's convention sends both.
 */
export function backendAuthHeaders(req: NextRequest): HeadersInit {
  const token = getTokenFromRequest(req);
  const cookie = req.headers.get("cookie") || "";
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Cookie: cookie,
  };
}

/**
 * Server Component (layout/page) check — Route Handlers get a NextRequest, but
 * Server Components must use next/headers' cookies() instead, so this is a
 * separate function rather than a NextRequest-based one.
 *
 * This ONLY checks whether a token cookie is present — it does not validate the
 * token or check admin status. That's intentional: real authorization happens
 * entirely backend-side via requireAdmin on /api/admin/*. A page that gets a
 * 401/403 from those endpoints must handle it as a real, expected UI state —
 * this helper just avoids rendering the admin shell for someone with no token
 * at all, so there's no flash of admin chrome before an inevitable redirect.
 */
export async function hasAdminTokenCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(TOKEN_COOKIE)?.value;
}