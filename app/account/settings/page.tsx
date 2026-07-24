"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DeletionStatus = "active" | "pending_deletion" | "deleted";

interface AccountInfo {
  username: string;
  email?: string;
  deletionStatus?: DeletionStatus;
  scheduledDeletionAt?: string | null;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (!me.authenticated) { router.push("/login"); return; }

      const profileRes = await fetch("/api/account/profile");
      if (profileRes.ok) {
        const data = await profileRes.json();
        setAccount({
          username: data.username,
          email: me.email,
          deletionStatus: data.deletionStatus ?? "active",
          scheduledDeletionAt: data.scheduledDeletionAt ?? null,
        });
      }
      setLoading(false);
    })();
  }, [router]);

  async function handleDeleteRequest() {
    if (!confirm("This will schedule your account for permanent deletion after a 30-day grace period. Continue?")) return;
    if (!confirm("Are you sure? This cannot be undone after 30 days.")) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/delete-request", { method: "POST" });
      const data = await res.json();
      if (data.blocked) {
        setMessage({ text: data.reason, error: true });
      } else {
        const dateStr = data.scheduledDeletionAt
          ? new Date(data.scheduledDeletionAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : "30 days from now";
        setMessage({ text: `Account deletion scheduled for ${dateStr}. You have been logged out of all other sessions.`, error: false });
        setAccount(a => a ? { ...a, deletionStatus: "pending_deletion", scheduledDeletionAt: data.scheduledDeletionAt } : a);
      }
    } catch {
      setMessage({ text: "Something went wrong. Please try again.", error: true });
    }
    setBusy(false);
  }

  async function handleCancelDeletion() {
    if (!confirm("Cancel the scheduled deletion and keep your account active?")) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/cancel-deletion", { method: "POST" });
      if (res.ok) {
        setMessage({ text: "Deletion cancelled. Your account is active.", error: false });
        setAccount(a => a ? { ...a, deletionStatus: "active", scheduledDeletionAt: null } : a);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to cancel deletion.", error: true });
      }
    } catch {
      setMessage({ text: "Something went wrong. Please try again.", error: true });
    }
    setBusy(false);
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #000; color: #F5F0E6; font-family: 'Hanken Grotesk', 'Inter', sans-serif; }
    a { color: inherit; text-decoration: none; }

    .nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 56px; height: 66px;
      border-bottom: 1px solid rgba(245,240,230,0.08);
      position: sticky; top: 0; z-index: 50;
      background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
    }
    .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.12em; color: #E8B930; }
    .nav-links { display: flex; gap: 32px; }
    .nav-links a { font-size: 13px; letter-spacing: 0.04em; color: rgba(245,240,230,0.55); transition: color .15s; }
    .nav-links a:hover { color: #F5F0E6; }

    .wrap { max-width: 720px; margin: 60px auto; padding: 0 24px 80px; }

    .page-title { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.06em; margin-bottom: 8px; }
    .breadcrumb { font-size: 13px; color: rgba(245,240,230,0.4); margin-bottom: 40px; }
    .breadcrumb a { color: rgba(245,240,230,0.4); }
    .breadcrumb a:hover { color: #E8B930; }

    .card {
      background: #111; border: 1px solid rgba(245,240,230,0.08); border-radius: 12px; padding: 32px;
      margin-bottom: 20px;
    }
    .card-title { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.08em; margin-bottom: 8px; }
    .card-body { font-size: 14px; color: rgba(245,240,230,0.6); line-height: 1.7; margin-bottom: 20px; }
    .card-body li { margin-left: 18px; margin-bottom: 4px; }

    .deletion-banner {
      background: rgba(180,30,30,0.15); border: 1px solid rgba(220,60,60,0.4); border-radius: 10px;
      padding: 20px 24px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 14px;
    }
    .banner-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
    .banner-title { font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 4px; }
    .banner-body { font-size: 13px; color: rgba(252,165,165,0.7); }

    .msg { padding: 14px 18px; border-radius: 8px; font-size: 14px; margin-top: 18px; }
    .msg.ok { background: rgba(40,180,80,0.12); border: 1px solid rgba(40,180,80,0.3); color: #86efac; }
    .msg.err { background: rgba(200,40,40,0.12); border: 1px solid rgba(200,40,40,0.3); color: #fca5a5; }

    .btn {
      font-family: inherit; font-size: 14px; font-weight: 600; padding: 11px 22px;
      border-radius: 7px; cursor: pointer; border: 1px solid transparent; transition: all .15s; display: inline-flex; align-items: center; gap: 7px;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger { background: rgba(200,40,40,0.12); border-color: rgba(200,40,40,0.4); color: #fca5a5; }
    .btn-danger:hover:not(:disabled) { background: rgba(200,40,40,0.22); }
    .btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
    .btn-ghost:hover:not(:disabled) { border-color: rgba(245,240,230,0.3); }

    .skeleton { background: rgba(245,240,230,0.06); border-radius: 4px; animation: pulse 1.4s infinite; height: 20px; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    @media(max-width:600px){ .nav{padding:0 20px;} .nav-links{display:none;} .wrap{margin:32px auto;} }
  `;

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <nav className="nav"><a href="/"><span className="nav-logo">OUTSYDE</span></a></nav>
        <div className="wrap">
          <div className="skeleton" style={{ width: 200, marginBottom: 40 }} />
          <div className="card"><div className="skeleton" style={{ height: 80 }} /></div>
        </div>
      </>
    );
  }

  const isPending = account?.deletionStatus === "pending_deletion";
  const schedDate = account?.scheduledDeletionAt
    ? new Date(account.scheduledDeletionAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <nav className="nav">
        <a href="/"><span className="nav-logo">OUTSYDE</span></a>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/shop">Shop</a>
          <a href="/account">My Account</a>
        </div>
      </nav>

      <div className="wrap">
        <div className="breadcrumb">
          <a href="/account">Account</a> / Settings
        </div>
        <div className="page-title">Account Settings</div>

        {isPending && (
          <div className="deletion-banner">
            <div className="banner-icon">⚠️</div>
            <div>
              <div className="banner-title">Account deletion scheduled{schedDate ? ` — ${schedDate}` : ""}</div>
              <div className="banner-body">Your account will be permanently deleted on {schedDate ?? "the scheduled date"}. Cancel below to keep your account.</div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-title">Delete Account</div>
          <div className="card-body">
            <p style={{ marginBottom: 12 }}>Requesting deletion will:</p>
            <ul>
              <li>Schedule your account for permanent deletion after a <strong>30-day grace period</strong></li>
              <li>Log you out of all active sessions immediately</li>
              <li>Remove your personal data, posts, and social activity</li>
              <li>Retain anonymized records of financial transactions for legal compliance</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              Deletion is <strong>blocked</strong> if you have active orders, bookings, or a pending Stripe payout.
              You can cancel the request any time before the 30-day window closes.
            </p>
          </div>

          {isPending ? (
            <button className="btn btn-ghost" disabled={busy} onClick={handleCancelDeletion}>
              {busy ? "Cancelling…" : "Cancel Deletion"}
            </button>
          ) : (
            <button className="btn btn-danger" disabled={busy} onClick={handleDeleteRequest}>
              {busy ? "Processing…" : "Request Account Deletion"}
            </button>
          )}

          {message && (
            <div className={`msg ${message.error ? "err" : "ok"}`}>{message.text}</div>
          )}
        </div>
      </div>
    </>
  );
}
