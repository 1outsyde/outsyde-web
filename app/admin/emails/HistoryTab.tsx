"use client";

// Admin → Emails → History (?tab=history, &send=<id> opens one send).
// Every email the admin pages logged (outsyde-backend #292: email_sends + email_log), so Legend can
// see how often each person is emailed and what they got.
//   By send:   broadcasts, tests and account setup batches, newest first → detail with every recipient
//   By person: search an account → every logged email they got, newest first
// Booking, shoot, order, staff and account emails are logged by backend PR C2 (no send id, so they
// show under By person only). Internal alerts and password or claim code emails are never logged.
//
// BFFs: GET /api/admin/emails/sends?limit&before, GET /api/admin/emails/sends/:id,
// GET /api/admin/emails/people?q=, GET /api/admin/emails/people/:userId/emails.
// Copy follows the house style: plain punctuation, no dashes.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUDIENCE_LABEL, OFFLINE, ROLE_LABEL, StateMsg, api, errorText, personName, when,
  type AuthState, type Person,
} from "./shared";

interface SendRow {
  id: string;
  kind: string;
  audience: string | null;
  subject: string | null;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  finished_at: string | null;
  created_by_name: string | null;
  html?: string | null;
}

interface RecipientRow {
  id?: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  kind: string;
  label: string | null;
  status: string;
  error: string | null;
  created_at?: string;
  sent_at: string | null;
}

interface PersonEmail {
  id?: string;
  send_id: string | null;
  kind: string;
  status: string;
  error?: string | null;
  subject: string | null;
  created_at: string;
  sent_at: string | null;
}

interface PersonInfo { id: string; email: string | null; name: string | null; unsubscribed: boolean }

const PAGE = 50;
const POLL_MS = 2000;

const SEND_KIND: Record<string, { label: string; cls: string }> = {
  broadcast: { label: "Broadcast", cls: "em-tag-gold" },
  broadcast_test: { label: "Test", cls: "em-tag-blue" },
  setup: { label: "Setup emails", cls: "" },
};

const EMAIL_KIND: Record<string, string> = {
  broadcast: "Announcement",
  broadcast_test: "Test announcement",
  setup_claim: "Claim email",
  setup_steps_left: "Steps left email",
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Waiting", cls: "" },
  sending: { label: "Sending", cls: "em-tag-gold" },
  sent: { label: "Sent", cls: "em-tag-green" },
  failed: { label: "Failed", cls: "em-tag-red" },
  unknown: { label: "Maybe sent, server restarted", cls: "em-tag-gold" },
  done: { label: "Done", cls: "em-tag-green" },
};

function kindLabel(kind: string): string {
  return EMAIL_KIND[kind] ?? kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function Status({ value }: { value: string }) {
  const s = STATUS[value] ?? { label: value, cls: "" };
  return <span className={`em-tag ${s.cls}`}>{s.label}</span>;
}

function sendTitle(s: SendRow): string {
  if (s.kind === "setup") return s.subject?.trim() || "Account setup emails";
  return s.subject?.trim() || "No subject";
}

function counts(s: SendRow): string {
  const parts = [`${s.sent_count} sent`];
  if (s.failed_count) parts.push(`${s.failed_count} failed`);
  return `${parts.join(", ")} of ${s.recipient_count}`;
}

export default function HistoryTab({
  openSendId,
  onOpenSend,
}: {
  openSendId: string | null;
  onOpenSend: (sendId: string | null) => void;
}) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [view, setView] = useState<"sends" | "people">("sends");

  // By send
  const [sends, setSends] = useState<SendRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // One send
  const [detail, setDetail] = useState<{ send: SendRow; recipients: RecipientRow[] } | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);

  // By person
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [person, setPerson] = useState<{ info: PersonInfo; emails: PersonEmail[] } | null>(null);
  const [personError, setPersonError] = useState<string | null>(null);
  const searchSeq = useRef(0);

  const handleAuth = useCallback((status: number): boolean => {
    if (status === 401) { setAuthState("unauthorized"); return true; }
    if (status === 403) { setAuthState("forbidden"); return true; }
    return false;
  }, []);

  const loadSends = useCallback(async (before?: string) => {
    const qs = new URLSearchParams({ limit: String(PAGE) });
    if (before) qs.set("before", before);
    const r = await api<{ sends?: SendRow[] }>(`/api/admin/emails/sends?${qs}`);
    if (handleAuth(r.status)) return;
    if (!r.ok) {
      setListError(r.status === 0 ? OFFLINE : errorText(r.data, `Couldn't load the history (${r.status}).`));
      setAuthState((s) => (s === "loading" ? "ok" : s));
      return;
    }
    const rows = Array.isArray(r.data?.sends) ? r.data!.sends! : [];
    setSends((prev) => (before ? [...prev, ...rows] : rows));
    setMore(rows.length === PAGE);
    setListError(null);
    setAuthState("ok");
  }, [handleAuth]);

  const loadDetail = useCallback(async (id: string) => {
    const r = await api<{ send?: SendRow; recipients?: RecipientRow[] }>(`/api/admin/emails/sends/${encodeURIComponent(id)}`);
    if (handleAuth(r.status)) return;
    if (!r.ok || !r.data?.send) {
      setDetailError(r.status === 404 ? "This send wasn't found." : r.status === 0 ? OFFLINE : errorText(r.data, `Couldn't load this send (${r.status}).`));
      setAuthState((s) => (s === "loading" ? "ok" : s));
      return;
    }
    setDetail({ send: r.data.send, recipients: Array.isArray(r.data.recipients) ? r.data.recipients : [] });
    setDetailError(null);
    setAuthState("ok");
  }, [handleAuth]);

  useEffect(() => {
    // Initial load (and reload when coming back from a send). Only sets state after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!openSendId) loadSends();
  }, [openSendId, loadSends]);

  useEffect(() => {
    if (!openSendId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDetail(openSendId);
  }, [openSendId, loadDetail]);

  // Keep a running send's detail fresh until it finishes.
  const running = !!openSendId && detail?.send.id === openSendId && detail.send.status === "sending";
  useEffect(() => {
    if (!running || !openSendId) return;
    const t = setInterval(() => loadDetail(openSendId), POLL_MS);
    return () => clearInterval(t);
  }, [running, openSendId, loadDetail]);

  // People search (2+ characters, debounced).
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
        setPeopleError(r.status === 0 ? OFFLINE : errorText(r.data, `Search failed (${r.status}).`));
        setPeople([]);
        return;
      }
      setPeopleError(null);
      setPeople(Array.isArray(r.data?.people) ? r.data!.people! : []);
    }, 300);
    return () => clearTimeout(t);
  }, [query, handleAuth]);

  function onQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      searchSeq.current++;
      setPeople([]);
      setSearching(false);
      setPeopleError(null);
    }
  }

  async function openPerson(id: string) {
    setPersonError(null);
    const r = await api<{ person?: PersonInfo; emails?: PersonEmail[] }>(`/api/admin/emails/people/${encodeURIComponent(id)}/emails`);
    if (handleAuth(r.status)) return;
    if (!r.ok || !r.data?.person) {
      setPersonError(r.status === 0 ? OFFLINE : errorText(r.data, `Couldn't load this person's emails (${r.status}).`));
      return;
    }
    setPerson({ info: r.data.person, emails: Array.isArray(r.data.emails) ? r.data.emails : [] });
  }

  function openSend(id: string) {
    setDetail(null);
    setDetailError(null);
    setShowHtml(false);
    onOpenSend(id);
  }

  function closeSend() {
    setDetail(null);
    setDetailError(null);
    setShowHtml(false);
    setView("sends");
    onOpenSend(null);
  }

  if (authState === "unauthorized" || authState === "forbidden") {
    return <div className="em-wrap"><StateMsg state={authState} /></div>;
  }

  // ── one send ──────────────────────────────────────────────────────────────
  if (openSendId) {
    const s = detail?.send.id === openSendId ? detail.send : null;
    return (
      <div className="em-wrap">
        <button className="em-btn em-btn-ghost em-btn-small" onClick={closeSend} style={{ marginBottom: 16 }}>Back to history</button>
        {detailError ? (
          <div className="em-banner em-banner-err" role="alert">{detailError}</div>
        ) : !s || !detail ? (
          <div className="em-state"><div className="em-state-title">Loading</div></div>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span className={`em-tag ${SEND_KIND[s.kind]?.cls ?? ""}`}>{SEND_KIND[s.kind]?.label ?? s.kind}</span>
              <Status value={s.status} />
            </div>
            <div className="em-h2" style={{ marginTop: 10 }}>{sendTitle(s)}</div>
            <dl className="em-kv">
              <dt>Started</dt><dd>{when(s.created_at)}</dd>
              {s.finished_at && (<><dt>Finished</dt><dd>{when(s.finished_at)}</dd></>)}
              <dt>Sent by</dt><dd>{s.created_by_name || "Unknown"}</dd>
              {s.audience && AUDIENCE_LABEL[s.audience] && (<><dt>Audience</dt><dd>{AUDIENCE_LABEL[s.audience]}</dd></>)}
              <dt>Result</dt><dd>{counts(s)}</dd>
            </dl>
            {s.status === "sending" && (
              <div className="em-banner em-banner-info">
                Still sending. This page updates by itself.
                <div className="em-progress" aria-hidden="true">
                  <div style={{ width: `${s.recipient_count ? Math.round(((s.sent_count + s.failed_count) / s.recipient_count) * 100) : 0}%` }} />
                </div>
              </div>
            )}

            {s.html && (
              <div style={{ marginBottom: 18 }}>
                <button className="em-link" onClick={() => setShowHtml((v) => !v)}>
                  {showHtml ? "Hide the email" : "Show the email"}
                </button>
                {showHtml && (
                  <div className="em-preview" style={{ marginTop: 10 }}>
                    <div className="em-preview-head">
                      The HTML as written. Each person saw their own first name and the unsubscribe line under it.
                    </div>
                    {/* Admin typed HTML; sandbox="" blocks scripts, forms and navigation inside the frame. */}
                    <iframe title="Sent email" sandbox="" srcDoc={s.html} />
                  </div>
                )}
              </div>
            )}

            <span className="em-label">Recipients ({detail.recipients.length})</span>
            {detail.recipients.length === 0 ? (
              <div className="em-empty">No recipients were logged for this send.</div>
            ) : (
              detail.recipients.map((r, i) => (
                <div className="em-row" key={r.id ?? `${r.user_id}-${i}`}>
                  <div className="em-row-main">
                    <div className="em-row-title">{personName(r)}</div>
                    <div className="em-row-meta">
                      {r.email ?? "no email"}
                      {r.label ? ` · ${r.label}` : s.kind === "setup" ? ` · ${kindLabel(r.kind)}` : ""}
                      {r.error ? <> · <span style={{ color: "#ff6b6b" }}>{r.error}</span></> : null}
                    </div>
                  </div>
                  <div className="em-row-side">
                    <Status value={r.status} />
                    {r.sent_at && <div>{when(r.sent_at)}</div>}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    );
  }

  if (authState === "loading") {
    return <div className="em-wrap"><div className="em-state"><div className="em-state-title">Loading</div></div></div>;
  }

  return (
    <div className="em-wrap">
      <div className="em-sub">
        Every email Outsyde sends to customers, vendors, photographers and staff: announcements, tests, account setup,
        bookings, shoots, orders and staff emails. Internal alerts to the Outsyde inbox and password codes are not shown.
        Booking and order emails appear under By person.
      </div>

      <div className="em-seg" role="tablist" aria-label="History view">
        <button role="tab" aria-selected={view === "sends"} className={view === "sends" ? "on" : ""} onClick={() => setView("sends")}>By send</button>
        <button role="tab" aria-selected={view === "people"} className={view === "people" ? "on" : ""} onClick={() => setView("people")}>By person</button>
      </div>

      {view === "sends" ? (
        <>
          {listError && <div className="em-banner em-banner-err" role="alert">{listError}</div>}
          {sends.length === 0 && !listError ? (
            <div className="em-empty">Nothing has been sent from the admin pages yet.</div>
          ) : (
            sends.map((s) => (
              <div
                key={s.id}
                className="em-row click"
                role="button"
                tabIndex={0}
                onClick={() => openSend(s.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSend(s.id); } }}
              >
                <div className="em-row-main">
                  <div className="em-row-title">{sendTitle(s)}</div>
                  <div className="em-row-meta">
                    <span className={`em-tag ${SEND_KIND[s.kind]?.cls ?? ""}`}>{SEND_KIND[s.kind]?.label ?? s.kind}</span>
                    {s.status !== "done" && <Status value={s.status} />}
                    {when(s.created_at)}
                    {s.audience && AUDIENCE_LABEL[s.audience] ? ` · ${AUDIENCE_LABEL[s.audience]}` : ""}
                    {s.created_by_name ? ` · by ${s.created_by_name}` : ""}
                  </div>
                </div>
                <div className="em-row-side">
                  {counts(s)}
                </div>
              </div>
            ))
          )}
          {more && (
            <button
              className="em-btn em-btn-ghost"
              style={{ marginTop: 8 }}
              disabled={loadingMore}
              onClick={async () => {
                setLoadingMore(true);
                await loadSends(sends[sends.length - 1]?.created_at);
                setLoadingMore(false);
              }}
            >
              {loadingMore ? "Loading" : "Load older sends"}
            </button>
          )}
        </>
      ) : person ? (
        <>
          <button className="em-btn em-btn-ghost em-btn-small" onClick={() => setPerson(null)} style={{ marginBottom: 16 }}>Back to search</button>
          <div className="em-h2">{personName(person.info)}</div>
          <div className="em-row-meta" style={{ marginBottom: 16 }}>
            {person.info.email ?? "no email"}
            {person.info.unsubscribed && <> · <span className="em-tag em-tag-red">Unsubscribed from announcements</span></>}
            {" · "}
            {person.emails.length} {person.emails.length === 1 ? "email" : "emails"} logged
          </div>
          {person.emails.length === 0 ? (
            <div className="em-empty">No emails logged for this person yet.</div>
          ) : (
            person.emails.map((e, i) => (
              <div
                key={e.id ?? `${e.created_at}-${i}`}
                className={`em-row${e.send_id ? " click" : ""}`}
                role={e.send_id ? "button" : undefined}
                tabIndex={e.send_id ? 0 : undefined}
                onClick={() => e.send_id && openSend(e.send_id)}
                onKeyDown={(ev) => { if (e.send_id && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); openSend(e.send_id); } }}
              >
                <div className="em-row-main">
                  <div className="em-row-title">{e.subject?.trim() || kindLabel(e.kind)}</div>
                  <div className="em-row-meta">
                    <span className="em-tag">{kindLabel(e.kind)}</span>
                    {when(e.sent_at ?? e.created_at)}
                    {e.error ? <> · <span style={{ color: "#ff6b6b" }}>{e.error}</span></> : null}
                  </div>
                </div>
                <div className="em-row-side"><Status value={e.status} /></div>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          <input
            className="em-input"
            type="search"
            placeholder="Search by name, business, username or email"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            aria-label="Search people"
          />
          <div style={{ marginTop: 10 }}>
            {personError && <div className="em-banner em-banner-err" role="alert">{personError}</div>}
            {query.trim().length < 2 ? (
              <div className="em-hint">Type at least 2 letters to search.</div>
            ) : peopleError ? (
              <div className="em-banner em-banner-err">{peopleError}</div>
            ) : searching && people.length === 0 ? (
              <div className="em-hint">Searching</div>
            ) : people.length === 0 ? (
              <div className="em-empty">No accounts match.</div>
            ) : (
              people.map((p) => (
                <div
                  key={p.id}
                  className="em-row click"
                  role="button"
                  tabIndex={0}
                  onClick={() => openPerson(p.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPerson(p.id); } }}
                >
                  <div className="em-row-main">
                    <div className="em-row-title">{personName(p)}</div>
                    <div className="em-row-meta">
                      <span className="em-tag">{ROLE_LABEL[p.role] ?? p.role}</span>
                      {p.email ?? "no email"}
                      {p.unsubscribed ? " · unsubscribed from announcements" : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
