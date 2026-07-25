"use client";

import { useState } from "react";

export default function DeleteAccountRequestPage() {
  const [form, setForm] = useState({ email: "", reason: "" });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) { setError("Email is required."); return; }

    setBusy(true);
    setError("");
    try {
      // Sends to the existing /api/contact endpoint (or falls back to mailto)
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Account Deletion Request",
          email: form.email.trim(),
          message: `ACCOUNT DELETION REQUEST\n\nEmail: ${form.email.trim()}\n\nReason: ${form.reason.trim() || "Not provided"}\n\nPlease process this deletion request and confirm via reply.`,
          subject: "Account Deletion Request",
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        setError("Could not send your request. Please email us directly at info@goutsyde.com.");
      }
    } catch {
      setError("Could not send your request. Please email us directly at info@goutsyde.com.");
    }
    setBusy(false);
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #000; color: #F5F0E6; font-family: 'Hanken Grotesk', 'Inter', sans-serif; }
    a { color: #E8B930; text-decoration: none; }
    a:hover { text-decoration: underline; }

    .nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 56px; height: 66px;
      border-bottom: 1px solid rgba(245,240,230,0.08);
      background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
    }
    .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.12em; color: #E8B930; }

    .wrap { max-width: 540px; margin: 60px auto; padding: 0 24px 80px; }

    .page-title { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.06em; margin-bottom: 12px; }
    .page-sub { font-size: 14px; color: rgba(245,240,230,0.55); line-height: 1.7; margin-bottom: 36px; }

    .card { background: #111; border: 1px solid rgba(245,240,230,0.08); border-radius: 12px; padding: 32px; }

    .field { margin-bottom: 20px; }
    .label { display: block; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(245,240,230,0.4); margin-bottom: 8px; }
    .input, .textarea {
      width: 100%; background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.1);
      border-radius: 6px; color: #F5F0E6; font-family: inherit; font-size: 14px;
      padding: 10px 14px; outline: none; transition: border .15s;
    }
    .input:focus, .textarea:focus { border-color: rgba(232,185,48,0.4); }
    .textarea { resize: vertical; min-height: 100px; }

    .btn {
      width: 100%; font-family: inherit; font-size: 14px; font-weight: 600; padding: 13px;
      border-radius: 7px; cursor: pointer; border: none; transition: all .15s;
      background: #E8B930; color: #000;
    }
    .btn:hover:not(:disabled) { background: #F5CC50; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .error { color: #fca5a5; font-size: 13px; margin-top: 14px; }

    .success-icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
    .success-title { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 0.06em; margin-bottom: 10px; }
    .success-body { font-size: 14px; color: rgba(245,240,230,0.6); line-height: 1.7; }

    .note { font-size: 12px; color: rgba(245,240,230,0.35); margin-top: 20px; line-height: 1.6; }

    @media(max-width:600px){ .nav{padding:0 20px;} .wrap{margin:32px auto;} }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <nav className="nav">
        <a href="/"><span className="nav-logo">OUTSYDE</span></a>
      </nav>

      <div className="wrap">
        {submitted ? (
          <div className="card">
            <div className="success-icon">✓</div>
            <div className="success-title">Request received</div>
            <div className="success-body">
              We'll process your account deletion request and send a confirmation to <strong>{form.email}</strong> within 5 business days.
              If you need to follow up, email us at <a href="mailto:info@goutsyde.com">info@goutsyde.com</a>.
            </div>
          </div>
        ) : (
          <>
            <div className="page-title">Request Account Deletion</div>
            <div className="page-sub">
              If you have an Outsyde account and cannot log in to delete it yourself, submit this form and our team will
              process your request manually. If you can log in, <a href="/login">sign in</a> and go to{" "}
              <a href="/account/settings">Account Settings</a> for instant self-service deletion.
            </div>

            <div className="card">
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label" htmlFor="email">Account email address *</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="reason">Reason for deletion (optional)</label>
                  <textarea
                    id="reason"
                    className="textarea"
                    placeholder="Let us know why you're leaving, if you'd like."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  />
                </div>

                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Sending…" : "Submit Deletion Request"}
                </button>

                {error && <div className="error">{error}</div>}
              </form>

              <div className="note">
                We will verify ownership of the account using the email address provided before processing any deletion.
                Per our <a href="/privacy">Privacy Policy</a>, certain financial records may be retained for legal compliance
                even after account deletion.
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
