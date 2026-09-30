"use client";

// Free-plan claim page — /subscribe/free/<token>
//
// An admin hands a business owner this link. Signed out → /login (and back here). Signed in as the
// business owner → the plan is claimed once on load. The token only ever travels in the path and
// the POST body to /api/subscription/complimentary-redeem; it is never logged.

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { describeFreePlanEnd } from "@/lib/free-plan";

type ClaimState =
  | { status: "loading" }
  | { status: "success"; endLabel: string; connectReady: boolean | null }
  | { status: "error"; code: string; message: string };

interface RedeemBody {
  subscription?: { status?: string | null; currentPeriodEnd?: string | null };
  connectReady?: boolean | null;
  error?: string;
  code?: string;
}

const MESSAGES: Record<string, string> = {
  NOT_FOUND: "This link isn't valid.",
  LINK_UNAVAILABLE: "This link has expired, been used, or been revoked. Ask Outsyde for a new one.",
  WRONG_ACCOUNT: "This link is for another business. Sign in with the business owner's account.",
  NO_BUSINESS: "This account doesn't have a business yet.",
  RATE_LIMITED: "Too many attempts. Try again in a few minutes.",
};

const GENERIC_ERROR = "Something went wrong claiming this link. Please try again.";

function errorMessage(status: number, body: RedeemBody): { code: string; message: string } {
  const code = typeof body.code === "string" ? body.code : "";
  if (code && MESSAGES[code]) return { code, message: MESSAGES[code] };
  // 409: the backend says exactly why (a paid plan is still live, Stripe could not be checked, …).
  if (status === 409 && typeof body.error === "string" && body.error) return { code: "CONFLICT", message: body.error };
  if (status === 429) return { code: "RATE_LIMITED", message: MESSAGES.RATE_LIMITED };
  return { code: "GENERIC", message: GENERIC_ERROR };
}

const page: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "60vh",
  fontFamily: "'Hanken Grotesk', sans-serif",
  padding: "2rem",
  textAlign: "center",
};
const goldButton: React.CSSProperties = {
  display: "inline-block",
  background: "#E8B930",
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "12px 22px",
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

export default function FreePlanClaimPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [state, setState] = useState<ClaimState>({ status: "loading" });
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState("");
  // React StrictMode runs effects twice in dev; a claim must be attempted once per page load.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function claim() {
      if (!token) {
        setState({ status: "error", code: "NOT_FOUND", message: MESSAGES.NOT_FOUND });
        return;
      }
      try {
        const res = await fetch("/api/subscription/complimentary-redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.status === 401) {
          // Signed out (or the session expired): sign in, then come straight back here.
          router.replace(`/login?return=${encodeURIComponent(`/subscribe/free/${token}`)}`);
          return;
        }

        let body: RedeemBody = {};
        try {
          body = (await res.json()) as RedeemBody;
        } catch {
          body = {};
        }

        if (!res.ok) {
          setState({ status: "error", ...errorMessage(res.status, body) });
          return;
        }

        const end = describeFreePlanEnd({
          status: body.subscription?.status ?? "active",
          currentPeriodEnd: body.subscription?.currentPeriodEnd ?? null,
        });
        setState({
          status: "success",
          endLabel: end.kind === "ended" ? "" : end.label,
          connectReady: typeof body.connectReady === "boolean" ? body.connectReady : null,
        });
      } catch {
        setState({ status: "error", code: "GENERIC", message: GENERIC_ERROR });
      }
    }

    claim();
  }, [token, router]);

  async function startConnect() {
    setConnectBusy(true);
    setConnectError("");
    try {
      const res = await fetch("/api/vendor-dashboard/stripe/create-link", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setConnectError(data.error || "Could not start Stripe onboarding.");
    } catch {
      setConnectError("Could not start Stripe onboarding.");
    } finally {
      setConnectBusy(false);
    }
  }

  if (state.status === "loading") {
    return (
      <main style={page}>
        <p style={{ color: "#888" }}>Claiming your free plan…</p>
      </main>
    );
  }

  if (state.status === "success") {
    return (
      <main style={page}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>Your free plan is active</h1>
        {state.endLabel && (
          <p style={{ color: "#E8B930", fontSize: "1.05rem", fontWeight: 600, marginBottom: "1rem" }}>{state.endLabel}</p>
        )}
        <p style={{ color: "#888", maxWidth: 380, lineHeight: 1.6, marginBottom: "1.5rem" }}>
          There&apos;s no charge. Your storefront can go live now.
        </p>

        {state.connectReady === false && (
          <div style={{ maxWidth: 380, marginBottom: "1.5rem" }}>
            <p style={{ color: "#888", lineHeight: 1.6, marginBottom: "0.75rem" }}>
              One more step: connect Stripe so you can get paid for orders and bookings.
            </p>
            <button type="button" style={{ ...goldButton, opacity: connectBusy ? 0.6 : 1 }} onClick={startConnect} disabled={connectBusy}>
              {connectBusy ? "Opening Stripe…" : "Set up Stripe Connect so you get paid"}
            </button>
            {connectError && <p style={{ color: "#ff6b6b", fontSize: 13, marginTop: 8 }} role="alert">{connectError}</p>}
          </div>
        )}

        <a href="/subscription/manage" style={state.connectReady === false ? { color: "#E8B930", fontSize: 14 } : goldButton}>
          View your plan
        </a>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        {state.code === "NOT_FOUND" ? "This link isn’t valid" : "We couldn’t claim this link"}
      </h1>
      <p style={{ color: "#888", maxWidth: 380, lineHeight: 1.6 }} role="alert">{state.message}</p>
      {state.code === "WRONG_ACCOUNT" && (
        <p style={{ marginTop: "1rem" }}>
          <a href={`/login?return=${encodeURIComponent(`/subscribe/free/${token}`)}`} style={{ color: "#E8B930" }}>
            Sign in with a different account
          </a>
        </p>
      )}
      <p style={{ marginTop: "1.5rem", color: "#888", fontSize: "0.875rem" }}>
        Need help?{" "}
        <a href="mailto:info@goutsyde.com" style={{ color: "#E8B930" }}>
          info@goutsyde.com
        </a>
      </p>
    </main>
  );
}
