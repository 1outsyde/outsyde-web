"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  status: string;
  totalAmount: number;
  createdAt: string;
  customerName?: string;
  items?: { name: string; quantity: number }[];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function statusColor(status: string): string {
  const s = status?.toLowerCase();
  if (["confirmed", "completed", "delivered", "paid", "shipped"].includes(s)) return "status-green";
  if (["pending", "processing"].includes(s)) return "status-yellow";
  if (["cancelled", "rejected", "refunded"].includes(s)) return "status-red";
  return "status-gray";
}

function approvalBadge(status: string) {
  if (status === "approved") return { label: "Approved", cls: "approval-approved" };
  if (status === "pending") return { label: "Pending Review", cls: "approval-pending" };
  if (status === "rejected") return { label: "Rejected", cls: "approval-rejected" };
  return { label: status, cls: "approval-pending" };
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  // ── Fetch profile + stats on mount ────────────────────────────────────────
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
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch { /* non-blocking */ }
      finally { setLoadingStats(false); }
    })();

    (async () => {
      try {
        const res = await fetch("/api/vendor-dashboard/orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders ?? []);
        }
      } catch { /* non-blocking */ }
      finally { setLoadingOrders(false); }
    })();

    (async () => {
      try {
        const res = await fetch("/api/vendor-dashboard/bookings");
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings ?? []);
        }
      } catch { /* non-blocking */ }
      finally { setLoadingBookings(false); }
    })();
  }, [router]);

  // ─── Loading / error states ───────────────────────────────────────────────

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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }

        .page {
          min-height: 100vh;
          background: #0a0a0a;
          font-family: 'Hanken Grotesk', sans-serif;
          color: #f5f0e8;
        }

        /* Top nav */
        .topnav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 56px;
          border-bottom: 1px solid #1e1e1e;
          background: #0d0d0d;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .nav-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 0.12em;
          color: #c9a84c;
          text-decoration: none;
        }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-biz { font-size: 13px; color: #888; }
        .nav-logout {
          font-size: 12px;
          color: #555;
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.15s;
        }
        .nav-logout:hover { color: #c9a84c; }

        /* Pending banner */
        .pending-banner {
          background: #1a1200;
          border-bottom: 1px solid #3a2800;
          padding: 12px 24px;
          font-size: 13px;
          color: #c9a84c;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Main layout */
        .main { max-width: 960px; margin: 0 auto; padding: 32px 24px 80px; }

        /* Profile header */
        .profile-header {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 32px;
        }
        .biz-avatar {
          width: 64px;
          height: 64px;
          border-radius: 10px;
          background: #1e1e1e;
          border: 1px solid #2a2a2a;
          object-fit: cover;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px;
          color: #c9a84c;
          letter-spacing: 0.05em;
        }
        .biz-info { flex: 1; min-width: 0; }
        .biz-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: 0.06em;
          color: #f5f0e8;
          margin-bottom: 4px;
        }
        .biz-meta { font-size: 13px; color: #666; margin-bottom: 8px; }
        .biz-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        .approval-approved { background: #0d2b0d; color: #27ae60; border: 1px solid #1a4a1a; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
        .approval-pending { background: #1a1200; color: #c9a84c; border: 1px solid #3a2800; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
        .approval-rejected { background: #2b0d0d; color: #c0392b; border: 1px solid #4a1a1a; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
        .sub-badge { background: #0d1f1a; color: #1abc9c; border: 1px solid #0d3328; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }

        /* Stat cards */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 10px;
          padding: 16px 18px;
        }
        .stat-label { font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #555; margin-bottom: 8px; }
        .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.04em; color: #c9a84c; }
        .stat-sub { font-size: 11px; color: #444; margin-top: 2px; }

        /* Tabs */
        .tabs {
          display: flex;
          border-bottom: 1px solid #1e1e1e;
          margin-bottom: 24px;
          gap: 0;
        }
        .tab-btn {
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          letter-spacing: 0.04em;
          color: #555;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .tab-btn:hover { color: #aaa; }
        .tab-btn.active { color: #c9a84c; border-bottom-color: #c9a84c; }

        /* Table */
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th {
          text-align: left;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #555;
          padding: 8px 12px;
          border-bottom: 1px solid #1e1e1e;
          white-space: nowrap;
        }
        td {
          padding: 12px 12px;
          border-bottom: 1px solid #141414;
          color: #aaa;
          vertical-align: middle;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #0f0f0f; }

        .status-green { background: #0d2b0d; color: #27ae60; border: 1px solid #1a4a1a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .status-yellow { background: #1a1200; color: #c9a84c; border: 1px solid #3a2800; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .status-red { background: #2b0d0d; color: #c0392b; border: 1px solid #4a1a1a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .status-gray { background: #1a1a1a; color: #666; border: 1px solid #2a2a2a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }

        .amount { color: #f5f0e8; font-weight: 500; }
        .id-cell { font-family: monospace; font-size: 11px; color: #444; }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #444;
          font-size: 14px;
        }
        .empty-state p { margin-bottom: 6px; }
        .empty-sub { font-size: 12px; color: #333; }

        .loading-row td { color: #333; text-align: center; padding: 32px; }

        @media (max-width: 600px) {
          .main { padding: 20px 16px 60px; }
          .profile-header { flex-direction: column; gap: 12px; }
          .stat-grid { grid-template-columns: 1fr 1fr; }
          .topnav { padding: 0 16px; }
        }
      `}</style>

      <div className="page">
        {/* Nav */}
        <nav className="topnav">
          <Link href="/" className="nav-logo">OUTSYDE</Link>
          <div className="nav-right">
            <span className="nav-biz">{business.name}</span>
            <Link href="/api/auth/logout" className="nav-logout">Sign out</Link>
          </div>
        </nav>

        {/* Pending banner */}
        {isPending && (
          <div className="pending-banner">
            ⏳ Your application is under review. You'll be notified once approved.
          </div>
        )}

        <div className="main">
          {/* Profile header */}
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
                {business.subscriptionActive && <span className="sub-badge">Subscription Active</span>}
                {business.reviewCount ? (
                  <span style={{ fontSize: 12, color: "#666" }}>
                    ⭐ {business.averageRating?.toFixed(1) ?? (business.rating ? (business.rating / 10).toFixed(1) : "—")} ({business.reviewCount} reviews)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Monthly Revenue</div>
              <div className="stat-value">
                {loadingStats ? "—" : formatCents(stats?.monthlyRevenueCents ?? 0)}
              </div>
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
              <div className="stat-sub">
                {stats?.averageRating ? `Avg ${stats.averageRating.toFixed(1)} ⭐` : "No reviews yet"}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {(["overview", "orders", "bookings"] as Tab[]).map((t) => (
              <button
                key={t}
                className={`tab-btn${tab === t ? " active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "orders" && orders.length > 0 && ` (${orders.length})`}
                {t === "bookings" && bookings.length > 0 && ` (${bookings.length})`}
              </button>
            ))}
          </div>

          {/* ── Overview tab ── */}
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

              {/* Recent orders preview */}
              {!loadingOrders && orders.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#555", marginBottom: 12 }}>Recent orders</div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((o) => (
                          <tr key={o.id}>
                            <td className="id-cell">#{o.id.slice(-8).toUpperCase()}</td>
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

          {/* ── Orders tab ── */}
          {tab === "orders" && (
            <div className="table-wrap">
              {loadingOrders ? (
                <table><tbody><tr><td className="loading-row" colSpan={5}>Loading orders…</td></tr></tbody></table>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <p>No orders yet</p>
                  <p className="empty-sub">Orders will appear here once customers make purchases.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="id-cell">#{o.id.slice(-8).toUpperCase()}</td>
                        <td>{formatDate(o.createdAt)}</td>
                        <td>{o.customerName ?? "—"}</td>
                        <td className="amount">{formatCents(o.totalAmount ?? 0)}</td>
                        <td><span className={statusColor(o.status)}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Bookings tab ── */}
          {tab === "bookings" && (
            <div className="table-wrap">
              {loadingBookings ? (
                <table><tbody><tr><td className="loading-row" colSpan={5}>Loading bookings…</td></tr></tbody></table>
              ) : bookings.length === 0 ? (
                <div className="empty-state">
                  <p>No bookings yet</p>
                  <p className="empty-sub">Bookings will appear here once customers schedule sessions.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Service</th>
                      <th>Subtotal</th>
                      <th>Fee</th>
                      <th>You Earn</th>
                      <th>Status</th>
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