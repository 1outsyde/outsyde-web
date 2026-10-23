/** Unit tests for the Event Host Agreement renderer. No server needed: npx tsx tests/agreement-text.test.ts */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AgreementText, { parseAgreement, parseInline } from "../app/events/_host/AgreementText";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}
const html = (md: string) => renderToStaticMarkup(createElement(AgreementText, { text: md }));

console.log("inline");
eq(parseInline("plain"), [{ t: "text", v: "plain" }], "plain text");
eq(parseInline("a **bold** b"), [{ t: "text", v: "a " }, { t: "bold", c: [{ t: "text", v: "bold" }] }, { t: "text", v: " b" }], "bold");
eq(parseInline("\\[VERSION\\]"), [{ t: "text", v: "[VERSION]" }], "backslash escapes");
eq(parseInline("a \\*\\*not bold\\*\\*"), [{ t: "text", v: "a **not bold**" }], "escaped stars stay text");
eq(parseInline("a \\d"), [{ t: "text", v: "a \\d" }], "backslash before a letter stays");
eq(parseInline("[Stripe](https://stripe.com/x)"), [{ t: "link", href: "https://stripe.com/x", c: [{ t: "text", v: "Stripe" }] }], "https link");
eq(parseInline("[bad](javascript:alert(1))"), [{ t: "text", v: "[bad](javascript:alert(1))" }], "javascript link stays text");
eq(parseInline("[plain](http://x.com)"), [{ t: "text", v: "[plain](http://x.com)" }], "http link stays text");
eq(parseInline("**unclosed"), [{ t: "text", v: "**unclosed" }], "unclosed bold stays text");

console.log("blocks");
const md = "## 1. About\n\nFirst line\nsame paragraph.\n\n- **Event**: a gathering\n- **Ticket**: a right\n\n3.1 **Age.** You must be 18.\n\n1. one;\n2. two.\n\nEnd.";
eq(parseAgreement(md).map((b) => b.t), ["h", "p", "ul", "p", "ol", "p"], "block kinds");
const blocks = parseAgreement(md);
eq(blocks[1], { t: "p", c: [{ t: "text", v: "First line same paragraph." }] }, "lines join into one paragraph");
eq(blocks[2].t === "ul" ? blocks[2].items.length : 0, 2, "two bullet items");
eq(blocks[3].t === "p" ? blocks[3].c[0] : null, { t: "text", v: "3.1 " }, "3.1 is a paragraph, not a list");
eq(blocks[4].t === "ol" ? [blocks[4].start, blocks[4].items.length] : null, [1, 2], "ordered list");

console.log("rendered html");
eq(html("## 1. About\n\nHi **there**."), "<h3>1. About</h3><p>Hi <strong>there</strong>.</p>", "heading and bold");
eq(html("[Stripe Connected Account Agreement](https://stripe.com/connect-account/legal)"),
  '<p><a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer">Stripe Connected Account Agreement</a></p>', "link opens in a new tab");
eq(html("- a\n- b"), "<ul><li>a</li><li>b</li></ul>", "bullet list");
eq(html("1. a\n2. b"), '<ol start="1"><li>a</li><li>b</li></ol>', "numbered list");
eq(html("<script>alert(1)</script> <img src=x onerror=alert(1)>"), "<p>&lt;script&gt;alert(1)&lt;/script&gt; &lt;img src=x onerror=alert(1)&gt;</p>", "raw HTML is escaped, never injected");
eq(html("[x](https://a.com/\"onmouseover=alert(1))"), "<p>[x](https://a.com/&quot;onmouseover=alert(1))</p>", "a quote in a link URL is not a link");
eq(html("Effective date: \\[EFFECTIVE DATE\\]. Version: 2026-10-23-draft."), "<p>Effective date: [EFFECTIVE DATE]. Version: 2026-10-23-draft.</p>", "escaped brackets render plainly");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
