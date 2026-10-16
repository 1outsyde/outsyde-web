// Shared bits for the Admin → Emails Broadcast and History tabs (PR D).
// The Account setup tab keeps its own copies on purpose (it was moved unchanged).
// Class names here all start with "em-" so they never collide with the Account setup tab's CSS.
// Copy follows the house style: plain punctuation, no dashes.

export type AuthState = "loading" | "ok" | "unauthorized" | "forbidden";

export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number; // 0 = the server could not be reached
  data: T | null;
}

/** fetch + JSON for the admin BFFs. Never throws. */
export async function api<T = Record<string, unknown>>(url: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** Reads { error: "text" } (BFF) or { error: { code, message } } (backend). */
export function errorText(data: unknown, fallback: string): string {
  const d = data as { error?: unknown; message?: unknown } | null;
  if (d && typeof d.error === "string" && d.error) return d.error;
  if (d && d.error && typeof d.error === "object") {
    const m = (d.error as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  if (d && typeof d.message === "string" && d.message) return d.message;
  return fallback;
}

export const OFFLINE = "Couldn't reach the server. Check your connection and try again.";

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Oct 16, 2026, 9:41 AM" in New York time (the daily limit also counts New York days). */
export function when(value: unknown): string {
  if (typeof value !== "string" && !(value instanceof Date)) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : DATE_FMT.format(d);
}

export const AUDIENCE_LABEL: Record<string, string> = {
  picked: "Picked people",
  vendors: "All vendors",
  photographers: "All photographers",
  consumers: "All consumers",
  all: "All users",
};

export const ROLE_LABEL: Record<string, string> = {
  consumer: "Customer",
  business: "Business",
  photographer: "Photographer",
  staff: "Staff",
};

export interface Person {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  canBroadcast: boolean;
  unsubscribed: boolean;
}

/** Why a person can't be ticked for an announcement. */
export function whyNot(p: Person): string {
  if (p.unsubscribed) return "Unsubscribed from announcements";
  if (!p.email) return "No email on the account";
  return "Can't get announcements (disabled, demo or admin account)";
}

export function personName(p: { name?: string | null; email?: string | null }): string {
  return p.name?.trim() || p.email || "Unknown account";
}

export function StateMsg({ state }: { state: "unauthorized" | "forbidden" }) {
  return (
    <div className="em-state">
      <div className="em-state-title">{state === "unauthorized" ? "Not signed in" : "Not authorized"}</div>
      <div className="em-state-sub">
        {state === "unauthorized" ? (
          <>
            <a href="/login" style={{ color: "#E8B930" }}>Log in</a> to access the admin dashboard.
          </>
        ) : (
          "Your account doesn't have admin access."
        )}
      </div>
    </div>
  );
}

export const EM_CSS = `
  .em-wrap { font-family: 'Hanken Grotesk', 'Inter', sans-serif; max-width: 980px; }
  .em-wrap *, .em-wrap *::before, .em-wrap *::after { box-sizing: border-box; }
  .em-sub { color: rgba(245,240,230,0.5); font-size: 14px; margin-bottom: 20px; max-width: 660px; line-height: 1.55; }
  .em-label { display: block; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,240,230,0.5); margin: 22px 0 8px; }
  .em-input, .em-textarea { width: 100%; font-family: inherit; font-size: 14px; color: #F5F0E6; background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.12); border-radius: 8px; padding: 10px 12px; outline: none; }
  .em-input:focus, .em-textarea:focus { border-color: rgba(232,185,48,0.6); }
  .em-textarea { min-height: 260px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; line-height: 1.5; }
  .em-hint { font-size: 12px; color: rgba(245,240,230,0.45); margin-top: 6px; line-height: 1.5; }
  .em-audiences { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
  .em-aud { text-align: left; font-family: inherit; cursor: pointer; padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(245,240,230,0.12); background: rgba(245,240,230,0.02); color: rgba(245,240,230,0.75); }
  .em-aud.on { border-color: #E8B930; background: rgba(232,185,48,0.1); color: #E8B930; }
  .em-aud-name { font-size: 13.5px; font-weight: 600; }
  .em-aud-n { font-size: 12px; opacity: 0.75; margin-top: 3px; }
  .em-row { display: flex; align-items: flex-start; gap: 12px; padding: 11px 14px; border-radius: 8px; background: rgba(245,240,230,0.02); border: 1px solid rgba(245,240,230,0.06); margin-bottom: 8px; }
  .em-row.on { border-color: rgba(232,185,48,0.45); background: rgba(232,185,48,0.06); }
  .em-row.off { opacity: 0.55; }
  .em-row.click { cursor: pointer; }
  .em-row.click:hover { border-color: rgba(245,240,230,0.18); }
  .em-row input { margin-top: 3px; accent-color: #E8B930; width: 16px; height: 16px; flex: none; cursor: pointer; }
  .em-row-main { min-width: 0; flex: 1; }
  .em-row-title { font-size: 14px; color: #F5F0E6; font-weight: 500; overflow-wrap: anywhere; }
  .em-row-meta { font-size: 12px; color: rgba(245,240,230,0.45); margin-top: 4px; overflow-wrap: anywhere; line-height: 1.7; }
  .em-row-side { flex: none; text-align: right; font-size: 12px; color: rgba(245,240,230,0.55); line-height: 1.6; }
  .em-tag { display: inline-block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: rgba(245,240,230,0.08); color: rgba(245,240,230,0.65); margin-right: 6px; white-space: nowrap; }
  .em-tag-gold { background: rgba(232,185,48,0.14); color: #E8B930; }
  .em-tag-green { background: rgba(74,222,128,0.12); color: #4ade80; }
  .em-tag-red { background: rgba(255,107,107,0.12); color: #ff6b6b; }
  .em-tag-blue { background: rgba(125,170,255,0.14); color: #9db9ff; }
  .em-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .em-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 5px 6px 5px 11px; border-radius: 999px; border: 1px solid rgba(232,185,48,0.4); color: #E8B930; max-width: 100%; }
  .em-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .em-chip button { background: none; border: 0; color: inherit; cursor: pointer; font-size: 14px; line-height: 1; padding: 0 4px; }
  .em-btn { font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 9px 16px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; letter-spacing: 0.03em; }
  .em-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .em-btn-gold { background: #E8B930; color: #000; }
  .em-btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
  .em-btn-small { padding: 6px 11px; font-size: 12px; }
  .em-link { background: none; border: 0; color: #E8B930; font: inherit; font-size: 12.5px; cursor: pointer; padding: 0; text-decoration: underline; }
  .em-bar { position: sticky; bottom: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; margin-top: 22px; background: #0b0b0b; border: 1px solid rgba(245,240,230,0.12); border-radius: 10px; z-index: 5; }
  .em-bar-text { font-size: 13.5px; color: rgba(245,240,230,0.75); overflow-wrap: anywhere; min-width: 0; }
  .em-bar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .em-confirm { color: #E8B930; }
  .em-banner { border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
  .em-banner-ok { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
  .em-banner-err { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); color: #ff6b6b; }
  .em-banner-info { background: rgba(232,185,48,0.08); border: 1px solid rgba(232,185,48,0.3); color: #E8B930; }
  .em-progress { height: 8px; border-radius: 999px; background: rgba(245,240,230,0.08); overflow: hidden; margin-top: 8px; }
  .em-progress > div { height: 100%; background: #E8B930; transition: width .4s; }
  .em-preview { border: 1px solid rgba(245,240,230,0.12); border-radius: 10px; overflow: hidden; background: #0b0b0b; }
  .em-preview-head { padding: 12px 14px; border-bottom: 1px solid rgba(245,240,230,0.08); font-size: 12px; color: rgba(245,240,230,0.5); line-height: 1.6; overflow-wrap: anywhere; }
  .em-preview-head b { color: #F5F0E6; font-weight: 600; }
  .em-preview iframe { display: block; width: 100%; height: 520px; border: 0; background: #fff; }
  .em-empty { padding: 18px; color: rgba(245,240,230,0.35); font-size: 13.5px; border: 1px dashed rgba(245,240,230,0.1); border-radius: 8px; }
  .em-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 30vh; text-align: center; gap: 8px; }
  .em-state-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #F5F0E6; }
  .em-state-sub { color: rgba(245,240,230,0.5); font-size: 14px; max-width: 400px; }
  .em-seg { display: inline-flex; border: 1px solid rgba(245,240,230,0.14); border-radius: 999px; padding: 3px; margin-bottom: 18px; }
  .em-seg button { font-family: inherit; font-size: 12.5px; padding: 6px 14px; border-radius: 999px; border: 0; background: transparent; color: rgba(245,240,230,0.65); cursor: pointer; }
  .em-seg button.on { background: rgba(232,185,48,0.16); color: #E8B930; }
  .em-kv { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; font-size: 13px; margin: 6px 0 18px; }
  .em-kv dt { color: rgba(245,240,230,0.45); }
  .em-kv dd { margin: 0; color: #F5F0E6; overflow-wrap: anywhere; }
  .em-h2 { font-size: 16px; color: #F5F0E6; font-weight: 600; margin: 4px 0 6px; overflow-wrap: anywhere; }
  @media (max-width: 640px) {
    .em-row { flex-wrap: wrap; }
    .em-row-side { text-align: left; flex-basis: 100%; padding-left: 0; }
    .em-preview iframe { height: 420px; }
    .em-bar { flex-direction: column; align-items: stretch; }
    .em-bar-actions > .em-btn { flex: 1; }
  }
`;
