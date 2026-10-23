"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GENERIC_ERROR, errorCopy } from "../../e/_shared/format";

type View =
  | { step: "loading" }
  | { step: "error"; message: string }
  | { step: "ready" }
  | { step: "needs"; mode: "almost" | "setup" };

// Only a Stripe hosted page is a valid place to send someone for onboarding.
function stripeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:") return null;
    if (host !== "stripe.com" && !host.endsWith(".stripe.com")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default function EventPayoutsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>({ step: "loading" });
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setView({ step: "loading" });
    const search = typeof window !== "undefined" ? window.location.search : "";
    const flag = new URLSearchParams(search).get("stripe");
    try {
      const res = await fetch("/api/events/payouts/status?hostType=user", { cache: "no-store" });
      if (res.status === 401) {
        router.replace(`/login?return=${encodeURIComponent("/events/payouts" + search)}`);
        return;
      }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) { setView({ step: "error", message: errorCopy(res.status, body) }); return; }
      if (body.ready === true) { setView({ step: "ready" }); return; }
      const almost = flag === "done";
      setView({ step: "needs", mode: almost ? "almost" : "setup" });
    } catch {
      setView({ step: "error", message: GENERIC_ERROR });
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function startSetup() {
    if (sending) return;
    setSending(true);
    setActionError(null);
    try {
      const res = await fetch("/api/events/payouts/setup-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        router.replace(`/login?return=${encodeURIComponent("/events/payouts" + window.location.search)}`);
        return;
      }
      const body = await res.json().catch(() => null);
      const url = res.ok && body?.success ? stripeUrl(body.url) : null;
      if (!url) {
        setActionError(res.ok && body?.success ? GENERIC_ERROR : errorCopy(res.status, body));
        setSending(false);
        return;
      }
      window.location.assign(url);
    } catch {
      setActionError(GENERIC_ERROR);
      setSending(false);
    }
  }

  const needs = view.step === "needs" ? view : null;

  return (
    <main className="po-page">
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="po-wrap">
        {view.step === "loading" && <div className="po-muted" role="status">Checking your payout setup.</div>}

        {view.step === "error" && (
          <div className="po-card" role="alert">
            <h1 className="po-h1">PAYOUTS</h1>
            <p className="po-text">{view.message}</p>
            <button type="button" className="po-btn" onClick={load}>Try again</button>
          </div>
        )}

        {view.step === "ready" && (
          <div className="po-card">
            <h1 className="po-h1">Payouts are set up</h1>
            <p className="po-text">Ticket money is paid to your bank 3 days after your event ends.</p>
            <div className="po-row">
              <Link href="/tickets" className="po-btn">My tickets</Link>
              <Link href="/" className="po-link">Back to home</Link>
            </div>
          </div>
        )}

        {needs && (
          <div className="po-card">
            <h1 className="po-h1">{needs.mode === "almost" ? "Almost there" : "Set up payouts"}</h1>
            <p className="po-text">
              {needs.mode === "almost"
                ? "Stripe still needs a few details before you can get paid."
                : "Connect a bank account through Stripe to get paid for ticket sales."}
            </p>
            {actionError && <p className="po-err" role="alert">{actionError}</p>}
            <div className="po-row">
              <button type="button" className="po-btn" onClick={startSetup} disabled={sending}>
                {sending ? "Opening Stripe." : needs.mode === "almost" ? "Finish payout setup" : "Set up payouts"}
              </button>
              <Link href="/" className="po-link">Back to home</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const CSS = `
.po-page { min-height: 100vh; background: #0B0B0B; color: #F5F0E6; font-family: 'Hanken Grotesk', sans-serif; }
.po-wrap { max-width: 560px; margin: 0 auto; padding: 72px 16px 64px; }
.po-card { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 28px 22px; }
.po-h1 { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 36px; letter-spacing: 0.04em; margin: 0 0 10px; color: #F5F0E6; }
.po-text { font-size: 15px; line-height: 1.6; color: #B8B0A0; margin: 0 0 20px; }
.po-muted { font-size: 14px; color: #B8B0A0; padding: 24px 0; }
.po-err { font-size: 14px; color: #e57a6e; margin: 0 0 16px; }
.po-row { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
.po-btn { display: inline-block; font-family: inherit; font-size: 14px; font-weight: 600; letter-spacing: 0.04em; padding: 11px 22px; border-radius: 6px; border: none; background: #E8B930; color: #000; cursor: pointer; text-decoration: none; }
.po-btn:hover { background: #f0c64a; }
.po-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.po-link { font-size: 14px; color: #B8B0A0; text-decoration: underline; }
`;
