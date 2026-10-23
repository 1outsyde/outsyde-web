import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

// Public Stripe publishable key (backend /api/stripe/config, not under /api/events).
export async function GET(_req: NextRequest) {
  return proxyToBackend("/api/stripe/config", { method: "GET", headers: {} });
}
