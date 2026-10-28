// Shared sign in cookie + visitor address helpers for the auth BFF routes.
import { isIP } from "net";

/**
 * The goutsyde.com sign in cookie. Max-Age matches the backend's ACCESS_TOKEN_EXPIRY_SECONDS
 * (7 days) so the cookie doesn't expire while the token it holds is still valid.
 * Byte for byte the string app/api/login/route.ts has always set.
 */
export function accessTokenCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `outsyde_access_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`;
}

/**
 * The visitor's address as Vercel reports it: the first x-forwarded-for entry, else x-real-ip.
 * Returns null unless the value is a plain IPv4 or IPv6 address.
 */
export function clientIpFrom(headers: Headers): string | null {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (first && isIP(first) !== 0) return first;
  const real = headers.get("x-real-ip")?.trim();
  if (real && isIP(real) !== 0) return real;
  return null;
}
