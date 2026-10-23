/**
 * Query allowlists for the Discover BFF. Only keys with a rule are forwarded, and only when the rule accepts the
 * value. lat, lng and city have no rule on purpose: the backend saves lat/lng to the signed-in user's profile.
 */
export type KeyRules = Record<string, (v: string) => boolean>;

const intIn = (min: number, max: number) => (v: string) => /^\d{1,9}$/.test(v) && Number(v) >= min && Number(v) <= max;

export const FEED_RULES: KeyRules = {
  limit: intIn(1, 50),
  scope: (v) => v === "following",
  offset: intIn(0, 1_000_000),
};

export const PULSE_RULES: KeyRules = {
  limit: intIn(1, 20),
  cursor: (v) => v.length <= 24 && /^[A-Za-z0-9+/=_-]+$/.test(v),
};

export function pickKeys(params: URLSearchParams, rules: KeyRules): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, ok] of Object.entries(rules)) {
    const value = params.get(key);
    if (value !== null && ok(value)) out.set(key, value);
  }
  return out;
}
