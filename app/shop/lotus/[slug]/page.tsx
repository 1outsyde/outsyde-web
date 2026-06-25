// app/shop/lotus/[slug]/page.tsx
// Lotus House Blends — product detail page (one template, all 9 products).
//
// WHERE THIS GOES:
//   Create folder:  outsyde-web/app/shop/lotus/[slug]/   (brackets included)
//   Put this file inside as:  page.tsx
//   Loads at e.g.:  localhost:3000/shop/lotus/dream-temple-pre-rolls
//
// Reads product data from lib/lotus-products.ts. Add-to-cart uses the same
// lib/cart.ts as the storefront, so items merge correctly into one cart.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getLotusProduct, relatedInBlend } from "@/lib/lotus-products";
import { addToCart, getCart, subscribe, type CartItem } from "@/lib/cart";

export default function LotusProductPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const product = slug ? getLotusProduct(slug) : undefined;
  const related = slug ? relatedInBlend(slug) : [];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [qty, setQtyState] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setCart(getCart());
    return subscribe(() => setCart(getCart()));
  }, []);

  const count = cart.reduce((n, i) => n + i.qty, 0);

  function handleAdd() {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addToCart({
        id: product.id, name: product.name, price: product.price,
        image: product.image, vendor: "Lotus House Blends", vendorId: "lotus",
      });
    }
    setAdded(true);
  }

  const styles = (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{
  --outsyde-black:#000000; --outsyde-gold:#E8B930;
  --lhb-parchment:#F2EBD9; --lhb-cream:#EDE3CC; --lhb-lavender:#7B6BAF; --lhb-lavender-muted:#E8E4F2;
  --lhb-sage:#4A6741; --lhb-brown-dark:#2A1E0E; --lhb-brown-light:#C8A882; --lhb-moss:#1E3020;
  --lhb-text-dark:#1A1208; --lhb-text-mid:#4A3820; --lhb-text-muted:#7A6A50;
}
.lhb-pd{font-family:'Jost',sans-serif;background:var(--lhb-parchment);color:var(--lhb-text-dark);min-height:100vh;}
.outsyde-nav{background:var(--outsyde-black);padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.nav-logo{display:flex;align-items:center;gap:.75rem;text-decoration:none;}
.nav-y{font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:600;color:var(--outsyde-gold);line-height:1;}
.nav-wordmark{font-size:.65rem;letter-spacing:.28em;color:#888;font-weight:300;}
.nav-right{display:flex;align-items:center;gap:1.5rem;}
.nav-back{color:#888;font-size:.72rem;letter-spacing:.12em;text-decoration:none;font-weight:300;transition:color .2s;}
.nav-back:hover{color:var(--outsyde-gold);}
.cart-btn{position:relative;display:flex;align-items:center;gap:.45rem;text-decoration:none;color:#fff;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;}
.cart-btn:hover{color:var(--outsyde-gold);}
.cart-count{background:var(--outsyde-gold);color:#000;border-radius:999px;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:600;padding:0 5px;}

.crumb{max-width:1100px;margin:0 auto;padding:1.5rem 1.5rem 0;font-size:.72rem;letter-spacing:.08em;color:var(--lhb-text-muted);}
.crumb a{color:var(--lhb-text-muted);text-decoration:none;}
.crumb a:hover{color:var(--lhb-sage);}

.pd-wrap{max-width:1100px;margin:0 auto;padding:2rem 1.5rem 4rem;display:grid;grid-template-columns:1fr 1fr;gap:3.5rem;align-items:start;}
.pd-media{position:relative;background:var(--lhb-cream);border:1px solid rgba(90,62,30,.12);}
.pd-media .time-badge{position:absolute;top:1rem;left:1rem;z-index:2;font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;padding:.4rem .75rem;background:#fff;color:var(--lhb-text-mid);font-weight:500;}
.pd-media .badge-night{color:#3a3168;background:var(--lhb-lavender-muted);}
.pd-media .badge-midday{color:#7a4a20;background:#F3E2CB;}
.pd-media .badge-morning{color:#3f5a36;background:#E4EBD9;}
.pd-media img{display:block;width:100%;aspect-ratio:1/1;object-fit:contain;padding:2.5rem;}

.pd-info{padding-top:.5rem;}
.pd-eyebrow{font-size:.68rem;letter-spacing:.22em;text-transform:uppercase;color:var(--lhb-sage);font-weight:500;margin-bottom:.85rem;}
.pd-title{font-family:'Cormorant Garamond',serif;font-size:clamp(2.2rem,4vw,3rem);font-weight:500;line-height:1.05;color:var(--lhb-brown-dark);}
.pd-format{font-size:.8rem;letter-spacing:.05em;color:var(--lhb-text-muted);margin-top:.5rem;font-style:italic;}
.pd-price-row{display:flex;align-items:baseline;gap:1rem;margin:1.5rem 0 .35rem;}
.pd-price{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:600;color:var(--lhb-text-dark);}
.pd-bundle{font-size:.74rem;letter-spacing:.05em;color:var(--lhb-sage);background:#E4EBD9;padding:.3rem .7rem;}
.pd-desc{font-size:.96rem;line-height:1.75;color:var(--lhb-text-mid);font-weight:300;margin:1.5rem 0;max-width:46ch;}
.pd-rule{height:1px;background:rgba(90,62,30,.15);margin:1.75rem 0;}
.pd-details{list-style:none;display:flex;flex-direction:column;gap:.55rem;margin-bottom:2rem;}
.pd-details li{font-size:.82rem;color:var(--lhb-text-mid);font-weight:300;display:flex;align-items:center;gap:.6rem;}
.pd-details li::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--lhb-sage);flex-shrink:0;}

.pd-buy{display:flex;align-items:stretch;gap:.85rem;flex-wrap:wrap;}
.qty-stepper{display:flex;align-items:center;border:1px solid rgba(90,62,30,.3);background:#fff;}
.qty-stepper button{width:44px;height:48px;border:none;background:none;cursor:pointer;font-size:1.1rem;color:var(--lhb-brown-dark);line-height:1;}
.qty-stepper button:hover{background:var(--lhb-cream);}
.qty-stepper span{min-width:38px;text-align:center;font-size:.95rem;}
.add-btn{flex:1;min-width:200px;background:var(--lhb-moss);color:var(--lhb-parchment);border:none;padding:0 2rem;height:48px;font-family:'Jost',sans-serif;font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;font-weight:500;cursor:pointer;transition:background .2s;}
.add-btn:hover{background:var(--lhb-brown-dark);}

.added-card{background:#fff;border:1px solid var(--lhb-sage);padding:1.1rem 1.25rem;margin-top:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
.added-card .ok{font-size:.86rem;color:var(--lhb-sage);font-weight:500;display:flex;align-items:center;gap:.5rem;}
.added-card .links{display:flex;gap:.6rem;}
.added-card a{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;padding:.55rem 1rem;}
.added-card .view{color:var(--lhb-text-mid);border:1px solid rgba(90,62,30,.3);}
.added-card .checkout{background:var(--lhb-moss);color:var(--lhb-parchment);}

.ritual{max-width:1100px;margin:0 auto;padding:0 1.5rem 5rem;}
.ritual-hdr{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:500;color:var(--lhb-brown-dark);margin-bottom:.4rem;}
.ritual-sub{font-size:.78rem;color:var(--lhb-text-muted);margin-bottom:1.75rem;letter-spacing:.04em;}
.ritual-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.25rem;}
.rcard{display:flex;gap:1rem;align-items:center;background:var(--lhb-cream);border:1px solid rgba(90,62,30,.12);padding:1rem;text-decoration:none;transition:border-color .2s,transform .15s;}
.rcard:hover{border-color:var(--lhb-sage);transform:translateY(-2px);}
.rcard img{width:72px;height:72px;object-fit:contain;background:#fff;flex-shrink:0;}
.rcard .rname{font-family:'Cormorant Garamond',serif;font-size:1.15rem;color:var(--lhb-brown-dark);line-height:1.15;}
.rcard .rmeta{font-size:.74rem;color:var(--lhb-text-muted);margin-top:.3rem;}

.pd-footer{background:var(--lhb-brown-dark);color:rgba(200,168,130,.5);padding:2rem 2.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;font-size:.7rem;}
.pd-footer a{color:var(--lhb-brown-light);text-decoration:underline;text-underline-offset:3px;}
.pd-footer a:hover{color:var(--lhb-parchment);}

.notfound{max-width:600px;margin:0 auto;text-align:center;padding:6rem 1.5rem;}
.notfound h1{font-family:'Cormorant Garamond',serif;font-size:2.4rem;color:var(--lhb-brown-dark);margin-bottom:1rem;font-weight:500;}
.notfound a{color:var(--lhb-sage);text-decoration:underline;text-underline-offset:3px;}

@media(max-width:820px){
  .pd-wrap{grid-template-columns:1fr;gap:2rem;}
  .ritual-grid{grid-template-columns:1fr;}
  .outsyde-nav{padding:0 1.25rem;}
}
`,
      }}
    />
  );

  if (!product) {
    return (
      <div className="lhb-pd">
        {styles}
        <nav className="outsyde-nav">
          <a href="/" className="nav-logo"><span className="nav-y">Y</span><span className="nav-wordmark">OUTSYDE</span></a>
          <a href="/shop/lotus" className="nav-back">← Back to Lotus House Blends</a>
        </nav>
        <div className="notfound">
          <h1>Blend not found</h1>
          <p style={{ color: "#7A6A50", marginBottom: "1.5rem" }}>We couldn&rsquo;t find that product.</p>
          <a href="/shop/lotus">Browse all blends</a>
        </div>
      </div>
    );
  }

  const badgeClass =
    product.blendTime === "Night Blend" ? "badge-night" :
    product.blendTime === "Midday Blend" ? "badge-midday" : "badge-morning";

  return (
    <div className="lhb-pd">
      {styles}

      <nav className="outsyde-nav">
        <a href="/" className="nav-logo"><span className="nav-y">Y</span><span className="nav-wordmark">OUTSYDE</span></a>
        <div className="nav-right">
          <a href="/shop/lotus" className="nav-back">← Back to Lotus</a>
          <a href="/cart" className="cart-btn">Cart{count > 0 && <span className="cart-count">{count}</span>}</a>
        </div>
      </nav>

      <div className="crumb">
        <a href="/shop/lotus">Lotus House Blends</a> &nbsp;/&nbsp; {product.blend} &nbsp;/&nbsp; {product.formatLabel}
      </div>

      <div className="pd-wrap">
        <div className="pd-media">
          <span className={`time-badge ${badgeClass}`}>{product.blendTime}</span>
          <img src={product.image} alt={product.name} />
        </div>

        <div className="pd-info">
          <div className="pd-eyebrow">{product.blend} · {product.blendNote}</div>
          <h1 className="pd-title">{product.name}</h1>
          <div className="pd-format">{product.formatLabel}</div>

          <div className="pd-price-row">
            <span className="pd-price">${product.price.toFixed(2)}</span>
            <span className="pd-bundle">Bundle · {product.bundle}</span>
          </div>

          <p className="pd-desc">{product.long}</p>

          <div className="pd-rule" />

          <ul className="pd-details">
            {product.details.map((d) => <li key={d}>{d}</li>)}
          </ul>

          <div className="pd-buy">
            <div className="qty-stepper">
              <button onClick={() => setQtyState((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span>{qty}</span>
              <button onClick={() => setQtyState((q) => q + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button className="add-btn" onClick={handleAdd}>Add to Cart — ${(product.price * qty).toFixed(2)}</button>
          </div>

          {added && (
            <div className="added-card">
              <span className="ok">✓ Added to your cart</span>
              <div className="links">
                <a href="/cart" className="view">View Cart</a>
                <a href="/shop/lotus/checkout" className="checkout">Checkout</a>
              </div>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="ritual">
          <h2 className="ritual-hdr">Complete the {product.blend} ritual</h2>
          <p className="ritual-sub">More from the {product.blendTime.toLowerCase()}.</p>
          <div className="ritual-grid">
            {related.map((r) => (
              <a className="rcard" href={`/shop/lotus/${r.slug}`} key={r.slug}>
                <img src={r.image} alt={r.name} />
                <div>
                  <div className="rname">{r.name}</div>
                  <div className="rmeta">{r.formatLabel} · ${r.price.toFixed(2)}</div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <footer className="pd-footer">
        <span>© 2026 Lotus House Blends · Sold via Go Outsyde Platform</span>
        <span><a href="/shop/lotus">Back to Lotus House Blends</a></span>
      </footer>
    </div>
  );
}