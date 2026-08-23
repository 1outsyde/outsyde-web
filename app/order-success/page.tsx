// app/order-success/page.tsx
// Post-payment confirmation screen — mirrors OrderSuccessScreen.tsx from OutsydeCapture.
// Reads params from URL: ?itemCount=N&totalCharged=X&pointsEarned=Y&orderId=Z

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OrderSuccessContent() {
  const params = useSearchParams();
  const [visible, setVisible] = useState(false);

  const itemCount = Number(params.get("itemCount") || "0");
  const totalCharged = Number(params.get("totalCharged") || "0"); // cents
  const pointsEarned = Number(params.get("pointsEarned") || "0");
  const orderId = params.get("orderId") || params.get("orderGroupId") || "";

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{
  --gold:#E8B930; --gold-soft:#C8A882; --emerald:#1A3C34; --emerald-light:#244e44;
  --bg:#0a0a0a; --card:#141414; --line:#2a2a2a; --cream:#EDE3CC; --muted:#8a8478;
}
.os-page{font-family:'Hanken Grotesk',sans-serif;background:var(--bg);color:#fff;min-height:100vh;display:flex;flex-direction:column;}
.nav{background:#000;padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);}
.nav a{text-decoration:none;}
.nav-y{font-family:'Bebas Neue',sans-serif;font-size:1.9rem;color:var(--gold);letter-spacing:1px;}
.os-body{flex:1;display:flex;align-items:center;justify-content:center;padding:3rem 1.5rem;}
.os-card{max-width:480px;width:100%;text-align:center;}
.check-wrap{margin:0 auto 2rem;width:80px;height:80px;}
.check-circle{
  width:80px;height:80px;border-radius:50%;background:var(--emerald);
  border:2px solid var(--emerald-light);
  display:flex;align-items:center;justify-content:center;
  transform:scale(0);opacity:0;
  transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .3s ease;
}
.check-circle.visible{transform:scale(1);opacity:1;}
.check-icon{color:var(--gold);font-size:2.2rem;line-height:1;}
.os-heading{font-family:'Bebas Neue',sans-serif;font-size:2.8rem;letter-spacing:4px;color:var(--gold);margin-bottom:.5rem;}
.os-sub{color:var(--muted);font-size:.82rem;letter-spacing:.08em;margin-bottom:2rem;}
.points-badge{
  display:inline-block;background:rgba(232,185,48,.1);border:1px solid rgba(232,185,48,.35);
  color:var(--gold);font-size:.8rem;letter-spacing:.06em;padding:.5rem 1.25rem;border-radius:999px;
  margin-bottom:2rem;
}
.summary-card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:1.5rem;margin-bottom:2rem;text-align:left;}
.summary-row{display:flex;justify-content:space-between;align-items:baseline;padding:.5rem 0;border-bottom:1px solid #1e1e1e;font-size:.9rem;}
.summary-row:last-child{border-bottom:none;}
.summary-row .sr-label{color:var(--muted);}
.summary-row .sr-value{color:var(--cream);font-weight:500;}
.summary-row .sr-value.gold{color:var(--gold);}
.cta-group{display:flex;flex-direction:column;gap:.85rem;}
.btn-primary{
  display:block;padding:1rem;background:var(--emerald);color:var(--gold);
  border:1px solid var(--emerald-light);border-radius:8px;
  font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:3px;
  text-decoration:none;cursor:pointer;transition:background .2s;
}
.btn-primary:hover{background:var(--emerald-light);}
.btn-ghost{
  display:block;padding:1rem;background:transparent;color:var(--muted);
  border:1px solid var(--line);border-radius:8px;
  font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;
  text-decoration:none;cursor:pointer;transition:color .2s,border-color .2s;
}
.btn-ghost:hover{color:var(--cream);border-color:#444;}
@media(max-width:600px){.nav{padding:0 1.25rem;}}
`,
        }}
      />

      <div className="os-page">
        <nav className="nav">
          <a href="/"><span className="nav-y">Y OUTSYDE</span></a>
        </nav>

        <div className="os-body">
          <div className="os-card">
            <div className="check-wrap">
              <div className={`check-circle${visible ? " visible" : ""}`}>
                <span className="check-icon">✓</span>
              </div>
            </div>

            <h1 className="os-heading">Order Placed!</h1>
            <p className="os-sub">Your payment went through and your order is being prepared.</p>

            {pointsEarned > 0 && (
              <div className="points-badge">
                +{pointsEarned} Outsyde Points Earned
              </div>
            )}

            <div className="summary-card">
              {itemCount > 0 && (
                <div className="summary-row">
                  <span className="sr-label">Items</span>
                  <span className="sr-value">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                </div>
              )}
              {totalCharged > 0 && (
                <div className="summary-row">
                  <span className="sr-label">Total Charged</span>
                  <span className="sr-value gold">${(totalCharged / 100).toFixed(2)}</span>
                </div>
              )}
              {orderId && (
                <div className="summary-row">
                  <span className="sr-label">Order ID</span>
                  <span className="sr-value" style={{ fontSize: ".78rem", fontFamily: "monospace" }}>{orderId}</span>
                </div>
              )}
            </div>

            <div className="cta-group">
              <a href="/account/orders" className="btn-primary">View Orders</a>
              <a href="/" className="btn-ghost">Continue Shopping</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0a0a0a", minHeight: "100vh" }} />}>
      <OrderSuccessContent />
    </Suspense>
  );
}
