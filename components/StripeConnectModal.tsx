"use client";

import { useState } from "react";

interface Props {
  /** Whether the authenticated user is a vendor (businessId present) */
  isVendor: boolean;
  /** Whether the authenticated user is a photographer (photographerId present) */
  isPhotographer: boolean;
  /** Called when the user dismisses the modal */
  onDismiss: () => void;
}

export default function StripeConnectModal({ isVendor, isPhotographer, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (isVendor) {
        res = await fetch("/api/vendor-dashboard/stripe/create-link", { method: "POST" });
      } else {
        res = await fetch("/api/photographer/me/stripe-onboarding", { method: "POST" });
      }

      if (!res.ok) {
        setError("Could not start Stripe setup. Please try again.");
        return;
      }
      const data = await res.json() as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No onboarding URL returned. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .scm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.65);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .scm-card {
          background: #111; border: 1px solid rgba(245,240,230,0.12);
          border-radius: 12px; width: 100%; max-width: 440px;
          padding: 32px 28px 28px; position: relative;
          font-family: 'Hanken Grotesk', system-ui, sans-serif;
          color: #F5F0E6;
        }
        .scm-close {
          position: absolute; top: 14px; left: 14px;
          background: transparent; border: none; cursor: pointer;
          color: rgba(245,240,230,0.5); font-size: 22px; line-height: 1;
          padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
        }
        .scm-close:hover { color: #F5F0E6; }
        .scm-icon {
          width: 52px; height: 52px; border-radius: 50%;
          background: rgba(232,185,48,0.12);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .scm-icon svg { width: 26px; height: 26px; color: #E8B930; }
        .scm-title {
          font-size: 20px; font-weight: 700; text-align: center;
          margin: 0 0 10px; color: #F5F0E6;
        }
        .scm-body {
          font-size: 14px; line-height: 1.6; text-align: center;
          color: rgba(245,240,230,0.65); margin: 0 0 24px;
        }
        .scm-btn {
          display: block; width: 100%;
          background: #E8B930; color: #000;
          border: none; border-radius: 6px; cursor: pointer;
          font-family: inherit; font-size: 14px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          padding: 13px 20px; transition: background 0.15s;
        }
        .scm-btn:hover:not(:disabled) { background: #f2c835; }
        .scm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .scm-error {
          margin-top: 12px; font-size: 13px; text-align: center;
          color: #ff6b6b;
        }
      `}} />
      <div className="scm-overlay" role="dialog" aria-modal="true" aria-label="Stripe Connect required">
        <div className="scm-card">
          <button className="scm-close" onClick={onDismiss} aria-label="Close">&#x2715;</button>

          <div className="scm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>

          <h2 className="scm-title">Finish Stripe Connect to Receive Payouts</h2>
          <p className="scm-body">
            To receive payments and payouts on Outsyde, you need to complete your
            Stripe Connect account setup. It only takes a few minutes.
          </p>

          <button className="scm-btn" onClick={handleFinish} disabled={loading}>
            {loading ? "Redirecting…" : "Finish Stripe Setup"}
          </button>

          {error && <p className="scm-error">{error}</p>}
        </div>
      </div>
    </>
  );
}
