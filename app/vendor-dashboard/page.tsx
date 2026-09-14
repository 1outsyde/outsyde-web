"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HoursDay { open: string; close: string; closed?: boolean; }

interface Business {
  id: string;
  name: string;
  category: string;
  logoImage?: string;
  coverImage?: string;
  approvalStatus: string;
  rating?: number;
  reviewCount?: number;
  followerCount?: number;
  followingCount?: number;
  city?: string;
  state?: string;
  description?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  subscriptionActive?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showWebsite?: boolean;
  showStoreHours?: boolean;
  showAddress?: boolean;
  responseTimeValue?: number;
  responseTimeUnit?: string;
  hoursOfOperation?: Record<string, HoursDay>;
}

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
type Day = typeof DAYS[number];

const DEFAULT_HOURS: Record<Day, HoursDay> = {
  monday:    { open: '09:00', close: '17:00' },
  tuesday:   { open: '09:00', close: '17:00' },
  wednesday: { open: '09:00', close: '17:00' },
  thursday:  { open: '09:00', close: '17:00' },
  friday:    { open: '09:00', close: '17:00' },
  saturday:  { open: '10:00', close: '15:00', closed: true },
  sunday:    { open: '10:00', close: '15:00', closed: true },
};

interface StorefrontForm {
  name: string;
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  city: string;
  state: string;
  logoImage: string;
  coverImage: string;
  showEmail: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  showStoreHours: boolean;
  showAddress: boolean;
  responseTimeValue: number;
  responseTimeUnit: string;
  hoursOfOperation: Record<Day, HoursDay>;
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

type Tab = "overview" | "orders" | "bookings" | "storefront";

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

  const [sfForm, setSfForm] = useState<StorefrontForm | null>(null);
  const [sfSaving, setSfSaving] = useState(false);
  const [sfError, setSfError] = useState("");
  const [sfSuccess, setSfSuccess] = useState(false);
  const [sfLogoUploading, setSfLogoUploading] = useState(false);
  const [sfCoverUploading, setSfCoverUploading] = useState(false);

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
        const biz = data.business;
        setBusiness(biz);
        const hours: Record<Day, HoursDay> = { ...DEFAULT_HOURS };
        if (biz.hoursOfOperation) {
          for (const d of DAYS) {
            const h = biz.hoursOfOperation[d];
            if (h) hours[d] = { open: h.open ?? '09:00', close: h.close ?? '17:00', closed: h.closed ?? false };
          }
        }
        setSfForm({
          name: biz.name ?? '',
          tagline: biz.tagline ?? '',
          description: biz.description ?? '',
          contactEmail: biz.contactEmail ?? '',
          contactPhone: biz.contactPhone ?? '',
          websiteUrl: biz.websiteUrl ?? '',
          city: biz.city ?? '',
          state: biz.state ?? '',
          logoImage: biz.logoImage ?? '',
          coverImage: biz.coverImage ?? '',
          showEmail: biz.showEmail ?? true,
          showPhone: biz.showPhone ?? true,
          showWebsite: biz.showWebsite ?? true,
          showStoreHours: biz.showStoreHours ?? true,
          showAddress: biz.showAddress ?? true,
          responseTimeValue: biz.responseTimeValue ?? 2,
          responseTimeUnit: biz.responseTimeUnit ?? 'hours',
          hoursOfOperation: hours,
        });
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

  async function handleUploadImage(file: File, folder: string): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);
    const res = await fetch('/api/vendor-dashboard/upload-image', { method: 'POST', body: fd });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? 'Upload failed');
    }
    const { url } = await res.json();
    return url;
  }

  async function handleSaveStorefront() {
    if (!sfForm) return;
    setSfSaving(true);
    setSfError('');
    setSfSuccess(false);
    try {
      const res = await fetch('/api/vendor-dashboard/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sfForm.name.trim(),
          tagline: sfForm.tagline.trim(),
          description: sfForm.description.trim(),
          contactEmail: sfForm.contactEmail.trim(),
          contactPhone: sfForm.contactPhone.trim(),
          websiteUrl: sfForm.websiteUrl.trim(),
          city: sfForm.city.trim(),
          state: sfForm.state.trim(),
          logoImage: sfForm.logoImage.trim() || null,
          coverImage: sfForm.coverImage.trim() || null,
          coverMediaType: sfForm.coverImage.trim() ? 'image' : null,
          showEmail: sfForm.showEmail,
          showPhone: sfForm.showPhone,
          showWebsite: sfForm.showWebsite,
          showStoreHours: sfForm.showStoreHours,
          showAddress: sfForm.showAddress,
          responseTimeValue: sfForm.responseTimeValue,
          responseTimeUnit: sfForm.responseTimeUnit,
          hoursOfOperation: sfForm.hoursOfOperation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSfError(data.error ?? 'Failed to save. Please try again.');
      } else {
        setBusiness(prev => prev ? { ...prev, ...data.business } : prev);
        setSfSuccess(true);
        setTimeout(() => setSfSuccess(false), 3000);
      }
    } catch {
      setSfError('Network error. Please try again.');
    } finally {
      setSfSaving(false);
    }
  }

  async function handleManagePayouts() {
    try {
      const res = await fetch("/api/vendor/stripe-dashboard-link");
      if (res.ok) {
        const { url } = await res.json();
        if (url) { window.open(url, "_blank"); }
        else { alert("Could not open Stripe dashboard. Make sure Stripe is connected."); }
      } else {
        alert("Could not open Stripe dashboard. Make sure Stripe is connected.");
      }
    } catch {
      alert("Network error. Please try again.");
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
        .sf-section { margin-bottom: 28px; }
        .sf-section-title { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #1e1e1e; }
        .sf-field { margin-bottom: 16px; }
        .sf-label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #666; margin-bottom: 6px; }
        .sf-input { width: 100%; padding: 9px 12px; background: #141414; border: 1px solid #2a2a2a; border-radius: 6px; color: #f5f0e8; font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.15s; }
        .sf-input:focus { border-color: #c9a84c; }
        .sf-textarea { width: 100%; padding: 9px 12px; background: #141414; border: 1px solid #2a2a2a; border-radius: 6px; color: #f5f0e8; font-size: 13px; font-family: inherit; outline: none; resize: vertical; min-height: 90px; transition: border-color 0.15s; }
        .sf-textarea:focus { border-color: #c9a84c; }
        .sf-select { width: 100%; padding: 9px 12px; background: #141414; border: 1px solid #2a2a2a; border-radius: 6px; color: #f5f0e8; font-size: 13px; font-family: inherit; outline: none; cursor: pointer; }
        .sf-select:focus { border-color: #c9a84c; }
        .sf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .sf-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #141414; font-size: 13px; color: #aaa; }
        .sf-toggle-row:last-child { border-bottom: none; }
        .sf-toggle { position: relative; display: inline-block; width: 38px; height: 22px; flex-shrink: 0; }
        .sf-toggle input { opacity: 0; width: 0; height: 0; }
        .sf-toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #2a2a2a; border-radius: 22px; transition: 0.2s; }
        .sf-toggle-slider::before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; bottom: 3px; background: #666; border-radius: 50%; transition: 0.2s; }
        .sf-toggle input:checked + .sf-toggle-slider { background: #1a3c34; }
        .sf-toggle input:checked + .sf-toggle-slider::before { transform: translateX(16px); background: #c9a84c; }
        .sf-hours-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #141414; }
        .sf-hours-row:last-child { border-bottom: none; }
        .sf-day-label { width: 90px; font-size: 12px; color: #666; text-transform: capitalize; flex-shrink: 0; }
        .sf-time-input { width: 100px; padding: 6px 8px; background: #141414; border: 1px solid #2a2a2a; border-radius: 5px; color: #f5f0e8; font-size: 12px; font-family: inherit; outline: none; }
        .sf-time-input:focus { border-color: #c9a84c; }
        .sf-time-input:disabled { opacity: 0.3; cursor: not-allowed; }
        .sf-closed-label { font-size: 12px; color: #555; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .sf-img-row { display: flex; align-items: center; gap: 12px; }
        .sf-img-preview { width: 52px; height: 52px; border-radius: 7px; object-fit: cover; border: 1px solid #2a2a2a; background: #1e1e1e; flex-shrink: 0; }
        .sf-img-placeholder { width: 52px; height: 52px; border-radius: 7px; background: #1e1e1e; border: 1px solid #2a2a2a; display: flex; align-items: center; justify-content: center; color: #333; font-size: 20px; flex-shrink: 0; }
        .sf-upload-btn { font-size: 12px; font-weight: 500; font-family: inherit; letter-spacing: 0.04em; padding: 6px 14px; border-radius: 5px; border: 1px solid #3a3a3a; background: transparent; color: #888; cursor: pointer; transition: all 0.15s; }
        .sf-upload-btn:hover { color: #c9a84c; border-color: #c9a84c; }
        .sf-upload-btn:disabled { opacity: 0.4; cursor: default; }
        .sf-save-bar { position: sticky; bottom: 0; background: #0d0d0d; border-top: 1px solid #1e1e1e; padding: 14px 0; margin: 32px 0 0; display: flex; align-items: center; gap: 14px; }
        .sf-err { font-size: 13px; color: #c0392b; }
        .sf-ok { font-size: 13px; color: #27ae60; }
        @media (max-width: 600px) {
          .main { padding: 20px 16px 60px; }
          .profile-header { flex-direction: column; gap: 12px; }
          .stat-grid { grid-template-columns: 1fr 1fr; }
          .topnav { padding: 0 16px; }
          .sf-grid-2 { grid-template-columns: 1fr; }
          .sf-hours-row { flex-wrap: wrap; gap: 6px; }
          .sf-time-input { width: 90px; }
        }
      `}</style>

      <div className="page">
        {isPending && (
          <div className="pending-banner">
            ⏳ Your application is under review. You'll be notified once approved.
          </div>
        )}

        <div className="main">
          <div className="profile-header" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
            <button
              onClick={handleManagePayouts}
              style={{ padding: "9px 18px", background: "#1a3c34", color: "#c9a84c", border: "1px solid #2a4a3e", borderRadius: 6, fontSize: 13, fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 500, cursor: "pointer", letterSpacing: "0.02em", whiteSpace: "nowrap" }}
            >
              Manage Payouts
            </button>
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
            {(["overview", "orders", "bookings", "storefront"] as Tab[]).map((t) => (
              <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                {t === "storefront" ? "Edit Storefront" : t.charAt(0).toUpperCase() + t.slice(1)}
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

          {tab === "storefront" && sfForm && (
            <div>
              {/* Basic Info */}
              <div className="sf-section">
                <div className="sf-section-title">Basic Info</div>
                <div className="sf-field">
                  <label className="sf-label">Business Name</label>
                  <input className="sf-input" value={sfForm.name} onChange={e => setSfForm(f => f && ({ ...f, name: e.target.value }))} />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Tagline</label>
                  <input className="sf-input" placeholder="A short catchy line about your business" value={sfForm.tagline} onChange={e => setSfForm(f => f && ({ ...f, tagline: e.target.value }))} />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Description</label>
                  <textarea className="sf-textarea" placeholder="Tell customers about your business" value={sfForm.description} onChange={e => setSfForm(f => f && ({ ...f, description: e.target.value }))} />
                </div>
              </div>

              {/* Contact */}
              <div className="sf-section">
                <div className="sf-section-title">Contact</div>
                <div className="sf-grid-2">
                  <div className="sf-field">
                    <label className="sf-label">Email</label>
                    <input className="sf-input" type="email" value={sfForm.contactEmail} onChange={e => setSfForm(f => f && ({ ...f, contactEmail: e.target.value }))} />
                  </div>
                  <div className="sf-field">
                    <label className="sf-label">Phone</label>
                    <input className="sf-input" type="tel" value={sfForm.contactPhone} onChange={e => setSfForm(f => f && ({ ...f, contactPhone: e.target.value }))} />
                  </div>
                </div>
                <div className="sf-field">
                  <label className="sf-label">Website URL</label>
                  <input className="sf-input" type="url" placeholder="https://yoursite.com" value={sfForm.websiteUrl} onChange={e => setSfForm(f => f && ({ ...f, websiteUrl: e.target.value }))} />
                </div>
                <div className="sf-grid-2">
                  <div className="sf-field">
                    <label className="sf-label">City</label>
                    <input className="sf-input" value={sfForm.city} onChange={e => setSfForm(f => f && ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="sf-field">
                    <label className="sf-label">State</label>
                    <input className="sf-input" placeholder="e.g. VA" maxLength={2} value={sfForm.state} onChange={e => setSfForm(f => f && ({ ...f, state: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="sf-section">
                <div className="sf-section-title">Images</div>
                <div className="sf-field">
                  <label className="sf-label">Logo</label>
                  <div className="sf-img-row">
                    {sfForm.logoImage
                      ? <img src={sfForm.logoImage} alt="logo" className="sf-img-preview" />
                      : <div className="sf-img-placeholder">🖼</div>
                    }
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label>
                        <button
                          className="sf-upload-btn"
                          disabled={sfLogoUploading}
                          onClick={() => document.getElementById('sf-logo-input')?.click()}
                          type="button"
                        >
                          {sfLogoUploading ? 'Uploading…' : 'Upload Logo'}
                        </button>
                        <input
                          id="sf-logo-input"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setSfLogoUploading(true);
                            try {
                              const url = await handleUploadImage(file, 'logos');
                              setSfForm(f => f && ({ ...f, logoImage: url }));
                            } catch (err) {
                              setSfError(err instanceof Error ? err.message : 'Logo upload failed');
                            } finally {
                              setSfLogoUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      {sfForm.logoImage && (
                        <button className="sf-upload-btn" type="button" style={{ color: '#c0392b', borderColor: '#4a1a1a' }} onClick={() => setSfForm(f => f && ({ ...f, logoImage: '' }))}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="sf-field">
                  <label className="sf-label">Cover Image</label>
                  <div className="sf-img-row">
                    {sfForm.coverImage
                      ? <img src={sfForm.coverImage} alt="cover" className="sf-img-preview" style={{ width: 88 }} />
                      : <div className="sf-img-placeholder" style={{ width: 88 }}>🖼</div>
                    }
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label>
                        <button
                          className="sf-upload-btn"
                          disabled={sfCoverUploading}
                          onClick={() => document.getElementById('sf-cover-input')?.click()}
                          type="button"
                        >
                          {sfCoverUploading ? 'Uploading…' : 'Upload Cover'}
                        </button>
                        <input
                          id="sf-cover-input"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setSfCoverUploading(true);
                            try {
                              const url = await handleUploadImage(file, 'covers');
                              setSfForm(f => f && ({ ...f, coverImage: url }));
                            } catch (err) {
                              setSfError(err instanceof Error ? err.message : 'Cover upload failed');
                            } finally {
                              setSfCoverUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      {sfForm.coverImage && (
                        <button className="sf-upload-btn" type="button" style={{ color: '#c0392b', borderColor: '#4a1a1a' }} onClick={() => setSfForm(f => f && ({ ...f, coverImage: '' }))}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Settings */}
              <div className="sf-section">
                <div className="sf-section-title">What to Show on Your Storefront</div>
                {([
                  ['showEmail',      'Contact email'],
                  ['showPhone',      'Phone number'],
                  ['showWebsite',    'Website link'],
                  ['showStoreHours', 'Store hours'],
                  ['showAddress',    'Address'],
                ] as [keyof StorefrontForm, string][]).map(([key, label]) => (
                  <div key={key} className="sf-toggle-row">
                    <span>{label}</span>
                    <label className="sf-toggle">
                      <input
                        type="checkbox"
                        checked={sfForm[key] as boolean}
                        onChange={e => setSfForm(f => f && ({ ...f, [key]: e.target.checked }))}
                      />
                      <span className="sf-toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>

              {/* Response Time */}
              <div className="sf-section">
                <div className="sf-section-title">Typical Response Time</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    className="sf-input"
                    type="number"
                    min={1}
                    style={{ width: 80 }}
                    value={sfForm.responseTimeValue}
                    onChange={e => setSfForm(f => f && ({ ...f, responseTimeValue: parseInt(e.target.value) || 1 }))}
                  />
                  <select
                    className="sf-select"
                    value={sfForm.responseTimeUnit}
                    onChange={e => setSfForm(f => f && ({ ...f, responseTimeUnit: e.target.value }))}
                    style={{ flex: 1 }}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="business_days">Business days</option>
                  </select>
                </div>
              </div>

              {/* Hours of Operation */}
              <div className="sf-section">
                <div className="sf-section-title">Hours of Operation</div>
                {DAYS.map(day => {
                  const h = sfForm.hoursOfOperation[day];
                  return (
                    <div key={day} className="sf-hours-row">
                      <span className="sf-day-label">{day}</span>
                      <input
                        className="sf-time-input"
                        type="time"
                        value={h.open}
                        disabled={h.closed}
                        onChange={e => setSfForm(f => {
                          if (!f) return f;
                          return { ...f, hoursOfOperation: { ...f.hoursOfOperation, [day]: { ...h, open: e.target.value } } };
                        })}
                      />
                      <span style={{ color: '#444', fontSize: 12 }}>–</span>
                      <input
                        className="sf-time-input"
                        type="time"
                        value={h.close}
                        disabled={h.closed}
                        onChange={e => setSfForm(f => {
                          if (!f) return f;
                          return { ...f, hoursOfOperation: { ...f.hoursOfOperation, [day]: { ...h, close: e.target.value } } };
                        })}
                      />
                      <label className="sf-closed-label">
                        <input
                          type="checkbox"
                          checked={h.closed ?? false}
                          onChange={e => setSfForm(f => {
                            if (!f) return f;
                            return { ...f, hoursOfOperation: { ...f.hoursOfOperation, [day]: { ...h, closed: e.target.checked } } };
                          })}
                          style={{ accentColor: '#c9a84c' }}
                        />
                        Closed
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Save Bar */}
              <div className="sf-save-bar">
                <button className="btn-gold" onClick={handleSaveStorefront} disabled={sfSaving}>
                  {sfSaving ? 'Saving…' : 'Save Changes'}
                </button>
                {sfError && <span className="sf-err">{sfError}</span>}
                {sfSuccess && <span className="sf-ok">Saved!</span>}
              </div>
            </div>
          )}

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