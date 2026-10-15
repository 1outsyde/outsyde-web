"use client";

// Admin → Account setup emails.
// Lists everyone with an account-setup email due right now (backend dry run, writes nothing),
// lets the admin tick who should get it, and sends to exactly those people.
// Nothing is ticked by default. The automatic hourly job stays off; this page is the only sender.
//
// Backend: GET /api/admin/account-setup/preview, POST /api/admin/account-setup/send { userIds }
// (outsyde-backend server/routes/accountSetup.ts). A person only shows up again when their next
// follow-up is due (3, 7 and 14 days after the first email, max 4), so nobody can be emailed twice
// for the same reminder.

import { useCallback, useEffect, useMemo, useState } from "react";

type Template = "claim" | "steps_left";
type StepKey = "password" | "username" | "approval" | "plan" | "payouts";

interface DueReminder {
  userId: string;
  email: string;
  displayName: string | null;
  role: "consumer" | "business" | "photographer" | "staff";
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

type AuthState = "loading" | "ok" | "unauthorized" | "forbidden";

const GROUPS: { template: Template; title: string; sub: string }[] = [
  {
    template: "claim",
    title: "Claim your account",
    sub: "No password yet. The email has a personal link (valid 7 days) to set a password and username.",
  },
  {
    template: "steps_left",
    title: "Finish setup",
    sub: "Signed up, but plan, payouts or username are still missing. The email links to goutsyde.com/finish.",
  },
];

const STEP_LABEL: Record<StepKey, string> = {
  password: "password",
  username: "username",
  approval: "approval",
  plan: "plan",
  payouts: "payouts",
};

const ROLE_LABEL: Record<DueReminder["role"], string> = {
  consumer: "Customer",
  business: "Business",
  photographer: "Photographer",
  staff: "Staff",
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

export default function AdminAccountSetupPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [due, setDue] = useState<DueReminder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

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
      // Keep only ticks that are still on the list (someone sent or finished in the meantime).
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

  function toggle(id: string) {
    setConfirming(false);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setGroup(template: Template, on: boolean) {
    setConfirming(false);
    setPicked((prev) => {
      const next = new Set(prev);
      for (const r of due) {
        if (r.template !== template) continue;
        if (on) next.add(r.userId);
        else next.delete(r.userId);
      }
      return next;
    });
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
        setSendError(errorText(data, `Send failed (${res.status}). Reload the list before trying again.`));
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
      setSendError("Couldn't reach the server. Some emails may have gone out — the list has been reloaded.");
    } finally {
      setConfirming(false);
      setSending(false);
      await loadData();
    }
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    .admin-page { font-family: 'Hanken Grotesk', 'Inter', sans-serif; max-width: 980px; }
    .admin-h1 { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.04em; color: #F5F0E6; margin-bottom: 6px; }
    .admin-sub { color: rgba(245,240,230,0.5); font-size: 14px; margin-bottom: 28px; max-width: 640px; line-height: 1.5; }
    .section { margin-bottom: 36px; }
    .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.06em; color: #F5F0E6; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .section-sub { color: rgba(245,240,230,0.45); font-size: 13px; margin: 4px 0 14px; }
    .link-btn { background: none; border: 0; color: #E8B930; font: inherit; font-size: 12.5px; cursor: pointer; padding: 0; }
    .row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 8px; background: rgba(245,240,230,0.02); border: 1px solid rgba(245,240,230,0.06); margin-bottom: 8px; cursor: pointer; }
    .row.on { border-color: rgba(232,185,48,0.45); background: rgba(232,185,48,0.06); }
    .row input { margin-top: 3px; accent-color: #E8B930; width: 16px; height: 16px; flex: none; cursor: pointer; }
    .row-main { min-width: 0; flex: 1; }
    .row-title { font-size: 14px; color: #F5F0E6; font-weight: 500; overflow-wrap: anywhere; }
    .row-meta { font-size: 12px; color: rgba(245,240,230,0.45); margin-top: 3px; overflow-wrap: anywhere; }
    .tag { display: inline-block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: rgba(245,240,230,0.08); color: rgba(245,240,230,0.65); margin-right: 6px; }
    .empty-state { padding: 18px; color: rgba(245,240,230,0.35); font-size: 13.5px; border: 1px dashed rgba(245,240,230,0.1); border-radius: 8px; }
    .bar { position: sticky; bottom: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; margin-top: 8px; background: #0b0b0b; border: 1px solid rgba(245,240,230,0.12); border-radius: 10px; }
    .bar-text { font-size: 13.5px; color: rgba(245,240,230,0.75); }
    .btn { font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 9px 16px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; letter-spacing: 0.03em; }
    .btn-gold { background: #E8B930; color: #000; }
    .btn-gold:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
    .confirm { color: #E8B930; font-size: 13px; }
    .banner { border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; font-size: 13px; line-height: 1.5; }
    .banner-ok { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
    .banner-err { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); color: #ff6b6b; }
    .banner-info { background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.12); color: rgba(245,240,230,0.7); }
    .banner ul { margin: 6px 0 0; padding-left: 18px; }
    .state-msg { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40vh; text-align: center; gap: 8px; }
    .state-msg-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #F5F0E6; }
    .state-msg-sub { color: rgba(245,240,230,0.5); font-size: 14px; max-width: 400px; }
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
          <div className="state-msg-title">Couldn’t load the list</div>
          <div className="state-msg-sub">{loadError}</div>
          <button className="btn btn-gold" onClick={() => { setLoadError(null); loadData(); }}>Retry</button>
        </div>
      </>
    );
  }
  if (authState === "loading") {
    return (<>{head}<div className="admin-page state-msg"><div className="state-msg-title">Loading…</div></div></>);
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
        <div className="admin-h1">Account setup emails</div>
        <div className="admin-sub">
          Everyone with an email due right now. Tick who should get it and press Send — only the people you tick are
          emailed. After an email goes out, that person leaves this list until their next follow-up is due (3, 7 and
          14 days later, at most 4 emails).
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
                  <li key={r.userId}>{r.email} — {r.error || "send failed"} (still on the list, you can retry)</li>
                ))}
              </ul>
            )}
            {result.notDue.length > 0 && (
              <div style={{ marginTop: 6, color: "rgba(245,240,230,0.7)" }}>
                Skipped {result.notDue.length}: nothing was due for them anymore (already emailed or finished).
              </div>
            )}
          </div>
        )}

        {GROUPS.map((g) => {
          const rows = due.filter((r) => r.template === g.template);
          const allOn = rows.length > 0 && rows.every((r) => picked.has(r.userId));
          return (
            <section className="section" key={g.template}>
              <div className="section-title">
                <span>{g.title} · {rows.length}</span>
                {rows.length > 0 && (
                  <button className="link-btn" onClick={() => setGroup(g.template, !allOn)}>
                    {allOn ? "Untick all" : "Tick all"}
                  </button>
                )}
              </div>
              <div className="section-sub">{g.sub}</div>
              {rows.length === 0 ? (
                <div className="empty-state">Nobody is due for this email right now.</div>
              ) : (
                rows.map((r) => {
                  const on = picked.has(r.userId);
                  const todo = r.steps.filter((s) => s !== "password").map((s) => STEP_LABEL[s]);
                  return (
                    <label className={`row${on ? " on" : ""}`} key={r.userId}>
                      <input type="checkbox" checked={on} onChange={() => toggle(r.userId)} />
                      <div className="row-main">
                        <div className="row-title">{r.displayName?.trim() || r.email}</div>
                        <div className="row-meta">
                          <span className="tag">{ROLE_LABEL[r.role] ?? r.role}</span>
                          <span className="tag">{ordinal(r.reminderNumber)}</span>
                          {r.email}
                          {todo.length > 0 ? ` · missing: ${todo.join(", ")}` : ""}
                          {r.channels.includes("push") ? " · + app notification" : ""}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </section>
          );
        })}

        <div className="bar">
          <div className="bar-text">
            {confirming
              ? <span className="confirm">Email {count} {count === 1 ? "person" : "people"} now? This can&apos;t be undone.</span>
              : count === 0
                ? "Tick the people to email."
                : `${count} ticked: ${Array.from(picked).slice(0, 3).map((id) => byId.get(id)?.email).filter(Boolean).join(", ")}${count > 3 ? ` +${count - 3} more` : ""}`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {confirming ? (
              <>
                <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={sending}>Cancel</button>
                <button className="btn btn-gold" onClick={send} disabled={sending}>
                  {sending ? "Sending…" : `Yes, send ${count}`}
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
    </>
  );
}
