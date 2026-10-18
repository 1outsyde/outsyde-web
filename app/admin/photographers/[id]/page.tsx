"use client";

// /admin/photographers/[id] — every answer a photographer gave at signup (2026-10-18).
// Data: GET /api/admin/photographers/[id] → backend `signupDetails.sections`, the same rows
// Legend gets in the new photographer email. Photographers are public on signup (no approval);
// Hide / Flag / Restore use the existing visibility BFF. The admin layout gates this page.

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
interface Photographer {
  id: string;
  displayName: string;
  visibilityStatus: string;
}
interface Detail {
  photographer: Photographer;
  signupDetails?: { sections: DetailSection[] };
}

type Visibility = "public" | "hidden" | "flagged";
type LoadState = "loading" | "ok" | "unauthorized" | "forbidden" | "notfound" | "error";

const NOT_PROVIDED = "Not provided";

const ACTION_LABELS: Record<Visibility, string> = {
  public: "Restore to public",
  hidden: "Hide",
  flagged: "Flag",
};

/** Only http(s) URLs are ever linked or loaded. */
function safeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function RowValue({ row }: { row: DetailRow }) {
  const url = row.kind && row.kind !== "text" ? safeUrl(row.value) : null;
  if (row.kind === "image" && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="Profile photo" className="ad-logo" />;
  }
  if (row.kind === "link" && url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="ad-link">
        {row.label === "Look them up" ? "Search Google" : row.value}
      </a>
    );
  }
  return <span className={row.value === NOT_PROVIDED ? "ad-muted" : undefined}>{row.value}</span>;
}

export default function AdminPhotographerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [state, setState] = useState<LoadState>("loading");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<{ state: LoadState; detail: Detail | null }> => {
    try {
      const res = await fetch(`/api/admin/photographers/${encodeURIComponent(id)}`);
      if (res.status === 401) return { state: "unauthorized", detail: null };
      if (res.status === 403) return { state: "forbidden", detail: null };
      if (res.status === 404) return { state: "notfound", detail: null };
      if (!res.ok) return { state: "error", detail: null };
      const data = await res.json();
      return data?.photographer ? { state: "ok", detail: data } : { state: "error", detail: null };
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
    const r = await load();
    setDetail(r.detail);
    setState(r.state);
  }

  async function setVisibility(next: Visibility) {
    // Restoring a hidden photographer republishes them: ask once more first.
    if (detail?.photographer.visibilityStatus === "hidden" && next === "public" && !confirmRestore) {
      setConfirmRestore(true);
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/photographers/${encodeURIComponent(id)}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibilityStatus: next }),
      });
      if (res.ok) {
        setConfirmRestore(false);
        await reload();
        return;
      }
      if (res.status === 401) return setState("unauthorized");
      if (res.status === 403) return setState("forbidden");
      const body = await res.json().catch(() => ({}));
      setActionError((typeof body?.error === "string" && body.error) || `Request failed (${res.status}).`);
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
    .btn { font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 8px 16px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; letter-spacing: 0.03em; }
    .btn-gold { background: #E8B930; color: #000; }
    .btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
    .status-pill { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; font-weight: 600; }
    .st-pending { background: rgba(232,185,48,0.15); color: #E8B930; }
    .st-approved { background: rgba(74,222,128,0.15); color: #4ade80; }
    .st-rejected { background: rgba(255,107,107,0.15); color: #ff6b6b; }
    .st-public { background: rgba(74,222,128,0.15); color: #4ade80; }
    .st-hidden { background: rgba(245,240,230,0.08); color: rgba(245,240,230,0.6); }
    .st-flagged { background: rgba(255,107,107,0.15); color: #ff6b6b; }
    .ad-note { font-size: 12.5px; color: rgba(245,240,230,0.5); margin: -12px 0 18px; max-width: 640px; }
    .ad-card { background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08); border-radius: 10px; padding: 18px 20px; margin-bottom: 16px; }
    .ad-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.06em; color: #E8B930; margin-bottom: 10px; }
    .ad-row { display: grid; grid-template-columns: 200px 1fr; gap: 16px; padding: 8px 0; border-top: 1px solid rgba(245,240,230,0.06); font-size: 14px; }
    .ad-row:first-of-type { border-top: none; }
    .ad-label { color: rgba(245,240,230,0.5); font-size: 12.5px; }
    .ad-value { white-space: pre-wrap; overflow-wrap: anywhere; }
    .ad-muted { color: rgba(245,240,230,0.35); }
    .ad-link { color: #E8B930; }
    .ad-logo { width: 96px; height: 96px; object-fit: cover; border-radius: 10px; border: 1px solid rgba(245,240,230,0.12); }
    .ad-notes { font-size: 13px; color: rgba(245,240,230,0.7); margin-bottom: 16px; }
    .field-label { display: block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(245,240,230,0.4); margin-bottom: 6px; }
    .field-textarea { width: 100%; min-height: 90px; resize: vertical; background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.1); border-radius: 6px; color: #F5F0E6; font-family: inherit; font-size: 14px; padding: 9px 12px; outline: none; margin-bottom: 14px; }
    .reject-warning { background: rgba(232,185,48,0.1); border: 1px solid rgba(232,185,48,0.3); border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; font-size: 12.5px; color: #E8B930; }
    .error-banner { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 13px; color: #ff6b6b; }
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
      notfound: ["Photographer not found", "They may have been removed."],
      error: ["Couldn’t load this photographer", "Check your connection and try again."],
    };
    const [title, sub] = messages[state === "ok" ? "error" : state];
    return shell(
      <div className="state-msg">
        <div className="state-msg-title">{title}</div>
        {sub && <div className="state-msg-sub">{sub}</div>}
        {state === "error" && <button className="btn btn-gold" onClick={reload}>Retry</button>}
        <Link href="/admin/photographers" className="ad-back">← All photographers</Link>
      </div>,
    );
  }

  const p = detail.photographer;
  const sections = detail.signupDetails?.sections ?? [];
  const others = (["public", "hidden", "flagged"] as Visibility[]).filter((v) => v !== p.visibilityStatus);

  return shell(
    <>
      <Link href="/admin/photographers" className="ad-back">← All photographers</Link>

      <div className="ad-head">
        <div className="ad-h1">{p.displayName}</div>
        <div className="ad-actions">
          <span className={`status-pill st-${p.visibilityStatus}`}>{p.visibilityStatus}</span>
          {others.map((next) => {
            const awaiting = next === "public" && confirmRestore;
            return (
              <button
                key={next}
                className={`btn ${awaiting ? "btn-gold" : "btn-ghost"}`}
                onClick={() => setVisibility(next)}
                disabled={busy}
              >
                {busy ? "Saving…" : awaiting ? "Confirm restore" : ACTION_LABELS[next]}
              </button>
            );
          })}
        </div>
      </div>
      <p className="ad-note">Photographers are public as soon as they sign up. Visibility controls discovery only: hiding does not cancel bookings, stop payouts or notify them.</p>

      {actionError && <div className="error-banner">{actionError}</div>}

      {sections.length === 0 ? (
        <div className="ad-card">
          <span className="ad-muted">No signup details are available for this photographer.</span>
        </div>
      ) : (
        sections.map((section) => (
          <div className="ad-card" key={section.title}>
            <div className="ad-card-title">{section.title}</div>
            {section.rows.map((row) => (
              <div className="ad-row" key={`${section.title}-${row.label}`}>
                <div className="ad-label">{row.label}</div>
                <div className="ad-value"><RowValue row={row} /></div>
              </div>
            ))}
          </div>
        ))
      )}
    </>,
  );
}
