"use client";

// Admin → Emails → Account setup.
// Lists everyone with an account setup email due right now (backend dry run, writes nothing).
// Legend filters, previews the exact email a person would get, ticks who should get it and sends
// to exactly those people. Nothing is ticked by default. The hourly job stays off; this page is the
// only sender. Broadcast and Sent log tabs come later (design: the Admin Email Pages Design note in the vault).
//
// BFFs: GET /api/admin/account-setup/preview, GET /api/admin/account-setup/preview/:userId/email,
// POST /api/admin/account-setup/send { userIds } (outsyde-backend server/routes/accountSetup.ts).
// A person only shows up again when their next follow-up is due (3, 7 and 14 days after the first
// email, at most 4), so nobody can be emailed twice for the same reminder.
//
// Copy on this page follows the house style: plain punctuation, no dashes.

import { useCallback, useEffect, useMemo, useState } from "react";

type Template = "claim" | "steps_left";
type StepKey = "password" | "username" | "approval" | "plan" | "payouts";
type Role = "consumer" | "business" | "photographer" | "staff";

interface DueReminder {
  userId: string;
  email: string;
  displayName: string | null;
  role: Role;
  reminderNumber: number;
  template: Template;
  steps: StepKey[];
  channels: ("email" | "push")[];
  outcome: string;
  error?: string;
}

interface SendResult {
  sent: DueReminder[];
  failed: DueReminder[];
  notDue: string[];
}

interface EmailPreview {
  subject: string;
  html: string;
  template: Template;
  reminderNumber: number;
  email: string;
}

type AuthState = "loading" | "ok" | "unauthorized" | "forbidden";
type Filter = "all" | "claim" | "payouts" | "plan" | "username";

const FILTERS: { key: Filter; label: string; match: (r: DueReminder) => boolean }[] = [
  { key: "all", label: "All due", match: () => true },
  { key: "claim", label: "Claim account", match: (r) => r.template === "claim" },
  { key: "payouts", label: "Payouts", match: (r) => r.steps.includes("payouts") },
  { key: "plan", label: "Plan", match: (r) => r.steps.includes("plan") },
  { key: "username", label: "Username", match: (r) => r.steps.includes("username") },
];

const STEP_LABEL: Record<StepKey, string> = {
  password: "Password",
  username: "Username",
  approval: "Approval",
  plan: "Plan",
  payouts: "Payouts",
};

const ROLE_LABEL: Record<Role, string> = {
  consumer: "Customer",
  business: "Business",
  photographer: "Photographer",
  staff: "Staff",
};

const TEMPLATE_LABEL: Record<Template, string> = {
  claim: "Claim email",
  steps_left: "Steps left email",
};

function ordinal(n: number): string {
  return n === 1 ? "1st email" : n === 2 ? "2nd email" : n === 3 ? "3rd email" : `${n}th email`;
}

function errorText(data: unknown, fallback: string): string {
  const d = data as { error?: unknown; message?: unknown } | null;
  if (d && typeof d.error === "string" && d.error) return d.error;
  if (d && d.error && typeof d.error === "object") {
    const m = (d.error as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  if (d && typeof d.message === "string" && d.message) return d.message;
  return fallback;
}

function nameOf(r: DueReminder): string {
  return r.displayName?.trim() || r.email;
}

export default function AdminEmailsPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [due, setDue] = useState<DueReminder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [previewFor, setPreviewFor] = useState<DueReminder | null>(null);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/account-setup/preview", { cache: "no-store" });
      if (res.status === 401) return setAuthState("unauthorized");
      if (res.status === 403) return setAuthState("forbidden");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(errorText(data, `Couldn't load the list (${res.status}).`));
        return;
      }
      const list: DueReminder[] = Array.isArray(data.reminders) ? data.reminders : [];
      setDue(list);
      // Keep only ticks that are still on the list (someone was sent to or finished meanwhile).
      setPicked((prev) => new Set(list.filter((r) => prev.has(r.userId)).map((r) => r.userId)));
      setLoadError(null);
      setAuthState("ok");
    } catch {
      setLoadError("Couldn't reach the server. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    // Initial load; loadData only sets state after the request finishes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const byId = useMemo(() => new Map(due.map((r) => [r.userId, r])), [due]);
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, due.filter(f.match).length])) as Record<Filter, number>,
    [due],
  );
  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const rows = due.filter(activeFilter.match);
  const allOn = rows.length > 0 && rows.every((r) => picked.has(r.userId));

  function toggle(id: string) {
    setConfirming(false);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setVisible(on: boolean) {
    setConfirming(false);
    setPicked((prev) => {
      const next = new Set(prev);
      for (const r of rows) {
        if (on) next.add(r.userId);
        else next.delete(r.userId);
      }
      return next;
    });
  }

  async function openPreview(r: DueReminder) {
    setPreviewFor(r);
    setPreview(null);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/admin/account-setup/preview/${encodeURIComponent(r.userId)}/email`, { cache: "no-store" });
      if (res.status === 401) return setAuthState("unauthorized");
      if (res.status === 403) return setAuthState("forbidden");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreviewError(
          res.status === 404
            ? "Nothing is due for this person anymore. Reload the list."
            : errorText(data, `Couldn't load the preview (${res.status}).`),
        );
        return;
      }
      setPreview({ subject: data.subject, html: data.html, template: data.template, reminderNumber: data.reminderNumber, email: data.email });
    } catch {
      setPreviewError("Couldn't reach the server. Try again.");
    }
  }

  function closePreview() {
    setPreviewFor(null);
    setPreview(null);
    setPreviewError(null);
  }

  async function send() {
    const userIds = Array.from(picked);
    if (userIds.length === 0) return;
    setSending(true);
    setSendError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/account-setup/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      if (res.status === 401) return setAuthState("unauthorized");
      if (res.status === 403) return setAuthState("forbidden");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(
          res.status === 502
            ? "Couldn't reach the server. Some emails may have gone out, so the list was reloaded. Check it before sending again."
            : errorText(data, `Send failed (${res.status}). Reload the list before trying again.`),
        );
      } else {
        const reminders: DueReminder[] = Array.isArray(data.reminders) ? data.reminders : [];
        setResult({
          sent: reminders.filter((r) => r.outcome === "sent"),
          failed: reminders.filter((r) => r.outcome === "failed"),
          notDue: [
            ...(Array.isArray(data.notDue) ? (data.notDue as string[]) : []),
            ...reminders.filter((r) => r.outcome === "skipped_recently_claimed").map((r) => r.userId),
          ],
        });
        setPicked(new Set());
      }
    } catch {
      setSendError("Couldn't reach the server. Some emails may have gone out, so the list was reloaded. Check it before sending again.");
    } finally {
      setConfirming(false);
      setSending(false);
      await loadData();
    }
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    .admin-page { font-family: 'Hanken Grotesk', 'Inter', sans-serif; max-width: 980px; }
    .admin-h1 { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.04em; color: #F5F0E6; margin-bottom: 4px; }
    .admin-kicker { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #E8B930; margin-bottom: 6px; }
    .admin-sub { color: rgba(245,240,230,0.5); font-size: 14px; margin-bottom: 22px; max-width: 660px; line-height: 1.55; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .chip { font-family: inherit; font-size: 12.5px; padding: 7px 13px; border-radius: 999px; cursor: pointer; border: 1px solid rgba(245,240,230,0.14); background: transparent; color: rgba(245,240,230,0.7); }
    .chip.on { border-color: #E8B930; background: rgba(232,185,48,0.12); color: #E8B930; }
    .chip-n { opacity: 0.7; margin-left: 6px; }
    .list-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 6px 0 10px; font-size: 13px; color: rgba(245,240,230,0.5); }
    .link-btn { background: none; border: 0; color: #E8B930; font: inherit; font-size: 12.5px; cursor: pointer; padding: 0; }
    .row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 8px; background: rgba(245,240,230,0.02); border: 1px solid rgba(245,240,230,0.06); margin-bottom: 8px; }
    .row.on { border-color: rgba(232,185,48,0.45); background: rgba(232,185,48,0.06); }
    .row input { margin-top: 3px; accent-color: #E8B930; width: 16px; height: 16px; flex: none; cursor: pointer; }
    .row-main { min-width: 0; flex: 1; cursor: pointer; }
    .row-title { font-size: 14px; color: #F5F0E6; font-weight: 500; overflow-wrap: anywhere; }
    .row-meta { font-size: 12px; color: rgba(245,240,230,0.45); margin-top: 4px; overflow-wrap: anywhere; line-height: 1.7; }
    .tag { display: inline-block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: rgba(245,240,230,0.08); color: rgba(245,240,230,0.65); margin-right: 6px; }
    .tag-gold { background: rgba(232,185,48,0.14); color: #E8B930; }
    .row-actions { flex: none; }
    .empty-state { padding: 18px; color: rgba(245,240,230,0.35); font-size: 13.5px; border: 1px dashed rgba(245,240,230,0.1); border-radius: 8px; }
    .bar { position: sticky; bottom: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; margin-top: 12px; background: #0b0b0b; border: 1px solid rgba(245,240,230,0.12); border-radius: 10px; }
    .bar-text { font-size: 13.5px; color: rgba(245,240,230,0.75); overflow-wrap: anywhere; }
    .btn { font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 9px 16px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; letter-spacing: 0.03em; }
    .btn-gold { background: #E8B930; color: #000; }
    .btn-gold:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
    .btn-small { padding: 6px 11px; font-size: 12px; }
    .confirm { color: #E8B930; font-size: 13px; }
    .banner { border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; font-size: 13px; line-height: 1.5; }
    .banner-ok { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
    .banner-err { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); color: #ff6b6b; }
    .banner ul { margin: 6px 0 0; padding-left: 18px; }
    .state-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40vh; text-align: center; gap: 8px; }
    .state-msg-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #F5F0E6; }
    .state-msg-sub { color: rgba(245,240,230,0.5); font-size: 14px; max-width: 400px; }
    .modal-back { position: fixed; inset: 0; background: rgba(0,0,0,0.72); display: flex; align-items: flex-start; justify-content: center; padding: 72px 16px 32px; z-index: 9999; overflow-y: auto; }
    .modal { width: 100%; max-width: 680px; background: #0b0b0b; border: 1px solid rgba(245,240,230,0.12); border-radius: 12px; overflow: hidden; }
    .modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid rgba(245,240,230,0.08); }
    .modal-label { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,240,230,0.45); }
    .modal-subject { font-size: 15px; color: #F5F0E6; font-weight: 600; margin-top: 4px; overflow-wrap: anywhere; }
    .modal-to { font-size: 12px; color: rgba(245,240,230,0.5); margin-top: 4px; overflow-wrap: anywhere; }
    .modal-body { padding: 0; background: #0D0D0D; }
    .modal-body iframe { display: block; width: 100%; height: 68vh; border: 0; background: #0D0D0D; }
    .modal-msg { padding: 28px 18px; color: rgba(245,240,230,0.6); font-size: 13.5px; }
  `;

  const head = (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
    </>
  );

  if (loadError && authState !== "ok") {
    return (
      <>
        {head}
        <div className="admin-page state-msg">
          <div className="state-msg-title">Couldn&apos;t load the list</div>
          <div className="state-msg-sub">{loadError}</div>
          <button className="btn btn-gold" onClick={() => { setLoadError(null); loadData(); }}>Retry</button>
        </div>
      </>
    );
  }
  if (authState === "loading") {
    return (<>{head}<div className="admin-page state-msg"><div className="state-msg-title">Loading</div></div></>);
  }
  if (authState === "unauthorized") {
    return (
      <>
        {head}
        <div className="admin-page state-msg">
          <div className="state-msg-title">Not signed in</div>
          <div className="state-msg-sub"><a href="/login" style={{ color: "#E8B930" }}>Log in</a> to access the admin dashboard.</div>
        </div>
      </>
    );
  }
  if (authState === "forbidden") {
    return (
      <>
        {head}
        <div className="admin-page state-msg">
          <div className="state-msg-title">Not authorized</div>
          <div className="state-msg-sub">Your account doesn&apos;t have admin access.</div>
        </div>
      </>
    );
  }

  const count = picked.size;

  return (
    <>
      {head}
      <div className="admin-page">
        <div className="admin-kicker">Emails</div>
        <div className="admin-h1">Account setup</div>
        <div className="admin-sub">
          Everyone with a setup email due right now. Preview what each person gets, tick who should get it, then send.
          Only the people you tick are emailed. After an email goes out, that person leaves this list until their next
          follow up is due. Follow ups go out 3, 7 and 14 days after the first email, and nobody gets more than 4.
        </div>

        {loadError && <div className="banner banner-err" role="alert">{loadError}</div>}
        {sendError && <div className="banner banner-err" role="alert">{sendError}</div>}
        {result && (
          <div className={`banner ${result.failed.length ? "banner-err" : "banner-ok"}`} role="status">
            Sent {result.sent.length} {result.sent.length === 1 ? "email" : "emails"}
            {result.failed.length ? `, ${result.failed.length} failed` : ""}.
            {result.failed.length > 0 && (
              <ul>
                {result.failed.map((r) => (
                  <li key={r.userId}>{r.email}: {r.error || "send failed"}. Still on the list, you can retry.</li>
                ))}
              </ul>
            )}
            {result.notDue.length > 0 && (
              <div style={{ marginTop: 6, color: "rgba(245,240,230,0.7)" }}>
                Skipped {result.notDue.length}: nothing was due for them anymore, they were already emailed or finished.
              </div>
            )}
          </div>
        )}

        <div className="chips" role="tablist" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={`chip${filter === f.key ? " on" : ""}`}
              onClick={() => { setFilter(f.key); setConfirming(false); }}
            >
              {f.label}<span className="chip-n">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <div className="list-head">
          <span>{rows.length} {rows.length === 1 ? "person" : "people"} in this view</span>
          {rows.length > 0 && (
            <button className="link-btn" onClick={() => setVisible(!allOn)}>
              {allOn ? "Untick all in view" : "Tick all in view"}
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">Nobody in this view is due for an email right now.</div>
        ) : (
          rows.map((r) => {
            const on = picked.has(r.userId);
            const todo = r.steps.filter((s) => s !== "password").map((s) => STEP_LABEL[s]);
            return (
              <div className={`row${on ? " on" : ""}`} key={r.userId}>
                <input type="checkbox" checked={on} onChange={() => toggle(r.userId)} aria-label={`Tick ${nameOf(r)}`} />
                <div className="row-main" onClick={() => toggle(r.userId)}>
                  <div className="row-title">{nameOf(r)}</div>
                  <div className="row-meta">
                    <span className="tag">{ROLE_LABEL[r.role] ?? r.role}</span>
                    <span className="tag tag-gold">{TEMPLATE_LABEL[r.template]}</span>
                    <span className="tag">{ordinal(r.reminderNumber)}</span>
                    {r.email}
                    {todo.length > 0 ? ` · missing: ${todo.join(", ")}` : ""}
                    {r.template === "claim" ? " · no password yet" : ""}
                    {r.channels.includes("push") ? " · plus an app notification" : ""}
                  </div>
                </div>
                <div className="row-actions">
                  <button className="btn btn-ghost btn-small" onClick={() => openPreview(r)}>Preview</button>
                </div>
              </div>
            );
          })
        )}

        <div className="bar">
          <div className="bar-text">
            {confirming
              ? <span className="confirm">Email {count} {count === 1 ? "person" : "people"} now? This can&apos;t be undone.</span>
              : count === 0
                ? "Tick the people to email."
                : `${count} ticked: ${Array.from(picked).slice(0, 3).map((id) => byId.get(id)?.email).filter(Boolean).join(", ")}${count > 3 ? ` and ${count - 3} more` : ""}`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {confirming ? (
              <>
                <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={sending}>Cancel</button>
                <button className="btn btn-gold" onClick={send} disabled={sending}>
                  {sending ? "Sending" : `Yes, send ${count}`}
                </button>
              </>
            ) : (
              <button className="btn btn-gold" disabled={count === 0} onClick={() => { setResult(null); setConfirming(true); }}>
                Send to {count} {count === 1 ? "person" : "people"}
              </button>
            )}
          </div>
        </div>
      </div>

      {previewFor && (
        <div className="modal-back" onClick={closePreview}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Email preview" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ minWidth: 0 }}>
                <div className="modal-label">Preview, not sent</div>
                <div className="modal-subject">{preview ? preview.subject : nameOf(previewFor)}</div>
                <div className="modal-to">
                  To {previewFor.email} · {TEMPLATE_LABEL[previewFor.template]} · {ordinal(previewFor.reminderNumber)}
                </div>
              </div>
              <button className="btn btn-ghost btn-small" onClick={closePreview}>Close</button>
            </div>
            <div className="modal-body">
              {previewError ? (
                <div className="modal-msg">{previewError}</div>
              ) : preview ? (
                // Built by the backend; sandbox="" blocks scripts, forms and navigation inside the frame.
                <iframe title={`Email preview for ${previewFor.email}`} sandbox="" srcDoc={preview.html} />
              ) : (
                <div className="modal-msg">Loading the email</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
