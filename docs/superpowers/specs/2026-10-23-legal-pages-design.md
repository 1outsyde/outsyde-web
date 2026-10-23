# goutsyde.com legal pages: design

Approved by Legend 2026-10-23. Mockup (approved): claude.ai artifact "goutsyde.com Legal Pages" (Refund Policy + Shipping Policy artboards).

## Why
Google Search Console reports old Wix legal URLs as 404 and goutsyde.com has no refund or shipping policy. /terms and /privacy exist but nothing a visitor or Google sees links to them (homepage footer has no legal links; not in the sitemap). /terms and /privacy name Bebas Neue / Hanken Grotesk but never load them (render in Arial) and use gold #C9A84C instead of brand #E8B930.

## Goals
- New /refund-policy and /shipping-policy with the approved mockup copy and design.
- /terms and /privacy moved onto the same on-brand legal layout; their wording unchanged.
- Homepage footer gets a Legal column linking all four pages.
- All four pages in app/sitemap.ts.
- Permanent redirects: /terms-and-conditions → /terms, /english-privacy-policy → /privacy, /english-refund-policy → /refund-policy, /english-shipping-policy → /shipping-policy.
- Each of the four pages sets its own canonical URL.

## Non goals
Careers page; vendor store redirects (/shop/<vendor> → vendor domain); site-wide root-layout canonical bug; the other old Wix 404s; backend P1 #2 (vendor cancel refund).

## Anti goals
No change to any other page's look or behaviour. No legal wording change on Terms or Privacy. No fee percentage and no dashes (— – or " - ") in new copy.

## Policy rules (from Legend)
- Service fee non-refundable in all cases.
- Deposits non-refundable once a booking is confirmed.
- Vendor cancels before the appointment: automatic refund of everything paid online, less the service fee.
- Customer cancels / no-show / late / breaks vendor terms: vendor's own policy decides.
- Products: refund guaranteed only when the seller is at fault (wrong, missing, defective, damaged before shipping, cancelled before shipping); report within 14 days of delivery; carrier problems not covered.
- Events: organizer sets the policy, can only become more flexible; organizer cancels → ticket price refunded, service fee not.
- Points earned on a refunded purchase are removed.
- Each vendor ships its own orders and must provide a tracking number; delivery dates are carrier estimates; risk of loss passes to the buyer on delivery to the carrier.

## Approaches
1. Copy the /terms template as is: fastest, repeats the Arial / wrong-gold problem.
2. **Chosen:** one shared on-brand legal layout (real fonts, brand tokens) used by all four pages.
3. New pages on brand, Terms/Privacy untouched: legal pages look inconsistent.

## Constraints
- Legend's process: [Web] AUDIT (read-only) → REGRESSION (read-only) → BUILD; diffs shown before merge; merge via GitHub UI only.
- Merge the refund page with or after backend P1 #2 so the automatic vendor-cancel refund it promises is true when it goes live.

## Builder's calls
Component and file names; redirects in next.config.ts `redirects()` (permanent, 308), not middleware.
