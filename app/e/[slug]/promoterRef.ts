/**
 * Promoter link memory for goutsyde.com/e/<slug> (Event team step 3).
 *
 * A promoter shares `/e/<slug>?ref=<CODE>`. The page drops the address bar query in several places (opening and
 * closing checkout, the sign in sheet, /login and /claim round trips), so the code is saved when the page opens
 * and sent as `linkCode` with checkout and RSVP. Rules (Legend 2026-10-30): kept per event, in this browser, for
 * 7 days; the last link opened wins. The backend decides whether the code counts; a code it doesn't count never
 * blocks the sale. Storage that is missing or throws (private mode, blocked site data) never breaks the page: the
 * code is then kept in memory for this visit only (lost on a full reload).
 */

/** Same shape the backend accepts: 8 of A-Z (no I, O) and 2-9. */
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export const REF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type RefStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Saved = { code: string; savedAt: number };

/** Used only when storage is missing or throws, so this visit still counts. Working storage is the source of truth. */
const memory = new Map<string, Saved>();

function isFresh(savedAt: unknown, now: number): savedAt is number {
  return typeof savedAt === "number" && savedAt <= now && now - savedAt < REF_TTL_MS;
}

export function refStorageKey(eventId: string): string {
  return `outsyde:promoter-ref:${eventId}`;
}

export function normalizeRef(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

/** The code in `?ref=` (the first one), or null. */
export function refFromSearch(search: string): string | null {
  try {
    return normalizeRef(new URLSearchParams(search).get("ref"));
  } catch {
    return null;
  }
}

/**
 * Saves the address bar code for this event (replacing an earlier one) and returns it, or null when the address
 * has no valid code. Never throws.
 */
export function rememberRefFromUrl(storage: RefStorage | null, eventId: string, search: string, now: number): string | null {
  if (!eventId) return null;
  const code = refFromSearch(search);
  if (!code) return null;
  memory.set(eventId, { code, savedAt: now });
  try {
    storage?.setItem(refStorageKey(eventId), JSON.stringify({ code, savedAt: now }));
  } catch {
    /* storage unavailable: the in-memory copy covers this visit */
  }
  return code;
}

/** The code remembered for this event while it is under 7 days old, else null. Never throws. */
export function readRef(storage: RefStorage | null, eventId: string, now: number): string | null {
  if (!eventId) return null;
  if (!storage) return fromMemory(eventId, now);
  const key = refStorageKey(eventId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    let saved: unknown;
    try { saved = JSON.parse(raw); } catch { saved = null; }
    const code = normalizeRef((saved as { code?: unknown } | null)?.code);
    const savedAt = (saved as { savedAt?: unknown } | null)?.savedAt;
    if (code && isFresh(savedAt, now)) return code;
    storage.removeItem(key);
    return null;
  } catch {
    return fromMemory(eventId, now);
  }
}

function fromMemory(eventId: string, now: number): string | null {
  const m = memory.get(eventId);
  if (m && isFresh(m.savedAt, now)) return m.code;
  memory.delete(eventId);
  return null;
}

/** The request body with `linkCode` added only when there is a code, so a visit without a link sends exactly what it did before. */
export function withLinkCode<T extends Record<string, unknown>>(body: T, code: string | null): T | (T & { linkCode: string }) {
  return code ? { ...body, linkCode: code } : body;
}

/** The browser's localStorage, or null where it can't be reached. */
export function browserStorage(): RefStorage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
