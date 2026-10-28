import { NextRequest, NextResponse } from "next/server";
import { accessTokenCookie } from "@/lib/auth-cookie";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND}/api/auth/customer/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    const data = await backendRes.json();

    const res = NextResponse.json(data, { status: backendRes.status });

    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      res.headers.set("set-cookie", setCookie);
    }

    // Sign the new account in on goutsyde.com too (p4-quicksignup): same cookie as /api/login.
    if (backendRes.ok && typeof data?.accessToken === "string" && data.accessToken) {
      res.headers.append("set-cookie", accessTokenCookie(data.accessToken));
    }

    return res;
  } catch (err) {
    console.error("[consumer-signup] proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach server. Please try again." },
      { status: 500 }
    );
  }
}