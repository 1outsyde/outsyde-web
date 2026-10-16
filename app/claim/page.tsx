// app/claim/page.tsx
// Finish an account that exists but can't sign in yet (no password) — /claim
//
// Entry points:
//   /claim?token=…&email=…   "Claim my account" button in a reminder email → straight to password
//   /claim?email=…&sent=1    login hand-off: the backend already emailed a code → code step
//   /claim?email=…           signup "already registered" link → we send a code → code step
//   /claim?sent=1            login by username: ask which email the code went to → code step
//
// Steps: email → code → password → username (only if the account has none) → done.
// The claim call is tried without a username first; the backend answers USERNAME_REQUIRED without
// using up the token when the account needs one, so accounts that already have a username skip it.
//
// BFFs: /api/account-setup/{send-code,verify-code,claim}; username check reuses
// /api/accept-invite/check-username. Same visual system as /login (.bs-* classes).

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { safeReturn } from "@/lib/safe-return";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-stores";

const RESEND_SECONDS = 60;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type Step = "email" | "code" | "password" | "username" | "done" | "expired" | "already";
type UsernameCheck = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

type ApiResult = { ok: boolean; status: number; data: Record<string, unknown> };

async function post(url: string, body: unknown): Promise<ApiResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

function errorText(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" && data.error ? data.error : fallback;
}

function ClaimFlow() {
  const searchParams = useSearchParams();
  const linkToken = searchParams.get("token") ?? "";
  const initialEmail = (searchParams.get("email") ?? "").trim().toLowerCase();
  const codeAlreadySent = searchParams.get("sent") === "1";
  const returnTo = searchParams.get("return");

  const [step, setStep] = useState<Step>(() => {
    if (linkToken && initialEmail) return "password";
    if (initialEmail) return "code";
    return "email";
  });
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState(linkToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  // Result of the last availability lookup; "idle"/"invalid"/"checking" are derived below.
  const [remoteCheck, setRemoteCheck] = useState<{ name: string; state: "available" | "taken" | "error" } | null>(null);
  const [finalUsername, setFinalUsername] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendIn, setResendIn] = useState(codeAlreadySent ? RESEND_SECONDS : 0);
  const autoSent = useRef(false);

  // Countdown for "Send a new code".
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Arriving from the signup "already registered" link (email, no code yet): send one once.
  useEffect(() => {
    if (autoSent.current) return;
    if (step === "code" && initialEmail && !codeAlreadySent && !linkToken) {
      autoSent.current = true;
      void sendCode(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live username availability (debounced), via the existing check-username BFF.
  const trimmedUsername = username.trim();
  const usernameValid = USERNAME_RE.test(trimmedUsername);
  const usernameCheck: UsernameCheck = !trimmedUsername
    ? "idle"
    : !usernameValid
      ? "invalid"
      : remoteCheck?.name === trimmedUsername
        ? remoteCheck.state
        : "checking";

  useEffect(() => {
    if (step !== "username" || !usernameValid) return;
    const name = trimmedUsername;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/accept-invite/check-username?username=${encodeURIComponent(name)}`);
        const data = (await res.json().catch(() => ({}))) as { available?: boolean };
        if (cancelled) return;
        setRemoteCheck({ name, state: !res.ok ? "error" : data.available ? "available" : "taken" });
      } catch {
        if (!cancelled) setRemoteCheck({ name, state: "error" });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmedUsername, usernameValid, step]);

  async function sendCode(target: string): Promise<boolean> {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const r = await post("/api/account-setup/send-code", { email: target });
      if (!r.ok) {
        setError(errorText(r.data, "Couldn’t send a code. Please try again."));
        return false;
      }
      setNotice(`If ${target} needs setting up, a 6-digit code is on its way. Check your inbox and spam.`);
      setResendIn(RESEND_SECONDS);
      return true;
    } catch {
      setError("Couldn’t reach the server. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target.includes("@")) {
      setError("Enter the email on your account.");
      return;
    }
    setEmail(target);
    if (await sendCode(target)) {
      setCode("");
      setStep("code");
    }
  }

  async function handleCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      const r = await post("/api/account-setup/verify-code", { email, code: digits });
      if (r.ok && typeof r.data.resetToken === "string") {
        setResetToken(r.data.resetToken);
        setNotice("");
        setStep("password");
        return;
      }
      setError(errorText(r.data, "That code didn’t work. Request a new one."));
    } catch {
      setError("Couldn’t reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Shared by the password and username steps. Returns nothing; moves the flow on.
  async function submitClaim(withUsername?: string) {
    setError("");
    setBusy(true);
    try {
      const r = await post("/api/account-setup/claim", {
        email,
        resetToken,
        newPassword: password,
        ...(withUsername ? { username: withUsername } : {}),
      });
      if (r.ok) {
        setFinalUsername(typeof r.data.username === "string" ? r.data.username : withUsername ?? null);
        setStep("done");
        return;
      }
      const code = typeof r.data.code === "string" ? r.data.code : "";
      if (code === "USERNAME_REQUIRED") {
        setStep("username");
        return;
      }
      if (code === "INVALID_TOKEN") {
        setStep("expired");
        return;
      }
      if (code === "ALREADY_CLAIMED") {
        setStep("already");
        return;
      }
      if (code === "USERNAME_TAKEN" && withUsername) {
        setRemoteCheck({ name: withUsername, state: "taken" });
      }
      setError(errorText(r.data, "Couldn’t finish your account. Please try again."));
    } catch {
      setError("Couldn’t reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }
    void submitClaim();
  }

  function handleUsername(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    if (!USERNAME_RE.test(u)) {
      setError("Use 3–20 lowercase letters, numbers or underscores.");
      return;
    }
    if (usernameCheck === "taken") {
      setError("That username is taken. Try another.");
      return;
    }
    void submitClaim(u);
  }

  async function handleExpiredSendCode() {
    if (!email) {
      setStep("email");
      return;
    }
    if (await sendCode(email)) {
      setCode("");
      setResetToken("");
      setStep("code");
    }
  }

  const continueHref = safeReturn(returnTo, typeof window !== "undefined" ? window.location.origin : "https://www.goutsyde.com");
  const stepNumber = step === "password" ? 1 : step === "username" ? 2 : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <main className="bs-wrap">
        <div className="bs-bg" aria-hidden="true" />
        <div className="bs-veil" aria-hidden="true" />

        <div className="bs-inner">
          <Link href="/" className="bs-logo" aria-label="Go OutsYde home">
            <span className="bs-y" aria-hidden="true">Y</span>
            <span className="bs-word">Go OutsYde</span>
          </Link>

          {stepNumber > 0 && (
            <div className="cl-progress" aria-label={`Step ${stepNumber} of 2`}>
              <span className="cl-progress-label">Step {stepNumber} of 2</span>
              <div className="cl-bars">
                <span className="cl-bar on" />
                <span className={`cl-bar${stepNumber === 2 ? " on" : ""}`} />
              </div>
            </div>
          )}

          {step === "email" && (
            <>
              <p className="bs-eyebrow">Finish your account</p>
              <h1 className="bs-h1">Let&rsquo;s <span>lock in</span> your account</h1>
              <p className="bs-sub">
                {codeAlreadySent
                  ? "We emailed a 6-digit code to the address on your account. Enter that email to continue."
                  : "Enter the email you signed up with. We’ll send you a 6-digit code."}
              </p>
              <div className="bs-card">
                <form onSubmit={handleEmail} noValidate>
                  <div className="bs-field">
                    <label htmlFor="cl-email">Email</label>
                    <input id="cl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" autoComplete="email" required />
                  </div>
                  {error && <p className="bs-err" role="alert">{error}</p>}
                  <button type="submit" className="bs-submit" disabled={busy}>
                    {busy ? "Sending…" : "Continue"}
                  </button>
                </form>
              </div>
            </>
          )}

          {step === "code" && (
            <>
              <p className="bs-eyebrow">Check your email</p>
              <h1 className="bs-h1">Enter your <span>code</span></h1>
              <p className="bs-sub">
                Your account is saved — it just needs a password. We sent a 6-digit code to <b className="cl-em">{email}</b>.
              </p>
              <div className="bs-card">
                <form onSubmit={handleCode} noValidate>
                  <div className="bs-field">
                    <label htmlFor="cl-code">6-digit code</label>
                    <input id="cl-code" className="cl-code" type="text" inputMode="numeric" autoComplete="one-time-code"
                      maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000" required />
                  </div>
                  {notice && !error && <p className="cl-note" role="status">{notice}</p>}
                  {error && <p className="bs-err" role="alert">{error}</p>}
                  <button type="submit" className="bs-submit" disabled={busy}>
                    {busy ? "Checking…" : "Continue"}
                  </button>
                </form>
                <div className="cl-row">
                  <button type="button" className="cl-link" disabled={busy || resendIn > 0} onClick={() => void sendCode(email)}>
                    {resendIn > 0 ? `Send a new code in ${resendIn}s` : "Send a new code"}
                  </button>
                  <button type="button" className="cl-link" onClick={() => { setError(""); setNotice(""); setStep("email"); }}>
                    Use a different email
                  </button>
                </div>
              </div>
            </>
          )}

          {step === "password" && (
            <>
              <p className="bs-eyebrow">Welcome back</p>
              <h1 className="bs-h1">Create your <span>password</span></h1>
              <p className="bs-sub">This is the account you made with Outsyde. Set a password so you can sign in here and on the app.</p>
              <div className="bs-card">
                <form onSubmit={handlePassword} noValidate>
                  <div className="bs-field">
                    <label htmlFor="cl-email-ro">Email</label>
                    <input id="cl-email-ro" type="email" value={email} readOnly className="cl-readonly" autoComplete="username" />
                  </div>
                  <div className="bs-field">
                    <label htmlFor="cl-pw">New password</label>
                    <div className="pw-wrap">
                      <input id="cl-pw" type={showPassword ? "text" : "password"} value={password}
                        onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
                        autoComplete="new-password" required />
                      <button type="button" className="pw-toggle" onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="bs-field">
                    <label htmlFor="cl-pw2">Confirm password</label>
                    <input id="cl-pw2" type={showPassword ? "text" : "password"} value={confirm}
                      onChange={(e) => setConfirm(e.target.value)} placeholder="Type it again"
                      autoComplete="new-password" required />
                  </div>
                  {error && <p className="bs-err" role="alert">{error}</p>}
                  <button type="submit" className="bs-submit" disabled={busy}>
                    {busy ? "Saving…" : "Continue"}
                  </button>
                </form>
              </div>
              <p className="cl-foot">Not you? <a href="mailto:info@goutsyde.com?subject=This%20account%20isn%27t%20mine">Let us know</a> and we&rsquo;ll remove this account.</p>
            </>
          )}

          {step === "username" && (
            <>
              <p className="bs-eyebrow">Last step</p>
              <h1 className="bs-h1">Pick your <span>@username</span></h1>
              <p className="bs-sub">It&rsquo;s how people find you in search, and you can sign in with it too.</p>
              <div className="bs-card">
                <form onSubmit={handleUsername} noValidate>
                  <div className="bs-field">
                    <label htmlFor="cl-un">Username</label>
                    <div className={`cl-un ${usernameCheck}`}>
                      <span aria-hidden="true">@</span>
                      <input id="cl-un" type="text" value={username} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/^@/, "").replace(/\s/g, ""))}
                        placeholder="yourname" maxLength={20} aria-describedby="cl-un-state" required />
                    </div>
                    <span id="cl-un-state" className={`cl-un-state ${usernameCheck}`} aria-live="polite">
                      {usernameCheck === "checking" && "Checking…"}
                      {usernameCheck === "available" && "✓ Available"}
                      {usernameCheck === "taken" && "Taken — try another"}
                      {usernameCheck === "invalid" && "3–20 lowercase letters, numbers or _"}
                      {usernameCheck === "error" && "Couldn’t check right now — you can still continue"}
                    </span>
                  </div>
                  {error && <p className="bs-err" role="alert">{error}</p>}
                  <button type="submit" className="bs-submit" disabled={busy || usernameCheck === "taken" || usernameCheck === "invalid"}>
                    {busy ? "Finishing…" : "Finish my account"}
                  </button>
                </form>
              </div>
              <p className="cl-foot">You can change your username later in Settings.</p>
            </>
          )}

          {step === "done" && (
            <>
              <div className="cl-check" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#E8B930" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </div>
              <h1 className="bs-h1">You&rsquo;re in{finalUsername ? <>, <span>@{finalUsername}</span></> : null}</h1>
              <p className="bs-sub">Your account is complete. You&rsquo;re signed in here, and you can sign in on the app with your email or username.</p>
              <div className="bs-card">
                <p className="cl-kicker">Best on the app</p>
                <div className="cl-stores">
                  <a className="cl-store" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Download on the App Store</a>
                  <a className="cl-store" href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Get it on Google Play</a>
                </div>
                <p className="cl-small">Already have the app? Open it and sign in with {email}.</p>
              </div>
              <a className="cl-ghost" href={continueHref}>Keep exploring on the web</a>
            </>
          )}

          {step === "expired" && (
            <>
              <p className="bs-eyebrow">Link expired</p>
              <h1 className="bs-h1">Let&rsquo;s get you a <span>new code</span></h1>
              <p className="bs-sub">That link has expired or was replaced by a newer one. We&rsquo;ll email a 6-digit code instead.</p>
              <div className="bs-card">
                {error && <p className="bs-err" role="alert">{error}</p>}
                <button type="button" className="bs-submit" disabled={busy} onClick={() => void handleExpiredSendCode()}>
                  {busy ? "Sending…" : "Send me a code"}
                </button>
              </div>
            </>
          )}

          {step === "already" && (
            <>
              <p className="bs-eyebrow">All set</p>
              <h1 className="bs-h1">This account already has a <span>password</span></h1>
              <p className="bs-sub">Sign in with your email or username. Forgot it? Reset it in a minute.</p>
              <div className="bs-card">
                <Link className="bs-submit cl-btn-link" href="/login">Sign in</Link>
                <Link className="cl-ghost cl-ghost-tight" href="/forgot-password">Forgot password</Link>
              </div>
            </>
          )}

          <Link href="/" className="bs-back">&larr; Back to Home</Link>
        </div>
      </main>
    </>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={null}>
      <ClaimFlow />
    </Suspense>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{
  --black:#000000; --gold:#E8B930; --cream:#F5F0E6;
  --emerald:#1A3C34; --emerald-light:#244e44; --off-black:#04100d;
  --serif:'Bebas Neue',Impact,sans-serif; --sans:'Hanken Grotesk',system-ui,sans-serif;
}
body{font-family:var(--sans);background:var(--black);color:var(--cream);overflow-x:hidden;}

.bs-wrap{position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:56px 16px;overflow:hidden;}
.bs-bg{position:absolute;inset:0;background:var(--off-black);overflow:hidden;z-index:0;}
.bs-bg::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 70% 65% at 22% 58%,rgba(26,60,52,.9) 0%,transparent 52%),radial-gradient(ellipse 55% 45% at 78% 22%,rgba(232,185,48,.1) 0%,transparent 48%),radial-gradient(ellipse 60% 70% at 62% 85%,rgba(26,60,52,.55) 0%,transparent 52%),#04100d;}
.bs-veil{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3),rgba(0,0,0,.72));z-index:1;}
.bs-inner{position:relative;z-index:2;max-width:420px;width:100%;}

.bs-logo{display:inline-flex;align-items:center;gap:12px;margin-bottom:28px;text-decoration:none;}
.bs-y{width:42px;height:42px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:24px;color:var(--black);}
.bs-word{font-family:var(--serif);font-size:22px;letter-spacing:.16em;color:var(--cream);text-transform:uppercase;}

.bs-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;}
.bs-h1{font-family:var(--serif);font-weight:400;font-size:clamp(34px,6vw,44px);line-height:1.02;letter-spacing:.03em;color:var(--cream);margin-bottom:14px;text-transform:uppercase;}
.bs-h1 span{color:var(--gold);}
.bs-sub{font-size:14px;line-height:1.65;color:rgba(245,240,230,.7);max-width:380px;margin:0 auto 28px;text-align:center;}
.cl-em{color:var(--cream);font-weight:600;overflow-wrap:anywhere;}

.bs-card{background:rgba(255,255,255,.05);border:1px solid rgba(245,240,230,.12);border-radius:8px;padding:28px 24px;text-align:left;}

.bs-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.bs-field label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.6);}
.bs-field input{background:rgba(0,0,0,.35);color:var(--cream);border:1px solid rgba(245,240,230,.16);border-radius:4px;padding:12px 13px;font-family:var(--sans);font-size:16px;width:100%;outline:none;transition:border-color .18s;}
.bs-field input:focus{border-color:var(--gold);}
.bs-field input::placeholder{color:rgba(245,240,230,.35);}
.bs-field input.cl-readonly{color:rgba(245,240,230,.75);background:rgba(0,0,0,.2);border-color:rgba(245,240,230,.1);}
.bs-field input.cl-code{font-size:26px;letter-spacing:.5em;text-align:center;font-variant-numeric:tabular-nums;padding:12px 0 12px .5em;}

.bs-submit{display:block;width:100%;margin-top:6px;padding:14px;min-height:48px;background:var(--gold);color:var(--black);border:none;border-radius:4px;font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .15s,opacity .2s;text-align:center;}
.bs-submit:hover:not(:disabled){background:#f2c835;transform:translateY(-1px);}
.bs-submit:disabled{opacity:.55;cursor:not-allowed;}
.cl-btn-link{text-decoration:none;}

.bs-err{margin:4px 0 10px;font-size:13px;color:#ff8f8f;line-height:1.5;}
.cl-note{margin:4px 0 10px;font-size:13px;color:rgba(245,240,230,.75);line-height:1.5;}

.cl-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-top:14px;}
.cl-link{background:none;border:none;color:var(--gold);font-family:var(--sans);font-size:13px;cursor:pointer;padding:10px 0;min-height:44px;text-decoration:underline;text-underline-offset:3px;}
.cl-link:disabled{color:rgba(245,240,230,.5);cursor:default;text-decoration:none;}

.pw-wrap{position:relative;}
.pw-wrap input{padding-right:44px;}
.pw-toggle{position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(245,240,230,.6);width:40px;height:40px;display:flex;align-items:center;justify-content:center;}
.pw-toggle:hover{color:var(--cream);}

.cl-un{display:flex;align-items:center;background:rgba(0,0,0,.35);border:1px solid rgba(245,240,230,.16);border-radius:4px;padding:0 12px;transition:border-color .18s;}
.cl-un:focus-within{border-color:var(--gold);}
.cl-un.available{border-color:#5fbf8f;}
.cl-un.taken,.cl-un.invalid{border-color:#ff8f8f;}
.cl-un span{color:rgba(245,240,230,.55);font-size:16px;}
.bs-field .cl-un input{border:none;background:transparent;padding:12px 4px;}
.cl-un-state{font-size:12px;min-height:18px;color:rgba(245,240,230,.6);}
.cl-un-state.available{color:#7fd8a8;}
.cl-un-state.taken,.cl-un-state.invalid{color:#ff8f8f;}

.cl-progress{display:flex;flex-direction:column;gap:8px;margin:0 auto 24px;max-width:420px;text-align:right;}
.cl-progress-label{font-size:12px;color:rgba(245,240,230,.65);}
.cl-bars{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.cl-bar{height:4px;border-radius:2px;background:rgba(245,240,230,.18);}
.cl-bar.on{background:var(--gold);}

.cl-check{width:72px;height:72px;border-radius:50%;background:var(--emerald);border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;}
.cl-kicker{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(245,240,230,.6);margin-bottom:12px;}
.cl-stores{display:flex;flex-direction:column;gap:10px;}
.cl-store{display:block;text-align:center;background:var(--cream);color:#000;text-decoration:none;padding:14px;border-radius:6px;font-size:14px;font-weight:700;min-height:48px;}
.cl-small{font-size:12px;line-height:1.5;color:rgba(245,240,230,.6);margin-top:12px;overflow-wrap:anywhere;}
.cl-ghost{display:block;margin-top:16px;text-align:center;border:1px solid rgba(245,240,230,.3);color:var(--cream);text-decoration:none;padding:14px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;min-height:48px;}
.cl-ghost:hover{border-color:var(--gold);color:var(--gold);}
.cl-ghost-tight{margin-top:12px;}
.cl-foot{margin-top:18px;font-size:12px;line-height:1.6;color:rgba(245,240,230,.6);}
.cl-foot a{color:var(--gold);}

.bs-back{display:inline-block;margin-top:32px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.55);text-decoration:none;padding:10px 0;}
.bs-back:hover{color:var(--gold);}
`;
