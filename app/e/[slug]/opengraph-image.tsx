// Event link share image (photo ratios 3c): the whole 4:5 flyer, centered over a blurred copy of
// itself, at the wide size link previews use. No cover, or a cover that can't be drawn, gives a plain
// Outsyde card with the event title. Never any address.
import { ImageResponse } from "next/og";
import { SLUG_RE, fetchAnonymous } from "./eventFetch";
import { MAX_COVER_BYTES, SHARE_MARGIN, SHARE_SIZE, coverUsable, shareTitle } from "./shareImage";

export const alt = "Event on Outsyde";
export const size = SHARE_SIZE;
export const contentType = "image/png";

async function coverDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 300 } });
    if (!res.ok) return null;
    const declared = Number(res.headers.get("content-length") || 0);
    if (declared > MAX_COVER_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type");
    if (!coverUsable(url, type, buf.length)) return null;
    return `data:${(type || "").split(";")[0].trim()};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug.toLowerCase();
  const payload = SLUG_RE.test(slug) ? (await fetchAnonymous(slug)).payload : null;
  const event = payload?.event;
  // Drafts are 404 for anonymous callers, so they never reach here with a cover.
  const cover = event && event.status !== "draft" ? await coverDataUrl(event.coverImageUrl) : null;
  const { width, height } = SHARE_SIZE;

  if (cover) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0B0B0B" }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- rendered to a PNG, not a page */}
          <img src={cover} width={width + 160} height={height + 160}
            style={{ position: "absolute", left: -80, top: -80, width: width + 160, height: height + 160, objectFit: "cover", filter: "blur(40px) brightness(0.6)" }} />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- rendered to a PNG, not a page */}
          <img src={cover} width={width - SHARE_MARGIN * 2} height={height - SHARE_MARGIN * 2}
            style={{ position: "absolute", left: SHARE_MARGIN, top: SHARE_MARGIN, width: width - SHARE_MARGIN * 2, height: height - SHARE_MARGIN * 2, objectFit: "contain" }} />
        </div>
      ),
      { ...SHARE_SIZE },
    );
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px 88px", background: "#1A3C34", color: "#F5F0E6" }}>
        <div style={{ fontSize: 26, letterSpacing: 6, color: "#E8B930", marginBottom: 28 }}>OUTSYDE EVENT</div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>{shareTitle(event?.title)}</div>
      </div>
    ),
    { ...SHARE_SIZE },
  );
}
