"use client";

import { useState } from "react";

export default function StripeRefreshPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGetNewLink() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/vendor-dashboard/stripe/create-link", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Could not create a new Stripe link.");
    } catch {
      setError("Could not create a new Stripe link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .page { min-height: 100vh; background: #0a0a0a; font-family: 'Hanken Grotesk', sans-serif; color: #f5f0e8; }
        .main { max-width: 560px; margin: 0 auto; padding: 64px 24px; }
        .stripe-cta { background: #1a1200; border: 1px solid #3a2800; border-radius: 10px; padding: 28px 26px; }
        .stripe-cta-title { font-size: 18px; font-weight: 600; color: #c9a84c; margin-bottom: 10px; }
        .stripe-cta-body { font-size: 14px; color: #888; line-height: 1.6; margin-bottom: 18px; }
        .stripe-cta-error { font-size: 13px; color: #c0392b; margin-bottom: 14px; }
        .btn-gold { font-size: 13px; font-weight: 600; font-family: inherit; letter-spacing: 0.05em; padding: 9px 20px; border-radius: 6px; border: none; background: #c9a84c; color: #000; cursor: pointer; }
        .btn-gold:hover { background: #d4b55e; }
        .btn-gold:disabled { opacity: 0.5; cursor: default; }
      `}</style>
      <div className="page">
        <div className="main">
          <div className="stripe-cta">
            <div className="stripe-cta-title">This onboarding link expired</div>
            <div className="stripe-cta-body">
              Stripe onboarding links expire after a short time. That is normal — request a new link to pick up where you left off.
            </div>
            {error && <div className="stripe-cta-error">{error}</div>}
            <button className="btn-gold" disabled={loading} onClick={handleGetNewLink}>
              {loading ? "Loading…" : "Get New Link"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
