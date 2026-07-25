"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalUsers: number;
  totalBusinesses: number;
  totalPhotographers: number;
  totalOrders: number;
  totalBookings: number;
  pendingRefunds: number;
  totalRevenue: number;
  regularCustomers: number;
}

interface Issue {
  id: string;
  title: string;
  area: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved";
  createdBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

type AuthState = "loading" | "ok" | "unauthorized" | "forbidden";

export default function AdminOverviewPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [stats, setStats] = useState<Stats | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newSeverity, setNewSeverity] = useState<"low" | "medium" | "high">("medium");
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function loadData() {
    const [statsRes, issuesRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/issues?status=open"),
    ]);

    if (statsRes.status === 401 || issuesRes.status === 401) {
      setAuthState("unauthorized");
      return;
    }
    if (statsRes.status === 403 || issuesRes.status === 403) {
      setAuthState("forbidden");
      return;
    }
    if (!statsRes.ok || !issuesRes.ok) {
      setAuthState("forbidden");
      return;
    }

    const statsData = await statsRes.json();
    const issuesData = await issuesRes.json();
    setStats(statsData.stats);
    setIssues(issuesData.issues || []);
    setAuthState("ok");
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddIssue() {
    if (!newTitle.trim() || !newArea.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/admin/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, area: newArea, severity: newSeverity }),
    });
    if (res.ok) {
      setNewTitle("");
      setNewArea("");
      setNewSeverity("medium");
      setShowAddForm(false);
      await loadData();
    }
    setSubmitting(false);
  }

  async function handleResolve(id: string) {
    setResolvingId(id);
    const res = await fetch(`/api/admin/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    if (res.ok) {
      await loadData();
    }
    setResolvingId(null);
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
  `;

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
        <div className="admin-h1">Overview</div>
        <div className="admin-sub">Platform snapshot and known issues</div>

        {stats && (
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Users</div>
              <div className="kpi-value">{stats.totalUsers.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Businesses</div>
              <div className="kpi-value">{stats.totalBusinesses.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Photographers</div>
              <div className="kpi-value">{stats.totalPhotographers.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Orders</div>
              <div className="kpi-value">{stats.totalOrders.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Bookings</div>
              <div className="kpi-value">{stats.totalBookings.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Pending Refunds</div>
              <div className="kpi-value">{stats.pendingRefunds.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Revenue</div>
              <div className="kpi-value">${stats.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Customers</div>
              <div className="kpi-value">{stats.regularCustomers.toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="section-title">
          <span>Known Issues</span>
          <button className="btn btn-gold" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "Cancel" : "+ Add Issue"}
          </button>
        </div>

        {showAddForm && (
          <div className="add-form">
            <label className="field-label">Title</label>
            <input
              className="field-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Pulse feed returns zero posts"
            />
            <label className="field-label">Area</label>
            <input
              className="field-input"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              placeholder="e.g. Backend / Discover"
            />
            <label className="field-label">Severity</label>
            <select
              className="field-select"
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as "low" | "medium" | "high")}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-gold"
                onClick={handleAddIssue}
                disabled={submitting || !newTitle.trim() || !newArea.trim()}
              >
                {submitting ? "Adding…" : "Add Issue"}
              </button>
            </div>
          </div>
        )}

        {issues.length === 0 ? (
          <div className="empty-state">No open issues.</div>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="issue-row">
              <div>
                <div className="issue-title">{issue.title}</div>
                <div className="issue-meta">
                  {issue.area} · {new Date(issue.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`severity-badge sev-${issue.severity}`}>{issue.severity}</span>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleResolve(issue.id)}
                  disabled={resolvingId === issue.id}
                >
                  {resolvingId === issue.id ? "Resolving…" : "Resolve"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}