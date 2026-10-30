// Rules for the event link share image (photo ratios 3c). Pure, unit tested in tests/share-image.test.ts.

/** Link previews (Facebook, iMessage, X, WhatsApp) use this wide size. */
export const SHARE_SIZE = { width: 1200, height: 630 } as const;

/** The flyer sits inside this margin, whole, over the blurred copy. */
export const SHARE_MARGIN = 36;

/** Covers bigger than this are not drawn (the plain card is used instead). */
export const MAX_COVER_BYTES = 8 * 1024 * 1024;

/** Only https covers, JPEG or PNG (what the image renderer can draw), and not too big. */
export function coverUsable(url: string | null | undefined, contentType: string | null, bytes: number): boolean {
  if (!url || !/^https:\/\//i.test(url)) return false;
  const type = (contentType || "").split(";")[0].trim().toLowerCase();
  if (type !== "image/jpeg" && type !== "image/png") return false;
  return bytes > 0 && bytes <= MAX_COVER_BYTES;
}

/** Short title for the plain card, so it never runs off the image. */
export function shareTitle(title: string | null | undefined): string {
  const t = (title || "").replace(/\s+/g, " ").trim();
  if (!t) return "Outsyde";
  return t.length > 70 ? `${t.slice(0, 67).trimEnd()}…` : t;
}
