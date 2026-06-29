// app/shop/dialux/[slug]/page.tsx
// Dia Lux Kollection — product detail page (one template, all products).
//
// WHERE THIS GOES:
//   Folder already exists:  outsyde-web/app/shop/dialux/[slug]/   (brackets included)
//   Put this file inside as:  page.tsx
//   Loads at e.g.:  /shop/dialux/filipino-raw-straight
//
// Reads product data from lib/dialux-products.ts. Add-to-cart uses the same
// lib/cart.ts as the storefront, so items merge correctly into one cart.
// Singles: length selector drives live price. Deals: fixed price, no selector.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getDialuxProduct, relatedByTexture, LENGTH_PRICES, LENGTHS,
} from "@/lib/dialux-products";
import { addToCart, getCart, subscribe, type CartItem } from "@/lib/cart";

export default function DialuxProductPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const product = slug ? getDialuxProduct(slug) : undefined;
  const related = slug ? relatedByTexture(slug) : [];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [qty, setQtyState] = useState(1);
  const [len, setLen] = useState(12);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setCart(getCart());
    return subscribe(() => setCart(getCart()));
  }, []);

  const count = cart.reduce((n, i) => n + i.qty, 0);

  // Current unit price: singles depend on selected length, deals are fixed.
  const unitPrice = product
    ? product.kind === "single"
      ? LENGTH_PRICES[len]
      : (product.price ?? 0)
    : 0;

  function handleAdd() {
    if (!product) return;
    const isSingle = product.kind === "single";
    const cartId = isSingle ? `${product.id}-${len}` : product.id;
    const cartName = isSingle ? `${product.name} — ${len}\u2033` : product.name;
    for (let i = 0; i < qty; i++) {
      addToCart({
        id: cartId,
        name: cartName,
        price: unitPrice,
        image: product.image,
        vendor: "Dia Lux Kollection",
        vendorId: "dialux",
      });
    }
    setAdded(true);
  }

  const styles = (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
.dlx-pd{
  --dlx-black:#0A0A0A; --dlx-silver:#C9CACC; --dlx-silver-soft:#8C8E92; --dlx-cream:#F4F2EE;
  --dlx-line:rgba(201,202,204,.16); --dlx-gold:#E8B930;
  --dlx-serif:'Cormorant Garamond',Georgia,serif; --dlx-display:'Bebas Neue',Impact,sans-serif;
  --dlx-sans:'Hanken Grotesk',system-ui,sans-serif;
  font-family:var(--dlx-sans); background:var(--dlx-black); color:var(--dlx-cream); min-height:100vh;
}
.dlx-pd a{text-decoration:none;color:inherit;}

.dlx-nav{background:#000;padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;border-bottom:1px solid var(--dlx-line);}
.dlx-nav .brand{font-family:var(--dlx-serif);font-size:1.4rem;font-weight:500;color:var(--dlx-cream);letter-spacing:.03em;}
.dlx-nav-right{display:flex;align-items:center;gap:1.5rem;}
.dlx-back{color:var(--dlx-silver-soft);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;transition:color .2s;}
.dlx-back:hover{color:var(--dlx-cream);}
.dlx-cartbtn{position:relative;display:flex;align-items:center;gap:.45rem;color:var(--dlx-cream);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;}
.dlx-cartbtn:hover{color:var(--dlx-gold);}
.dlx-cartcount{background:var(--dlx-gold);color:#000;border-radius:999px;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:700;padding:0 5px;}

.dlx-crumb{max-width:1100px;margin:0 auto;padding:1.5rem 1.5rem 0;font-size:.72rem;letter-spacing:.08em;color:var(--dlx-silver-soft);}
.dlx-crumb a:hover{color:var(--dlx-silver);}

.dlx-pdwrap{max-width:1100px;margin:0 auto;padding:2rem 1.5rem 4rem;display:grid;grid-template-columns:1fr 1fr;gap:3.5rem;align-items:start;}
.dlx-media{position:relative;background:#0F0F0F;border:1px solid var(--dlx-line);border-radius:4px;overflow:hidden;}
.dlx-media .tex-badge{position:absolute;top:1rem;left:1rem;z-index:2;font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;padding:.4rem .75rem;background:rgba(0,0,0,.7);color:var(--dlx-gold);font-weight:600;border:1px solid var(--dlx-line);}
.dlx-media img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;}

.dlx-info{padding-top:.5rem;}
.dlx-eyebrow{font-size:.68rem;letter-spacing:.22em;text-transform:uppercase;color:var(--dlx-gold);font-weight:600;margin-bottom:.85rem;}
.dlx-title{font-family:var(--dlx-serif);font-size:clamp(2rem,4vw,2.8rem);font-weight:500;line-height:1.05;color:var(--dlx-cream);}
.dlx-pricerow{display:flex;align-items:baseline;gap:1rem;margin:1.4rem 0 .35rem;}
.dlx-price{font-family:var(--dlx-serif);font-size:2rem;font-weight:600;color:var(--dlx-cream);}
.dlx-pricetag{font-size:.74rem;letter-spacing:.05em;color:var(--dlx-gold);background:rgba(232,185,48,.1);border:1px solid rgba(232,185,48,.3);padding:.3rem .7rem;border-radius:2px;}
.dlx-desc{font-size:.96rem;line-height:1.75;color:rgba(244,242,238,.72);font-weight:300;margin:1.4rem 0;max-width:48ch;}
.dlx-rule{height:1px;background:var(--dlx-line);margin:1.6rem 0;}
.dlx-details{list-style:none;display:flex;flex-direction:column;gap:.55rem;margin-bottom:2rem;}
.dlx-details li{font-size:.84rem;color:rgba(244,242,238,.7);font-weight:300;display:flex;align-items:center;gap:.6rem;}
.dlx-details li::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--dlx-gold);flex-shrink:0;}

.dlx-lenrow{margin-bottom:1.25rem;}
.dlx-lenlabel{display:block;font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;color:var(--dlx-silver-soft);margin-bottom:.5rem;}
.dlx-lenselect{width:100%;max-width:200px;background:#000;color:var(--dlx-cream);border:1px solid var(--dlx-line);border-radius:3px;padding:.7rem .85rem;font-family:var(--dlx-sans);font-size:.9rem;cursor:pointer;}
.dlx-lenselect:focus{outline:none;border-color:var(--dlx-silver);}

.dlx-buy{display:flex;align-items:stretch;gap:.85rem;flex-wrap:wrap;}
.dlx-qty{display:flex;align-items:center;border:1px solid var(--dlx-line);background:#000;border-radius:3px;}
.dlx-qty button{width:44px;height:50px;border:none;background:none;cursor:pointer;font-size:1.1rem;color:var(--dlx-cream);line-height:1;}
.dlx-qty button:hover{background:#161616;}
.dlx-qty span{min-width:38px;text-align:center;font-size:.95rem;}
.dlx-add{flex:1;min-width:220px;background:var(--dlx-cream);color:#000;border:none;padding:0 2rem;height:50px;border-radius:3px;font-family:var(--dlx-sans);font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;font-weight:700;cursor:pointer;transition:background .2s;}
.dlx-add:hover{background:#fff;}

.dlx-added{background:#0F0F0F;border:1px solid rgba(232,185,48,.4);border-radius:4px;padding:1.1rem 1.25rem;margin-top:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
.dlx-added .ok{font-size:.86rem;color:var(--dlx-gold);font-weight:500;}
.dlx-added .links{display:flex;gap:.6rem;}
.dlx-added a{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;padding:.55rem 1rem;border-radius:3px;}
.dlx-added .view{color:var(--dlx-cream);border:1px solid var(--dlx-line);}
.dlx-added .checkout{background:var(--dlx-gold);color:#000;font-weight:700;}

.dlx-related{max-width:1100px;margin:0 auto;padding:0 1.5rem 5rem;}
.dlx-related h2{font-family:var(--dlx-display);font-size:1.8rem;letter-spacing:.06em;color:var(--dlx-cream);font-weight:400;margin-bottom:.4rem;}
.dlx-related .sub{font-size:.78rem;color:var(--dlx-silver-soft);margin-bottom:1.75rem;letter-spacing:.04em;}
.dlx-rgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.25rem;}
.dlx-rcard{display:flex;gap:1rem;align-items:center;background:#0F0F0F;border:1px solid var(--dlx-line);border-radius:4px;padding:1rem;transition:border-color .2s,transform .15s;}
.dlx-rcard:hover{border-color:rgba(201,202,204,.4);transform:translateY(-2px);}
.dlx-rcard img{width:72px;height:90px;object-fit:cover;border-radius:3px;background:#000;flex-shrink:0;}
.dlx-rname{font-family:var(--dlx-serif);font-size:1.1rem;color:var(--dlx-cream);line-height:1.2;}
.dlx-rmeta{font-size:.74rem;color:var(--dlx-silver-soft);margin-top:.3rem;}

.dlx-foot{background:#070707;color:var(--dlx-silver-soft);padding:2rem 2.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;font-size:.7rem;border-top:1px solid var(--dlx-line);}
.dlx-foot a{color:var(--dlx-silver);text-decoration:underline;text-underline-offset:3px;}

.dlx-nf{max-width:600px;margin:0 auto;text-align:center;padding:6rem 1.5rem;}
.dlx-nf h1{font-family:var(--dlx-serif);font-size:2.2rem;color:var(--dlx-cream);margin-bottom:1rem;font-weight:500;}
.dlx-nf a{color:var(--dlx-gold);text-decoration:underline;text-underline-offset:3px;}

@media(max-width:820px){
  .dlx-pdwrap{grid-template-columns:1fr;gap:2rem;}
  .dlx-rgrid{grid-template-columns:1fr;}
  .dlx-nav{padding:0 1.25rem;}
}
`,
      }}
    />
  );

  if (!product) {
    return (
      <div className="dlx-pd">
        {styles}
        <nav className="dlx-nav">
          <a href="/" className="brand">Dia Lux Kollection</a>
          <a href="/shop/dialux" className="dlx-back">← Back to Dia Lux</a>
        </nav>
        <div className="dlx-nf">
          <h1>Product not found</h1>
          <p style={{ color: "#8C8E92", marginBottom: "1.5rem" }}>We couldn&rsquo;t find that product.</p>
          <a href="/shop/dialux">Browse all bundles</a>
        </div>
      </div>
    );
  }

  return (
    <div className="dlx-pd">
      {styles}

      <nav className="dlx-nav">
        <a href="/shop/dialux" className="brand">Dia Lux Kollection</a>
        <div className="dlx-nav-right">
          <a href="/shop/dialux" className="dlx-back">← Back to Shop</a>
          <a href="/cart" className="dlx-cartbtn">Cart{count > 0 && <span className="dlx-cartcount">{count}</span>}</a>
        </div>
      </nav>

      <div className="dlx-crumb">
        <a href="/shop/dialux">Dia Lux Kollection</a> &nbsp;/&nbsp; {product.texture} &nbsp;/&nbsp; {product.name}
      </div>

      <div className="dlx-pdwrap">
        <div className="dlx-media">
          <span className="tex-badge">{product.texture}{product.kind === "deal" ? " · 3-Bundle Set" : ""}</span>
          <img src={product.image} alt={product.name} />
        </div>

        <div className="dlx-info">
          <div className="dlx-eyebrow">{product.kind === "deal" ? "Bundle Deal" : "Single Bundle"}</div>
          <h1 className="dlx-title">{product.name}</h1>

          <div className="dlx-pricerow">
            <span className="dlx-price">${unitPrice.toFixed(2)}</span>
            {product.kind === "deal"
              ? <span className="dlx-pricetag">Includes {product.lengths}</span>
              : <span className="dlx-pricetag">Choose your length · 12&Prime;–32&Prime;</span>}
          </div>

          <p className="dlx-desc">{product.long}</p>

          <div className="dlx-rule" />

          <ul className="dlx-details">
            {product.details.map((d) => <li key={d}>{d}</li>)}
          </ul>

          {product.kind === "single" && (
            <div className="dlx-lenrow">
              <label className="dlx-lenlabel">Length</label>
              <select
                className="dlx-lenselect"
                value={len}
                onChange={(e) => setLen(Number(e.target.value))}
              >
                {LENGTHS.map((L) => (
                  <option key={L} value={L}>{L}&Prime; — ${LENGTH_PRICES[L].toFixed(2)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="dlx-buy">
            <div className="dlx-qty">
              <button onClick={() => setQtyState((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span>{qty}</span>
              <button onClick={() => setQtyState((q) => q + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button className="dlx-add" onClick={handleAdd}>
              Add to Cart — ${(unitPrice * qty).toFixed(2)}
            </button>
          </div>

          {added && (
            <div className="dlx-added">
              <span className="ok">✓ Added to your cart</span>
              <div className="links">
                <a href="/cart" className="view">View Cart</a>
                <a href="/cart" className="checkout">Checkout</a>
              </div>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="dlx-related">
          <h2>More {product.texture} Bundles</h2>
          <p className="sub">Complete the look with matching {product.texture.toLowerCase()} texture.</p>
          <div className="dlx-rgrid">
            {related.map((r) => {
              const rPrice = r.kind === "single" ? (r.basePrice ?? 0) : (r.price ?? 0);
              const rMeta = r.kind === "single" ? `Single Bundle · from $${rPrice.toFixed(2)}` : `Bundle Deal · $${rPrice.toFixed(2)}`;
              return (
                <a className="dlx-rcard" href={`/shop/dialux/${r.slug}`} key={r.slug}>
                  <img src={r.image} alt={r.name} />
                  <div>
                    <div className="dlx-rname">{r.name}</div>
                    <div className="dlx-rmeta">{rMeta}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <footer className="dlx-foot">
        <span>© {new Date().getFullYear()} Dia Lux Kollection · Sold via Go Outsyde Platform</span>
        <span><a href="/shop/dialux">Back to Dia Lux Kollection</a></span>
      </footer>
    </div>
  );
}