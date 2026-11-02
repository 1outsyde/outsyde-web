"use client";
/**
 * p5-safety Reports tab (Legend's calls W1, W2, W5): pending reports, most reported first, in two views.
 * Events: Pause, Release, Cancel and refund everyone, Dismiss, each with a reason (backend adminEventsRouter).
 * Posts: Remove post or Dismiss through the older admin moderation route (no audit row there, call W5).
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  EVENT_ACTION_CONFIRM,
  EVENT_ACTION_DONE,
  EVENT_ACTION_LABEL,
  POST_ACTION_CONFIRM,
  POST_ACTION_DONE,
  POST_ACTION_LABEL,
  eventActionPath,
  eventActionsFor,
  eventStatusText,
  moderationErrorText,
  postActionPath,
  readEventReports,
  readPostReports,
  reasonLabel,
  reportCountText,
  utcTime,
  type EventAction,
  type EventReport,
  type PostReport,
  type ReportReason,
} from "./_lib/moderation";
import { AuthScreen, NoticeBanner, Shell, StateScreen, whenLong, type Notice } from "./_ui/shared";
import { ModerationButton, postModeration, type ModTone, type SendResult } from "./_ui/moderation";

type View = "event" | "post";
type Auth = "ok" | "unauthorized" | "forbidden";

const EVENT_TONE: Record<EventAction, ModTone> = { pause: "gold", release: "green", cancel: "red", dismiss: "ghost" };

type ListResult<T> = { kind: "ok"; items: T[] } | { kind: "auth"; auth: "unauthorized" | "forbidden" } | { kind: "error"; text: string };

async function fetchReports<T>(type: View, read: (v: unknown) => T[]): Promise<ListResult<T>> {
  try {
    const res = await fetch(`/api/admin/events/reports?type=${type}`, { cache: "no-store" });
    if (res.status === 401) return { kind: "auth", auth: "unauthorized" };
    if (res.status === 403) return { kind: "auth", auth: "forbidden" };
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || !Array.isArray(body.items)) return { kind: "error", text: "Couldn't load reports. Try again in a moment." };
    return { kind: "ok", items: read(body.items) };
  } catch {
    return { kind: "error", text: "Couldn't reach the server. Check your connection and try again." };
  }
}

function Reasons({ reasons }: { reasons: ReportReason[] }) {
  return (
    <div className="aem-reasons">
      {reasons.map((r, i) => (
        <div className="aem-reason" key={`${r.at}:${i}`}>
          <div className="aem-reason-label">{reasonLabel(r)}</div>
          {r.note ? <div className="aem-reason-note">{r.note}</div> : null}
          <div className="aem-reason-who">{[r.reporter ? `@${r.reporter}` : "Deleted account", whenLong(utcTime(r.at))].filter(Boolean).join(" · ")}</div>
        </div>
      ))}
    </div>
  );
}

const looksLikeImage = (u: string | null) => !!u && /^https:\/\//.test(u) && !/\.(m3u8|mp4|mov)(\?|$)/i.test(u);

/** `top`: the Money / Reports tabs, drawn first inside the page. */
export default function ReportsClient({ onChanged, top }: { onChanged?: () => void; top?: ReactNode }) {
  const [auth, setAuth] = useState<Auth>("ok");
  const [view, setView] = useState<View>("event");
  const [events, setEvents] = useState<EventReport[] | null>(null);
  const [posts, setPosts] = useState<PostReport[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const seq = useRef(0);

  /** Apply one pair of results. Only the newest request may write state. */
  const apply = useCallback((my: number, ev: ListResult<EventReport>, po: ListResult<PostReport>) => {
    if (my !== seq.current) return;
    for (const r of [ev, po]) if (r.kind === "auth") { setAuth(r.auth); return; }
    setLoadError(ev.kind === "error" ? ev.text : po.kind === "error" ? po.text : null);
    if (ev.kind === "ok") setEvents(ev.items);
    if (po.kind === "ok") setPosts(po.items);
  }, []);

  const load = useCallback((): Promise<void> => {
    const my = ++seq.current;
    return Promise.all([fetchReports("event", readEventReports), fetchReports("post", readPostReports)]).then(([ev, po]) => apply(my, ev, po));
  }, [apply]);

  useEffect(() => {
    load();
  }, [load]);

  /** Send one action, then reload the list and tell the tab bar. null when the page took over (signed out). */
  async function send(url: string, body: unknown, done: string): Promise<SendResult | null> {
    setNotice(null);
    const r = await postModeration(url, body);
    if (r.ok === false && r.auth) { setAuth(r.auth); return null; }
    if (r.ok === false) return { ok: false, text: moderationErrorText(r.body, r.status) };
    await load();
    onChanged?.();
    setNotice({ kind: "ok", text: done });
    return { ok: true };
  }

  if (auth !== "ok") return <AuthScreen state={auth} returnTo="/admin/events#reports" top={top} />;
  if (events === null || posts === null) {
    if (loadError) {
      return (
        <StateScreen title="Couldn't load reports" top={top}>
          <div style={{ marginBottom: 12 }}>{loadError}</div>
          <button type="button" className="aem-btn aem-btn-gold aem-btn-md" onClick={() => { setLoadError(null); void load(); }}>Retry</button>
        </StateScreen>
      );
    }
    return <StateScreen title="Loading…" top={top} />;
  }

  return (
    <Shell top={top}>
      <div className="aem-head">
        <div>
          <h1 className="aem-h1">Reports</h1>
          <div className="aem-sub">What people reported, most reported first. Nothing happens to an event or post until you act.</div>
        </div>
        <div className="aem-switch" role="group" aria-label="Show reports for">
          <button type="button" aria-pressed={view === "event"} onClick={() => setView("event")}>Events · {events.length}</button>
          <button type="button" aria-pressed={view === "post"} onClick={() => setView("post")}>Posts · {posts.length}</button>
        </div>
      </div>

      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      {loadError ? <NoticeBanner notice={{ kind: "error", text: loadError }} onClose={() => setLoadError(null)} /> : null}

      {view === "event" ? (
        events.length === 0 ? <div className="aem-none" data-testid="aem-reports-empty">No event reports waiting.</div> : (
          <div className="aem-reps" data-testid="aem-event-reports">
            {events.map((r) => {
              const host = r.host.username ? `@${r.host.username}` : (r.host.firstName ?? "Host");
              return (
                <div className="aem-rep" key={r.eventId} data-report-event={r.eventId}>
                  <div className="aem-rep-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="aem-rep-title">{r.title}</div>
                      <div className="aem-rep-meta">{[`Host ${host}`, eventStatusText(r.status), r.startsAt ? whenLong(r.startsAt) : null].filter(Boolean).join(" · ")}</div>
                    </div>
                    <span className="aem-rep-count">{reportCountText(r.reportCount)}</span>
                  </div>
                  <Reasons reasons={r.reasons} />
                  <div className="aem-actions">
                    {eventActionsFor(r.status, r.reportCount).map((a) => (
                      <ModerationButton
                        key={a}
                        label={EVENT_ACTION_LABEL[a]}
                        tone={EVENT_TONE[a]}
                        confirm={EVENT_ACTION_CONFIRM[a]}
                        testId={`aem-act-${a}`}
                        onSend={(reason) => send(eventActionPath(a, r.eventId), { reason }, EVENT_ACTION_DONE[a])}
                      />
                    ))}
                    <Link href={`/admin/events/${encodeURIComponent(r.eventId)}`} className="aem-btn aem-btn-ghost">View event</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : posts.length === 0 ? <div className="aem-none" data-testid="aem-reports-empty">No post reports waiting.</div> : (
        <div className="aem-reps" data-testid="aem-post-reports">
          {posts.map((p) => (
            <div className="aem-rep" key={p.postId} data-report-post={p.postId}>
              <div className="aem-rep-top">
                <div style={{ minWidth: 0 }}>
                  <div className="aem-rep-title">Post by {p.author.username ? `@${p.author.username}` : "a deleted account"}</div>
                  <div className="aem-rep-meta">{[p.active ? "Showing in feeds" : "Already removed", `Last report ${whenLong(p.lastAt)}`].join(" · ")}</div>
                </div>
                <span className="aem-rep-count">{reportCountText(p.reportCount)}</span>
              </div>
              <div className="aem-post-body">
                {looksLikeImage(p.mediaUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- plain <img> like the rest of the admin pages; posts come from many hosts
                  <img className="aem-thumb" src={p.mediaUrl as string} alt="" />
                ) : null}
                <div className="aem-post-text">{p.content?.trim() ? p.content : "No caption."}</div>
              </div>
              <Reasons reasons={p.reasons} />
              <div className="aem-actions">
                {(p.active ? (["remove", "dismiss"] as const) : (["dismiss"] as const)).map((a) => (
                  <ModerationButton
                    key={a}
                    label={POST_ACTION_LABEL[a]}
                    tone={a === "remove" ? "red" : "ghost"}
                    confirm={POST_ACTION_CONFIRM[a]}
                    testId={`aem-post-${a}`}
                    onSend={(reason) => send(postActionPath(p.postId), { action: a, reason }, POST_ACTION_DONE[a])}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
