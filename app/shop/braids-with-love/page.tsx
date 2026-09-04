// app/shop/coming-soon/braids-with-love/page.tsx
// Coming soon landing page for Braids With Love.
// Logo, brand description, and email capture.
// Save logo to /public/braids-with-love.png

"use client";

import { useState } from "react";

export default function BraidsWithLoveComingSoon() {
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
        body: JSON.stringify({ email, vendor: "braids-with-love" }),
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
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');

.bwl-root *, .bwl-root *::before, .bwl-root *::after { box-sizing:border-box; margin:0; padding:0; }
.bwl-root {
  --bwl-black:#000;
  --bwl-teal:#2BBFBF;
  --bwl-gold:#E8B930;
  --bwl-cream:#F5F0E6;
  --bwl-muted:rgba(245,240,230,.55);
  --bwl-line:rgba(245,240,230,.08);
  --bwl-display:'Bebas Neue',Impact,sans-serif;
  --bwl-sans:'Hanken Grotesk',system-ui,sans-serif;
  --bwl-serif:'Cormorant Garamond',Georgia,serif;
  font-family:var(--bwl-sans);
  background:var(--bwl-black);
  color:var(--bwl-cream);
  min-height:100vh;
  display:flex;
  flex-direction:column;
}
.bwl-root a { text-decoration:none; color:inherit; }

/* nav */
.bwl-nav {
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:18px 48px;
  border-bottom:1px solid var(--bwl-line);
}
.bwl-nav-logo { display:flex; align-items:center; gap:10px; }
.bwl-nav-logo img { width:34px; height:34px; object-fit:contain; }
.bwl-nav-wordmark { font-family:var(--bwl-display); font-size:17px; letter-spacing:.14em; text-transform:uppercase; }
.bwl-back { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--bwl-muted); transition:color .2s; }
.bwl-back:hover { color:var(--bwl-teal); }

/* hero */
.bwl-hero {
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:64px 24px 48px;
  text-align:center;
  border-bottom:1px solid var(--bwl-line);
}

/*
  LOGO RING APPROACH:
  - .bwl-logo-wrap is a transparent positioner only (no background, no clip)
  - ::before is the spinning conic ring — kept very subtle so it doesn't
    visually compete with the gold border baked into the PNG
  - .bwl-logo-inner centers and clips the image
  - The image uses object-fit:contain so the PNG's own gold border is
    fully visible and not cropped
*/
.bwl-logo-wrap {
  width:196px;
  height:196px;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:32px;
  position:relative;
  flex-shrink:0;
}

/* spinning ring — sits behind everything */
.bwl-logo-wrap::before {
  content:'';
  position:absolute;
  inset:0;
  border-radius:50%;
  background:conic-gradient(
    from 0deg,
    transparent 40%,
    rgba(43,191,191,.15) 60%,
    rgba(232,185,48,.6) 75%,
    rgba(43,191,191,.15) 85%,
    transparent 100%
  );
  animation:bwl-spin 10s linear infinite;
  z-index:0;
}
@keyframes bwl-spin { to { transform:rotate(360deg); } }

/* inner circle: 180px so there's an 8px gap between image edge
   and the spinning ring — prevents the two gold rings from blurring together */
.bwl-logo-inner {
  position:relative;
  z-index:1;
  width:180px;
  height:180px;
  border-radius:50%;
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#000;
  flex-shrink:0;
}

/* contain preserves the full PNG (including its baked-in gold border)
   without any cropping; the image is mathematically centered by flex */
.bwl-logo-inner img {
  width:100%;
  height:100%;
  object-fit:contain;
  object-position:center center;
  display:block;
}

.bwl-eyebrow { font-size:10px; letter-spacing:.3em; text-transform:uppercase; color:var(--bwl-teal); margin-bottom:12px; }
.bwl-brand-name {
  font-family:var(--bwl-serif);
  font-size:clamp(2rem,6vw,3.4rem);
  font-weight:500;
  font-style:italic;
  color:var(--bwl-cream);
  line-height:1.05;
  margin-bottom:6px;
}
.bwl-cat {
  display:inline-block;
  font-size:9px;
  letter-spacing:.22em;
  text-transform:uppercase;
  color:rgba(43,191,191,.8);
  border:1px solid rgba(43,191,191,.2);
  padding:4px 12px;
  border-radius:20px;
  margin-bottom:24px;
}
.bwl-status-badge {
  display:inline-flex;
  align-items:center;
  gap:8px;
  background:rgba(43,191,191,.06);
  border:1px solid rgba(43,191,191,.2);
  color:rgba(43,191,191,.8);
  font-size:10px;
  letter-spacing:.18em;
  text-transform:uppercase;
  padding:6px 16px;
  border-radius:20px;
  margin-bottom:28px;
}
.bwl-dot { width:5px; height:5px; border-radius:50%; background:var(--bwl-teal); animation:bwl-pulse 2s ease-in-out infinite; }
@keyframes bwl-pulse { 0%,100%{opacity:.4;transform:scale(1);} 50%{opacity:1;transform:scale(1.3);} }
.bwl-desc {
  font-family:var(--bwl-serif);
  font-size:1.15rem;
  font-style:italic;
  font-weight:300;
  line-height:1.75;
  color:rgba(245,240,230,.75);
  max-width:540px;
  margin-bottom:10px;
}
.bwl-desc-sub {
  font-size:13px;
  font-weight:300;
  line-height:1.7;
  color:var(--bwl-muted);
  max-width:500px;
}

/* email capture */
.bwl-capture {
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:48px 24px;
}
.bwl-capture-label {
  font-size:11px;
  letter-spacing:.15em;
  text-transform:uppercase;
  color:var(--bwl-muted);
  margin-bottom:16px;
}
.bwl-form-row {
  display:flex;
  width:100%;
  max-width:440px;
  border:1px solid rgba(245,240,230,.15);
  border-radius:4px;
  overflow:hidden;
  transition:border-color .2s;
}
.bwl-form-row:focus-within { border-color:rgba(43,191,191,.4); }
.bwl-input {
  flex:1;
  background:rgba(255,255,255,.04);
  border:none;
  outline:none;
  padding:14px 18px;
  font-family:var(--bwl-sans);
  font-size:13px;
  color:var(--bwl-cream);
}
.bwl-input::placeholder { color:rgba(245,240,230,.3); }
.bwl-btn {
  background:var(--bwl-teal);
  color:#000;
  border:none;
  padding:14px 22px;
  font-family:var(--bwl-sans);
  font-size:10.5px;
  font-weight:700;
  letter-spacing:.14em;
  text-transform:uppercase;
  cursor:pointer;
  transition:background .2s;
  white-space:nowrap;
}
.bwl-btn:hover:not(:disabled) { background:#22a8a8; }
.bwl-btn:disabled { opacity:.6; cursor:not-allowed; }
.bwl-error { font-size:12px; color:#e06060; margin-top:10px; }
.bwl-success {
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:10px;
  padding:24px 32px;
  background:rgba(43,191,191,.06);
  border:1px solid rgba(43,191,191,.2);
  border-radius:6px;
  max-width:440px;
  text-align:center;
}
.bwl-success-icon { font-size:22px; }
.bwl-success-title { font-family:var(--bwl-serif); font-size:1.3rem; font-weight:500; color:var(--bwl-cream); }
.bwl-success-sub { font-size:13px; color:var(--bwl-muted); line-height:1.6; }

@media (max-width:680px) {
  .bwl-nav { padding:14px 20px; }
  .bwl-form-row { flex-direction:column; }
  .bwl-btn { border-top:1px solid rgba(245,240,230,.1); }
}
` }} />

      <div className="bwl-root">
        {/* nav */}
        <nav className="bwl-nav">
          <a href="/" className="bwl-nav-logo">
            <img src="/outsyde-y-transparent.png" alt="OutsYde" />
            <span className="bwl-nav-wordmark">OutsYde</span>
          </a>
          <a href="/shop" className="bwl-back">← Back to Marketplace</a>
        </nav>

        {/* hero */}
        <header className="bwl-hero">
          <div className="bwl-logo-wrap">
            <div className="bwl-logo-inner">
              <img src="/braids-with-love.png" alt="Braids With Love" />
            </div>
          </div>
          <p className="bwl-eyebrow">Coming to OutsYde</p>
          <h1 className="bwl-brand-name">Braids With Love</h1>
          <span className="bwl-cat">Hair & Braiding · Norfolk, VA</span>
          <div className="bwl-status-badge">
            <span className="bwl-dot" />
            Opening Soon
          </div>
          <p className="bwl-desc">Precision braiding, rooted in care.</p>
          <p className="bwl-desc-sub">
            Serving the Norfolk & Hampton Roads area with knotless braids, soft locs, miracle knots,
            stitch braids, twists, and more. Hair is provided for every style — arrive blown out and
            product-free, and leave transformed.
          </p>
        </header>

        {/* email capture */}
        <div className="bwl-capture">
          <span className="bwl-capture-label">Be first to book when we open</span>
          {status === "success" ? (
            <div className="bwl-success">
              <span className="bwl-success-icon">✦</span>
              <span className="bwl-success-title">You're on the list.</span>
              <span className="bwl-success-sub">
                We'll notify you the moment Braids With Love opens on OutsYde.
              </span>
            </div>
          ) : (
            <>
              <div className="bwl-form-row">
                <input
                  className="bwl-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  disabled={status === "loading"}
                />
                <button className="bwl-btn" onClick={handleSubmit} disabled={status === "loading"}>
                  {status === "loading" ? "Saving…" : "Notify Me"}
                </button>
              </div>
              {errorMsg && <p className="bwl-error">{errorMsg}</p>}
              {status === "error" && <p className="bwl-error">Something went wrong. Please try again.</p>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
