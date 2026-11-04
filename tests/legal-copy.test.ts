/**
 * Refund + Shipping policy copy rules.
 * Run with: npx tsx tests/legal-copy.test.ts
 * Copy rules: no dashes, never a fee percentage; key policy terms present.
 */
import { existsSync, readFileSync } from "node:fs";

let passed = 0, failed = 0;
function assert(c: boolean, name: string, d?: unknown) {
  if (c) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.error(`  ❌ ${name}`, d === undefined ? "" : JSON.stringify(d)); }
}

// Visible copy only: drop comments, imports, attribute values and the CSS-free JSX tags.
function visibleText(src: string): string {
  return src
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
}

for (const [name, file] of [["refund", "app/refund-policy/page.tsx"], ["shipping", "app/shipping-policy/page.tsx"]] as const) {
  assert(existsSync(file), `${name}: page exists`);
  if (!existsSync(file)) continue;
  const src = readFileSync(file, "utf8");
  const text = visibleText(src);
  const dash = text.match(/.{0,30}(—|–| - ).{0,30}/);
  assert(!dash, `${name}: no dashes in copy`, dash?.[0]);
  const pct = text.match(/.{0,30}%.{0,30}/);
  assert(!pct, `${name}: no percentage in copy`, pct?.[0]);
  assert(new RegExp(`canonical: ["']https://www\\.goutsyde\\.com/${name}-policy["']`).test(src), `${name}: own canonical on www`);
}

if (existsSync("app/refund-policy/page.tsx")) {
  const t = visibleText(readFileSync("app/refund-policy/page.tsx", "utf8"));
  assert(t.includes("within 14 days of delivery"), "refund: 14 day reporting window");
  assert(t.includes("less the service fee"), "refund: vendor cancel refund is less the service fee");
  assert(t.includes("non refundable in all cases"), "refund: service fee never refundable");
  assert(t.includes("deposit is non refundable once your booking is confirmed"), "refund: deposits non refundable");
  assert(t.includes("Where this Refund Policy and the Terms of Service differ on refunds, this Refund Policy controls."), "refund: controls over Terms section 7 on refunds");
}
if (existsSync("app/shipping-policy/page.tsx")) {
  const t = visibleText(readFileSync("app/shipping-policy/page.tsx", "utf8"));
  assert(t.includes("Risk of loss passes to you when the Vendor delivers your order to the carrier"), "shipping: risk of loss clause");
  assert(t.includes("required to provide a tracking number for every shipment"), "shipping: tracking required");
}

// Event tickets (Nov 2): the text says what the platform does. Buyer and host refunds return the ticket price (fee kept);
// a cancelled event refunds everything, fee included; tickets stay valid while an event is on hold.
{
  const block = (src: string, start: string, end: string) => { const i = src.indexOf(start); return i < 0 ? "" : src.slice(i, src.indexOf(end, i + start.length)); };
  const terms = readFileSync("app/terms/page.tsx", "utf8");
  const privacy = readFileSync("app/privacy/page.tsx", "utf8");
  const refund = readFileSync("app/refund-policy/page.tsx", "utf8");
  const tt = visibleText(block(terms, '<SubSection title="Event Tickets and RSVPs">', "</SubSection>"));
  assert(tt.includes("you get the ticket price back, and the service fee is not refunded."), "terms: buyer or host refund is the ticket price");
  assert(tt.includes("The service fee is refunded only when the Host or Outsyde cancels the event."), "terms: fee rule in the body (F2)");
  assert(tt.includes("The Host may still refund your order until the Host's payout for the event is worked out, 3 days after the event ends."), "terms: host refunds until the payout (F1)");
  assert(tt.includes("your tickets are held for 10 minutes"), "terms: 10 minute hold (F3)");
  assert(tt.includes("If you are charged but a ticket can't be issued, Outsyde refunds your full payment, including the service fee."), "terms: charged without a ticket (F3)");
  assert(tt.includes("reasonable grounds to believe a ticket is counterfeit") && tt.includes("Where possible, Outsyde tells the ticket holder first."), "terms: fraud standard and notice (F4)");
  assert(tt.includes("A dispute doesn't guarantee a refund"), "terms: chargebacks (F5)");
  assert(tt.includes("The Limitation of Liability and Governing Law and Dispute Resolution sections of these Terms apply to every ticket and RSVP."), "terms: liability and disputes apply (F6)");
  assert(terms.includes('<Section title="18. Limitation of Liability"') && terms.includes('<Section title="22. Governing Law & Dispute Resolution"'), "terms: the sections F6 names exist");
  assert(!tt.includes("Refunds can't be requested and RSVPs can't be cancelled"), "terms: old refund line gone");
  assert(tt.includes("refunded in full, including the service fee, and every free RSVP is cancelled"), "terms: cancelled event refunds everything");
  assert(tt.includes("tickets already issued stay valid"), "terms: on hold keeps tickets");
  assert(!terms.includes("Event tickets are non-refundable unless the event is cancelled by the organizer"), "terms: old ticket line gone");
  const pv = visibleText(block(privacy, '<Section title="8. Events and Tickets"', "</Section>"));
  assert(pv.includes("They don't see your email address, phone number or payment details."), "privacy: what hosts see");
  assert(pv.includes("we don't share your identity with the Host") && pv.includes("We may disclose it if required by valid legal process"), "privacy: reports (F7)");
  assert(!pv.includes("the Host is not told who reported it"), "privacy: old absolute promise gone");
  const nums = [...privacy.matchAll(/<Section title="(\d+)\. /g)].map((m) => Number(m[1]));
  assert(JSON.stringify(nums) === JSON.stringify(Array.from({ length: 18 }, (_, i) => i + 1)), "privacy: sections 1 to 18 in order", nums);
  const labels = [...privacy.matchAll(/"label": "(\d+)\. /g)].map((m) => Number(m[1]));
  assert(JSON.stringify(labels) === JSON.stringify(nums), "privacy: side menu matches the sections", labels);
  const rf = visibleText(block(refund, '<Section id="events"', "</Section>"));
  assert(rf.includes("If the organizer or Outsyde cancels the event, you receive a full refund, including the service fee"), "refund: cancelled event refunds everything");
  assert(rf.includes("the organizer may still refund your order until their payout for the event is worked out, 3 days after the event ends"), "refund: organizer refunds until the payout (F1)");
  assert(!rf.includes("Refunds are not available after the event starts"), "refund: old line gone");
  assert(!refund.includes("less the service fee.</p>\n      </Section>\n\n      <Section id=\"rewards\""), "refund: old cancel line gone");
  for (const [name, t] of [["terms tickets", tt], ["privacy events", pv], ["refund events", rf]] as const) {
    const d = t.match(/.{0,30}(—|–| - ).{0,30}/);
    assert(!d, `${name}: no dashes`, d?.[0]);
    const pc = t.match(/.{0,30}%.{0,30}/);
    assert(!pc, `${name}: no percentage`, pc?.[0]);
  }
}

for (const [f, path] of [["app/terms/page.tsx", "/terms"], ["app/privacy/page.tsx", "/privacy"]]) {
  const src = readFileSync(f, "utf8");
  assert(src.includes(`canonical: 'https://www.goutsyde.com${path}'`), `${path}: own canonical on www`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
