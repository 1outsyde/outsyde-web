"use client";

// /admin/users/[id]: every answer a person gave at signup (2026-10-18), interests first.
// Data: GET /api/admin/users/[id] → backend `signupDetails.sections` (never password, reset
// fields, Stripe ids or ethnicity). Read only: Disable / Delete stay on the Users list.
// The admin layout gates this page.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface DetailRow {
  label: string;
  value: string;
  kind?: "text" | "image" | "link";
}
interface DetailSection {
  title: string;
  rows: DetailRow[];
}
interface AdminUserDetailUser {
  id: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  username?: string | null;
  isVendor: boolean;
  isPhotographer: boolean;
  isAdmin: boolean;
  isActive: boolean;
}
interface Detail {
  user: AdminUserDetailUser;
  signupDetails?: { sections: DetailSection[] };
  business?: { id: string; name?: string | null } | null;
  photographer?: { id: string; displayName?: string | null } | null;
  orders?: unknown[];
  bookings?: unknown[];
}

type LoadState = "loading" | "ok" | "unauthorized" | "forbidden" | "notfound" | "error";

const NOT_PROVIDED = "Not provided";

function userName(u: AdminUserDetailUser): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return u.name || full || (u.username ? `@${u.username}` : "") || u.email || u.id;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [state, setState] = useState<LoadState>("loading");
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = useCallback(async (): Promise<{ state: LoadState; detail: Detail | null }> => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`);
      if (res.status === 401) return { state: "unauthorized", detail: null };
      if (res.status === 403) return { state: "forbidden", detail: null };
      if (res.status === 404) return { state: "notfound", detail: null };
      if (!res.ok) return { state: "error", detail: null };
      const data = await res.json();
      return data?.user ? { state: "ok", detail: data } : { state: "error", detail: null };
    } catch {
      return { state: "error", detail: null };
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    load().then((r) => {
      if (cancelled) return;
      setDetail(r.detail);
      setState(r.state);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function reload() {
    setState("loading");
    const r = await load();
    setDetail(r.detail);
    setState(r.state);
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    .ad-page { font-family: 'Hanken Grotesk', 'Inter', sans-serif; color: #F5F0E6; max-width: 880px; }
    .ad-back { color: rgba(245,240,230,0.5); font-size: 13px; text-decoration: none; }
    .ad-back:hover { color: #E8B930; }
    .ad-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 14px 0 24px; flex-wrap: wrap; }
    .ad-h1 { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.04em; overflow-wrap: anywhere; }
    .ad-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .btn { font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 8px 16px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; letter-spacing: 0.03em; text-decoration: none; }
    .btn-gold { background: #E8B930; color: #000; }
    .btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
    .status-pill { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; font-weight: 600; }
    .st-active { background: rgba(74,222,128,0.15); color: #4ade80; }
    .st-disabled { background: rgba(255,107,107,0.15); color: #ff6b6b; }
    .ad-note { font-size: 12.5px; color: rgba(245,240,230,0.5); margin: -12px 0 18px; max-width: 640px; }
    .ad-card { background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08); border-radius: 10px; padding: 18px 20px; margin-bottom: 16px; }
    .ad-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.06em; color: #E8B930; margin-bottom: 10px; }
    .ad-row { display: grid; grid-template-columns: 200px 1fr; gap: 16px; padding: 8px 0; border-top: 1px solid rgba(245,240,230,0.06); font-size: 14px; }
    .ad-row:first-of-type { border-top: none; }
    .ad-label { color: rgba(245,240,230,0.5); font-size: 12.5px; }
    .ad-value { white-space: pre-wrap; overflow-wrap: anywhere; }
    .ad-muted { color: rgba(245,240,230,0.35); }
    .state-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40vh; text-align: center; gap: 8px; }
    .state-msg-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; }
    .state-msg-sub { color: rgba(245,240,230,0.5); font-size: 14px; max-width: 400px; }
    @media (max-width: 640px) {
      .ad-row { grid-template-columns: 1fr; gap: 2px; }
    }
  `;

  const shell = (body: React.ReactNode) => (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="ad-page">{body}</div>
    </>
  );

  if (state !== "ok" || !detail) {
    const messages: Record<Exclude<LoadState, "ok">, [string, React.ReactNode]> = {
      loading: ["Loading…", null],
      unauthorized: ["Not signed in", <><Link href="/login" style={{ color: "#E8B930" }}>Log in</Link> to access the admin dashboard.</>],
      forbidden: ["Not authorized", "Your account doesn’t have admin access."],
      notfound: ["User not found", "They may have been removed."],
      error: ["Couldn’t load this user", "Check your connection and try again."],
    };
    const [title, sub] = messages[state === "ok" ? "error" : state];
    return shell(
      <div className="state-msg">
        <div className="state-msg-title">{title}</div>
        {sub && <div className="state-msg-sub">{sub}</div>}
        {state === "error" && <button className="btn btn-gold" onClick={reload}>Retry</button>}
        <Link href="/admin/users" className="ad-back">← All users</Link>
      </div>,
    );
  }

  const u = detail.user;
  const sections = detail.signupDetails?.sections ?? [];
  const orders = detail.orders?.length ?? 0;
  const bookings = detail.bookings?.length ?? 0;

  return shell(
    <>
      <Link href="/admin/users" className="ad-back">← All users</Link>

      <div className="ad-head">
        <div className="ad-h1">{userName(u)}</div>
        <div className="ad-actions">
          <span className={`status-pill ${u.isActive === false ? "st-disabled" : "st-active"}`}>
            {u.isActive === false ? "disabled" : "active"}
          </span>
          {u.isVendor && detail.business?.id && (
            <Link href={`/admin/applications/${encodeURIComponent(detail.business.id)}`} className="btn btn-ghost">Business details</Link>
          )}
          {u.isPhotographer && detail.photographer?.id && (
            <Link href={`/admin/photographers/${encodeURIComponent(detail.photographer.id)}`} className="btn btn-ghost">Photographer details</Link>
          )}
        </div>
      </div>
      <p className="ad-note">
        Everything they answered at signup. {orders} {orders === 1 ? "order" : "orders"}, {bookings} {bookings === 1 ? "booking" : "bookings"}.
        Disable or delete the account from the Users list.
      </p>

      {sections.length === 0 ? (
        <div className="ad-card">
          <span className="ad-muted">No signup details are available for this user.</span>
        </div>
      ) : (
        sections.map((section) => (
          <div className="ad-card" key={section.title}>
            <div className="ad-card-title">{section.title}</div>
            {section.rows.map((row) => (
              <div className="ad-row" key={`${section.title}-${row.label}`}>
                <div className="ad-label">{row.label}</div>
                <div className="ad-value">
                  <span className={row.value === NOT_PROVIDED ? "ad-muted" : undefined}>{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </>,
  );
}
