/**
 * Read an upstream (outsyde-backend) response for a BFF route without ever throwing.
 *
 * The body is read as text and parsed in a try/catch, so an HTML 502 from a gateway or an empty
 * body becomes { error: "Unexpected response from server" } instead of an unhandled exception.
 * `error` is always normalised to a string (authMiddleware 401s send { error: { code, message } };
 * the rate limiter sends a plain `message`), and an object error's `code` is kept as `code`.
 */

export const UNEXPECTED_RESPONSE_MESSAGE = "Unexpected response from server";

export interface SafeJson {
  status: number;
  data: Record<string, unknown>;
}

export async function readJsonSafe(res: Response): Promise<SafeJson> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }

  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    // A success status with an unreadable body is not a success we can pass on.
    return { status: res.ok ? 502 : res.status, data: { error: UNEXPECTED_RESPONSE_MESSAGE } };
  }

  const data = { ...(parsed as Record<string, unknown>) };
  const err = data.error;
  if (err !== undefined && err !== null && typeof err === "object") {
    const obj = err as { message?: unknown; code?: unknown };
    if (typeof obj.code === "string" && data.code === undefined) data.code = obj.code;
    data.error = typeof obj.message === "string" ? obj.message : UNEXPECTED_RESPONSE_MESSAGE;
  } else if (typeof err !== "string" && !res.ok && typeof data.message === "string") {
    data.error = data.message;
  }
  return { status: res.status, data };
}
