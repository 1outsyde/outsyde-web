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
  hourlyRateCents?: number;
  portfolioUrl?: string;
  specialties?: string[];
  followerCount?: number;
  stripeConnected?: boolean;
  isProfileComplete?: boolean;
  approvalStatus?: string;
}

interface Booking {
  id: string;
  status: string;
  date: string;
  time: string;
  customerName: string;
  serviceName?: string | null;
  subtotalAmount: number;
  bookingFeeAmount: number;
  vendorNetAmount: number;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  priceCents?: number;
  status: string;
}

type Tab = "overview" | "bookings" | "services";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function statusColor(status: string): string {
  const s = status?.toLowerCase();
  if (["confirmed", "completed", "live", "active"].includes(s)) return "status-green";
  if (["pending", "pending_payment", "draft"].includes(s)) return "status-yellow";
  if (["cancelled", "rejected", "archived"].includes(s)) return "status-red";
  return "status-gray";
}

export default function PhotographerDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);

  const [error, setError] = useState("");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [serviceActionLoading, setServiceActionLoading] = useState<Record<string, boolean>>({});
  const [serviceActionErrors, setServiceActionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.status === 401) { router.push("/login"); return; }
        const meData = await meRes.json();
        if (meData.role !== "photographer") { router.push("/"); return; }

        const profileRes = await fetch("/api/photographer/me");
        if (!profileRes.ok) { router.push("/photographer-onboarding"); return; }
        const profileData = await profileRes.json();
        if (!profileData.isProfileComplete) { router.push("/photographer-onboarding"); return; }
        setProfile(profileData);
      } catch {
        setError("Could not load your profile.");
      } finally {
        setLoadingProfile(false);
      }
    })();

    (async () => {
      try {
        const res = await fetch("/api/photographer/bookings");
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings ?? []);
        }
      } catch { /* non-blocking */ }
      finally { setLoadingBookings(false); }
    })();

    (async () => {
      try {
        const res = await fetch("/api/photographer/services");
        if (res.ok) {
          const data = await res.json();
          setServices(data.services ?? []);
        }
      } catch { /* non-blocking */ }
      finally { setLoadingServices(false); }
    })();
  }, [router]);

  async function handleStripeConnect() {
    setStripeLoading(true);
    setStripeError("");
    try {
      const res = await fetch("/api/photographer/stripe-onboarding", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStripeError(data.error || "Could not start Stripe onboarding.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setStripeError("Network error. Please try again.");
    } finally {
      setStripeLoading(false);
    }
  }

  async function handleStripeDashboard() {
    try {
      const res = await fetch("/api/photographer/stripe-dashboard-link");
      const data = await res.json();
      if (res.ok && data.url) window.open(data.url, "_blank");
    } catch { /* ignore */ }
  }

  async function handleGoLive(serviceId: string) {
    setServiceActionLoading((l) => ({ ...l, [serviceId]: true }));
    setServiceActionErrors((e) => ({ ...e, [serviceId]: "" }));
    try {
      const res = await fetch(`/api/photographer/services/${serviceId}/go-live`, { method: "POST" });
      if (res.ok) {
        setServices((prev) => prev.map((s) => s.id === serviceId ? { ...s, status: "live" } : s));
      } else {
        const data = await res.json();
        setServiceActionErrors((e) => ({ ...e, [serviceId]: data.error || "Failed to go live." }));
      }
    } catch {
      setServiceActionErrors((e) => ({ ...e, [serviceId]: "Network error." }));
    } finally {
      setServiceActionLoading((l) => ({ ...l, [serviceId]: false }));
    }
  }

  async function handleArchive(serviceId: string) {
    setServiceActionLoading((l) => ({ ...l, [serviceId]: true }));
    setServiceActionErrors((e) => ({ ...e, [serviceId]: "" }));
    try {
      const res = await fetch(`/api/photographer/services/${serviceId}/archive`, { method: "POST" });
      if (res.ok) {
        setServices((prev) => prev.map((s) => s.id === serviceId ? { ...s, status: "archived" } : s));
      } else {
        const data = await res.json();
        setServiceActionErrors((e) => ({ ...e, [serviceId]: data.error || "Failed to archive." }));
      }
    } catch {
      setServiceActionErrors((e) => ({ ...e, [serviceId]: "Network error." }));
    } finally {
      setServiceActionLoading((l) => ({ ...l, [serviceId]: false }));
    }
  }

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

  const nextBooking = bookings.find((b) => ["confirmed", "pending"].includes(b.status?.toLowerCase()));

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        .page { min-height: 100vh; background: #0a0a0a; font-family: 'Hanken Grotesk', sans-serif; color: #f5f0e8; }
        .topnav { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 56px; border-bottom: 1px solid #1e1e1e; background: #0d0d0d; position: sticky; top: 0; z-index: 10; }
        .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.12em; color: #c9a84c; text-decoration: none; }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-name { font-size: 13px; color: #888; }
        .nav-logout { font-size: 12px; color: #555; text-decoration: none; letter-spacing: 0.04em; transition: color 0.15s; }
        .nav-logout:hover { color: #c9a84c; }
        .main { max-width: 960px; margin: 0 auto; padding: 32px 24px 80px; }
        .profile-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 32px; }
        .avatar { width: 64px; height: 64px; border-radius: 10px; background: #1e1e1e; border: 1px solid #2a2a2a; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 24px; color: #c9a84c; letter-spacing: 0.05em; }
        .profile-info { flex: 1; min-width: 0; }
        .profile-name { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 0.06em; color: #f5f0e8; margin-bottom: 4px; }
        .profile-meta { font-size: 13px; color: #666; margin-bottom: 8px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 32px; }
        .stat-card { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 16px 18px; }
        .stat-label { font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #555; margin-bottom: 8px; }
        .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.04em; color: #c9a84c; }
        .stat-sub { font-size: 11px; color: #444; margin-top: 2px; }
        .stripe-banner { background: #0d1a14; border: 1px solid #1a3d28; border-radius: 10px; padding: 20px 22px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .stripe-banner-text { font-size: 14px; color: #aaa; line-height: 1.6; }
        .stripe-banner-text strong { color: #1abc9c; }
        .stripe-banner-error { font-size: 12px; color: #c0392b; margin-top: 6px; }
        .btn-stripe { font-size: 13px; font-weight: 600; font-family: inherit; letter-spacing: 0.04em; padding: 9px 20px; border-radius: 6px; border: none; background: #1abc9c; color: #000; cursor: pointer; transition: background 0.15s; white-space: nowrap; flex-shrink: 0; }
        .btn-stripe:hover { background: #17a589; }
        .btn-stripe:disabled { opacity: 0.5; cursor: default; }
        .tabs { display: flex; border-bottom: 1px solid #1e1e1e; margin-bottom: 24px; }
        .tab-btn { padding: 10px 20px; font-size: 13px; font-weight: 500; font-family: inherit; letter-spacing: 0.04em; color: #555; background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
        .tab-btn:hover { color: #aaa; }
        .tab-btn.active { color: #c9a84c; border-bottom-color: #c9a84c; }
        .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 20px 22px; margin-bottom: 16px; }
        .card-label { font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #555; margin-bottom: 12px; }
        .booking-card { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; }
        .booking-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 6px; }
        .booking-customer { font-size: 14px; font-weight: 600; color: #f5f0e8; }
        .booking-meta { font-size: 12px; color: #666; margin-bottom: 8px; }
        .booking-earnings { font-size: 13px; color: #aaa; }
        .booking-earnings .net { color: #27ae60; font-weight: 600; }
        .service-card { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; }
        .service-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 6px; }
        .service-name { font-size: 14px; font-weight: 600; color: #f5f0e8; }
        .service-desc { font-size: 13px; color: #666; margin-bottom: 10px; line-height: 1.5; }
        .service-price { font-size: 13px; color: #aaa; margin-bottom: 12px; }
        .service-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-gold { font-size: 12px; font-weight: 600; font-family: inherit; letter-spacing: 0.05em; padding: 7px 16px; border-radius: 5px; border: none; background: #c9a84c; color: #000; cursor: pointer; transition: background 0.15s; }
        .btn-gold:hover { background: #d4b55e; }
        .btn-gold:disabled { opacity: 0.5; cursor: default; }
        .btn-gray { font-size: 12px; font-weight: 600; font-family: inherit; letter-spacing: 0.05em; padding: 7px 16px; border-radius: 5px; border: 1px solid #3a3a3a; background: transparent; color: #666; cursor: pointer; transition: background 0.15s; }
        .btn-gray:hover { background: #1e1e1e; }
        .btn-gray:disabled { opacity: 0.5; cursor: default; }
        .service-action-error { font-size: 12px; color: #c0392b; margin-top: 8px; }
        .status-green { background: #0d2b0d; color: #27ae60; border: 1px solid #1a4a1a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .status-yellow { background: #1a1200; color: #c9a84c; border: 1px solid #3a2800; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .status-red { background: #2b0d0d; color: #c0392b; border: 1px solid #4a1a1a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .status-gray { background: #1a1a1a; color: #666; border: 1px solid #2a2a2a; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .empty-state { text-align: center; padding: 48px 24px; color: #444; font-size: 14px; }
        .empty-sub { font-size: 12px; color: #333; margin-top: 6px; }
        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .stripe-connected-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
        .stripe-connected-dot { width: 8px; height: 8px; border-radius: 50%; background: #1abc9c; }
        .stripe-connected-text { font-size: 12px; color: #1abc9c; }
        .btn-link { background: transparent; border: none; color: #c9a84c; font-size: 12px; font-family: inherit; cursor: pointer; text-decoration: underline; padding: 0; }
        @media (max-width: 600px) {
          .main { padding: 20px 16px 60px; }
          .profile-header { flex-direction: column; gap: 12px; }
          .stat-grid { grid-template-columns: 1fr 1fr; }
          .overview-grid { grid-template-columns: 1fr; }
          .topnav { padding: 0 16px; }
        }
      `}</style>

      <div className="page">
        <nav className="topnav">
          <Link href="/" className="nav-logo">OUTSYDE</Link>
          <div className="nav-right">
            <span className="nav-name">{profile.displayName}</span>
            <Link href="/api/auth/logout" className="nav-logout">Sign out</Link>
          </div>
        </nav>

        <div className="main">
          <div className="profile-header">
            <div className="avatar">{profile.displayName.charAt(0)}</div>
            <div className="profile-info">
              <div className="profile-name">{profile.displayName}</div>
              <div className="profile-meta">
                {profile.city && profile.state ? `${profile.city}, ${profile.state}` : ""}
                {profile.hourlyRateCents ? ` · ${formatCents(profile.hourlyRateCents)}/hr` : ""}
              </div>
              {profile.stripeConnected && (
                <div className="stripe-connected-row">
                  <div className="stripe-connected-dot" />
                  <span className="stripe-connected-text">Stripe connected</span>
                  <button className="btn-link" onClick={handleStripeDashboard}>Open Stripe dashboard ↗</button>
                </div>
              )}
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Followers</div>
              <div className="stat-value">{profile.followerCount ?? 0}</div>
              <div className="stat-sub">People following you</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bookings</div>
              <div className="stat-value">{loadingBookings ? "—" : bookings.length}</div>
              <div className="stat-sub">Total bookings</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Services</div>
              <div className="stat-value">{loadingServices ? "—" : services.length}</div>
              <div className="stat-sub">Listed services</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Hourly rate</div>
              <div className="stat-value" style={{ fontSize: 22 }}>
                {profile.hourlyRateCents ? formatCents(profile.hourlyRateCents) : "—"}
              </div>
              <div className="stat-sub">Per hour</div>
            </div>
          </div>

          <div className="tabs">
            {(["overview", "bookings", "services"] as Tab[]).map((t) => (
              <button
                key={t}
                className={`tab-btn${tab === t ? " active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "bookings" && bookings.length > 0 && ` (${bookings.length})`}
                {t === "services" && services.length > 0 && ` (${services.length})`}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div>
              {!profile.stripeConnected && (
                <div className="stripe-banner">
                  <div>
                    <div className="stripe-banner-text">
                      <strong>Connect Stripe to accept bookings.</strong> Your profile won&apos;t accept payments until you connect a Stripe account. It only takes a few minutes.
                    </div>
                    {stripeError && <div className="stripe-banner-error">{stripeError}</div>}
                  </div>
                  <button className="btn-stripe" onClick={handleStripeConnect} disabled={stripeLoading}>
                    {stripeLoading ? "Redirecting…" : "Connect Stripe →"}
                  </button>
                </div>
              )}

              <div className="overview-grid">
                <div className="card">
                  <div className="card-label">Profile</div>
                  {profile.bio && (
                    <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6, marginBottom: 12 }}>{profile.bio}</p>
                  )}
                  {profile.portfolioUrl && (
                    <a
                      href={profile.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, color: "#c9a84c", wordBreak: "break-all" }}
                    >
                      Portfolio ↗
                    </a>
                  )}
                  {profile.specialties && profile.specialties.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                      {profile.specialties.map((s) => (
                        <span
                          key={s}
                          style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, border: "1px solid #2a2a2a", color: "#666", background: "#0f0f0f" }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-label">Next booking</div>
                  {loadingBookings ? (
                    <p style={{ fontSize: 13, color: "#444" }}>Loading…</p>
                  ) : nextBooking ? (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", marginBottom: 4 }}>{nextBooking.customerName}</div>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                        {nextBooking.date} at {nextBooking.time}
                        {nextBooking.serviceName && ` · ${nextBooking.serviceName}`}
                      </div>
                      <span className={statusColor(nextBooking.status)}>{nextBooking.status}</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "#444" }}>No upcoming bookings</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "bookings" && (
            <div>
              {loadingBookings ? (
                <div className="empty-state"><p>Loading bookings…</p></div>
              ) : bookings.length === 0 ? (
                <div className="empty-state">
                  <p>No bookings yet</p>
                  <p className="empty-sub">Bookings will appear here once clients schedule sessions.</p>
                </div>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} className="booking-card">
                    <div className="booking-header">
                      <span className="booking-customer">{b.customerName}</span>
                      <span className={statusColor(b.status)}>{b.status}</span>
                    </div>
                    <div className="booking-meta">
                      {b.date} at {b.time}
                      {b.serviceName && ` · ${b.serviceName}`}
                    </div>
                    <div className="booking-earnings">
                      Subtotal: ${b.subtotalAmount?.toFixed(2)}
                      &nbsp;·&nbsp;Fee: −${b.bookingFeeAmount?.toFixed(2)}
                      &nbsp;·&nbsp;<span className="net">You earn: ${b.vendorNetAmount?.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "services" && (
            <div>
              {loadingServices ? (
                <div className="empty-state"><p>Loading services…</p></div>
              ) : services.length === 0 ? (
                <div className="empty-state">
                  <p>No services yet</p>
                  <p className="empty-sub">Services you create will appear here.</p>
                </div>
              ) : (
                services.map((svc) => (
                  <div key={svc.id} className="service-card">
                    <div className="service-header">
                      <span className="service-name">{svc.name}</span>
                      <span className={statusColor(svc.status)}>{svc.status}</span>
                    </div>
                    {svc.description && (
                      <div className="service-desc">{svc.description}</div>
                    )}
                    {svc.priceCents != null && (
                      <div className="service-price">{formatCents(svc.priceCents)}</div>
                    )}
                    <div className="service-actions">
                      {svc.status !== "live" && svc.status !== "active" && (
                        <button
                          className="btn-gold"
                          disabled={!!serviceActionLoading[svc.id]}
                          onClick={() => handleGoLive(svc.id)}
                        >
                          {serviceActionLoading[svc.id] ? "…" : "Go Live"}
                        </button>
                      )}
                      {svc.status !== "archived" && (
                        <button
                          className="btn-gray"
                          disabled={!!serviceActionLoading[svc.id]}
                          onClick={() => handleArchive(svc.id)}
                        >
                          {serviceActionLoading[svc.id] ? "…" : "Archive"}
                        </button>
                      )}
                    </div>
                    {serviceActionErrors[svc.id] && (
                      <div className="service-action-error">{serviceActionErrors[svc.id]}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
