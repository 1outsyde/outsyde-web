"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type State = "idle" | "submitting" | "success" | "error" | "invalid-link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<State>(token && email ? "idle" : "invalid-link");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setState("submitting");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword }),
      });

      if (res.ok) {
        setState("success");
        return;
      }

      if (res.status === 400 || res.status === 401) {
        setState("error");
        setErrorMsg("This reset link is invalid or has expired.");
        return;
      }

      setState("error");
      setErrorMsg("Something went wrong. Please try again.");
    } catch {
      setState("error");
      setErrorMsg("Couldn’t reach the server. Please try again.");
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
.bs-success{margin-top:14px;font-size:13px;color:#7ecf7e;line-height:1.6;background:rgba(126,207,126,.08);border:1px solid rgba(126,207,126,.2);border-radius:4px;padding:12px 14px;}
.bs-success a{color:var(--gold);text-decoration:none;}
.bs-success a:hover{text-decoration:underline;}

.bs-invalid{font-size:14px;color:rgba(245,240,230,.65);line-height:1.65;}
.bs-invalid a{color:var(--gold);text-decoration:none;}
.bs-invalid a:hover{text-decoration:underline;}

.bs-back{display:inline-block;margin-top:32px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.45);text-decoration:none;transition:color .2s;}
.bs-back:hover{color:var(--gold);}
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

          {state === "invalid-link" ? (
            <>
              <p className="bs-eyebrow">Invalid Link</p>
              <h1 className="bs-h1">Reset <span>Password</span></h1>
              <div className="bs-card">
                <p className="bs-invalid">
                  Invalid or expired reset link.{" "}
                  <a href="/forgot-password">Request a new one.</a>
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="bs-eyebrow">Account Recovery</p>
              <h1 className="bs-h1">Reset <span>Password</span></h1>
              <p className="bs-sub">Choose a new password for your account.</p>

              <div className="bs-card">
                {state === "success" ? (
                  <div className="bs-success" role="status">
                    Password updated. You can now{" "}
                    <a href="/login">log in</a>.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="bs-field">
                      <label htmlFor="rp-new">New password</label>
                      <input
                        id="rp-new"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <div className="bs-field">
                      <label htmlFor="rp-confirm">Confirm new password</label>
                      <input
                        id="rp-confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your new password"
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    {state === "error" && errorMsg && (
                      <p className="bs-err" role="alert">
                        {errorMsg}{" "}
                        {errorMsg.includes("invalid or has expired") && (
                          <a href="/forgot-password" style={{ color: "#E8B930", textDecoration: "none" }}>
                            Request a new link.
                          </a>
                        )}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="bs-submit"
                      disabled={state === "submitting"}
                    >
                      {state === "submitting" ? "Updating…" : "Set New Password"}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          <a href="/login" className="bs-back">← Back to login</a>
        </div>
      </main>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
