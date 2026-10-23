"use client";
/**
 * Shared UI pieces for the admin events money pages (list and one event): styles, date and host
 * formatting, the four admin actions with their two-step confirm, and the auth screens.
 * Every class name starts with "aem-" so nothing collides with the other admin pages' global CSS.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { NY, type AdminEventHost, type AdminEventRow } from "../_lib/money";

/* ---------- Dates and names ---------- */

const DAY = new Intl.DateTimeFormat("en-US", { timeZone: NY, weekday: "short", month: "short", day: "numeric" });
const TIME = new Intl.DateTimeFormat("en-US", { timeZone: NY, hour: "numeric", minute: "2-digit" });

const valid = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Sat, Nov 1" in New York time. */
export function dayLong(iso: string | null | undefined): string {
  const d = valid(iso);
  return d ? DAY.format(d) : "";
}

/** "Sat, Nov 1 · 9:00 PM" in New York time. */
export function whenLong(iso: string | null | undefined): string {
  const d = valid(iso);
  return d ? `${DAY.format(d)} · ${TIME.format(d)}` : "";
}

/** "9:00 PM" in New York time. */
export function timeOnly(iso: string | null | undefined): string {
  const d = valid(iso);
  return d ? TIME.format(d) : "";
}

export function hasEnded(e: Pick<AdminEventRow, "endsAt" | "startsAt">, now: Date): boolean {
  const d = valid(e.endsAt ?? e.startsAt);
  return !!d && d.getTime() <= now.getTime();
}

/** Published, Ended, Cancelled, Paused or Draft. */
export function statusLabel(e: Pick<AdminEventRow, "status" | "endsAt" | "startsAt">, now: Date): string {
  if (e.status === "cancelled") return "Cancelled";
  if (e.status === "paused") return "Paused";
  if (e.status === "draft") return "Draft";
  return hasEnded(e, now) ? "Ended" : "Published";
}

/** The name shown for a host: the public name, or @username for an individual host. */
export function hostLabel(h: AdminEventHost): string {
  if (h.type === "user") return h.ownerUsername ? `@${h.ownerUsername}` : h.name;
  return h.name;
}

export function hostKind(h: AdminEventHost): string {
  return h.type === "business" ? "Business" : h.type === "photographer" ? "Photographer" : "Person";
}

export function initialOf(name: string): string {
  const c = name.replace(/^@/, "").trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}

export function place(e: Pick<AdminEventRow, "city" | "state">): string {
  return [e.city, e.state].filter((x) => !!x && String(x).trim()).join(", ");
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** What the host's payout account looks like, for the host card and group headers. */
export function setupText(setup: string): { text: string; ok: boolean } {
  switch (setup) {
    case "ready": return { text: "Payout account ready", ok: true };
    case "no_account": return { text: "No payout account yet", ok: false };
    case "not_complete": return { text: "Payout setup not finished", ok: false };
    case "stripe_not_ready": return { text: "Stripe isn't ready to pay this host yet", ok: false };
    default: return { text: "Payout setup needed", ok: false };
  }
}

/** Why a payout is held, in plain words. */
export function holdText(reason: string | null | undefined): string {
  switch (reason) {
    case "no_account": return "The host hasn't set up payouts yet.";
    case "not_complete": return "The host started payout setup but hasn't finished it.";
    case "stripe_not_ready": return "Stripe isn't ready to pay this host yet.";
    case "event_paused": return "The event is paused, so the payout waits.";
    default: return "The payout is on hold.";
  }
}

/* ---------- Actions ---------- */

export type ActionKind = "retry" | "email" | "collected" | "written_off";
export type ActionTone = "gold" | "green" | "ghost";

export const ACTION_LABEL: Record<ActionKind, string> = {
  retry: "Try again",
  email: "Email the host",
  collected: "Mark collected",
  written_off: "Write off",
};

export const ACTION_DONE: Record<ActionKind, string> = {
  retry: "Payout set to try again. It goes out within a few minutes.",
  email: "Email sent to the host.",
  collected: "Marked collected.",
  written_off: "Written off.",
};

const CODE_TEXT: Record<string, string> = {
  NOT_IN_REVIEW: "This payout is no longer in review.",
  EVENT_NOT_PUBLISHED: "This event isn't published, so its payout can't be retried.",
  NOT_OWED: "This was already resolved.",
  EMAIL_RECENTLY_SENT: "The host was emailed in the last 24 hours.",
  EMAIL_BUDGET: "Today's email limit is reached. Try again tomorrow.",
  NOT_A_HOST_ISSUE: "This payout isn't waiting on the host, so no email was sent.",
  NOT_HELD_OR_REVIEW: "This payout isn't on hold or in review anymore.",
  HOST_NO_EMAIL: "This host has no email on their account.",
  EMAIL_FAILED: "The email didn't send. Try again in a minute.",
};

/** Review errors that no host action can fix (the backend's NOT_HOST_REVIEW_PREFIXES). */
const NOT_HOST_REVIEW_PREFIXES = ["the event was cancelled after its payout was created", "Stripe already has transfer"];

/**
 * Whether Email the host can work: the same rule as the backend's isHostIssue. Held for an account reason, or in
 * review for a reason the host can fix, and the event isn't cancelled. Otherwise the button is hidden.
 */
export function canEmailHost(p: { status: string; holdReason?: string | null; lastError?: string | null; eventStatus?: string | null }): boolean {
  if (p.eventStatus === "cancelled") return false;
  if (p.status === "held") return p.holdReason !== "event_paused";
  if (p.status === "review") {
    const err = (p.lastError ?? "").trim();
    return !NOT_HOST_REVIEW_PREFIXES.some((x) => err.startsWith(x));
  }
  return false;
}

export type ActionResult =
  | { ok: true }
  | { ok: false; auth: "unauthorized" | "forbidden" }
  | { ok: false; auth?: undefined; text: string };

/**
 * The error text for a failed request. Backend errors are nested ({success:false, error:{code, message}}); the
 * admin middleware and the BFF's own errors are flat ({error:"..."}). A known code's copy wins, then the message.
 */
export function errorText(body: unknown, status: number): string {
  const b = (body ?? {}) as { error?: unknown; code?: unknown; message?: unknown };
  const nested = b.error && typeof b.error === "object" ? (b.error as { code?: unknown; message?: unknown }) : null;
  const code = typeof nested?.code === "string" ? nested.code : typeof b.code === "string" ? b.code : "";
  if (code && CODE_TEXT[code]) return CODE_TEXT[code];
  const msg =
    (typeof nested?.message === "string" && nested.message) ||
    (typeof b.error === "string" && b.error) ||
    (typeof b.message === "string" && b.message) ||
    "";
  return msg || `Something went wrong (${status}). Try again.`;
}

/** POST one admin action through the BFF. Never throws. */
export async function runAction(kind: ActionKind, id: string): Promise<ActionResult> {
  const enc = encodeURIComponent(id);
  const url =
    kind === "retry" ? `/api/admin/events/payouts/${enc}/retry`
      : kind === "email" ? `/api/admin/events/payouts/${enc}/email-host`
        : `/api/admin/events/recoveries/${enc}/resolve`;
  const withBody = kind === "collected" || kind === "written_off";
  try {
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: withBody ? { "Content-Type": "application/json" } : undefined,
      body: withBody ? JSON.stringify({ action: kind }) : undefined,
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, auth: "unauthorized" };
    if (res.status === 403) return { ok: false, auth: "forbidden" };
    const body = await res.json().catch(() => null);
    return { ok: false, text: errorText(body, res.status) };
  } catch {
    return { ok: false, text: "Couldn't reach the server. Refresh to see where this stands before trying again." };
  }
}

export const actionKey = (kind: ActionKind, id: string) => `${kind}:${id}`;

/**
 * A row of action buttons with a two-step confirm. The first click turns the button into
 * "Confirm: <action>?" with a Cancel next to it; only the confirm sends the request.
 */
export function ActionGroup(props: {
  id: string;
  actions: { kind: ActionKind; tone: ActionTone }[];
  confirmKey: string | null;
  busy: boolean;
  onAsk: (key: string) => void;
  onCancel: () => void;
  onConfirm: (kind: ActionKind, id: string) => void;
  extra?: ReactNode;
  size?: "sm" | "md";
}) {
  const { id, actions, confirmKey, busy, onAsk, onCancel, onConfirm, extra, size = "sm" } = props;
  const pending = actions.find((a) => confirmKey === actionKey(a.kind, id));
  const sz = size === "md" ? " aem-btn-md" : "";
  if (pending) {
    return (
      <div className="aem-actions">
        <button
          type="button"
          className={`aem-btn aem-btn-${pending.tone}${sz}`}
          disabled={busy}
          onClick={() => onConfirm(pending.kind, id)}
        >
          {busy ? "Working…" : `Confirm: ${ACTION_LABEL[pending.kind]}?`}
        </button>
        <button type="button" className={`aem-btn aem-btn-ghost${sz}`} disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div className="aem-actions">
      {actions.map((a) => (
        <button
          key={a.kind}
          type="button"
          className={`aem-btn aem-btn-${a.tone}${sz}`}
          disabled={busy}
          onClick={() => onAsk(actionKey(a.kind, id))}
        >
          {ACTION_LABEL[a.kind]}
        </button>
      ))}
      {extra}
    </div>
  );
}

/* ---------- Banners and screens ---------- */

export type Notice = { kind: "ok" | "error"; text: string };

export function NoticeBanner({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div className={notice.kind === "ok" ? "aem-banner aem-banner-ok" : "aem-banner aem-banner-error"} role={notice.kind === "ok" ? "status" : "alert"}>
      <span>{notice.text}</span>
      <button type="button" className="aem-banner-x" aria-label="Dismiss" onClick={onClose}>×</button>
    </div>
  );
}

export const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AEM_CSS }} />
      <link href={FONTS_HREF} rel="stylesheet" />
      <div className="aem-page">{children}</div>
    </>
  );
}

export function StateScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Shell>
      <div className="aem-state">
        <div className="aem-state-title">{title}</div>
        {children ? <div className="aem-state-sub">{children}</div> : null}
      </div>
    </Shell>
  );
}

export function AuthScreen({ state, returnTo }: { state: "unauthorized" | "forbidden"; returnTo: string }) {
  if (state === "unauthorized") {
    return (
      <StateScreen title="Not signed in">
        <Link href={`/login?return=${encodeURIComponent(returnTo)}`} className="aem-link">Log in</Link> to access the admin dashboard.
      </StateScreen>
    );
  }
  return (
    <StateScreen title="Not authorized">
      Your account doesn&apos;t have admin access. Contact the platform owner if you believe this is a mistake.
    </StateScreen>
  );
}

/* ---------- Styles ---------- */

export const AEM_CSS = `
.aem-page, .aem-page *, .aem-page *::before, .aem-page *::after { box-sizing: border-box; }
.aem-page { font-family: 'Hanken Grotesk', 'Inter', sans-serif; color: #F5F0E6; max-width: 1376px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; min-width: 0; }
.aem-page a { color: inherit; text-decoration: none; }
.aem-link, .aem-page a.aem-link { color: #E8B930; font-weight: 600; }
.aem-page a.aem-link:hover { color: #F5CC50; }
.aem-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.aem-h1 { margin: 0; font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 1px; font-weight: 400; line-height: 1.05; }
.aem-sub { font-size: 14px; color: rgba(245,240,230,0.55); margin-top: 6px; }
.aem-h2 { margin: 0; font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 1px; font-weight: 400; }
.aem-count { background: rgba(255,107,107,0.15); color: #ff6b6b; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
.aem-select { height: 40px; padding: 0 14px; border-radius: 6px; border: 1px solid rgba(245,240,230,0.15); background: #000; color: #F5F0E6; font: 600 13px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.aem-select option { background: #111; }

.aem-tiles { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
.aem-tiles-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.aem-tile { background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08); border-radius: 10px; padding: 18px 20px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.aem-tile-label { font-size: 10.5px; letter-spacing: 1px; text-transform: uppercase; color: rgba(245,240,230,0.45); }
.aem-tile-value { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.5px; color: #E8B930; line-height: 1; overflow-wrap: anywhere; }
.aem-tile-hint { font-size: 12px; color: rgba(245,240,230,0.45); }

.aem-attn { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.aem-attn-card { background: rgba(255,107,107,0.05); border: 1px solid rgba(255,107,107,0.25); border-radius: 10px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.aem-attn-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.aem-attn-kind { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #ff6b6b; font-weight: 700; }
.aem-attn-amt { font-family: 'Bebas Neue', sans-serif; font-size: 22px; flex: none; }
.aem-attn-what { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.aem-attn-why { font-size: 12.5px; color: rgba(245,240,230,0.55); line-height: 1.5; overflow-wrap: anywhere; }
.aem-none { font-size: 13.5px; color: rgba(245,240,230,0.5); }

.aem-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.aem-btn { height: 36px; padding: 0 14px; border-radius: 6px; border: 1px solid transparent; font: 700 12.5px 'Hanken Grotesk', sans-serif; cursor: pointer; display: inline-flex; align-items: center; white-space: nowrap; }
.aem-btn-md { height: 40px; padding: 0 16px; font-size: 13px; }
.aem-btn-gold { background: #E8B930; color: #000; }
.aem-btn-gold:hover:not(:disabled) { background: #F5CC50; }
.aem-btn-green { background: #1A3C34; color: #F5F0E6; border-color: rgba(159,194,181,0.35); }
.aem-btn-green:hover:not(:disabled) { border-color: #9FC2B5; }
.aem-btn-ghost, .aem-page a.aem-btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; font-weight: 600; }
.aem-btn-ghost:hover:not(:disabled) { border-color: rgba(245,240,230,0.35); }
.aem-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.aem-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.aem-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.aem-chip { height: 36px; padding: 0 14px; border-radius: 18px; border: 1px solid rgba(245,240,230,0.15); background: transparent; color: #F5F0E6; font: 600 13px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.aem-chip[aria-pressed="true"] { border-color: #E8B930; background: #E8B930; color: #000; font-weight: 700; }
.aem-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; }
.aem-switch { display: flex; border: 1px solid rgba(245,240,230,0.15); border-radius: 8px; overflow: hidden; flex: none; }
.aem-switch button { height: 38px; padding: 0 16px; border: 0; background: transparent; color: rgba(245,240,230,0.7); font: 600 13px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.aem-switch button[aria-pressed="true"] { background: #1A3C34; color: #F5F0E6; font-weight: 700; }
.aem-search { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px; border-radius: 6px; border: 1px solid rgba(245,240,230,0.15); min-width: 260px; color: rgba(245,240,230,0.45); font-size: 13px; }
.aem-search input { flex: 1 1 auto; min-width: 0; background: transparent; border: 0; outline: none; color: #F5F0E6; font: 13px 'Hanken Grotesk', sans-serif; }
.aem-search:focus-within { border-color: rgba(232,185,48,0.5); }

.aem-scroll { overflow-x: auto; border: 1px solid rgba(245,240,230,0.08); border-radius: 10px; max-width: 100%; }
.aem-table { min-width: 1180px; }
.aem-grid { display: grid; grid-template-columns: 2.2fr 1.2fr 0.9fr 0.9fr 1fr 0.9fr 1fr 1fr 1.4fr; gap: 12px; padding: 14px 18px; align-items: center; }
.aem-thead { padding: 12px 18px; font-size: 10.5px; letter-spacing: 1px; text-transform: uppercase; color: rgba(245,240,230,0.45); border-bottom: 1px solid rgba(245,240,230,0.08); }
.aem-r { text-align: right; }
.aem-row { color: #F5F0E6; border-bottom: 1px solid rgba(245,240,230,0.06); font-size: 13.5px; }
.aem-page a.aem-row:hover { background: rgba(245,240,230,0.03); }
.aem-row-title { font-weight: 600; overflow-wrap: anywhere; }
.aem-row-sub { font-size: 12px; color: rgba(245,240,230,0.45); margin-top: 3px; overflow-wrap: anywhere; }
.aem-dim { font-size: 12.5px; color: rgba(245,240,230,0.75); }
.aem-muted { color: rgba(245,240,230,0.6); }
.aem-strong { font-weight: 600; }
.aem-gold { color: #E8B930; }
.aem-group { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; background: rgba(245,240,230,0.035); border-bottom: 1px solid rgba(245,240,230,0.06); flex-wrap: wrap; }
.aem-group-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
.aem-group-name { font-weight: 700; font-size: 14px; }
.aem-group-hint { font-size: 12px; color: rgba(245,240,230,0.5); }
.aem-group-sums { display: flex; gap: 22px; font-size: 12.5px; color: rgba(245,240,230,0.6); flex-wrap: wrap; }
.aem-group-sums b { font-weight: 600; color: #F5F0E6; }
.aem-group-sums b.aem-gold { color: #E8B930; font-weight: 700; }
.aem-group-sums b.aem-green { color: #9FC2B5; }
.aem-dot { width: 10px; height: 10px; border-radius: 5px; flex: none; }
.aem-dot-urgent { background: #ff6b6b; }
.aem-dot-soon { background: #E8B930; }
.aem-dot-calm { background: #1A3C34; border: 1px solid #9FC2B5; }
.aem-avatar { width: 30px; height: 30px; border-radius: 15px; background: #1A3C34; color: #9FC2B5; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex: none; }
.aem-kind { font-size: 11px; color: rgba(245,240,230,0.5); border: 1px solid rgba(245,240,230,0.15); padding: 2px 8px; border-radius: 999px; }
.aem-ok-text { font-size: 12px; color: #9FC2B5; }
.aem-bad-text { font-size: 12px; color: #ff6b6b; }
.aem-empty { padding: 40px 20px; text-align: center; color: rgba(245,240,230,0.4); font-size: 14px; }
.aem-foot { font-size: 12px; color: rgba(245,240,230,0.4); line-height: 1.6; }

.aem-pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.aem-pill-gold { background: rgba(232,185,48,0.15); color: #E8B930; }
.aem-pill-green { background: #1A3C34; color: #9FC2B5; }
.aem-pill-red { background: rgba(255,107,107,0.15); color: #ff6b6b; }
.aem-pill-grey { background: rgba(245,240,230,0.08); color: rgba(245,240,230,0.7); font-weight: 600; }

.aem-banner { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-radius: 8px; padding: 12px 14px; font-size: 13px; line-height: 1.45; }
.aem-banner-ok { background: #1A3C34; border: 1px solid rgba(159,194,181,0.45); color: #9FC2B5; }
.aem-banner-error { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); color: #ff6b6b; }
.aem-banner-x { background: transparent; border: 0; color: inherit; font-size: 18px; line-height: 1; cursor: pointer; padding: 0 2px; }
.aem-loading { font-size: 12.5px; color: rgba(245,240,230,0.5); }

.aem-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 40vh; text-align: center; gap: 8px; }
.aem-state-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #F5F0E6; }
.aem-state-sub { color: rgba(245,240,230,0.5); font-size: 14px; max-width: 420px; }

/* Event page */
.aem-back { font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; }
.aem-page a.aem-back { color: #E8B930; }
.aem-ev-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.aem-ev-id { display: flex; gap: 16px; align-items: center; min-width: 0; }
.aem-cover { width: 84px; height: 84px; border-radius: 12px; background: #1A3C34; color: #9FC2B5; font-family: 'Bebas Neue', sans-serif; font-size: 34px; display: flex; align-items: center; justify-content: center; flex: none; }
.aem-ev-title { margin: 0; font-family: 'Bebas Neue', sans-serif; font-size: 34px; letter-spacing: 1px; font-weight: 400; line-height: 1; overflow-wrap: anywhere; }
.aem-ev-meta { font-size: 14px; color: rgba(245,240,230,0.6); margin: 6px 0; }
.aem-pills { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.aem-card { background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08); border-radius: 10px; min-width: 0; }
.aem-host { padding: 14px 18px; display: flex; flex-direction: column; gap: 6px; min-width: 300px; max-width: 100%; }
.aem-host-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.aem-cols { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start; }
.aem-col-main { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.aem-col-side { flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.aem-box { border: 1px solid rgba(245,240,230,0.08); border-radius: 10px; min-width: 0; }
.aem-box-title { padding: 14px 18px; font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 1px; border-bottom: 1px solid rgba(245,240,230,0.08); }
.aem-types { min-width: 640px; }
.aem-tgrid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr 1fr; gap: 12px; padding: 12px 18px; font-size: 13.5px; }
.aem-tgrid + .aem-tgrid { border-top: 1px solid rgba(245,240,230,0.06); }
.aem-tgrid.aem-thead { padding: 10px 18px; font-size: 10.5px; border-bottom: 0; }
.aem-tgrid.aem-total { border-top: 1px solid rgba(245,240,230,0.15); font-weight: 700; }
.aem-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 16px 18px; }
.aem-stat-label { font-size: 12px; color: rgba(245,240,230,0.5); }
.aem-stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
.aem-pad { padding: 18px; }
.aem-rec { padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; }
.aem-rec + .aem-rec { border-top: 1px solid rgba(245,240,230,0.06); }
.aem-rec-top { display: flex; justify-content: space-between; gap: 10px; align-items: center; flex-wrap: wrap; }
.aem-payout { border: 1px solid rgba(245,240,230,0.08); border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.aem-payout-bad { border-color: rgba(255,107,107,0.3); background: rgba(255,107,107,0.04); }
.aem-payout-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.aem-payout-amt { font-family: 'Bebas Neue', sans-serif; font-size: 40px; color: #E8B930; line-height: 1; }
.aem-kv { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
.aem-kv > div { display: flex; justify-content: space-between; gap: 10px; }
.aem-kv > div > span:first-child { color: rgba(245,240,230,0.55); }
.aem-kv > div > span:last-child { text-align: right; overflow-wrap: anywhere; }
.aem-err { background: rgba(0,0,0,0.35); border-radius: 8px; padding: 12px; font-size: 12.5px; color: rgba(245,240,230,0.75); line-height: 1.5; overflow-wrap: anywhere; }
.aem-activity { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.aem-act { display: flex; gap: 12px; }
.aem-act-dot { width: 8px; height: 8px; border-radius: 4px; background: #E8B930; margin-top: 6px; flex: none; }
.aem-act-text { font-size: 13px; overflow-wrap: anywhere; }
.aem-act-when { font-size: 11.5px; color: rgba(245,240,230,0.45); margin-top: 2px; }

@media (max-width: 1200px) {
  .aem-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .aem-attn { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 767px) {
  .aem-page { gap: 20px; }
  .aem-h1 { font-size: 30px; }
  .aem-tiles, .aem-tiles-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .aem-tile { padding: 12px 14px; gap: 6px; }
  .aem-tile-value { font-size: 24px; }
  .aem-attn { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .aem-tools { width: 100%; }
  .aem-search { min-width: 0; flex: 1 1 100%; }
  .aem-switch button { height: 44px; padding: 0 18px; }
  .aem-host { min-width: 0; width: 100%; }
  .aem-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .aem-cover { width: 64px; height: 64px; font-size: 26px; }
  .aem-ev-title { font-size: 28px; }
}
`;
