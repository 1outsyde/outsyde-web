"use client";

// Change email card on /account/settings (backend #426 + #428, same flow as the app's ChangeEmail screen).
// Step 1: new email (+ password only when the account has one). Step 2: the 6 digit code sent to the NEW
// address. A code still waiting when the page opens goes straight to step 2. Uses the page's .card, .btn and
// .msg styles; its own classes start with "ce-".

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  CODE_LENGTH,
  checkEmailForm,
  cleanCode,
  endsCodeStep,
  expiryLine,
  normalizeEmail,
  readEmailChangeError,
} from "@/lib/change-email";

type Step = "view" | "email" | "code";

interface Props {
  currentEmail: string | null;
  onChanged: (email: string) => void;
}

/** fetch + JSON; non 2xx throws { status, body } like the app's ApiError, so readEmailChangeError works for both. */
async function call(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // keep null
  }
  if (!res.ok) throw { status: res.status, body };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return body as any;
}

export default function ChangeEmailCard({ currentEmail, onChanged }: Props) {
  const [step, setStep] = useState<Step>("view");
  const [loaded, setLoaded] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const status = await call("/api/account/email-change");
      setPasswordRequired(status?.passwordRequired !== false);
      if (status?.pending) {
        setPendingEmail(status.pending.newEmail);
        setExpiresAt(status.pending.expiresAt);
        setStep("code");
      }
    } catch {
      // Ask for the password when unsure; the backend refuses a missing one with a clear message anyway.
      setPasswordRequired(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const sendCode = async (email: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await call("/api/account/email-change/request", {
        method: "POST",
        body: JSON.stringify(passwordRequired ? { newEmail: normalizeEmail(email), password } : { newEmail: normalizeEmail(email) }),
      });
      setPendingEmail(res.pending.newEmail);
      setExpiresAt(res.pending.expiresAt);
      setCode("");
      setPassword("");
      setStep("code");
      return true;
    } catch (e) {
      setMessage({ text: readEmailChangeError(e).message, error: true });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    const check = checkEmailForm({ newEmail, currentEmail, password, passwordRequired });
    if (!check.ok) {
      setMessage({ text: check.message, error: true });
      return;
    }
    void sendCode(newEmail);
  };

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setMessage({ text: "Enter the 6 digit code.", error: true });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await call("/api/account/email-change/confirm", { method: "POST", body: JSON.stringify({ code }) });
      onChanged(res.email);
      setPendingEmail(null);
      setExpiresAt(null);
      setCode("");
      setNewEmail("");
      setStep("view");
      setMessage({ text: `Your email is now ${res.email}. Use it the next time you sign in.`, error: false });
    } catch (err) {
      const r = readEmailChangeError(err);
      setCode("");
      if (endsCodeStep(r.code)) {
        setPendingEmail(null);
        setExpiresAt(null);
        setStep("email");
      }
      setMessage({ text: r.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const onUseDifferentEmail = async () => {
    setBusy(true);
    try {
      await call("/api/account/email-change", { method: "DELETE" });
    } catch {
      // Nothing to undo: a new request replaces the open one anyway.
    } finally {
      setBusy(false);
      setPendingEmail(null);
      setExpiresAt(null);
      setCode("");
      setMessage(null);
      setStep("email");
    }
  };

  const onResend = async () => {
    if (!pendingEmail) return;
    if (passwordRequired) {
      setNewEmail(pendingEmail);
      setStep("email");
      setMessage({ text: "Enter your password to get a new code.", error: false });
      return;
    }
    if (await sendCode(pendingEmail)) setMessage({ text: "We sent a new code.", error: false });
  };

  const onCancel = () => {
    setStep("view");
    setNewEmail("");
    setPassword("");
    setMessage(null);
  };

  const expiry = expiryLine(expiresAt);

  return (
    <div className="card" id="email">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="card-title">Email</div>

      {step === "view" && (
        <>
          <div className="card-body ce-body">
            <div className="ce-current" data-testid="current-email">{currentEmail || "No email on this account"}</div>
            <div>This is where your receipts and Outsyde emails go, and what you sign in with.</div>
          </div>
          <button className="btn btn-ghost" disabled={!loaded} onClick={() => { setMessage(null); setStep("email"); }}>
            Change email
          </button>
        </>
      )}

      {step === "email" && (
        <form onSubmit={onSend} noValidate>
          <div className="card-body ce-body">
            <div className="ce-label">Current email</div>
            <div className="ce-current">{currentEmail || "No email on this account"}</div>
          </div>
          <label className="ce-label" htmlFor="ce-new">New email</label>
          <input
            id="ce-new"
            className="ce-input"
            type="email"
            value={newEmail}
            onChange={(e) => { setNewEmail(e.target.value); setMessage(null); }}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={busy}
          />
          {passwordRequired && (
            <>
              <label className="ce-label" htmlFor="ce-pw">Password</label>
              <div className="ce-pw-wrap">
                <input
                  id="ce-pw"
                  className="ce-input ce-pw"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setMessage(null); }}
                  placeholder="Your Outsyde password"
                  autoComplete="current-password"
                  disabled={busy}
                />
                <button type="button" className="ce-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </>
          )}
          <p className="ce-hint">{"We'll send a 6 digit code to your new email. Your email changes once you enter it."}</p>
          <div className="ce-actions">
            <button className="btn ce-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send code"}</button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
          </div>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onConfirm} noValidate>
          <div className="card-body ce-body">
            Enter the 6 digit code we sent to <strong className="ce-strong">{pendingEmail}</strong>.
            {expiry && <div className="ce-hint">{expiry}</div>}
          </div>
          <input
            className="ce-input ce-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="6 digit code"
            placeholder="000000"
            value={code}
            onChange={(e) => { setCode(cleanCode(e.target.value)); setMessage(null); }}
            disabled={busy}
          />
          <div className="ce-actions">
            <button className="btn ce-primary" type="submit" disabled={busy}>{busy ? "Confirming…" : "Confirm"}</button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={onResend}>Resend code</button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={onUseDifferentEmail}>Use a different email</button>
          </div>
        </form>
      )}

      {message && (
        <div className={`msg ${message.error ? "err" : "ok"}`} role={message.error ? "alert" : "status"}>{message.text}</div>
      )}
    </div>
  );
}

const css = `
  .ce-body { margin-bottom: 16px; }
  .ce-current { font-size: 15px; color: #F5F0E6; margin-bottom: 6px; word-break: break-all; }
  .ce-strong { color: #F5F0E6; word-break: break-all; }
  .ce-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(245,240,230,0.45); margin: 14px 0 8px; }
  .ce-input {
    width: 100%; box-sizing: border-box; background: #0a0a0a; color: #F5F0E6; font-family: inherit; font-size: 15px;
    border: 1px solid rgba(245,240,230,0.15); border-radius: 8px; padding: 12px 14px; outline: none;
  }
  .ce-input:focus { border-color: #E8B930; }
  .ce-pw-wrap { position: relative; }
  .ce-pw { padding-right: 44px; }
  .ce-eye {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: 0; cursor: pointer;
    color: rgba(245,240,230,0.6); padding: 6px; display: flex;
  }
  .ce-eye:hover { color: #E8B930; }
  .ce-code { font-size: 24px; letter-spacing: 0.4em; text-align: center; font-weight: 700; max-width: 260px; }
  .ce-hint { font-size: 13px; color: rgba(245,240,230,0.45); margin-top: 12px; }
  .ce-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .ce-primary { background: #1A3C34; border-color: #1A3C34; color: #E8B930; }
  .ce-primary:hover:not(:disabled) { background: #22503f; }
`;
