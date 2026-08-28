"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PhotographerProfile {
  id: string;
  displayName: string;
  bio?: string;
  city?: string;
  state?: string;
  hourlyRate: number;
  portfolioUrl?: string;
  specialties?: string[];
  rating?: number;
  reviewCount?: number;
  followerCount?: number;
  followingCount?: number;
  stripeConnected?: boolean;
  coverImage?: string;
  logoImage?: string;
  isProfileComplete?: boolean;
}

interface Booking {
  id: string;
  status: string;
  date: string;
  time: string;
  customerName: string;
  serviceName?: string | null;
  amount: number;
  subtotalAmount: number;
  bookingFeeAmount: number;
  vendorNetAmount: number;
}

type Tab = "overview" | "bookings";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function statusColor(status: string): string {
  const s = status?.toLowerCase();
  if (["confirmed", "completed", "paid"].includes(s)) return "status-green";
  if (["pending", "processing"].includes(s)) return "status-yellow";
  if (["cancelled", "rejected", "refunded"].includes(s)) return "status-red";
  return "status-gray";
}

export default function PhotographerDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Check auth
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) { router.push("/login"); return; }
        const meData = await meRes.json();
        if (!meData.authenticated) { router.push("/login"); return; }
        if (!meData.isPhotographer && !meData.photographerId) { router.push("/"); return; }

        // Check profile completeness against actual fields
        const profileRes = await fetch("/api/photographer/me");
        const profileData = profileRes.ok ? await profileRes.json() : null;

        if (
          !profileData ||
          !profileData.displayName ||
          !profileData.hourlyRate ||
          !profileData.city
        ) {
          router.push("/photographer-onboarding");
          return;
        }

        setProfile(profileData);
      } catch {
        setError("Could not load your profile.");
      } finally {
        setLoadingProfile(false);
      }
    })();

    (async () => {
      try {
        const res = await fetch("/api/photographer/me/bookings");
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings ?? []);
        }
      } catch {
        // non-blocking
      } finally {
        setLoadingBookings(false);
      }
    })();
  }, [router]);

  if (loadingProfile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#555", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14 }}>Loading your dashboard…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "#c0392b", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14 }}>{error || "Profile not found."}</p>
        <Link href="/" style={{ color: "#c9a84c", fontSize: 13, fontFamily: "Hanken Grotesk, sans-serif" }}>← Back to home</Link>
      </div>
    );
  }

  const hourlyRateDollars = profile.hourlyRate / 100;

  const confirmedBookings = bookings.filter(b => ["confirmed", "completed", "paid"].includes(b.status?.toLowerCase()));
  const pendingBookings = bookings.filter(b => b.status?.toLowerCase() === "pending");

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        .page { min-height: 100vh; background: #0a0a0a; font-family: 'Hanken Grotesk', sans-serif; color: #f5f0e8; }
        .topnav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 56px; border-bottom: 1px solid #1e1e1e;
          background: #0d0d0d; position: sticky; top: 0; z-index: 10;
        }
        .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.12em; color: #c9a84c; text-decoration: none; }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-name { font-size: 13px; color: #888; }
        .nav-link { font-size: 12px; color: #555; text-decoration: none; letter-spacing: 0.04em; transition: color 0.15s; }
        .nav-link:hover { color: #c9a84c; }
        .nav-edit { font-size: 12px; font-weight: 600; font-family: inherit; letter-spacing: 0.05em; padding: 6px 14px; border-radius: 5px; border: 1px solid #2a2a2a; background: transparent; color: #888; cursor: pointer; transition: all 0.15s; text-decoration: none; }
        .nav-edit:hover { border-color: #555; color: #ccc; }
        .stripe-banner { background: #0d1a10; border-bottom: 1px solid #1a3a1a; padding: 12px 24px; font-size: 13px; color: #27ae60; display: flex; align-items: center; gap: 8px; }
        .stripe-warn { background: #1a1200; border-bottom: 1px solid #3a2800; padding: 12px 24px; font-size: 13px; color: #c9a84c; display: flex; align-items: center; gap: 8px; }
        .main { max-width: 960px; margin: 0 auto; padding: 32px 24px 80px; }
        .profile-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 32px; }
        .avatar {
          width: 64px; height: 64px; border-radius: 10px; background: #1e1e1e;
          border: 1px solid #2a2a2a; flex-shrink: 0; display: flex; align-items: center;
          justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 26px;
          color: #c9a84c; letter-spacing: 0.05em; overflow: hidden;
        }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-info { flex: 1; min-width: 0; }
        .profile-name { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.06em; color: #f5f0e8; margin-bottom: 4px; }
        .profile-meta { font-size: 13px; color: #666; margin-bottom: 8px; }
        .profile-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .badge-connected { background: #0d2b0d; color: #27ae60; border: 1px solid #1a4a1a; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
        .badge-pending { background: #1a1200; color: #c9a84c; border: 1px solid #3a2800; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 32px; }
        .stat-card { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 16px 18px; }
        .stat-label { font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #555; margin-bottom: 8px; }
        .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.04em; color: #c9a84c; }
        .stat-sub { font-size: 11px; color: #444; margin-top: 2px; }
        .tabs { display: flex; border-bottom: 1px solid #1e1e1e; margin-bottom: 24px; }
        .tab-btn { padding: 10px 20px; font-size: 13px; font-weight: 500; font-family: inherit; letter-spacing: 0.04em; color: #555; background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
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
        .empty-state { text-align: center; padding: 48px 24px; color: #444; font-size: 14px; }
        .empty-sub { font-size: 12px; color: #333; margin-top: 6px; }
        .info-card { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 20px 22px; margin-bottom: 20px; }
        .info-card-label { font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #555; margin-bottom: 10px; }
        .info-card-body { font-size: 14px; color: #aaa; line-height: 1.7; }
        .stripe-cta { background: #0d2b0d; border: 1px solid #1a4a1a; border-radius: 10px; padding: 20px 22px; margin-bottom: 20px; }
        .stripe-cta-title { font-size: 14px; font-weight: 600; color: #27ae60; margin-bottom: 6px; }
        .stripe-cta-body { font-size: 13px; color: #555; line-height: 1.6; margin-bottom: 14px; }
        .btn-green { font-size: 13px; font-weight: 600; font-family: inherit; padding: 9px 20px; border-radius: 6px; border: none; background: #27ae60; color: #fff; cursor: pointer; transition: background 0.15s; }
        .btn-green:hover { background: #2ecc71; }
        .specialties-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .specialty-tag { font-size: 11px; padding: 3px 10px; border-radius: 99px; border: 1px solid #2a2a2a; color: #666; }
        @media (max-width: 600px) {
          .main { padding: 20px 16px 60px; }
          .profile-header { flex-direction: column; gap: 12px; }
          .stat-grid { grid-template-columns: 1fr 1fr; }
          .topnav { padding: 0 16px; }
        }
      `}</style>

      <div className="page">
        {!profile.stripeConnected && (
          <div className="stripe-warn">
            ⚠️ Your profile is not yet publicly bookable — connect Stripe to start accepting payments.
          </div>
        )}

        <nav className="topnav">
          <Link href="/" className="nav-logo">OUTSYDE</Link>
          <div className="nav-right">
            <span className="nav-name">{profile.displayName}</span>
            <Link href="/photographer-onboarding" className="nav-edit">Edit Profile</Link>
            <Link href="/api/auth/logout" className="nav-link" onClick={async (e) => {
              e.preventDefault();
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
            }}>Log Out</Link>
          </div>
        </nav>

        <div className="main">
          <div className="profile-header">
            <div className="avatar">
              {profile.logoImage
                ? <img src={profile.logoImage} alt={profile.displayName} />
                : profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <div className="profile-name">{profile.displayName}</div>
              <div className="profile-meta">
                {profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.city || ""}
                {profile.hourlyRate ? ` · $${hourlyRateDollars}/hr` : ""}
              </div>
              <div className="profile-badges">
                {profile.stripeConnected
                  ? <span className="badge-connected">Stripe connected</span>
                  : <span className="badge-pending">Stripe not connected</span>}
                {profile.rating && profile.reviewCount ? (
                  <span style={{ fontSize: 12, color: "#666" }}>
                    ⭐ {profile.rating.toFixed(1)} ({profile.reviewCount} reviews)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Bookings</div>
              <div className="stat-value">{confirmedBookings.length}</div>
              <div className="stat-sub">Confirmed & completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{pendingBookings.length}</div>
              <div className="stat-sub">Awaiting confirmation</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Followers</div>
              <div className="stat-value">{profile.followerCount ?? 0}</div>
              <div className="stat-sub">On Outsyde</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Rate</div>
              <div className="stat-value">${hourlyRateDollars}</div>
              <div className="stat-sub">Per hour</div>
            </div>
          </div>

          <div className="tabs">
            {(["overview", "bookings"] as Tab[]).map((t) => (
              <button
                key={t}
                className={`tab-btn${tab === t ? " active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "bookings" && bookings.length > 0 && ` (${bookings.length})`}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div>
              {!profile.stripeConnected && (
                <div className="stripe-cta">
                  <div className="stripe-cta-title">Connect Stripe to get paid</div>
                  <div className="stripe-cta-body">
                    Your profile exists but isn&apos;t publicly bookable yet. Connect your Stripe account to accept bookings and receive payouts.
                  </div>
                  <button className="btn-green" onClick={async () => {
                    try {
                      const res = await fetch("/api/photographer/me/stripe-onboarding", { method: "POST" });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                    } catch {
                      alert("Could not start Stripe onboarding. Please try again.");
                    }
                  }}>
                    Connect Stripe →
                  </button>
                </div>
              )}

              {profile.bio && (
                <div className="info-card">
                  <div className="info-card-label">Bio</div>
                  <div className="info-card-body">{profile.bio}</div>
                </div>
              )}

              {profile.specialties && profile.specialties.length > 0 && (
                <div className="info-card">
                  <div className="info-card-label">Specialties</div>
                  <div className="specialties-list">
                    {profile.specialties.map((s) => (
                      <span key={s} className="specialty-tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.portfolioUrl && (
                <div className="info-card">
                  <div className="info-card-label">Portfolio</div>
                  <div className="info-card-body">
                    <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#c9a84c", textDecoration: "none" }}>
                      {profile.portfolioUrl}
                    </a>
                  </div>
                </div>
              )}

              {!loadingBookings && bookings.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#555", marginBottom: 12 }}>
                    Recent bookings
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Customer</th><th>Date</th><th>Service</th><th>You earn</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {bookings.slice(0, 5).map((b) => (
                          <tr key={b.id}>
                            <td style={{ color: "#f5f0e8" }}>{b.customerName}</td>
                            <td>{b.date}</td>
                            <td>{b.serviceName ?? "—"}</td>
                            <td className="amount" style={{ color: "#27ae60" }}>${b.vendorNetAmount?.toFixed(2)}</td>
                            <td><span className={statusColor(b.status)}>{b.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bookings.length > 5 && (
                    <button className="tab-btn" style={{ marginTop: 12, padding: "8px 0" }} onClick={() => setTab("bookings")}>
                      View all {bookings.length} bookings →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "bookings" && (
            <div className="table-wrap">
              {loadingBookings ? (
                <p style={{ color: "#333", fontSize: 13, padding: "32px 0", textAlign: "center" }}>Loading bookings…</p>
              ) : bookings.length === 0 ? (
                <div className="empty-state">
                  <p>No bookings yet</p>
                  <p className="empty-sub">Bookings will appear here once clients schedule sessions.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th><th>Date</th><th>Time</th><th>Service</th>
                      <th>Subtotal</th><th>Fee</th><th>You earn</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td style={{ color: "#f5f0e8" }}>{b.customerName}</td>
                        <td>{b.date}</td>
                        <td>{b.time}</td>
                        <td>{b.serviceName ?? "—"}</td>
                        <td className="amount">${b.subtotalAmount?.toFixed(2)}</td>
                        <td style={{ color: "#c0392b" }}>-${b.bookingFeeAmount?.toFixed(2)}</td>
                        <td style={{ color: "#27ae60", fontWeight: 600 }}>${b.vendorNetAmount?.toFixed(2)}</td>
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
