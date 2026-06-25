// app/shop/lotus/wholesale/page.tsx
// Lotus House Blends — Wholesale Inquiry
//
// WHERE THIS GOES:
//   Create folder:  outsyde-web/app/shop/lotus/wholesale/
//   Put this file inside as:  page.tsx
//   Loads at:  localhost:3000/shop/lotus/wholesale
//
// EMAIL SETUP (free, ~2 min):
//   1. Go to https://web3forms.com  →  enter lotushouseblends25@gmail.com  →  they email you an Access Key
//   2. Paste that key below where it says WEB3FORMS_ACCESS_KEY
//   3. To also send to info@goutsyde.com: in the Web3Forms dashboard, add it as a CC recipient
//   Until a real key is added, the form shows the thank-you but won't actually email.
//
// $25 VENDOR FEE: deferred to the Stripe/backend phase (see {/* FEE HOOK */} below).

"use client";

import { useState } from "react";

const WEB3FORMS_ACCESS_KEY = "YOUR_ACCESS_KEY_HERE"; // <-- paste your key here

const PRODUCTS = [
  "Rise & Bloom Tea Boxes (Morning Blend) — Qty 5",
  "Rise & Bloom Herbal Cones (Morning Blend) — Qty 5",
  "Rise & Bloom Loose Herbs (Morning Blend)",
  "Heart Flow Tea Boxes (Midday Blend) — Qty 5",
  "Heart Flow Herbal Cones (Midday Blend) — Qty 5",
  "Heart Flow Loose Herbs (Midday Blend)",
  "Dream Temple Loose Herbs (Night Blend)",
  "Dream Temple Herbal Cones (Night Blend) — Qty 5",
  "Dream Temple Tea Boxes (Night Blend) — Qty 5",
];

const BUSINESS_TYPES = [
  "Retailer / Boutique",
  "Spa / Wellness Center",
  "Salon",
  "Online Store",
  "Distributor / Wholesaler",
  "Café / Lounge",
  "Other",
];

const ORDER_VOLUMES = [
  "$100 – $500",
  "$500 – $1,000",
  "$1,000 – $5,000",
  "$5,000 – $10,000",
  "$10,000+",
];

export default function LotusWholesale() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const formData = new FormData(e.currentTarget);
    formData.append("access_key", WEB3FORMS_ACCESS_KEY);
    formData.append("subject", "New Wholesale Inquiry — Lotus House Blends");
    formData.append("from_name", "Lotus House Blends Wholesale");

    // {/* FEE HOOK */} — Stripe phase: charge vendor $25 to Outsyde on successful submit.

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setStatus(data.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root{
  --outsyde-black:#000000; --outsyde-gold:#E8B930;
  --lhb-parchment:#F2EBD9; --lhb-cream:#EDE3CC; --lhb-lavender:#7B6BAF; --lhb-lavender-muted:#E8E4F2;
  --lhb-sage:#4A6741; --lhb-brown-dark:#2A1E0E; --lhb-brown-light:#C8A882; --lhb-moss:#1E3020;
  --lhb-text-dark:#1A1208; --lhb-text-mid:#4A3820; --lhb-text-muted:#7A6A50;
}
.lhb-ws{font-family:'Jost',sans-serif;background:var(--lhb-parchment);color:var(--lhb-text-dark);min-height:100vh;}
.outsyde-nav{background:var(--outsyde-black);padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.nav-logo{display:flex;align-items:center;gap:.75rem;text-decoration:none;}
.nav-y{font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:600;color:var(--outsyde-gold);line-height:1;}
.nav-wordmark{font-size:.65rem;letter-spacing:.28em;color:#888;font-weight:300;}
.nav-back{color:#888;font-size:.72rem;letter-spacing:.12em;text-decoration:none;font-weight:300;transition:color .2s;}
.nav-back:hover{color:var(--outsyde-gold);}

.ws-hero{background:var(--lhb-moss);color:var(--lhb-parchment);padding:4rem 2rem 3rem;text-align:center;}
.ws-hero .eyebrow{font-size:.62rem;letter-spacing:.3em;text-transform:uppercase;color:var(--lhb-brown-light);margin-bottom:1rem;}
.ws-hero h1{font-family:'Cormorant Garamond',serif;font-size:clamp(2.6rem,5vw,4rem);font-weight:300;line-height:1.05;}
.ws-hero p{font-size:.88rem;color:rgba(242,235,217,.62);margin-top:1rem;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.7;font-weight:300;}

.ws-body{max-width:680px;margin:0 auto;padding:3.5rem 1.5rem 5rem;}
.field{margin-bottom:1.5rem;}
.field label{display:block;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--lhb-text-mid);font-weight:500;margin-bottom:.5rem;}
.field .req{color:var(--lhb-lavender);}
.field input, .field select, .field textarea{
  width:100%;background:#fff;border:1px solid rgba(90,62,30,.25);padding:.85rem 1rem;
  font-family:'Jost',sans-serif;font-size:.9rem;color:var(--lhb-text-dark);transition:border-color .18s;
}
.field input:focus, .field select:focus, .field textarea:focus{outline:none;border-color:var(--lhb-lavender);}
.field textarea{min-height:110px;resize:vertical;}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}

.products-block{background:var(--lhb-cream);border:1px solid rgba(90,62,30,.15);padding:1.5rem;margin-bottom:1.5rem;}
.products-block .blk-label{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--lhb-text-mid);font-weight:500;margin-bottom:1rem;display:block;}
.checkrow{display:flex;align-items:center;gap:.7rem;padding:.5rem 0;font-size:.85rem;color:var(--lhb-text-dark);font-weight:300;cursor:pointer;}
.checkrow input{width:17px;height:17px;accent-color:var(--lhb-moss);flex-shrink:0;cursor:pointer;}

.submit-btn{width:100%;background:var(--lhb-moss);color:var(--lhb-parchment);border:none;padding:1.1rem;font-family:'Jost',sans-serif;font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;font-weight:500;cursor:pointer;transition:background .2s;margin-top:1rem;}
.submit-btn:hover{background:var(--lhb-brown-dark);}
.submit-btn:disabled{opacity:.6;cursor:not-allowed;}

.note{font-size:.74rem;color:var(--lhb-text-muted);font-style:italic;margin-top:1.25rem;text-align:center;line-height:1.6;}

.success-card, .error-card{text-align:center;padding:3rem 1.5rem;}
.success-card h2{font-family:'Cormorant Garamond',serif;font-size:2.4rem;font-weight:400;color:var(--lhb-moss);margin-bottom:1rem;}
.success-card p, .error-card p{font-size:.95rem;color:var(--lhb-text-mid);font-weight:300;line-height:1.8;max-width:420px;margin:0 auto 1.5rem;}
.error-card h2{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:400;color:#8A3030;margin-bottom:1rem;}
.link-btn{display:inline-block;background:var(--lhb-lavender);color:#fff;padding:.8rem 1.8rem;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;}

.ws-footer{background:var(--lhb-brown-dark);color:rgba(200,168,130,.5);padding:2rem 2.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;font-size:.7rem;}
.ws-footer a{color:var(--lhb-brown-light);text-decoration:underline;text-underline-offset:3px;}
.ws-footer a:hover{color:var(--lhb-parchment);}

@media(max-width:560px){ .field-row{grid-template-columns:1fr;} .outsyde-nav{padding:0 1.25rem;} }
`,
        }}
      />

      <div className="lhb-ws">
        <nav className="outsyde-nav">
          <a href="/" className="nav-logo">
            <span className="nav-y">Y</span>
            <span className="nav-wordmark">OUTSYDE</span>
          </a>
          <a href="/shop/lotus" className="nav-back">← Back to Lotus House Blends</a>
        </nav>

        <header className="ws-hero">
          <div className="eyebrow">Lotus House Blends</div>
          <h1>Wholesale Inquiry</h1>
          <p>Retailers, spas, and wellness practitioners — tell us about your business and the blends you&rsquo;re interested in carrying.</p>
        </header>

        <div className="ws-body">
          {status === "success" ? (
            <div className="success-card">
              <h2>Thank you</h2>
              <p>Your wholesale inquiry has been received. The Lotus House Blends team will review it and reach out to you soon.</p>
              <a href="/shop/lotus" className="link-btn">Back to Shop</a>
            </div>
          ) : status === "error" ? (
            <div className="error-card">
              <h2>Something went wrong</h2>
              <p>We couldn&rsquo;t submit your inquiry. Please try again, or email us directly at lotushouseblends25@gmail.com.</p>
              <button className="link-btn" onClick={() => setStatus("idle")} style={{ border: "none", cursor: "pointer" }}>Try Again</button>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="field">
                <label>Company Name <span className="req">*</span></label>
                <input type="text" name="Company Name" required />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>First Name <span className="req">*</span></label>
                  <input type="text" name="First Name" required />
                </div>
                <div className="field">
                  <label>Last Name <span className="req">*</span></label>
                  <input type="text" name="Last Name" required />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Phone Number <span className="req">*</span></label>
                  <input type="tel" name="Phone Number" required />
                </div>
                <div className="field">
                  <label>Email <span className="req">*</span></label>
                  <input type="email" name="Email" required />
                </div>
              </div>

              <div className="field">
                <label>Business Address <span className="req">*</span></label>
                <input type="text" name="Business Address" required />
              </div>

              <div className="field">
                <label>Business Type</label>
                <select name="Business Type" defaultValue="">
                  <option value="" disabled>Select one…</option>
                  {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="field">
                <label>If Other, please describe</label>
                <input type="text" name="Other Business Type" />
              </div>

              <div className="products-block">
                <span className="blk-label">Products Interested In <span className="req">*</span></span>
                {PRODUCTS.map((p) => (
                  <label className="checkrow" key={p}>
                    <input type="checkbox" name={`Product: ${p}`} value="Yes" />
                    {p}
                  </label>
                ))}
              </div>

              <div className="field">
                <label>Estimated Order Volume <span className="req">*</span></label>
                <select name="Estimated Order Volume" defaultValue="" required>
                  <option value="" disabled>Select one…</option>
                  {ORDER_VOLUMES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Message / Notes</label>
                <textarea name="Message" />
              </div>

              <button className="submit-btn" type="submit" disabled={status === "submitting"}>
                {status === "submitting" ? "Submitting…" : "Submit Wholesale Inquiry"}
              </button>

              <p className="note">
                Submissions are sent to Lotus House Blends. By submitting, you agree to be contacted regarding your wholesale inquiry.
              </p>
            </form>
          )}
        </div>

        <footer className="ws-footer">
          <span>© 2026 Lotus House Blends · Sold via Go Outsyde Platform</span>
          <span><a href="/shop/lotus">Back to Lotus House Blends</a></span>
        </footer>
      </div>
    </>
  );
}