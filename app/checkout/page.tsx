// app/checkout/page.tsx
// Universal multi-vendor checkout — mirrors CartCheckoutScreen.tsx logic.
// Calls outsyde-backend POST /api/cart/payment-intent via /api/checkout BFF.
// Backend handles all fee math, PI creation, vendor routing, emails, and points.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  AddressElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getCart, clearCart, subscribe, type CartItem } from "@/lib/cart";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

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
    ".Label": { color: "#8a8478", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "1px" },
  },
};

type AddrValue = {
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
};

interface FeeBreakdown {
  basePriceCents: number;
  consumerUpchargeCents: number;
  vendorPayoutCents?: number;
  platformFeeCents?: number;
  totalChargedToConsumerCents: number;
  outsydePointsEarned?: number;
}

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
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [cardError, setCardError] = useState("");

  const [f, setF] = useState({ email: "", phone: "" });
  const setField = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const [shipAddr, setShipAddr] = useState<AddrValue | null>(null);
  const [shipComplete, setShipComplete] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [billAddr, setBillAddr] = useState<AddrValue | null>(null);
  const [billComplete, setBillComplete] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discountCents: number;
    codeId: string;
    message: string;
  } | null>(null);

  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);

  useEffect(() => {
    setMounted(true);
    setCart(getCart());
    const unsub = subscribe(() => setCart(getCart()));

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated) {
          router.push("/login?redirect=/checkout");
        } else {
          setAuthed(true);
        }
      })
      .catch(() => {
        router.push("/login?redirect=/checkout");
      });

    return unsub;
  }, [router]);

  // Vendor-grouped cart for display
  const vendors = Array.from(new Set(cart.map((i) => i.vendorId))).map((vid) => {
    const vItems = cart.filter((i) => i.vendorId === vid);
    return {
      vendorId: vid,
      vendor: vItems[0]?.vendor || "Vendor",
      items: vItems,
      subtotalCents: vItems.reduce((s, i) => s + i.priceCents * i.qty, 0),
    };
  });

  // Fee preview (client-side, updated by backend response after PI creation)
  const subtotalCents = cart.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const serviceFeeCents = Math.round(subtotalCents * 0.08);
  const discountCents = promoResult?.valid ? promoResult.discountCents : 0;
  const estimatedTotalCents = subtotalCents + serviceFeeCents - discountCents;

  // After backend responds, show authoritative breakdown
  const displaySubtotal = feeBreakdown
    ? feeBreakdown.basePriceCents / 100
    : subtotalCents / 100;
  const displayFee = feeBreakdown
    ? feeBreakdown.consumerUpchargeCents / 100
    : serviceFeeCents / 100;
  const displayTotal = feeBreakdown
    ? feeBreakdown.totalChargedToConsumerCents / 100
    : estimatedTotalCents / 100;
  const displayPoints = feeBreakdown?.outsydePointsEarned ?? 0;

  async function handleValidatePromo() {
    if (!promoCode.trim()) return;
    setPromoValidating(true);
    setPromoResult(null);
    try {
      const res = await fetch("/api/checkout/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setPromoResult({
          valid: true,
          discountCents: data.discountCents,
          codeId: data.codeId,
          message: `−$${(data.discountCents / 100).toFixed(2)} applied`,
        });
      } else {
        setPromoResult({
          valid: false,
          discountCents: 0,
          codeId: "",
          message: data.error || "Invalid or expired code.",
        });
      }
    } catch {
      setPromoResult({ valid: false, discountCents: 0, codeId: "", message: "Could not validate code." });
    } finally {
      setPromoValidating(false);
    }
  }

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

      // Step 1 — Create PaymentIntent via backend
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.id,
            vendorId: i.vendorId,
            priceCents: i.priceCents,
            quantity: i.qty,
            name: i.name,
          })),
          shippingAddress: {
            line1: sv.address.line1,
            city: sv.address.city,
            state: sv.address.state,
            zipCode: sv.address.postal_code,
          },
          ...(promoResult?.valid ? { promoCodeId: promoResult.codeId } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg: string = (data as { error?: string }).error ?? "";
        if (msg.includes("ADDRESS_REQUIRED") || msg.includes("INVALID_ADDRESS")) {
          setError("Please check your shipping address and try again.");
        } else if (msg.includes("STRIPE_NOT_ONBOARDED")) {
          setError("One or more items cannot be purchased right now. Please contact support.");
        } else {
          setError(msg || "Could not start payment. Please try again.");
        }
        setProcessing(false);
        return;
      }

      const { clientSecret, feeBreakdown: fb, orderId, orderGroupId } = data as {
        clientSecret?: string;
        feeBreakdown?: FeeBreakdown;
        orderId?: string;
        orderGroupId?: string;
      };

      if (!clientSecret) {
        setError("Payment could not be initialized. Please try again.");
        setProcessing(false);
        return;
      }

      if (fb) setFeeBreakdown(fb);

      // Step 2 — Confirm card payment
      const ba = billingSame ? sv : (billAddr as AddrValue);
      const card = elements.getElement(CardElement);
      if (!card) {
        setError("Card field not ready.");
        setProcessing(false);
        return;
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: ba.name,
            email: f.email,
            phone: f.phone,
            address: {
              line1: ba.address.line1,
              city: ba.address.city,
              state: ba.address.state,
              postal_code: ba.address.postal_code,
              country: ba.address.country,
            },
          },
        },
        shipping: {
          name: sv.name,
          phone: f.phone,
          address: {
            line1: sv.address.line1,
            city: sv.address.city,
            state: sv.address.state,
            postal_code: sv.address.postal_code,
            country: sv.address.country,
          },
        },
      });

      if (result.error) {
        setError(result.error.message || "Payment failed. Please try again.");
        setProcessing(false);
        return;
      }

      if (result.paymentIntent?.status === "succeeded") {
        const itemCount = cart.reduce((n, i) => n + i.qty, 0);
        const totalCharged = fb?.totalChargedToConsumerCents ?? estimatedTotalCents;
        const pointsEarned = fb?.outsydePointsEarned ?? 0;
        clearCart();
        const params = new URLSearchParams({
          itemCount: String(itemCount),
          totalCharged: String(totalCharged),
          pointsEarned: String(pointsEarned),
          ...(orderId ? { orderId } : {}),
          ...(orderGroupId ? { orderGroupId } : {}),
        });
        router.push(`/order-success?${params.toString()}`);
      } else {
        setProcessing(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setProcessing(false);
    }
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{
  --gold:#E8B930; --gold-soft:#C8A882; --emerald:#1A3C34; --emerald-light:#244e44;
  --bg:#0a0a0a; --card:#141414; --line:#2a2a2a; --input:#1e1e1e; --cream:#EDE3CC; --muted:#8a8478;
}
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
.label-sec{color:var(--gold-soft);font-size:.64rem;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;margin-bottom:.85rem;}
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
.feerow.discount{color:#7CB342;}
.totrow{display:flex;justify-content:space-between;align-items:center;padding-top:.85rem;margin-top:.5rem;border-top:1px solid var(--gold);}
.totrow .tl{color:var(--gold);font-size:.95rem;font-weight:600;letter-spacing:1px;text-transform:uppercase;}
.totrow .ta{color:var(--gold);font-size:1.4rem;font-weight:600;font-family:'Bebas Neue';letter-spacing:1px;}
.taxnote{font-size:.68rem;color:#666;margin-top:.5rem;}
.points-note{font-size:.75rem;color:#7CB342;margin-top:.4rem;}
.sec{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:1.4rem;margin-bottom:1.25rem;}
.fg{margin-bottom:.85rem;}
.fg label{display:block;color:var(--muted);font-size:.66rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:.4rem;}
.fg input{width:100%;padding:.7rem .85rem;border:1px solid #333;border-radius:6px;background:var(--input);color:#fff;font-size:.9rem;font-family:'Hanken Grotesk';outline:none;transition:border-color .2s;}
.fg input::placeholder{color:#555;}
.fg input:focus{border-color:var(--gold);}
.split{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;}
.promo-row{display:flex;gap:.6rem;margin-bottom:.85rem;}
.promo-row input{flex:1;padding:.7rem .85rem;border:1px solid #333;border-radius:6px;background:var(--input);color:#fff;font-size:.9rem;font-family:'Hanken Grotesk';outline:none;transition:border-color .2s;}
.promo-row input:focus{border-color:var(--gold);}
.promo-row button{padding:.7rem 1.1rem;background:var(--emerald);color:var(--gold);border:1px solid var(--emerald-light);border-radius:6px;font-size:.75rem;letter-spacing:1px;cursor:pointer;white-space:nowrap;font-family:'Hanken Grotesk';}
.promo-row button:disabled{opacity:.5;cursor:not-allowed;}
.promo-msg{font-size:.75rem;margin-top:.3rem;}
.promo-msg.ok{color:#7CB342;}
.promo-msg.err{color:#ff5555;}
.same-toggle{display:flex;align-items:center;gap:.55rem;font-size:.82rem;color:#ccc;cursor:pointer;margin-bottom:1.25rem;}
.same-toggle input{width:16px;height:16px;accent-color:var(--emerald-light);cursor:pointer;}
#card-box{padding:.85rem;border:1px solid #333;border-radius:6px;background:var(--input);}
.card-err{color:#ff5555;font-size:.78rem;margin-top:.5rem;min-height:1rem;}
.gen-err{background:#2a0a0a;border:1px solid #ff4444;border-radius:6px;color:#ff6b6b;font-size:.82rem;padding:.7rem 1rem;margin-bottom:1rem;}
.pay{width:100%;padding:1.05rem;background:var(--emerald);color:var(--gold);border:1px solid var(--emerald-light);border-radius:8px;font-family:'Bebas Neue';font-size:1.2rem;letter-spacing:3px;cursor:pointer;transition:background .2s,opacity .2s;margin-bottom:1rem;}
.pay:hover{background:var(--emerald-light);}
.pay:disabled{opacity:.5;cursor:not-allowed;}
.secure{text-align:center;color:#555;font-size:.72rem;}
.refund-note{font-size:.7rem;color:var(--muted);margin-top:1rem;line-height:1.7;text-align:center;}
.empty{text-align:center;padding:5rem 1.5rem;color:var(--muted);}
.empty a{color:var(--gold);text-decoration:underline;}
.loading-auth{display:flex;align-items:center;justify-content:center;min-height:50vh;color:var(--muted);}
@media(max-width:600px){.nav{padding:0 1.25rem;}.split{grid-template-columns:1fr;}}
`,
        }}
      />

      <div className="co">
        <nav className="nav">
          <a href="/"><span className="nav-y">Y OUTSYDE</span></a>
          <a href="/cart" className="nav-back">← Back to Cart</a>
        </nav>

        {!mounted || authed === null ? (
          <div className="loading-auth">Verifying session…</div>
        ) : cart.length === 0 ? (
          <div className="empty">
            <p>Your cart is empty.</p>
            <p style={{ marginTop: "1rem" }}><a href="/">Browse the shop</a></p>
          </div>
        ) : (
          <div className="wrap">
            <div className="head">
              <h1>Go Outsyde</h1>
              <p>Secure Checkout</p>
            </div>

            {/* Order Summary */}
            <div className="label-sec">Order Summary</div>
            <div className="summary">
              {vendors.map((v) => (
                <div className="vgroup" key={v.vendorId}>
                  <div className="vbar">
                    <span className="vname">{v.vendor}</span>
                    <span className="vsub">${(v.subtotalCents / 100).toFixed(2)}</span>
                  </div>
                  {v.items.map((i) => (
                    <div className="srow" key={i.id}>
                      <span className="nm">{i.name} <span className="q">×{i.qty}</span></span>
                      <span className="pr">${((i.priceCents / 100) * i.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ))}

              <div style={{ marginTop: "1rem" }}>
                <div className="feerow"><span>Subtotal</span><span>${displaySubtotal.toFixed(2)}</span></div>
                <div className="feerow"><span>Outsyde Service Fee (8%)</span><span>${displayFee.toFixed(2)}</span></div>
                {promoResult?.valid && (
                  <div className="feerow discount">
                    <span>Promo Code Discount</span>
                    <span>−${(promoResult.discountCents / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="feerow free"><span>Shipping</span><span>Free</span></div>
              </div>

              <div className="totrow">
                <span className="tl">Total</span>
                <span className="ta">${displayTotal.toFixed(2)}</span>
              </div>
              <p className="taxnote">Sales tax applied at payment where applicable.</p>
              {displayPoints > 0 && (
                <p className="points-note">You&apos;ll earn {displayPoints} Outsyde Points</p>
              )}
            </div>

            {/* Contact */}
            <div className="sec">
              <div className="label-sec">Contact</div>
              <div className="split">
                <div className="fg">
                  <label>Email</label>
                  <input type="email" value={f.email} onChange={setField("email")} placeholder="you@email.com" />
                </div>
                <div className="fg">
                  <label>Phone</label>
                  <input type="tel" value={f.phone} onChange={setField("phone")} placeholder="(555) 555-5555" />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="sec">
              <div className="label-sec">Shipping Address</div>
              <AddressElement
                options={{
                  mode: "shipping",
                  fields: { phone: "never" },
                  autocomplete: {
                    mode: "google_maps_api",
                    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
                  },
                  allowedCountries: ["US", "CA"],
                }}
                onChange={(e) => {
                  setShipAddr(e.value as AddrValue);
                  setShipComplete(e.complete);
                }}
              />
            </div>

            {/* Billing toggle */}
            <label className="same-toggle">
              <input
                type="checkbox"
                checked={billingSame}
                onChange={(e) => setBillingSame(e.target.checked)}
              />
              Billing address same as shipping
            </label>

            {!billingSame && (
              <div className="sec">
                <div className="label-sec">Billing Address</div>
                <AddressElement
                  options={{
                    mode: "billing",
                    fields: { phone: "never" },
                    autocomplete: {
                      mode: "google_maps_api",
                      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
                    },
                    allowedCountries: ["US", "CA"],
                  }}
                  onChange={(e) => {
                    setBillAddr(e.value as AddrValue);
                    setBillComplete(e.complete);
                  }}
                />
              </div>
            )}

            {/* Promo Code */}
            <div className="sec">
              <div className="label-sec">Promo / Points Code</div>
              <div className="promo-row">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoResult(null);
                  }}
                  placeholder="Enter code"
                />
                <button
                  onClick={handleValidatePromo}
                  disabled={promoValidating || !promoCode.trim()}
                >
                  {promoValidating ? "Checking…" : "Apply"}
                </button>
              </div>
              {promoResult && (
                <div className={`promo-msg ${promoResult.valid ? "ok" : "err"}`}>
                  {promoResult.message}
                </div>
              )}
            </div>

            {/* Card Details */}
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

            <button
              className="pay"
              onClick={handlePay}
              disabled={!stripe || processing}
            >
              {processing ? "Processing…" : `Pay $${displayTotal.toFixed(2)}`}
            </button>

            <p className="secure">🔒 Payments secured by Stripe. Your card details never touch our servers.</p>

            <p className="refund-note">
              Orders can be cancelled for a full refund before shipment. Once shipped, all sales are final
              unless the item arrives damaged or not as described. Contact{" "}
              <a href="mailto:info@goutsyde.com" style={{ color: "var(--gold-soft)" }}>info@goutsyde.com</a>
              {" "}within 7 days of delivery to report an issue.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
