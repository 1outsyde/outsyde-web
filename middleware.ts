import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("outsyde_access_token")?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    // /finish comes back to itself after sign-in (reminder emails link straight to it).
    if (request.nextUrl.pathname === "/finish") login.searchParams.set("return", "/finish");
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/photographer-dashboard", "/photographer-onboarding", "/finish"],
};
