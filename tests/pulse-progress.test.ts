/** Unit tests for the goutsyde.com Pulse progress bar (Pulse length step C2). Run: npx tsx tests/pulse-progress.test.ts */
import { KEY_STEP_SECONDS, PROGRESS_MIN_SECONDS, clockText, progressFraction, shouldShowProgress, stepTime, timeAtX } from "../app/discover/_lib/pulseProgress";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}

console.log("when the bar shows (same rule as the app)");
eq(PROGRESS_MIN_SECONDS, 60, "over 60 seconds");
eq([45, 60, 60.5, 3600].map(shouldShowProgress), [false, false, true, true], "45, 60, 60.5, 3600");
eq([0, null, undefined, NaN, Infinity].map(shouldShowProgress), [false, false, false, false, false], "no usable length");

console.log("progressFraction");
eq(progressFraction(30, 120), 0.25, "a quarter");
eq([progressFraction(-5, 120), progressFraction(200, 120), progressFraction(10, 0), progressFraction(NaN, 120)], [0, 1, 0, 0], "held to 0..1");

console.log("timeAtX");
eq(timeAtX(180, 360, 602), 301, "middle");
eq([timeAtX(0, 360, 602), timeAtX(-20, 360, 602), timeAtX(400, 360, 602), timeAtX(100, 0, 602)], [0, 0, 602, 0], "edges and no width");

console.log("stepTime (arrow keys)");
eq(KEY_STEP_SECONDS, 5, "5 seconds");
eq([stepTime(100, 602, 1), stepTime(100, 602, -1), stepTime(2, 602, -1), stepTime(600, 602, 1)], [105, 95, 0, 602], "held to the video");

console.log("clockText");
eq([clockText(7), clockText(228.9), clockText(602), clockText(3725), clockText(-3), clockText(NaN)], ["0:07", "3:48", "10:02", "1:02:05", "0:00", "0:00"], "player clock");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
