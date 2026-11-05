"use client";

/**
 * Requests and quotes in My Activity (Quotes step 5b): the customer's quote requests and quotes. Each quote opens
 * its goutsyde.com quote page (/q/<code>). Same look as Bookings and Orders.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listChip, money, requestChip, whenLine, type Quote } from "@/app/q/[code]/quoteLogic";

interface RequestRow { id: string; status: string; businessName: string | null; serviceName: string | null; createdAt: string; }

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function load() {
      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      if (!me?.authenticated) { router.push(`/login?return=${encodeURIComponent("/account/quotes")}`); return; }
      const [q, r] = await Promise.all([fetch("/api/me/quotes", { cache: "no-store" }), fetch("/api/me/requests", { cache: "no-store" })]);
      const qb = await q.json().catch(() => null);
      const rb = await r.json().catch(() => null);
      if (!q.ok || !r.ok) setFailed(true);
      setQuotes(Array.isArray(qb?.quotes) ? qb.quotes : []);
      setRequests(Array.isArray(rb?.requests) ? rb.requests : []);
      setLoading(false);
    }
    load();
  }, [router]);

  // A request that already has a quote shows as the quote; the rest show as waiting.
  const waiting = requests.filter((r) => r.status === "new" || r.status === "called");

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #000; color: #F5F0E6; font-family: 'Hanken Grotesk', 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    .nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 56px; height: 66px;
      border-bottom: 1px solid rgba(245,240,230,0.08);
      position: sticky; top: 0; z-index: 50;
      background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
    }
    .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.12em; color: #E8B930; }
    .nav-links { display: flex; gap: 32px; }
    .nav-links a { font-size: 13px; color: rgba(245,240,230,0.55); }
    .nav-links a:hover { color: #F5F0E6; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 48px 56px 80px; }
    .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(245,240,230,0.35); margin-bottom: 12px; }
    .breadcrumb a:hover { color: #E8B930; }
    .page-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 0.06em; margin-bottom: 28px; }
    .tabs-bar { display: flex; border-bottom: 1px solid rgba(245,240,230,0.08); margin-bottom: 28px; }
    .tab-link {
      font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 0.1em;
      color: rgba(245,240,230,0.35); padding: 14px 22px; border-bottom: 2px solid transparent;
      margin-bottom: -1px; text-decoration: none; transition: color .15s;
    }
    .tab-link:hover { color: rgba(245,240,230,0.7); }
    .tab-link.active { color: #E8B930; border-bottom-color: #E8B930; }
    .order-card {
      background: rgba(245,240,230,0.02); border: 1px solid rgba(245,240,230,0.08);
      border-radius: 10px; margin-bottom: 14px; overflow: hidden; transition: border-color .15s;
    }
    .order-card:hover { border-color: rgba(245,240,230,0.14); }
    .order-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 22px; border-bottom: 1px solid rgba(245,240,230,0.06);
      flex-wrap: wrap; gap: 12px;
    }
    .order-id { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(245,240,230,0.35); margin-bottom: 4px; }
    .order-vendor { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
    .order-date { font-size: 12px; color: rgba(245,240,230,0.4); }
    .order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .order-total { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.04em; color: #E8B930; }
    .order-body { padding: 18px 22px; }
    .items-list { list-style: none; }
    .item-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid rgba(245,240,230,0.05); font-size: 13.5px;
    }
    .item-row:last-child { border-bottom: none; }
    .item-name { color: rgba(245,240,230,0.8); }
    .item-qty { color: rgba(245,240,230,0.35); font-size: 12px; margin-left: 8px; }
    .item-price { color: rgba(245,240,230,0.6); }
    .tracking-row {
      display: flex; align-items: center; gap: 8px; margin-top: 12px;
      padding: 10px 14px; background: rgba(232,185,48,0.06); border: 1px solid rgba(232,185,48,0.15);
      border-radius: 6px; font-size: 12.5px;
    }
    .tracking-label { color: rgba(245,240,230,0.4); }
    .tracking-num { color: #E8B930; font-weight: 600; letter-spacing: 0.04em; }
    .empty-state { border: 1px dashed rgba(245,240,230,0.1); border-radius: 8px; padding: 64px 32px; text-align: center; }
    .empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.3; }
    .empty-text { color: rgba(245,240,230,0.35); font-size: 14px; }
    .empty-cta {
      display: inline-block; margin-top: 18px; padding: 10px 22px;
      background: #E8B930; color: #000; border-radius: 6px; font-weight: 700; font-size: 13px;
    }
    .skeleton { background: rgba(245,240,230,0.06); border-radius: 4px; animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @media (max-width: 720px) {
      .nav { padding: 0 20px; } .nav-links { display: none; } .wrap { padding: 32px 20px 60px; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="wrap">
        <div className="breadcrumb">
          <Link href="/account">Account</Link><span>›</span><span>Requests and quotes</span>
        </div>
        <div className="page-title">Requests and Quotes</div>

        <div className="tabs-bar">
          <Link href="/account" className="tab-link">Profile</Link>
          <Link href="/account/bookings" className="tab-link">Bookings</Link>
          <Link href="/account/orders" className="tab-link">Orders</Link>
          <Link href="/account/quotes" className="tab-link active">Requests and quotes</Link>
          <Link href="/tickets" className="tab-link">Tickets</Link>
          <Link href="/account/points" className="tab-link">Points</Link>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 10 }} />)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {failed && <div className="empty-text">Some of your requests or quotes couldn&apos;t load. Refresh to try again.</div>}
            {quotes.length === 0 && waiting.length === 0 && (
              <div className="empty-state">
                <div className="empty-text">No requests or quotes yet. When a business sends you a quote, it shows here.</div>
              </div>
            )}
            {quotes.map((q) => (
              <Link key={q.id} href={`/q/${q.linkCode}`} className="order-card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" }}>{q.businessName || "Business"}</div>
                  <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid rgba(245,240,230,0.4)", borderRadius: 999, padding: "3px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>{listChip(q.status)}</span>
                </div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>{q.title}</div>
                <div style={{ opacity: 0.6, marginTop: 2, fontSize: 13 }}>{[whenLine(q), money(q.totalCents)].filter(Boolean).join(", ")}</div>
              </Link>
            ))}
            {waiting.map((r) => (
              <div key={r.id} className="order-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" }}>{r.businessName || "Business"}</div>
                  <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid rgba(245,240,230,0.4)", borderRadius: 999, padding: "3px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>{requestChip(r.status)}</span>
                </div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>Request{r.serviceName ? ` for ${r.serviceName}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
