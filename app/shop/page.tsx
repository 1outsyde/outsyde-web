// app/shop/page.tsx
// OutsYde Marketplace — the multi-vendor hub.
// Shows all vendor storefronts as cards; each "Enter Store" links into that vendor.
// Pure front-end. Built to look full with 2 vendors and scale to many.
//
// Vendor card images expected in /public:
//   lifestyle-ritual.jpg (Lotus), dialux-hero-clean.jpg (Dia Lux), royal-elite-card.jpg (Royal Elite),
//   omega-card.jpg (Omega Lifestyle)

"use client";

import { useEffect, useState } from "react";
import { getCart, subscribe, type CartItem } from "@/lib/cart";

type Vendor = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  href: string;
  image: string;
};

const VENDORS: Vendor[] = [
  {
    id: "lotus",
    name: "Lotus House Blends",
    tagline: "Herbal botanical blends for ritual, rest, and renewal.",
    category: "Botanical Wellness",
    href: "/shop/lotus",
    image: "/lifestyle-ritual.jpg",
  },
  {
    id: "dialux",
    name: "Dia Lux Kollection",
    tagline: "100% raw hair bundles in straight, wavy, and curly textures.",
    category: "Luxury Hair",
    href: "/shop/dialux",
    image: "/dialux-hero-clean.jpg",
  },
  {
    id: "royalelite",
    name: "Royal Elite Moving",
    tagline: "Professional residential & commercial moving across Hampton Roads.",
    category: "Moving & Services",
    href: "/shop/royalelite",
    image: "/royal-elite-card.jpg",
  },
  {
    id: "omega",
    name: "Omega Lifestyle",
    tagline: "Strength training gear and apparel for the everyday lifter.",
    category: "Fitness & Lifestyle",
    href: "/shop/omega",
    image: "/omega-card.jpg",
  },
];

export default function Marketplace() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(getCart());
    const unsub = subscribe(() => setCart(getCart()));
    return () => { unsub(); };
  }, []);

  const count = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');

.mkt-root *, .mkt-root *::before, .mkt-root *::after { box-sizing:border-box; margin:0; padding:0; }
.mkt-root{
  --mk-black:#000000; --mk-gold:#E8B930; --mk-cream:#F5F0E6; --mk-emerald:#1A3C34;
  --mk-line:rgba(245,240,230,.12); --mk-muted:rgba(245,240,230,.6);
  --mk-display:'Bebas Neue',Impact,sans-serif; --mk-sans:'Hanken Grotesk',system-ui,sans-serif;
  --mk-serif:'Cormorant Garamond',Georgia,serif;
  font-family:var(--mk-sans); background:var(--mk-black); color:var(--mk-cream); min-height:100vh;
}
.mkt-root a{text-decoration:none;color:inherit;}

/* nav */
.mkt-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:18px 48px;background:rgba(0,0,0,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--mk-line);}
.mkt-logo{display:flex;align-items:center;gap:11px;}
.mkt-logo img{width:38px;height:38px;object-fit:contain;}
.mkt-logo-word{font-family:var(--mk-display);font-size:19px;letter-spacing:.14em;color:var(--mk-cream);text-transform:uppercase;}
.mkt-nav-right{display:flex;align-items:center;gap:24px;}
.mkt-nav-link{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mk-muted);transition:color .2s;}.mkt-nav-link:hover{color:var(--mk-gold);}
.mkt-cart{position:relative;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mk-cream);}
.mkt-cart-count{position:absolute;top:-9px;right:-13px;background:var(--mk-gold);color:#000;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;}

/* hero */
.mkt-hero{text-align:center;padding:90px 24px 60px;border-bottom:1px solid var(--mk-line);}
.mkt-hero-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--mk-gold);margin-bottom:18px;}
.mkt-hero h1{font-family:var(--mk-display);font-size:clamp(48px,8vw,92px);font-weight:400;letter-spacing:.04em;line-height:.95;text-transform:uppercase;color:var(--mk-cream);margin-bottom:18px;}
.mkt-hero p{font-size:14px;font-weight:300;letter-spacing:.03em;color:var(--mk-muted);max-width:560px;margin:0 auto;line-height:1.7;}

/* vendor grid */
.mkt-wrap{max-width:1180px;margin:0 auto;padding:64px 48px 90px;}
.mkt-sec-label{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--mk-muted);text-align:center;margin-bottom:40px;}
.mkt-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:30px;}
.mkt-card{position:relative;border:1px solid var(--mk-line);border-radius:6px;overflow:hidden;min-height:440px;display:flex;flex-direction:column;justify-content:flex-end;transition:transform .3s,border-color .3s;}
.mkt-card:hover{transform:translateY(-4px);border-color:rgba(232,185,48,.4);}
.mkt-card-bg{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform .6s ease;}
.mkt-card:hover .mkt-card-bg{transform:scale(1.05);}
.mkt-card-veil{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.45) 50%,rgba(0,0,0,.15) 100%);}
.mkt-card-body{position:relative;z-index:2;padding:34px 32px;}
.mkt-card-cat{display:inline-block;font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--mk-gold);border:1px solid rgba(232,185,48,.35);padding:4px 11px;border-radius:2px;margin-bottom:16px;}
.mkt-card-name{font-family:var(--mk-serif);font-size:2.1rem;font-weight:500;color:var(--mk-cream);line-height:1.05;margin-bottom:10px;}
.mkt-card-tag{font-size:13px;font-weight:300;line-height:1.6;color:rgba(245,240,230,.78);margin-bottom:22px;max-width:340px;}
.mkt-enter{display:inline-flex;align-items:center;gap:9px;background:var(--mk-gold);color:#000;padding:12px 24px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;transition:background .2s,gap .2s;}
.mkt-card:hover .mkt-enter{gap:14px;}

/* coming soon / partner card */
.mkt-card.soon{display:flex;align-items:center;justify-content:center;text-align:center;background:linear-gradient(160deg,#0c1c18,#060e0c);border-style:dashed;min-height:440px;}
.mkt-soon-inner{padding:32px;}
.mkt-soon-inner h3{font-family:var(--mk-display);font-size:26px;letter-spacing:.06em;color:var(--mk-cream);margin-bottom:10px;}
.mkt-soon-inner p{font-size:13px;font-weight:300;color:var(--mk-muted);line-height:1.6;max-width:260px;margin:0 auto 20px;}
.mkt-soon-cta{display:inline-block;border:1px solid rgba(245,240,230,.4);color:var(--mk-cream);padding:11px 22px;border-radius:3px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;transition:border-color .2s,color .2s;}
.mkt-soon-cta:hover{border-color:var(--mk-gold);color:var(--mk-gold);}

/* footer */
.mkt-foot{border-top:1px solid var(--mk-line);padding:40px 48px;text-align:center;font-size:11px;letter-spacing:.1em;color:var(--mk-muted);}

@media (max-width:860px){
  .mkt-grid{grid-template-columns:1fr;}
  .mkt-nav{padding:14px 22px;}
  .mkt-wrap{padding:48px 22px 72px;}
}
`,
        }}
      />

      <div className="mkt-root">
        {/* nav */}
        <nav className="mkt-nav">
          <a href="/" className="mkt-logo">
            <img src="/outsyde-y-transparent.png" alt="OutsYde" />
            <span className="mkt-logo-word">OutsYde</span>
          </a>
          <div className="mkt-nav-right">
            <a href="/" className="mkt-nav-link">Home</a>
            <a href="/cart" className="mkt-cart">
              Cart
              {count > 0 && <span className="mkt-cart-count">{count}</span>}
            </a>
          </div>
        </nav>

        {/* hero */}
        <header className="mkt-hero">
          <p className="mkt-hero-eyebrow">The OutsYde Marketplace</p>
          <h1>Shop Local Brands</h1>
          <p>
            Discover and shop from a curated collection of local brands and makers —
            all in one place, one cart, one checkout.
          </p>
        </header>

        {/* vendor cards */}
        <main className="mkt-wrap">
          <p className="mkt-sec-label">Our Brands</p>
          <div className="mkt-grid">
            {VENDORS.map((v) => (
              <a className="mkt-card" key={v.id} href={v.href}>
                <div className="mkt-card-bg" style={{ backgroundImage: `url('${v.image}')` }} />
                <div className="mkt-card-veil" />
                <div className="mkt-card-body">
                  <span className="mkt-card-cat">{v.category}</span>
                  <h2 className="mkt-card-name">{v.name}</h2>
                  <p className="mkt-card-tag">{v.tagline}</p>
                  <span className="mkt-enter">Enter Store →</span>
                </div>
              </a>
            ))}

            {/* partner / coming-soon card — invites new vendors, keeps the grid full */}
            <div className="mkt-card soon">
              <div className="mkt-soon-inner">
                <h3>Your Brand Here</h3>
                <p>More local brands are joining OutsYde. Want to sell with us?</p>
                <a href="/business-inquiry" className="mkt-soon-cta">Partner With Us →</a>
              </div>
            </div>
          </div>
        </main>

        <footer className="mkt-foot">
          © {new Date().getFullYear()} OutsYde · Culture meets commerce
        </footer>
      </div>
    </>
  );
}