"use client";
/* eslint-disable @next/next/no-img-element -- plain lazy <img> as on /events (controller ruling); feed media comes from many hosts */

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { PostMedia as Media } from "../_lib/feedLogic";
import HlsVideo from "./HlsVideo";
import { useMediaSuspended } from "./mediaSuspend";
import styles from "./discover.module.css";

// Only one feed video plays at a time: the newest one to come into view takes over.
let activeFeedVideo: (() => void) | null = null;

function FeedVideo({ url, poster }: { url: string | null; poster: string | null }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [near, setNear] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  // The story viewer covers the feed: nothing here plays, and this video gives up ownership.
  const suspended = useMediaSuspended();
  const failed = url !== null && failedUrl === url;
  const playing = inView && !suspended && !failed;

  // Two observers: one says when the box is mostly on screen (play), the other when it is within
  // about one screen of the viewport (mount the player, so hls.js only starts for nearby videos).
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !url) return;
    const view = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.6),
      { threshold: [0, 0.6] },
    );
    const around = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "100% 0px" });
    view.observe(box);
    around.observe(box);
    return () => {
      view.disconnect();
      around.disconnect();
    };
  }, [url]);

  // Ownership follows playing: taking over pauses the previous owner, and a suspended or hidden video lets go.
  useEffect(() => {
    if (!playing) return;
    const release = () => setInView(false);
    if (activeFeedVideo) activeFeedVideo();
    activeFeedVideo = release;
    return () => {
      if (activeFeedVideo === release) activeFeedVideo = null;
    };
  }, [playing]);

  const onError = useCallback(() => setFailedUrl(url), [url]);

  if (!url) {
    return poster ? (
      <img className={styles.mediaImg} src={poster} alt="" loading="lazy" />
    ) : (
      <div className={styles.mediaPlaceholder}>Video processing</div>
    );
  }
  const mounted = (near || inView) && !failed;
  return (
    <div ref={boxRef} className={styles.mediaFill} data-feed-video={failed ? "failed" : mounted ? "mounted" : "idle"}>
      {mounted ? (
        <HlsVideo src={url} poster={poster} active={playing} muted={muted} loop onError={onError} />
      ) : poster ? (
        <img className={styles.mediaImg} src={poster} alt="" loading="lazy" draggable={false} />
      ) : (
        <div className={styles.mediaPlaceholder} />
      )}
      {failed ? <span className={styles.pulseUnavailable}>Video unavailable</span> : null}
      {mounted ? (
        <button
          type="button"
          className={styles.soundBtn}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
          onPointerUp={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            {muted ? <path d="m23 9-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
          </svg>
        </button>
      ) : null}
    </div>
  );
}

function Carousel({ urls }: { urls: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const go = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(urls.length - 1, i));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };
  const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
  return (
    <div className={styles.mediaFill}>
      <div
        ref={trackRef}
        className={styles.carouselTrack}
        onScroll={(e) => {
          const t = e.currentTarget;
          setIndex(Math.round(t.scrollLeft / Math.max(1, t.clientWidth)));
        }}
      >
        {urls.map((u, i) => (
          <div key={`${i}-${u}`} className={styles.carouselSlide}>
            <img className={styles.mediaImg} src={u} alt="" loading="lazy" draggable={false} />
          </div>
        ))}
      </div>
      <span className={styles.carouselCount}>{index + 1}/{urls.length}</span>
      {index > 0 ? (
        <button type="button" className={`${styles.carouselBtn} ${styles.carouselPrev}`} aria-label="Previous photo"
          onClick={(e) => { stop(e); go(index - 1); }} onPointerUp={stop} onDoubleClick={stop}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
      ) : null}
      {index < urls.length - 1 ? (
        <button type="button" className={`${styles.carouselBtn} ${styles.carouselNext}`} aria-label="Next photo"
          onClick={(e) => { stop(e); go(index + 1); }} onPointerUp={stop} onDoubleClick={stop}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      ) : null}
      <div className={styles.carouselDots} aria-hidden="true">
        {urls.map((u, i) => (
          <span key={`${i}-${u}`} className={i === index ? `${styles.dot} ${styles.dotOn}` : styles.dot} />
        ))}
      </div>
    </div>
  );
}

/**
 * Post media: image, carousel or feed video. A double click (mouse) or double tap
 * (touch) calls onDoubleTap; when it returns true, a heart pops over the media.
 */
/** `aspect` is the post's shape (width / height, 4:5 to 1.91:1); the box takes it. */
export default function PostMedia({ media, aspect, onDoubleTap }: { media: Media; aspect: number; onDoubleTap(): boolean }) {
  const [heart, setHeart] = useState(0);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const down = useRef({ x: 0, y: 0 });
  const lastFire = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (media.kind === "none") return null;

  const fire = () => {
    const now = performance.now();
    if (now - lastFire.current < 400) return; // touch browsers may also send dblclick
    lastFire.current = now;
    if (!onDoubleTap()) return;
    setHeart((h) => h + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHeart(0), 700);
  };
  const onPointerDown = (e: PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return; // mice use dblclick
    if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 10) return; // a swipe, not a tap
    const now = performance.now();
    const prev = lastTap.current;
    if (now - prev.t < 300 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 40) {
      lastTap.current = { t: 0, x: 0, y: 0 };
      fire();
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
  };

  return (
    <div className={styles.media} style={{ aspectRatio: String(aspect) }} data-aspect={aspect.toFixed(3)} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onDoubleClick={fire}>
      {media.kind === "image" ? <img className={styles.mediaImg} src={media.url} alt="" loading="lazy" draggable={false} /> : null}
      {media.kind === "carousel" ? <Carousel urls={media.urls} /> : null}
      {media.kind === "video" ? <FeedVideo url={media.url} poster={media.poster} /> : null}
      {heart > 0 ? (
        <svg key={heart} className={styles.heartPop} width="96" height="96" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
          <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" />
        </svg>
      ) : null}
    </div>
  );
}
