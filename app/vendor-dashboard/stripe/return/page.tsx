"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StripeStatus {
  hasStripeAccount?: boolean;
  onboardingComplete?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

export default function StripeReturnPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vendor-dashboard/stripe/status");
        if (res.status === 401) { router.push("/login"); return; }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || "Could not confirm Stripe status.");
          return;
        }
        setStatus(await res.json());
      } catch {
        setError("Could not confirm Stripe status.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <>
      <style>{`
        .page { min-height: 100vh; background: #0a0a0a; font-family: 'Hanken Grotesk', sans-serif; color: #f5f0e8; }
        .main { max-width: 560px; margin: 0 auto; padding: 64px 24px; }
        .stripe-cta { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 28px 26px; }
        .stripe-cta-title { font-size: 18px; font-weight: 600; color: #f5f0e8; margin-bottom: 10px; }
        .stripe-cta-body { font-size: 14px; color: #888; line-height: 1.6; margin-bottom: 18px; }
        .stripe-cta-error { font-size: 13px; color: #c0392b; margin-bottom: 14px; }
        .status-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1e1e1e; font-size: 13px; color: #aaa; }
        .status-row:last-of-type { border-bottom: none; margin-bottom: 20px; }
        .status-green { background: #0d2b0d; color: #27ae60; border: 1px solid #1a4a1a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; }
        .status-gray { background: #1a1a1a; color: #666; border: 1px solid #2a2a2a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; }
        .btn-gold { font-size: 13px; font-weight: 600; font-family: inherit; letter-spacing: 0.05em; padding: 9px 20px; border-radius: 6px; border: none; background: #c9a84c; color: #000; cursor: pointer; }
        .btn-gold:hover { background: #d4b55e; }
      `}</style>
      <div className="page">
        <div className="main">
          <div className="stripe-cta">
            <div className="stripe-cta-title">Your Stripe account is connected.</div>
            {loading && <div className="stripe-cta-body">Confirming connection…</div>}
            {error && <div className="stripe-cta-error">{error}</div>}
            {!loading && status && (
              <>
                <div className="status-row">
                  <span>Charges enabled</span>
                  <span className={status.chargesEnabled ? "status-green" : "status-gray"}>
                    {status.chargesEnabled ? "Yes" : "Pending"}
                  </span>
                </div>
                <div className="status-row">
                  <span>Payouts enabled</span>
                  <span className={status.payoutsEnabled ? "status-green" : "status-gray"}>
                    {status.payoutsEnabled ? "Yes" : "Pending"}
                  </span>
                </div>
              </>
            )}
            <button className="btn-gold" onClick={() => router.push("/vendor-dashboard")}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
