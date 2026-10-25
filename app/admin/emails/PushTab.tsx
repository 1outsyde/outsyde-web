"use client";

// Admin → Emails → Push (?tab=push).
// Legend writes a push notification for the Outsyde app: picks who gets it, a title, a message and the
// app screen it opens when tapped, checks the lock screen preview, sends a test to his own phone, then
// sends for real. The backend (outsyde-backend #368, server/routes/pushAdmin.ts) only pushes to people
// who allowed notifications on their phone and didn't turn off "Outsyde news and offers", never to
// admin, demo, disabled or deleted accounts, once per phone, and writes an Activity row for each account.
// Limits: 3 sends per New York day (tests don't count), one send at a time, the same text can't go out
// twice within 10 minutes. Before 9 AM and from 9 PM in New York the page warns before sending.
//
// BFFs: GET /api/admin/push/audiences, /screens, /limits, /people?q=, POST /api/admin/push/test,
// POST /api/admin/push/sends, GET /api/admin/push/sends/:id.
// Copy follows the house style: plain punctuation, no dashes.

import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIENCE_LABEL, OFFLINE, ROLE_LABEL, StateMsg, api, errorText, type AuthState } from "./shared";

type Audience = "picked" | "vendors" | "photographers" | "consumers" | "all";
type Counts = Record<Exclude<Audience, "picked">, number>;
interface Screen { key: string; label: string; fit: string }
interface ScreensData { screens: Screen[]; byAudience: Record<Audience, string[]>; defaultScreen: string; maxTitle: number; maxBody: number }
interface Limits { sentToday: number; max: number; remaining: number; quietHours: boolean; nowNewYork: string }
interface PushPerson { id: string; name: string | null; username: string | null; role: string; hasToken: boolean; newsOptOut: boolean; canPush: boolean }
interface SendState { id: string; status: string; recipients: number; sent: number; failed: number; skipped: number }

const AUDIENCES: Audience[] = ["picked", "vendors", "photographers", "consumers", "all"];
const MAX_PICKED = 500; // backend MAX_PICKED (server/push/pushAudience.ts)
const POLL_MS = 1500;

const PUSH_CSS = `
  .pu-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 28px; align-items: start; }
  .pu-count { font-size: 11.5px; color: rgba(245,240,230,0.45); float: right; font-variant-numeric: tabular-nums; letter-spacing: 0; text-transform: none; }
  .pu-count.over { color: #ff6b6b; }
  .pu-msg { min-height: 90px; font-family: inherit; font-size: 14px; line-height: 1.5; }
  .pu-select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, rgba(245,240,230,0.6) 50%), linear-gradient(135deg, rgba(245,240,230,0.6) 50%, transparent 50%); background-position: calc(100% - 18px) 55%, calc(100% - 13px) 55%; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 34px; }
  .pu-select option { background: #111; color: #F5F0E6; }
  .pu-phone { position: sticky; top: 16px; border-radius: 34px; border: 1px solid rgba(245,240,230,0.14); background: radial-gradient(120% 70% at 30% 10%, #3a2c0c 0%, #0d0b07 62%); padding: 40px 12px 22px; min-height: 420px; }
  .pu-clock { font-size: 52px; font-weight: 600; color: #F5F0E6; text-align: center; line-height: 1; font-variant-numeric: tabular-nums; }
  .pu-date { font-size: 13px; color: rgba(245,240,230,0.72); text-align: center; margin: 6px 0 22px; }
  .pu-note { background: rgba(40,36,28,0.9); border-radius: 16px; padding: 10px 12px; display: grid; grid-template-columns: 30px 1fr; gap: 10px; }
  .pu-ic { width: 30px; height: 30px; border-radius: 8px; background: #000; display: grid; place-items: center; font-family: 'Bebas Neue', sans-serif; color: #E8B930; font-size: 15px; }
  .pu-top { display: flex; justify-content: space-between; font-size: 11px; color: rgba(245,240,230,0.55); letter-spacing: 0.04em; }
  .pu-tt { font-weight: 600; font-size: 13.5px; color: #F5F0E6; overflow-wrap: anywhere; margin-top: 1px; }
  .pu-bd { font-size: 13px; color: rgba(245,240,230,0.9); overflow-wrap: anywhere; line-height: 1.4; margin-top: 1px; }
  .pu-empty { color: rgba(245,240,230,0.4); font-style: italic; }
  .pu-tap { font-size: 12px; color: rgba(245,240,230,0.6); text-align: center; margin-top: 14px; line-height: 1.5; overflow-wrap: anywhere; }
  .pu-tap b { color: #E8B930; font-weight: 600; }
  .pu-warn { color: #E8B930; display: block; margin-top: 4px; }
  @media (max-width: 1023px) {
    .pu-grid { grid-template-columns: 1fr; }
    .pu-phone { position: static; max-width: 320px; margin: 0 auto; min-height: 0; }
  }
`;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function newKey(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* fall through */ }
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function pushWhyNot(p: PushPerson): string {
  if (p.newsOptOut) return "Turned off Outsyde news and offers";
  if (!p.hasToken) return "Hasn't allowed notifications on a phone";
  return "Can't get pushes (disabled, demo or admin account)";
}

function pName(p: { name?: string | null; username?: string | null }): string {
  return p.name?.trim() || (p.username ? `@${p.username}` : "Unknown account");
}

const PHONE_DATE = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" });
const PHONE_TIME = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true });

function quietLine(nowNewYork: string): string {
  const pm = /PM/i.test(nowNewYork);
  return pm
    ? `It is after 9 PM in New York (${nowNewYork}). People may be asleep.`
    : `It is before 9 AM in New York (${nowNewYork}). People may be asleep.`;
}

export default function PushTab({ onOpenSend }: { onOpenSend: (sendId: string) => void }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [screens, setScreens] = useState<ScreensData | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);

  const [audience, setAudience] = useState<Audience | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PushPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Map<string, PushPerson>>(new Map());

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [screen, setScreen] = useState("activity");
  const [url, setUrl] = useState("");

  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [send, setSend] = useState<SendState | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const searchSeq = useRef(0);
  // One key per composed push, kept on retry so a lost answer can't start a second send.
  const clientKey = useRef<string>("");

  const handleAuth = useCallback((status: number): boolean => {
    if (status === 401) { setAuthState("unauthorized"); return true; }
    if (status === 403) { setAuthState("forbidden"); return true; }
    return false;
  }, []);

  const loadLimits = useCallback(async () => {
    const l = await api<Limits>("/api/admin/push/limits");
    if (handleAuth(l.status)) return;
    if (l.ok && l.data) setLimits({ sentToday: Number(l.data.sentToday) || 0, max: Number(l.data.max) || 3, remaining: Number(l.data.remaining) || 0, quietHours: !!l.data.quietHours, nowNewYork: String(l.data.nowNewYork ?? "") });
  }, [handleAuth]);

  const loadMeta = useCallback(async () => {
    const [a, s, l] = await Promise.all([
      api<{ counts?: Counts }>("/api/admin/push/audiences"),
      api<ScreensData>("/api/admin/push/screens"),
      api<Limits>("/api/admin/push/limits"),
    ]);
    if (handleAuth(a.status) || handleAuth(s.status) || handleAuth(l.status)) return;
    const bad = [a, s, l].find((x) => !x.ok);
    if (bad) {
      setLoadError(bad.status === 0 ? OFFLINE : errorText(bad.data, `Couldn't load the push page (${bad.status}).`));
      return;
    }
    setCounts(a.data?.counts ?? null);
    setScreens(s.data ?? null);
    if (l.data) setLimits({ sentToday: Number(l.data.sentToday) || 0, max: Number(l.data.max) || 3, remaining: Number(l.data.remaining) || 0, quietHours: !!l.data.quietHours, nowNewYork: String(l.data.nowNewYork ?? "") });
    setLoadError(null);
    setAuthState("ok");
  }, [handleAuth]);

  useEffect(() => {
    // Initial load; loadMeta only sets state after the requests finish.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMeta();
    clientKey.current = newKey();
  }, [loadMeta]);

  useEffect(() => {
    // Lock screen clock in the preview (client only, so the server render never differs).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // People search for "Picked people" (2+ characters, debounced).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await api<{ people?: PushPerson[] }>(`/api/admin/push/people?q=${encodeURIComponent(q)}`);
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

  // Follow a running send until the backend marks it done.
  const sendId = send?.id ?? null;
  const sendRunning = send?.status === "sending";
  useEffect(() => {
    if (!sendId || !sendRunning) return;
    let stopped = false;
    const tick = async () => {
      const r = await api<{ send?: { status: string; recipientCount: number; sentCount: number; failedCount: number; skippedCount: number } }>(
        `/api/admin/push/sends/${encodeURIComponent(sendId)}`,
      );
      if (stopped || !r.ok || !r.data?.send) return;
      const s = r.data.send;
      setSend((prev) =>
        prev && prev.id === sendId
          ? { ...prev, status: s.status, recipients: Number(s.recipientCount) || prev.recipients, sent: Number(s.sentCount) || 0, failed: Number(s.failedCount) || 0, skipped: Number(s.skippedCount) || 0 }
          : prev,
      );
      if (s.status !== "sending") loadLimits();
    };
    const timer = setInterval(tick, POLL_MS);
    tick();
    return () => { stopped = true; clearInterval(timer); };
  }, [sendId, sendRunning, loadLimits]);

  /** Any change to what would be sent: new key, and leave the confirm step. */
  function edited() {
    clientKey.current = newKey();
    setConfirming(false);
  }

  const maxTitle = screens?.maxTitle ?? 65;
  const maxBody = screens?.maxBody ?? 178;
  const allowed = screens ? screens.screens.filter((s) => (screens.byAudience[audience ?? "picked"] ?? []).includes(s.key)) : [];
  const screenLabel = screens?.screens.find((s) => s.key === screen)?.label ?? "Activity";

  function pickAudience(a: Audience) {
    setAudience(a);
    // A screen that doesn't fit the new group goes back to Activity.
    if (screens && !(screens.byAudience[a] ?? []).includes(screen)) setScreen(screens.defaultScreen || "activity");
    edited();
  }

  function togglePerson(p: PushPerson) {
    if (!p.canPush) return;
    edited();
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

  const titleTrim = title.trim();
  const bodyTrim = body.trim();
  const urlTrim = url.trim();
  const recipients = audience === "picked" ? picked.size : audience && counts ? counts[audience] : 0;
  const contentError =
    !titleTrim ? "Add a title."
      : titleTrim.length > maxTitle ? `Keep the title to ${maxTitle} characters.`
        : !bodyTrim ? "Add a message."
          : bodyTrim.length > maxBody ? `Keep the message to ${maxBody} characters.`
            : screen === "link" && !/^https:\/\/(www\.)?goutsyde\.com(\/|$|\?|#)/i.test(urlTrim) ? "The link must start with https://goutsyde.com."
              : null;
  const sendBlocker =
    contentError ??
    (!audience ? "Pick who to send to."
      : recipients === 0 ? (audience === "picked" ? "Tick at least one person." : "Nobody in this group can get a push right now.")
        : limits && limits.remaining < 1 ? `You've sent ${limits.max} pushes today. Send it tomorrow.`
          : null);
  const locked = busy !== null || sendRunning;

  function target() {
    return screen === "link" ? { screen, url: urlTrim } : { screen };
  }

  async function sendTest() {
    if (contentError) return;
    setBusy("test");
    setNotice(null);
    const r = await api<{ status?: string; error?: string | null }>("/api/admin/push/test", { method: "POST", body: { title: titleTrim, body: bodyTrim, ...target() } });
    setBusy(null);
    if (handleAuth(r.status)) return;
    if (!r.ok) {
      setNotice({ kind: "err", text: r.status === 0 ? OFFLINE : errorText(r.data, `The test didn't send (${r.status}).`) });
    } else if (r.data?.status !== "sent") {
      setNotice({ kind: "err", text: `Expo didn't take the test push${r.data?.error ? ` (${r.data.error})` : ""}. Open the app on your phone and try again.` });
    } else {
      setNotice({ kind: "ok", text: "Test sent to your phone. Tap it to check the screen it opens." });
    }
  }

  async function sendAll() {
    if (sendBlocker || !audience) return;
    setBusy("send");
    setNotice(null);
    const payload = {
      audience,
      ...(audience === "picked" ? { userIds: Array.from(picked.keys()) } : {}),
      title: titleTrim,
      body: bodyTrim,
      ...target(),
      clientKey: clientKey.current,
    };
    const r = await api<{ sendId?: string; recipients?: number; existing?: boolean }>("/api/admin/push/sends", { method: "POST", body: payload });
    setBusy(null);
    setConfirming(false);
    if (handleAuth(r.status)) return;
    if (!r.ok || !r.data?.sendId) {
      // 409 SEND_IN_PROGRESS / DUPLICATE_SEND, 429 OVER_DAILY_LIMIT, 400 NO_RECIPIENTS carry a readable message.
      setNotice({
        kind: "err",
        text: r.status === 0
          ? "Couldn't reach the server. Press send again: the same push can't go out twice."
          : errorText(r.data, `The push didn't start (${r.status}).`),
      });
      loadLimits();
      return;
    }
    setSend({ id: r.data.sendId, status: "sending", recipients: Number(r.data.recipients) || recipients, sent: 0, failed: 0, skipped: 0 });
    clientKey.current = newKey();
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
  const progress = send && send.recipients > 0 ? Math.min(100, Math.round(((send.sent + send.failed + send.skipped) / send.recipients) * 100)) : 0;

  return (
    <div className="em-wrap">
      <style dangerouslySetInnerHTML={{ __html: PUSH_CSS }} />
      <div className="em-sub">
        Send a push notification to the Outsyde app. It only reaches people who allowed notifications on their phone and
        kept Outsyde news and offers on. Admin, demo and disabled accounts are always skipped. Everyone who gets it also
        finds it in Activity. Send a test to your phone first.
      </div>

      {notice && <div className={`em-banner ${notice.kind === "ok" ? "em-banner-ok" : "em-banner-err"}`} role="status">{notice.text}</div>}

      {send && (
        <div className={`em-banner ${done ? (send.failed > 0 ? "em-banner-err" : "em-banner-ok") : "em-banner-info"}`} role="status">
          {done
            ? `Done. ${send.sent} sent${send.failed ? `, ${send.failed} failed` : ""}${send.skipped ? `, ${send.skipped} skipped` : ""} out of ${send.recipients}.`
            : `Sending: ${send.sent + send.failed + send.skipped} of ${send.recipients}. You can leave this page, it keeps going.`}
          <div className="em-progress" aria-hidden="true"><div style={{ width: `${done ? 100 : progress}%` }} /></div>
          <div style={{ marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button className="em-link" onClick={() => onOpenSend(send.id)}>Open in History</button>
            {done && <button className="em-link" onClick={() => setSend(null)}>Dismiss</button>}
          </div>
        </div>
      )}

      <div className="pu-grid">
        <div style={{ minWidth: 0 }}>
          <span className="em-label" style={{ marginTop: 0 }}>Send to</span>
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
                id="pu-search"
                className="em-input"
                type="search"
                placeholder="Search by name, business or username"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                aria-label="Search people"
              />
              {picked.size > 0 && (
                <div className="em-chips">
                  {Array.from(picked.values()).map((p) => (
                    <span className="em-chip" key={p.id}>
                      <span>{pName(p)}</span>
                      <button aria-label={`Remove ${pName(p)}`} onClick={() => togglePerson(p)} disabled={locked}>×</button>
                    </span>
                  ))}
                  <button className="em-link" onClick={() => { edited(); setPicked(new Map()); }} disabled={locked}>Clear all</button>
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
                      <label key={p.id} className={`em-row${on ? " on" : ""}${p.canPush ? " click" : " off"}`}>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!p.canPush || locked}
                          onChange={() => togglePerson(p)}
                          aria-label={`Tick ${pName(p)}`}
                        />
                        <div className="em-row-main">
                          <div className="em-row-title">{pName(p)}</div>
                          <div className="em-row-meta">
                            <span className="em-tag">{ROLE_LABEL[p.role] ?? p.role}</span>
                            {p.username ? `@${p.username}` : ""}
                            {!p.canPush && <> · <span style={{ color: "#ff6b6b" }}>{pushWhyNot(p)}</span></>}
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

          <label className="em-label" htmlFor="pu-title">
            Title <span className={`pu-count${titleTrim.length > maxTitle ? " over" : ""}`}>{titleTrim.length} / {maxTitle}</span>
          </label>
          <input
            id="pu-title"
            className="em-input"
            value={title}
            maxLength={maxTitle + 20}
            onChange={(e) => { setTitle(e.target.value.replace(/[\r\n]/g, " ")); edited(); }}
            placeholder="Your Outsyde partner kit is ready"
            disabled={locked}
          />

          <label className="em-label" htmlFor="pu-body">
            Message <span className={`pu-count${bodyTrim.length > maxBody ? " over" : ""}`}>{bodyTrim.length} / {maxBody}</span>
          </label>
          <textarea
            id="pu-body"
            className="em-textarea pu-msg"
            value={body}
            maxLength={maxBody + 40}
            onChange={(e) => { setBody(e.target.value); edited(); }}
            placeholder="Tap to see your new flyers and QR codes."
            disabled={locked}
          />

          <label className="em-label" htmlFor="pu-screen">When tapped, open</label>
          <select
            id="pu-screen"
            className="em-input pu-select"
            value={screen}
            onChange={(e) => { setScreen(e.target.value); edited(); }}
            disabled={locked}
          >
            {allowed.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <div className="em-hint">
            {audience
              ? "Only screens that fit this group are listed. If someone can't open it, the app opens Activity instead."
              : "Pick who to send to first. Business, photographer and staff screens only show for those groups."}{" "}
            People on an older version of the app just open the app.
          </div>

          {screen === "link" && (
            <>
              <label className="em-label" htmlFor="pu-url">Link</label>
              <input
                id="pu-url"
                className="em-input"
                type="url"
                inputMode="url"
                value={url}
                maxLength={500}
                onChange={(e) => { setUrl(e.target.value); edited(); }}
                placeholder="https://goutsyde.com/events"
                disabled={locked}
              />
              <div className="em-hint">Opens inside the app. Only goutsyde.com links.</div>
            </>
          )}
        </div>

        <div aria-label="Preview of the push on a lock screen">
          <span className="em-label" style={{ marginTop: 0 }}>Preview</span>
          <div className="pu-phone">
            <div className="pu-clock">{now ? PHONE_TIME.format(now).replace(/\s?[AP]M$/i, "") : ""}</div>
            <div className="pu-date">{now ? PHONE_DATE.format(now) : ""}</div>
            <div className="pu-note">
              <div className="pu-ic" aria-hidden="true">O</div>
              <div style={{ minWidth: 0 }}>
                <div className="pu-top"><span>OUTSYDE</span><span>now</span></div>
                <div className={`pu-tt${titleTrim ? "" : " pu-empty"}`}>{titleTrim || "Your title"}</div>
                <div className={`pu-bd${bodyTrim ? "" : " pu-empty"}`}>{bodyTrim || "Your message"}</div>
              </div>
            </div>
            <div className="pu-tap">
              Tapping opens <b>{screen === "link" ? (urlTrim || "your link") : screenLabel}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="em-bar">
        <div className="em-bar-text">
          {confirming ? (
            <span className="em-confirm">
              Push to {plural(recipients, "person", "people")} ({AUDIENCE_LABEL[audience ?? "all"]}), opening {screen === "link" ? "your link" : screenLabel}? This can&apos;t be undone.
              {limits?.quietHours && <span className="pu-warn">{quietLine(limits.nowNewYork)}</span>}
            </span>
          ) : (
            <>
              {limits ? `${limits.remaining} of ${limits.max} sends left today.` : ""}
              {limits?.quietHours && <div style={{ color: "#E8B930", fontSize: 12.5, marginTop: 2 }}>{quietLine(limits.nowNewYork)}</div>}
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
                {busy === "send" ? "Starting" : limits?.quietHours ? "Send anyway" : `Yes, send ${recipients}`}
              </button>
            </>
          ) : (
            <>
              <button className="em-btn em-btn-ghost" onClick={sendTest} disabled={!!contentError || locked}>
                {busy === "test" ? "Sending test" : "Send test to my phone"}
              </button>
              <button
                className="em-btn em-btn-gold"
                onClick={() => { setNotice(null); loadLimits(); setConfirming(true); }}
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
