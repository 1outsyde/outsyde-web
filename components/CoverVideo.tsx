"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { isPlayableUrl, muxThumbnailUrl } from "@/lib/coverMedia";

type Props = {
  src: string | null | undefined;
  poster?: string | null;
  className?: string;
  style?: CSSProperties;
};

/**
 * Muted, looping cover video. Mux covers are HLS (.m3u8): Safari plays them
 * natively, every other browser goes through hls.js (loaded only when needed).
 * A value that isn't a URL yet is a Mux upload id still processing.
 */
export default function CoverVideo({ src, poster, className, style }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const playable = isPlayableUrl(src);
  const posterUrl = poster || muxThumbnailUrl(src) || undefined;

  useEffect(() => {
    const video = ref.current;
    if (!video || !playable || !src) return;
    let destroy: (() => void) | undefined;
    let cancelled = false;

    const isHls = /\.m3u8(\?|$)/i.test(src);
    if (!isHls || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) { video.src = src; return; }
        const hls = new Hls({ capLevelToPlayerSize: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
        destroy = () => hls.destroy();
      }).catch(() => { /* poster stays visible */ });
    }
    return () => {
      cancelled = true;
      destroy?.();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, playable]);

  if (!playable) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background: "linear-gradient(135deg, #1a1a1a 0%, #2d2410 60%, #0a0a0a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.7)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.4,
        }}
      >
        Processing video...
      </div>
    );
  }

  return (
    <video
      ref={ref}
      className={className}
      style={{ objectFit: "cover", ...style }}
      poster={posterUrl}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}
