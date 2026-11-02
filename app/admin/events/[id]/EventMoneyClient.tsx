"use client";
/**
 * One event's money for admins: header, host card, tiles, ticket types, orders, refunds after
 * payout (with Mark collected and Write off on owed rows), the payout card (Try again and Email the
 * host by payout status) and activity, newest first. Data comes from GET /api/admin/events/:id.
 * p5-safety (W3, W4, W7): a Safety box (pending reports, Pause, Release, Cancel and refund everyone, Dismiss) and,
 * for a personal host, the Trusted host switch in the host card.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { payoutPill, shortDate, teamPayoutPill, usd, type AdminEventHost, type AdminEventPayout, type AdminEventRow, type AdminTeamPayout } from "../_lib/money";
import {
  ACTION_DONE,
  ActionGroup,
  AuthScreen,
  canEmailHost,
  NoticeBanner,
  Shell,
  StateScreen,
  dayLong,
  holdText,
  hostKind,
  hostLabel,
  initialOf,
  place,
  plural,
  runAction,
  setupText,
  statusLabel,
  timeOnly,
  whenLong,
  type ActionKind,
  type Notice,
} from "../_ui/shared";
import {
  EVENT_ACTION_CONFIRM,
  EVENT_ACTION_DONE,
  EVENT_ACTION_LABEL,
  eventActionPath,
  eventActionsFor,
  moderationErrorText,
  readModeration,
  trustPath,
  trustState,
  type EventAction,
} from "../_lib/moderation";
import { ModerationButton, postModeration, type ModTone, type SendResult } from "../_ui/moderation";

const EVENT_TONE: Record<EventAction, ModTone> = { pause: "gold", release: "green", cancel: "red", dismiss: "ghost" };

interface TicketTypeRow {
  ticketTypeId: string;
  name: string;
  priceCents: number;
  archived: boolean;
  sold: number;
  valid: number;
  refunded: number;
  salesCents: number;
  refundedCents: number;
  hostEarnsCents: number;
  outsydeFeesCents: number;
}

interface PayoutDetail extends AdminEventPayout {
  destinationType: string | null;
  connectedAccount: string | null;
  nextAttemptAt: string | null;
  transferId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Recovery {
  id: string;
  ticketTypeName: string | null;
  payoutId: string;
  amountCents: number;
  status: string;
  connectedAccount: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByUsername: string | null;
  owedOver30Days: boolean;
}

interface Activity {
  at: string;
  kind: string;
  text: string;
}

interface Detail {
  event: AdminEventRow;
  ticketTypes: TicketTypeRow[];
  orders: { completed: number; refunded: number; refunding: number; flagged: number };
  checkIns: { checkedIn: number; validTickets: number };
  payout: PayoutDetail | null;
  recoveries: Recovery[];
  /** p4-team 4b-2: each team member's pay (older backends send none). */
  teamPayouts?: AdminTeamPayout[];
  host: AdminEventHost & { connectedAccount?: string | null };
  activity: Activity[];
  /** p5-safety (additive): pending reports and the host's new host limit state; older backends send none. */
  moderation?: unknown;
}

type Auth = "loading" | "ok" | "unauthorized" | "forbidden" | "notfound";

const RECOVERY_STATUS: Record<string, { text: string; tone: string }> = {
  pending: { text: "Taking it back", tone: "gold" },
  reversed: { text: "Taken back", tone: "green" },
  owed: { text: "Owed", tone: "red" },
  recovered: { text: "Taken from a later payout", tone: "green" },
  collected: { text: "Marked collected", tone: "green" },
  written_off: { text: "Written off", tone: "grey" },
};

type DetailResult =
  | { kind: "ok"; data: Detail & { now: Date } }
  | { kind: "auth"; auth: "unauthorized" | "forbidden" | "notfound" }
  | { kind: "error"; text: string };

/** GET one event through the BFF. Never throws, never touches React state. */
async function fetchDetail(id: string): Promise<DetailResult> {
  try {
    const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (res.status === 401) return { kind: "auth", auth: "unauthorized" };
    if (res.status === 403) return { kind: "auth", auth: "forbidden" };
    if (res.status === 404) return { kind: "auth", auth: "notfound" };
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.event) return { kind: "error", text: "Couldn't load this event. Try again in a moment." };
    return { kind: "ok", data: { ...(body as Detail), now: new Date() } };
  } catch {
    return { kind: "error", text: "Couldn't reach the server. Check your connection and try again." };
  }
}

export default function EventMoneyClient({ id }: { id: string }) {
  const [auth, setAuth] = useState<Auth>("loading");
  const [data, setData] = useState<(Detail & { now: Date }) | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** The moderation action being sent: the other moderation buttons wait (one at a time). */
  const [modBusy, setModBusy] = useState<string | null>(null);
  const reqSeq = useRef(0);

  /** Apply one fetch result. Only the newest request may write state. */
  const apply = useCallback((my: number, r: DetailResult) => {
    if (my !== reqSeq.current) return;
    if (r.kind === "auth") { setAuth(r.auth); return; }
    if (r.kind === "error") { setLoadError(r.text); return; }
    setData(r.data);
    setLoadError(null);
    setAuth("ok");
  }, []);

  const load = useCallback((): Promise<void> => {
    const my = ++reqSeq.current;
    return fetchDetail(id).then((r) => apply(my, r));
  }, [id, apply]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmAction(kind: ActionKind, targetId: string) {
    setBusy(true);
    setNotice(null);
    const r = await runAction(kind, targetId);
    if (r.ok === false && r.auth) {
      setBusy(false);
      setAuth(r.auth);
      return;
    }
    await load();
    setConfirmKey(null);
    setBusy(false);
    setNotice(r.ok ? { kind: "ok", text: ACTION_DONE[kind] } : { kind: "error", text: r.text });
  }

  const returnTo = `/admin/events/${encodeURIComponent(id)}`;
  if (auth === "unauthorized" || auth === "forbidden") return <AuthScreen state={auth} returnTo={returnTo} />;
  if (auth === "notfound") {
    return (
      <StateScreen title="Event not found">
        <Link href="/admin/events" className="aem-link">Back to all events</Link>
      </StateScreen>
    );
  }
  if (loadError && !data) {
    return (
      <StateScreen title="Couldn't load this event">
        <div style={{ marginBottom: 12 }}>{loadError}</div>
        <button type="button" className="aem-btn aem-btn-gold aem-btn-md" onClick={() => { setLoadError(null); load(); }}>Retry</button>
      </StateScreen>
    );
  }
  if (!data) return <StateScreen title="Loading…" />;

  const { event: e, ticketTypes, orders, checkIns, payout, recoveries, host, now } = data;
  const teamPayouts = Array.isArray(data.teamPayouts) ? data.teamPayouts : [];
  const activity = [...data.activity].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const pill = payoutPill(e, now);
  const setup = setupText(host.payoutSetup);
  const account = host.connectedAccount ?? payout?.connectedAccount ?? null;
  const ended = statusLabel(e, now);
  const metaLine = [
    `${whenLong(e.startsAt)}${e.endsAt ? ` to ${timeOnly(e.endsAt)}` : ""}`,
    place(e),
  ].filter(Boolean).join(" · ");
  const left = e.capacity != null ? Math.max(0, e.capacity - e.ticketsValid) : null;

  const tiles = [
    { label: "Ticket sales", value: usd(e.salesCents), hint: plural(e.ticketsSold, "ticket") },
    { label: "Refunded", value: usd(e.refundedCents), hint: `${plural(e.ticketsRefunded, "ticket")}, ticket price only` },
    { label: "Host earns", value: usd(e.hostEarnsCents), hint: `For ${plural(e.ticketsValid, "valid ticket")}` },
    { label: "Outsyde fees", value: usd(e.outsydeFeesCents), hint: "Service fees plus host fee" },
    {
      label: "Capacity",
      value: e.capacity != null ? `${e.ticketsValid} / ${e.capacity}` : String(e.ticketsValid),
      hint: left != null ? `${left} left unsold` : "No limit",
    },
  ];

  const tt = ticketTypes.reduce(
    (a, t) => ({ sold: a.sold + t.sold, sales: a.sales + t.salesCents, refunded: a.refunded + t.refundedCents, host: a.host + t.hostEarnsCents }),
    { sold: 0, sales: 0, refunded: 0, host: 0 },
  );

  const moderation = readModeration(data.moderation);
  const trust = trustState(moderation);
  const pendingReports = moderation?.pendingReports ?? 0;
  const modActions = moderation ? eventActionsFor(e.status, pendingReports) : [];

  /** One moderation request, then reload with a notice. null when the page took over (signed out). */
  async function sendModeration(url: string, body: unknown, done: string): Promise<SendResult | null> {
    setNotice(null);
    const r = await postModeration(url, body);
    if (r.ok === false && r.auth) { setAuth(r.auth); return null; }
    if (r.ok === false) return { ok: false, text: moderationErrorText(r.body, r.status) };
    await load();
    setNotice({ kind: "ok", text: done });
    return { ok: true };
  }

  const ask = (k: string) => { setNotice(null); setConfirmKey(k); };
  const cancel = () => setConfirmKey(null);
  const payoutBad = e.status !== "cancelled" && (payout?.status === "review" || payout?.status === "held");

  return (
    <Shell>
      <Link href="/admin/events" className="aem-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        All events
      </Link>

      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      {loadError ? <NoticeBanner notice={{ kind: "error", text: loadError }} onClose={() => setLoadError(null)} /> : null}

      <div className="aem-ev-head">
        <div className="aem-ev-id">
          <div className="aem-cover" aria-hidden="true">{initialOf(e.title)}</div>
          <div style={{ minWidth: 0 }}>
            <h1 className="aem-ev-title">{e.title}</h1>
            <div className="aem-ev-meta">{metaLine}</div>
            <div className="aem-pills">
              <span className="aem-pill aem-pill-grey">{ended}</span>
              <span className={`aem-pill aem-pill-${pill.tone}`} data-testid="aem-payout-pill">{pill.text}</span>
              {e.status === "paused"
                ? <span className="aem-muted" style={{ fontSize: 13 }} data-testid="aem-public-hidden">Public page hidden while on hold</span>
                : e.status !== "draft" && e.slug ? <Link href={`/e/${encodeURIComponent(e.slug)}`} className="aem-link" style={{ fontSize: 13 }}>View public page</Link> : null}
            </div>
          </div>
        </div>
        <div className="aem-card aem-host" data-testid="aem-host-card">
          <div className="aem-tile-label">Host</div>
          <div className="aem-host-row">
            <span className="aem-avatar" aria-hidden="true">{host.type === "user" ? "@" : initialOf(host.name)}</span>
            <span style={{ fontWeight: 700 }}>{hostLabel(host)}</span>
            <span className="aem-kind">{hostKind(host)}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(245,240,230,0.55)" }}>
            {[host.ownerUsername ? `Owner @${host.ownerUsername}` : null, account ? `Stripe account ${account}` : "No Stripe account yet"].filter(Boolean).join(" · ")}
          </div>
          <div className={setup.ok ? "aem-ok-text" : "aem-bad-text"} style={{ fontSize: 12.5, fontWeight: 600 }}>{setup.text}</div>
          {trust && host.type === "user" ? (
            <div className="aem-trust" data-testid="aem-trust">
              <div className={trust.tone === "ok" ? "aem-ok-text" : "aem-bad-text"} style={{ fontSize: 12.5, fontWeight: 600 }}>{trust.text}</div>
              <div className="aem-actions">
                <ModerationButton
                  label={trust.trusted ? "Remove trust" : "Mark as trusted host"}
                  tone={trust.trusted ? "ghost" : "green"}
                  reasonRequired={false}
                  fieldLabel="Note"
                  confirm={trust.trusted
                    ? "Remove trusted host? The new host limits apply again until this host has a paid out event with at least 5 paying guests and no lost disputes."
                    : "Mark this host as trusted? The new host limits (100 paid tickets per event, $100 per ticket) stop applying to every event they host."}
                  testId="aem-trust-switch"
                  disabled={modBusy !== null && modBusy !== "trust"}
                  onBusy={(b) => setModBusy(b ? "trust" : null)}
                  onSend={(note) => sendModeration(trustPath(host.id), note ? { trusted: !trust.trusted, note } : { trusted: !trust.trusted },
                    trust.trusted ? "Host is no longer trusted." : "Host marked as trusted.")}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="aem-tiles aem-tiles-5">
        {tiles.map((t) => (
          <div className="aem-tile" key={t.label} data-tile={t.label}>
            <div className="aem-tile-label">{t.label}</div>
            <div className="aem-tile-value" style={{ fontSize: 28 }}>{t.value}</div>
            <div className="aem-tile-hint">{t.hint}</div>
          </div>
        ))}
      </div>

      <div className="aem-cols">
        <div className="aem-col-main">
          <div className="aem-box" style={{ overflowX: "auto" }} data-testid="aem-ticket-types">
            <div className="aem-box-title">Ticket types</div>
            <div className="aem-types">
              <div className="aem-tgrid aem-thead">
                <div>Type</div><div className="aem-r">Price</div><div className="aem-r">Sold</div><div className="aem-r">Sales</div><div className="aem-r">Refunded</div><div className="aem-r">Host earns</div>
              </div>
              {ticketTypes.length === 0 ? (
                <div className="aem-pad aem-none">No ticket types.</div>
              ) : (
                ticketTypes.map((t) => (
                  <div className="aem-tgrid" key={t.ticketTypeId}>
                    <div className="aem-strong">{t.name}{t.archived ? <span className="aem-muted" style={{ fontWeight: 400 }}> (archived)</span> : null}</div>
                    <div className="aem-r">{t.priceCents === 0 ? "Free" : usd(t.priceCents)}</div>
                    <div className="aem-r">{t.sold}</div>
                    <div className="aem-r">{usd(t.salesCents)}</div>
                    <div className="aem-r aem-muted">{usd(t.refundedCents)}</div>
                    <div className="aem-r aem-strong">{usd(t.hostEarnsCents)}</div>
                  </div>
                ))
              )}
              <div className="aem-tgrid aem-total">
                <div>Total</div><div /><div className="aem-r">{tt.sold}</div><div className="aem-r">{usd(tt.sales)}</div><div className="aem-r">{usd(tt.refunded)}</div><div className="aem-r">{usd(tt.host)}</div>
              </div>
            </div>
          </div>

          <div className="aem-box">
            <div className="aem-box-title">Orders</div>
            <div className="aem-stats">
              <div><div className="aem-stat-label">Completed</div><div className="aem-stat-value">{orders.completed}</div></div>
              <div><div className="aem-stat-label">Refunded</div><div className="aem-stat-value">{orders.refunded}</div></div>
              <div><div className="aem-stat-label">Refund in progress</div><div className="aem-stat-value">{orders.refunding}</div></div>
              <div><div className="aem-stat-label">Checked in at the door</div><div className="aem-stat-value">{checkIns.checkedIn} of {checkIns.validTickets}</div></div>
            </div>
            {orders.flagged > 0 ? (
              <div className="aem-pad aem-bad-text" style={{ paddingTop: 0 }}>{plural(orders.flagged, "order")} flagged for review.</div>
            ) : null}
          </div>

          <div className="aem-box" data-testid="aem-recoveries">
            <div className="aem-box-title">Refunds after payout</div>
            {recoveries.length === 0 ? (
              <div className="aem-pad aem-none">None. If a ticket is refunded after the host is paid, we take it back from the host here.</div>
            ) : (
              recoveries.map((r) => {
                const st = RECOVERY_STATUS[r.status] ?? { text: r.status, tone: "grey" };
                return (
                  <div className="aem-rec" key={r.id} data-recovery-id={r.id}>
                    <div className="aem-rec-top">
                      <div>
                        <span className="aem-strong">{usd(r.amountCents)}</span>
                        <span className="aem-muted">{r.ticketTypeName ? ` · ${r.ticketTypeName} ticket` : ""} · since {shortDate(r.createdAt)}</span>
                      </div>
                      <div className="aem-pills">
                        {r.status === "owed" && r.owedOver30Days ? <span className="aem-pill aem-pill-red">Over 30 days</span> : null}
                        <span className={`aem-pill aem-pill-${st.tone}`}>{st.text}</span>
                      </div>
                    </div>
                    {r.lastError ? <div className="aem-attn-why">Last error: {r.lastError}</div> : null}
                    {r.resolvedAt ? (
                      <div className="aem-attn-why">
                        Resolved {shortDate(r.resolvedAt)}{r.resolvedByUsername ? ` by @${r.resolvedByUsername}` : ""}.
                      </div>
                    ) : null}
                    {r.status === "owed" ? (
                      <ActionGroup
                        id={r.id}
                        actions={[{ kind: "collected", tone: "green" }, { kind: "written_off", tone: "ghost" }]}
                        confirmKey={confirmKey}
                        busy={busy}
                        onAsk={ask}
                        onCancel={cancel}
                        onConfirm={confirmAction}
                      />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {teamPayouts.length > 0 ? (
            <div className="aem-box" data-testid="aem-team-payouts">
              <div className="aem-box-title">Event team pay</div>
              {teamPayouts.map((t) => {
                const pill = teamPayoutPill(t);
                const who = t.member.username ? `@${t.member.username}` : (t.member.firstName ?? "Team member");
                return (
                  <div className="aem-rec" key={t.id} data-team-payout-id={t.id}>
                    <div className="aem-rec-top">
                      <div>
                        <span className="aem-strong">{usd(t.amountCents)}</span>
                        <span className="aem-muted"> · {who}{t.sentAt ? ` · sent ${shortDate(t.sentAt)}` : ""}</span>
                      </div>
                      <div className="aem-pills"><span className={`aem-pill aem-pill-${pill.tone}`}>{pill.text}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="aem-col-side">
          {moderation ? (
            <div className="aem-box" data-testid="aem-safety">
              <div className="aem-box-title">Safety</div>
              <div className="aem-safety">
                <div style={{ fontSize: 13.5 }}>
                  {pendingReports === 0
                    ? "No reports waiting."
                    : <><span className="aem-bad-text" style={{ fontSize: 13.5, fontWeight: 700 }}>{pendingReports === 1 ? "1 person reported this event." : `${pendingReports} people reported this event.`}</span>{" "}<Link href="/admin/events#reports" className="aem-link">Open Reports</Link></>}
                </div>
                {e.status === "paused" ? <div className="aem-attn-why">On hold. Only ticket holders and the host can see the public page, and nothing is on sale.</div> : null}
                {modActions.length > 0 ? (
                  <div className="aem-actions">
                    {modActions.map((a) => (
                      <ModerationButton
                        key={a}
                        label={EVENT_ACTION_LABEL[a]}
                        tone={EVENT_TONE[a]}
                        confirm={EVENT_ACTION_CONFIRM[a]}
                        testId={`aem-act-${a}`}
                        disabled={modBusy !== null && modBusy !== a}
                        onBusy={(b) => setModBusy(b ? a : null)}
                        onSend={(reason) => sendModeration(eventActionPath(a, e.id), { reason }, EVENT_ACTION_DONE[a])}
                      />
                    ))}
                  </div>
                ) : <div className="aem-none">Nothing to do here for a {e.status === "cancelled" ? "cancelled" : e.status === "draft" ? "draft" : "finished"} event.</div>}
              </div>
            </div>
          ) : null}

          <div className={`aem-payout${payoutBad ? " aem-payout-bad" : ""}`} data-testid="aem-payout-card">
            <div className="aem-payout-top">
              <div className="aem-h2">Payout</div>
              {/* Same text as the header pill, so the two always agree. */}
              <span className={`aem-pill aem-pill-${pill.tone}`} data-testid="aem-payout-card-pill">{pill.text}</span>
            </div>
            {payout ? (
              <>
                <div className={e.status === "cancelled" ? "aem-payout-amt aem-payout-amt-muted" : "aem-payout-amt"}>{usd(payout.amountCents)}</div>
                <div className="aem-kv">
                  <div><span>Earned when the payout was made</span><span>{usd(payout.grossCents)}</span></div>
                  <div><span>Taken back for an earlier refund</span><span>{usd(payout.deductedCents)}</span></div>
                  {typeof payout.teamCents === "number" ? (
                    <div data-testid="aem-payout-team"><span>Paid to the event team</span><span>{usd(payout.teamCents)}</span></div>
                  ) : null}
                  <div><span>Due</span><span>{dayLong(payout.dueAt) || "Not set"}</span></div>
                  {payout.paidAt ? <div><span>Paid</span><span>{dayLong(payout.paidAt)}</span></div> : null}
                  <div><span>Tries</span><span>{payout.attempts}</span></div>
                  <div><span>Sent to</span><span>{payout.connectedAccount ?? "No account yet"}</span></div>
                  {payout.status === "held" ? <div><span>Why it waits</span><span>{holdText(payout.holdReason)}</span></div> : null}
                </div>
                {payout.lastError ? <div className="aem-err">Last error: {payout.lastError}</div> : null}
                {payout.status === "review" || payout.status === "held" ? (
                  <ActionGroup
                    id={payout.id}
                    size="md"
                    actions={[
                      // The backend refuses a retry unless the event is published (409 EVENT_NOT_PUBLISHED).
                      ...(payout.status === "review" && e.status === "published" ? [{ kind: "retry" as const, tone: "gold" as const }] : []),
                      ...(canEmailHost({ status: payout.status, holdReason: payout.holdReason, lastError: payout.lastError, eventStatus: e.status })
                        ? [{ kind: "email" as const, tone: "green" as const }] : []),
                    ]}
                    confirmKey={confirmKey}
                    busy={busy}
                    onAsk={ask}
                    onCancel={cancel}
                    onConfirm={confirmAction}
                  />
                ) : null}
              </>
            ) : (
              <div className="aem-none">
                {e.payoutExpectedAt
                  ? `No payout yet. It goes out 3 days after the event ends, around ${dayLong(e.payoutExpectedAt)}.`
                  : "No payout for this event."}
              </div>
            )}
          </div>

          <div className="aem-box">
            <div className="aem-box-title">Activity</div>
            {activity.length === 0 ? (
              <div className="aem-pad aem-none">Nothing yet.</div>
            ) : (
              <div className="aem-activity" data-testid="aem-activity">
                {activity.map((a, i) => (
                  <div className="aem-act" key={`${a.at}:${a.kind}:${i}`}>
                    <span className="aem-act-dot" aria-hidden="true" />
                    <div>
                      <div className="aem-act-text">{a.text}</div>
                      <div className="aem-act-when">{whenLong(a.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
