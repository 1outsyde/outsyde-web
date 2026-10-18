import { NextRequest, NextResponse } from "next/server";

const RETURN_TO_SELF = new Set(["/finish", "/influencer/apply"]);

export function middleware(request: NextRequest) {
  const token = request.cookies.get("outsyde_access_token")?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    // /finish and /influencer/apply come back to themselves after sign-in.
    if (RETURN_TO_SELF.has(request.nextUrl.pathname)) login.searchParams.set("return", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/photographer-dashboard", "/photographer-onboarding", "/finish", "/influencer/apply"],
};
