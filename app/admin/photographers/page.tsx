"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Verified fields from GET /api/admin/photographers.
// stripeAccountId, stripeOnboardingUrl and billingAddress are deliberately
// NOT typed here — they are on the raw row but must not reach the page.
interface AdminPhotographer {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  hourlyRate: number;
  rating: number | null;
  reviewCount: number | null;
  stripeOnboardingComplete: boolean;
  specialties: string[] | null;
  isDemo: boolean;
  visibilityStatus: string; // "public" | "hidden" | "flagged"
  adminNotes: string | null;
  createdAt: string;
}

type AuthState = "loading" | "ok" | "unauthorized" | "forbidden";
type Notice = { kind: "error" | "warn" | "info"; text: string };
type Visibility = "public" | "hidden" | "flagged";
type VisFilter = "all" | Visibility;

const VIS_TABS: { label: string; value: VisFilter }[] = [
  { label: "All", value: "all" },
  { label: "Public", value: "public" },
  { label: "Hidden", value: "hidden" },
  { label: "Flagged", value: "flagged" },
];

// Render throttling only — filtering is client-side, so this fires no requests.
const SEARCH_DEBOUNCE_MS = 300;

// Verified backend behavior: visibility gates the public listing, search and
// PhotographerService only. Bookings, payouts and feed posts are untouched,
// and the photographer is never notified. Do not soften this.
const VISIBILITY_NOTE =
  "Visibility controls discovery only. Hiding a photographer removes them from search and public listings — it does not cancel bookings, stop payouts, or notify them.";

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

// Account deletion also writes visibilityStatus "hidden" and nulls bio, city,
// state and portfolioUrl. This endpoint cannot tell the two apart, so a hidden
// row stripped of all three is flagged as a possible deleted account.
function mayBeDeletedAccount(p: AdminPhotographer): boolean {
  return p.visibilityStatus === "hidden" && !p.bio && !p.city && !p.state;
}

function buildMeta(p: AdminPhotographer): string {
  const location = [p.city, p.state].filter(Boolean).join(", ");
  const rate = `$${p.hourlyRate}/hr`;
  const rating =
    typeof p.rating === "number" && p.rating > 0
      ? `${p.rating}★${p.reviewCount ? ` (${p.reviewCount})` : ""}`
      : "";
  const stripe = p.stripeOnboardingComplete ? "Payouts ready" : "Stripe not connected";
  return [location, rate, rating, formatDate(p.createdAt), stripe]
    .filter((part) => !!part && String(part).trim() !== "")
    .join(" · ");
}

// The two states a photographer is NOT currently in.
function otherStates(current: string): Visibility[] {
  const all: Visibility[] = ["public", "hidden", "flagged"];
  return all.filter((s) => s !== current);
}

function actionLabel(next: Visibility): string {
  if (next === "public") return "Restore to public";
  if (next === "hidden") return "Hide";
  return "Flag";
}

function pillClass(status: string): string {
  if (status === "public") return "st-approved";
  if (status === "flagged") return "st-rejected";
  return "st-neutral"; // hidden
}

export default function AdminPhotographersPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [photographers, setPhotographers] = useState<AdminPhotographer[]>([]);
  const [visFilter, setVisFilter] = useState<VisFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  // Row id awaiting confirmation for a hidden -> public restore.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/photographers");

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
      // BARE ARRAY — not { photographers: [...] }. Guard in case an error
      // body ever comes back with a 200.
      setPhotographers(Array.isArray(data) ? data : []);
      setLoadError(null);
      setAuthState("ok");
    } catch {
      setLoadError("Couldn’t reach the server. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side: the backend accepts no query params, so filtering and search
  // never hit the network.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return photographers.filter((p) => {
      if (visFilter !== "all" && p.visibilityStatus !== visFilter) return false;
      if (term === "") return true;
      return (
        p.displayName?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.state?.toLowerCase().includes(term) ||
        p.specialties?.some((s) => s.toLowerCase().includes(term))
      );
    });
  }, [photographers, visFilter, search]);

  async function setVisibility(id: string, next: Visibility) {
    setActioningId(id);
    setNotice(null);

    try {
      const res = await fetch(`/api/admin/photographers/${id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // adminNotes deliberately omitted: an empty string preserves the old
        // note rather than clearing it, and there is no note UI in this build.
        body: JSON.stringify({ visibilityStatus: next }),
      });

      if (res.ok) {
        setConfirmingId(null);
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
      const message =
        (typeof body?.error === "string" && body.error) ||
        (typeof body?.message === "string" && body.message) ||
        "";

      if (res.status === 404) {
        setConfirmingId(null);
        await loadData();
        setNotice({
          kind: "info",
          text: "That photographer no longer exists. The list has been refreshed.",
        });
        return;
      }

      setConfirmingId(null);
      await loadData();
      setNotice({
        kind: "error",
        text: message || `Couldn’t update visibility (${res.status}).`,
      });
    } catch {
      setNotice({
        kind: "error",
        text: "Couldn’t reach the server. Refresh and check before trying again.",
      });
      await loadData();
    } finally {
      // Cleared only after the refetch, so a failed action never leaves an
      // immediately re-clickable control.
      setActioningId(null);
    }
  }

  // Restoring to public is the one transition that can republish a deleted
  // account, so it takes two clicks. Everything else fires directly.
  function handleAction(p: AdminPhotographer, next: Visibility) {
    const needsConfirm = p.visibilityStatus === "hidden" && next === "public";
    if (needsConfirm && confirmingId !== p.id) {
      setNotice(null);
      setConfirmingId(p.id);
      return;
    }
    setVisibility(p.id, next);
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

    /* ── Added for users ───────────────────────────────────────────────────── */
    .search-row { margin-bottom: 20px; }
    .search-input {
      width: 100%; max-width: 420px;
      background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.1);
      border-radius: 6px; color: #F5F0E6; font-family: inherit; font-size: 14px;
      padding: 9px 12px; outline: none;
    }
    .search-input:focus { border-color: rgba(232,185,48,0.4); }
    /* Disabling does not revoke live tokens — this note must stay visible. */
    .action-note {
      font-size: 11.5px; color: rgba(245,240,230,0.35); line-height: 1.4;
      margin-bottom: 16px; max-width: 640px;
    }

    /* ── Added for photographers ───────────────────────────────────────────── */
    /* "hidden" is neither good nor bad — neutral, unlike public/flagged. */
    .st-neutral { background: rgba(245,240,230,0.1); color: rgba(245,240,230,0.6); }
    /* Deletion also writes "hidden"; restoring such a row could republish it. */
    .row-caution {
      font-size: 11.5px; color: #E8B930; margin-top: 4px; line-height: 1.4;
    }
    .row-actions { display: flex; align-items: center; gap: 8px; }
  `;

  if (loadError) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="admin-page state-msg">
          <div className="state-msg-title">Couldn’t load photographers</div>
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
        <div className="admin-h1">Photographers</div>
        <div className="admin-sub">Storefront visibility and moderation</div>

        <div className="tab-row">
          {VIS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`btn ${visFilter === tab.value ? "btn-gold" : "btn-ghost"}`}
              onClick={() => {
                setNotice(null);
                setConfirmingId(null);
                setVisFilter(tab.value);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="search-row">
          <input
            className="search-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, location or specialty…"
            aria-label="Search photographers"
          />
        </div>

        <div className="action-note">{VISIBILITY_NOTE}</div>

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
          <span>
            {VIS_TABS.find((t) => t.value === visFilter)?.label} ({visible.length})
          </span>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">No photographers match this view.</div>
        ) : (
          visible.map((p) => {
            const busy = actioningId === p.id;
            const confirming = confirmingId === p.id;
            const caution = mayBeDeletedAccount(p);

            return (
              <div key={p.id} className="issue-row">
                <div>
                  <div className="issue-title">{p.displayName}</div>
                  <div className="issue-meta">{buildMeta(p)}</div>
                  {caution && (
                    <div className="row-caution">
                      May be a deleted account — restoring could republish it.
                    </div>
                  )}
                </div>
                <div className="row-actions">
                  <span className={`status-pill ${pillClass(p.visibilityStatus)}`}>
                    {p.visibilityStatus}
                  </span>
                  {otherStates(p.visibilityStatus).map((next) => {
                    const isRestore = p.visibilityStatus === "hidden" && next === "public";
                    const awaitingConfirm = isRestore && confirming;
                    return (
                      <button
                        key={next}
                        className={`btn ${awaitingConfirm ? "btn-gold" : "btn-ghost"}`}
                        onClick={() => handleAction(p, next)}
                        disabled={busy}
                      >
                        {busy
                          ? "Saving…"
                          : awaitingConfirm
                            ? "Confirm restore"
                            : actionLabel(next)}
                      </button>
                    );
                  })}
                  {confirming && !busy && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => setConfirmingId(null)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
