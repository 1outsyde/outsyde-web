/**
 * Pulse progress bar math (Pulse length step C2), the same rules as the app
 * (OutsydeCapture utils/pulseProgress.ts). Pure. Tests: npx tsx tests/pulse-progress.test.ts
 */

/** Videos longer than this (seconds) get the progress bar, like TikTok. Shorter ones stay as they are. */
export const PROGRESS_MIN_SECONDS = 60;
/** Left / right arrow keys on the bar skip this many seconds. */
export const KEY_STEP_SECONDS = 5;

export function shouldShowProgress(durationSeconds: number | null | undefined): boolean {
  return typeof durationSeconds === "number" && Number.isFinite(durationSeconds) && durationSeconds > PROGRESS_MIN_SECONDS;
}

/** How far along (0 to 1). */
export function progressFraction(current: number, duration: number): number {
  if (!(duration > 0) || !Number.isFinite(current)) return 0;
  return Math.min(1, Math.max(0, current / duration));
}

/** The time under a pointer at `x` pixels along a bar `width` pixels wide. */
export function timeAtX(x: number, width: number, duration: number): number {
  if (!(width > 0) || !(duration > 0)) return 0;
  return progressFraction((x / width) * duration, duration) * duration;
}

/** A keyboard step from `current`, held to the video. */
export function stepTime(current: number, duration: number, direction: 1 | -1): number {
  return progressFraction(current + direction * KEY_STEP_SECONDS, duration) * duration;
}

/** Clock text: 0:07, 3:48, 10:02, 1:02:05. */
export function clockText(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
