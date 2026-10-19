"use client";

// /admin/influencers/[id]: every answer an influencer applicant gave (2026-10-18), plus
// Approve / Reject. Data: GET /api/admin/influencers/[id] → backend `signupDetails.sections`
// (the same rows as the admin email). Approve gives the influencer a promo code; reject needs
// a note. The admin layout gates this page.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface DetailRow { label: string; value: string; kind?: "text" | "image" | "link" }
interface DetailSection { title: string; rows: DetailRow[] }
interface Detail {
  application: { id: string; userId: string; status: string; promoCode?: string | null; user?: { name?: string | null; username?: string | null; email?: string | null } | null };
  signupDetails?: { sections: DetailSection[] };
}
type LoadState = "loading" | "ok" | "unauthorized" | "forbidden" | "notfound" | "error";

const NOT_PROVIDED = "Not provided";

function safeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function RowValue({ row }: { row: DetailRow }) {
  const url = row.kind === "link" ? safeUrl(row.value) : null;
  if (url) return <a href={url} target="_blank" rel="noopener noreferrer" className="ad-link">{row.value}</a>;
  return <span className={row.value === NOT_PROVIDED ? "ad-muted" : undefined}>{row.value}</span>;
}

export default function AdminInfluencerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [state, setState] = useState<LoadState>("loading");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/influencers/${encodeURIComponent(id)}`);
      if (res.status === 401) return setState("unauthorized");
      if (res.status === 403) return setState("forbidden");
      if (res.status === 404) return setState("notfound");
      if (!res.ok) return setState("error");
      const data = await res.json();
      if (!data?.application) return setState("error");
      setDetail(data);
      setState("ok");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function decide(status: "approved" | "rejected") {
    if (status === "rejected" && !notes.trim()) {
      setActionError("Add a note before rejecting.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/influencers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(status === "rejected" ? { admin_notes: notes.trim() } : {}) }),
      });
      if (res.status === 401) return setState("unauthorized");
      if (res.status === 403) return setState("forbidden");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError((typeof body?.error === "string" && body.error) || `Request failed (${res.status}).`);
        return;
      }
      setRejecting(false);
      setNotes("");
      await load();
    } catch {
      setActionError("Couldn’t reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
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
    .btn-gold:disabled, .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
    .btn-danger { background: transparent; border-color: rgba(255,107,107,0.5); color: #ff6b6b; }
    .status-pill { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; font-weight: 600; }
    .st-pending { background: rgba(232,185,48,0.15); color: #E8B930; }
    .st-approved { background: rgba(74,222,128,0.15); color: #4ade80; }
    .st-rejected { background: rgba(255,107,107,0.15); color: #ff6b6b; }
    .ad-card { background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08); border-radius: 10px; padding: 18px 20px; margin-bottom: 16px; }
    .ad-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.06em; color: #E8B930; margin-bottom: 10px; }
    .ad-row { display: grid; grid-template-columns: 200px 1fr; gap: 16px; padding: 8px 0; border-top: 1px solid rgba(245,240,230,0.06); font-size: 14px; }
    .ad-row:first-of-type { border-top: none; }
    .ad-label { color: rgba(245,240,230,0.5); font-size: 12.5px; }
    .ad-value { white-space: pre-wrap; overflow-wrap: anywhere; }
    .ad-muted { color: rgba(245,240,230,0.35); }
    .ad-link { color: #E8B930; }
    .field-label { display: block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(245,240,230,0.4); margin-bottom: 6px; }
    .field-textarea { width: 100%; min-height: 90px; resize: vertical; background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.1); border-radius: 6px; color: #F5F0E6; font-family: inherit; font-size: 14px; padding: 9px 12px; outline: none; margin-bottom: 14px; }
    .error-banner { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 13px; color: #ff6b6b; }
    .state-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40vh; text-align: center; gap: 8px; }
    .state-msg-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; }
    .state-msg-sub { color: rgba(245,240,230,0.5); font-size: 14px; max-width: 400px; }
    @media (max-width: 640px) { .ad-row { grid-template-columns: 1fr; gap: 2px; } }
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
      notfound: ["Application not found", "It may have been removed."],
      error: ["Couldn’t load this application", "Check your connection and try again."],
    };
    const [title, sub] = messages[state === "ok" ? "error" : state];
    return shell(
      <div className="state-msg">
        <div className="state-msg-title">{title}</div>
        {sub && <div className="state-msg-sub">{sub}</div>}
        {state === "error" && <button className="btn btn-gold" onClick={() => { setState("loading"); load(); }}>Retry</button>}
        <Link href="/admin/influencers" className="ad-back">← All influencers</Link>
      </div>,
    );
  }

  const app = detail.application;
  const name = app.user?.name || (app.user?.username ? `@${app.user.username}` : "") || app.user?.email || "Applicant";
  const sections = detail.signupDetails?.sections ?? [];

  return shell(
    <>
      <Link href="/admin/influencers" className="ad-back">← All influencers</Link>
      <div className="ad-head">
        <div className="ad-h1">{name}</div>
        <div className="ad-actions">
          <span className={`status-pill st-${app.status}`}>{app.status}</span>
          <Link href={`/admin/users/${encodeURIComponent(app.userId)}`} className="btn btn-ghost">Customer details</Link>
          {app.status === "pending" && !rejecting && (
            <>
              <button className="btn btn-gold" onClick={() => decide("approved")} disabled={busy}>{busy ? "Saving…" : "Approve"}</button>
              <button className="btn btn-danger" onClick={() => { setRejecting(true); setActionError(null); }} disabled={busy}>Reject</button>
            </>
          )}
        </div>
      </div>

      {actionError && <div className="error-banner" role="alert">{actionError}</div>}

      {rejecting && (
        <div className="ad-card">
          <label className="field-label" htmlFor="reject-notes">Why are you rejecting this application?</label>
          <textarea id="reject-notes" className="field-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="ad-actions">
            <button className="btn btn-danger" onClick={() => decide("rejected")} disabled={busy}>{busy ? "Saving…" : "Confirm reject"}</button>
            <button className="btn btn-ghost" onClick={() => { setRejecting(false); setNotes(""); setActionError(null); }} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}

      {sections.map((section) => (
        <div className="ad-card" key={section.title}>
          <div className="ad-card-title">{section.title}</div>
          {section.rows.map((row) => (
            <div className="ad-row" key={`${section.title}-${row.label}`}>
              <div className="ad-label">{row.label}</div>
              <div className="ad-value"><RowValue row={row} /></div>
            </div>
          ))}
        </div>
      ))}
    </>,
  );
}
