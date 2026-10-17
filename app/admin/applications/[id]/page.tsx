"use client";

// /admin/applications/[id] — every answer a business gave at signup (2026-10-17).
// Data: GET /api/admin/applications/[id] → backend `application.signupDetails.sections`,
// the same rows Legend gets in the new-application email. Approve / Reject use the
// existing BFFs (same handling as the list page). The admin layout gates this page.

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
interface Application {
  id: string;
  name: string;
  approvalStatus: string;
  approvalNotes: string | null;
  signupDetails?: { sections: DetailSection[] };
}

type LoadState = "loading" | "ok" | "unauthorized" | "forbidden" | "notfound" | "error";

const NOT_PROVIDED = "Not provided";

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
    return <img src={url} alt="Logo" className="ad-logo" />;
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

export default function AdminApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [state, setState] = useState<LoadState>("loading");
  const [app, setApp] = useState<Application | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<{ state: LoadState; app: Application | null }> => {
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(id)}`);
      if (res.status === 401) return { state: "unauthorized", app: null };
      if (res.status === 403) return { state: "forbidden", app: null };
      if (res.status === 404) return { state: "notfound", app: null };
      if (!res.ok) return { state: "error", app: null };
      const data = await res.json();
      return data?.application ? { state: "ok", app: data.application } : { state: "error", app: null };
    } catch {
      return { state: "error", app: null };
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    load().then((r) => {
      if (cancelled) return;
      setApp(r.app);
      setState(r.state);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function reload() {
    const r = await load();
    setApp(r.app);
    setState(r.state);
  }

  async function runAction(action: "approve" | "reject") {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { notes: rejectNotes } : {}),
      });
      if (res.ok) {
        setRejecting(false);
        setRejectNotes("");
        await reload();
        return;
      }
      if (res.status === 401) return setState("unauthorized");
      if (res.status === 403) return setState("forbidden");
      const body = await res.json().catch(() => ({}));
      const message = typeof body?.error === "string" ? body.error : "";
      if (res.status === 400 && /already (approved|rejected)/i.test(message)) {
        await reload();
        return;
      }
      if (res.status === 500) {
        // Notifications are sent after the database change, so a 500 may still mean it worked.
        await reload();
        setActionError("The server reported an error, but the change may have gone through. Check the status above before retrying.");
        return;
      }
      setActionError(message || `Request failed (${res.status}).`);
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

  if (state !== "ok" || !app) {
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
        {state === "error" && <button className="btn btn-gold" onClick={reload}>Retry</button>}
        <Link href="/admin/applications" className="ad-back">← All applications</Link>
      </div>,
    );
  }

  const sections = app.signupDetails?.sections ?? [];

  return shell(
    <>
      <Link href="/admin/applications" className="ad-back">← All applications</Link>

      <div className="ad-head">
        <div className="ad-h1">{app.name}</div>
        <div className="ad-actions">
          <span className={`status-pill st-${app.approvalStatus}`}>{app.approvalStatus}</span>
          {app.approvalStatus === "pending" && (
            <>
              <button className="btn btn-gold" onClick={() => runAction("approve")} disabled={busy || rejecting}>
                {busy && !rejecting ? "Approving…" : "Approve"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setActionError(null);
                  setRejectNotes("");
                  setRejecting((v) => !v);
                }}
                disabled={busy}
              >
                {rejecting ? "Cancel" : "Reject"}
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && <div className="error-banner">{actionError}</div>}

      {rejecting && (
        <div className="ad-card">
          <div className="reject-warning">This text is emailed directly to the vendor.</div>
          <label className="field-label" htmlFor="reject-notes">Rejection reason</label>
          <textarea
            id="reject-notes"
            className="field-textarea"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Explain why this application was not approved."
          />
          <div className="ad-actions" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setRejecting(false)} disabled={busy}>Cancel</button>
            <button className="btn btn-gold" onClick={() => runAction("reject")} disabled={busy || !rejectNotes.trim()}>
              {busy ? "Rejecting…" : "Confirm Rejection"}
            </button>
          </div>
        </div>
      )}

      {app.approvalNotes && <div className="ad-notes">Notes: {app.approvalNotes}</div>}

      {sections.length === 0 ? (
        <div className="ad-card">
          <span className="ad-muted">No signup details are available for this business.</span>
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
