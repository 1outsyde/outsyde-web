# goutsyde.com Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add /refund-policy and /shipping-policy, move /terms and /privacy onto one on-brand legal layout, link all four from the homepage footer and sitemap, and 308-redirect the old Wix legal URLs.

**Architecture:** One data module (`lib/legal-pages.ts`) is the single list of legal pages and old-URL redirects; the footer, sitemap and `next.config.ts` all read it. One server component (`components/LegalLayout.tsx`) renders the shared hero, page pills, "On this page" menu and body styles. Each page supplies its copy as children.

**Tech Stack:** Next.js 16.2.9 (app router), React 19, Tailwind 4, `next/font/google`, tests as `npx tsx tests/<name>.test.ts` scripts (repo convention).

**Spec:** `docs/superpowers/specs/2026-10-23-legal-pages-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/` for `next/font`, `redirects`, `metadata.alternates` and `sitemap` before using them (AGENTS.md: this Next version differs from training data).
- Brand tokens: black `#000000`, gold `#E8B930`, cream `#F5F0E6`, off-black `#060e0c`, navbar `#0a0a0a`; display Bebas Neue, body Hanken Grotesk.
- New copy: no `—`, no `–`, no ` - `, never the fee percentage.
- Terms and Privacy wording stays byte-for-byte the same; only wrappers and styles change.
- No change to any other page's look or behaviour.
- [Web] AUDIT → REGRESSION → BUILD; PR opened, never merged by Claude; Legend merges in the GitHub UI.
- The refund page PR merges with or after backend P1 #2.

## Review Focus

1. `/terms-and-conditions/` (trailing slash) and `/english-refund-policy?x=1` must still land on the new page, not 404.
2. At 375 px wide the pills wrap, the "On this page" menu stacks above the text, and nothing scrolls sideways.
3. The homepage footer with a fifth column must keep its 960 px (2 col) and 620 px (1 col) breakpoints.
4. Every existing link to /terms or /privacy (app, vendor sites, emails, /delete-account-request) keeps working, since URLs don't change.
5. If Google Fonts fail to load, headings fall back to Impact/system sans, never Times.

Tests for 1 live in Task 3, 2 and 3 in Task 6's checks, 4 in Task 1, 5 in Task 2.

---

### Task 1: [Web] AUDIT and REGRESSION (read-only)

**Files:** none changed. Results go in the PR description.

- [ ] **Step 1: Audit.** On a fresh clone of main, record file:line for: `app/terms/page.tsx`, `app/privacy/page.tsx`, `app/sitemap.ts`, `app/robots.ts`, `next.config.ts` (no `redirects()` today), `app/page.tsx` footer (`.footer-grid` :177, breakpoints :191 and :199, footer markup :488), root `app/layout.tsx` `alternates.canonical: "/"`, and `middleware.ts` matcher (must not include the new paths).
- [ ] **Step 2: Snapshot legal text.** Save the visible text of /terms and /privacy from production (`get_page_text`) to `/tmp/legal-before/{terms,privacy}.txt` for the Task 4 comparison.
- [ ] **Step 3: Regression grep.** In fresh clones of main of OutsydeCapture, outsyde-backend, outsyde-web, braids-with-love-site, braids-with-lana-site (default branch and main), lotus-house-blends, xo-lashes-web, nail-sniper-web and dia-lux-site, grep for `goutsyde.com/terms`, `goutsyde.com/privacy`, `/terms-and-conditions`, `/english-`, `refund-policy`, `shipping-policy`. Expected: every hit points to /terms or /privacy (unchanged URLs) or none exist. Any hit on a path this PR redirects is listed in the PR.
- [ ] **Step 4: Confirm no path collision.** `ls app/refund-policy app/shipping-policy` → both missing.

### Task 2: Legal page data and shared layout

**Files:**
- Create: `lib/legal-pages.ts`
- Create: `components/LegalLayout.tsx`
- Test: `tests/legal-pages.test.ts`

**Interfaces:**
- Produces: `LEGAL_PAGES: ReadonlyArray<{ href: "/terms" | "/privacy" | "/refund-policy" | "/shipping-policy"; label: string }>` in that order with labels `Terms of Service`, `Privacy Policy`, `Refund Policy`, `Shipping Policy`.
- Produces: `LEGAL_REDIRECTS: ReadonlyArray<{ source: string; destination: string }>` with exactly the four spec pairs.
- Produces: `<LegalLayout title={[string, string]} current={href} updated="October 23, 2026" sections={{ id: string; label: string }[]}>{children}</LegalLayout>`; `title` is `[cream word, gold word]` (e.g. `["Refund", "Policy"]`).

- [ ] **Step 1: Write the failing test** `tests/legal-pages.test.ts` (same `assert` helper style as `tests/subscription-state.test.ts`):
  - `LEGAL_PAGES.map(p => p.href)` equals `["/terms","/privacy","/refund-policy","/shipping-policy"]`.
  - `LEGAL_REDIRECTS` has 4 entries; each `destination` is in `LEGAL_PAGES`; sources are `/terms-and-conditions`, `/english-privacy-policy`, `/english-refund-policy`, `/english-shipping-policy`.
  - no source equals a destination (no loops).
- [ ] **Step 2: Run** `npx tsx tests/legal-pages.test.ts` → fails (module missing).
- [ ] **Step 3: Implement `lib/legal-pages.ts`.**
- [ ] **Step 4: Run** the test → all pass.
- [ ] **Step 5: Implement `components/LegalLayout.tsx`** as a server component matching the approved mockup: `next/font/google` `Bebas_Neue({ weight: "400" })` and `Hanken_Grotesk({ weight: ["300","400","500","600","700"] })` with `fallback` `["Impact","sans-serif"]` and `["system-ui","sans-serif"]`; hero (`LEGAL` eyebrow, two-tone title, Last Updated line, pill nav from `LEGAL_PAGES` with `aria-current="page"` on `current`); body row `flex-wrap` with aside `flex: 1 1 220px; max-width: 280px` and article `flex: 999 1 560px; min-width: 0; max-width: 760px`; prose styles (16 px, line-height 1.75, cream at 0.78, gold list markers) scoped to the article. The site Navbar already comes from the root layout; do not render a second one.
- [ ] **Step 6: Commit** `feat(legal): legal page list, redirects and shared layout`.

### Task 3: Redirects and sitemap

**Files:**
- Modify: `next.config.ts` (add `async redirects()`)
- Modify: `app/sitemap.ts` (routes array)
- Test: `tests/legal-pages.test.ts` (extend)

**Interfaces:** Consumes `LEGAL_PAGES`, `LEGAL_REDIRECTS` from Task 2.

- [ ] **Step 1: Extend the test:** import `sitemap` from `../app/sitemap`; assert every `LEGAL_PAGES` href appears as `https://www.goutsyde.com<href>` in `sitemap().map(e => e.url)` and that `/coming-soon` is still present (no unrelated change).
- [ ] **Step 2: Run** → fails on the four legal URLs.
- [ ] **Step 3: Add `...LEGAL_PAGES.map(p => p.href)` to the routes array in `app/sitemap.ts`;** add `redirects()` in `next.config.ts` returning `LEGAL_REDIRECTS.map(r => ({ ...r, permanent: true }))`, keeping `images` and `headers()` untouched.
- [ ] **Step 4: Run** the test → pass. Run `npx next build` → succeeds and the build output lists `/refund-policy` and `/shipping-policy` once Task 4 lands.
- [ ] **Step 5: Verify Review Focus 1** after `npx next start`: `curl -sI localhost:3000/terms-and-conditions/` and `curl -sI "localhost:3000/english-refund-policy?x=1"` each end in a 308 chain to the new page (follow with `-L`, final status 200).
- [ ] **Step 6: Commit** `feat(legal): sitemap entries and permanent redirects for old Wix legal URLs`.

### Task 4: Terms and Privacy on the shared layout

**Files:**
- Modify: `app/terms/page.tsx`, `app/privacy/page.tsx`

- [ ] **Step 1:** Wrap each page's existing sections in `<LegalLayout>` (`["Terms","of Service"]` / `["Privacy","Policy"]`, `current`, their existing "July 25, 2026" date, `sections` from their numbered `Section` titles). Keep every sentence; swap `text-yellow-400` link colors for brand gold; set `metadata.alternates.canonical` to `/terms` and `/privacy`.
- [ ] **Step 2: Verify text unchanged:** `npx next start`, extract visible text of both pages, compare with `/tmp/legal-before/*.txt` after stripping the hero/nav lines. Expected: identical body text.
- [ ] **Step 3: Commit** `refactor(legal): terms and privacy on the shared legal layout`.

### Task 5: Refund and Shipping pages

**Files:**
- Create: `app/refund-policy/page.tsx`, `app/shipping-policy/page.tsx`
- Test: `tests/legal-copy.test.ts`

- [ ] **Step 1: Write the failing test** `tests/legal-copy.test.ts`: read both page files with `fs`; assert each exists, contains no `—`, `–` or ` - ` inside JSX text, contains no `%`, and refund contains `14 days of delivery` and `less the service fee`.
- [ ] **Step 2: Run** `npx tsx tests/legal-copy.test.ts` → fails (files missing).
- [ ] **Step 3: Create both pages** with copy copied verbatim from the approved mockup artboards (Refund sections 1 to 11 plus "The Short Version"; Shipping sections 1 to 9 plus "The Short Version"), cross-links to `/refund-policy`, `/shipping-policy`, `/terms`; `metadata` `title` `"Refund Policy"` / `"Shipping Policy"`, description one sentence, `alternates.canonical` own path.
- [ ] **Step 4: Run** the test → pass.
- [ ] **Step 5: Commit** `feat(legal): refund policy and shipping policy pages`.

### Task 6: Homepage footer Legal column, final checks, PR

**Files:**
- Modify: `app/page.tsx` (footer markup ≈:488, `.footer-grid` :177)

- [ ] **Step 1:** Add a `Legal` `footer-col` rendering `LEGAL_PAGES`; change `.footer-grid` columns to `2.2fr 1fr 1fr 1fr 1fr`. Leave the 960 px and 620 px rules as they are.
- [ ] **Step 2: Checks:** `npx tsc --noEmit` (0 errors, same as main), `npx eslint` (no new warnings beyond main's count), `npx next build` OK, all three test files pass.
- [ ] **Step 3: Visual check (Review Focus 2, 3, 5):** on `next start`, view /refund-policy, /shipping-policy, /terms, /privacy and the homepage footer at 1280 px and 375 px; no sideways scroll; footer 5 / 2 / 1 columns at 1280 / 900 / 375.
- [ ] **Step 4: Push and open PR** `feat/legal-pages` → main with the Task 1 audit/regression results, the +/- diff summary, and the note "merge with or after backend P1 #2". Do not merge.
- [ ] **Step 5: After Legend merges:** update the vault (`Outsyde Web/web-pages.md` callout, `Known Broken Routes`, `Priority Queue`), resubmit the sitemap in Search Console, request indexing for the two new pages.
