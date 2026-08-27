// app/shop/coming-soon/xo-beauty/page.tsx
// Coming soon landing page for XO Beauty & Lashes.
// Shows logo, brand description, and email capture form.
// Email submissions POST to /api/waitlist — wire up to Resend or your preferred handler.

"use client";

import { useState } from "react";

export default function XOBeautyComingSoon() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit() {
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg("");
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, vendor: "xo-beauty" }),
      });

      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');

.xo-root *, .xo-root *::before, .xo-root *::after { box-sizing:border-box; margin:0; padding:0; }
.xo-root {
  --xo-black:#000;
  --xo-gold:#E8B930;
  --xo-cream:#F5F0E6;
  --xo-muted:rgba(245,240,230,.55);
  --xo-line:rgba(245,240,230,.1);
  --xo-display:'Bebas Neue',Impact,sans-serif;
  --xo-sans:'Hanken Grotesk',system-ui,sans-serif;
  --xo-serif:'Cormorant Garamond',Georgia,serif;
  font-family:var(--xo-sans);
  background:var(--xo-black);
  color:var(--xo-cream);
  min-height:100vh;
  display:flex;
  flex-direction:column;
}
.xo-root a { text-decoration:none; color:inherit; }

/* nav */
.xo-nav {
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:18px 48px;
  border-bottom:1px solid var(--xo-line);
}
.xo-nav-logo { display:flex; align-items:center; gap:10px; }
.xo-nav-logo img { width:34px; height:34px; object-fit:contain; }
.xo-nav-wordmark { font-family:var(--xo-display); font-size:17px; letter-spacing:.14em; text-transform:uppercase; }
.xo-back { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--xo-muted); transition:color .2s; }
.xo-back:hover { color:var(--xo-gold); }

/* main layout */
.xo-main {
  flex:1;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:72px 24px 80px;
  max-width:680px;
  margin:0 auto;
  width:100%;
  text-align:center;
}

/* logo */
.xo-logo-wrap {
  width:190px;
  height:190px;
  border-radius:50%;
  background:rgba(255,255,255,.03);
  border:1px solid var(--xo-line);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:18px;
  margin-bottom:36px;
  position:relative;
}
/* subtle glow ring */
.xo-logo-wrap::before {
  content:'';
  position:absolute;
  inset:-1px;
  border-radius:50%;
  background:conic-gradient(from 0deg, transparent 60%, rgba(232,185,48,.18) 80%, transparent 100%);
  animation:xo-spin 8s linear infinite;
}
@keyframes xo-spin { to { transform:rotate(360deg); } }
.xo-logo-wrap img { width:100%; height:100%; object-fit:contain; position:relative; z-index:1; }

/* eyebrow */
.xo-eyebrow {
  font-size:10px;
  letter-spacing:.3em;
  text-transform:uppercase;
  color:var(--xo-gold);
  margin-bottom:14px;
}

/* brand name */
.xo-brand-name {
  font-family:var(--xo-serif);
  font-size:clamp(2rem,6vw,3.2rem);
  font-weight:500;
  font-style:italic;
  color:var(--xo-cream);
  line-height:1.05;
  margin-bottom:6px;
}

/* category pill */
.xo-cat {
  display:inline-block;
  font-size:9px;
  letter-spacing:.22em;
  text-transform:uppercase;
  color:rgba(232,185,48,.7);
  border:1px solid rgba(232,185,48,.2);
  padding:4px 12px;
  border-radius:20px;
  margin-bottom:28px;
}

/* divider */
.xo-divider {
  width:48px;
  height:1px;
  background:var(--xo-line);
  margin:0 auto 28px;
}

/* description */
.xo-desc {
  font-family:var(--xo-serif);
  font-size:1.15rem;
  font-weight:300;
  font-style:italic;
  line-height:1.75;
  color:rgba(245,240,230,.75);
  margin-bottom:12px;
  max-width:520px;
}
.xo-desc-sub {
  font-size:13px;
  font-weight:300;
  line-height:1.7;
  color:var(--xo-muted);
  margin-bottom:40px;
  max-width:480px;
}

/* status badge */
.xo-status-badge {
  display:inline-flex;
  align-items:center;
  gap:8px;
  background:rgba(232,185,48,.07);
  border:1px solid rgba(232,185,48,.2);
  color:rgba(232,185,48,.8);
  font-size:10px;
  letter-spacing:.18em;
  text-transform:uppercase;
  padding:6px 16px;
  border-radius:20px;
  margin-bottom:36px;
}
.xo-dot { width:5px; height:5px; border-radius:50%; background:rgba(232,185,48,.7); animation:xo-pulse 2s ease-in-out infinite; }
@keyframes xo-pulse { 0%,100%{opacity:.4;transform:scale(1);} 50%{opacity:1;transform:scale(1.3);} }

/* email form */
.xo-form-label {
  font-size:11px;
  letter-spacing:.15em;
  text-transform:uppercase;
  color:var(--xo-muted);
  margin-bottom:16px;
  display:block;
}
.xo-form-row {
  display:flex;
  gap:0;
  width:100%;
  max-width:440px;
  margin:0 auto;
  border:1px solid rgba(245,240,230,.18);
  border-radius:4px;
  overflow:hidden;
  transition:border-color .2s;
}
.xo-form-row:focus-within { border-color:rgba(232,185,48,.5); }
.xo-input {
  flex:1;
  background:rgba(255,255,255,.04);
  border:none;
  outline:none;
  padding:14px 18px;
  font-family:var(--xo-sans);
  font-size:13px;
  color:var(--xo-cream);
  letter-spacing:.02em;
}
.xo-input::placeholder { color:rgba(245,240,230,.3); }
.xo-btn {
  background:var(--xo-gold);
  color:#000;
  border:none;
  padding:14px 22px;
  font-family:var(--xo-sans);
  font-size:10.5px;
  font-weight:700;
  letter-spacing:.14em;
  text-transform:uppercase;
  cursor:pointer;
  transition:background .2s;
  white-space:nowrap;
}
.xo-btn:hover:not(:disabled) { background:#d4a820; }
.xo-btn:disabled { opacity:.6; cursor:not-allowed; }

.xo-error { font-size:12px; color:#e06060; margin-top:10px; }

/* success state */
.xo-success {
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:10px;
  padding:24px 32px;
  background:rgba(26,60,52,.25);
  border:1px solid rgba(26,60,52,.6);
  border-radius:6px;
  max-width:440px;
  margin:0 auto;
}
.xo-success-icon { font-size:24px; }
.xo-success-title { font-family:var(--xo-serif); font-size:1.3rem; font-weight:500; color:var(--xo-cream); }
.xo-success-sub { font-size:13px; color:var(--xo-muted); line-height:1.6; }

/* instagram link */
.xo-ig {
  display:inline-flex;
  align-items:center;
  gap:7px;
  margin-top:36px;
  font-size:11px;
  letter-spacing:.1em;
  text-transform:uppercase;
  color:var(--xo-muted);
  transition:color .2s;
}
.xo-ig:hover { color:var(--xo-cream); }

/* footer */
.xo-foot {
  border-top:1px solid var(--xo-line);
  padding:32px 48px;
  text-align:center;
  font-size:11px;
  letter-spacing:.1em;
  color:rgba(245,240,230,.3);
}

@media (max-width:600px) {
  .xo-nav { padding:14px 20px; }
  .xo-main { padding:56px 20px 64px; }
  .xo-form-row { flex-direction:column; border-radius:4px; }
  .xo-btn { border-top:1px solid rgba(245,240,230,.1); }
}
` }} />

      <div className="xo-root">
        {/* nav */}
        <nav className="xo-nav">
          <a href="/" className="xo-nav-logo">
            <img src="/outsyde-y-transparent.png" alt="OutsYde" />
            <span className="xo-nav-wordmark">OutsYde</span>
          </a>
          <a href="/shop" className="xo-back">← Back to Marketplace</a>
        </nav>

        {/* main */}
        <main className="xo-main">
          {/* logo */}
          <div className="xo-logo-wrap">
            <img src="/xo-beauty-lashes.png" alt="XO Beauty & Lashes" />
          </div>

          {/* eyebrow */}
          <p className="xo-eyebrow">Coming to OutsYde</p>

          {/* brand name */}
          <h1 className="xo-brand-name">XO Beauty & Lashes</h1>
          <span className="xo-cat">Beauty & Lashes</span>

          {/* status */}
          <div className="xo-status-badge">
            <span className="xo-dot" />
            Opening Soon
          </div>

          <div className="xo-divider" />

          {/* description */}
          <p className="xo-desc">
            Every set is a ritual — an act of intention, care, and craft.
          </p>
          <p className="xo-desc-sub">
            Nik brings precision and genuine artistry to every client who sits in her chair.
            From your first Classic set to your tenth Abundance fill, XO Beauty & Lashes is built on
            professionalism and a love for the art of lashes. When you leave her chair,
            you don't just look different — you feel different.
          </p>

          {/* email capture */}
          <label className="xo-form-label">Be first to know when we open</label>

          {status === "success" ? (
            <div className="xo-success">
              <span className="xo-success-icon">✦</span>
              <span className="xo-success-title">You're on the list.</span>
              <span className="xo-success-sub">
                We'll notify you the moment XO Beauty & Lashes goes live on OutsYde.
              </span>
            </div>
          ) : (
            <>
              <div className="xo-form-row">
                <input
                  className="xo-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  disabled={status === "loading"}
                />
                <button
                  className="xo-btn"
                  onClick={handleSubmit}
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Saving…" : "Notify Me"}
                </button>
              </div>
              {errorMsg && <p className="xo-error">{errorMsg}</p>}
              {status === "error" && (
                <p className="xo-error">Something went wrong. Please try again.</p>
              )}
            </>
          )}

          {/* instagram */}
          <a
            href="https://instagram.com/XOBEAUTYANDLASHESLLC"
            target="_blank"
            rel="noopener noreferrer"
            className="xo-ig"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            @XOBEAUTYANDLASHESLLC
          </a>
        </main>

        <footer className="xo-foot">
          © {new Date().getFullYear()} OutsYde · Culture meets commerce
        </footer>
      </div>
    </>
  );
}
