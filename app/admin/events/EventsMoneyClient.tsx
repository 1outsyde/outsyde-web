"use client";
/**
 * Admin events money list: KPI tiles, the Needs attention strip with its actions, filter chips with
 * counts, the By date (default) / By host switch, search and the date range. Data comes from the
 * BFF GET /api/admin/events; the grouping, filters, pills and totals come from _lib/money.ts.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FILTERS,
  RANGE_PRESETS,
  filterCounts,
  filterEvents,
  groupByBucket,
  groupByHost,
  payoutPill,
  rangeFor,
  shortDate,
  teamAttentionCopy,
  totalsOf,
  usd,
  type AdminEventHost,
  type TeamAttentionItem,
  type AdminEventRow,
  type FilterId,
  type RangePreset,
} from "./_lib/money";
import {
  ACTION_DONE,
  ActionGroup,
  AuthScreen,
  canEmailHost,
  NoticeBanner,
  Shell,
  StateScreen,
  hostLabel,
  holdText,
  initialOf,
  place,
  plural,
  runAction,
  statusLabel,
  whenLong,
  type ActionKind,
  type Notice,
} from "./_ui/shared";

interface AttentionItem {
  kind: "payout_review" | "payout_held" | "recovery_owed";
  payoutId: string;
  recoveryId: string | null;
  eventId: string;
  eventTitle: string;
  host: AdminEventHost;
  amountCents: number;
  reason: string | null;
  since: string;
}

interface ListData {
  events: AdminEventRow[];
  attention: AttentionItem[];
  /** p4-team 4b-2: team pay items, from their own field (older backends send none). */
  teamAttention: TeamAttentionItem[];
  now: Date;
}

type View = "date" | "host";
type Auth = "loading" | "ok" | "unauthorized" | "forbidden";

const SETUP_HOLDS = new Set(["no_account", "not_complete", "stripe_not_ready"]);
const withStop = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

function attentionCopy(a: AttentionItem): { label: string; why: string } {
  const since = shortDate(a.since);
  if (a.kind === "payout_review") {
    return {
      label: "Payout stuck in review",
      why: `${withStop(a.reason || "Stripe couldn't send this payout")}${since ? ` In review since ${since}.` : ""}`,
    };
  }
  if (a.kind === "payout_held") {
    const label = a.reason && SETUP_HOLDS.has(a.reason)
      ? "On hold, payout setup needed"
      : a.reason === "event_paused" ? "On hold, event paused" : "Payout on hold";
    return { label, why: `${holdText(a.reason)}${since ? ` On hold since ${since}.` : ""}` };
  }
  return {
    label: "Host owes us, over 30 days",
    why: `A ticket was refunded after the payout and taking it back failed.${a.reason ? ` Last error: ${withStop(a.reason)}` : ""}${since ? ` Owed since ${since}.` : ""}`,
  };
}

function Pill({ e, now }: { e: AdminEventRow; now: Date }) {
  const p = payoutPill(e, now);
  return <span className={`aem-pill aem-pill-${p.tone}`}>{p.text}</span>;
}

function Row({ e, now, withHost }: { e: AdminEventRow; now: Date; withHost: boolean }) {
  const sub = [withHost ? hostLabel(e.host) : null, place(e)].filter(Boolean).join(" · ");
  return (
    <Link href={`/admin/events/${encodeURIComponent(e.id)}`} className="aem-grid aem-row" data-event-id={e.id}>
      <div style={{ minWidth: 0 }}>
        <div className="aem-row-title">{e.title}</div>
        {sub ? <div className="aem-row-sub">{sub}</div> : null}
      </div>
      <div className="aem-dim">{whenLong(e.startsAt)}</div>
      <div className="aem-dim">{statusLabel(e, now)}</div>
      <div className="aem-r">{e.capacity ? `${e.ticketsSold} / ${e.capacity}` : e.ticketsSold}</div>
      <div className="aem-r">{usd(e.salesCents)}</div>
      <div className="aem-r aem-muted">{usd(e.refundedCents)}</div>
      <div className="aem-r aem-strong">{usd(e.hostEarnsCents)}</div>
      <div className="aem-r aem-gold">{usd(e.outsydeFeesCents)}</div>
      <div><Pill e={e} now={now} /></div>
    </Link>
  );
}

type ListResult =
  | { kind: "ok"; data: ListData }
  | { kind: "auth"; auth: "unauthorized" | "forbidden" }
  | { kind: "error"; text: string };

/** GET the list for a range through the BFF. Never throws, never touches React state. */
async function fetchList(p: RangePreset): Promise<ListResult> {
  const { from } = rangeFor(p, new Date());
  const url = `/api/admin/events${from ? `?from=${encodeURIComponent(from)}` : ""}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 401) return { kind: "auth", auth: "unauthorized" };
    if (res.status === 403) return { kind: "auth", auth: "forbidden" };
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || !Array.isArray(body.events)) return { kind: "error", text: "Couldn't load events money. Try again in a moment." };
    return {
      kind: "ok",
      data: {
        events: body.events,
        attention: Array.isArray(body.attention) ? body.attention : [],
        teamAttention: Array.isArray(body.teamAttention) ? body.teamAttention : [],
        now: new Date(),
      },
    };
  } catch {
    return { kind: "error", text: "Couldn't reach the server. Check your connection and try again." };
  }
}

const sum = (events: AdminEventRow[], f: (e: AdminEventRow) => number) => events.reduce((a, e) => a + f(e), 0);

export default function EventsMoneyClient() {
  const [auth, setAuth] = useState<Auth>("loading");
  const [data, setData] = useState<ListData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [preset, setPreset] = useState<RangePreset>("last90");
  const [view, setView] = useState<View>("date");
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reqSeq = useRef(0);

  /** Apply one fetch result. Only the newest request may write state. */
  const apply = useCallback((my: number, r: ListResult) => {
    if (my !== reqSeq.current) return;
    setRefreshing(false);
    if (r.kind === "auth") { setAuth(r.auth); return; }
    if (r.kind === "error") { setLoadError(r.text); return; }
    setData(r.data);
    setLoadError(null);
    setAuth("ok");
  }, []);

  const load = useCallback((p: RangePreset): Promise<void> => {
    const my = ++reqSeq.current;
    return fetchList(p).then((r) => apply(my, r));
  }, [apply]);

  useEffect(() => {
    load(preset);
  }, [preset, load]);

  function pickRange(p: RangePreset) {
    if (p === preset) return;
    setRefreshing(true);
    setPreset(p);
  }

  async function confirmAction(kind: ActionKind, id: string) {
    setBusy(true);
    setNotice(null);
    const r = await runAction(kind, id);
    if (r.ok === false && r.auth) {
      setBusy(false);
      setAuth(r.auth);
      return;
    }
    await load(preset);
    setConfirmKey(null);
    setBusy(false);
    setNotice(r.ok ? { kind: "ok", text: ACTION_DONE[kind] } : { kind: "error", text: r.text });
  }

  const events = useMemo(() => data?.events ?? [], [data]);
  const now = data?.now ?? null;
  const shown = useMemo(() => (now ? filterEvents(events, filter, now, search) : []), [events, filter, now, search]);
  const counts = useMemo(() => (now ? filterCounts(events, now, search) : null), [events, now, search]);

  if (auth === "unauthorized" || auth === "forbidden") return <AuthScreen state={auth} returnTo="/admin/events" />;
  if (loadError && !data) {
    return (
      <StateScreen title="Couldn't load events money">
        <div style={{ marginBottom: 12 }}>{loadError}</div>
        <button type="button" className="aem-btn aem-btn-gold aem-btn-md" onClick={() => { setLoadError(null); load(preset); }}>Retry</button>
      </StateScreen>
    );
  }
  if (!data || !now || !counts) return <StateScreen title="Loading…" />;

  const totals = totalsOf(events);
  // Attention is platform wide, so an item's event may sit outside the range; then the backend still guards.
  const statusById = new Map(events.map((e) => [e.id, e.status]));
  const tiles = [
    { label: "Ticket sales", value: usd(totals.salesCents), hint: "All tickets sold, including any later refunded" },
    { label: "Outsyde fees", value: usd(sum(events, (e) => e.outsydeFeesCents)), hint: "Service fees plus host fees" },
    { label: "Owed to hosts", value: usd(totals.owedCents), hint: "Earned, not paid out yet" },
    { label: "Paid to hosts", value: usd(totals.paidCents), hint: "Sent to their Stripe accounts" },
    { label: "Refunded", value: usd(sum(events, (e) => e.refundedCents)), hint: "Ticket price only" },
    { label: "Needs attention", value: String(data.attention.length + data.teamAttention.length), hint: "Stuck, on hold or owed" },
  ];

  const tableBody = (() => {
    if (shown.length === 0) return <div className="aem-empty">No events in this view.</div>;
    if (view === "date") {
      return groupByBucket(shown, now).map((g) => (
        <div key={g.id} data-group="bucket">
          <div className="aem-group">
            <div className="aem-group-left">
              <span className={`aem-dot aem-dot-${g.tone}`} aria-hidden="true" />
              <span className="aem-group-name">{g.name}</span>
              <span className="aem-group-hint">{g.hint}</span>
            </div>
            <div className="aem-group-sums">
              <span>{plural(g.events.length, "event")} · Host earns <b className="aem-gold">{usd(sum(g.events, (e) => e.hostEarnsCents))}</b></span>
            </div>
          </div>
          {g.events.map((e) => <Row key={e.id} e={e} now={now} withHost />)}
        </div>
      ));
    }
    return groupByHost(shown).map((g) => {
      const people = g.kind === "people";
      const ok = g.hostsNeedingSetup === 0;
      const account = people
        ? ok ? "Payout accounts ready" : `${plural(g.hostsNeedingSetup, "host")} ${g.hostsNeedingSetup === 1 ? "needs" : "need"} payout setup`
        : ok ? "Payout account ready" : "Payout setup needed";
      return (
        <div key={g.key} data-group="host">
          <div className="aem-group">
            <div className="aem-group-left">
              <span className="aem-avatar" aria-hidden="true">{people ? "@" : initialOf(g.name)}</span>
              <span className="aem-group-name">{g.name}</span>
              <span className="aem-kind">{g.kind === "business" ? "Business" : g.kind === "photographer" ? "Photographer" : "People"}</span>
              <span className={ok ? "aem-ok-text" : "aem-bad-text"}>{account}</span>
            </div>
            <div className="aem-group-sums">
              <span>{plural(g.events.length, "event")}</span>
              <span>Sales <b>{usd(g.totals.salesCents)}</b></span>
              <span>Owed, not paid yet <b className="aem-gold">{usd(g.totals.owedCents)}</b></span>
              <span>Paid <b className="aem-green">{usd(g.totals.paidCents)}</b></span>
            </div>
          </div>
          {g.events.map((e) => <Row key={e.id} e={e} now={now} withHost={people} />)}
        </div>
      );
    });
  })();

  return (
    <Shell>
      <div className="aem-head">
        <div>
          <h1 className="aem-h1">Events money</h1>
          <div className="aem-sub">Ticket sales, what each host is owed, and payouts. Times in Eastern.</div>
        </div>
        <div className="aem-tools">
          {refreshing ? <span className="aem-loading">Loading…</span> : null}
          <select
            className="aem-select"
            aria-label="Date range"
            value={preset}
            onChange={(ev) => pickRange(ev.target.value as RangePreset)}
          >
            {RANGE_PRESETS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
      </div>

      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      {loadError ? <NoticeBanner notice={{ kind: "error", text: loadError }} onClose={() => setLoadError(null)} /> : null}

      <div className="aem-tiles" data-testid="aem-tiles">
        {tiles.map((t) => (
          <div className="aem-tile" key={t.label} data-tile={t.label}>
            <div className="aem-tile-label">{t.label}</div>
            <div className="aem-tile-value">{t.value}</div>
            <div className="aem-tile-hint">{t.hint}</div>
          </div>
        ))}
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="aem-attn-h">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="aem-h2" id="aem-attn-h">Needs attention</h2>
          <span className="aem-count">{data.attention.length + data.teamAttention.length}</span>
        </div>
        {data.attention.length + data.teamAttention.length === 0 ? (
          <div className="aem-none">Nothing needs you right now.</div>
        ) : (
          <div className="aem-attn">
            {data.attention.map((a) => {
              const c = attentionCopy(a);
              const id = a.kind === "recovery_owed" ? a.recoveryId ?? "" : a.payoutId;
              const viewLink = (
                <Link href={`/admin/events/${encodeURIComponent(a.eventId)}`} className="aem-btn aem-btn-ghost">View event</Link>
              );
              return (
                <div className="aem-attn-card" key={`${a.kind}:${a.payoutId}:${a.recoveryId ?? ""}`} data-attention={a.kind} data-item-id={id}>
                  <div className="aem-attn-top">
                    <div className="aem-attn-kind">{c.label}</div>
                    <div className="aem-attn-amt">{usd(a.amountCents)}</div>
                  </div>
                  <div className="aem-attn-what">{a.eventTitle} · {hostLabel(a.host)}</div>
                  <div className="aem-attn-why">{c.why}</div>
                  {id ? <ActionGroup
                    id={id}
                    actions={
                      a.kind === "recovery_owed"
                        ? [{ kind: "collected", tone: "green" }, { kind: "written_off", tone: "ghost" }]
                        : [
                          // The backend refuses a retry unless the event is published (409 EVENT_NOT_PUBLISHED).
                          ...(a.kind === "payout_review" && (statusById.get(a.eventId) ?? "published") === "published"
                            ? [{ kind: "retry" as const, tone: "gold" as const }] : []),
                          ...(canEmailHost({
                            status: a.kind === "payout_review" ? "review" : "held",
                            holdReason: a.kind === "payout_held" ? a.reason : null,
                            lastError: a.kind === "payout_review" ? a.reason : null,
                            eventStatus: statusById.get(a.eventId),
                          }) ? [{ kind: "email" as const, tone: "green" as const }] : []),
                        ]
                    }
                    extra={a.kind === "recovery_owed" ? undefined : viewLink}
                    confirmKey={confirmKey}
                    busy={busy}
                    onAsk={(k) => { setNotice(null); setConfirmKey(k); }}
                    onCancel={() => setConfirmKey(null)}
                    onConfirm={confirmAction}
                  /> : null}
                </div>
              );
            })}
            {data.teamAttention.map((a) => {
              const c = teamAttentionCopy(a);
              return (
                <div className="aem-attn-card" key={`${a.kind}:${a.teamPayoutId}`} data-attention={a.kind} data-item-id={a.teamPayoutId}>
                  <div className="aem-attn-top">
                    <div className="aem-attn-kind">{c.label}</div>
                    <div className="aem-attn-amt">{usd(a.amountCents)}</div>
                  </div>
                  <div className="aem-attn-what">{a.eventTitle} · Event team</div>
                  <div className="aem-attn-why">{c.why}</div>
                  <div className="aem-actions">
                    <Link href={`/admin/events/${encodeURIComponent(a.eventId)}`} className="aem-btn aem-btn-ghost">View event</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <div className="aem-toolbar">
          <div className="aem-chips" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="aem-chip"
                aria-pressed={filter === f.id}
                data-filter={f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label} · {counts[f.id]}
              </button>
            ))}
          </div>
          <div className="aem-tools">
            <div className="aem-switch" role="group" aria-label="Group events">
              <button type="button" aria-pressed={view === "host"} onClick={() => setView("host")}>By host</button>
              <button type="button" aria-pressed={view === "date"} onClick={() => setView("date")}>By date</button>
            </div>
            <label className="aem-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input
                type="search"
                aria-label="Search host or event"
                placeholder="Search host or event"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="aem-scroll" data-testid="aem-table-scroll">
          <div className="aem-table">
            <div className="aem-grid aem-thead">
              <div>Event</div><div>When</div><div>Status</div><div className="aem-r">Tickets</div><div className="aem-r">Ticket sales</div>
              <div className="aem-r">Refunded</div><div className="aem-r">Host earns</div><div className="aem-r">Outsyde fees</div><div>Payout</div>
            </div>
            {tableBody}
          </div>
        </div>
        <div className="aem-foot">
          Ticket sales are ticket prices before refunds. Host earns is what the host gets for tickets still valid.
          Outsyde fees are the buyer service fees plus the host fee. Payouts go out 3 days after an event ends.
          Needs attention covers every event, not just this date range.
        </div>
      </section>
    </Shell>
  );
}
