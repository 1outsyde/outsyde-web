"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PointsBalance { balance: number; dollarValue?: number; }
interface PointTransaction {
  id: string | number;
  type: string;
  points: number;
  description?: string;
  createdAt?: string;
}

export default function PointsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (!me.authenticated) { router.push("/login"); return; }

      const [balRes, histRes] = await Promise.all([
        fetch("/api/account/points?type=balance"),
        fetch("/api/account/points?type=history"),
      ]);

      if (balRes.ok) setBalance(await balRes.json());
      if (histRes.ok) {
        const h = await histRes.json();
        setTransactions(h.transactions || h || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const pts = balance?.balance ?? 0;
  const dollarVal = balance?.dollarValue ?? pts / 100;

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
    .tabs-bar { display: flex; border-bottom: 1px solid rgba(245,240,230,0.08); margin-bottom: 32px; }
    .tab-link {
      font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 0.1em;
      color: rgba(245,240,230,0.35); padding: 14px 22px; border-bottom: 2px solid transparent;
      margin-bottom: -1px; text-decoration: none; transition: color .15s;
    }
    .tab-link:hover { color: rgba(245,240,230,0.7); }
    .tab-link.active { color: #E8B930; border-bottom-color: #E8B930; }

    .balance-card {
      background: linear-gradient(135deg, rgba(232,185,48,0.12) 0%, rgba(232,185,48,0.04) 100%);
      border: 1px solid rgba(232,185,48,0.25); border-radius: 14px;
      padding: 36px 40px; margin-bottom: 36px;
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px;
    }
    .balance-left {}
    .balance-eyebrow { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(232,185,48,0.6); margin-bottom: 8px; }
    .balance-num { font-family: 'Bebas Neue', sans-serif; font-size: 64px; letter-spacing: 0.02em; color: #E8B930; line-height: 1; }
    .balance-label { font-size: 13px; color: rgba(245,240,230,0.4); margin-top: 6px; }
    .balance-right { text-align: right; }
    .dollar-eyebrow { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,240,230,0.3); margin-bottom: 6px; }
    .dollar-val { font-family: 'Bebas Neue', sans-serif; font-size: 36px; color: #F5F0E6; letter-spacing: 0.04em; }
    .dollar-sub { font-size: 12px; color: rgba(245,240,230,0.3); margin-top: 4px; }

    .info-row {
      display: flex; gap: 12px; margin-bottom: 36px; flex-wrap: wrap;
    }
    .info-pill {
      display: flex; align-items: center; gap: 8px; padding: 10px 16px;
      background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08);
      border-radius: 8px; font-size: 12.5px; color: rgba(245,240,230,0.5);
    }
    .info-pill span:first-child { color: #E8B930; }

    .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.08em; margin-bottom: 16px; color: rgba(245,240,230,0.7); }

    .tx-list { display: flex; flex-direction: column; gap: 2px; }
    .tx-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; border-radius: 8px; transition: background .1s;
    }
    .tx-row:hover { background: rgba(245,240,230,0.03); }
    .tx-left { display: flex; flex-direction: column; gap: 3px; }
    .tx-desc { font-size: 14px; color: #F5F0E6; }
    .tx-date { font-size: 11.5px; color: rgba(245,240,230,0.35); }
    .tx-pts { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.04em; }
    .tx-pts.earn { color: #4CD37B; }
    .tx-pts.spend { color: rgba(245,240,230,0.4); }
    .tx-divider { height: 1px; background: rgba(245,240,230,0.05); margin: 2px 0; }

    .empty-state { border: 1px dashed rgba(245,240,230,0.1); border-radius: 8px; padding: 48px 32px; text-align: center; }
    .empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.3; }
    .empty-text { color: rgba(245,240,230,0.35); font-size: 14px; }

    .skeleton { background: rgba(245,240,230,0.06); border-radius: 4px; animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    @media (max-width: 720px) {
      .nav { padding: 0 20px; } .nav-links { display: none; } .wrap { padding: 32px 20px 60px; }
      .balance-card { padding: 24px; }
      .balance-num { font-size: 48px; }
      .balance-right { text-align: left; }
    }
  `;

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  const isEarn = (type: string) =>
    ["earn", "credit", "reward", "bonus", "referral"].includes(type.toLowerCase());

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <nav className="nav">
        <a href="/"><span className="nav-logo">OUTSYDE</span></a>
        <div className="nav-links">
          <a href="/">Home</a><a href="/shop">Shop</a><a href="/account">My Account</a>
        </div>
      </nav>

      <div className="wrap">
        <div className="breadcrumb">
          <Link href="/account">Account</Link><span>›</span><span>Points</span>
        </div>
        <div className="page-title">Outsyde Points</div>

        <div className="tabs-bar">
          <Link href="/account" className="tab-link">Profile</Link>
          <Link href="/account/bookings" className="tab-link">Bookings</Link>
          <Link href="/account/orders" className="tab-link">Orders</Link>
          <Link href="/account/points" className="tab-link active">Points</Link>
        </div>

        {loading ? (
          <>
            <div className="skeleton" style={{ height: 160, borderRadius: 14, marginBottom: 36 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />)}
            </div>
          </>
        ) : (
          <>
            <div className="balance-card">
              <div className="balance-left">
                <div className="balance-eyebrow">Current Balance</div>
                <div className="balance-num">{pts.toLocaleString()}</div>
                <div className="balance-label">Outsyde Points</div>
              </div>
              <div className="balance-right">
                <div className="dollar-eyebrow">Redeemable Value</div>
                <div className="dollar-val">${dollarVal.toFixed(2)}</div>
                <div className="dollar-sub">100 points = $1.00</div>
              </div>
            </div>

            <div className="info-row">
              <div className="info-pill"><span>★</span> Earn points on every purchase</div>
              <div className="info-pill"><span>🎯</span> Redeem at checkout</div>
              <div className="info-pill"><span>📷</span> Bonus points on shoot bookings</div>
            </div>

            <div className="section-title">Transaction History</div>

            {transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">★</div>
                <div className="empty-text">No transactions yet. Start earning points by shopping or booking.</div>
              </div>
            ) : (
              <div className="tx-list">
                {transactions.map((tx, i) => {
                  const earn = isEarn(tx.type);
                  return (
                    <div key={tx.id}>
                      {i > 0 && <div className="tx-divider" />}
                      <div className="tx-row">
                        <div className="tx-left">
                          <div className="tx-desc">{tx.description || tx.type}</div>
                          <div className="tx-date">{fmtDate(tx.createdAt)}</div>
                        </div>
                        <div className={`tx-pts ${earn ? "earn" : "spend"}`}>
                          {earn ? "+" : "−"}{Math.abs(tx.points).toLocaleString()} pts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}