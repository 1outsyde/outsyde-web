// app/accept-invite/page.tsx
// Public staff invite landing page — /accept-invite?code=XXXX
//
// Flow:
//   1. Read ?code= from the URL.
//   2. Call /api/accept-invite/preview (BFF → outsyde-backend) to validate
//      the invite and fetch business details.
//   3. Show the appropriate state: loading / invalid / expired / non-pending /
//      valid-pending (with login or signup form).
//   4. On submission, POST to /api/accept-invite/complete (BFF handles the
//      full server-to-server auth + accept sequence — no browser session is
//      created on outsyde-web).
//   5. On success, show "You're in! Open the app." — no redirect, no session.
//
// Styling: inline <style> block, .ai-* namespace, reuse --gold / --cream / --black
// tokens. Minimal chrome modelled on app/coming-soon/page.tsx.

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type InvitePreview = {
  businessName: string;
  businessLogo?: string;
  businessCategory?: string;
  businessCity?: string;
  businessState?: string;
  role: string;
  invitedByName?: string;
  expiresAt?: string;
  status: string;
  isExpired: boolean;
};

type PageState =
  | { tag: "loading" }
  | { tag: "invalid" }
  | { tag: "expired"; invite: InvitePreview }
  | { tag: "already-accepted"; invite: InvitePreview }
  | { tag: "revoked"; invite: InvitePreview }
  | { tag: "pending"; invite: InvitePreview }
  | { tag: "success" }
  | { tag: "partial"; message: string };

type FormMode = "login" | "signup";
type SubmitState = "idle" | "submitting" | "error";

// ---------------------------------------------------------------------------
// Inner component — uses useSearchParams (must be inside Suspense)
// ---------------------------------------------------------------------------
function AcceptInviteInner() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";

  const [page, setPage] = useState<PageState>({ tag: "loading" });
  const [mode, setMode] = useState<FormMode>("login");

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");

  // Fetch preview on mount (or when code changes)
  useEffect(() => {
    if (!code) {
      setPage({ tag: "invalid" });
      return;
    }

    setPage({ tag: "loading" });
    fetch(`/api/accept-invite/preview?code=${encodeURIComponent(code)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 404 || !data || (!data.status && !data.businessName)) {
          setPage({ tag: "invalid" });
          return;
        }
        const invite: InvitePreview = data;
        if (invite.isExpired) {
          setPage({ tag: "expired", invite });
        } else if (invite.status === "accepted") {
          setPage({ tag: "already-accepted", invite });
        } else if (invite.status === "revoked" || invite.status === "cancelled") {
          setPage({ tag: "revoked", invite });
        } else if (invite.status === "pending") {
          setPage({ tag: "pending", invite });
        } else {
          // Unknown status — treat as invalid
          setPage({ tag: "invalid" });
        }
      })
      .catch(() => setPage({ tag: "invalid" }));
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitState("submitting");

    try {
      const res = await fetch("/api/accept-invite/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          mode,
          email: email.trim().toLowerCase(),
          password,
          ...(mode === "signup" ? { name: name.trim() } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitState("error");
        setSubmitError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (data.inviteNotLinked) {
        setPage({
          tag: "partial",
          message:
            "Your account was created, but we couldn\u2019t link the invite \u2014 " +
            "the invite may have been sent to a different email address. " +
            "Contact the business owner to get re-invited.",
        });
        return;
      }

      setPage({ tag: "success" });
    } catch {
      setSubmitState("error");
      setSubmitError("Couldn\u2019t reach the server. Please try again.");
    }
  }

  // Render
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

/* page shell */
.ai-wrap{position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;overflow:hidden;}
.ai-bg{position:absolute;inset:0;background:var(--off-black);overflow:hidden;z-index:0;}
.ai-bg::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 70% 65% at 22% 58%,rgba(26,60,52,.9) 0%,transparent 52%),radial-gradient(ellipse 55% 45% at 78% 22%,rgba(232,185,48,.1) 0%,transparent 48%),radial-gradient(ellipse 60% 70% at 62% 85%,rgba(26,60,52,.55) 0%,transparent 52%),#04100d;}
.ai-veil{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3),rgba(0,0,0,.72));z-index:1;}
.ai-inner{position:relative;z-index:2;max-width:480px;width:100%;}

/* logo */
.ai-logo{display:inline-flex;align-items:center;gap:12px;margin-bottom:40px;}
.ai-y{width:42px;height:42px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:24px;color:var(--black);}
.ai-word{font-family:var(--serif);font-size:22px;letter-spacing:.16em;color:var(--cream);text-transform:uppercase;}

/* card */
.ai-card{background:rgba(255,255,255,.05);border:1px solid rgba(245,240,230,.12);border-radius:8px;padding:32px 28px;text-align:left;}

/* business header */
.ai-biz{display:flex;align-items:center;gap:14px;margin-bottom:22px;}
.ai-biz-logo{width:52px;height:52px;border-radius:8px;object-fit:cover;border:1px solid rgba(245,240,230,.18);}
.ai-biz-logo-placeholder{width:52px;height:52px;border-radius:8px;background:rgba(232,185,48,.18);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:22px;color:var(--gold);border:1px solid rgba(232,185,48,.3);flex-shrink:0;}
.ai-biz-name{font-family:var(--serif);font-size:20px;letter-spacing:.06em;color:var(--cream);}
.ai-biz-meta{font-size:11px;color:rgba(245,240,230,.55);letter-spacing:.06em;margin-top:3px;}

/* invite headline */
.ai-eyebrow{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;}
.ai-headline{font-size:15px;font-weight:400;line-height:1.6;color:rgba(245,240,230,.88);margin-bottom:24px;}
.ai-headline strong{color:var(--cream);font-weight:600;}
.ai-divider{border:none;border-top:1px solid rgba(245,240,230,.1);margin:0 0 24px;}

/* mode toggle */
.ai-toggle{display:flex;gap:0;background:rgba(0,0,0,.3);border:1px solid rgba(245,240,230,.12);border-radius:4px;overflow:hidden;margin-bottom:22px;}
.ai-toggle-btn{flex:1;padding:11px 8px;font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.06em;background:transparent;border:none;color:rgba(245,240,230,.55);cursor:pointer;transition:background .18s,color .18s;}
.ai-toggle-btn.active{background:rgba(232,185,48,.16);color:var(--cream);}
.ai-toggle-btn:first-child{border-right:1px solid rgba(245,240,230,.12);}

/* form fields */
.ai-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.ai-field label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(245,240,230,.55);}
.ai-field input{background:rgba(0,0,0,.35);color:var(--cream);border:1px solid rgba(245,240,230,.16);border-radius:4px;padding:12px 13px;font-family:var(--sans);font-size:14px;width:100%;outline:none;transition:border-color .18s;}
.ai-field input:focus{border-color:var(--gold);}
.ai-field input::placeholder{color:rgba(245,240,230,.3);}

/* submit */
.ai-submit{width:100%;margin-top:4px;padding:14px;background:var(--gold);color:var(--black);border:none;border-radius:4px;font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .15s,opacity .2s;}
.ai-submit:hover:not(:disabled){background:#f2c835;transform:translateY(-1px);}
.ai-submit:disabled{opacity:.55;cursor:not-allowed;}

/* error */
.ai-err{margin-top:14px;font-size:13px;color:#ff8080;line-height:1.5;}

/* status states */
.ai-status{text-align:center;padding:8px 0;}
.ai-status-icon{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;font-size:22px;margin-bottom:18px;}
.ai-status-icon.ok{background:var(--emerald);color:var(--gold);}
.ai-status-icon.warn{background:rgba(232,185,48,.18);color:var(--gold);}
.ai-status-icon.err{background:rgba(180,60,60,.2);color:#f0a0a0;}
.ai-status h2{font-family:var(--serif);font-size:clamp(24px,5vw,36px);letter-spacing:.05em;color:var(--cream);margin-bottom:12px;}
.ai-status p{font-size:14px;font-weight:300;line-height:1.7;color:rgba(245,240,230,.78);max-width:380px;margin:0 auto;}
.ai-status p strong{color:var(--cream);font-weight:600;}

/* app CTA */
.ai-app-cta{display:inline-block;margin-top:22px;padding:14px 28px;background:var(--gold);color:var(--black);border-radius:4px;font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;transition:background .2s;}
.ai-app-cta:hover{background:#f2c835;}

/* loading spinner */
.ai-spinner{width:36px;height:36px;border:3px solid rgba(245,240,230,.12);border-top-color:var(--gold);border-radius:50%;animation:aiSpin .7s linear infinite;margin:0 auto 20px;}
@keyframes aiSpin{to{transform:rotate(360deg);}}

/* back link */
.ai-back{display:inline-block;margin-top:36px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.45);text-decoration:none;transition:color .2s;}
.ai-back:hover{color:var(--gold);}

@media (prefers-reduced-motion: reduce){.ai-spinner{animation:none;border-top-color:var(--gold);}.ai-bg::before{animation:none;}}
@media (max-width:520px){.ai-card{padding:24px 18px;}}
`,
        }}
      />

      <main className="ai-wrap">
        <div className="ai-bg" aria-hidden="true" />
        <div className="ai-veil" aria-hidden="true" />

        <div className="ai-inner">
          <a href="/" className="ai-logo" aria-label="Go OutsYde home">
            <span className="ai-y" aria-hidden="true">Y</span>
            <span className="ai-word">Go OutsYde</span>
          </a>

          {page.tag === "loading" && (
            <div className="ai-status">
              <div className="ai-spinner" aria-label="Loading…" />
              <p style={{ fontSize: 13, color: "rgba(245,240,230,.5)" }}>Checking invite…</p>
            </div>
          )}

          {page.tag === "invalid" && (
            <div className="ai-status">
              <div className="ai-status-icon err" aria-hidden="true">✕</div>
              <h2>Link Not Found</h2>
              <p>
                This invite link isn&rsquo;t valid. If you think this is a mistake,
                contact the business that invited you.
              </p>
            </div>
          )}

          {page.tag === "expired" && (
            <div className="ai-status">
              <div className="ai-status-icon warn" aria-hidden="true">⏱</div>
              <h2>Invite Expired</h2>
              <p>
                This invite has expired. Ask{" "}
                <strong>{page.invite.businessName}</strong> to send a new one.
              </p>
            </div>
          )}

          {page.tag === "already-accepted" && (
            <div className="ai-status">
              <div className="ai-status-icon ok" aria-hidden="true">✓</div>
              <h2>Already Accepted</h2>
              <p>
                This invite for <strong>{page.invite.businessName}</strong> has already
                been accepted. Open the Outsyde app to get started.
              </p>
              <a
                href="https://apps.apple.com/app/outsyde/id6738926870"
                className="ai-app-cta"
              >
                Open the App
              </a>
            </div>
          )}

          {page.tag === "revoked" && (
            <div className="ai-status">
              <div className="ai-status-icon err" aria-hidden="true">✕</div>
              <h2>Invite Revoked</h2>
              <p>
                This invite from <strong>{page.invite.businessName}</strong> has been
                cancelled. If you believe this is an error, reach out to the business
                owner directly.
              </p>
            </div>
          )}

          {page.tag === "success" && (
            <div className="ai-status">
              <div className="ai-status-icon ok" aria-hidden="true">✓</div>
              <h2>You&rsquo;re In!</h2>
              <p>
                Your invitation has been accepted. Open the Outsyde app to get started
                working with your team.
              </p>
              <a
                href="https://apps.apple.com/app/outsyde/id6738926870"
                className="ai-app-cta"
              >
                Open the Outsyde App
              </a>
            </div>
          )}

          {page.tag === "partial" && (
            <div className="ai-status">
              <div className="ai-status-icon warn" aria-hidden="true">!</div>
              <h2>Account Created</h2>
              <p>{page.message}</p>
            </div>
          )}

          {page.tag === "pending" && (
            <div className="ai-card">
              {/* Business header */}
              <div className="ai-biz">
                {page.invite.businessLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.invite.businessLogo}
                    alt={page.invite.businessName}
                    className="ai-biz-logo"
                  />
                ) : (
                  <div className="ai-biz-logo-placeholder" aria-hidden="true">
                    {page.invite.businessName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="ai-biz-name">{page.invite.businessName}</div>
                  {(page.invite.businessCategory ||
                    page.invite.businessCity ||
                    page.invite.businessState) && (
                    <div className="ai-biz-meta">
                      {[
                        page.invite.businessCategory,
                        [page.invite.businessCity, page.invite.businessState]
                          .filter(Boolean)
                          .join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </div>
              </div>

              {/* Invite headline */}
              <p className="ai-eyebrow">Staff Invitation</p>
              <p className="ai-headline">
                You&rsquo;ve been invited to join{" "}
                <strong>{page.invite.businessName}</strong> as a{" "}
                <strong>{page.invite.role}</strong>
                {page.invite.invitedByName && (
                  <> by <strong>{page.invite.invitedByName}</strong></>
                )}
                .
              </p>
              <hr className="ai-divider" />

              {/* Mode toggle */}
              <div className="ai-toggle" role="group" aria-label="Account mode">
                <button
                  type="button"
                  className={`ai-toggle-btn${mode === "login" ? " active" : ""}`}
                  onClick={() => { setMode("login"); setSubmitError(""); }}
                >
                  I already have an account
                </button>
                <button
                  type="button"
                  className={`ai-toggle-btn${mode === "signup" ? " active" : ""}`}
                  onClick={() => { setMode("signup"); setSubmitError(""); }}
                >
                  I&rsquo;m new here
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                {mode === "signup" && (
                  <div className="ai-field">
                    <label htmlFor="ai-name">Full Name</label>
                    <input
                      id="ai-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="ai-field">
                  <label htmlFor="ai-email">Email</label>
                  <input
                    id="ai-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="ai-field">
                  <label htmlFor="ai-password">Password</label>
                  <input
                    id="ai-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Create a password" : "Your password"}
                    required
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>

                {submitState === "error" && submitError && (
                  <p className="ai-err" role="alert">{submitError}</p>
                )}

                <button
                  type="submit"
                  className="ai-submit"
                  disabled={submitState === "submitting"}
                >
                  {submitState === "submitting"
                    ? "Please wait…"
                    : mode === "login"
                      ? "Log in & Accept Invite"
                      : "Create Account & Accept Invite"}
                </button>
              </form>
            </div>
          )}

          <a href="/" className="ai-back">← Back to Home</a>
        </div>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page export — wraps in Suspense (required by Next.js when using
// useSearchParams in a client component)
// ---------------------------------------------------------------------------
export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#04100d",
            color: "#F5F0E6",
            fontFamily: "system-ui,sans-serif",
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}
