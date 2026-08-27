// app/shop/coming-soon/braids-with-love/page.tsx
// Coming soon landing page for Braids With Love.
// Logo, brand description, service menu preview, and email capture.
// Save logo to /public/braids-with-love.png

"use client";

import { useState } from "react";

const SERVICES = [
  {
    category: "Knotless Braids — Small/Medium",
    items: [
      { name: "Small Medium Midback Knotless", price: "$270", time: "4hrs" },
      { name: "Small/Medium Long Knotless", price: "$290", time: "5hrs" },
      { name: "Small/Medium Knotless Hip Length", price: "$345", time: "6hrs" },
      { name: "Small/Medium Knotless Thigh Length", price: "$400", time: "6.5hrs" },
    ],
  },
  {
    category: "Knotless Braids — Medium",
    items: [
      { name: "Medium Mid Back Knotless", price: "$255", time: "4hrs" },
      { name: "Medium Long Knotless", price: "$290", time: "5hrs" },
      { name: "Medium Knotless Hip Length", price: "$325", time: "5hrs" },
      { name: "Medium Knotless Thigh Length", price: "$375", time: "6hrs" },
    ],
  },
  {
    category: "Knotless Braids — Large",
    items: [
      { name: "Large Knotless Braids", price: "$225", time: "3hrs" },
      { name: "Jumbo Long Knotless", price: "$175", time: "2hrs" },
    ],
  },
  {
    category: "Miracle Knots",
    items: [
      { name: "6 packs of 16in", price: "$400" },
      { name: "6 packs of 18in", price: "$500" },
      { name: "Bring Own Hair", price: "$200" },
    ],
  },
  {
    category: "Soft Locs & Butterfly Locs",
    items: [
      { name: "14in", price: "$225" },
      { name: "18in", price: "$275" },
      { name: "24in", price: "$325" },
      { name: "Butterfly Bob", price: "$260" },
    ],
  },
  {
    category: "Stitch Braids",
    items: [
      { name: "4 Stitch Braids", price: "$60" },
      { name: "6 Stitch Braids", price: "$80" },
      { name: "8 Stitch Braids", price: "$110" },
      { name: "10 Stitch Braids", price: "$140" },
      { name: "12+ Stitch Braids", price: "$200–$300" },
    ],
  },
  {
    category: "Twist",
    items: [
      { name: "Island Twist", price: "$280" },
      { name: "Invisible Locs Twist", price: "$250" },
    ],
  },
  {
    category: "Braids",
    items: [
      { name: "Lemonade Braids", price: "$300" },
      { name: "Ponytail", price: "$160 & up" },
      { name: "Fulani Braids", price: "$280" },
    ],
  },
  {
    category: "Bob",
    items: [
      { name: "Short Bob", price: "$260" },
      { name: "Long Bob", price: "$280" },
    ],
  },
  {
    category: "Touch Up",
    items: [
      { name: "Knotless Touch Up", price: "$100", time: "3hrs" },
      { name: "Front 2 Rows", price: "$100" },
      { name: "Front 3 Rows", price: "$125" },
      { name: "Crown", price: "$150" },
      { name: "Soft Locs Touch Up", price: "$100" },
      { name: "Fulani Touch Up", price: "$150" },
    ],
  },
  {
    category: "Extras",
    items: [
      { name: "Long Braids Add-On", price: "+$10" },
      { name: "Hip Length Add-On", price: "+$15" },
      { name: "Thigh Length Add-On", price: "+$20" },
      { name: "Squeeze In Fee", price: "+$70" },
    ],
  },
  {
    category: "Boho / Add-Ons",
    items: [
      { name: "Human Hair", price: "$125/pack" },
      { name: "Synthetic/Blend", price: "$60" },
      { name: "Bring Hair", price: "$30/pack" },
      { name: "Triangle Parts", price: "$45" },
      { name: "Hand Mixed Color", price: "$15 & up" },
    ],
  },
];

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
  --bwl-teal-line:rgba(43,191,191,.15);
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

.bwl-logo-wrap {
  width:180px;
  height:180px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:32px;
  position:relative;
}
.bwl-logo-wrap::before {
  content:'';
  position:absolute;
  inset:-2px;
  border-radius:50%;
  background:conic-gradient(from 0deg, transparent 50%, rgba(43,191,191,.3) 75%, var(--bwl-gold) 85%, rgba(43,191,191,.3) 90%, transparent 100%);
  animation:bwl-spin 10s linear infinite;
}
@keyframes bwl-spin { to { transform:rotate(360deg); } }
.bwl-logo-wrap img { width:100%; height:100%; object-fit:contain; border-radius:50%; position:relative; z-index:1; }

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
  border-bottom:1px solid var(--bwl-line);
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

/* services */
.bwl-services {
  max-width:860px;
  margin:0 auto;
  padding:56px 24px 48px;
  width:100%;
}
.bwl-services-eyebrow {
  font-size:10px;
  letter-spacing:.28em;
  text-transform:uppercase;
  color:var(--bwl-teal);
  text-align:center;
  margin-bottom:8px;
}
.bwl-services-title {
  font-family:var(--bwl-display);
  font-size:clamp(28px,5vw,44px);
  letter-spacing:.05em;
  text-align:center;
  color:var(--bwl-cream);
  margin-bottom:48px;
}

.bwl-services-grid {
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:2px;
  background:var(--bwl-line);
  border:1px solid var(--bwl-line);
  border-radius:6px;
  overflow:hidden;
}
.bwl-cat-block {
  background:#0a0a0a;
  padding:28px 26px;
}
.bwl-cat-title {
  font-size:10px;
  letter-spacing:.2em;
  text-transform:uppercase;
  color:var(--bwl-teal);
  margin-bottom:16px;
  padding-bottom:10px;
  border-bottom:1px solid var(--bwl-teal-line);
}
.bwl-service-row {
  display:flex;
  justify-content:space-between;
  align-items:baseline;
  gap:12px;
  padding:7px 0;
  border-bottom:1px solid rgba(245,240,230,.04);
}
.bwl-service-row:last-child { border-bottom:none; }
.bwl-service-name { font-size:13px; font-weight:300; color:rgba(245,240,230,.8); line-height:1.4; }
.bwl-service-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.bwl-service-price { font-size:13px; font-weight:600; color:var(--bwl-cream); white-space:nowrap; }
.bwl-service-time { font-size:10px; color:rgba(245,240,230,.35); white-space:nowrap; }

/* policies */
.bwl-policies {
  max-width:680px;
  margin:0 auto;
  padding:0 24px 64px;
  width:100%;
}
.bwl-policies-title {
  font-size:10px;
  letter-spacing:.25em;
  text-transform:uppercase;
  color:var(--bwl-muted);
  text-align:center;
  margin-bottom:24px;
}
.bwl-policy-list {
  display:flex;
  flex-direction:column;
  gap:12px;
}
.bwl-policy {
  display:flex;
  gap:14px;
  padding:16px 20px;
  background:#080808;
  border:1px solid var(--bwl-line);
  border-radius:4px;
  font-size:13px;
  font-weight:300;
  line-height:1.6;
  color:rgba(245,240,230,.7);
}
.bwl-policy-mark { color:var(--bwl-teal); flex-shrink:0; margin-top:2px; }

/* contact / ig */
.bwl-contact {
  border-top:1px solid var(--bwl-line);
  padding:40px 24px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:14px;
  text-align:center;
}
.bwl-contact-label { font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--bwl-muted); }
.bwl-contact-links { display:flex; gap:28px; flex-wrap:wrap; justify-content:center; }
.bwl-contact-link {
  display:inline-flex;
  align-items:center;
  gap:7px;
  font-size:13px;
  color:rgba(245,240,230,.6);
  transition:color .2s;
}
.bwl-contact-link:hover { color:var(--bwl-teal); }

/* footer */
.bwl-foot {
  border-top:1px solid var(--bwl-line);
  padding:28px 48px;
  text-align:center;
  font-size:11px;
  letter-spacing:.1em;
  color:rgba(245,240,230,.25);
}

@media (max-width:680px) {
  .bwl-nav { padding:14px 20px; }
  .bwl-services-grid { grid-template-columns:1fr; }
  .bwl-form-row { flex-direction:column; }
  .bwl-btn { border-top:1px solid rgba(245,240,230,.1); }
  .bwl-contact-links { flex-direction:column; gap:12px; }
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
            <img src="/braids-with-love.png" alt="Braids With Love" />
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

        {/* services */}
        <section className="bwl-services">
          <p className="bwl-services-eyebrow">What's Coming</p>
          <h2 className="bwl-services-title">Services & Pricing</h2>
          <div className="bwl-services-grid">
            {SERVICES.map((cat) => (
              <div key={cat.category} className="bwl-cat-block">
                <p className="bwl-cat-title">{cat.category}</p>
                {cat.items.map((item) => (
                  <div key={item.name} className="bwl-service-row">
                    <span className="bwl-service-name">{item.name}</span>
                    <span className="bwl-service-right">
                      {"time" in item && <span className="bwl-service-time">{item.time}</span>}
                      <span className="bwl-service-price">{item.price}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* policies */}
        <section className="bwl-policies">
          <p className="bwl-policies-title">Good to Know</p>
          <div className="bwl-policy-list">
            {[
              "Hair is provided for every style. You may bring your own hair for certain styles as listed.",
              "Must arrive with hair blown out. Shampoo service is not provided.",
              "Services will be fixed free of charge within 14 days. After 14 days, a fee applies.",
              "No oils, grease, or products in your hair before your appointment.",
              "Squeeze-ins carry a $70 additional fee.",
              "Norfolk location only.",
              "Payment via CashApp: $BraidswithLove or $DannyNicole23.",
            ].map((policy, i) => (
              <div key={i} className="bwl-policy">
                <span className="bwl-policy-mark">✦</span>
                <span>{policy}</span>
              </div>
            ))}
          </div>
        </section>

        {/* contact */}
        <div className="bwl-contact">
          <span className="bwl-contact-label">Find Us</span>
          <div className="bwl-contact-links">
            <a href="https://instagram.com/Braidswithlove" target="_blank" rel="noopener noreferrer" className="bwl-contact-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
              @Braidswithlove
            </a>
            <a href="tel:7577768666" className="bwl-contact-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.5 1.18 2 2 0 012.5.5h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l.86-.86a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              757-776-8666
            </a>
            <a href="mailto:Briadswithlove757@gmail.com" className="bwl-contact-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              Briadswithlove757@gmail.com
            </a>
          </div>
        </div>

        <footer className="bwl-foot">
          © {new Date().getFullYear()} OutsYde · Culture meets commerce
        </footer>
      </div>
    </>
  );
}