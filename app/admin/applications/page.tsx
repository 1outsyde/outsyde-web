"use client";

import { useCallback, useEffect, useState } from "react";

// Field names verified against GET /api/admin/applications. The endpoint also
// returns many other business columns; these are the ones this page consumes.
// There is deliberately no `tier` (it does not exist on this endpoint) and no
// `owner` (the raw user row was stripped backend-side — never read it).
interface Application {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  description: string | null;
  approvalStatus: string;
  approvalNotes: string | null;
  createdAt: string;
  city: string | null;
  state: string | null;
  logoImage: string | null;
  brandColors: { primary?: string; secondary?: string } | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
}

type AuthState = "loading" | "ok" | "unauthorized" | "forbidden";
type StatusFilter = "pending" | "approved" | "rejected";

const TABS: StatusFilter[] = ["pending", "approved", "rejected"];

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

function buildMeta(app: Application): string {
  const location = [app.city, app.state].filter(Boolean).join(", ");
  return [app.category, location, app.ownerName, formatDate(app.createdAt)]
    .filter((part) => !!part && String(part).trim() !== "")
    .join(" · ");
}

export default function AdminApplicationsPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const loadData = useCallback(async (status: StatusFilter) => {
    try {
      const res = await fetch(`/api/admin/applications?status=${status}`);

      if (res.status === 401) {
        setAuthState("unauthorized");
        return;
      }
      if (res.status === 403) {
        setAuthState("forbidden");
        return;
      }
      if (!res.ok) {
        setAuthState("forbidden");
        return;
      }

      const data = await res.json();
      // The list is wrapped: { applications: [...] }, not a bare array.
      setApplications(data.applications || []);
      setLoadError(null);
      setAuthState("ok");
    } catch {
      // A network failure or non-JSON body must surface as a real error state
      // rather than leaving the page stuck on "Loading…" forever.
      setLoadError("Couldn’t reach the server. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    loadData(statusFilter);
  }, [statusFilter, loadData]);

  function closeRejectForm() {
    setRejectingId(null);
    setRejectNotes("");
  }

  async function runAction(id: string, action: "approve" | "reject", notes?: string) {
    setActioningId(id);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/applications/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { notes } : {}),
      });

      if (res.ok) {
        closeRejectForm();
        await loadData(statusFilter);
        return;
      }

      if (res.status === 401) {
        setAuthState("unauthorized");
        return;
      }
      if (res.status === 403) {
        setAuthState("forbidden");
        return;
      }

      const body = await res.json().catch(() => ({}));
      const message = typeof body?.error === "string" ? body.error : "";

      // "Business is already approved" / "already rejected" means somebody else
      // (or an earlier request of ours) already did this. Refetch quietly.
      if (res.status === 400 && /already (approved|rejected)/i.test(message)) {
        closeRejectForm();
        await loadData(statusFilter);
        return;
      }

      // The backend awaits notification sending *after* the DB commit, so a 500
      // can mean the approval/rejection actually succeeded. Refetch first so the
      // operator sees the true current state, then explain the ambiguity.
      if (res.status === 500) {
        closeRejectForm();
        await loadData(statusFilter);
        setActionError(
          "The server reported an error, but the change may have gone through. The list has been refreshed — check the status below before retrying."
        );
        return;
      }

      setActionError(message || `Request failed (${res.status}).`);
    } catch {
      setActionError("Couldn’t reach the server. Check your connection and try again.");
    } finally {
      setActioningId(null);
    }
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    .admin-page { font-family: 'Hanken Grotesk', 'Inter', sans-serif; }
    .admin-h1 {
      font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.04em;
      color: #F5F0E6; margin-bottom: 6px;
    }
    .admin-sub { color: rgba(245,240,230,0.5); font-size: 14px; margin-bottom: 32px; }

    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 40px;
    }
    .kpi-card {
      background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08);
      border-radius: 10px; padding: 18px 20px;
    }
    .kpi-label {
      font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
      color: rgba(245,240,230,0.4); margin-bottom: 8px;
    }
    .kpi-value {
      font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.03em;
      color: #E8B930;
    }

    .section-title {
      font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.06em;
      color: #F5F0E6; margin-bottom: 16px; display: flex; align-items: center;
      justify-content: space-between;
    }

    .btn {
      font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 8px 16px;
      border-radius: 6px; cursor: pointer; border: 1px solid transparent;
      letter-spacing: 0.03em; transition: all .15s;
    }
    .btn-gold { background: #E8B930; color: #000; }
    .btn-gold:hover { background: #F5CC50; }
    .btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
    .btn-ghost:hover { border-color: rgba(245,240,230,0.3); }

    .issue-row {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 14px 16px; border-radius: 8px;
      background: rgba(245,240,230,0.02); border: 1px solid rgba(245,240,230,0.06);
      margin-bottom: 8px;
    }
    .issue-title { font-size: 14px; color: #F5F0E6; font-weight: 500; }
    .issue-meta { font-size: 12px; color: rgba(245,240,230,0.4); margin-top: 3px; }
    .severity-badge {
      font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 3px 9px; border-radius: 999px; font-weight: 600;
    }
    .sev-high { background: rgba(255,107,107,0.15); color: #ff6b6b; }
    .sev-medium { background: rgba(232,185,48,0.15); color: #E8B930; }
    .sev-low { background: rgba(245,240,230,0.1); color: rgba(245,240,230,0.6); }

    .empty-state {
      text-align: center; padding: 40px 20px; color: rgba(245,240,230,0.35); font-size: 14px;
    }

    .add-form {
      background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08);
      border-radius: 10px; padding: 20px; margin-bottom: 20px;
    }
    .field-label {
      display: block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
      color: rgba(245,240,230,0.4); margin-bottom: 6px;
    }
    .field-input, .field-select {
      width: 100%; background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.1);
      border-radius: 6px; color: #F5F0E6; font-family: inherit; font-size: 14px;
      padding: 9px 12px; outline: none; margin-bottom: 14px;
    }
    .field-input:focus, .field-select:focus { border-color: rgba(232,185,48,0.4); }
    .field-select option { background: #111; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }

    .state-msg {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 40vh; text-align: center; gap: 8px;
    }
    .state-msg-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #F5F0E6; }
    .state-msg-sub { color: rgba(245,240,230,0.5); font-size: 14px; max-width: 400px; }

    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* ── Added for applications ────────────────────────────────────────────── */
    .status-pill {
      font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 3px 9px; border-radius: 999px; font-weight: 600;
    }
    .st-pending { background: rgba(232,185,48,0.15); color: #E8B930; }
    .st-approved { background: rgba(74,222,128,0.15); color: #4ade80; }
    .st-rejected { background: rgba(255,107,107,0.15); color: #ff6b6b; }

    .tab-row { display: flex; gap: 8px; margin-bottom: 20px; }

    .field-textarea {
      width: 100%; min-height: 90px; resize: vertical;
      background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.1);
      border-radius: 6px; color: #F5F0E6; font-family: inherit; font-size: 14px;
      padding: 9px 12px; outline: none; margin-bottom: 14px;
    }
    .field-textarea:focus { border-color: rgba(232,185,48,0.4); }

    .reject-warning {
      display: flex; gap: 8px; align-items: flex-start;
      background: rgba(232,185,48,0.1); border: 1px solid rgba(232,185,48,0.3);
      border-radius: 6px; padding: 10px 12px; margin-bottom: 14px;
      font-size: 12.5px; color: #E8B930; line-height: 1.45;
    }

    .error-banner {
      background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3);
      border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;
      font-size: 13px; color: #ff6b6b; line-height: 1.45;
    }
  `;

  if (loadError) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="admin-page state-msg">
          <div className="state-msg-title">Couldn’t load applications</div>
          <div className="state-msg-sub">{loadError}</div>
          <button
            className="btn btn-gold"
            onClick={() => {
              setLoadError(null);
              setAuthState("loading");
              loadData(statusFilter);
            }}
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (authState === "loading") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="admin-page state-msg">
          <div className="state-msg-title">Loading…</div>
        </div>
      </>
    );
  }

  if (authState === "unauthorized") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="admin-page state-msg">
          <div className="state-msg-title">Not signed in</div>
          <div className="state-msg-sub">
            <a href="/login" style={{ color: "#E8B930" }}>Log in</a> to access the admin dashboard.
          </div>
        </div>
      </>
    );
  }

  if (authState === "forbidden") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="admin-page state-msg">
          <div className="state-msg-title">Not authorized</div>
          <div className="state-msg-sub">
            Your account doesn&apos;t have admin access. Contact the platform owner if you
            believe this is a mistake.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="admin-page">
        <div className="admin-h1">Vendor Applications</div>
        <div className="admin-sub">Review, approve, and reject vendor applications</div>

        <div className="tab-row">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`btn ${statusFilter === tab ? "btn-gold" : "btn-ghost"}`}
              onClick={() => {
                closeRejectForm();
                setActionError(null);
                setStatusFilter(tab);
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {actionError && <div className="error-banner">{actionError}</div>}

        <div className="section-title">
          <span>
            {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} ({applications.length})
          </span>
        </div>

        {applications.length === 0 ? (
          <div className="empty-state">No {statusFilter} applications.</div>
        ) : (
          applications.map((app) => {
            const busy = actioningId === app.id;
            const isRejecting = rejectingId === app.id;

            return (
              <div key={app.id}>
                <div className="issue-row">
                  <div>
                    <div className="issue-title">{app.name}</div>
                    <div className="issue-meta">{buildMeta(app)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className={`status-pill st-${app.approvalStatus}`}>
                      {app.approvalStatus}
                    </span>
                    {app.approvalStatus === "pending" && (
                      <>
                        <button
                          className="btn btn-gold"
                          onClick={() => runAction(app.id, "approve")}
                          disabled={busy || isRejecting}
                        >
                          {busy ? "Approving…" : "Approve"}
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            setActionError(null);
                            setRejectNotes("");
                            setRejectingId(isRejecting ? null : app.id);
                          }}
                          disabled={busy}
                        >
                          {isRejecting ? "Cancel" : "Reject"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isRejecting && (
                  <div className="add-form">
                    <div className="reject-warning">
                      <span aria-hidden="true">⚠</span>
                      <span>This text is emailed directly to the vendor.</span>
                    </div>
                    <label className="field-label" htmlFor={`reject-notes-${app.id}`}>
                      Rejection reason
                    </label>
                    <textarea
                      id={`reject-notes-${app.id}`}
                      className="field-textarea"
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Explain why this application was not approved."
                    />
                    <div className="form-actions">
                      <button className="btn btn-ghost" onClick={closeRejectForm} disabled={busy}>
                        Cancel
                      </button>
                      <button
                        className="btn btn-gold"
                        onClick={() => runAction(app.id, "reject", rejectNotes)}
                        disabled={busy || !rejectNotes.trim()}
                      >
                        {busy ? "Rejecting…" : "Confirm Rejection"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
