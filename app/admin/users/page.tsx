"use client";

import { useCallback, useEffect, useState } from "react";

// Verified 13-field allowlist from GET /api/admin/users.
// There is no `status` field — isActive is the only status signal — and no
// deletionStatus on this endpoint. Neither is typed here on purpose.
interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  state: string | null;
  isVendor: boolean;
  isPhotographer: boolean;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  loyaltyPoints: number | null;
}

type AuthState = "loading" | "ok" | "unauthorized" | "forbidden";
type Notice = { kind: "error" | "warn" | "info"; text: string };
type RoleFilter = "all" | "customers" | "vendors" | "photographers";

const ROLE_TABS: { label: string; value: RoleFilter }[] = [
  { label: "All", value: "all" },
  { label: "Customers", value: "customers" },
  { label: "Vendors", value: "vendors" },
  { label: "Photographers", value: "photographers" },
];

const SEARCH_DEBOUNCE_MS = 300;

// Verified backend behavior — isActive gates login and token refresh, but
// authMiddleware verifies the JWT statelessly, so a live 7-day access token
// keeps working. Do not soften this.
const DISABLE_NOTE =
  "Disabling blocks new sign-ins. It does not end active sessions — an existing token stays valid for up to 7 days.";

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

// Role is NOT a field. It is derived from three independent booleans, and a
// user can hold several at once, so this collects rather than picks one.
function deriveRole(user: AdminUser): string {
  const roles: string[] = [];
  if (user.isAdmin) roles.push("Admin");
  if (user.isVendor) roles.push("Vendor");
  if (user.isPhotographer) roles.push("Photographer");
  return roles.length > 0 ? roles.join(" · ") : "Customer";
}

function displayName(user: AdminUser): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return user.name || full || user.email || user.id;
}

function buildMeta(user: AdminUser): string {
  const location = [user.city, user.state].filter(Boolean).join(", ");
  return [deriveRole(user), user.email, location, formatDate(user.createdAt)]
    .filter((part) => !!part && String(part).trim() !== "")
    .join(" · ");
}

export default function AdminUsersPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(async (role: RoleFilter, searchTerm: string) => {
    try {
      const params = new URLSearchParams();
      // "all" omits the param entirely — see the BFF route for why.
      if (role !== "all") params.set("type", role);
      if (searchTerm.trim() !== "") params.set("search", searchTerm.trim());

      const query = params.toString();
      const res = await fetch(`/api/admin/users${query ? `?${query}` : ""}`);

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
      // Wrapped: { users: [...], total }.
      setUsers(data.users || []);
      setTotal(typeof data.total === "number" ? data.total : (data.users || []).length);
      setLoadError(null);
      setAuthState("ok");
    } catch {
      setLoadError("Couldn’t reach the server. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    loadData(roleFilter, search);
  }, [roleFilter, search, loadData]);

  async function setActive(user: AdminUser, nextActive: boolean) {
    setActioningId(user.id);
    setNotice(null);

    const action = nextActive ? "enable" : "disable";

    try {
      const res = await fetch(`/api/admin/users/${user.id}/${action}`, {
        method: "POST",
      });

      if (res.ok) {
        // The backend synthesizes this response body rather than reading the
        // row back, so the refetch is the source of truth, not the payload.
        await loadData(roleFilter, search);
        return;
      }

      if (res.status === 401) {
        setAuthState("unauthorized");
        return;
      }

      const body = await res.json().catch(() => ({}));
      const message =
        (typeof body?.error === "string" && body.error) ||
        (typeof body?.message === "string" && body.message) ||
        "";

      // 403 here means the target is an admin — not that WE lack access, so it
      // must not fall through to the forbidden auth screen.
      if (res.status === 403) {
        await loadData(roleFilter, search);
        setNotice({ kind: "info", text: "Admin accounts cannot be disabled." });
        return;
      }

      if (res.status === 404) {
        await loadData(roleFilter, search);
        setNotice({ kind: "info", text: "That account no longer exists. The list has been refreshed." });
        return;
      }

      await loadData(roleFilter, search);
      setNotice({
        kind: "error",
        text: message || `Couldn’t ${action} that account (${res.status}).`,
      });
    } catch {
      setNotice({
        kind: "error",
        text: "Couldn’t reach the server. Refresh and check before trying again.",
      });
      await loadData(roleFilter, search);
    } finally {
      // Cleared only after the refetch, so a failed action never leaves an
      // immediately re-clickable button.
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
  `;

  if (loadError) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="admin-page state-msg">
          <div className="state-msg-title">Couldn’t load users</div>
          <div className="state-msg-sub">{loadError}</div>
          <button
            className="btn btn-gold"
            onClick={() => {
              setLoadError(null);
              setAuthState("loading");
              loadData(roleFilter, search);
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
        <div className="admin-h1">Users</div>
        <div className="admin-sub">Platform accounts and access</div>

        <div className="tab-row">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`btn ${roleFilter === tab.value ? "btn-gold" : "btn-ghost"}`}
              onClick={() => {
                setNotice(null);
                setRoleFilter(tab.value);
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
            placeholder="Search by name or email…"
            aria-label="Search users by name or email"
          />
        </div>

        <div className="action-note">{DISABLE_NOTE}</div>

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
            {ROLE_TABS.find((t) => t.value === roleFilter)?.label} ({total})
          </span>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">No users match this view.</div>
        ) : (
          users.map((user) => {
            const busy = actioningId === user.id;

            return (
              <div key={user.id} className="issue-row">
                <div>
                  <div className="issue-title">{displayName(user)}</div>
                  <div className="issue-meta">{buildMeta(user)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={`status-pill ${user.isActive ? "st-approved" : "st-rejected"}`}>
                    {user.isActive ? "active" : "disabled"}
                  </span>
                  {/* Admin accounts are rejected by the backend with a 403, so
                      no button is offered rather than one that always fails. */}
                  {!user.isAdmin && (
                    <button
                      className={`btn ${user.isActive ? "btn-ghost" : "btn-gold"}`}
                      onClick={() => setActive(user, !user.isActive)}
                      disabled={busy}
                    >
                      {busy
                        ? user.isActive
                          ? "Disabling…"
                          : "Enabling…"
                        : user.isActive
                          ? "Disable"
                          : "Enable"}
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
