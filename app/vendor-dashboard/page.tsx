"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Business {
  id: string;
  name: string;
  category: string;
  logoImage?: string;
  approvalStatus: string;
  rating?: number;
  reviewCount?: number;
  followerCount?: number;
  followingCount?: number;
  city?: string;
  state?: string;
  description?: string;
  subscriptionActive?: boolean;
}

interface Stats {
  orderCount: number;
  bookingCount: number;
  monthlyRevenueCents: number;
  reviewCount: number;
  averageRating: number;
}

interface Order {
  id: string;
  orderNumber?: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  customerName?: string;
  items?: { name: string; quantity: number; priceCents?: number; variantLabel?: string | null }[];
  shippingAddress?: string | null;
}

interface Booking {
  id: string;
  status: string;
  date: string;
  time: string;
  customerName: string;
  customerAvatar?: string | null;
  serviceName?: string | null;
  amount: number;
  subtotalAmount: number;
  bookingFeeAmount: number;
  vendorNetAmount: number;
}

type Tab = "overview" | "orders" | "bookings";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusColor(status: string): string {
  const s = status?.toLowerCase();
  if (["confirmed", "completed", "delivered", "paid", "shipped"].includes(s)) return "status-green";
  if (["pending", "processing", "pending_payment"].includes(s)) return "status-yellow";
  if (["cancelled", "rejected", "refunded"].includes(s)) return "status-red";
  return "status-gray";
}

function orderStatusClass(status: string): string {
  switch (status) {
    case "paid": return "status-green";
    case "pending": return "status-yellow";
    case "shipped": return "status-blue";
    case "delivered": return "status-gray";
    case "cancelled": return "status-red";
    default: return "status-gray";
  }
}

function approvalBadge(status: string) {
  if (status === "approved") return { label: "Approved", cls: "approval-approved" };
  if (status === "pending") return { label: "Pending Review", cls: "approval-pending" };
  if (status === "rejected") return { label: "Rejected", cls: "approval-rejected" };
  return { label: status, cls: "approval-pending" };
}

function safeParseAddress(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState("");

  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [shipFormOrderId, setShipFormOrderId] = useState<string | null>(null);
  const [shipTracking, setShipTracking] = useState("");
  const [shipCarrier, setShipCarrier] = useState("UPS");
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vendor-dashboard/profile");
        if (res.status === 401) { router.push("/login"); return; }
        if (res.status === 404) { router.push("/"); return; }
        const data = await res.json();
        setBusiness(data.business);
      } catch {
        setError("Could not load your business profile.");
      } finally {
        setLoadingProfile(false);
      }
    })();

    (async () => {
      try {
        const res = await fetch("/api/vendor-dashboard/stats");
        if (res.ok) { const data = await res.json(); setStats(data.stats); }
      } catch { /* non-blocking */ }
      finally { setLoadingStats(false); }
    })();

    (async () => {
      try {
        const res = await fetch("/api/vendor-dashboard/orders");
        if (res.ok) { const data = await res.json(); setOrders(data.orders ?? []); }
      } catch { /* non-blocking */ }
      finally { setLoadingOrders(false); }
    })();

    (async () => {
      try {
        const res = await fetch("/api/vendor-dashboard/bookings");
        if (res.ok) { const data = await res.json(); setBookings(data.bookings ?? []); }
      } catch { /* non-blocking */ }
      finally { setLoadingBookings(false); }
    })();
  }, [router]);

  async function handleMarkShipped(orderId: string) {
    setActionLoading(l => ({ ...l, [orderId]: true }));
    setActionErrors(e => ({ ...e, [orderId]: "" }));
    try {
      const res = await fetch(`/api/business/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "shipped", trackingNumber: shipTracking, carrier: shipCarrier }),
      });
      if (!res.ok) {
        const d = await res.json();
        setActionErrors(e => ({ ...e, [orderId]: d.error || "Failed to update order." }));
      } else {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "shipped" } : o));
        setShipFormOrderId(null);
        setShipTracking("");
        setShipCarrier("UPS");
      }
    } catch {
      setActionErrors(e => ({ ...e, [orderId]: "Network error. Please try again." }));
    } finally {
      setActionLoading(l => ({ ...l, [orderId]: false }));
    }
  }

  async function handleCancelOrder(orderId: string) {
    setActionLoading(l => ({ ...l, [orderId]: true }));
    setActionErrors(e => ({ ...e, [orderId]: "" }));
    try {
      const res = await fetch(`/api/business/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        const d = await res.json();
        setActionErrors(e => ({ ...e, [orderId]: d.error || "Failed to cancel order." }));
      } else {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "cancelled" } : o));
        setCancelConfirmId(null);
      }
    } catch {
      setActionErrors(e => ({ ...e, [orderId]: "Network error. Please try again." }));
    } finally {
      setActionLoading(l => ({ ...l, [orderId]: false }));
    }
  }

  if (loadingProfile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#555", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14 }}>Loading your dashboard…</p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "#c0392b", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14 }}>{error || "Business not found."}</p>
        <Link href="/" style={{ color: "#c9a84c", fontSize: 13, fontFamily: "Hanken Grotesk, sans-serif" }}>← Back to home</Link>
      </div>
    );
  }

  const badge = approvalBadge(business.approvalStatus);
  const isPending = business.approvalStatus === "pending";

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        .page { min-height: 100vh; background: #0a0a0a; font-family: 'Hanken Grotesk', sans-serif; color: #f5f0e8; }
        .topnav { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 56px; border-bottom: 1px solid #1e1e1e; background: #0d0d0d; position: sticky; top: 0; z-index: 10; }
        .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.12em; color: #c9a84c; text-decoration: none; }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-biz { font-size: 13px; color: #888; }
        .nav-logout { font-size: 12px; color: #555; text-decoration: none; letter-spacing: 0.04em; transition: color 0.15s; }
        .nav-logout:hover { color: #c9a84c; }
        .pending-banner { background: #1a1200; border-bottom: 1px solid #3a2800; padding: 12px 24px; font-size: 13px; color: #c9a84c; display: flex; align-items: center; gap: 8px; }
        .main { max-width: 960px; margin: 0 auto; padding: 32px 24px 80px; }
        .profile-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 32px; }
        .biz-avatar { width: 64px; height: 64px; border-radius: 10px; background: #1e1e1e; border: 1px solid #2a2a2a; object-fit: cover; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 24px; color: #c9a84c; letter-spacing: 0.05em; }
        .biz-info { flex: 1; min-width: 0; }
        .biz-name { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 0.06em; color: #f5f0e8; margin-bottom: 4px; }
        .biz-meta { font-size: 13px; color: #666; margin-bottom: 8px; }
        .biz-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .approval-approved { background: #0d2b0d; color: #27ae60; border: 1px solid #1a4a1a; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
        .approval-pending { background: #1a1200; color: #c9a84c; border: 1px solid #3a2800; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
        .approval-rejected { background: #2b0d0d; color: #c0392b; border: 1px solid #4a1a1a; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
        .sub-badge { background: #0d1f1a; color: #1abc9c; border: 1px solid #0d3328; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 32px; }
        .stat-card { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 16px 18px; }
        .stat-label { font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #555; margin-bottom: 8px; }
        .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.04em; color: #c9a84c; }
        .stat-sub { font-size: 11px; color: #444; margin-top: 2px; }
        .tabs { display: flex; border-bottom: 1px solid #1e1e1e; margin-bottom: 24px; }
        .tab-btn { padding: 10px 20px; font-size: 13px; font-weight: 500; font-family: inherit; letter-spacing: 0.04em; color: #555; background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
        .tab-btn:hover { color: #aaa; }
        .tab-btn.active { color: #c9a84c; border-bottom-color: #c9a84c; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #555; padding: 8px 12px; border-bottom: 1px solid #1e1e1e; white-space: nowrap; }
        td { padding: 12px 12px; border-bottom: 1px solid #141414; color: #aaa; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #0f0f0f; }
        .status-green { background: #0d2b0d; color: #27ae60; border: 1px solid #1a4a1a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .status-yellow { background: #1a1200; color: #c9a84c; border: 1px solid #3a2800; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .status-red { background: #2b0d0d; color: #c0392b; border: 1px solid #4a1a1a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .status-gray { background: #1a1a1a; color: #666; border: 1px solid #2a2a2a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .amount { color: #f5f0e8; font-weight: 500; }
        .id-cell { font-family: monospace; font-size: 11px; color: #444; }
        .empty-state { text-align: center; padding: 48px 24px; color: #444; font-size: 14px; }
        .empty-state p { margin-bottom: 6px; }
        .empty-sub { font-size: 12px; color: #333; }
        .loading-row td { color: #333; text-align: center; padding: 32px; }
        .status-blue { background: #0d1a2b; color: #3498db; border: 1px solid #1a3a5e; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .order-filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
        .order-filter-tab { font-size: 12px; font-weight: 500; font-family: inherit; letter-spacing: 0.04em; padding: 5px 14px; border-radius: 99px; border: 1px solid #2a2a2a; background: #141414; color: #666; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .order-filter-tab:hover { color: #aaa; border-color: #3a3a3a; }
        .order-filter-tab.active { background: #c9a84c; color: #000; border-color: #c9a84c; }
        .order-card { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; }
        .order-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .order-customer { font-size: 14px; font-weight: 600; color: #f5f0e8; }
        .order-meta { font-size: 11px; color: #555; margin-bottom: 10px; }
        .order-items-list { list-style: none; margin-bottom: 10px; }
        .order-items-list li { font-size: 13px; color: #aaa; padding: 3px 0; border-bottom: 1px solid #1e1e1e; }
        .order-items-list li:last-child { border-bottom: none; }
        .order-address { font-size: 12px; color: #555; margin-bottom: 12px; }
        .order-total { font-size: 14px; font-weight: 600; color: #f5f0e8; margin-bottom: 14px; }
        .order-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-gold { font-size: 12px; font-weight: 600; font-family: inherit; letter-spacing: 0.05em; padding: 7px 16px; border-radius: 5px; border: none; background: #c9a84c; color: #000; cursor: pointer; transition: background 0.15s; }
        .btn-gold:hover { background: #d4b55e; }
        .btn-gold:disabled { opacity: 0.5; cursor: default; }
        .btn-red-outline { font-size: 12px; font-weight: 600; font-family: inherit; letter-spacing: 0.05em; padding: 7px 16px; border-radius: 5px; border: 1px solid #c0392b; background: transparent; color: #c0392b; cursor: pointer; transition: background 0.15s; }
        .btn-red-outline:hover { background: rgba(192,57,43,0.08); }
        .btn-red-outline:disabled { opacity: 0.5; cursor: default; }
        .btn-gray { font-size: 12px; font-weight: 600; font-family: inherit; letter-spacing: 0.05em; padding: 7px 16px; border-radius: 5px; border: 1px solid #3a3a3a; background: transparent; color: #666; cursor: pointer; transition: background 0.15s; }
        .btn-gray:hover { background: #1e1e1e; }
        .order-ship-form { margin-top: 14px; padding: 16px; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 8px; }
        .order-ship-form label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #555; margin-bottom: 5px; }
        .order-ship-form input, .order-ship-form select { width: 100%; padding: 8px 10px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 5px; color: #f5f0e8; font-size: 13px; font-family: inherit; margin-bottom: 12px; outline: none; }
        .order-ship-form input:focus, .order-ship-form select:focus { border-color: #c9a84c; }
        .order-cancel-confirm { margin-top: 14px; padding: 14px 16px; background: #160808; border: 1px solid #4a1a1a; border-radius: 8px; }
        .order-cancel-confirm p { font-size: 13px; color: #c0392b; margin-bottom: 12px; }
        .order-action-error { font-size: 12px; color: #c0392b; margin-top: 8px; }
        @media (max-width: 600px) {
          .main { padding: 20px 16px 60px; }
          .profile-header { flex-direction: column; gap: 12px; }
          .stat-grid { grid-template-columns: 1fr 1fr; }
          .topnav { padding: 0 16px; }
        }
      `}</style>

      <div className="page">
        {isPending && (
          <div className="pending-banner">
            ⏳ Your application is under review. You'll be notified once approved.
          </div>
        )}

        <div className="main">
          <div className="profile-header">
            {business.logoImage ? (
              <img src={business.logoImage} alt={business.name} className="biz-avatar" />
            ) : (
              <div className="biz-avatar">{business.name.charAt(0)}</div>
            )}
            <div className="biz-info">
              <div className="biz-name">{business.name}</div>
              <div className="biz-meta">
                {business.category}
                {business.city && business.state ? ` · ${business.city}, ${business.state}` : ""}
              </div>
              <div className="biz-badges">
                <span className={badge.cls}>{badge.label}</span>
                {business.reviewCount ? (
                  <span style={{ fontSize: 12, color: "#666" }}>
                    ⭐ {business.rating ? business.rating.toFixed(1) : "—"} ({business.reviewCount} reviews)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Monthly Revenue</div>
              <div className="stat-value">{loadingStats ? "—" : formatCents(stats?.monthlyRevenueCents ?? 0)}</div>
              <div className="stat-sub">This month (paid orders)</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Orders</div>
              <div className="stat-value">{loadingStats ? "—" : stats?.orderCount ?? 0}</div>
              <div className="stat-sub">Paid & fulfilled</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bookings</div>
              <div className="stat-value">{loadingStats ? "—" : stats?.bookingCount ?? 0}</div>
              <div className="stat-sub">Confirmed & completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Reviews</div>
              <div className="stat-value">{loadingStats ? "—" : stats?.reviewCount ?? 0}</div>
              <div className="stat-sub">{stats?.averageRating ? `Avg ${stats.averageRating.toFixed(1)} ⭐` : "No reviews yet"}</div>
            </div>
          </div>

          <div className="tabs">
            {(["overview", "orders", "bookings"] as Tab[]).map((t) => (
              <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "orders" && orders.length > 0 && ` (${orders.length})`}
                {t === "bookings" && bookings.length > 0 && ` (${bookings.length})`}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div>
              {business.description && (
                <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: "20px 22px", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#555", marginBottom: 10 }}>About</div>
                  <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.7 }}>{business.description}</p>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#555", marginBottom: 10 }}>Followers</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#c9a84c" }}>{business.followerCount ?? 0}</div>
                </div>
                <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#555", marginBottom: 10 }}>Following</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#c9a84c" }}>{business.followingCount ?? 0}</div>
                </div>
              </div>
              {!loadingOrders && orders.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#555", marginBottom: 12 }}>Recent orders</div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Order ID</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {orders.slice(0, 5).map((o) => (
                          <tr key={o.id}>
                            <td className="id-cell">{o.orderNumber != null ? `#${String(o.orderNumber).padStart(4, '0')}` : `#${o.id.slice(-8).toUpperCase()}`}</td>
                            <td>{formatDate(o.createdAt)}</td>
                            <td className="amount">{formatCents(o.totalAmount ?? 0)}</td>
                            <td><span className={statusColor(o.status)}>{o.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {orders.length > 5 && (
                    <button className="tab-btn" style={{ marginTop: 12, padding: "8px 0" }} onClick={() => setTab("orders")}>
                      View all {orders.length} orders →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "orders" && (() => {
            const filteredOrders = orderStatusFilter === "all"
              ? orders
              : orders.filter(o => o.status === orderStatusFilter);
            return (
              <div>
                {loadingOrders ? (
                  <p style={{ color: "#333", fontSize: 13, padding: "32px 0", textAlign: "center" }}>Loading orders…</p>
                ) : orders.length === 0 ? (
                  <div className="empty-state"><p>No orders yet</p><p className="empty-sub">Orders will appear here once customers make purchases.</p></div>
                ) : (
                  <>
                    <div className="order-filter-tabs">
                      {(["all", "pending", "paid", "shipped", "delivered", "cancelled"] as const).map(f => (
                        <button
                          key={f}
                          className={`order-filter-tab${orderStatusFilter === f ? " active" : ""}`}
                          onClick={() => setOrderStatusFilter(f)}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                          {f !== "all" && ` (${orders.filter(o => o.status === f).length})`}
                        </button>
                      ))}
                    </div>

                    {filteredOrders.length === 0 ? (
                      <div className="empty-state"><p>No {orderStatusFilter} orders</p></div>
                    ) : filteredOrders.map(o => (
                      <div key={o.id} className="order-card">
                        <div className="order-card-header">
                          <span className="order-customer">{o.customerName ?? "Unknown customer"}</span>
                          <span className={orderStatusClass(o.status)}>{o.status}</span>
                        </div>

                        <div className="order-meta">
                          {o.orderNumber != null ? `#${String(o.orderNumber).padStart(4, '0')}` : `#${o.id.slice(-8).toUpperCase()}`} · {formatDate(o.createdAt)}
                        </div>

                        {o.items && o.items.length > 0 && (
                          <ul className="order-items-list">
                            {o.items.map((item, idx) => (
                              <li key={idx}>
                                {item.quantity}× {item.name}
                                {item.variantLabel ? ` (${item.variantLabel})` : ""}
                                {item.priceCents != null ? ` — ${formatCents(item.priceCents)}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="order-total">Total: {formatCents(o.totalAmount ?? 0)}</div>

                        <div className="order-address">
                          {(() => {
                            const a = safeParseAddress(o.shippingAddress);
                            if (!a) return <span style={{ color: "#444" }}>No shipping address on file</span>;
                            if (typeof a === "object") return `${a.line1}, ${a.city}, ${a.state} ${a.zipCode}`;
                            return a;
                          })()}
                        </div>

                        {(o.status === "paid" || o.status === "pending") && (
                          <div className="order-actions">
                            {o.status === "paid" && (
                              <button
                                className="btn-gold"
                                disabled={!!actionLoading[o.id]}
                                onClick={() => {
                                  setCancelConfirmId(null);
                                  setShipFormOrderId(shipFormOrderId === o.id ? null : o.id);
                                }}
                              >
                                {shipFormOrderId === o.id ? "Close" : "Mark Shipped"}
                              </button>
                            )}
                            <button
                              className="btn-red-outline"
                              disabled={!!actionLoading[o.id]}
                              onClick={() => {
                                setShipFormOrderId(null);
                                setCancelConfirmId(cancelConfirmId === o.id ? null : o.id);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {shipFormOrderId === o.id && (
                          <div className="order-ship-form">
                            <label>Tracking Number</label>
                            <input
                              type="text"
                              placeholder="e.g. 1Z999AA10123456784"
                              value={shipTracking}
                              onChange={e => setShipTracking(e.target.value)}
                            />
                            <label>Carrier</label>
                            <select value={shipCarrier} onChange={e => setShipCarrier(e.target.value)}>
                              <option value="UPS">UPS</option>
                              <option value="USPS">USPS</option>
                              <option value="FedEx">FedEx</option>
                              <option value="DHL">DHL</option>
                              <option value="Other">Other</option>
                            </select>
                            <div className="order-actions">
                              <button
                                className="btn-gold"
                                disabled={!shipTracking.trim() || !!actionLoading[o.id]}
                                onClick={() => handleMarkShipped(o.id)}
                              >
                                {actionLoading[o.id] ? "Saving…" : "Confirm Shipment"}
                              </button>
                              <button className="btn-gray" onClick={() => setShipFormOrderId(null)}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {cancelConfirmId === o.id && (
                          <div className="order-cancel-confirm">
                            <p>Cancel this order? The customer will be refunded. This cannot be undone.</p>
                            <div className="order-actions">
                              <button
                                className="btn-red-outline"
                                disabled={!!actionLoading[o.id]}
                                onClick={() => handleCancelOrder(o.id)}
                              >
                                {actionLoading[o.id] ? "Cancelling…" : "Yes, Cancel Order"}
                              </button>
                              <button className="btn-gray" onClick={() => setCancelConfirmId(null)}>Keep Order</button>
                            </div>
                          </div>
                        )}

                        {actionErrors[o.id] && (
                          <div className="order-action-error">{actionErrors[o.id]}</div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })()}

          {tab === "bookings" && (
            <div className="table-wrap">
              {loadingBookings ? (
                <table><tbody><tr><td className="loading-row" colSpan={8}>Loading bookings…</td></tr></tbody></table>
              ) : bookings.length === 0 ? (
                <div className="empty-state"><p>No bookings yet</p><p className="empty-sub">Bookings will appear here once customers schedule sessions.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th><th>Date</th><th>Time</th><th>Service</th>
                      <th>Subtotal</th><th>Fee</th><th>You Earn</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td style={{ color: "#f5f0e8" }}>{b.customerName}</td>
                        <td>{b.date}</td>
                        <td>{b.time}</td>
                        <td>{b.serviceName ?? "—"}</td>
                        <td className="amount">${b.subtotalAmount.toFixed(2)}</td>
                        <td style={{ color: "#c0392b" }}>-${b.bookingFeeAmount.toFixed(2)}</td>
                        <td style={{ color: "#27ae60", fontWeight: 600 }}>${b.vendorNetAmount.toFixed(2)}</td>
                        <td><span className={statusColor(b.status)}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}