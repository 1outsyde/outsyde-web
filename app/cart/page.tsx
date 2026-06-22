// app/cart/page.tsx
// Outsyde — Full Cart page (Step 2). Multi-vendor grouped, single checkout button.
// No secrets / no Stripe yet. Reads the same cart store as the drawer (@/lib/cart).
//
// WHERE THIS GOES:
//   Create folder:  outsyde-web/app/cart/
//   Put this file inside as:  page.tsx
//   Loads at:  localhost:3000/cart  (the drawer's "View full cart" link)

"use client";

import { useEffect, useState } from "react";
import { getCart, setQty, removeFromCart, subscribe, type CartItem } from "@/lib/cart";

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCart(getCart());
    return subscribe(() => setCart(getCart()));
  }, []);

  // Group items by vendor (ready for multiple vendors)
  const vendors = Array.from(new Set(cart.map((i) => i.vendorId))).map((vid) => {
    const items = cart.filter((i) => i.vendorId === vid);
    return {
      vendorId: vid,
      vendor: items[0]?.vendor || "Vendor",
      items,
      subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
    };
  });

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((n, i) => n + i.qty, 0);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root{
  --outsyde-black:#000000; --outsyde-gold:#E8B930;
  --lhb-parchment:#F2EBD9; --lhb-cream:#EDE3CC; --lhb-lavender:#7B6BAF;
  --lhb-sage:#4A6741; --lhb-brown-dark:#2A1E0E; --lhb-brown-light:#C8A882; --lhb-moss:#1E3020;
  --lhb-text-dark:#1A1208; --lhb-text-mid:#4A3820; --lhb-text-muted:#7A6A50;
}
.cartpage{font-family:'Jost',sans-serif;background:var(--lhb-parchment);color:var(--lhb-text-dark);min-height:100vh;}
.outsyde-nav{background:var(--outsyde-black);padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.nav-logo{display:flex;align-items:center;gap:.75rem;text-decoration:none;}
.nav-y{font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:600;color:var(--outsyde-gold);line-height:1;}
.nav-wordmark{font-size:.65rem;letter-spacing:.28em;color:#888;font-weight:300;}
.nav-back{color:#888;font-size:.72rem;letter-spacing:.12em;text-decoration:none;font-weight:300;transition:color .2s;}
.nav-back:hover{color:var(--outsyde-gold);}

.cart-wrap{max-width:1040px;margin:0 auto;padding:3rem 1.5rem 5rem;}
.cart-title{font-family:'Cormorant Garamond',serif;font-size:clamp(2.2rem,4vw,3rem);font-weight:400;color:var(--lhb-brown-dark);margin-bottom:.35rem;}
.cart-sub{font-size:.82rem;letter-spacing:.04em;color:var(--lhb-text-muted);margin-bottom:2.5rem;}

.cart-grid{display:grid;grid-template-columns:1fr 340px;gap:2.5rem;align-items:start;}

.vendor-block{background:#fff;border:1px solid rgba(90,62,30,.12);margin-bottom:1.5rem;}
.vendor-hdr{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;background:var(--lhb-cream);border-bottom:1px solid rgba(90,62,30,.12);}
.vendor-hdr .vname{font-size:.66rem;letter-spacing:.2em;text-transform:uppercase;color:var(--lhb-sage);font-weight:600;}
.vendor-hdr .vsub{font-size:.85rem;color:var(--lhb-text-mid);}

.line{display:flex;gap:1.25rem;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(90,62,30,.08);}
.line:last-child{border-bottom:none;}
.line-img{width:80px;height:80px;background:var(--lhb-parchment);object-fit:contain;flex-shrink:0;border:1px solid rgba(90,62,30,.1);}
.line-main{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;}
.line-name{font-family:'Cormorant Garamond',serif;font-size:1.25rem;color:var(--lhb-brown-dark);line-height:1.2;}
.line-unit{font-size:.8rem;color:var(--lhb-text-muted);margin-top:.25rem;}
.line-controls{display:flex;align-items:center;gap:1rem;margin-top:.7rem;}
.qty{display:flex;align-items:center;gap:.6rem;}
.qty button{width:28px;height:28px;border:1px solid rgba(90,62,30,.3);background:var(--lhb-parchment);cursor:pointer;font-size:1rem;color:var(--lhb-brown-dark);line-height:1;display:flex;align-items:center;justify-content:center;}
.qty button:hover{background:var(--lhb-cream);}
.qty span{font-size:.95rem;min-width:24px;text-align:center;}
.line-remove{background:none;border:none;color:var(--lhb-text-muted);font-size:.7rem;text-decoration:underline;text-underline-offset:2px;cursor:pointer;letter-spacing:.04em;}
.line-remove:hover{color:#8A3030;}
.line-amt{display:flex;align-items:center;font-family:'Cormorant Garamond',serif;font-size:1.3rem;color:var(--lhb-brown-dark);}

.summary{background:#fff;border:1px solid rgba(90,62,30,.12);padding:1.75rem;position:sticky;top:88px;}
.summary h2{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:500;color:var(--lhb-brown-dark);margin-bottom:1.25rem;}
.summary-row{display:flex;justify-content:space-between;font-size:.88rem;color:var(--lhb-text-mid);padding:.5rem 0;}
.summary-row.vendor-line{font-size:.78rem;color:var(--lhb-text-muted);}
.summary-divider{height:1px;background:rgba(90,62,30,.15);margin:.85rem 0;}
.summary-total{display:flex;justify-content:space-between;align-items:baseline;margin-top:.25rem;}
.summary-total span{font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;color:var(--lhb-text-mid);}
.summary-total strong{font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:600;color:var(--lhb-brown-dark);}
.summary-note{font-size:.72rem;color:var(--lhb-text-muted);margin-top:.5rem;line-height:1.5;}
.checkout-btn{display:block;width:100%;background:var(--lhb-moss);color:var(--lhb-parchment);text-align:center;padding:1.05rem;font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;border:none;cursor:pointer;margin-top:1.5rem;transition:background .2s;}
.checkout-btn:hover{background:var(--lhb-brown-dark);}
.keep-shopping{display:block;text-align:center;margin-top:1rem;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--lhb-text-mid);text-decoration:underline;text-underline-offset:3px;}

.empty{text-align:center;padding:5rem 1.5rem;}
.empty h2{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:400;color:var(--lhb-brown-dark);margin-bottom:1rem;}
.empty p{font-size:.92rem;color:var(--lhb-text-muted);margin-bottom:1.75rem;}
.empty a{display:inline-block;background:var(--lhb-moss);color:var(--lhb-parchment);padding:.85rem 2rem;font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;}

@media(max-width:780px){ .cart-grid{grid-template-columns:1fr;} .summary{position:static;} .outsyde-nav{padding:0 1.25rem;} }
`,
        }}
      />

      <div className="cartpage">
        <nav className="outsyde-nav">
          <a href="/" className="nav-logo">
            <span className="nav-y">Y</span>
            <span className="nav-wordmark">OUTSYDE</span>
          </a>
          <a href="/shop/lotus" className="nav-back">← Continue Shopping</a>
        </nav>

        {!mounted ? (
          <div className="cart-wrap" />
        ) : cart.length === 0 ? (
          <div className="empty">
            <h2>Your cart is empty</h2>
            <p>Looks like you haven&rsquo;t added anything yet.</p>
            <a href="/shop/lotus">Browse Lotus House Blends</a>
          </div>
        ) : (
          <div className="cart-wrap">
            <h1 className="cart-title">Your Cart</h1>
            <p className="cart-sub">{count} {count === 1 ? "item" : "items"}</p>

            <div className="cart-grid">
              {/* LEFT: items grouped by vendor */}
              <div>
                {vendors.map((v) => (
                  <div className="vendor-block" key={v.vendorId}>
                    <div className="vendor-hdr">
                      <span className="vname">{v.vendor}</span>
                      <span className="vsub">${v.subtotal.toFixed(2)}</span>
                    </div>
                    {v.items.map((i) => (
                      <div className="line" key={i.id}>
                        {i.image && <img className="line-img" src={i.image} alt={i.name} />}
                        <div className="line-main">
                          <div className="line-name">{i.name}</div>
                          <div className="line-unit">${i.price.toFixed(2)} each</div>
                          <div className="line-controls">
                            <div className="qty">
                              <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease">−</button>
                              <span>{i.qty}</span>
                              <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase">+</button>
                            </div>
                            <button className="line-remove" onClick={() => removeFromCart(i.id)}>Remove</button>
                          </div>
                        </div>
                        <div className="line-amt">${(i.price * i.qty).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* RIGHT: order summary */}
              <aside className="summary">
                <h2>Order Summary</h2>
                {vendors.length > 1 &&
                  vendors.map((v) => (
                    <div className="summary-row vendor-line" key={v.vendorId}>
                      <span>{v.vendor}</span>
                      <span>${v.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping &amp; service fees</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="summary-divider" />
                <div className="summary-total">
                  <span>Estimated Total</span>
                  <strong>${subtotal.toFixed(2)}</strong>
                </div>
                <p className="summary-note">Service fee &amp; shipping are added on the next step.</p>

                <a href="/shop/lotus/checkout" className="checkout-btn">Proceed to Checkout</a>
                <a href="/shop/lotus" className="keep-shopping">← Continue Shopping</a>
              </aside>
            </div>
          </div>
        )}
      </div>
    </>
  );
}