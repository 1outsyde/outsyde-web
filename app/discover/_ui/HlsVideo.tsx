"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import styles from "./discover.module.css";

type OnTime = (watchedMs: number, durationMs: number, loops: number) => void;
type OnProgress = (currentSeconds: number, durationSeconds: number) => void;
/** barSeekAt: when the Pulse progress bar last moved the video (performance.now()), 0 if never. */
type Clock = { watched: number; since: number; loops: number; lastPos: number; barSeekAt: number };

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

/** Sets muted on the element before play(), so the browser never refuses autoplay because sound is on. */
function play(video: HTMLVideoElement, muted: boolean) {
  video.muted = muted;
  video.play().catch(() => {});
}

/**
 * One video element for feed posts and Pulse. Plays only while `active` (and not `paused`). Mux HLS
 * plays natively where the browser can (Safari); elsewhere hls.js is loaded on demand.
 * `onTime` gets the time actually played while active (not the position), the
 * duration and the loop count, each time the video stops being active or goes away.
 * `onError` is called when the stream cannot play (a fatal hls.js error, or a native media error).
 * Pulse progress bar (step C2), both optional: `onProgress` gets the position and length while active,
 * and `seekRef` is filled with a function that jumps to a time. A bar jump is not counted as a loop.
 */
export default function HlsVideo({ src, poster, active, muted, loop, paused = false, fit = "fill", onTime, onError, onProgress, seekRef }: {
  src: string;
  poster: string | null;
  active: boolean;
  muted: boolean;
  loop: boolean;
  paused?: boolean;
  /** Fill (cover, the default) or Fit (whole video, contain) for Pulse and video stories. */
  fit?: "fill" | "fit";
  onTime?(watchedMs: number, durationMs: number, loops: number): void;
  onError?(): void;
  onProgress?(currentSeconds: number, durationSeconds: number): void;
  seekRef?: MutableRefObject<((seconds: number) => void) | null>;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const activeRef = useRef(active);
  const mutedRef = useRef(muted);
  const pausedRef = useRef(paused);
  const onTimeRef = useRef<OnTime | undefined>(onTime);
  const onErrorRef = useRef<(() => void) | undefined>(onError);
  const onProgressRef = useRef<OnProgress | undefined>(onProgress);
  const clock = useRef<Clock>({ watched: 0, since: 0, loops: 0, lastPos: 0, barSeekAt: 0 });
  const startLoad = useRef<(() => void) | null>(null); // set while an hls.js instance waits to load

  useEffect(() => {
    onTimeRef.current = onTime;
    onErrorRef.current = onError;
    onProgressRef.current = onProgress;
    mutedRef.current = muted;
    pausedRef.current = paused;
  });


  // Attach the source; tear it (and any hls.js instance) down on unmount or a new src.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const c = clock.current;
    let cancelled = false;
    let destroy: (() => void) | null = null;
    const playIfActive = () => {
      if (activeRef.current && !pausedRef.current) play(video, mutedRef.current);
    };
    const onMediaError = () => onErrorRef.current?.();

    const isHls = /\.m3u8(\?|$)/i.test(src);
    if (!isHls || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.addEventListener("error", onMediaError);
      video.src = src;
      playIfActive();
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (!Hls.isSupported()) {
            video.addEventListener("error", onMediaError);
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
          destroy = () => {
            startLoad.current = null;
            destroy = null;
            hls.destroy();
          };
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) return; // hls.js retries non-fatal errors itself
            destroy?.();
            onErrorRef.current?.();
          });
          if (activeRef.current) startLoad.current();
        })
        .catch(() => { /* the poster stays visible */ });
    }

    // Guard: a play that starts while this video is not active (or is tap-paused) is stopped at once,
    // so at most one feed video ever plays, whatever order async loads finish in.
    const onPlay = () => {
      if (!activeRef.current || pausedRef.current) video.pause();
    };
    const onPlaying = () => {
      if (activeRef.current && c.since === 0) c.since = performance.now();
    };
    const onStop = () => stopClock(c);
    const onTimeUpdate = () => {
      // A jump back made by the progress bar (within 2 s) is not a loop.
      const barSeek = c.barSeekAt > 0 && performance.now() - c.barSeekAt < 2000;
      if (video.loop && video.currentTime + 0.5 < c.lastPos && !barSeek) c.loops += 1;
      c.lastPos = video.currentTime;
      const d = video.duration;
      if (activeRef.current && Number.isFinite(d) && d > 0) onProgressRef.current?.(video.currentTime, d);
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onStop);
    video.addEventListener("waiting", onStop);
    video.addEventListener("ended", onStop);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      cancelled = true;
      report(video, c, onTimeRef);
      c.lastPos = 0;
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onStop);
      video.removeEventListener("waiting", onStop);
      video.removeEventListener("ended", onStop);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("error", onMediaError);
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
      if (!pausedRef.current) play(video, mutedRef.current);
    } else {
      video.pause();
      report(video, clock.current, onTimeRef);
    }
  }, [active]);

  // A tap pause while active; activeness itself is handled above.
  useEffect(() => {
    const video = ref.current;
    if (!video || !activeRef.current) return;
    if (paused) video.pause();
    else play(video, mutedRef.current);
  }, [paused]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  // Progress bar jumps (only callers that pass seekRef; feed posts and stories never jump).
  useEffect(() => {
    if (!seekRef) return;
    const c = clock.current;
    seekRef.current = (seconds: number) => {
      const video = ref.current;
      if (!video || !Number.isFinite(seconds)) return;
      c.barSeekAt = performance.now();
      c.lastPos = seconds;
      video.currentTime = seconds;
    };
    return () => {
      seekRef.current = null;
    };
  }, [seekRef]);

  return (
    <video
      ref={ref}
      className={styles.video}
      data-fit={fit}
      poster={poster ?? undefined}
      muted={muted}
      loop={loop}
      playsInline
      preload="metadata"
    />
  );
}
