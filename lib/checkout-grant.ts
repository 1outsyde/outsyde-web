/**
 * Plan checkout + grant links (pure helpers; unit-tested with `npx tsx tests/checkout-grant.test.ts`).
 *
 * A grandfathered grant link lands on /subscription/manage?tier=…&grant=<signed token>. The token
 * must travel with the checkout request so the backend can allow the hidden plan for THIS
 * business. It is only ever forwarded, never logged.
 */

export const TIER_NOT_AVAILABLE = "TIER_NOT_AVAILABLE";

export const GRANT_EXPIRED_OR_WRONG_ACCOUNT =
  "This link has expired or isn't for this account. Ask Outsyde for a new one.";
export const PLAN_NOT_AVAILABLE = "This plan isn't available for your account.";

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Body for the checkout request (page → BFF, and BFF → backend): { tierId, grant } when a
 * non-empty string grant is present, otherwise exactly { tierId } as before.
 */
export function buildCheckoutBody(tierId: string, grant: unknown): { tierId: string; grant?: string } {
  return nonEmptyString(grant) ? { tierId, grant } : { tierId };
}

/**
 * Message for a failed checkout, or null to keep the existing behaviour (show the server's
 * error). Only 403 + TIER_NOT_AVAILABLE is special-cased.
 */
export function tierNotAvailableMessage(
  res: { status: number; code?: unknown },
  grantSent: boolean,
): string | null {
  if (res.status !== 403 || res.code !== TIER_NOT_AVAILABLE) return null;
  return grantSent ? GRANT_EXPIRED_OR_WRONG_ACCOUNT : PLAN_NOT_AVAILABLE;
}
