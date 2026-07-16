// app/login/page.tsx
// Generic sign-in page for any account type — /login
//
// Posts to /api/login (BFF -> outsyde-backend's
// /api/auth/mobile/login), which forwards the session cookie the backend
// sets. Reuses the exact same visual system as /business-signup (.bs-*
// namespace, same --gold/--cream/--black tokens).

"use client";

import { useState } from "react";

type SubmitState = "idle" | "submitting" | "error";

export default function BusinessLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!identifier.trim()) {
      setSubmitError("Enter your email or username.");
      return;
    }
    if (!password) {
      setSubmitError("Enter your password.");
      return;
    }

    setSubmitState("submitting");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitState("error");
        setSubmitError(data.error || "Invalid email/username or password.");
        return;
      }

      // Logged in — session cookie is set. Dashboard page doesn't exist yet,
      // so send them home for now; update this once /business-dashboard ships.
      window.location.href = "/";
    } catch {
      setSubmitState("error");
      setSubmitError("Couldn\u2019t reach the server. Please try again.");
    }
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{
  --black:#000000; --gold:#E8B930; --cream:#F5F0E6;
  --emerald:#1A3C34; --emerald-light:#244e44; --off-black:#04100d;
  --serif:'Bebas Neue',Impact,sans-serif; --sans:'Hanken Grotesk',system-ui,sans-serif;
}
html{scroll-behavior:smooth;}
body{font-family:var(--sans);background:var(--black);color:var(--cream);overflow-x:hidden;}

.bs-wrap{position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:56px 24px;overflow:hidden;}
.bs-bg{position:absolute;inset:0;background:var(--off-black);overflow:hidden;z-index:0;}
.bs-bg::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 70% 65% at 22% 58%,rgba(26,60,52,.9) 0%,transparent 52%),radial-gradient(ellipse 55% 45% at 78% 22%,rgba(232,185,48,.1) 0%,transparent 48%),radial-gradient(ellipse 60% 70% at 62% 85%,rgba(26,60,52,.55) 0%,transparent 52%),#04100d;}
.bs-veil{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3),rgba(0,0,0,.72));z-index:1;}
.bs-inner{position:relative;z-index:2;max-width:420px;width:100%;}

.bs-logo{display:inline-flex;align-items:center;gap:12px;margin-bottom:28px;}
.bs-y{width:42px;height:42px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:24px;color:var(--black);}
.bs-word{font-family:var(--serif);font-size:22px;letter-spacing:.16em;color:var(--cream);text-transform:uppercase;}

.bs-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;}
.bs-h1{font-family:var(--serif);font-size:clamp(34px,6vw,44px);letter-spacing:.03em;color:var(--cream);margin-bottom:14px;text-transform:uppercase;}
.bs-h1 span{color:var(--gold);}
.bs-sub{font-size:14px;line-height:1.65;color:rgba(245,240,230,.65);max-width:380px;margin:0 auto 32px;text-align:center;}

.bs-card{background:rgba(255,255,255,.05);border:1px solid rgba(245,240,230,.12);border-radius:8px;padding:32px 28px;text-align:left;}

.bs-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.bs-field label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.5);}
.bs-field input{background:rgba(0,0,0,.35);color:var(--cream);border:1px solid rgba(245,240,230,.16);border-radius:4px;padding:12px 13px;font-family:var(--sans);font-size:14px;width:100%;outline:none;transition:border-color .18s;}
.bs-field input:focus{border-color:var(--gold);}
.bs-field input::placeholder{color:rgba(245,240,230,.3);}

.bs-submit{width:100%;margin-top:6px;padding:14px;background:var(--gold);color:var(--black);border:none;border-radius:4px;font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .15s,opacity .2s;}
.bs-submit:hover:not(:disabled){background:#f2c835;transform:translateY(-1px);}
.bs-submit:disabled{opacity:.55;cursor:not-allowed;}

.bs-err{margin-top:14px;font-size:13px;color:#ff8080;line-height:1.5;}

.bs-back{display:inline-block;margin-top:32px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.45);text-decoration:none;transition:color .2s;}
.bs-back:hover{color:var(--gold);}
.bs-signup-link{display:block;margin-top:18px;font-size:12px;color:rgba(245,240,230,.5);}
.bs-signup-link a{color:var(--gold);text-decoration:none;}
.bs-signup-link a:hover{text-decoration:underline;}
`,
        }}
      />

      <main className="bs-wrap">
        <div className="bs-bg" aria-hidden="true" />
        <div className="bs-veil" aria-hidden="true" />

        <div className="bs-inner">
          <a href="/" className="bs-logo" aria-label="Go OutsYde home">
            <span className="bs-y" aria-hidden="true">Y</span>
            <span className="bs-word">Go OutsYde</span>
          </a>

          <p className="bs-eyebrow">Sign in</p>
          <h1 className="bs-h1">
            Welcome <span>Back</span>
          </h1>
          <p className="bs-sub">Log in with the email or username and password from your account.</p>

          <div className="bs-card">
            <form onSubmit={handleSubmit} noValidate>
              <div className="bs-field">
                <label htmlFor="bl-identifier">Email or username</label>
                <input
                  id="bl-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@business.com"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="bs-field">
                <label htmlFor="bl-password">Password</label>
                <input
                  id="bl-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              {submitState === "error" && submitError && (
                <p className="bs-err" role="alert">{submitError}</p>
              )}

              <button type="submit" className="bs-submit" disabled={submitState === "submitting"}>
                {submitState === "submitting" ? "Logging in\u2026" : "Log In"}
              </button>
            </form>
            <p className="bs-signup-link">
              New here? <a href="/signup">Create an account</a>
            </p>
          </div>

          <a href="/" className="bs-back">← Back to Home</a>
        </div>
      </main>
    </>
  );
}