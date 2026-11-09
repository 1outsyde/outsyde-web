"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { clockText, progressFraction, stepTime, timeAtX } from "../_lib/pulseProgress";
import styles from "./discover.module.css";

/**
 * Pulse progress bar (Pulse length step C2), as in the app: a thin bar along the bottom of Pulse
 * videos over 60 seconds. Drag (finger or mouse) or click to skip; while dragging it gets thicker
 * with a dot and the time shows in the middle. Left / right arrow keys skip 5 seconds.
 * The bar takes the pointer while dragging and has touch-action: none, so the feed never scrolls.
 * The parent pauses the video while `onScrubStart` .. `onScrubEnd` and does the jump.
 */
export default function PulseProgress({ current, duration, onScrubStart, onScrubEnd, onStep }: {
  current: number;
  duration: number;
  onScrubStart(): void;
  /** Seconds to jump to, or -1 when the drag was cancelled (no jump). */
  onScrubEnd(seconds: number): void;
  /** Keyboard skip to this time. */
  onStep(seconds: number): void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  // True between pointer down and up / cancel. A ref, so the lost capture event that follows a
  // normal release sees the drag already ended (state updates land later).
  const dragging = useRef(false);
  const scrubbing = scrubTime !== null;
  const shown = scrubbing ? scrubTime : current;
  const fraction = progressFraction(shown, duration);

  const timeAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = barRef.current?.getBoundingClientRect();
    return rect ? timeAtX(e.clientX - rect.left, rect.width, duration) : 0;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setScrubTime(timeAt(e));
    onScrubStart();
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setScrubTime(timeAt(e));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.stopPropagation();
    const t = timeAt(e);
    setScrubTime(null);
    onScrubEnd(t);
  };
  const onPointerCancel = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setScrubTime(null);
    onScrubEnd(-1);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    e.stopPropagation();
    onStep(stepTime(current, duration, e.key === "ArrowRight" ? 1 : -1));
  };

  return (
    <>
      {scrubbing ? (
        <span className={styles.pulseScrubTime} data-testid="pulse-progress-time" aria-hidden="true">
          {clockText(shown)} <span className={styles.pulseScrubTotal}>/ {clockText(duration)}</span>
        </span>
      ) : null}
      <div
        className={styles.pulseProgress}
        data-scrubbing={scrubbing ? "true" : undefined}
        data-testid="pulse-progress"
        role="slider"
        tabIndex={0}
        aria-label="Video progress"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={`${clockText(shown)} of ${clockText(duration)}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div ref={barRef} className={styles.pulseProgressTrack}>
          <div className={styles.pulseProgressFill} style={{ width: `${fraction * 100}%` }} />
          {scrubbing ? <div className={styles.pulseProgressKnob} style={{ left: `${fraction * 100}%` }} /> : null}
        </div>
      </div>
    </>
  );
}
