// app/shop/lotus/page.tsx
// Lotus House Blends — vendor storefront page.

"use client";

import { useEffect, useState } from "react";
import { addToCart, getCart, setQty, removeFromCart, subscribe, type CartItem } from "@/lib/cart";

type Filter = "all" | "morning" | "midday" | "night" | "tea" | "herbs" | "prerolls";

export default function LotusHouseBlends() {
  const [active, setActive] = useState<Filter>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    setCart(getCart());
    return subscribe(() => setCart(getCart()));
  }, []);
  const count = cart.reduce((n, i) => n + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const addItem = (p: { id: string; name: string; price: number; image: string }) => {
    addToCart({ ...p, vendor: "Lotus House Blends", vendorId: "lotus" });
    setDrawerOpen(true);
  };

  const groupHidden = (blend: string) =>
    (["morning", "midday", "night"] as Filter[]).includes(active) && active !== (blend as Filter);

  const cardDisplay = (type: string) =>
    (["tea", "herbs", "prerolls"] as Filter[]).includes(active) && active !== (type as Filter)
      ? "none"
      : "block";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root{
  --outsyde-black:#000000; --outsyde-gold:#E8B930; --outsyde-emerald:#1A3C34;
  --lhb-parchment:#F2EBD9; --lhb-cream:#EDE3CC; --lhb-lavender:#7B6BAF; --lhb-lavender-light:#C5BDDF; --lhb-lavender-muted:#E8E4F2;
  --lhb-sage:#4A6741; --lhb-sage-dark:#2E4A2A; --lhb-gold:#B8831A;
  --lhb-brown-dark:#2A1E0E; --lhb-brown-mid:#5A3E1E; --lhb-brown-light:#C8A882; --lhb-moss:#1E3020;
  --lhb-text-dark:#1A1208; --lhb-text-mid:#4A3820; --lhb-text-muted:#7A6A50;
}
html{scroll-behavior:smooth;}
.lhb-root{font-family:'Jost',sans-serif;background:var(--outsyde-emerald);color:var(--lhb-text-dark);overflow-x:hidden;}

.outsyde-nav{background:var(--outsyde-black);padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.nav-logo{display:flex;align-items:center;gap:.75rem;text-decoration:none;}
.nav-y{font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:600;color:var(--outsyde-gold);line-height:1;}
.nav-wordmark{font-size:.65rem;letter-spacing:.28em;color:#555;font-weight:300;}
.nav-back{display:flex;align-items:center;gap:.5rem;color:#555;font-size:.72rem;letter-spacing:.12em;text-decoration:none;font-weight:300;transition:color .2s;}
.nav-back:hover{color:var(--outsyde-gold);}
.nav-back svg{width:13px;height:13px;}

.page{background:var(--lhb-parchment);}

.hero{position:relative;min-height:100vh;display:grid;grid-template-columns:55% 45%;overflow:hidden;background:var(--lhb-moss);}
.hero-left{position:relative;overflow:hidden;}
.hero-left img.hero-bg{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}
.hero-left-overlay{position:absolute;inset:0;background:linear-gradient(to right,rgba(30,48,32,.35) 0%,rgba(30,48,32,.7) 100%);}
.hero-right{display:flex;flex-direction:column;justify-content:center;padding:5rem 4rem 5rem 3.5rem;position:relative;z-index:2;}
.hero-logo-wrap{margin-bottom:1.5rem;}
.hero-logo-wrap img{width:320px;height:auto;mix-blend-mode:screen;}
.hero-eyebrow{font-size:.62rem;letter-spacing:.32em;color:var(--lhb-lavender-light);font-weight:300;text-transform:uppercase;margin-bottom:1.25rem;}
.hero-title{font-family:'Cormorant Garamond',serif;font-size:clamp(3rem,4.5vw,5rem);font-weight:300;color:#F2EBD9;line-height:1.05;margin-bottom:.5rem;}
.hero-title em{font-style:italic;color:var(--lhb-lavender-light);}
.hero-rule{width:50px;height:1px;background:var(--lhb-lavender);margin:1.75rem 0;}
.hero-body{font-size:.9rem;line-height:1.95;color:rgba(194,212,180,.85);font-weight:300;max-width:380px;margin-bottom:2.5rem;}
.hero-ctas{display:flex;gap:1rem;flex-wrap:wrap;}
.btn-primary{background:var(--lhb-lavender);color:#fff;border:none;padding:.85rem 2rem;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;font-weight:400;cursor:pointer;transition:background .2s,transform .15s;text-decoration:none;display:inline-block;}
.btn-primary:hover{background:#6558A0;transform:translateY(-1px);}
.btn-ghost{background:transparent;color:#F2EBD9;border:1px solid rgba(194,189,223,.35);padding:.85rem 2rem;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;font-weight:400;cursor:pointer;transition:border-color .2s,color .2s;text-decoration:none;display:inline-block;}
.btn-ghost:hover{border-color:var(--lhb-lavender-light);color:var(--lhb-lavender-light);}
.hero-secondary-img{position:absolute;bottom:0;left:0;width:42%;height:38%;overflow:hidden;border-top:3px solid var(--lhb-moss);border-right:3px solid var(--lhb-moss);}
.hero-secondary-img img{width:100%;height:100%;object-fit:cover;object-position:center 20%;}

.brand-bar{background:var(--lhb-brown-dark);padding:1.25rem 5rem;display:flex;align-items:center;justify-content:space-between;}
.brand-bar-left{display:flex;align-items:center;gap:1.5rem;}
.brand-bar-logo img{width:78px;height:78px;object-fit:contain;mix-blend-mode:screen;}
.brand-bar-name{font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:500;color:#F2EBD9;letter-spacing:.06em;display:block;}
.brand-bar-sub{font-size:.6rem;letter-spacing:.22em;color:var(--lhb-brown-light);font-weight:300;text-transform:uppercase;display:block;margin-top:.1rem;}
.brand-bar-badge{font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--lhb-brown-light);border:1px solid rgba(200,168,130,.3);padding:.45rem 1.1rem;font-weight:300;}

.about-section{background:var(--lhb-parchment);display:grid;grid-template-columns:1fr 1fr;min-height:600px;}
.about-imagery{position:relative;overflow:hidden;background:var(--lhb-sage-dark);}
.about-imagery img.about-main{width:100%;height:100%;object-fit:cover;object-position:center 15%;display:block;}
.about-imagery-tag{position:absolute;bottom:2.5rem;right:-1px;background:var(--lhb-lavender);color:#fff;padding:1.25rem 1.75rem;max-width:220px;font-family:'Cormorant Garamond',serif;font-size:1rem;font-style:italic;font-weight:300;line-height:1.6;}
.about-content{padding:6rem 5rem;display:flex;flex-direction:column;justify-content:center;}
.section-label{font-size:.62rem;letter-spacing:.3em;text-transform:uppercase;font-weight:400;margin-bottom:1.25rem;}
.label-sage{color:var(--lhb-sage);} .label-lavender{color:var(--lhb-lavender);} .label-gold{color:var(--lhb-gold);}
.about-content h2{font-family:'Cormorant Garamond',serif;font-size:clamp(2.2rem,3vw,3.2rem);font-weight:400;color:var(--lhb-brown-dark);line-height:1.15;margin-bottom:1.75rem;}
.about-content h2 em{font-style:italic;color:var(--lhb-sage-dark);}
.about-content p{font-size:.92rem;line-height:1.95;color:var(--lhb-text-mid);font-weight:300;margin-bottom:1.1rem;max-width:440px;}
.ritual-pillars{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-top:2rem;border-top:1px solid rgba(74,103,65,.2);}
.pillar{padding:1.5rem .5rem .5rem;border-right:1px solid rgba(74,103,65,.15);}
.pillar:last-child{border-right:none;}
.pillar-name{font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:500;color:var(--lhb-brown-dark);display:block;margin-bottom:.2rem;}
.pillar-sub{font-size:.68rem;color:var(--lhb-text-muted);font-weight:300;letter-spacing:.04em;}

.shop-section{background:var(--lhb-cream);padding:6rem 5rem;}
.shop-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:3rem;padding-bottom:2rem;border-bottom:1px solid rgba(74,103,65,.15);}
.shop-header-left h2{font-family:'Cormorant Garamond',serif;font-size:clamp(2.5rem,3.5vw,3.5rem);font-weight:400;color:var(--lhb-brown-dark);line-height:1.05;margin-top:.75rem;}
.shop-header-left h2 em{font-style:italic;color:var(--lhb-sage-dark);}
.filter-row{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:3.5rem;}
.ftab{background:transparent;border:1px solid rgba(90,62,30,.2);color:var(--lhb-text-muted);padding:.55rem 1.25rem;font-family:'Jost',sans-serif;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;font-weight:400;cursor:pointer;transition:all .18s;}
.ftab:hover{border-color:var(--lhb-lavender);color:var(--lhb-lavender);}
.ftab.active{background:var(--lhb-moss);border-color:var(--lhb-moss);color:#F2EBD9;}
.blend-group{margin-bottom:4.5rem;}
.blend-group.hidden{display:none;}
.blend-group-hdr{display:flex;align-items:baseline;gap:1.25rem;margin-bottom:2rem;padding-bottom:.9rem;border-bottom:1px solid rgba(90,62,30,.12);}
.time-badge{font-size:.58rem;letter-spacing:.22em;text-transform:uppercase;font-weight:400;padding:.28rem .8rem;}
.badge-morning{background:#FFF3E0;color:#8A5010;} .badge-midday{background:#EAF2E8;color:#2A5C28;} .badge-night{background:#EDE7F6;color:#4A2E8A;}
.blend-group-title{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:400;color:var(--lhb-brown-dark);}
.blend-group-sub{font-size:.75rem;color:var(--lhb-text-muted);font-weight:300;margin-left:auto;font-style:italic;}
.product-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;}
.pcard{background:var(--lhb-parchment);display:block;text-decoration:none;cursor:pointer;transition:transform .25s,box-shadow .25s;position:relative;overflow:hidden;}
.pcard:hover{transform:translateY(-5px);box-shadow:0 24px 60px rgba(26,18,8,.13);}
.pcard-img{height:280px;overflow:hidden;position:relative;background:#e8e0d0;display:flex;align-items:center;justify-content:center;}
.pcard-img img{width:100%;height:100%;object-fit:contain;object-position:center;padding:1.5rem;transition:transform .4s;}
.pcard:hover .pcard-img img{transform:scale(1.06);}
.ptype-tag{position:absolute;top:.9rem;left:.9rem;font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;padding:.28rem .7rem;background:rgba(242,235,217,.93);color:var(--lhb-text-mid);font-weight:400;}
.pcard-body{padding:1.4rem 1.4rem 1.6rem;}
.pcard-name{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:500;color:var(--lhb-brown-dark);line-height:1.25;margin-bottom:.45rem;}
.pcard-desc{font-size:.76rem;color:var(--lhb-text-muted);line-height:1.75;font-weight:300;margin-bottom:1.15rem;}
.pcard-footer{display:flex;align-items:center;justify-content:space-between;padding-top:.9rem;border-top:1px solid rgba(90,62,30,.1);}
.pcard-price{font-family:'Cormorant Garamond',serif;font-size:1.35rem;font-weight:500;color:var(--lhb-brown-dark);display:block;line-height:1;}
.pcard-bundle{font-size:.66rem;color:var(--lhb-sage);font-weight:400;margin-top:.15rem;display:block;letter-spacing:.03em;}
.pcard-add{background:var(--lhb-moss);border:none;color:#F2EBD9;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.3rem;font-weight:300;transition:background .18s,transform .12s;flex-shrink:0;}
.pcard-add:hover{background:var(--lhb-sage-dark);transform:scale(1.08);}
.pcard::after{content:'View Product';position:absolute;bottom:0;left:0;right:0;background:var(--lhb-lavender);color:#fff;text-align:center;padding:.7rem;font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;transform:translateY(100%);transition:transform .22s;}
.pcard:hover::after{transform:translateY(0);}

.ritual-steps{background:var(--lhb-moss);padding:5rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:2.5rem;}
.rstep{border:1px solid rgba(194,189,223,.12);padding:2rem 1.5rem;text-align:center;}
.rstep-num{font-family:'Cormorant Garamond',serif;font-size:2.8rem;font-weight:300;color:rgba(194,189,223,.18);display:block;line-height:1;margin-bottom:.6rem;}
.rstep h3{font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:400;color:#F2EBD9;margin-bottom:.6rem;}
.rstep p{font-size:.78rem;color:rgba(194,212,180,.65);line-height:1.85;font-weight:300;}

.lifestyle-strip{display:grid;grid-template-columns:1fr 1fr;min-height:420px;overflow:hidden;}
.ls-img{overflow:hidden;position:relative;}
.ls-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s;}
.ls-img:hover img{transform:scale(1.03);}
.ls-img-overlay{position:absolute;inset:0;background:rgba(30,48,32,.4);display:flex;align-items:flex-end;padding:2rem;}
.ls-caption{font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-style:italic;color:rgba(242,235,217,.9);font-weight:300;line-height:1.5;max-width:240px;}

.wholesale-bar{background:var(--lhb-lavender-muted);padding:3rem 5rem;display:flex;align-items:center;justify-content:space-between;gap:2rem;}
.wholesale-bar h3{font-family:'Cormorant Garamond',serif;font-size:1.75rem;font-weight:400;color:var(--lhb-brown-dark);margin-bottom:.3rem;}
.wholesale-bar p{font-size:.83rem;color:var(--lhb-text-mid);font-weight:300;}
.btn-moss{background:var(--lhb-moss);color:#F2EBD9;border:none;padding:1rem 2.25rem;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;font-weight:400;cursor:pointer;transition:background .2s;text-decoration:none;display:inline-block;white-space:nowrap;}
.btn-moss:hover{background:var(--lhb-sage-dark);}

.vendor-footer{background:var(--lhb-brown-dark);padding:2.5rem 5rem;display:flex;align-items:center;justify-content:space-between;gap:2rem;}
.vf-logo img{width:64px;height:64px;object-fit:contain;mix-blend-mode:screen;}
.vf-copy{font-size:.68rem;color:rgba(200,168,130,.45);font-weight:300;letter-spacing:.04em;}
.vf-links{display:flex;gap:2rem;}
.vf-links a{font-size:.68rem;color:rgba(200,168,130,.5);text-decoration:underline;text-underline-offset:3px;letter-spacing:.05em;font-weight:300;transition:color .2s;cursor:pointer;}
.vf-links a:hover{color:var(--lhb-brown-light);}
.outsyde-bar{background:#000;padding:1.1rem 5rem;display:flex;align-items:center;justify-content:space-between;}
.outsyde-bar span{font-size:.62rem;color:#333;letter-spacing:.1em;font-weight:300;}
.outsyde-bar a{font-size:.62rem;color:var(--outsyde-gold);letter-spacing:.1em;font-weight:300;text-decoration:none;}

.toast{position:fixed;bottom:2rem;right:2rem;background:var(--lhb-moss);color:#F2EBD9;padding:.9rem 1.4rem;font-size:.78rem;letter-spacing:.04em;font-weight:300;z-index:999;display:flex;align-items:center;gap:.7rem;transform:translateY(80px);opacity:0;transition:transform .28s,opacity .28s;}
.toast.show{transform:translateY(0);opacity:1;}
.toast-dot{width:5px;height:5px;border-radius:50%;background:var(--lhb-lavender-light);flex-shrink:0;}

.nav-right{display:flex;align-items:center;gap:1.5rem;}
.cart-btn{position:relative;display:flex;align-items:center;gap:.45rem;background:transparent;border:none;color:#fff;cursor:pointer;font-family:'Jost',sans-serif;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;}
.cart-btn:hover{color:var(--outsyde-gold);}
.cart-count{background:var(--outsyde-gold);color:#000;border-radius:999px;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:600;padding:0 5px;}
.cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;opacity:0;pointer-events:none;transition:opacity .25s;}
.cart-overlay.open{opacity:1;pointer-events:auto;}
.cart-drawer{position:fixed;top:0;right:0;height:100%;width:380px;max-width:90vw;background:var(--lhb-parchment);z-index:201;transform:translateX(100%);transition:transform .3s ease;display:flex;flex-direction:column;box-shadow:-8px 0 40px rgba(0,0,0,.2);}
.cart-drawer.open{transform:translateX(0);}
.cart-drawer-hdr{display:flex;align-items:center;justify-content:space-between;padding:1.4rem 1.5rem;border-bottom:1px solid rgba(90,62,30,.15);}
.cart-drawer-hdr h3{font-family:'Cormorant Garamond',serif;font-size:1.5rem;color:var(--lhb-brown-dark);font-weight:500;}
.cart-close{background:none;border:none;font-size:1.6rem;cursor:pointer;color:var(--lhb-text-mid);line-height:1;}
.cart-items{flex:1;overflow-y:auto;padding:.5rem 1.5rem 1rem;}
.cart-vendor-label{font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--lhb-sage);margin:1rem 0 .5rem;font-weight:600;}
.cart-line{display:flex;gap:.85rem;padding:.85rem 0;border-bottom:1px solid rgba(90,62,30,.1);}
.cart-line-img{width:56px;height:56px;background:#fff;object-fit:contain;flex-shrink:0;border:1px solid rgba(90,62,30,.1);}
.cart-line-info{flex:1;min-width:0;}
.cart-line-name{font-family:'Cormorant Garamond',serif;font-size:1.02rem;color:var(--lhb-brown-dark);line-height:1.2;}
.cart-line-price{font-size:.78rem;color:var(--lhb-text-muted);margin-top:.2rem;}
.cart-qty{display:flex;align-items:center;gap:.5rem;margin-top:.55rem;}
.cart-qty button{width:24px;height:24px;border:1px solid rgba(90,62,30,.3);background:#fff;cursor:pointer;font-size:.95rem;color:var(--lhb-brown-dark);line-height:1;display:flex;align-items:center;justify-content:center;}
.cart-qty span{font-size:.85rem;min-width:20px;text-align:center;}
.cart-remove{background:none;border:none;color:var(--lhb-text-muted);font-size:.66rem;text-decoration:underline;cursor:pointer;margin-left:auto;align-self:flex-start;letter-spacing:.05em;}
.cart-empty{text-align:center;color:var(--lhb-text-muted);padding:3rem 1rem;font-size:.9rem;}
.cart-foot{padding:1.4rem 1.5rem;border-top:1px solid rgba(90,62,30,.15);}
.cart-subtotal{display:flex;justify-content:space-between;align-items:baseline;color:var(--lhb-brown-dark);margin-bottom:1rem;}
.cart-subtotal span{font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;color:var(--lhb-text-mid);}
.cart-subtotal strong{font-family:'Cormorant Garamond',serif;font-size:1.35rem;font-weight:600;}
.cart-checkout{display:block;width:100%;background:var(--lhb-moss);color:var(--lhb-parchment);text-align:center;padding:.95rem;font-size:.75rem;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;border:none;cursor:pointer;transition:background .2s;}
.cart-checkout:hover{background:var(--lhb-brown-dark);}
.cart-viewcart{display:block;text-align:center;margin-top:.8rem;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--lhb-text-mid);text-decoration:underline;text-underline-offset:3px;}
@media(max-width:420px){.cart-drawer{width:100%;}}
@media(max-width:900px){
  .hero{grid-template-columns:1fr;} .hero-left{min-height:46vh;} .hero-secondary-img{display:none;}
  .about-section{grid-template-columns:1fr;} .about-imagery{min-height:340px;}
  .about-content,.shop-section,.ritual-steps,.wholesale-bar,.vendor-footer,.brand-bar,.outsyde-bar{padding-left:1.5rem;padding-right:1.5rem;}
  .product-grid{grid-template-columns:1fr;} .ritual-steps{grid-template-columns:1fr;} .lifestyle-strip{grid-template-columns:1fr;}
  .wholesale-bar,.vendor-footer{flex-direction:column;align-items:flex-start;}
  .outsyde-nav{padding:0 1.25rem;}
}
`,
        }}
      />

      <div className="lhb-root">
        {/* OUTSYDE NAV */}
        <nav className="outsyde-nav">
          <a href="/" className="nav-logo">
            <div className="nav-y">Y</div>
            <div className="nav-wordmark">OUTSYDE</div>
          </a>
          <div className="nav-right">
            <a href="/" className="nav-back">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 11L5 7l4-4" />
              </svg>
              Back to Platform
            </a>
            <button className="cart-btn" onClick={() => setDrawerOpen(true)} aria-label="Open cart">
              Cart{count > 0 && <span className="cart-count">{count}</span>}
            </button>
          </div>
        </nav>

        <div className="page">
          {/* HERO */}
          <section className="hero">
            <div className="hero-left">
              <img className="hero-bg" src="/lifestyle-ritual.jpg" alt="Lotus House Blends ritual lifestyle" />
              <div className="hero-left-overlay" />
              <div className="hero-secondary-img">
                <img src="/lifestyle-tea.jpg" alt="Morning ritual with tea" />
              </div>
            </div>
            <div className="hero-right">
              <div className="hero-logo-wrap">
                <img src="/logo-dark.png" alt="Lotus House Blends" />
              </div>
              <div className="hero-eyebrow">Presented by Outsyde &nbsp;·&nbsp; Wellness Vendor</div>
              <h1 className="hero-title">
                Crafted for<br />
                <em>every ritual</em><br />
                of your day
              </h1>
              <div className="hero-rule" />
              <p className="hero-body">
                A wellness-driven herbal brand dedicated to balance, clarity, and restoration. Crafted from natural herbs and botanicals — from the energy of morning to the calm of night.
              </p>
              <div className="hero-ctas">
                <a href="#shop" className="btn-primary">Shop the Blends</a>
                <a href="/shop/lotus/about" className="btn-ghost">Our Story</a>
              </div>
            </div>
          </section>

          {/* BRAND BAR */}
          <div className="brand-bar">
            <div className="brand-bar-left">
              <div className="brand-bar-logo">
                <img src="/logo-dark.png" alt="Lotus House Blends logo" />
              </div>
              <div>
                <span className="brand-bar-name">Lotus House Blends</span>
                <span className="brand-bar-sub">Herbal · Botanical · Intentional</span>
              </div>
            </div>
            <div className="brand-bar-badge">Outsyde Verified Vendor</div>
          </div>

          {/* ABOUT */}
          <section className="about-section" id="about">
            <div className="about-imagery">
              <img className="about-main" src="/lifestyle-model.jpg" alt="Herbal blend ritual" />
              <div className="about-imagery-tag">
                &ldquo;A reminder to pause, breathe, and reconnect.&rdquo;
              </div>
            </div>
            <div className="about-content">
              <div className="section-label label-sage">The Philosophy</div>
              <h2>Rooted in <em>ritual,</em><br />crafted with intention</h2>
              <p>Each blend is carefully formulated using natural herbs and botanicals designed to support the rhythm of your day — from the uplifting energy of morning, to the grounded focus of midday, to the calming rest of night.</p>
              <p>With offerings in both loose-leaf teas and herbal blends, Lotus House Blends creates mindful rituals that nurture body, mind, and spirit.</p>
              <div className="ritual-pillars">
                <div className="pillar">
                  <span className="pillar-name">Natural</span>
                  <span className="pillar-sub">Herbs &amp; botanicals only</span>
                </div>
                <div className="pillar">
                  <span className="pillar-name">Mindful</span>
                  <span className="pillar-sub">Crafted with intention</span>
                </div>
                <div className="pillar">
                  <span className="pillar-name">Ritual</span>
                  <span className="pillar-sub">Morning to night</span>
                </div>
              </div>
            </div>
          </section>

          {/* SHOP */}
          <section className="shop-section" id="shop">
            <div className="shop-header">
              <div className="shop-header-left">
                <div className="section-label label-lavender">The Collection</div>
                <h2>Shop the <em>Blends</em></h2>
              </div>
            </div>

            {/* FILTER TABS */}
            <div className="filter-row">
              {([
                ["all", "All Blends"],
                ["morning", "Rise & Bloom — Morning"],
                ["midday", "Heart Flow — Midday"],
                ["night", "Dream Temple — Night"],
                ["tea", "Tea Boxes"],
                ["herbs", "Loose Herbs"],
                ["prerolls", "Herbal Blends"],
              ] as [Filter, string][]).map(([key, label]) => (
                <button
                  key={key}
                  className={`ftab${active === key ? " active" : ""}`}
                  onClick={() => setActive(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* DREAM TEMPLE — NIGHT */}
            <div className={`blend-group${groupHidden("night") ? " hidden" : ""}`}>
              <div className="blend-group-hdr">
                <span className="time-badge badge-night">Night Blend</span>
                <h3 className="blend-group-title">Dream Temple</h3>
                <span className="blend-group-sub">Ease into rest · Calm the nervous system</span>
              </div>
              <div className="product-grid">
                <a href="/shop/lotus/dream-temple-pre-rolls" className="pcard" style={{ display: cardDisplay("prerolls") }}>
                  <div className="pcard-img">
                    <img src="/dream-temple-prerolls.jpg" alt="Dream Temple Herbal Cones" />
                    <span className="ptype-tag">Herbal Blend</span>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">Dream Temple Herbal Cones</div>
                    <div className="pcard-desc">4 herbal cones. Eases stress and tension, promotes deep sleep, supports dream clarity, relaxes the nervous system.</div>
                    <div className="pcard-footer">
                      <div>
                        <span className="pcard-price">$10.00</span>
                        <span className="pcard-bundle">Bundle: 3 for $20</span>
                      </div>
                      <button className="pcard-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: "dt-cones", name: "Dream Temple Herbal Cones", price: 10.00, image: "/dream-temple-prerolls.jpg" }); }}>+</button>
                    </div>
                  </div>
                </a>

                <a href="/shop/lotus/dream-temple-loose-herbs" className="pcard" style={{ display: cardDisplay("herbs") }}>
                  <div className="pcard-img">
                    <img src="/dream-temple-loose-herbs.jpg" alt="Dream Temple Loose Herbs" />
                    <span className="ptype-tag">Loose Herbs</span>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">Dream Temple Loose-Herbs</div>
                    <div className="pcard-desc">Loose herbal blend. Eases stress and tension, promotes deep sleep, calms inflammation from stress.</div>
                    <div className="pcard-footer">
                      <div>
                        <span className="pcard-price">$18.75</span>
                        <span className="pcard-bundle">Bundle: 3 for $35</span>
                      </div>
                      <button className="pcard-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: "dt-herbs", name: "Dream Temple Loose-Herbs", price: 18.75, image: "/dream-temple-loose-herbs.jpg" }); }}>+</button>
                    </div>
                  </div>
                </a>

                <a href="/shop/lotus/dream-temple-tea-box" className="pcard" style={{ display: cardDisplay("tea") }}>
                  <div className="pcard-img">
                    <img src="/dream-temple-tea-box.jpg" alt="Dream Temple Tea Box" />
                    <span className="ptype-tag">Tea Box</span>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">Dream Temple Tea Box</div>
                    <div className="pcard-desc">5 tea bags. Promotes deep sleep, supports dream clarity, relaxes the nervous system, calms inflammation.</div>
                    <div className="pcard-footer">
                      <div>
                        <span className="pcard-price">$12.50</span>
                        <span className="pcard-bundle">Bundle: 3 for $25</span>
                      </div>
                      <button className="pcard-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: "dt-tea", name: "Dream Temple Tea Box", price: 12.50, image: "/dream-temple-tea-box.jpg" }); }}>+</button>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* HEART FLOW — MIDDAY */}
            <div className={`blend-group${groupHidden("midday") ? " hidden" : ""}`}>
              <div className="blend-group-hdr">
                <span className="time-badge badge-midday">Midday Blend</span>
                <h3 className="blend-group-title">Heart Flow</h3>
                <span className="blend-group-sub">Stay balanced &amp; grounded · Supports digestion</span>
              </div>
              <div className="product-grid">
                <a href="/shop/lotus/heart-flow-loose-herbs" className="pcard" style={{ display: cardDisplay("herbs") }}>
                  <div className="pcard-img">
                    <img src="/heart-flow-loose-herbs.jpg" alt="Heart Flow Loose Herbs" />
                    <span className="ptype-tag">Loose Herbs</span>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">Heart Flow Loose-Herbs</div>
                    <div className="pcard-desc">Balances mood, calms the nervous system, reduces hormonal inflammation, supports digestion and emotional clarity.</div>
                    <div className="pcard-footer">
                      <div>
                        <span className="pcard-price">$18.75</span>
                        <span className="pcard-bundle">Bundle: 3 for $35</span>
                      </div>
                      <button className="pcard-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: "hf-herbs", name: "Heart Flow Loose-Herbs", price: 18.75, image: "/heart-flow-loose-herbs.jpg" }); }}>+</button>
                    </div>
                  </div>
                </a>

                <a href="/shop/lotus/heart-flow-tea-box" className="pcard" style={{ display: cardDisplay("tea") }}>
                  <div className="pcard-img">
                    <img src="/heart-flow-tea-box.jpg" alt="Heart Flow Tea Box" />
                    <span className="ptype-tag">Tea Box</span>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">Heart Flow Tea Box</div>
                    <div className="pcard-desc">5 tea bags. Keeps you balanced and grounded through midday. Promotes emotional clarity and supports digestion.</div>
                    <div className="pcard-footer">
                      <div>
                        <span className="pcard-price">$12.50</span>
                        <span className="pcard-bundle">Bundle: 3 for $25</span>
                      </div>
                      <button className="pcard-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: "hf-tea", name: "Heart Flow Tea Box", price: 12.50, image: "/heart-flow-tea-box.jpg" }); }}>+</button>
                    </div>
                  </div>
                </a>

                <a href="/shop/lotus/heart-flow-pre-rolls" className="pcard" style={{ display: cardDisplay("prerolls") }}>
                  <div className="pcard-img">
                    <img src="/heart-flow-prerolls.jpg" alt="Heart Flow Herbal Cones" />
                    <span className="ptype-tag">Herbal Blend</span>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">Heart Flow Herbal Cones</div>
                    <div className="pcard-desc">4 herbal cones. Keeps you balanced and grounded. Reduces hormonal inflammation, promotes emotional clarity.</div>
                    <div className="pcard-footer">
                      <div>
                        <span className="pcard-price">$10.00</span>
                        <span className="pcard-bundle">Bundle: 3 for $20</span>
                      </div>
                      <button className="pcard-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: "hf-cones", name: "Heart Flow Herbal Cones", price: 10.00, image: "/heart-flow-prerolls.jpg" }); }}>+</button>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* RISE & BLOOM — MORNING */}
            <div className={`blend-group${groupHidden("morning") ? " hidden" : ""}`}>
              <div className="blend-group-hdr">
                <span className="time-badge badge-morning">Morning Blend</span>
                <h3 className="blend-group-title">Rise &amp; Bloom</h3>
                <span className="blend-group-sub">Clear the mind · Get the day moving</span>
              </div>
              <div className="product-grid">
                <a href="/shop/lotus/rise-bloom-loose-herbs" className="pcard" style={{ display: cardDisplay("herbs") }}>
                  <div className="pcard-img">
                    <img src="/rise-bloom-loose-herbs.jpg" alt="Rise & Bloom Loose Herbs" />
                    <span className="ptype-tag">Loose Herbs</span>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">Rise &amp; Bloom Loose-Herbs</div>
                    <div className="pcard-desc">Clears brain fog, reduces inflammation, opens the lungs, supports focus and clarity. Gently boosts energy.</div>
                    <div className="pcard-footer">
                      <div>
                        <span className="pcard-price">$18.75</span>
                        <span className="pcard-bundle">Bundle: 3 for $35</span>
                      </div>
                      <button className="pcard-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: "rb-herbs", name: "Rise & Bloom Loose-Herbs", price: 18.75, image: "/rise-bloom-loose-herbs.jpg" }); }}>+</button>
                    </div>
                  </div>
                </a>

                <a href="/shop/lotus/rise-bloom-tea-box" className="pcard" style={{ display: cardDisplay("tea") }}>
                  <div className="pcard-img">
                    <img src="/rise-bloom-tea-box.jpg" alt="Rise & Bloom Tea Box" />
                    <span className="ptype-tag">Tea Box</span>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">Rise &amp; Bloom Tea Box</div>
                    <div className="pcard-desc">5 tea bags. Clears brain fog, reduces inflammation, opens the lungs, supports focus and gently boosts energy.</div>
                    <div className="pcard-footer">
                      <div>
                        <span className="pcard-price">$12.50</span>
                        <span className="pcard-bundle">Bundle: 3 for $25</span>
                      </div>
                      <button className="pcard-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: "rb-tea", name: "Rise & Bloom Tea Box", price: 12.50, image: "/rise-bloom-tea-box.jpg" }); }}>+</button>
                    </div>
                  </div>
                </a>

                <a href="/shop/lotus/rise-bloom-pre-rolls" className="pcard" style={{ display: cardDisplay("prerolls") }}>
                  <div className="pcard-img">
                    <img src="/rise-bloom-prerolls.png" alt="Rise & Bloom Herbal Cones" />
                    <span className="ptype-tag">Herbal Blend</span>
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">Rise &amp; Bloom Herbal Cones</div>
                    <div className="pcard-desc">4 herbal cones. Clears brain fog, reduces inflammation, supports focus and clarity. Gets the day moving.</div>
                    <div className="pcard-footer">
                      <div>
                        <span className="pcard-price">$10.00</span>
                        <span className="pcard-bundle">Bundle: 3 for $20</span>
                      </div>
                      <button className="pcard-add" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem({ id: "rb-cones", name: "Rise & Bloom Herbal Cones", price: 10.00, image: "/rise-bloom-prerolls.png" }); }}>+</button>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </section>

          {/* RITUAL STEPS */}
          <section className="ritual-steps">
            <div className="rstep">
              <span className="rstep-num">01</span>
              <h3>Choose Your Blend</h3>
              <p>Select the ritual that matches your moment — morning clarity, midday grounding, or evening release.</p>
            </div>
            <div className="rstep">
              <span className="rstep-num">02</span>
              <h3>Prepare with Intention</h3>
              <p>Steep, brew, or simply breathe. Take a moment to set your intention before each ritual.</p>
            </div>
            <div className="rstep">
              <span className="rstep-num">03</span>
              <h3>Return to Yourself</h3>
              <p>Let the botanicals work. Pause, reconnect, and let the rhythm of the day settle into balance.</p>
            </div>
          </section>

          {/* LIFESTYLE STRIP */}
          <div className="lifestyle-strip">
            <div className="ls-img">
              <img src="/lifestyle-ritual.jpg" alt="Ritual lifestyle" />
              <div className="ls-img-overlay">
                <p className="ls-caption">&ldquo;A moment of stillness crafted into every blend.&rdquo;</p>
              </div>
            </div>
            <div className="ls-img">
              <img src="/lifestyle-model.jpg" alt="Morning ritual" />
              <div className="ls-img-overlay">
                <p className="ls-caption">&ldquo;From morning clarity to evening release.&rdquo;</p>
              </div>
            </div>
          </div>

          {/* WHOLESALE */}
          <div className="wholesale-bar">
            <div>
              <h3>Interested in Wholesale?</h3>
              <p>Retailers, spas, and wellness practitioners — inquire about curated wholesale bundles.</p>
            </div>
            <a href="/shop/lotus/wholesale" className="btn-moss">Wholesale Inquiry</a>
          </div>

          {/* VENDOR FOOTER */}
          <footer className="vendor-footer">
            <div className="vf-logo">
              <img src="/logo-dark.png" alt="Lotus House Blends" />
            </div>
            <div className="vf-copy">© 2026 Lotus House Blends · Sold via Go Outsyde Platform</div>
            <div className="vf-links">
              <a href="/shop/lotus/terms">Terms &amp; Conditions</a>
              <a href="/shop/lotus/wholesale">Wholesale Inquiry</a>
            </div>
          </footer>

          {/* OUTSYDE BAR */}
          <div className="outsyde-bar">
            <span>Go Outsyde · Platform</span>
            <a href="/">← Back to all vendors</a>
          </div>
        </div>

        {/* CART DRAWER */}
        <div className={`cart-overlay${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />
        <aside className={`cart-drawer${drawerOpen ? " open" : ""}`} aria-hidden={!drawerOpen}>
          <div className="cart-drawer-hdr">
            <h3>Your Cart</h3>
            <button className="cart-close" onClick={() => setDrawerOpen(false)} aria-label="Close cart">×</button>
          </div>
          <div className="cart-items">
            {cart.length === 0 ? (
              <p className="cart-empty">Your cart is empty.</p>
            ) : (
              <>
                <div className="cart-vendor-label">Lotus House Blends</div>
                {cart.map((i) => (
                  <div className="cart-line" key={i.id}>
                    {i.image && <img className="cart-line-img" src={i.image} alt={i.name} />}
                    <div className="cart-line-info">
                      <div className="cart-line-name">{i.name}</div>
                      <div className="cart-line-price">${i.price.toFixed(2)}</div>
                      <div className="cart-qty">
                        <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease">−</button>
                        <span>{i.qty}</span>
                        <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase">+</button>
                        <button className="cart-remove" onClick={() => removeFromCart(i.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          {cart.length > 0 && (
            <div className="cart-foot">
              <div className="cart-subtotal">
                <span>Subtotal</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              <a href="/shop/lotus/checkout" className="cart-checkout">Checkout</a>
              <a href="/cart" className="cart-viewcart">View full cart</a>
            </div>
          )}
        </aside>

      </div>
    </>
  );
}