/**
 * Pure logic for the admin events money page: buckets, host groups, filters, search, pills and
 * money formatting. No React, no fetch. Inputs are typed from the real GET /api/admin/events rows.
 */
import { zonedInstant, zonedParts } from "../../../events/eventsLogic";

export const NY = "America/New_York";

/* ---------- Types (from the backend list route) ---------- */

export type HostType = "business" | "photographer" | "user";
export type PayoutSetup = "ready" | "no_account" | "not_complete" | "stripe_not_ready" | string;

export interface AdminEventHost {
  type: HostType;
  id: string;
  name: string;
  avatarUrl: string | null;
  ownerUsername: string | null;
  payoutReady: boolean;
  payoutSetup: PayoutSetup;
}

export interface AdminEventPayout {
  id: string;
  status: "pending" | "paid" | "held" | "review";
  dueAt: string | null;
  paidAt: string | null;
  grossCents: number;
  amountCents: number;
  deductedCents: number;
  attempts: number;
  lastError: string | null;
  holdReason: "no_account" | "not_complete" | "stripe_not_ready" | "event_paused" | null;
}

export interface AdminEventRow {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  state: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  status: "published" | "cancelled" | string;
  capacity: number | null;
  ticketsSold: number;
  ticketsValid: number;
  ticketsRefunded: number;
  salesCents: number;
  refundedCents: number;
  hostEarnsCents: number;
  outsydeFeesCents: number;
  owedToHostCents: number;
  paidToHostCents: number;
  refundsPending: number;
  recoveriesOwed: { count: number; amountCents: number };
  payoutDueAt: string | null;
  payoutExpectedAt: string | null;
  host: AdminEventHost;
  payout: AdminEventPayout | null;
  payoutStatus: "scheduled" | "paid" | "on_hold" | "payout_setup_needed" | "event_paused" | "none" | string;
}

export type BucketId = "now" | "week" | "upcoming" | "paid" | "nothing" | "cancelled";
export type FilterId = "all" | "upcoming" | "awaiting" | "paid" | "attention";
export type PillTone = "gold" | "green" | "red" | "grey";
export interface Totals { events: number; salesCents: number; owedCents: number; paidCents: number }

/* ---------- Copy ---------- */

export const BUCKETS: { id: BucketId; name: string; hint: string; tone: "urgent" | "soon" | "calm" }[] = [
  { id: "now", name: "Needs you now", hint: "Payouts that are stuck or on hold", tone: "urgent" },
  { id: "week", name: "Payout due in the next 7 days", hint: "Ended events, soonest payout first", tone: "soon" },
  { id: "upcoming", name: "Coming up", hint: "Events that haven't happened yet, soonest first", tone: "calm" },
  { id: "paid", name: "Paid", hint: "Most recent first", tone: "calm" },
  { id: "nothing", name: "Ended, nothing to pay", hint: "Ended with nothing to pay", tone: "calm" },
  { id: "cancelled", name: "Cancelled", hint: "Everyone refunded", tone: "calm" },
];

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "awaiting", label: "Ended, not paid yet" },
  { id: "paid", label: "Paid" },
  { id: "attention", label: "Needs attention" },
];

export type RangePreset = "last30" | "last90" | "year" | "all";
export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: "last30", label: "Last 30 days" },
  { id: "last90", label: "Last 90 days" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
];

export const INDIVIDUAL_HOSTS = "Individual hosts";

const PILL = {
  scheduled: "Scheduled",
  due: "Due",
  paid: "Paid",
  review: "In review",
  heldSetup: "On hold, setup needed",
  held: "On hold",
  refund: "Waiting on a refund",
  nothingSold: "No payout, nothing sold",
  nothingToPay: "No payout, nothing to pay",
  cancelled: "None, all refunded",
  cancelledReview: "Won't be paid, event cancelled",
} as const;

/** Every fixed copy string this module can show, for the punctuation test. */
export function allCopy(): string[] {
  return [
    ...BUCKETS.flatMap((b) => [b.name, b.hint]),
    ...FILTERS.map((f) => f.label),
    ...RANGE_PRESETS.map((r) => r.label),
    INDIVIDUAL_HOSTS,
    ...Object.values(PILL),
    ...[PILL.scheduled, PILL.due, PILL.paid].map((p) => `${p} Nov 4`),
  ];
}

/* ---------- Money and dates ---------- */

/** "$1,234.56". Whole cents only, en-US, negatives as "-$12.50". */
export function usd(cents: number): string {
  const n = Number.isFinite(cents) ? Math.round(cents) : 0;
  const body = (Math.abs(n) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}$${body}`;
}

const SHORT = new Intl.DateTimeFormat("en-US", { timeZone: NY, month: "short", day: "numeric" });
/** "Nov 4" in New York time. Empty string for a missing or invalid date. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : SHORT.format(d);
}

function nyMidnightFor(y: number, m: number, d: number): string {
  const inst = zonedInstant(y, m, d, 0, 0, 0, NY).getTime();
  const offMin = Math.round((Date.UTC(y, m - 1, d) - inst) / 60000);
  const sign = offMin < 0 ? "-" : "+";
  const a = Math.abs(offMin);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T00:00:00${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

/** ISO string for midnight New York time on the New York calendar day of `date`, with its real offset. */
export function nyMidnightIso(date: Date): string {
  const p = zonedParts(date, NY);
  return nyMidnightFor(p.y, p.m, p.d);
}

/** Preset to the list route's `from` param. The backend reads date-only strings as UTC, so send an offset. */
export function rangeFor(preset: RangePreset, now: Date): { from?: string } {
  if (preset === "all") return {};
  const p = zonedParts(now, NY);
  if (preset === "year") return { from: nyMidnightFor(p.y, 1, 1) };
  const back = new Date(Date.UTC(p.y, p.m - 1, p.d - (preset === "last30" ? 30 : 90)));
  return { from: nyMidnightFor(back.getUTCFullYear(), back.getUTCMonth() + 1, back.getUTCDate()) };
}

/* ---------- Buckets ---------- */

const ms = (iso: string | null | undefined): number => {
  if (!iso) return Number.NaN;
  return new Date(iso).getTime();
};

function hasEnded(e: AdminEventRow, now: Date): boolean {
  const end = ms(e.endsAt ?? e.startsAt);
  return Number.isFinite(end) && end <= now.getTime();
}

/** The date the payout is due: the payout row first, then the event's own due and expected dates. */
function dueOf(e: AdminEventRow): string | null {
  return e.payout?.dueAt ?? e.payoutDueAt ?? e.payoutExpectedAt ?? null;
}

/** No payout row and nothing earned or owed. The one rule behind both the bucket and the pill. */
function nothingToPay(e: AdminEventRow): boolean {
  return e.payout == null && e.hostEarnsCents === 0 && e.owedToHostCents === 0;
}

export function bucketOf(e: AdminEventRow, now: Date): BucketId {
  if (e.status === "cancelled") return "cancelled";
  const ps = e.payout?.status;
  if (ps === "review" || ps === "held") return "now";
  if (ps === "paid") return "paid";
  if (!hasEnded(e, now)) return "upcoming";
  if (nothingToPay(e)) return "nothing";
  return "week"; // ended and unpaid is always in the due bucket, overdue first
}

const cmp = (a: number, b: number) => (Number.isFinite(a) ? a : Infinity) - (Number.isFinite(b) ? b : Infinity);

/** Sort order inside each bucket. Returns a new array. */
export function sortWithinBucket(id: BucketId, events: AdminEventRow[]): AdminEventRow[] {
  const by = (f: (e: AdminEventRow) => number, dir: 1 | -1) =>
    [...events].sort((a, b) => dir * cmp(f(a), f(b)));
  switch (id) {
    case "now":
    case "week":
      return by((e) => ms(dueOf(e)), 1);
    case "upcoming":
      return by((e) => ms(e.startsAt), 1);
    case "paid":
      return by((e) => ms(e.payout?.paidAt), -1);
    case "nothing":
      return by((e) => ms(e.endsAt ?? e.startsAt), -1);
    default:
      return by((e) => ms(e.startsAt), -1);
  }
}

/** Sum for a set of events. A cancelled event owes nothing, even with a payout stuck in review. */
export function totalsOf(events: AdminEventRow[]): Totals {
  let salesCents = 0, owedCents = 0, paidCents = 0;
  for (const e of events) {
    salesCents += e.salesCents;
    paidCents += e.paidToHostCents;
    if (e.status !== "cancelled") owedCents += e.owedToHostCents;
  }
  return { events: events.length, salesCents, owedCents, paidCents };
}

export interface BucketGroup {
  id: BucketId; name: string; hint: string; tone: "urgent" | "soon" | "calm";
  events: AdminEventRow[]; totals: Totals;
}

/** The By date view: non-empty buckets in fixed order, each sorted. */
export function groupByBucket(events: AdminEventRow[], now: Date): BucketGroup[] {
  return BUCKETS.map((b) => {
    const mine = sortWithinBucket(b.id, events.filter((e) => bucketOf(e, now) === b.id));
    return { ...b, events: mine, totals: totalsOf(mine) };
  }).filter((g) => g.events.length > 0);
}

/* ---------- Host groups ---------- */

export interface HostGroup {
  key: string;
  kind: "business" | "photographer" | "people";
  name: string;
  events: AdminEventRow[];
  totals: Totals;
  hostsNeedingSetup: number;
}

const byName = (a: HostGroup, b: HostGroup) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.key.localeCompare(b.key);

/** The By host view: businesses, then photographers (each by name), then one group for individuals. */
export function groupByHost(events: AdminEventRow[]): HostGroup[] {
  const map = new Map<string, HostGroup>();
  const needs = new Map<string, Set<string>>();
  for (const e of events) {
    const t = e.host.type;
    const kind = t === "business" ? "business" : t === "photographer" ? "photographer" : "people";
    const key = kind === "people" ? "people" : `${t}:${e.host.id}`;
    let g = map.get(key);
    if (!g) {
      g = { key, kind, name: kind === "people" ? INDIVIDUAL_HOSTS : e.host.name, events: [], totals: totalsOf([]), hostsNeedingSetup: 0 };
      map.set(key, g);
      needs.set(key, new Set());
    }
    g.events.push(e);
    if (e.host.payoutReady === false) needs.get(key)!.add(e.host.id);
  }
  for (const [key, g] of map) {
    g.events.sort((a, b) => cmp(ms(b.startsAt), ms(a.startsAt)));
    g.totals = totalsOf(g.events);
    g.hostsNeedingSetup = needs.get(key)!.size;
  }
  const all = [...map.values()];
  const of = (k: HostGroup["kind"]) => all.filter((g) => g.kind === k).sort(byName);
  return [...of("business"), ...of("photographer"), ...of("people")];
}

/* ---------- Filters and search ---------- */

/** Which filter chip an event belongs to. Cancelled and nothing-to-pay events are only in All. */
export function filterOf(e: AdminEventRow, now: Date): Exclude<FilterId, "all"> | null {
  switch (bucketOf(e, now)) {
    case "now": return "attention";
    case "week": return "awaiting";
    case "paid": return "paid";
    case "upcoming": return "upcoming";
    default: return null;
  }
}

/** Case-insensitive match on title, city, host name and owner username. Blank matches everything. */
export function matchesSearch(e: AdminEventRow, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^@/, "");
  if (!q) return true;
  return [e.title, e.city, e.host?.name, e.host?.ownerUsername].some((v) => (v ?? "").toLowerCase().includes(q));
}

export function filterCounts(events: AdminEventRow[], now: Date, search = ""): Record<FilterId, number> {
  const rows = events.filter((e) => matchesSearch(e, search));
  const c: Record<FilterId, number> = { all: rows.length, upcoming: 0, awaiting: 0, paid: 0, attention: 0 };
  for (const e of rows) {
    const f = filterOf(e, now);
    if (f) c[f]++;
  }
  return c;
}

export function filterEvents(events: AdminEventRow[], filter: FilterId, now: Date, search = ""): AdminEventRow[] {
  return events.filter((e) => matchesSearch(e, search) && (filter === "all" || filterOf(e, now) === filter));
}

/* ---------- Payout pill ---------- */

const SETUP_HOLDS = new Set(["no_account", "not_complete", "stripe_not_ready"]);

export function payoutPill(e: AdminEventRow, now: Date): { text: string; tone: PillTone } {
  const p = e.payout;
  const withDate = (label: string, iso: string | null | undefined) => {
    const d = shortDate(iso);
    return d ? `${label} ${d}` : label;
  };
  if (p?.status === "paid") return { text: withDate(PILL.paid, p.paidAt), tone: "green" };
  if (e.status === "cancelled") {
    return p?.status === "review" || p?.status === "held"
      ? { text: PILL.cancelledReview, tone: "grey" }
      : { text: PILL.cancelled, tone: "grey" };
  }
  if (p?.status === "review") return { text: PILL.review, tone: "red" };
  if (p?.status === "held") {
    const setup = (p.holdReason != null && SETUP_HOLDS.has(p.holdReason)) || (p.holdReason == null && e.host.payoutReady === false);
    return { text: setup ? PILL.heldSetup : PILL.held, tone: "red" };
  }
  if (nothingToPay(e)) return { text: e.salesCents === 0 ? PILL.nothingSold : PILL.nothingToPay, tone: "grey" };
  if (hasEnded(e, now)) {
    if (e.refundsPending > 0) return { text: PILL.refund, tone: "grey" };
    return { text: withDate(PILL.due, dueOf(e)), tone: "gold" };
  }
  return { text: withDate(PILL.scheduled, dueOf(e)), tone: "gold" };
}
