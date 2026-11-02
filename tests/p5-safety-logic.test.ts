/** Unit tests for p5-safety web rules (admin moderation, report sheet, on hold). No server: npx tsx tests/p5-safety-logic.test.ts */
import {
  EVENT_ACTION_CONFIRM, EVENT_ACTION_DONE, EVENT_ACTION_LABEL, POST_ACTION_CONFIRM, POST_ACTION_DONE, POST_ACTION_LABEL,
  eventActionPath, eventActionsFor, eventStatusText, moderationErrorText, postActionPath, readEventReports, readModeration,
  readPostReports, reasonError, reasonLabel, reportCountText, tabFromHash, trustPath, trustState, utcTime,
} from "../app/admin/events/_lib/moderation";
import {
  ON_HOLD_COPY, REPORT_COPY, REPORT_REASONS, canShowReport, isReportReason, onHoldBanner, reportBody, reportErrorCopy, reportFormError,
} from "../app/e/[slug]/reportLogic";
import { QUICK_COPY, existsCopy, pendingReturnPath } from "../app/e/[slug]/quickAuthLogic";
import { publishFailure, nextStepLabel } from "../app/events/_host/editorLogic";
import { GENERIC_ERROR } from "../app/e/_shared/format";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}

console.log("admin actions by status");
eq(eventActionsFor("published", 0), ["pause", "cancel"], "live, no reports: pause, cancel");
eq(eventActionsFor("published", 2), ["pause", "cancel", "dismiss"], "live, reports: plus dismiss");
eq(eventActionsFor("paused", 1), ["release", "cancel", "dismiss"], "on hold: release, cancel, dismiss");
eq(eventActionsFor("cancelled", 3), ["dismiss"], "cancelled: only dismiss");
eq(eventActionsFor("draft", 0), [], "draft: nothing");

console.log("\nreason rule (1 to 500 after trimming)");
eq(reasonError("   ") !== null, true, "blank refused");
eq(reasonError("Fake venue"), null, "short reason ok");
eq(reasonError("x".repeat(500)), null, "500 ok");
eq(reasonError("x".repeat(501)) !== null, true, "501 refused");

console.log("\npaths");
eq(eventActionPath("pause", "ab-1"), "/api/admin/events/ab-1/pause", "pause path");
eq(eventActionPath("dismiss", "ab-1"), "/api/admin/events/ab-1/reports/dismiss", "dismiss path");
eq(eventActionPath("cancel", "a/b"), "/api/admin/events/a%2Fb/cancel", "id encoded");
eq(postActionPath("p1"), "/api/admin/events/posts/p1/action", "post action path");
eq(trustPath("u1"), "/api/admin/events/hosts/u1/trust", "trust path");

console.log("\nerror copy");
eq(moderationErrorText({ error: "x", code: "NOT_PUBLISHED" }, 409), "Only a live event can be paused. Reload to see where it is.", "known code");
eq(moderationErrorText({ error: "Admin access required" }, 403), "Admin access required", "message when no code");
eq(moderationErrorText(null, 500), "Something went wrong (500). Try again.", "nothing readable");

console.log("\nmoderation summary and trust");
eq(readModeration(undefined), null, "older backend: none");
eq(readModeration({ pendingReports: "2" }), null, "malformed: none");
const m = readModeration({ pendingReports: 2, hostLimited: true, hostTrusted: false, hostType: "user" });
eq(m, { pendingReports: 2, hostLimited: true, hostTrusted: false, hostType: "user" }, "read");
eq(trustState(m)?.trusted, false, "limited: not trusted");
eq(trustState(m)?.tone, "warn", "limited: warn");
eq(trustState({ pendingReports: 0, hostLimited: false, hostTrusted: true, hostType: "user" })?.trusted, true, "trusted");
eq(trustState({ pendingReports: 0, hostLimited: false, hostTrusted: false, hostType: "business" }), null, "business host: no switch");
eq(trustState(null), null, "no summary: no switch");

console.log("\nreports list");
const evRow = { eventId: "e1", title: "T", slug: "t", status: "published", startsAt: null, host: { id: "u", username: "h", firstName: null }, reportCount: 2, firstAt: "2026-11-01T00:00:00Z", lastAt: "2026-11-01T01:00:00Z", reasons: [] };
eq(readEventReports([evRow, { eventId: 3 }, null, "x"]).length, 1, "bad event rows dropped");
eq(readEventReports({}).length, 0, "not a list");
const poRow = { postId: "p1", content: "hi", mediaUrl: null, active: true, author: { id: "a", username: "a" }, reportCount: 1, flagCount: 1, lastAt: "2026-11-01T00:00:00Z", reasons: [] };
eq(readPostReports([poRow, { postId: "p2" }]).length, 1, "bad post rows dropped");
eq(reasonLabel({ reason: "scam", reporter: null, at: "" }), "Scam or fake event", "label from code");
eq(reasonLabel({ reason: "x", label: "Backend label", reporter: null, at: "" }), "Backend label", "backend label wins");
eq(reasonLabel({ reason: "Spam", reporter: null, at: "" }), "Spam", "app free text kept");
eq(utcTime("2026-11-02T00:31:00.123456"), "2026-11-02T00:31:00.123456Z", "no zone: read as UTC");
eq(utcTime("2026-11-02 00:31:00"), "2026-11-02T00:31:00Z", "space form: read as UTC");
eq(utcTime("2026-11-02T00:31:00.000Z"), "2026-11-02T00:31:00.000Z", "Z kept");
eq(utcTime("2026-11-02T00:31:00+00:00"), "2026-11-02T00:31:00+00:00", "offset kept");
eq(new Date(utcTime("2026-11-02T00:31:00") as string).toISOString(), "2026-11-02T00:31:00.000Z", "parses to that UTC moment");
eq(utcTime(null), null, "null stays null");
eq(reportCountText(1), "1 person reported this", "one");
eq(reportCountText(3), "3 people reported this", "many");
eq(eventStatusText("paused"), "On hold", "paused reads On hold");
eq(tabFromHash("#reports"), "reports", "#reports opens Reports");
eq(tabFromHash(""), "money", "default Money");
eq(tabFromHash("#other"), "money", "unknown hash: Money");

console.log("\nreport sheet");
eq(REPORT_REASONS.map((r) => r.id), ["scam", "illegal", "hate", "sexual", "wrong_details", "other"], "six reasons, backend keys, order");
eq(isReportReason("scam") && !isReportReason("spam") && !isReportReason(1), true, "reason check");
eq(reportFormError(null, ""), REPORT_COPY.pick, "no reason");
eq(reportFormError("other", "  "), REPORT_COPY.noteNeeded, "something else needs a note");
eq(reportFormError("other", "Fake flyer"), null, "something else with note");
eq(reportFormError("scam", ""), null, "note optional otherwise");
eq(reportFormError("scam", "x".repeat(501)) !== null, true, "note over 500 refused");
eq(reportBody("scam", "  "), { reason: "scam" }, "blank note not sent");
eq(reportBody("other", " Fake "), { reason: "other", note: "Fake" }, "note trimmed");
eq(reportErrorCopy(403, { error: "You can't report an event you host or work on.", code: "CANT_REPORT_OWN" }), "You can't report an event you host or work on.", "own event: backend line");
eq(reportErrorCopy(404, { error: "x", code: "EVENT_NOT_FOUND" }), "This event isn't available to report anymore.", "gone");
eq(reportErrorCopy(500, { error: "boom", code: "SERVER_ERROR" }), GENERIC_ERROR, "server error: generic");
eq(reportErrorCopy(400, { error: "raw" }), GENERIC_ERROR, "unknown: generic");

console.log("\nwho sees Report, on hold copy");
eq(canShowReport({ status: "published", viewerIsHost: false }), true, "live, guest");
eq(canShowReport({ status: "paused", viewerIsHost: false }), true, "on hold, holder");
eq(canShowReport({ status: "published", viewerIsHost: true }), false, "host: no");
eq(canShowReport({ status: "published", viewerIsHost: false, viewerIsCohost: true }), false, "co-host: no");
eq(canShowReport({ status: "draft", viewerIsHost: false }), false, "draft: no");
eq(canShowReport({ status: "cancelled", viewerIsHost: false }), false, "cancelled: no");
eq(onHoldBanner({ status: "published", viewerIsHost: false }), null, "live: no banner");
eq(onHoldBanner({ status: "paused", onHold: true, viewerIsHost: false }), ON_HOLD_COPY.holder, "holder copy");
eq(onHoldBanner({ status: "paused", onHold: true, viewerIsHost: true }), ON_HOLD_COPY.host, "host copy");
eq(onHoldBanner({ status: "paused", viewerIsHost: false, viewerIsCohost: true }), ON_HOLD_COPY.host, "co-host gets host copy");

console.log("\nsign in sheet for a report");
eq(existsCopy("report"), QUICK_COPY.existsReport, "report: its own exists note");
eq(existsCopy("checkout"), QUICK_COPY.exists, "checkout unchanged");
eq(pendingReturnPath("my-party", { kind: "report" }), "/e/my-party?report=1", "back to the event, report sheet reopens");

console.log("\npublish refused by the new host limit");
const lim = "New hosts can sell up to 100 paid tickets per event, at up to $100 each, until a paid event with at least 5 guests has been paid out. Free RSVPs have no limit.";
const pf = publishFailure(409, { error: lim, code: "NEW_HOST_LIMIT" });
eq([pf.message, pf.next, nextStepLabel(pf.next)], [lim, "tickets", "Go to tickets"], "backend message, Go to tickets");
eq(publishFailure(409, { code: "NEW_HOST_LIMIT" }).message.startsWith("New hosts can sell up to 100"), true, "fallback copy when no message");

console.log("\ncopy rules (no dashes, no percentages)");
const all = [
  ...Object.values(EVENT_ACTION_LABEL), ...Object.values(EVENT_ACTION_CONFIRM), ...Object.values(EVENT_ACTION_DONE),
  ...Object.values(POST_ACTION_LABEL), ...Object.values(POST_ACTION_CONFIRM), ...Object.values(POST_ACTION_DONE),
  ...Object.values(REPORT_COPY), ...Object.values(ON_HOLD_COPY), ...REPORT_REASONS.map((r) => r.label), QUICK_COPY.existsReport,
];
eq(all.filter((s) => /[‒–—―]| - /.test(s)), [], "no dashes");
eq(all.filter((s) => /\d\s*%/.test(s)), [], "no percentages");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
