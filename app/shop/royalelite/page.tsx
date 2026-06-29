// app/shop/royalelite/page.tsx
// Royal Elite Moving — services vendor storefront (booking / free-estimate flow).
// Reskinned off the Dia Lux structure in royal purple + gold.
//
// IMPORTANT: This vendor does NOT use cart/checkout. The current payment route
// (app/api/create-payment-intent/route.ts) is single-vendor (Lotus only), so a
// move is captured via a booking request instead. The $100 deposit is collected
// off-platform by the vendor after they confirm date availability.
// The nav cart badge is READ-ONLY (shows existing Lotus/Dia Lux items only).
//
// EMAIL: submissions POST to /api/royal-elite-estimate, which sends the lead via
// Resend to BOTH info@goutsyde.com AND Bprovisionproperties@yahoo.com in one call.
// (Migrated off Web3Forms — no access key needed anymore.)

"use client";

import { useEffect, useState } from "react";
import { getCart, subscribe, type CartItem } from "@/lib/cart";

type FormState = {
  name: string;
  email: string;
  phone: string;
  moveDate: string;
  moveType: string;
  homeSize: string;
  fromAddress: string;
  toAddress: string;
  floor: string;
  stops: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "", email: "", phone: "", moveDate: "", moveType: "Standard Move",
  homeSize: "1 Bedroom", fromAddress: "", toAddress: "",
  floor: "Ground / 1st floor", stops: "", notes: "",
};

const MOVE_TYPES = ["Standard Move", "Light Move (flat $250)", "Long-Distance Move", "Packing Only"];
const HOME_SIZES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "4 Bedroom"];
const FLOORS = ["Ground / 1st floor", "2nd floor", "3rd floor or above"];

export default function RoyalEliteStore() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  useEffect(() => {
    setCart(getCart());
    const unsub = subscribe(() => setCart(getCart()));
    return () => { unsub(); };
  }, []);

  const count = cart.reduce((n, i) => n + i.qty, 0);

  function update(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/royal-elite-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          moveDate: form.moveDate,
          moveType: form.moveType,
          homeSize: form.homeSize,
          fromAddress: form.fromAddress,
          toAddress: form.toAddress,
          floor: form.floor,
          stops: form.stops,
          notes: form.notes,
        }),
      });
      const data = (await res.json()) as { success?: boolean };
      if (res.ok && data.success) {
        setStatus("ok");
        setForm(EMPTY_FORM);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');

.re-root *, .re-root *::before, .re-root *::after { box-sizing:border-box; margin:0; padding:0; }
.re-root{
  --re-purple:#5B2A86; --re-purple-deep:#3A1A5C; --re-purple-ink:#1E0E33;
  --re-gold:#C9A227; --re-gold-light:#E2C361; --re-cream:#F5F0E6;
  --re-line:rgba(245,240,230,.14); --re-muted:rgba(245,240,230,.62);
  --re-serif:'Cormorant Garamond',Georgia,serif; --re-display:'Bebas Neue',Impact,sans-serif;
  --re-sans:'Hanken Grotesk',system-ui,sans-serif;
  font-family:var(--re-sans); background:var(--re-purple-ink); color:var(--re-cream); min-height:100vh;
}
.re-root a{text-decoration:none;color:inherit;}

/* top bar */
.re-top{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:rgba(30,14,51,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--re-line);}
.re-back{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--re-muted);transition:color .2s;}
.re-back:hover{color:var(--re-cream);}
.re-brand{font-family:var(--re-serif);font-size:22px;letter-spacing:.04em;color:var(--re-cream);font-weight:600;}
.re-brand span{color:var(--re-gold-light);}
.re-cart-btn{position:relative;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--re-cream);background:transparent;border:1px solid var(--re-line);padding:9px 18px;border-radius:2px;}
.re-cart-count{position:absolute;top:-8px;right:-8px;background:var(--re-gold);color:#1E0E33;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;}

/* hero */
.re-hero{position:relative;padding:96px 24px 80px;text-align:center;overflow:hidden;
  background:radial-gradient(120% 90% at 50% -10%,rgba(201,162,39,.18),transparent 55%),linear-gradient(160deg,#2A1247 0%,#4A1E73 48%,#5B2A86 100%);
  border-bottom:1px solid var(--re-line);}
.re-hero-eyebrow{font-size:12px;font-weight:600;letter-spacing:.32em;text-transform:uppercase;color:var(--re-gold-light);margin-bottom:20px;}
.re-hero h1{font-family:var(--re-serif);font-size:clamp(42px,7vw,80px);font-weight:700;line-height:1.02;letter-spacing:.01em;color:var(--re-cream);margin-bottom:8px;}
.re-hero h1 em{font-style:italic;color:var(--re-gold-light);}
.re-hero-tag{font-family:var(--re-serif);font-style:italic;font-size:clamp(18px,2.4vw,24px);color:var(--re-gold-light);margin-bottom:22px;}
.re-hero p{font-size:14px;font-weight:300;letter-spacing:.02em;color:rgba(245,240,230,.82);max-width:540px;margin:0 auto 30px;line-height:1.7;}
.re-hero-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;}
.re-btn-gold{background:var(--re-gold);color:#1E0E33;padding:14px 28px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;transition:background .2s;}
.re-btn-gold:hover{background:var(--re-gold-light);}
.re-btn-ghost{border:1px solid rgba(245,240,230,.5);color:var(--re-cream);padding:14px 28px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;transition:border-color .2s,color .2s;}
.re-btn-ghost:hover{border-color:var(--re-gold);color:var(--re-gold-light);}

/* trust strip */
.re-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 28px;padding:22px 24px;background:rgba(0,0,0,.22);border-bottom:1px solid var(--re-line);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--re-muted);}
.re-trust b{color:var(--re-gold-light);font-weight:600;}

/* section shell */
.re-wrap{max-width:1120px;margin:0 auto;padding:72px 40px;}
.re-sec-head{text-align:center;margin-bottom:44px;}
.re-sec-head h2{font-family:var(--re-display);font-size:clamp(30px,4.5vw,46px);letter-spacing:.05em;color:var(--re-cream);font-weight:400;}
.re-sec-head p{font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--re-muted);margin-top:8px;}

/* services + areas */
.re-info{background:rgba(0,0,0,.25);border-top:1px solid var(--re-line);border-bottom:1px solid var(--re-line);}
.re-info-grid{max-width:1120px;margin:0 auto;padding:56px 40px;display:grid;grid-template-columns:1fr 1fr;gap:48px;}
.re-info-col h4{font-family:var(--re-display);font-size:22px;letter-spacing:.06em;color:var(--re-gold-light);margin-bottom:18px;font-weight:400;}
.re-info-col ul{list-style:none;}
.re-info-col li{font-size:13.5px;font-weight:300;line-height:2;color:rgba(245,240,230,.78);display:flex;gap:10px;}
.re-info-col li::before{content:"✦";color:var(--re-gold);font-size:11px;line-height:2;}

/* pricing cards */
.re-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.re-card{background:linear-gradient(165deg,#3A1A5C,#26123F);border:1px solid var(--re-line);border-radius:6px;padding:30px 26px;display:flex;flex-direction:column;transition:border-color .25s,transform .25s;}
.re-card:hover{border-color:rgba(201,162,39,.45);transform:translateY(-3px);}
.re-card-tag{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--re-gold-light);margin-bottom:12px;}
.re-card h3{font-family:var(--re-serif);font-size:1.5rem;font-weight:600;color:var(--re-cream);margin-bottom:6px;}
.re-price{font-family:var(--re-serif);font-size:2.6rem;font-weight:700;color:var(--re-gold-light);line-height:1;margin:6px 0 4px;}
.re-price small{font-size:.8rem;color:var(--re-muted);font-weight:400;letter-spacing:.02em;}
.re-card-sub{font-size:12px;letter-spacing:.04em;color:var(--re-muted);margin-bottom:14px;}
.re-card p{font-size:13px;font-weight:300;line-height:1.6;color:rgba(245,240,230,.72);}
.re-card .re-extra{margin-top:auto;padding-top:16px;font-size:12px;color:var(--re-gold-light);letter-spacing:.02em;}

.re-surcharge{margin-top:26px;text-align:center;font-size:12.5px;letter-spacing:.04em;color:var(--re-muted);line-height:1.9;}
.re-surcharge b{color:var(--re-cream);font-weight:600;}

/* pricing tables */
.re-tables{display:grid;grid-template-columns:1fr 1fr;gap:28px;}
.re-table-card{background:linear-gradient(165deg,#3A1A5C,#26123F);border:1px solid var(--re-line);border-radius:6px;overflow:hidden;}
.re-table-card h3{font-family:var(--re-serif);font-size:1.45rem;font-weight:600;color:var(--re-cream);padding:22px 24px 6px;}
.re-table-card .re-th-note{font-size:12px;font-weight:300;color:var(--re-muted);padding:0 24px 16px;}
.re-table{width:100%;border-collapse:collapse;}
.re-table th,.re-table td{text-align:left;padding:11px 24px;font-size:13.5px;border-top:1px solid var(--re-line);}
.re-table th{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--re-muted);font-weight:600;}
.re-table td:last-child,.re-table th:last-child{text-align:right;color:var(--re-gold-light);font-weight:600;}
.re-table-foot{padding:14px 24px;font-size:12px;color:var(--re-gold-light);border-top:1px solid var(--re-line);}

/* long distance */
.re-ld{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:760px;margin:0 auto;}
.re-ld-card{background:linear-gradient(165deg,#3A1A5C,#26123F);border:1px solid var(--re-line);border-radius:6px;padding:26px;text-align:center;}
.re-ld-card .re-ld-size{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--re-gold-light);margin-bottom:10px;}
.re-ld-card .re-ld-price{font-family:var(--re-serif);font-size:2rem;font-weight:700;color:var(--re-cream);}
.re-ld-note{text-align:center;font-size:12.5px;color:var(--re-muted);margin-top:20px;line-height:1.8;}

/* booking form */
.re-book{background:radial-gradient(120% 90% at 50% 0%,rgba(201,162,39,.12),transparent 50%),linear-gradient(180deg,#2A1247,#1E0E33);border-top:1px solid var(--re-line);}
.re-book-inner{max-width:760px;margin:0 auto;padding:76px 40px;}
.re-form{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:8px;}
.re-field{display:flex;flex-direction:column;gap:7px;}
.re-field.full{grid-column:1 / -1;}
.re-field label{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--re-muted);}
.re-field input,.re-field select,.re-field textarea{background:rgba(0,0,0,.3);color:var(--re-cream);border:1px solid var(--re-line);border-radius:4px;padding:12px 13px;font-family:var(--re-sans);font-size:14px;width:100%;}
.re-field input:focus,.re-field select:focus,.re-field textarea:focus{outline:none;border-color:var(--re-gold);}
.re-field textarea{resize:vertical;min-height:90px;}
.re-field select option{background:#2A1247;color:var(--re-cream);}
.re-submit{grid-column:1 / -1;background:var(--re-gold);color:#1E0E33;border:none;border-radius:4px;padding:16px;font-family:var(--re-sans);font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;transition:background .2s;}
.re-submit:hover{background:var(--re-gold-light);}
.re-submit:disabled{opacity:.6;cursor:not-allowed;}
.re-form-note{grid-column:1 / -1;font-size:12px;color:var(--re-muted);line-height:1.7;text-align:center;}
.re-status{grid-column:1 / -1;text-align:center;font-size:13.5px;padding:10px;border-radius:4px;}
.re-status.ok{background:rgba(201,162,39,.16);color:var(--re-gold-light);border:1px solid rgba(201,162,39,.4);}
.re-status.error{background:rgba(180,60,60,.18);color:#f0b9b9;border:1px solid rgba(180,60,60,.4);}

/* policies */
.re-policy-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;}
.re-policy h4{font-family:var(--re-display);font-size:18px;letter-spacing:.05em;color:var(--re-gold-light);margin-bottom:10px;font-weight:400;}
.re-policy p{font-size:12.5px;font-weight:300;line-height:1.7;color:rgba(245,240,230,.62);}

/* footer */
.re-foot{padding:42px 40px;text-align:center;font-size:11px;letter-spacing:.1em;color:var(--re-muted);border-top:1px solid var(--re-line);}
.re-foot a{color:var(--re-gold-light);}

@media (max-width:880px){
  .re-cards{grid-template-columns:1fr;}
  .re-tables{grid-template-columns:1fr;}
  .re-ld{grid-template-columns:1fr;}
  .re-info-grid{grid-template-columns:1fr;gap:32px;}
  .re-policy-grid{grid-template-columns:1fr;gap:22px;}
  .re-form{grid-template-columns:1fr;}
  .re-top{padding:14px 22px;}
  .re-wrap{padding:54px 22px;}
}
`,
        }}
      />

      <div className="re-root">
        {/* top bar */}
        <div className="re-top">
          <a href="/shop" className="re-back">← Marketplace</a>
          <span className="re-brand">Royal <span>Elite</span> Moving</span>
          <a href="/cart" className="re-cart-btn">
            Cart
            {count > 0 && <span className="re-cart-count">{count}</span>}
          </a>
        </div>

        {/* hero */}
        <section className="re-hero">
          <p className="re-hero-eyebrow">Hampton Roads &amp; the Eastern Shore</p>
          <h1>Moving Doesn&rsquo;t Have to Be <em>Stressful.</em></h1>
          <p className="re-hero-tag">Your Move. Our Priority.</p>
          <p>
            Professional, reliable residential &amp; commercial moving designed to make
            your move smooth, efficient, and worry-free. Let Royal Elite handle the heavy lifting.
          </p>
          <div className="re-hero-cta">
            <a href="#book" className="re-btn-gold">Get a Free Estimate</a>
            <a href="tel:+17579444925" className="re-btn-ghost">Call 757-944-4925</a>
          </div>
        </section>

        {/* trust strip */}
        <div className="re-trust">
          <span><b>Residential</b> &amp; Commercial</span>
          <span><b>In-Town</b> &amp; Out-of-Town</span>
          <span>Careful <b>Handling</b></span>
          <span><b>Same-Day</b> &amp; Scheduled</span>
        </div>

        {/* services + areas */}
        <div className="re-info">
          <div className="re-info-grid">
            <div className="re-info-col">
              <h4>Services Offered</h4>
              <ul>
                <li>Residential &amp; Commercial Moving</li>
                <li>In-Town &amp; Out-of-Town Moves</li>
                <li>Loading &amp; Unloading</li>
                <li>Careful Handling of Furniture &amp; Belongings</li>
                <li>Same-Day &amp; Scheduled Moves (call to confirm availability)</li>
                <li>Professional Packing Services</li>
              </ul>
            </div>
            <div className="re-info-col">
              <h4>Service Areas</h4>
              <ul>
                <li>Chesapeake</li>
                <li>Norfolk</li>
                <li>Portsmouth</li>
                <li>Suffolk</li>
                <li>Hampton Roads &amp; surrounding areas</li>
                <li>Long-distance moves up to 250 miles</li>
              </ul>
            </div>
          </div>
        </div>

        {/* standard moving */}
        <section className="re-wrap">
          <div className="re-sec-head">
            <h2>Standard Moving Services</h2>
            <p>Crew, truck &amp; labor · first 3 hours included</p>
          </div>
          <div className="re-cards">
            <div className="re-card">
              <span className="re-card-tag">Weekday · Mon&ndash;Thurs</span>
              <h3>Standard Move</h3>
              <div className="re-price">$300<small> / first 3 hrs</small></div>
              <p className="re-card-sub">Professional crew &amp; truck included.</p>
              <p>Loading, transport, and unloading of your household with careful handling start to finish.</p>
              <div className="re-extra">+$50 / additional hour</div>
            </div>
            <div className="re-card">
              <span className="re-card-tag">Weekend · Fri&ndash;Sun</span>
              <h3>Standard Move</h3>
              <div className="re-price">$350<small> / first 3 hrs</small></div>
              <p className="re-card-sub">Professional crew &amp; truck included.</p>
              <p>Same full-service move, scheduled for weekend convenience when you need it most.</p>
              <div className="re-extra">+$50 / additional hour</div>
            </div>
            <div className="re-card">
              <span className="re-card-tag">Quick &amp; Light</span>
              <h3>Light Move</h3>
              <div className="re-price">$250<small> flat</small></div>
              <p className="re-card-sub">Bed, couch, dressers &amp; light furniture.</p>
              <p>Ideal for quick moves, downsizing, or storage runs. No kitchens or full-room packing.</p>
              <div className="re-extra">Flat rate · no hourly</div>
            </div>
          </div>
          <p className="re-surcharge">
            <b>3rd floor or above</b> +$100 &nbsp;·&nbsp; <b>Same-day pack &amp; move</b> (before 5 PM) +$100
            &nbsp;·&nbsp; <b>Over 50 miles</b> +$25 per 10 miles &nbsp;·&nbsp; <b>Additional stops</b> quoted as needed
          </p>
        </section>

        {/* packing */}
        <section className="re-wrap" style={{ paddingTop: 0 }}>
          <div className="re-sec-head">
            <h2>Packing Services</h2>
            <p>Performed 24&ndash;48 hrs before your move · same-day available</p>
          </div>
          <div className="re-tables">
            <div className="re-table-card">
              <h3>Simple Pack</h3>
              <p className="re-th-note">Basic household items, minimal fragiles. Boxes &amp; room labeling included.</p>
              <table className="re-table">
                <thead>
                  <tr><th>Home Size</th><th>First 3 Hours</th></tr>
                </thead>
                <tbody>
                  <tr><td>1 Bedroom</td><td>$200</td></tr>
                  <tr><td>2 Bedroom</td><td>$300</td></tr>
                  <tr><td>3 Bedroom</td><td>$400</td></tr>
                  <tr><td>4 Bedroom</td><td>$500</td></tr>
                </tbody>
              </table>
              <div className="re-table-foot">+$20 / additional hour · inventory checklist included</div>
            </div>
            <div className="re-table-card">
              <h3>Full Pack</h3>
              <p className="re-th-note">Kitchen, fragiles, closets &amp; full prep. All materials &amp; fragile wrapping included.</p>
              <table className="re-table">
                <thead>
                  <tr><th>Home Size</th><th>First 3 Hours</th></tr>
                </thead>
                <tbody>
                  <tr><td>1 Bedroom</td><td>$300</td></tr>
                  <tr><td>2 Bedroom</td><td>$450</td></tr>
                  <tr><td>3 Bedroom</td><td>$600</td></tr>
                  <tr><td>4 Bedroom</td><td>$750</td></tr>
                </tbody>
              </table>
              <div className="re-table-foot">+$20 / additional hour · full inventory checklist</div>
            </div>
          </div>
        </section>

        {/* long distance */}
        <section className="re-wrap" style={{ paddingTop: 0 }}>
          <div className="re-sec-head">
            <h2>Long-Distance Moves</h2>
            <p>Up to 250 miles included · fuel &amp; labor included</p>
          </div>
          <div className="re-ld">
            <div className="re-ld-card">
              <div className="re-ld-size">1 Bedroom</div>
              <div className="re-ld-price">$1,700</div>
            </div>
            <div className="re-ld-card">
              <div className="re-ld-size">2 Bedroom</div>
              <div className="re-ld-price">$2,500</div>
            </div>
            <div className="re-ld-card">
              <div className="re-ld-size">3 Bedroom</div>
              <div className="re-ld-price">$3,200</div>
            </div>
          </div>
          <p className="re-ld-note">
            Starting prices, subject to final assessment. Additional miles beyond 250 and packing
            are quoted separately unless bundled. Request a custom quote below.
          </p>
        </section>

        {/* booking form */}
        <section className="re-book" id="book">
          <div className="re-book-inner">
            <div className="re-sec-head">
              <h2>Request Your Free Estimate</h2>
              <p>72-hour minimum notice · we&rsquo;ll confirm availability &amp; deposit</p>
            </div>
            <form className="re-form" onSubmit={handleSubmit}>
              <div className="re-field">
                <label>Full Name</label>
                <input value={form.name} onChange={update("name")} required />
              </div>
              <div className="re-field">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={update("phone")} required />
              </div>
              <div className="re-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={update("email")} required />
              </div>
              <div className="re-field">
                <label>Preferred Move Date</label>
                <input type="date" value={form.moveDate} onChange={update("moveDate")} required />
              </div>
              <div className="re-field">
                <label>Move Type</label>
                <select value={form.moveType} onChange={update("moveType")}>
                  {MOVE_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="re-field">
                <label>Home Size</label>
                <select value={form.homeSize} onChange={update("homeSize")}>
                  {HOME_SIZES.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="re-field full">
                <label>Pickup Address</label>
                <input value={form.fromAddress} onChange={update("fromAddress")} required />
              </div>
              <div className="re-field full">
                <label>Drop-off Address</label>
                <input value={form.toAddress} onChange={update("toAddress")} required />
              </div>
              <div className="re-field">
                <label>Floor (pickup or drop-off)</label>
                <select value={form.floor} onChange={update("floor")}>
                  {FLOORS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="re-field">
                <label>Additional Stops</label>
                <input value={form.stops} onChange={update("stops")} placeholder="Optional" />
              </div>
              <div className="re-field full">
                <label>Notes / Special Items</label>
                <textarea value={form.notes} onChange={update("notes")} placeholder="Heavy items, stairs, fragile pieces, timing, etc." />
              </div>

              {status === "ok" && (
                <div className="re-status ok">
                  Request received. Royal Elite Moving will reach out shortly to confirm your date and deposit.
                </div>
              )}
              {status === "error" && (
                <div className="re-status error">
                  Something went wrong sending your request. Please call 757-944-4925 or try again.
                </div>
              )}

              <button className="re-submit" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Request Free Estimate"}
              </button>
              <p className="re-form-note">
                A $100 non-refundable deposit secures your date, collected after we confirm availability.
                Final balance is due on completion. No payment is taken on this form.
              </p>
            </form>
          </div>
        </section>

        {/* policies */}
        <section className="re-wrap">
          <div className="re-policy-grid">
            <div className="re-policy">
              <h4>Booking &amp; Notice</h4>
              <p>We require a minimum of 72 hours notice prior to your requested move date. A free walk-through assessment is conducted before service to confirm scope, time, and resources.</p>
            </div>
            <div className="re-policy">
              <h4>Deposit &amp; Payment</h4>
              <p>A $100 non-refundable deposit secures your date and applies to your total. Out-of-town &amp; commercial moves require 30&ndash;50% upfront. Balance due on completion by cash, check, or card.</p>
            </div>
            <div className="re-policy">
              <h4>Care &amp; Cancellation</h4>
              <p>We handle your belongings with reasonable care and diligence. Please pack and label valuables and fragile items appropriately. Client cancellations forfeit the deposit; weather reschedules are accommodated.</p>
            </div>
          </div>
        </section>

        <div className="re-foot">
          © {new Date().getFullYear()} Royal Elite Moving™ · Sold on OutsYde ·{" "}
          <a href="mailto:Bprovisionproperties@yahoo.com">Bprovisionproperties@yahoo.com</a> · 757-944-4925
        </div>
      </div>
    </>
  );
}