"use client";

// Admin → Emails → Broadcast (?tab=broadcast).
// Legend writes his own announcement: picks who gets it, a subject and his own HTML, checks the live
// preview, sends a test to himself, then sends for real. The backend (outsyde-backend #292,
// server/routes/emailAdmin.ts) skips anyone without an email, disabled, deleted, demo, admin or
// unsubscribed, swaps {{first_name}} per person, adds the unsubscribe line under his HTML and sends in
// the background. This page then polls the send until it is done.
// Daily limit: 80 emails per New York day from the admin pages (backend BROADCAST_DAILY_LIMIT).
//
// BFFs: GET /api/admin/emails/budget, GET /api/admin/emails/audiences, GET /api/admin/emails/people?q=,
// POST /api/admin/emails/broadcasts/test, POST /api/admin/emails/broadcasts, GET /api/admin/emails/sends/:id.
// Copy follows the house style: plain punctuation, no dashes.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIENCE_LABEL, OFFLINE, ROLE_LABEL, StateMsg, api, errorText, personName, whyNot,
  type AuthState, type Person,
} from "./shared";

type Audience = "picked" | "vendors" | "photographers" | "consumers" | "all";
type Counts = Record<Exclude<Audience, "picked">, number>;
// resend = every email on the Resend account today, per Resend (backend PR C2); null when unknown.
interface ResendUsage { used: number; limit: number | null; resetsAt: string | null }
interface Budget { sentToday: number; limit: number | null; remaining: number | null; resend: ResendUsage | null }

const RESET_FMT = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });

/** "All emails today: 7 of 100, resets 8:00 PM." (Resend's day ends at midnight UTC.) */
function resendLine(u: ResendUsage | null): string | null {
  if (!u || typeof u.used !== "number") return null;
  const reset = u.resetsAt && !Number.isNaN(Date.parse(u.resetsAt)) ? `, resets ${RESET_FMT.format(new Date(u.resetsAt))}` : "";
  return `All emails today: ${u.used}${u.limit !== null ? ` of ${u.limit}` : ""}${reset}.`;
}
interface SendState { id: string; status: string; recipients: number; sent: number; failed: number }

const AUDIENCES: Audience[] = ["picked", "vendors", "photographers", "consumers", "all"];
const MAX_PICKED = 500; // backend MAX_PICKED (server/broadcasts/broadcasts.ts)
const MAX_SUBJECT = 200;
const MAX_HTML = 200_000;
const SAMPLE_NAME = "Alex";
const POLL_MS = 1500;

/** Same swap as the backend's personalize(): {{first_name}} in any spacing or case. */
function personalize(text: string, name: string): string {
  return text.replace(/\{\{\s*first_name\s*\}\}/gi, name);
}

// Preview copy of the line the backend adds under every broadcast (unsubscribeFooter in
// server/broadcasts/broadcasts.ts). The real one has a signed link per person.
const FOOTER_PREVIEW =
  `<div style="margin:24px auto 0;max-width:600px;padding:16px 24px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6;color:#888888;">You're getting this because you have an Outsyde account. <a href="#" style="color:#888888;text-decoration:underline;">Unsubscribe from announcements</a>. Booking, order and account emails will still arrive.<br>Outsyde LLC, 54 State Street, Ste 804 #13315, Albany, New York 12207, US</div>`;

function previewDoc(html: string): string {
  const body = personalize(html, SAMPLE_NAME);
  return /<\/body>/i.test(body) ? body.replace(/<\/body>/i, `${FOOTER_PREVIEW}</body>`) : `${body}${FOOTER_PREVIEW}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export default function BroadcastTab({ onOpenSend }: { onOpenSend: (sendId: string) => void }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);

  const [audience, setAudience] = useState<Audience | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Map<string, Person>>(new Map());

  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");

  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [send, setSend] = useState<SendState | null>(null);
  const searchSeq = useRef(0);

  const handleAuth = useCallback((status: number): boolean => {
    if (status === 401) { setAuthState("unauthorized"); return true; }
    if (status === 403) { setAuthState("forbidden"); return true; }
    return false;
  }, []);

  const loadMeta = useCallback(async () => {
    const [b, a] = await Promise.all([
      api<Budget & { success?: boolean }>("/api/admin/emails/budget"),
      api<{ counts?: Counts }>("/api/admin/emails/audiences"),
    ]);
    if (handleAuth(b.status) || handleAuth(a.status)) return;
    if (!b.ok || !a.ok) {
      const bad = !b.ok ? b : a;
      setLoadError(bad.status === 0 ? OFFLINE : errorText(bad.data, `Couldn't load the counts (${bad.status}).`));
      return;
    }
    setBudget({ sentToday: Number(b.data?.sentToday ?? 0), limit: b.data?.limit ?? null, remaining: b.data?.remaining ?? null, resend: b.data?.resend ?? null });
    setCounts(a.data?.counts ?? null);
    setLoadError(null);
    setAuthState("ok");
  }, [handleAuth]);

  useEffect(() => {
    // Initial load; loadMeta only sets state after the requests finish.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMeta();
  }, [loadMeta]);

  // People search for "Picked people" (2+ characters, debounced).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await api<{ people?: Person[] }>(`/api/admin/emails/people?q=${encodeURIComponent(q)}`);
      if (seq !== searchSeq.current) return;
      setSearching(false);
      if (handleAuth(r.status)) return;
      if (!r.ok) {
        setSearchError(r.status === 0 ? OFFLINE : errorText(r.data, `Search failed (${r.status}).`));
        setResults([]);
        return;
      }
      setSearchError(null);
      setResults(Array.isArray(r.data?.people) ? r.data!.people! : []);
    }, 300);
    return () => clearTimeout(t);
  }, [query, handleAuth]);

  // Follow a running broadcast until the backend marks it done or failed.
  const sendId = send?.id ?? null;
  const sendRunning = send?.status === "sending";
  useEffect(() => {
    if (!sendId || !sendRunning) return;
    let stopped = false;
    const tick = async () => {
      const r = await api<{ send?: { status: string; recipient_count: number; sent_count: number; failed_count: number } }>(
        `/api/admin/emails/sends/${encodeURIComponent(sendId)}`,
      );
      if (stopped || !r.ok || !r.data?.send) return;
      const s = r.data.send;
      setSend((prev) =>
        prev && prev.id === sendId
          ? { ...prev, status: s.status, recipients: Number(s.recipient_count) || prev.recipients, sent: Number(s.sent_count) || 0, failed: Number(s.failed_count) || 0 }
          : prev,
      );
      if (s.status !== "sending") loadMeta();
    };
    const timer = setInterval(tick, POLL_MS);
    tick();
    return () => { stopped = true; clearInterval(timer); };
  }, [sendId, sendRunning, loadMeta]);

  const recipients = audience === "picked" ? picked.size : audience && counts ? counts[audience] : 0;
  const remaining = budget?.remaining ?? null;
  const subjectTrim = subject.trim();
  const contentError =
    !subjectTrim ? "Add a subject."
      : subjectTrim.length > MAX_SUBJECT ? `Keep the subject under ${MAX_SUBJECT} characters.`
        : /[\r\n]/.test(subject) ? "The subject must be one line."
          : !html.trim() ? "Add the email HTML."
            : html.length > MAX_HTML ? "The HTML is too large (200 KB max)."
              : null;
  const sendBlocker =
    contentError ??
    (!audience ? "Pick who to send to."
      : recipients === 0 ? (audience === "picked" ? "Tick at least one person." : "Nobody in this group can get announcements.")
        : remaining !== null && recipients > remaining ? `That's ${plural(recipients, "email", "emails")}, but only ${remaining} ${remaining === 1 ? "is" : "are"} left today.`
          : null);
  const testBlocker = contentError ?? (remaining !== null && remaining < 1 ? "Today's email limit is used up." : null);
  const locked = busy !== null || sendRunning;

  const srcDoc = useMemo(() => previewDoc(html), [html]);

  function pickAudience(a: Audience) {
    setAudience(a);
    setConfirming(false);
  }

  function togglePerson(p: Person) {
    if (!p.canBroadcast) return;
    setConfirming(false);
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else if (next.size < MAX_PICKED) next.set(p.id, p);
      return next;
    });
  }

  function onQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      searchSeq.current++;
      setResults([]);
      setSearching(false);
      setSearchError(null);
    }
  }

  async function sendTest() {
    if (testBlocker) return;
    setBusy("test");
    setNotice(null);
    const r = await api<{ to?: string }>("/api/admin/emails/broadcasts/test", { method: "POST", body: { subject: subjectTrim, html } });
    if (handleAuth(r.status)) return setBusy(null);
    await loadMeta(); // the test counts toward today's limit
    setBusy(null);
    if (!r.ok) {
      setNotice({ kind: "err", text: r.status === 0 ? OFFLINE : errorText(r.data, `The test didn't send (${r.status}).`) });
    } else {
      setNotice({ kind: "ok", text: `Test sent to ${r.data?.to ?? "your email"}. The subject starts with [Test].` });
    }
  }

  async function sendAll() {
    if (sendBlocker || !audience) return;
    setBusy("send");
    setNotice(null);
    const body = audience === "picked"
      ? { audience, userIds: Array.from(picked.keys()), subject: subjectTrim, html }
      : { audience, subject: subjectTrim, html };
    const r = await api<{ sendId?: string; recipients?: number }>("/api/admin/emails/broadcasts", { method: "POST", body });
    setBusy(null);
    setConfirming(false);
    if (handleAuth(r.status)) return;
    if (!r.ok || !r.data?.sendId) {
      // 429 OVER_DAILY_LIMIT, 400 NO_RECIPIENTS etc. all carry a readable message from the backend.
      setNotice({
        kind: "err",
        text: r.status === 0
          ? "Couldn't reach the server. Check History before sending again, it may have started."
          : errorText(r.data, `The broadcast didn't start (${r.status}).`),
      });
      loadMeta();
      return;
    }
    setSend({ id: r.data.sendId, status: "sending", recipients: Number(r.data.recipients) || recipients, sent: 0, failed: 0 });
  }

  if (authState === "unauthorized" || authState === "forbidden") {
    return <div className="em-wrap"><StateMsg state={authState} /></div>;
  }
  if (authState === "loading") {
    return (
      <div className="em-wrap">
        {loadError ? (
          <div className="em-state">
            <div className="em-state-title">Couldn&apos;t load</div>
            <div className="em-state-sub">{loadError}</div>
            <button className="em-btn em-btn-gold" onClick={() => { setLoadError(null); loadMeta(); }}>Retry</button>
          </div>
        ) : (
          <div className="em-state"><div className="em-state-title">Loading</div></div>
        )}
      </div>
    );
  }

  const done = send && send.status !== "sending";
  const progress = send && send.recipients > 0 ? Math.min(100, Math.round(((send.sent + send.failed) / send.recipients) * 100)) : 0;

  return (
    <div className="em-wrap">
      <div className="em-sub">
        Write an announcement in your own HTML and choose who gets it. People without an email, disabled, demo and
        admin accounts, and anyone who unsubscribed are always skipped. Send a test to yourself first.
      </div>

      {loadError && <div className="em-banner em-banner-err" role="alert">{loadError}</div>}
      {notice && <div className={`em-banner ${notice.kind === "ok" ? "em-banner-ok" : "em-banner-err"}`} role="status">{notice.text}</div>}

      {send && (
        <div className={`em-banner ${done ? (send.status === "failed" || send.failed > 0 ? "em-banner-err" : "em-banner-ok") : "em-banner-info"}`} role="status">
          {done
            ? send.status === "failed"
              ? `The broadcast stopped. ${send.sent} sent, ${send.failed} failed out of ${send.recipients}.`
              : `Done. ${send.sent} sent${send.failed ? `, ${send.failed} failed` : ""} out of ${send.recipients}.`
            : `Sending: ${send.sent + send.failed} of ${send.recipients}${send.failed ? ` (${send.failed} failed)` : ""}. You can leave this page, it keeps going.`}
          <div className="em-progress" aria-hidden="true"><div style={{ width: `${done ? 100 : progress}%` }} /></div>
          <div style={{ marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button className="em-link" onClick={() => onOpenSend(send.id)}>Open in History</button>
            {done && <button className="em-link" onClick={() => setSend(null)}>Dismiss</button>}
          </div>
        </div>
      )}

      <span className="em-label">Send to</span>
      <div className="em-audiences" role="radiogroup" aria-label="Send to">
        {AUDIENCES.map((a) => (
          <button
            key={a}
            role="radio"
            aria-checked={audience === a}
            className={`em-aud${audience === a ? " on" : ""}`}
            onClick={() => pickAudience(a)}
            disabled={locked}
          >
            <div className="em-aud-name">{AUDIENCE_LABEL[a]}</div>
            <div className="em-aud-n">
              {a === "picked" ? `${picked.size} ticked` : counts ? plural(counts[a], "person", "people") : ""}
            </div>
          </button>
        ))}
      </div>

      {audience === "picked" && (
        <div style={{ marginTop: 14 }}>
          <input
            className="em-input"
            type="search"
            placeholder="Search by name, business, username or email"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            aria-label="Search people"
          />
          {picked.size > 0 && (
            <div className="em-chips">
              {Array.from(picked.values()).map((p) => (
                <span className="em-chip" key={p.id}>
                  <span>{personName(p)}</span>
                  <button aria-label={`Remove ${personName(p)}`} onClick={() => togglePerson(p)} disabled={locked}>×</button>
                </span>
              ))}
              <button className="em-link" onClick={() => setPicked(new Map())} disabled={locked}>Clear all</button>
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            {query.trim().length < 2 ? (
              <div className="em-hint">Type at least 2 letters to search.</div>
            ) : searchError ? (
              <div className="em-banner em-banner-err">{searchError}</div>
            ) : searching && results.length === 0 ? (
              <div className="em-hint">Searching</div>
            ) : results.length === 0 ? (
              <div className="em-empty">No accounts match.</div>
            ) : (
              results.map((p) => {
                const on = picked.has(p.id);
                return (
                  <label key={p.id} className={`em-row${on ? " on" : ""}${p.canBroadcast ? " click" : " off"}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!p.canBroadcast || locked}
                      onChange={() => togglePerson(p)}
                      aria-label={`Tick ${personName(p)}`}
                    />
                    <div className="em-row-main">
                      <div className="em-row-title">{personName(p)}</div>
                      <div className="em-row-meta">
                        <span className="em-tag">{ROLE_LABEL[p.role] ?? p.role}</span>
                        {p.email ?? "no email"}
                        {!p.canBroadcast && <> · <span style={{ color: "#ff6b6b" }}>{whyNot(p)}</span></>}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
            {picked.size >= MAX_PICKED && <div className="em-hint">You can pick up to {MAX_PICKED} people at once.</div>}
          </div>
        </div>
      )}

      <label className="em-label" htmlFor="em-subject">Subject</label>
      <input
        id="em-subject"
        className="em-input"
        value={subject}
        maxLength={MAX_SUBJECT}
        onChange={(e) => { setSubject(e.target.value); setConfirming(false); }}
        placeholder="What's new on Outsyde"
        disabled={locked}
      />

      <label className="em-label" htmlFor="em-html">Email HTML</label>
      <textarea
        id="em-html"
        className="em-textarea"
        value={html}
        onChange={(e) => { setHtml(e.target.value); setConfirming(false); }}
        placeholder="<h1>Hi {{first_name}},</h1>"
        spellCheck={false}
        disabled={locked}
      />
      <div className="em-hint">
        Paste your own HTML. <code>{"{{first_name}}"}</code>{" "}becomes each person&apos;s first name, or &quot;there&quot; when we don&apos;t have one.
        The unsubscribe line at the bottom of the preview is added to every email automatically.
      </div>

      <span className="em-label">Preview</span>
      <div className="em-preview">
        <div className="em-preview-head">
          Subject: <b>{subjectTrim ? personalize(subjectTrim, SAMPLE_NAME) : "No subject yet"}</b>
          <br />
          Shown with {SAMPLE_NAME} as the first name.
        </div>
        {/* Admin typed HTML; sandbox="" blocks scripts, forms and navigation inside the frame. */}
        <iframe title="Broadcast preview" sandbox="" srcDoc={srcDoc} />
      </div>

      <div className="em-bar">
        <div className="em-bar-text">
          {confirming ? (
            <span className="em-confirm">
              Email {plural(recipients, "person", "people")} ({AUDIENCE_LABEL[audience ?? "all"]}) now? This can&apos;t be undone.
            </span>
          ) : (
            <>
              {budget
                ? budget.limit === null
                  ? `${budget.sentToday} sent today. No daily limit.`
                  : `${budget.sentToday} of ${budget.limit} sent today, ${budget.remaining ?? 0} left.`
                : ""}
              {budget && resendLine(budget.resend) ? (
                <div style={{ color: "rgba(245,240,230,0.5)", fontSize: 12.5, marginTop: 2 }}>{resendLine(budget.resend)}</div>
              ) : null}
              {sendBlocker ? (
                <div style={{ color: "rgba(245,240,230,0.5)", fontSize: 12.5, marginTop: 2 }}>{sendBlocker}</div>
              ) : null}
            </>
          )}
        </div>
        <div className="em-bar-actions">
          {confirming ? (
            <>
              <button className="em-btn em-btn-ghost" onClick={() => setConfirming(false)} disabled={busy !== null}>Cancel</button>
              <button className="em-btn em-btn-gold" onClick={sendAll} disabled={busy !== null}>
                {busy === "send" ? "Starting" : `Yes, send ${recipients}`}
              </button>
            </>
          ) : (
            <>
              <button className="em-btn em-btn-ghost" onClick={sendTest} disabled={!!testBlocker || locked}>
                {busy === "test" ? "Sending test" : "Send test to me"}
              </button>
              <button
                className="em-btn em-btn-gold"
                onClick={() => { setNotice(null); setConfirming(true); }}
                disabled={!!sendBlocker || locked}
              >
                {audience ? `Send to ${plural(recipients, "person", "people")}` : "Send"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
