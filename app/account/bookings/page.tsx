"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Booking {
  id: string | number;
  _type: "appointment" | "shoot";
  status?: string;
  scheduledAt?: string;
  date?: string;
  time?: string;
  price?: number;
  totalPrice?: number;
  serviceName?: string;
  businessName?: string;
  staffName?: string;
  photographerName?: string;
  packageName?: string;
  location?: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#4CD37B",
  completed: "#4CD37B",
  pending: "#E8B930",
  upcoming: "#E8B930",
  cancelled: "#ff6b6b",
  "no-show": "#ff6b6b",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "pending").toLowerCase();
  const color = STATUS_COLORS[s] || "rgba(245,240,230,0.4)";
  return (
    <span style={{
      fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const,
      color, border: `1px solid ${color}`, borderRadius: 999,
      padding: "3px 10px", fontWeight: 600,
    }}>{s}</span>
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "appointments" | "shoots">("all");

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (!me.authenticated) { router.push("/login"); return; }

      const res = await fetch("/api/account/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const visible = bookings.filter((b) =>
    filter === "all" ? true : filter === "appointments" ? b._type === "appointment" : b._type === "shoot"
  );

  const fmtDate = (b: Booking) => {
    const raw = b.scheduledAt || b.date;
    if (!raw) return "—";
    return new Date(raw).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };
  const fmtTime = (b: Booking) => {
    const raw = b.scheduledAt || b.time;
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  const fmtPrice = (n?: number) => n != null ? `$${(n / 100).toFixed(2)}` : null;

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
    .filter-row { display: flex; gap: 8px; margin-bottom: 22px; }
    .filter-btn {
      font-family: inherit; font-size: 12px; letter-spacing: 0.06em; padding: 7px 14px;
      border-radius: 999px; cursor: pointer; border: 1px solid rgba(245,240,230,0.12);
      background: transparent; color: rgba(245,240,230,0.45); transition: all .15s;
    }
    .filter-btn:hover { color: #F5F0E6; border-color: rgba(245,240,230,0.25); }
    .filter-btn.active { background: rgba(232,185,48,0.1); border-color: rgba(232,185,48,0.35); color: #E8B930; }
    .booking-card {
      display: flex;
      background: rgba(245,240,230,0.02); border: 1px solid rgba(245,240,230,0.08);
      border-radius: 10px; margin-bottom: 12px; overflow: hidden; transition: border-color .15s;
    }
    .booking-card:hover { border-color: rgba(245,240,230,0.14); }
    .booking-stripe { width: 4px; flex-shrink: 0; }
    .stripe-appt { background: #1A3C34; }
    .stripe-shoot { background: #E8B930; }
    .booking-inner { flex: 1; padding: 18px 22px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
    .booking-left { display: flex; flex-direction: column; gap: 5px; }
    .booking-type { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,240,230,0.3); font-weight: 600; }
    .booking-name { font-size: 16px; font-weight: 600; }
    .booking-provider { font-size: 13px; color: rgba(245,240,230,0.5); }
    .booking-location { font-size: 12px; color: rgba(245,240,230,0.35); margin-top: 2px; }
    .booking-right { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; justify-content: center; }
    .booking-date { font-family: 'Bebas Neue', sans-serif; font-size: 13px; letter-spacing: 0.06em; color: rgba(245,240,230,0.7); }
    .booking-time { font-size: 12px; color: rgba(245,240,230,0.4); }
    .booking-price { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.04em; color: #E8B930; margin-top: 4px; }
    .empty-state { border: 1px dashed rgba(245,240,230,0.1); border-radius: 8px; padding: 64px 32px; text-align: center; }
    .empty-icon { font-size: 40px; margin-bottom: 14px; opacity: 0.3; }
    .empty-text { color: rgba(245,240,230,0.35); font-size: 14px; }
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

      <nav className="nav">
        <a href="/"><span className="nav-logo">OUTSYDE</span></a>
        <div className="nav-links">
          <a href="/">Home</a><a href="/shop">Shop</a><a href="/account">My Account</a>
        </div>
      </nav>

      <div className="wrap">
        <div className="breadcrumb">
          <Link href="/account">Account</Link><span>›</span><span>Bookings</span>
        </div>
        <div className="page-title">My Bookings</div>

        <div className="tabs-bar">
          <Link href="/account" className="tab-link">Profile</Link>
          <Link href="/account/bookings" className="tab-link active">Bookings</Link>
          <Link href="/account/orders" className="tab-link">Orders</Link>
          <Link href="/account/points" className="tab-link">Points</Link>
        </div>

        <div className="filter-row">
          {(["all", "appointments", "shoots"] as const).map((f) => (
            <button key={f} className={`filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "appointments" ? "Services" : "Photo Shoots"}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div className="empty-text">No bookings yet.</div>
          </div>
        ) : (
          visible.map((b) => {
            const isShoot = b._type === "shoot";
            const name = isShoot ? (b.packageName || "Photo Shoot") : (b.serviceName || "Service Booking");
            const provider = isShoot ? b.photographerName : (b.businessName || b.staffName);
            const price = fmtPrice(b.price || b.totalPrice);
            return (
              <div key={`${b._type}-${b.id}`} className="booking-card">
                <div className={`booking-stripe ${isShoot ? "stripe-shoot" : "stripe-appt"}`} />
                <div className="booking-inner">
                  <div className="booking-left">
                    <div className="booking-type">{isShoot ? "📷 Photo Shoot" : "✂️ Service"}</div>
                    <div className="booking-name">{name}</div>
                    {provider && <div className="booking-provider">{provider}</div>}
                    {b.location && <div className="booking-location">📍 {b.location}</div>}
                  </div>
                  <div className="booking-right">
                    <StatusBadge status={b.status} />
                    <div className="booking-date">{fmtDate(b)}</div>
                    <div className="booking-time">{fmtTime(b)}</div>
                    {price && <div className="booking-price">{price}</div>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}