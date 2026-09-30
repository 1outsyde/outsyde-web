/**
 * Post-login redirect target. Returns the value only when it is a same-origin PATH:
 * starts with a single "/", no "//", no backslash, no whitespace or control characters
 * (browsers strip tabs/newlines, so "/\t/evil.com" would otherwise become "//evil.com"),
 * and it resolves to the same origin. Anything else → "/".
 */
export function safeReturn(value: string | null | undefined, origin: string): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  if (/[\s\x00-\x1f\x7f]/.test(value)) return "/";
  try {
    if (new URL(value, origin).origin !== origin) return "/";
  } catch {
    return "/";
  }
  return value;
}
