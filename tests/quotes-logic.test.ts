/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures */
/** Unit tests for the quote page (Quotes step 5b). No server needed: npx tsx tests/quotes-logic.test.ts */
import {
  money, whenLine, payLines, stageOf, closedLine, balanceLine, extrasPaymentLine, extraStatusLine, intentOutcome, loginHref, windowLeft,
  reportProblem, decidedLine, quoteChip, listChip, requestChip, brandColor, inkOn, safeImage,
} from "../app/q/[code]/quoteLogic";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}
const A = { totalCents: 65000, depositOrTotalCents: 10000, serviceFeeCents: 800, payNowCents: 10800, balanceCents: 55000, balanceServiceFeeCents: 4400, balanceTotalCents: 59400, restPaid: "outsyde" as const, paidDirectlyCents: 0 };

console.log("money and time");
eq(money(10800), "$108.00", "cents to dollars");
eq(money(123456789), "$1,234,567.89", "thousands");
eq(whenLine({ kind: "service", jobDate: "2026-11-08", startTime: "09:00", durationMinutes: 180, dueDate: null }), "Sun, Nov 8 at 9:00 AM, 3 hours", "the job's own date and time, never shifted");
eq(whenLine({ kind: "service", jobDate: "2026-11-08", startTime: "13:30", durationMinutes: 90, dueDate: null }), "Sun, Nov 8 at 1:30 PM, 1 hours 30 minutes".replace("1 hours", "1 hour"), "afternoon, hour and minutes");
eq(whenLine({ kind: "product", jobDate: null, startTime: null, durationMinutes: null, dueDate: "2026-12-01" }), "Due Tue, Dec 1", "a product's due date");

console.log("money lines before paying");
eq(payLines(A, "deposit").map((l) => [l.label, l.cents]), [["Quote total", 65000], ["Deposit today", 10000], ["Service fee", 800], ["Pay now", 10800], ["Balance, held on your card the day before", 59400]], "deposit quote");
eq(payLines({ ...A, restPaid: "outside", balanceTotalCents: 0, balanceServiceFeeCents: 0, paidDirectlyCents: 55000 }, "deposit").pop(), { label: "The rest, paid to the business directly", cents: 55000, muted: true }, "rest paid outside (B15)");
eq(payLines({ ...A, depositOrTotalCents: 65000, serviceFeeCents: 5200, payNowCents: 70200, balanceCents: 0, balanceTotalCents: 0 }, "full").map((l) => l.label), ["Quote total", "Service fee", "Pay now"], "full payment");

console.log("stages");
const base = { status: "sent", paying: false, window: null, report: null } as any;
eq(stageOf(base), "pay", "sent: pay");
eq(stageOf({ ...base, paying: true }), "paying", "a payment running");
for (const s of ["withdrawn", "declined", "expired"]) eq(stageOf({ ...base, status: s }), "closed", `${s}: closed`);
eq(stageOf({ ...base, status: "paid" }), "booked", "paid: booked");
eq(stageOf({ ...base, status: "paid", window: { state: "open" } }), "window", "Job complete: confirm or report");
eq(stageOf({ ...base, status: "paid", window: { state: "reported" }, report: { status: "open" } }), "reported", "reported");
eq(stageOf({ ...base, status: "paid", window: { state: "reported" }, report: { status: "decided" } }), "decided", "decided");
eq(stageOf({ ...base, status: "paid", window: { state: "confirmed" } }), "complete", "confirmed");
eq(stageOf({ ...base, status: "paid", window: { state: "closed" } }), "complete", "window over");
eq(closedLine("expired"), "This quote has expired. Message the business for a new one.", "expired copy");

console.log("balance and extras lines");
const bq = (b: any, extra: any = {}) => ({ paymentMode: "deposit" as const, amounts: A, balance: b, ...extra });
eq(balanceLine(bq({ status: "scheduled", holdCents: 59400, needsNewCard: false })), { text: "The balance, $594.00, is held on your card the day before the job." }, "scheduled");
eq(balanceLine(bq({ status: "held", holdCents: 59400 }))?.text, "The balance, $594.00, is on hold on your card. It is charged when the job is complete.", "held");
eq(balanceLine(bq({ status: "hold_failed", holdCents: 59400, needsNewCard: true }))?.action, { kind: "balance-card", label: "Update your card" }, "failed for good: Update your card");
eq(balanceLine(bq({ status: "hold_failed", holdCents: 59400, needsNewCard: false }))?.action, undefined, "retry pending: no button yet");
eq(balanceLine(bq({ status: "captured", holdCents: 59400, capturedCents: 59400 }))?.text, "The balance, $594.00, was charged.", "charged");
eq(balanceLine({ paymentMode: "full", amounts: A, balance: null }), null, "paid in full: no balance line");
eq(balanceLine(bq(null, { amounts: { ...A, restPaid: "outside", paidDirectlyCents: 55000 } }))?.text, "The rest, $550.00, is paid to the business directly.", "rest outside");
eq(extrasPaymentLine({ status: "unpaid", approvedCents: 10000, holdCents: 10800, capturedCents: null, needsNewCard: false, unpaid: true })?.action?.label, "Pay for extras", "unpaid: Pay for extras");
eq(extrasPaymentLine({ status: "hold_failed", approvedCents: 10000, holdCents: 10800, capturedCents: null, needsNewCard: true, unpaid: false })?.action?.label, "Update your card", "hold failed: Update your card");
eq(extrasPaymentLine({ status: "none", approvedCents: 0, holdCents: 0, capturedCents: null, needsNewCard: false, unpaid: false }), null, "no extras: nothing");
eq(extraStatusLine({ status: "proposed" }), "Nothing is charged unless you approve.", "open extra");
eq(extraStatusLine({ status: "lapsed" }), "Not answered before the job was complete. Nothing was added.", "lapsed");

console.log("card answers");
eq(intentOutcome("hold", { status: "requires_capture" }), { next: "done" }, "a hold is held, not charged: done");
eq(intentOutcome("pay", { status: "requires_capture" }).next, "failed", "a held card is not a payment");
eq(intentOutcome("pay", { status: "processing" }), { next: "done" }, "processing counts for a payment");
eq(intentOutcome("setup", { status: "succeeded" }), { next: "done" }, "card checked");
eq(intentOutcome("hold", { thrown: true }), { next: "check" }, "no answer: ask again");
eq(intentOutcome("hold", { errorCode: "payment_intent_unexpected_state" }), { next: "check" }, "unexpected state: ask again");
eq(intentOutcome("pay", { errorCode: "card_declined", errorMessage: "Your card was declined." }), { next: "failed", message: "Your card was declined." }, "declined: Stripe's words");

console.log("sign in, window, report");
eq(loginHref("Ab_9-x"), "/login?return=%2Fq%2FAb_9-x", "sign in comes back to the quote");
const now = Date.parse("2026-11-05T12:00:00Z");
eq(windowLeft("2026-11-05T16:52:00Z", now), "4 h 52 min left", "time left");
eq(windowLeft("2026-11-05T12:20:00Z", now), "20 min left", "under an hour");
eq(windowLeft("2026-11-05T11:00:00Z", now), "The 6 hours are over.", "over");
eq(reportProblem("too short", 0), "Tell us what went wrong in at least 10 characters.", "reason too short");
eq(reportProblem("The crew broke a lamp", 6), "Add up to 5 photos.", "too many photos");
eq(reportProblem("The crew broke a lamp", 2), null, "ok");
eq(decidedLine({ status: "decided", outcome: "partial_refund", refundCents: 6000 }, "Royal Elite Moving"), "Outsyde reviewed your report. You get $60.00 back and the rest is paid to Royal Elite Moving.", "partial");

console.log("lists and look");
eq(quoteChip({ status: "paid", paying: false, window: { state: "open" }, report: null } as any), "Confirm or report", "chip");
eq(requestChip("new"), "Waiting for a quote", "request chip");
eq([listChip("sent"), listChip("paid"), listChip("expired")], ["Ready to pay", "Paid", "Expired"], "list chips from the status alone (review I3)");
eq(extrasPaymentLine({ status: "captured", approvedCents: 10000, holdCents: 10800, capturedCents: 10800, needsNewCard: false, unpaid: false })?.text, "Extras charged, $108.00.", "charged extras, commas and periods only");
eq(brandColor({ brandColors: { primary: "#123456" } }), "#123456", "brand color");
eq(brandColor({ brandColors: { primary: "red; background:url(x)" } }), "#E2BE4B", "anything but a hex is ignored");
eq(inkOn("#E2BE4B"), "#141413", "dark text on gold");
eq(inkOn("#123456"), "#FFFFFF", "white text on navy");
eq(safeImage("javascript:alert(1)"), null, "only https images");

console.log("copy: commas and periods, never the fee rate");
const copy = [closedLine("withdrawn"), closedLine("declined"), closedLine("expired"), balanceLine(bq({ status: "hold_failed", holdCents: 1, needsNewCard: true }))!.text,
  extrasPaymentLine({ status: "unpaid", approvedCents: 1, holdCents: 1, capturedCents: null, needsNewCard: false, unpaid: true })!.text,
  ...["proposed", "approving", "approved", "declined", "withdrawn", "lapsed", "canceled"].map((s) => extraStatusLine({ status: s })),
  decidedLine({ status: "decided", outcome: "full_refund", refundCents: 0 }, "X"), decidedLine({ status: "decided", outcome: "pay_full", refundCents: 0 }, "X")];
for (const c of copy) eq(/[–—]|8%/.test(c), false, `no dash or fee rate: ${c.slice(0, 50)}`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
