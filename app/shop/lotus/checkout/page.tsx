// app/shop/lotus/checkout/page.tsx
// Outsyde — Checkout (Step 3). Native on-page flow (your createPaymentIntent model).
// NO SECRETS / NO STRIPE YET. Form fields + fee math are FINAL; only the card charge is stubbed.
//
// WHERE THIS GOES:
//   Create folder:  outsyde-web/app/shop/lotus/checkout/
//   Put this file inside as:  page.tsx
//   Loads at:  localhost:3000/shop/lotus/checkout
//
// THURSDAY (Cursor + secrets): inside handlePlaceOrder, replace the stub with:
//   const res = await createPaymentIntent(lineItems, shippingDetails);  // your backend fn
//   then confirm res.clientSecret with Stripe Elements mounted in the {/* CARD ELEMENT */} slot.
// Fee model below mirrors your Wix code exactly: 8% customer upcharge.

"use client";

import { useEffect, useState } from "react";
import { getCart, subscribe, type CartItem } from "@/lib/cart";

const CUSTOMER_UPCHARGE_RATE = 0.08; // matches createPaymentIntent

export default function Checkout() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState("");

  // Shipping fields — names match your createPaymentIntent shippingDetails
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    addressLine1: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
  });

  useEffect(() => {
    setMounted(true);
    setCart(getCart());
    return subscribe(() => setCart(getCart()));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // ---- Fee math (mirrors createPaymentIntent exactly) ----
  const subtotalCents = cart.reduce((c, i) => c + Math.round(i.price * 100) * i.qty, 0);
  const totalCents = Math.round(subtotalCents * (1 + CUSTOMER_UPCHARGE_RATE));
  const feeCents = totalCents - subtotalCents;
  const subtotal = subtotalCents / 100;
  const fee = feeCents / 100;
  const total = totalCents / 100;

  const vendors = Array.from(new Set(cart.map((i) => i.vendor)));

  function handlePlaceOrder() {
    setError("");
    const required: (keyof typeof form)[] = ["email", "fullName", "addressLine1", "city", "state", "zipCode"];
    const missing = required.filter((k) => !form[k].trim());
    if (missing.length) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    // Payload assembled EXACTLY as createPaymentIntent expects (ready for Thursday)
    const lineItems = cart.map((i) => ({
      title: i.name,
      finalPrice: i.price,
      quantity: i.qty,
      vendorId: i.vendorId, // -> resolves to vendorStripeAccountId server-side
    }));
    const shippingDetails = {
      fullName: form.fullName,
      addressLine1: form.addressLine1,
      city: form.city,
      state: form.state,
      zipCode: form.zipCode,
      country: form.country,
    };

    // THURSDAY: createPaymentIntent(lineItems, shippingDetails) -> confirm clientSecret with Stripe Elements
    console.log("ORDER READY FOR STRIPE:", { lineItems, shippingDetails, email: form.email, totalCents });
    setPlaced(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
.checkout{font-family:'Jost',sans-serif;background:var(--lhb-parchment);color:var(--lhb-text-dark);min-height:100vh;}
.outsyde-nav{background:var(--outsyde-black);padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.nav-logo{display:flex;align-items:center;gap:.75rem;text-decoration:none;}
.nav-y{font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:600;color:var(--outsyde-gold);line-height:1;}
.nav-wordmark{font-size:.65rem;letter-spacing:.28em;color:#888;font-weight:300;}
.nav-back{color:#888;font-size:.72rem;letter-spacing:.12em;text-decoration:none;font-weight:300;}
.nav-back:hover{color:var(--outsyde-gold);}

.co-wrap{max-width:1040px;margin:0 auto;padding:2.5rem 1.5rem 5rem;}
.co-title{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,2.8rem);font-weight:400;color:var(--lhb-brown-dark);margin-bottom:2rem;}
.co-grid{display:grid;grid-template-columns:1fr 360px;gap:2.5rem;align-items:start;}

.sec{background:#fff;border:1px solid rgba(90,62,30,.12);padding:1.75rem;margin-bottom:1.5rem;}
.sec h2{font-family:'Cormorant Garamond',serif;font-size:1.35rem;font-weight:500;color:var(--lhb-brown-dark);margin-bottom:1.25rem;}
.field{margin-bottom:1rem;}
.field label{display:block;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--lhb-text-mid);font-weight:500;margin-bottom:.4rem;}
.field .req{color:var(--lhb-lavender);}
.field input, .field select{width:100%;background:var(--lhb-parchment);border:1px solid rgba(90,62,30,.25);padding:.8rem .9rem;font-family:'Jost',sans-serif;font-size:.9rem;color:var(--lhb-text-dark);}
.field input:focus, .field select:focus{outline:none;border-color:var(--lhb-lavender);}
.row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
.row-3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:1rem;}

.card-stub{background:var(--lhb-cream);border:1px dashed rgba(90,62,30,.35);padding:1.5rem;text-align:center;}
.card-stub .lock{font-size:1.5rem;margin-bottom:.5rem;}
.card-stub p{font-size:.82rem;color:var(--lhb-text-mid);line-height:1.6;}
.card-stub strong{color:var(--lhb-brown-dark);}

.summary{background:#fff;border:1px solid rgba(90,62,30,.12);padding:1.75rem;position:sticky;top:88px;}
.summary h2{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:500;color:var(--lhb-brown-dark);margin-bottom:1.25rem;}
.s-item{display:flex;justify-content:space-between;gap:1rem;font-size:.85rem;color:var(--lhb-text-mid);padding:.4rem 0;}
.s-item .qty{color:var(--lhb-text-muted);}
.s-divider{height:1px;background:rgba(90,62,30,.15);margin:1rem 0;}
.s-row{display:flex;justify-content:space-between;font-size:.88rem;color:var(--lhb-text-mid);padding:.35rem 0;}
.s-row.fee{color:var(--lhb-sage);}
.s-row .free{color:var(--lhb-sage);font-weight:500;}
.s-total{display:flex;justify-content:space-between;align-items:baseline;margin-top:.5rem;padding-top:.85rem;border-top:1px solid rgba(90,62,30,.15);}
.s-total span{font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;color:var(--lhb-text-mid);}
.s-total strong{font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:600;color:var(--lhb-brown-dark);}
.place-btn{display:block;width:100%;background:var(--lhb-moss);color:var(--lhb-parchment);text-align:center;padding:1.05rem;font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;border:none;cursor:pointer;margin-top:1.5rem;transition:background .2s;}
.place-btn:hover{background:var(--lhb-brown-dark);}
.err{background:#F8E5E5;border:1px solid #D9A0A0;color:#8A3030;font-size:.8rem;padding:.7rem .9rem;margin-top:1rem;}
.secure-note{font-size:.7rem;color:var(--lhb-text-muted);text-align:center;margin-top:.85rem;line-height:1.5;}

.placed{max-width:640px;margin:0 auto;text-align:center;padding:4rem 1.5rem;}
.placed .check{width:64px;height:64px;border-radius:50%;background:var(--lhb-sage);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 1.5rem;}
.placed h1{font-family:'Cormorant Garamond',serif;font-size:2.4rem;font-weight:400;color:var(--lhb-brown-dark);margin-bottom:1rem;}
.placed p{font-size:.95rem;color:var(--lhb-text-mid);line-height:1.8;margin-bottom:.75rem;}
.placed .preview-tag{display:inline-block;background:var(--lhb-cream);border:1px solid rgba(90,62,30,.2);color:var(--lhb-text-mid);font-size:.78rem;padding:.6rem 1.1rem;margin:1rem 0 2rem;}
.placed a{display:inline-block;background:var(--lhb-moss);color:var(--lhb-parchment);padding:.85rem 2rem;font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;}

.empty{text-align:center;padding:5rem 1.5rem;}
.empty h2{font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--lhb-brown-dark);margin-bottom:1rem;}
.empty a{display:inline-block;background:var(--lhb-moss);color:var(--lhb-parchment);padding:.85rem 2rem;font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;margin-top:1rem;}

@media(max-width:780px){ .co-grid{grid-template-columns:1fr;} .summary{position:static;} .outsyde-nav{padding:0 1.25rem;} }
`,
        }}
      />

      <div className="checkout">
        <nav className="outsyde-nav">
          <a href="/" className="nav-logo">
            <span className="nav-y">Y</span>
            <span className="nav-wordmark">OUTSYDE</span>
          </a>
          <a href="/cart" className="nav-back">← Back to Cart</a>
        </nav>

        {!mounted ? (
          <div className="co-wrap" />
        ) : placed ? (
          <div className="placed">
            <div className="check">✓</div>
            <h1>Order Validated</h1>
            <p>Thank you, {form.fullName.split(" ")[0] || "friend"}. Your order details and shipping info were captured successfully.</p>
            <div className="preview-tag">Preview mode — live card payment activates Thursday</div>
            <p style={{ fontSize: ".85rem", color: "var(--lhb-text-muted)" }}>
              Order total: <strong>${total.toFixed(2)}</strong> · Confirmation will be sent to {form.email}
            </p>
            <div style={{ marginTop: "2rem" }}>
              <a href="/shop/lotus">Back to Shop</a>
            </div>
          </div>
        ) : cart.length === 0 ? (
          <div className="empty">
            <h2>Your cart is empty</h2>
            <a href="/shop/lotus">Browse Lotus House Blends</a>
          </div>
        ) : (
          <div className="co-wrap">
            <h1 className="co-title">Checkout</h1>
            <div className="co-grid">
              {/* LEFT: forms */}
              <div>
                <div className="sec">
                  <h2>Contact</h2>
                  <div className="field">
                    <label>Email <span className="req">*</span></label>
                    <input type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" />
                  </div>
                </div>

                <div className="sec">
                  <h2>Shipping Address</h2>
                  <div className="field">
                    <label>Full Name <span className="req">*</span></label>
                    <input type="text" value={form.fullName} onChange={set("fullName")} />
                  </div>
                  <div className="field">
                    <label>Address <span className="req">*</span></label>
                    <input type="text" value={form.addressLine1} onChange={set("addressLine1")} placeholder="Street address" />
                  </div>
                  <div className="row-3">
                    <div className="field">
                      <label>City <span className="req">*</span></label>
                      <input type="text" value={form.city} onChange={set("city")} />
                    </div>
                    <div className="field">
                      <label>State <span className="req">*</span></label>
                      <input type="text" value={form.state} onChange={set("state")} />
                    </div>
                    <div className="field">
                      <label>ZIP <span className="req">*</span></label>
                      <input type="text" value={form.zipCode} onChange={set("zipCode")} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Country <span className="req">*</span></label>
                    <select value={form.country} onChange={set("country")}>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>
                </div>

                <div className="sec">
                  <h2>Payment</h2>
                  {/* CARD ELEMENT — Stripe Elements mounts here Thursday */}
                  <div className="card-stub">
                    <div className="lock">🔒</div>
                    <p><strong>Secure card payment</strong><br />Card entry activates Thursday with Stripe. Your form &amp; totals below are final.</p>
                  </div>
                </div>
              </div>

              {/* RIGHT: order summary with FEE MATH */}
              <aside className="summary">
                <h2>Order Summary</h2>
                {cart.map((i) => (
                  <div className="s-item" key={i.id}>
                    <span>{i.name} <span className="qty">×{i.qty}</span></span>
                    <span>${(i.price * i.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="s-divider" />
                <div className="s-row">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="s-row fee">
                  <span>Service fee (8%)</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="s-row">
                  <span>Shipping</span>
                  <span className="free">Free</span>
                </div>
                <div className="s-total">
                  <span>Total</span>
                  <strong>${total.toFixed(2)}</strong>
                </div>

                <button className="place-btn" onClick={handlePlaceOrder}>Place Order</button>
                {error && <div className="err">{error}</div>}
                <p className="secure-note">{vendors.length > 1 ? `Order includes ${vendors.length} vendors · ` : ""}Payments secured by Stripe.</p>
              </aside>
            </div>
          </div>
        )}
      </div>
    </>
  );
}