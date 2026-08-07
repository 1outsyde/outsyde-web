"use client";

import { useCallback, useEffect, useState } from "react";

// Field names verified against GET /api/admin/refund-requests.
// The target is polymorphic — there is no orderId. `amount` is integer CENTS.
interface RefundRequest {
  id: string;
  requesterId: string;
  requesterType: string;
  targetType: string; // "order" | "shoot_booking" | "appointment"
  targetId: string;
  reason: string; // the requester's own words
  amount: number; // CENTS
  status: string | null;
  adminNotes: string | null;
  createdAt: string;
  requesterName: string | null;
  requesterEmail: string | null;
}

type AuthState = "loading" | "ok" | "unauthorized" | "forbidden";
type Notice = { kind: "error" | "warn" | "info"; text: string };

// No tabs: the backend returns status='pending' only and takes no filter.

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

// amount is integer cents — rendering it raw would show a 100x figure.
function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// "shoot_booking" -> "Shoot Booking". Never hardcode "Order": a refund can
// target an order, a shoot booking, or an appointment.
function formatTargetType(targetType: string): string {
  if (!targetType) return "Unknown";
  return targetType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildMeta(request: RefundRequest): string {
  const requester = request.requesterName || request.requesterEmail || request.requesterId;
  return [requester, request.reason, formatDate(request.createdAt)]
    .filter((part) => !!part && String(part).trim() !== "")
    .join(" · ");
}

export default function AdminRefundsPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/refunds");

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
      // Wrapped: { requests: [...] }, not a bare array.
      setRequests(data.requests || []);
      setLoadError(null);
      setAuthState("ok");
    } catch {
      setLoadError("Couldn’t reach the server. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function closeRejectForm() {
    setRejectingId(null);
    setRejectNotes("");
  }

  async function decide(id: string, status: "approved" | "rejected", adminNotes?: string) {
    setActioningId(id);
    setNotice(null);

    try {
      const res = await fetch(`/api/admin/refunds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          status === "rejected" && adminNotes?.trim()
            ? { status, adminNotes: adminNotes.trim() }
            : { status }
        ),
      });

      if (res.ok) {
        closeRejectForm();
        await loadData();
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
      // 402 uses `message`; the guard and Zod errors use `error`.
      const message =
        (typeof body?.message === "string" && body.message) ||
        (typeof body?.error === "string" && body.error) ||
        "";

      // 402 — Stripe declined. The backend returns before any DB write, so no
      // money moved and the request is still pending and still in the list.
      if (res.status === 402) {
        closeRejectForm();
        await loadData();
        setNotice({
          kind: "error",
          text: `Stripe declined this refund — no money was transferred and the request is still pending. ${message}`.trim(),
        });
        return;
      }

      // 400 from the re-processing guard — somebody else already acted on it,
      // or this was a double submit. Informational, not alarming.
      if (res.status === 400 && /already been processed/i.test(message)) {
        closeRejectForm();
        await loadData();
        setNotice({
          kind: "info",
          text: "That request had already been processed. The list has been refreshed.",
        });
        return;
      }

      // 500 — the Stripe refund likely succeeded and a later step failed.
      // Never auto-retry: a retry could issue a second refund.
      if (res.status === 500) {
        closeRejectForm();
        await loadData();
        setNotice({
          kind: "warn",
          text:
            "The server errored after the refund was attempted. The refund may already have been issued — verify in Stripe before retrying this request.",
        });
        return;
      }

      await loadData();
      setNotice({ kind: "error", text: message || `Request failed (${res.status}).` });
    } catch {
      setNotice({
        kind: "error",
        text: "Couldn’t reach the server. The refund status is unknown — refresh and check before retrying.",
      });
      await loadData();
    } finally {
      // Cleared only after the refetch above has completed, so a failed action
      // never leaves an immediately re-clickable button.
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

    /* ── Added for refunds ─────────────────────────────────────────────────── */
    /* 500 is ambiguous (refund may have gone through) — warn, don't alarm. */
    .warn-banner {
      background: rgba(232,185,48,0.1); border: 1px solid rgba(232,185,48,0.3);
      border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;
      font-size: 13px; color: #E8B930; line-height: 1.45;
    }
    /* 400 already-processed — purely informational. */
    .info-banner {
      background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.12);
      border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;
      font-size: 13px; color: rgba(245,240,230,0.6); line-height: 1.45;
    }
  `;

  if (loadError) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="admin-page state-msg">
          <div className="state-msg-title">Couldn’t load refund requests</div>
          <div className="state-msg-sub">{loadError}</div>
          <button
            className="btn btn-gold"
            onClick={() => {
              setLoadError(null);
              setAuthState("loading");
              loadData();
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
        <div className="admin-h1">Refund Requests</div>
        <div className="admin-sub">Pending refund requests awaiting a decision</div>

        {notice && (
          <div
            className={
              notice.kind === "error"
                ? "error-banner"
                : notice.kind === "warn"
                  ? "warn-banner"
                  : "info-banner"
            }
          >
            {notice.text}
          </div>
        )}

        <div className="section-title">
          <span>Pending ({requests.length})</span>
        </div>

        {requests.length === 0 ? (
          <div className="empty-state">No pending refund requests.</div>
        ) : (
          requests.map((request) => {
            const busy = actioningId === request.id;
            const isRejecting = rejectingId === request.id;

            return (
              <div key={request.id}>
                <div className="issue-row">
                  <div>
                    <div className="issue-title">
                      {formatAmount(request.amount)} — {formatTargetType(request.targetType)}
                    </div>
                    <div className="issue-meta">{buildMeta(request)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className={`status-pill st-${request.status ?? "pending"}`}>
                      {request.status ?? "pending"}
                    </span>
                    <button
                      className="btn btn-gold"
                      onClick={() => decide(request.id, "approved")}
                      disabled={busy || isRejecting}
                    >
                      {busy ? "Approving…" : "Approve"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setNotice(null);
                        setRejectNotes("");
                        setRejectingId(isRejecting ? null : request.id);
                      }}
                      disabled={busy}
                    >
                      {isRejecting ? "Cancel" : "Reject"}
                    </button>
                  </div>
                </div>

                {isRejecting && (
                  <div className="add-form">
                    <label className="field-label" htmlFor={`reject-notes-${request.id}`}>
                      Internal note (optional)
                    </label>
                    <textarea
                      id={`reject-notes-${request.id}`}
                      className="field-textarea"
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Optional note for the record. Not sent to the requester."
                    />
                    <div className="form-actions">
                      <button className="btn btn-ghost" onClick={closeRejectForm} disabled={busy}>
                        Cancel
                      </button>
                      <button
                        className="btn btn-gold"
                        onClick={() => decide(request.id, "rejected", rejectNotes)}
                        disabled={busy}
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
