// app/shop/lotus/checkout/page.tsx
// Outsyde Checkout — native Stripe Elements with ADDRESS AUTOCOMPLETE.
// Refined emerald/gold theme, vendor-grouped summary, PO boxes allowed.
//
// REQUIRES:  npm install @stripe/stripe-js @stripe/react-stripe-js
// NEEDS in .env.local:  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_test_… first)

"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, CardElement, AddressElement, useStripe, useElements,
} from "@stripe/react-stripe-js";
import { getCart, clearCart, subscribe, type CartItem } from "@/lib/cart";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");
const SERVICE_FEE_RATE = 0.05;

const appearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#1A3C34",
    colorBackground: "#1e1e1e",
    colorText: "#EDE3CC",
    colorTextPlaceholder: "#666666",
    colorDanger: "#ff5555",
    fontFamily: "'Hanken Grotesk', Helvetica, Arial, sans-serif",
    borderRadius: "6px",
  },
  rules: {
    ".Input": { border: "1px solid #333333", backgroundColor: "#1e1e1e" },
    ".Input:focus": { border: "1px solid #E8B930", boxShadow: "none" },
    ".Label": { color: "#8a8478", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" },
  },
};

type AddrValue = {
  name: string;
  address: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string };
};

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise} options={{ appearance }}>
      <CheckoutForm />
    </Elements>
  );
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState("");
  const [cardError, setCardError] = useState("");

  const [f, setF] = useState({ email: "", phone: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const [shipAddr, setShipAddr] = useState<AddrValue | null>(null);
  const [shipComplete, setShipComplete] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [billAddr, setBillAddr] = useState<AddrValue | null>(null);
  const [billComplete, setBillComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCart(getCart());
    return subscribe(() => setCart(getCart()));
  }, []);

  const subtotalCents = cart.reduce((c, i) => c + Math.round(i.price * 100) * i.qty, 0);
  const feeCents = Math.round(subtotalCents * SERVICE_FEE_RATE);
  const totalCents = subtotalCents + feeCents;
  const subtotal = subtotalCents / 100;
  const fee = feeCents / 100;
  const total = totalCents / 100;

  const vendors = Array.from(new Set(cart.map((i) => i.vendorId))).map((vid) => {
    const vItems = cart.filter((i) => i.vendorId === vid);
    return {
      vendorId: vid,
      vendor: vItems[0]?.vendor || "Vendor",
      items: vItems,
      subtotal: vItems.reduce((s, i) => s + i.price * i.qty, 0),
    };
  });

  async function handlePay() {
    setError("");
    if (!stripe || !elements) return;

    if (!f.email.includes("@")) return setError("Please enter a valid email.");
    if (!f.phone.trim()) return setError("Please enter a phone number.");
    if (!shipComplete || !shipAddr) return setError("Please complete your shipping address.");
    if (!billingSame && (!billComplete || !billAddr)) return setError("Please complete your billing address.");
    if (!cart.length) return setError("Your cart is empty.");

    setProcessing(true);
    try {
      const sv = shipAddr;
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ id: i.id, name: i.name, qty: i.qty })),
          shipping: {
            fullName: sv.name,
            addressLine1: sv.address.line1,
            city: sv.address.city,
            state: sv.address.state,
            zipCode: sv.address.postal_code,
            country: sv.address.country,
          },
          email: f.email,
          phone: f.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setProcessing(false);
        return setError(data.error || "Could not start payment. Please try again.");
      }

      const ba = billingSame ? shipAddr : (billAddr as AddrValue);
      const card = elements.getElement(CardElement);
      if (!card) { setProcessing(false); return setError("Card field not ready."); }

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: ba.name, email: f.email, phone: f.phone,
            address: {
              line1: ba.address.line1, city: ba.address.city, state: ba.address.state,
              postal_code: ba.address.postal_code, country: ba.address.country,
            },
          },
        },
        shipping: {
          name: sv.name, phone: f.phone,
          address: {
            line1: sv.address.line1, city: sv.address.city, state: sv.address.state,
            postal_code: sv.address.postal_code, country: sv.address.country,
          },
        },
      });

      if (result.error) {
        setError(result.error.message || "Payment failed.");
        setProcessing(false);
      } else if (result.paymentIntent?.status === "succeeded") {
        clearCart();
        setSucceeded(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setProcessing(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setProcessing(false);
    }
  }

  const firstName = shipAddr?.name?.split(" ")[0] || "friend";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{ --gold:#E8B930; --gold-soft:#C8A882; --emerald:#1A3C34; --emerald-light:#244e44; --bg:#0a0a0a; --card:#141414; --line:#2a2a2a; --input:#1e1e1e; --cream:#EDE3CC; --muted:#8a8478; }
.co{font-family:'Hanken Grotesk',sans-serif;background:var(--bg);color:#fff;min-height:100vh;}
.nav{background:#000;padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;border-bottom:1px solid var(--line);}
.nav a{text-decoration:none;}
.nav-y{font-family:'Bebas Neue',sans-serif;font-size:1.9rem;color:var(--gold);letter-spacing:1px;}
.nav-back{color:var(--muted);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;}
.nav-back:hover{color:var(--gold);}
.wrap{max-width:780px;margin:0 auto;padding:2.5rem 1.5rem 5rem;}
.head{text-align:center;padding-bottom:1.5rem;margin-bottom:2rem;border-bottom:1px solid var(--line);}
.head h1{font-family:'Bebas Neue',sans-serif;font-size:2.1rem;letter-spacing:4px;color:var(--gold);}
.head p{color:var(--muted);font-size:.7rem;letter-spacing:3px;text-transform:uppercase;margin-top:.25rem;}
.label-sec{color:var(--gold-soft);font-size:.64rem;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;margin-bottom:.85rem;font-family:'Hanken Grotesk';}
.summary{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:1.25rem 1.4rem;margin-bottom:1.75rem;}
.vgroup{margin-bottom:.35rem;}
.vbar{display:flex;justify-content:space-between;align-items:center;background:var(--emerald);padding:.55rem .85rem;border-radius:5px;margin:.5rem 0 .35rem;}
.vbar .vname{color:var(--cream);font-size:.64rem;letter-spacing:.18em;text-transform:uppercase;font-weight:600;}
.vbar .vsub{color:var(--gold-soft);font-size:.8rem;}
.srow{display:flex;justify-content:space-between;align-items:center;padding:.5rem .3rem;font-size:.9rem;border-bottom:1px solid #1e1e1e;}
.srow:last-of-type{border-bottom:none;}
.srow .nm{color:var(--cream);} .srow .nm .q{color:#888;} .srow .pr{color:var(--cream);}
.feerow{display:flex;justify-content:space-between;font-size:.82rem;color:var(--muted);padding:.35rem 0;}
.feerow.free{color:#7CB342;}
.totrow{display:flex;justify-content:space-between;align-items:center;padding-top:.85rem;margin-top:.5rem;border-top:1px solid var(--gold);}
.totrow .tl{color:var(--gold);font-size:.95rem;font-weight:600;letter-spacing:1px;text-transform:uppercase;}
.totrow .ta{color:var(--gold);font-size:1.4rem;font-weight:600;font-family:'Bebas Neue';letter-spacing:1px;}
.taxnote{font-size:.68rem;color:#666;margin-top:.5rem;}
.sec{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:1.4rem;margin-bottom:1.25rem;}
.fg{margin-bottom:.85rem;}
.fg label{display:block;color:var(--muted);font-size:.66rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:.4rem;}
.fg input{width:100%;padding:.7rem .85rem;border:1px solid #333;border-radius:6px;background:var(--input);color:#fff;font-size:.9rem;font-family:'Hanken Grotesk';outline:none;transition:border-color .2s;}
.fg input::placeholder{color:#555;}
.fg input:focus{border-color:var(--gold);}
.split{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;}
.same-toggle{display:flex;align-items:center;gap:.55rem;font-size:.82rem;color:#ccc;cursor:pointer;margin-bottom:1.25rem;}
.same-toggle input{width:16px;height:16px;accent-color:var(--emerald-light);cursor:pointer;}
#card-box{padding:.85rem;border:1px solid #333;border-radius:6px;background:var(--input);}
.card-err{color:#ff5555;font-size:.78rem;margin-top:.5rem;min-height:1rem;}
.gen-err{background:#2a0a0a;border:1px solid #ff4444;border-radius:6px;color:#ff6b6b;font-size:.82rem;padding:.7rem 1rem;margin-bottom:1rem;}
.pay{width:100%;padding:1.05rem;background:var(--emerald);color:var(--gold);border:1px solid var(--emerald-light);border-radius:8px;font-family:'Bebas Neue';font-size:1.2rem;letter-spacing:3px;cursor:pointer;transition:background .2s,opacity .2s;margin-bottom:1rem;}
.pay:hover{background:var(--emerald-light);}
.pay:disabled{opacity:.5;cursor:not-allowed;}
.secure{text-align:center;color:#555;font-size:.72rem;}
.empty{text-align:center;padding:5rem 1.5rem;color:var(--muted);}
.empty a{color:var(--gold);text-decoration:underline;}
.done{text-align:center;padding:4rem 1.5rem;max-width:560px;margin:0 auto;}
.done .ck{width:64px;height:64px;border-radius:50%;background:var(--emerald);color:var(--gold);display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 1.5rem;}
.done h1{font-family:'Bebas Neue';font-size:2.6rem;letter-spacing:3px;color:var(--gold);margin-bottom:1rem;}
.done p{color:#ccc;font-size:.95rem;line-height:1.8;margin-bottom:.6rem;}
.done a{display:inline-block;margin-top:1.5rem;background:var(--emerald);color:var(--gold);padding:.85rem 2rem;font-family:'Bebas Neue';letter-spacing:2px;text-decoration:none;border-radius:6px;border:1px solid var(--emerald-light);}
@media(max-width:600px){ .nav{padding:0 1.25rem;} }
`,
        }}
      />

      <div className="co">
        <nav className="nav">
          <a href="/"><span className="nav-y">Y OUTSYDE</span></a>
          <a href="/cart" className="nav-back">← Back to Cart</a>
        </nav>

        {!mounted ? (
          <div className="wrap" />
        ) : succeeded ? (
          <div className="done">
            <div className="ck">✓</div>
            <h1>Order Confirmed</h1>
            <p>Thank you, {firstName}! Your payment went through and your order is being prepared.</p>
            <p style={{ color: "#888", fontSize: ".85rem" }}>A confirmation has been sent to {f.email}.</p>
            <a href="/shop/lotus">Continue Shopping</a>
          </div>
        ) : cart.length === 0 ? (
          <div className="empty">
            <p>Your cart is empty.</p>
            <p style={{ marginTop: "1rem" }}><a href="/shop/lotus">Browse Lotus House Blends</a></p>
          </div>
        ) : (
          <div className="wrap">
            <div className="head">
              <h1>Go Outsyde</h1>
              <p>Secure Checkout</p>
            </div>

            <div className="label-sec">Order Summary</div>
            <div className="summary">
              {vendors.map((v) => (
                <div className="vgroup" key={v.vendorId}>
                  <div className="vbar">
                    <span className="vname">{v.vendor}</span>
                    <span className="vsub">${v.subtotal.toFixed(2)}</span>
                  </div>
                  {v.items.map((i) => (
                    <div className="srow" key={i.id}>
                      <span className="nm">{i.name} <span className="q">×{i.qty}</span></span>
                      <span className="pr">${(i.price * i.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="feerow" style={{ marginTop: "1rem" }}>
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="feerow">
                <span>Service fee</span><span>${fee.toFixed(2)}</span>
              </div>
              <div className="feerow free">
                <span>Shipping</span><span>Free</span>
              </div>
              <div className="totrow">
                <span className="tl">Total</span>
                <span className="ta">${total.toFixed(2)}</span>
              </div>
              <p className="taxnote">Sales tax applied at payment where applicable.</p>
            </div>

            <div className="sec">
              <div className="label-sec">Contact</div>
              <div className="split">
                <div className="fg"><label>Email</label><input type="email" value={f.email} onChange={set("email")} placeholder="you@email.com" /></div>
                <div className="fg"><label>Phone</label><input type="tel" value={f.phone} onChange={set("phone")} placeholder="(555) 555-5555" /></div>
              </div>
            </div>

            <div className="sec">
              <div className="label-sec">Shipping Address</div>
              <AddressElement
                options={{
                  mode: "shipping",
                  fields: { phone: "never" },
                  autocomplete: { mode: "google_maps_api", apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "" },
                  allowedCountries: ["US", "CA"],
                }}
                onChange={(e) => { setShipAddr(e.value as AddrValue); setShipComplete(e.complete); }}
              />
            </div>

            <label className="same-toggle">
              <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} />
              Billing address same as shipping
            </label>

            {!billingSame && (
              <div className="sec">
                <div className="label-sec">Billing Address</div>
                <AddressElement
                  options={{
                    mode: "billing",
                    fields: { phone: "never" },
                    autocomplete: { mode: "google_maps_api", apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "" },
                    allowedCountries: ["US", "CA"],
                  }}
                  onChange={(e) => { setBillAddr(e.value as AddrValue); setBillComplete(e.complete); }}
                />
              </div>
            )}

            <div className="sec">
              <div className="label-sec">Card Details</div>
              <div id="card-box">
                <CardElement
                  options={{
                    style: {
                      base: {
                        color: "#ffffff",
                        fontFamily: "'Hanken Grotesk', Helvetica, Arial, sans-serif",
                        fontSize: "15px",
                        iconColor: "#E8B930",
                        "::placeholder": { color: "#666" },
                      },
                      invalid: { color: "#ff5555", iconColor: "#ff5555" },
                    },
                  }}
                  onChange={(e) => setCardError(e.error ? e.error.message : "")}
                />
              </div>
              <div className="card-err">{cardError}</div>
            </div>

            {error && <div className="gen-err">{error}</div>}

            <button className="pay" onClick={handlePay} disabled={!stripe || processing}>
              {processing ? "Processing…" : `Pay $${total.toFixed(2)}`}
            </button>
            <p className="secure">🔒 Payments secured by Stripe. Your card details never touch our servers.</p>
          </div>
        )}
      </div>
    </>
  );
}