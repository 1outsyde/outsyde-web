"use client";

import { useEffect, useRef, type RefObject } from "react";
import styles from "./discover.module.css";

type OnTime = (watchedMs: number, durationMs: number, loops: number) => void;
type Clock = { watched: number; since: number; loops: number; lastPos: number };

function stopClock(c: Clock) {
  if (c.since > 0) c.watched += performance.now() - c.since;
  c.since = 0;
}

/** Hands the time played since the last report to the caller, then starts over. */
function report(video: HTMLVideoElement, c: Clock, onTime: RefObject<OnTime | undefined>) {
  stopClock(c);
  const watched = Math.round(c.watched);
  const loops = c.loops;
  c.watched = 0;
  c.loops = 0;
  if (watched <= 0) return;
  const d = video.duration;
  onTime.current?.(watched, Number.isFinite(d) && d > 0 ? Math.round(d * 1000) : 0, loops);
}

/**
 * One video element for feed posts and Pulse. Plays only while `active`. Mux HLS
 * plays natively where the browser can (Safari); elsewhere hls.js is loaded on demand.
 * `onTime` gets the time actually played while active (not the position), the
 * duration and the loop count, each time the video stops being active or goes away.
 */
export default function HlsVideo({ src, poster, active, muted, loop, onTime }: {
  src: string;
  poster: string | null;
  active: boolean;
  muted: boolean;
  loop: boolean;
  onTime?(watchedMs: number, durationMs: number, loops: number): void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const activeRef = useRef(active);
  const onTimeRef = useRef<OnTime | undefined>(onTime);
  const clock = useRef<Clock>({ watched: 0, since: 0, loops: 0, lastPos: 0 });
  const startLoad = useRef<(() => void) | null>(null); // set while an hls.js instance waits to load

  useEffect(() => {
    onTimeRef.current = onTime;
  });

  // Attach the source; tear it (and any hls.js instance) down on unmount or a new src.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const c = clock.current;
    let cancelled = false;
    let destroy: (() => void) | null = null;
    const playIfActive = () => {
      if (activeRef.current) video.play().catch(() => {});
    };

    const isHls = /\.m3u8(\?|$)/i.test(src);
    if (!isHls || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      playIfActive();
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (!Hls.isSupported()) {
            video.src = src;
            playIfActive();
            return;
          }
          // autoStartLoad false: no segments are fetched until the video is first active.
          const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: false });
          let started = false;
          startLoad.current = () => {
            if (started) return;
            started = true;
            hls.startLoad();
          };
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, playIfActive);
          if (activeRef.current) startLoad.current();
          destroy = () => {
            startLoad.current = null;
            hls.destroy();
          };
        })
        .catch(() => { /* the poster stays visible */ });
    }

    const onPlaying = () => {
      if (activeRef.current && c.since === 0) c.since = performance.now();
    };
    const onStop = () => stopClock(c);
    const onTimeUpdate = () => {
      if (video.loop && video.currentTime + 0.5 < c.lastPos) c.loops += 1;
      c.lastPos = video.currentTime;
    };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onStop);
    video.addEventListener("waiting", onStop);
    video.addEventListener("ended", onStop);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      cancelled = true;
      report(video, c, onTimeRef);
      c.lastPos = 0;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onStop);
      video.removeEventListener("waiting", onStop);
      video.removeEventListener("ended", onStop);
      video.removeEventListener("timeupdate", onTimeUpdate);
      destroy?.();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  useEffect(() => {
    activeRef.current = active;
    const video = ref.current;
    if (!video) return;
    if (active) {
      startLoad.current?.();
      video.play().catch(() => {});
    } else {
      video.pause();
      report(video, clock.current, onTimeRef);
    }
  }, [active]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  return (
    <video
      ref={ref}
      className={styles.video}
      poster={poster ?? undefined}
      muted={muted}
      loop={loop}
      playsInline
      preload="metadata"
    />
  );
}
