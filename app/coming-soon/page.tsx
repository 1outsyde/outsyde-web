// app/coming-soon/page.tsx
// Go OutsYde — Coming Soon / notify-me capture.
// Branded to match the homepage (emerald/gold/cream, Bebas + Hanken, Y mark).
// All not-yet-built nav links point here so there are zero 404 dead ends.
//
// Submissions POST to /api/notify-signup, which sends via Resend:
//   - an internal alert to info@goutsyde.com
//   - a branded confirmation to the signer.
// No third-party form key needed — uses your own Resend pipeline.

"use client";

import { useState } from "react";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function notifyMe() {
    setMsg("");
    if (!email.includes("@")) {
      setStatus("error");
      setMsg("Enter a valid email so we can reach you.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/notify-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("done");
      } else {
        setStatus("error");
        setMsg(data.error || "Something went wrong. Please try again in a moment.");
      }
    } catch {
      setStatus("error");
      setMsg("Couldn't reach the server. Please try again.");
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

.cs-wrap{position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px 24px;overflow:hidden;}
.cs-bg{position:absolute;inset:0;background:var(--off-black);overflow:hidden;z-index:0;}
.cs-bg::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 70% 65% at 22% 58%,rgba(26,60,52,.9) 0%,transparent 52%),radial-gradient(ellipse 55% 45% at 78% 22%,rgba(232,185,48,.1) 0%,transparent 48%),radial-gradient(ellipse 60% 70% at 62% 85%,rgba(26,60,52,.55) 0%,transparent 52%),#04100d;animation:csFlow 16s ease-in-out infinite alternate;will-change:transform;}
@keyframes csFlow{0%{transform:translate(0%,0%) scale(1);}50%{transform:translate(2%,-1.4%) scale(1.07);}100%{transform:translate(-1.8%,2%) scale(1.1);}}
.cs-veil{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.35),rgba(0,0,0,.78));z-index:1;}

.cs-inner{position:relative;z-index:2;max-width:560px;width:100%;}
.cs-logo{display:inline-flex;align-items:center;gap:12px;margin-bottom:44px;}
.cs-y{width:46px;height:46px;background:var(--gold);border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:26px;color:var(--black);}
.cs-word{font-family:var(--serif);font-size:24px;letter-spacing:.16em;color:var(--cream);text-transform:uppercase;}

.cs-eyebrow{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--gold);margin-bottom:22px;}
.cs-title{font-family:var(--serif);font-size:clamp(56px,12vw,104px);line-height:.9;letter-spacing:.03em;text-transform:uppercase;color:var(--cream);margin-bottom:20px;}
.cs-title .g{color:var(--gold);}
.cs-desc{font-size:15px;font-weight:300;line-height:1.7;color:rgba(245,240,230,.72);max-width:420px;margin:0 auto 40px;}

.cs-form{display:flex;gap:10px;max-width:440px;margin:0 auto;flex-wrap:wrap;justify-content:center;}
.cs-input{flex:1;min-width:220px;padding:15px 18px;border:1px solid rgba(245,240,230,.25);border-radius:4px;background:rgba(0,0,0,.4);color:var(--cream);font-size:14px;font-family:var(--sans);outline:none;transition:border-color .2s;}
.cs-input::placeholder{color:rgba(245,240,230,.4);}
.cs-input:focus{border-color:var(--gold);}
.cs-btn{padding:15px 28px;background:var(--gold);color:var(--black);border:none;border-radius:4px;font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .2s,opacity .2s;white-space:nowrap;}
.cs-btn:hover:not(:disabled){background:#f2c835;transform:translateY(-2px);}
.cs-btn:disabled{opacity:.55;cursor:not-allowed;}

.cs-note{min-height:1.2rem;margin-top:16px;font-size:13px;}
.cs-note.err{color:#ff8080;}
.cs-success{font-size:15px;color:var(--cream);line-height:1.7;max-width:420px;margin:0 auto;}
.cs-success .chk{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:var(--emerald);color:var(--gold);font-size:22px;margin-bottom:18px;}

.cs-back{display:inline-block;margin-top:48px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.5);text-decoration:none;transition:color .2s;}
.cs-back:hover{color:var(--gold);}

@media (prefers-reduced-motion: reduce){ .cs-bg::before{animation:none;} }
@media (max-width:520px){
  .cs-form{flex-direction:column;} .cs-input,.cs-btn{width:100%;}
}
`,
        }}
      />

      <main className="cs-wrap">
        <div className="cs-bg" aria-hidden="true" />
        <div className="cs-veil" aria-hidden="true" />

        <div className="cs-inner">
          <a href="/" className="cs-logo" aria-label="Go OutsYde home">
            <span className="cs-y" aria-hidden="true">Y</span>
            <span className="cs-word">Go OutsYde</span>
          </a>

          <p className="cs-eyebrow">Like a Lavished Local</p>
          <h1 className="cs-title">
            Coming <span className="g">Soon</span>
          </h1>

          {status === "done" ? (
            <div className="cs-success">
              <div className="chk" aria-hidden="true">✓</div>
              <p>You&apos;re on the list. We&apos;ll email you the moment this goes live.</p>
            </div>
          ) : (
            <>
              <p className="cs-desc">
                We&apos;re putting the finishing touches on this part of OutsYde.
                Drop your email and we&apos;ll let you know the second it&apos;s ready.
              </p>

              <div className="cs-form">
                <input
                  className="cs-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") notifyMe(); }}
                  placeholder="you@email.com"
                  aria-label="Email address"
                />
                <button
                  className="cs-btn"
                  onClick={notifyMe}
                  disabled={status === "sending"}
                >
                  {status === "sending" ? "Sending…" : "Notify Me"}
                </button>
              </div>

              <div className={`cs-note${status === "error" ? " err" : ""}`}>{msg}</div>
            </>
          )}

          <a href="/" className="cs-back">← Back to Home</a>
        </div>
      </main>
    </>
  );
}