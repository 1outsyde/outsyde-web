"use client";

// /admin/influencers: influencer applications (2026-10-18). Data: GET /api/admin/influencers
// → backend { applications }. Each name opens /admin/influencers/[id] with every answer and
// Approve / Reject. The admin layout gates this page.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface AdminInfluencerApplication {
  id: string;
  userId: string;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  twitterUrl: string | null;
  followerCount: number | null;
  status: string;
  createdAt: string;
  contentCategoryLabels?: string[];
  user?: { name: string | null; email: string | null; username: string | null; phone?: string | null; city?: string | null; state?: string | null };
}

type LoadState = "loading" | "ok" | "unauthorized" | "forbidden" | "error";
type Filter = "pending" | "approved" | "rejected" | "all";

const TABS: { label: string; value: Filter }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

function who(a: AdminInfluencerApplication): string {
  return a.user?.name || (a.user?.username ? `@${a.user.username}` : "") || a.user?.email || a.userId;
}

function meta(a: AdminInfluencerApplication): string {
  const socials = [a.instagramUrl && "Instagram", a.tiktokUrl && "TikTok", a.youtubeUrl && "YouTube", a.twitterUrl && "X"].filter(Boolean).join(", ");
  const followers = typeof a.followerCount === "number" ? `${a.followerCount.toLocaleString("en-US")} followers` : "";
  const location = [a.user?.city, a.user?.state].filter(Boolean).join(", ");
  const date = new Date(a.createdAt);
  return [a.user?.email, followers, socials, (a.contentCategoryLabels ?? []).join(", "), location, Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString()]
    .filter((p) => !!p && String(p).trim() !== "")
    .join(" · ");
}

export default function AdminInfluencersPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<AdminInfluencerApplication[]>([]);

  const load = useCallback(async (f: Filter) => {
    try {
      const res = await fetch(`/api/admin/influencers${f === "all" ? "" : `?status=${f}`}`);
      if (res.status === 401) return setState("unauthorized");
      if (res.status === 403) return setState("forbidden");
      if (!res.ok) return setState("error");
      const data = await res.json();
      setRows(Array.isArray(data?.applications) ? data.applications : []);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    .admin-page { font-family: 'Hanken Grotesk', 'Inter', sans-serif; color: #F5F0E6; }
    .admin-h1 { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.04em; margin-bottom: 6px; }
    .admin-sub { color: rgba(245,240,230,0.5); font-size: 14px; margin-bottom: 24px; }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
    .tab { font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(245,240,230,0.15); background: transparent; color: rgba(245,240,230,0.7); cursor: pointer; }
    .tab.on { border-color: #E8B930; color: #E8B930; background: rgba(232,185,48,0.1); }
    .issue-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-radius: 8px; background: rgba(245,240,230,0.02); border: 1px solid rgba(245,240,230,0.06); margin-bottom: 8px; }
    .issue-title { font-size: 14px; color: #F5F0E6; font-weight: 500; }
    .issue-link { display: inline-block; text-decoration: none; }
    .issue-link:hover { color: #E8B930; text-decoration: underline; }
    .issue-meta { font-size: 12px; color: rgba(245,240,230,0.4); margin-top: 3px; }
    .issue-title, .issue-meta { overflow-wrap: anywhere; }
    .status-pill { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; font-weight: 600; flex: none; }
    .st-pending { background: rgba(232,185,48,0.15); color: #E8B930; }
    .st-approved { background: rgba(74,222,128,0.15); color: #4ade80; }
    .st-rejected { background: rgba(255,107,107,0.15); color: #ff6b6b; }
    .empty-state { text-align: center; padding: 40px 20px; color: rgba(245,240,230,0.35); font-size: 14px; }
    .state-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40vh; text-align: center; gap: 8px; }
    .state-msg-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; }
    .state-msg-sub { color: rgba(245,240,230,0.5); font-size: 14px; max-width: 400px; }
  `;

  const shell = (body: React.ReactNode) => (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="admin-page">{body}</div>
    </>
  );

  if (state === "unauthorized" || state === "forbidden") {
    return shell(
      <div className="state-msg">
        <div className="state-msg-title">{state === "unauthorized" ? "Not signed in" : "Not authorized"}</div>
        <div className="state-msg-sub">{state === "unauthorized" ? <><Link href="/login" style={{ color: "#E8B930" }}>Log in</Link> to access the admin dashboard.</> : "Your account doesn’t have admin access."}</div>
      </div>,
    );
  }

  return shell(
    <>
      <div className="admin-h1">Influencers</div>
      <div className="admin-sub">Influencer applications. Open one to see every answer and approve or reject it.</div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.value} className={`tab${filter === t.value ? " on" : ""}`} onClick={() => { setState("loading"); setFilter(t.value); }}>{t.label}</button>
        ))}
      </div>
      {state === "loading" ? (
        <div className="empty-state">Loading…</div>
      ) : state === "error" ? (
        <div className="empty-state">Couldn’t load applications. Check your connection and try again.</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">No {filter === "all" ? "" : `${filter} `}applications.</div>
      ) : (
        rows.map((a) => (
          <div className="issue-row" key={a.id}>
            <div style={{ minWidth: 0 }}>
              <Link href={`/admin/influencers/${encodeURIComponent(a.id)}`} className="issue-title issue-link">{who(a)}</Link>
              <div className="issue-meta">{meta(a)}</div>
            </div>
            <span className={`status-pill st-${a.status}`}>{a.status}</span>
          </div>
        ))
      )}
    </>,
  );
}
