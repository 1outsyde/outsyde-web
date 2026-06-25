// app/shop/dialux/page.tsx
// Dia Lux Kollection — luxury raw hair bundles storefront
// Mirrors the Lotus House Blends store structure, re-skinned in black/silver.
// Wired into the shared multi-vendor cart (lib/cart.ts) with vendorId: "dialux".
//
// Images expected in /public:
//   dialux-hero-clean.jpg, dialux-straight.jpg, dialux-wavy.jpg,
//   dialux-curly.jpg, dialux-curly-single.jpg
//
// Single bundles: per-inch pricing 12"–32".
// Bundle deals: fixed lengths, fixed price (no inch selector).

"use client";

import { useEffect, useState } from "react";
import { addToCart, getCart, setQty, removeFromCart, subscribe, type CartItem } from "@/lib/cart";

// ── Per-inch price table for single bundles (12"–32") ──
const LENGTH_PRICES: Record<number, number> = {
  12: 125, 14: 135, 16: 145, 18: 155, 20: 165, 22: 175,
  24: 185, 26: 195, 28: 205, 30: 225, 32: 235,
};
const LENGTHS = Object.keys(LENGTH_PRICES).map(Number);

type SingleProduct = {
  id: string;
  name: string;
  texture: string;
  blurb: string;
  image: string;
};

const SINGLES: SingleProduct[] = [
  {
    id: "dlx-straight",
    name: "Filipino Raw Straight",
    texture: "Straight",
    blurb: "Sleek, bone-straight density with natural shine. Colors, styles, and heat-treats beautifully.",
    image: "/dialux-straight.jpg",
  },
  {
    id: "dlx-wavy",
    name: "Vietnamese Raw Wavy",
    texture: "Wavy",
    blurb: "Soft, full-bodied waves with effortless movement and a luxurious drape.",
    image: "/dialux-wavy.jpg",
  },
  {
    id: "dlx-curly",
    name: "Raw Burmese Curly",
    texture: "Curly",
    blurb: "Defined, springy curls with rich texture and fullness from root to tip.",
    image: "/dialux-curly.jpg",
  },
];

type DealProduct = {
  id: string;
  name: string;
  lengths: string;
  price: number;
  blurb: string;
  image: string;
};

const DEALS: DealProduct[] = [
  {
    id: "dlx-deal-375",
    name: "3-Bundle Deal · 18\u2033 / 20\u2033 / 22\u2033",
    lengths: "18\u2033 · 20\u2033 · 22\u2033",
    price: 375,
    blurb: "Three raw bundles, ready to install. Fixed-length set — our most popular starter length.",
    image: "/dialux-straight.jpg",
  },
  {
    id: "dlx-deal-415",
    name: "3-Bundle Deal · 20\u2033 / 22\u2033 / 24\u2033",
    lengths: "20\u2033 · 22\u2033 · 24\u2033",
    price: 415,
    blurb: "Three raw bundles in longer lengths for full, dramatic volume and length.",
    image: "/dialux-wavy.jpg",
  },
];

export default function DiaLuxStore() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // selected length per single product id
  const [selLen, setSelLen] = useState<Record<string, number>>({
    "dlx-straight": 12,
    "dlx-wavy": 12,
    "dlx-curly": 12,
  });

  useEffect(() => {
    setCart(getCart());
    const unsub = subscribe(() => setCart(getCart()));
    return () => { unsub(); };
  }, []);

  const count = cart.reduce((n, i) => n + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const addSingle = (p: SingleProduct) => {
    const len = selLen[p.id];
    const price = LENGTH_PRICES[len];
    addToCart({
      id: `${p.id}-${len}`,
      name: `${p.name} — ${len}\u2033`,
      price,
      image: p.image,
      vendor: "Dia Lux Kollection",
      vendorId: "dialux",
    });
    setDrawerOpen(true);
  };

  const addDeal = (d: DealProduct) => {
    addToCart({
      id: d.id,
      name: d.name,
      price: d.price,
      image: d.image,
      vendor: "Dia Lux Kollection",
      vendorId: "dialux",
    });
    setDrawerOpen(true);
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');

.dlx-root *, .dlx-root *::before, .dlx-root *::after { box-sizing:border-box; margin:0; padding:0; }
.dlx-root{
  --dlx-black:#0A0A0A; --dlx-ink:#000000; --dlx-silver:#C9CACC; --dlx-silver-soft:#8C8E92;
  --dlx-cream:#F4F2EE; --dlx-line:rgba(201,202,204,.16); --dlx-gold:#E8B930;
  --dlx-serif:'Cormorant Garamond',Georgia,serif; --dlx-display:'Bebas Neue',Impact,sans-serif;
  --dlx-sans:'Hanken Grotesk',system-ui,sans-serif;
  font-family:var(--dlx-sans); background:var(--dlx-black); color:var(--dlx-cream); min-height:100vh;
}
.dlx-root a{text-decoration:none;color:inherit;}

/* top bar */
.dlx-top{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:rgba(10,10,10,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--dlx-line);}
.dlx-back{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--dlx-silver-soft);transition:color .2s;}
.dlx-back:hover{color:var(--dlx-cream);}
.dlx-brand{font-family:var(--dlx-serif);font-size:22px;letter-spacing:.04em;color:var(--dlx-cream);font-weight:500;}
.dlx-cart-btn{position:relative;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dlx-cream);background:transparent;border:1px solid var(--dlx-line);padding:9px 18px;border-radius:2px;cursor:pointer;transition:border-color .2s;}
.dlx-cart-btn:hover{border-color:var(--dlx-silver);}
.dlx-cart-count{position:absolute;top:-8px;right:-8px;background:var(--dlx-gold);color:#000;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;}

/* hero */
.dlx-hero{position:relative;height:62vh;min-height:420px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;}
.dlx-hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;}
.dlx-hero-veil{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.55),rgba(0,0,0,.72));}
.dlx-hero-inner{position:relative;z-index:2;padding:0 24px;}
.dlx-hero-eyebrow{font-size:12px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#fff;margin-bottom:18px;text-shadow:0 1px 16px rgba(0,0,0,.7);}
.dlx-hero-title{font-family:var(--dlx-serif);font-size:clamp(50px,8.5vw,92px);font-weight:600;line-height:1;letter-spacing:.02em;color:#fff;margin-bottom:16px;text-shadow:0 2px 30px rgba(0,0,0,.6);}
.dlx-hero-sub{font-size:13.5px;font-weight:300;letter-spacing:.04em;color:rgba(244,242,238,.85);max-width:520px;margin:0 auto;line-height:1.7;text-shadow:0 1px 14px rgba(0,0,0,.6);}

/* section */
.dlx-wrap{max-width:1180px;margin:0 auto;padding:72px 40px;}
.dlx-sec-head{text-align:center;margin-bottom:48px;}
.dlx-sec-head h2{font-family:var(--dlx-display);font-size:clamp(30px,4.5vw,46px);letter-spacing:.06em;color:var(--dlx-cream);font-weight:400;}
.dlx-sec-head p{font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--dlx-silver-soft);margin-top:8px;}

/* product grid */
.dlx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;}
.dlx-card{background:#0F0F0F;border:1px solid var(--dlx-line);border-radius:4px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .25s,transform .25s;}
.dlx-card:hover{border-color:rgba(201,202,204,.35);transform:translateY(-3px);}
.dlx-card-img{aspect-ratio:3/4;background:#000 center/cover no-repeat;}
.dlx-card-body{padding:22px 22px 24px;display:flex;flex-direction:column;flex:1;}
.dlx-tex{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--dlx-gold);margin-bottom:8px;}
.dlx-name{font-family:var(--dlx-serif);font-size:1.5rem;font-weight:500;color:var(--dlx-cream);line-height:1.1;margin-bottom:10px;}
.dlx-blurb{font-size:12.5px;font-weight:300;line-height:1.6;color:rgba(244,242,238,.6);margin-bottom:18px;flex:1;}
.dlx-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;}
.dlx-len-label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--dlx-silver-soft);}
.dlx-select{background:#000;color:var(--dlx-cream);border:1px solid var(--dlx-line);border-radius:3px;padding:8px 10px;font-family:var(--dlx-sans);font-size:13px;cursor:pointer;}
.dlx-select:focus{outline:none;border-color:var(--dlx-silver);}
.dlx-price{font-family:var(--dlx-serif);font-size:1.6rem;font-weight:500;color:var(--dlx-cream);line-height:1;}
.dlx-deal-lengths{font-size:11px;letter-spacing:.12em;color:var(--dlx-silver);margin-bottom:14px;}
.dlx-add{width:100%;background:var(--dlx-cream);color:#000;border:none;border-radius:3px;padding:13px;font-family:var(--dlx-sans);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .2s;}
.dlx-add:hover{background:#fff;}

/* deals tint */
.dlx-card.deal{background:linear-gradient(160deg,#121212,#0A0A0A);}

/* info strip */
.dlx-info{border-top:1px solid var(--dlx-line);border-bottom:1px solid var(--dlx-line);background:#070707;}
.dlx-info-grid{max-width:1180px;margin:0 auto;padding:54px 40px;display:grid;grid-template-columns:repeat(3,1fr);gap:36px;}
.dlx-info-col h4{font-family:var(--dlx-display);font-size:20px;letter-spacing:.06em;color:var(--dlx-cream);margin-bottom:12px;font-weight:400;}
.dlx-info-col p{font-size:12.5px;font-weight:300;line-height:1.7;color:rgba(244,242,238,.58);}

/* footer */
.dlx-foot{padding:40px;text-align:center;font-size:11px;letter-spacing:.1em;color:var(--dlx-silver-soft);border-top:1px solid var(--dlx-line);}
.dlx-foot a{color:var(--dlx-silver);}

/* cart drawer */
.dlx-drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;opacity:0;pointer-events:none;transition:opacity .3s;}
.dlx-drawer-overlay.open{opacity:1;pointer-events:auto;}
.dlx-drawer{position:fixed;top:0;right:0;height:100%;width:380px;max-width:90vw;background:#0C0C0C;border-left:1px solid var(--dlx-line);z-index:101;transform:translateX(100%);transition:transform .32s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;}
.dlx-drawer.open{transform:translateX(0);}
.dlx-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:22px;border-bottom:1px solid var(--dlx-line);}
.dlx-drawer-head h3{font-family:var(--dlx-display);font-size:22px;letter-spacing:.06em;color:var(--dlx-cream);font-weight:400;}
.dlx-drawer-close{background:none;border:none;color:var(--dlx-silver);font-size:24px;cursor:pointer;line-height:1;}
.dlx-drawer-body{flex:1;overflow-y:auto;padding:14px 22px;}
.dlx-empty{text-align:center;color:var(--dlx-silver-soft);font-size:13px;padding:48px 0;}
.dlx-line{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--dlx-line);}
.dlx-line-img{width:56px;height:72px;border-radius:3px;background:#000 center/cover no-repeat;flex-shrink:0;}
.dlx-line-info{flex:1;min-width:0;}
.dlx-line-name{font-size:13px;color:var(--dlx-cream);line-height:1.3;margin-bottom:3px;}
.dlx-line-price{font-size:11.5px;color:var(--dlx-silver-soft);}
.dlx-qty{display:flex;align-items:center;gap:10px;margin-top:8px;}
.dlx-qty button{width:24px;height:24px;border:1px solid var(--dlx-line);background:#000;color:var(--dlx-cream);border-radius:3px;cursor:pointer;font-size:14px;line-height:1;}
.dlx-qty span{font-size:13px;color:var(--dlx-cream);min-width:18px;text-align:center;}
.dlx-remove{background:none;border:none;color:var(--dlx-silver-soft);font-size:10px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;margin-left:auto;}
.dlx-remove:hover{color:#fff;}
.dlx-drawer-foot{padding:22px;border-top:1px solid var(--dlx-line);}
.dlx-subtotal{display:flex;justify-content:space-between;font-size:13px;color:var(--dlx-cream);margin-bottom:16px;}
.dlx-subtotal strong{font-family:var(--dlx-serif);font-size:1.3rem;}
.dlx-checkout{display:block;width:100%;background:var(--dlx-gold);color:#000;text-align:center;padding:14px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;border:none;}
.dlx-checkout:hover{background:#f2c835;}

@media (max-width:900px){
  .dlx-grid{grid-template-columns:1fr 1fr;}
  .dlx-info-grid{grid-template-columns:1fr;gap:26px;}
  .dlx-top{padding:14px 22px;}
  .dlx-wrap{padding:54px 22px;}
}
@media (max-width:560px){
  .dlx-grid{grid-template-columns:1fr;}
}
`,
        }}
      />

      <div className="dlx-root">
        {/* top bar */}
        <div className="dlx-top">
          <a href="/shop" className="dlx-back">← Marketplace</a>
          <span className="dlx-brand">Dia Lux Kollection</span>
          <button className="dlx-cart-btn" onClick={() => setDrawerOpen(true)}>
            Cart
            {count > 0 && <span className="dlx-cart-count">{count}</span>}
          </button>
        </div>

        {/* hero */}
        <section className="dlx-hero">
          <div className="dlx-hero-bg" style={{ backgroundImage: "url('/dialux-hero-clean.jpg')" }} />
          <div className="dlx-hero-veil" />
          <div className="dlx-hero-inner">
            <p className="dlx-hero-eyebrow">Luxury Raw Bundles</p>
            <h1 className="dlx-hero-title">Dia Lux Kollection</h1>
            <p className="dlx-hero-sub">
              100% raw hair in straight, wavy, and curly textures — crafted for a
              flawless install, minimal shedding, and a finish that lasts.
            </p>
          </div>
        </section>

        {/* single bundles */}
        <section className="dlx-wrap">
          <div className="dlx-sec-head">
            <h2>Single Bundles</h2>
            <p>Choose your length · 12&Prime;–32&Prime;</p>
          </div>
          <div className="dlx-grid">
            {SINGLES.map((p) => {
              const len = selLen[p.id];
              const price = LENGTH_PRICES[len];
              return (
                <div className="dlx-card" key={p.id}>
                  <div className="dlx-card-img" style={{ backgroundImage: `url('${p.image}')` }} />
                  <div className="dlx-card-body">
                    <span className="dlx-tex">{p.texture}</span>
                    <h3 className="dlx-name">{p.name}</h3>
                    <p className="dlx-blurb">{p.blurb}</p>
                    <div className="dlx-row">
                      <span className="dlx-len-label">Length</span>
                      <select
                        className="dlx-select"
                        value={len}
                        onChange={(e) =>
                          setSelLen((s) => ({ ...s, [p.id]: Number(e.target.value) }))
                        }
                      >
                        {LENGTHS.map((L) => (
                          <option key={L} value={L}>{L}&Prime;</option>
                        ))}
                      </select>
                    </div>
                    <div className="dlx-row">
                      <span className="dlx-price">${price.toFixed(2)}</span>
                    </div>
                    <button className="dlx-add" onClick={() => addSingle(p)}>
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* bundle deals */}
        <section className="dlx-wrap" style={{ paddingTop: 0 }}>
          <div className="dlx-sec-head">
            <h2>Bundle Deals</h2>
            <p>Fixed-length 3-bundle sets</p>
          </div>
          <div className="dlx-grid" style={{ gridTemplateColumns: "repeat(2,1fr)", maxWidth: 760, margin: "0 auto" }}>
            {DEALS.map((d) => (
              <div className="dlx-card deal" key={d.id}>
                <div className="dlx-card-img" style={{ backgroundImage: `url('${d.image}')` }} />
                <div className="dlx-card-body">
                  <span className="dlx-tex">3-Bundle Set</span>
                  <h3 className="dlx-name">{d.name}</h3>
                  <p className="dlx-blurb">{d.blurb}</p>
                  <p className="dlx-deal-lengths">Includes: {d.lengths}</p>
                  <div className="dlx-row">
                    <span className="dlx-price">${d.price.toFixed(2)}</span>
                  </div>
                  <button className="dlx-add" onClick={() => addDeal(d)}>
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* info strip: product / shipping / returns */}
        <div className="dlx-info">
          <div className="dlx-info-grid">
            <div className="dlx-info-col">
              <h4>Product Info</h4>
              <p>
                Each bundle is carefully sourced for consistency, durability, and a
                seamless blend. Raw hair can be colored, styled, and heat-treated, and
                maintains its smoothness wash after wash.
              </p>
            </div>
            <div className="dlx-info-col">
              <h4>Shipping</h4>
              <p>
                Orders are processed within 1–3 business days. Delivery takes
                approximately 5–7 business days depending on location. A tracking number
                is emailed once your order ships. Times may vary during sales and holidays.
              </p>
            </div>
            <div className="dlx-info-col">
              <h4>Returns</h4>
              <p>
                Due to the nature of the product, all sales are final — no returns or
                exchanges once opened or used. Damaged or incorrect orders: contact us
                within 48 hours of delivery with your order number and photos.
              </p>
            </div>
          </div>
        </div>

        <div className="dlx-foot">
          © {new Date().getFullYear()} Dia Lux Kollection · Sold on OutsYde ·{" "}
          <a href="mailto:dialuxkollecionn@gmail.com">dialuxkollecionn@gmail.com</a>
        </div>

        {/* cart drawer */}
        <div
          className={`dlx-drawer-overlay${drawerOpen ? " open" : ""}`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside className={`dlx-drawer${drawerOpen ? " open" : ""}`} aria-label="Shopping cart">
          <div className="dlx-drawer-head">
            <h3>Your Cart</h3>
            <button className="dlx-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close cart">×</button>
          </div>
          <div className="dlx-drawer-body">
            {cart.length === 0 ? (
              <p className="dlx-empty">Your cart is empty.</p>
            ) : (
              cart.map((i) => (
                <div className="dlx-line" key={i.id}>
                  <div className="dlx-line-img" style={{ backgroundImage: `url('${i.image}')` }} />
                  <div className="dlx-line-info">
                    <div className="dlx-line-name">{i.name}</div>
                    <div className="dlx-line-price">${i.price.toFixed(2)}</div>
                    <div className="dlx-qty">
                      <button onClick={() => setQty(i.id, Math.max(1, i.qty - 1))}>−</button>
                      <span>{i.qty}</span>
                      <button onClick={() => setQty(i.id, i.qty + 1)}>+</button>
                      <button className="dlx-remove" onClick={() => removeFromCart(i.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className="dlx-drawer-foot">
              <div className="dlx-subtotal">
                <span>Subtotal</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              <a href="/cart" className="dlx-checkout" style={{ display: "block" }}>
                Go to Checkout
              </a>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}