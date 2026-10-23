# Web Discover (Events step 4b): design

Date: 2026-10-23 · Board row p3-webfeed · Audit: vault "Events Step 4b Web Discover — Audit & Regression (2026-10-23)"
Verified against: outsyde-web `53362a6`, backend `87ed621`, OutsydeCapture `131f79e`.

## Intent
Legend wants the whole Outsyde Discover on goutsyde.com, not only Events (decided 2026-10-22, "to get it over with"). People should be able to scroll Outsyde on the web the same way they do in the app: the same tab row EVENTS · FOLLOWING · PRO · PULSE, the same posts and videos. That way an Outsyde link works for anyone, with or without the app. Events become part of that experience rather than a separate product.

Success: someone signed out opens goutsyde.com/discover and scrolls real posts, event cards and Pulse videos. Someone signed in can like, save, comment and follow, and what they do shows up in the app.

## Goals
- Four tabs with one shared tab row: Events (`/events`, existing), Pro (`/discover`), Following (`/discover/following`), Pulse (`/discover/pulse`).
- Pro: stories bar, then posts, with event cards mixed in (at most one per 8 posts, upcoming public events within 14 days).
- Following: newest posts from accounts the viewer follows, loads more on scroll.
- Pulse: vertical full-height videos, one plays at a time, loads more on scroll.
- Signed in: like, unlike, save, unsave, view and add comments, follow and unfollow authors.
- Same look as the /events pages: bg #0B0B0B, cream #F5F0E6, gold #E8B930, cards #141414, borders #2A2A2A, Bebas Neue + Hanken Grotesk.

## Non-goals (this step)
- No backend changes. Every route needed exists and works for the web (audit A).
- No fix of the backend feed quirks (own posts repeated per page, 500-post ranking window, Pulse videos in Pro, CTA clicks counting as likes, missing report route, stories block filter). Logged in the Priority Queue.
- No single post page, no SEO for posts, no sitemap entries for feeds.
- No posting, story creation, or story replies from the web.
- No share, report, or Buy Now / Book Now checkout from the feed (the pill links to the author's profile instead).
- No app changes (app EVENTS tab and event card are step 5).

## Anti-goals (would make this a failure even if it works)
- Breaking any existing link to `/events`, `/e/[slug]`, `/tickets`, or the host pages.
- Writing the viewer's location to their account by accident: `GET /api/feed` with `lat`/`lng` saves them to the user (backend routes.ts:22299-22303). The web never sends `lat`/`lng` to the feed.
- Showing real names, emails, or the service fee percentage anywhere.
- Autoplaying sound, or more than one video playing at once.
- Sending signed-out visitors to /login just for opening a public tab.

## Constraints
- Next 16 / React 19 / Tailwind 4, BFF pattern: every backend call goes through `app/api/**` with Bearer + Cookie (`backendAuthHeaders`). Comments and Pulse engagement accept only the backend session cookie (`connect.sid`, 7 days), which the web login already stores, so forwarding the Cookie header is required.
- No refresh token on the web: when the 7-day token runs out, the viewer is treated as signed out.
- Browsers block autoplay with sound, so Pulse starts muted with a sound toggle.
- Mux HLS (`.m3u8` in `mediaUrl`, poster in `thumbnailUrl`); hls.js is already a dependency; Safari plays HLS natively. A `mediaUrl` that is not an https URL (Mux still processing) is skipped.
- Copy: real punctuation, never dashes as breaks; no fee percentages; no points copy.
- Old app builds are untouched (no backend change).

## Approaches (chosen by Legend 2026-10-23: A)
- **A. Browser-loaded pages, like /events (chosen).** Each page is a small server page (title, metadata) plus a client component that loads through new BFF routes. Least new code, same pattern as /events, matches the app. Trade-off: search engines don't see posts (low value: feeds are personal and reorder every load).
- B. Server-render the signed-out first page for search, browser-load for signed in. About a day more, two code paths to keep in step, cached copies stale fast. Rejected.
- C. One /discover page switching tabs without changing the address. Ruled out by Legend's choice of separate paths.

## Decided by Legend (2026-10-23)
1. Paths: `/events` stays the Events tab; Pro `/discover`, Following `/discover/following`, Pulse `/discover/pulse`; same tab row on all four.
2. Signed out: Events, Pro, Pulse public. Following shows a sign-in prompt. Like, save, comment, follow ask to sign in.
3. Web v1 actions: like, save, comment, follow.
4. Event cards in the web Pro feed now (one per 8 posts at most, upcoming public events within 14 days).
5. Approach A.

## Outsyde green (Legend 2026-10-23: "make sure you utilize green")
Discover uses the Outsyde green alongside the gold, on the web now and in the app in steps 5 and 6. Tokens already in the code: web home page `--emerald:#1A3C34; --emerald-mid:#224d43; --off-black:#060e0c` (app/page.tsx:41); app `brandPrimary #1A3C34` (OutsydeCapture constants/theme.ts:42, :95). Gold stays the accent for the tab row, EVENT tag and Get tickets (approved mockups); green is the brand surface and secondary actions:
- Follow buttons: green #1A3C34 fill, cream #F5F0E6 text (hover #224d43). "Following" state: outline in green with cream text.
- Buy Now / Book Now pill: green #1A3C34 with cream text (same as the app's pill).
- Comment send button and the sign-in prompt's Sign in button: green fill, cream text.
- Image and video placeholders while loading, and event covers without a photo: green #1A3C34 (the /events cover already uses it, EventsClient.tsx:200), with the soft green #9FC2B5 for placeholder text.
- Stories ring for unseen stories: gold (as the app); the "You" add ring stays grey.
- Page background stays near-black (#0B0B0B, matching /events); a subtle green top glow on the Discover header (#1A3C34 to transparent) ties it to the home page.
- Contrast (computed): cream on #1A3C34 10.6:1, cream on #224d43 8.4:1, #9FC2B5 on #1A3C34 6.2:1, gold on #1A3C34 6.6:1. All pass 4.5:1.
The app gets the same green uses (Follow, Buy/Book, comment send, placeholders) when Discover EVENTS and the event card are built in step 5.

## How it works

### Tab row (shared)
One component used by `/events`, `/discover`, `/discover/following`, `/discover/pulse`. Order Events, Following, Pro, Pulse. Real links (`<a href>`), the current tab marked `aria-current="page"`. Tab row on /events goes above its existing header; nothing else on /events moves.

Look (approved mockup 7, "goutsyde.com Discover Events", canvas https://claude.ai/artifact/PkGMJ3tib9mtbYdsVvorUr, file `project/Web.dc.html`): a row of links in a 1200px max-width container (24px side padding), 28px gap, wraps on phones, 1px #1F1F1F bottom border. Each tab 48px tall, Hanken Grotesk 700 18px, title case. Current tab: #F5F0E6 text with a 2px #E8B930 bottom border; Events also shows a 20px gold ticket outline icon before its label. Other tabs: #B8B0A0, no border. The app's 12px faded gold capitals are the phone look only.

### Event card look (approved mockup 1, `project/Main.dc.html`)
Card #1C1C1E (web uses #141414 + 1px #2A2A2A border to match /events), radius 16, overflow hidden. Header row 10px 12px padding: 34px round host avatar, host name 700 14px, under it "Hosting an event" 12px #A0A0A0, and on the right a gold pill "EVENT" (#E8B930 background, black 700 10px text, letter spacing 1px, 4px 8px padding, radius 10). Cover image 230px tall (cover fit), with a date block at bottom-left 12px in: 50×56 black box radius 12, weekday 10px 700 gold capitals above the day number in Bebas Neue 26px. Footer 12px padding: title Bebas Neue 22px, under it "9:00 PM · Freeport, NY · From $25" style line 12px #A0A0A0 (built from `whenLabel`/`whereLabel`/`priceLabel`), and on the right a gold "Get tickets" button (40px tall, radius 20, black 700 14px). Whole card links to `/e/[slug]`.

### Pro (`/discover`)
- One call `GET /api/feed?limit=50`, no paging (same as the app; avoids the backend repeating own posts on every page). No `lat`/`lng`.
- Client order: own posts first, then followed authors (`authorIsFollowed`), then the backend order (the app also sorts by role and rating; the web keeps the backend order after the first two, Claude's call, see below).
- Stories bar at the top (`GET /api/stories/feed`), tap opens a simple full-screen viewer (photo or video, next/previous, close). Records a view only if the existing view route accepts the web's auth (builder verifies; skip recording otherwise).
- Event cards: one `GET /api/events` call (from now to now + 14 days, public list, limit 20). If the browser already has location permission granted (checked with the Permissions API, never prompting), the near filter is used; otherwise the soonest events. Inserted after posts 4, 12, 20 … (at most one per 8 posts), no event twice. Card per mockup 1: EVENT tag, host, cover with date block, title, time · city · price label, Get tickets → `/e/[slug]`. Reuse `priceLabel`/`whenLabel`/`whereLabel` from `app/events/eventsLogic.ts` (read-only import).
- Empty: "No posts yet". Error: a retry message (the app shows "No posts yet" on error; the web shows a real error, Claude's call).

### Following (`/discover/following`)
- Signed out: sign-in prompt with `/login?return=/discover/following`, no request.
- `GET /api/feed?scope=following&limit=30&offset=N`, more on scroll using `data.nextOffset` / `data.hasMore`; stale-response guard like /events.
- Empty: prompt to follow people.

### Pulse (`/discover/pulse`)
- `GET /api/pulse/feed?limit=20&cursor=X` (same page size as the app). Known backend limit: the cursor is only a base64 offset (routes.ts:23152) and the service ranks just the newest `limit*3` candidates (pulseService.ts:539, :577), so the feed runs dry after 3 pages (60 videos) and the last full page still says `hasMore: true`. The web treats an empty page as the end ("You're all caught up") and never retries it. Same depth as the app. `excludeIds` paging is not used in v1.
- Vertical snap scrolling, one video in view plays, others pause (IntersectionObserver). Starts muted; one sound toggle applies to all videos. Poster from `thumbnailUrl`. Tap pauses; double tap likes (signed in).
- Overlay on each video, matching the app's `PulseFeedScreenV2`: author (avatar, display name, Follow button), caption, and a right-side rail with like (count), comment (count, opens the same comments panel over the video), save, and the Book / Buy link to the author's profile when present. Signed out: same sign-in prompts as the post card.
- New `PulsePlayer` component (hls.js loaded on demand, native HLS on Safari, destroyed when off screen). `CoverVideo.tsx` is not reused or changed.
- Watch time: `POST /api/pulse/engagement` through the BFF when a video leaves view, signed in only, at least 1 second watched (same rule as the app), fields as the backend schema requires.
- Skips items whose `mediaUrl`/`videoUrl` is not an https URL.

### Post card
- Header: avatar, display name as the backend sends it, role badge, relative time ("Just now", "5h ago", "Yesterday", "3d ago", then "Oct 5"). Name links to `/account/[username]` when a username is present, else not a link (Claude's call; the web has no VendorDetail).
- Media: single image, carousel (2+ `mediaItems`, i/N counter, dots, arrow buttons, swipe), or video (muted, plays when in view, sound toggle). Media precedence copied from the app's `resolvePostMedia`.
- Buy Now / Book Now pill when the post is linked to a product or service: links to the author's profile.
- Actions: like (heart, optimistic, rolls back on error), comment (opens comments), save (optimistic). Double tap on media likes. Signed out: these open a small sign-in prompt using the app's copy ("Please sign in to like posts.", "Please sign in to comment on posts.", and a save equivalent) with a Sign in link that returns to the page.
- Follow button on the card for authors the viewer doesn't follow and isn't (uses the existing `app/api/account/follow/[targetUserId]` BFF). The app has none on Discover; Legend chose follow for web v1.
- "{n} likes", caption clamped to 2 lines with "more", "View all {n} comments".

### Comments
A side panel on desktop, bottom sheet on phones: list (`GET /api/feed/:id/comments`), add box (signed in), posting adds the comment optimistically. Plain text only, shown with textContent semantics (React escaping).

### BFF routes (new, under `app/api/discover/**`)
| Web route | Backend | Notes |
|---|---|---|
| `GET /api/discover/feed` | `GET /api/feed` | allowed keys: `limit`, `scope` (only `following`), `offset`; drops `lat`, `lng`, `city` |
| `GET /api/discover/pulse` | `GET /api/pulse/feed` | `limit` (≤ 20), `cursor` |
| `POST /api/discover/pulse/engagement` | `POST /api/pulse/engagement` | body passed through after shape check |
| `GET /api/discover/stories` | `GET /api/stories/feed` | |
| `POST/DELETE /api/discover/posts/[id]/like` | `/api/feed/:id/like` | id validated |
| `POST/DELETE /api/discover/posts/[id]/save` | `/api/feed/:id/save` | |
| `GET/POST /api/discover/posts/[id]/comments` | `/api/feed/:id/comments` | |
All forward Bearer + Cookie (shared helper like `app/api/events/_lib/bff.ts` `forward`), keep the backend status, no caching. Events cards reuse the existing `/api/events` BFF. Follow reuses the existing follow BFF.

### Navbar
Add a "Discover" link (Claude's call) to every role group, desktop and drawer, pointing at `/discover`. Navbar has no Events link today; Discover covers it through the tab row.

## Claude's calls (Legend can change any)
- Pro keeps the backend order after own and followed posts (no role or rating re-sort).
- Real error message on load failure instead of "No posts yet".
- Author name links to `/account/[username]`; Buy/Book pill links to the profile.
- Navbar gets a Discover link.
- Stories: bar plus a simple viewer, no replies or reactions.
- Event cards use location only when already allowed; the "from hosts you follow" part of the design waits for a backend field (the public events list has no host id). Without it, cards are the soonest (or nearest) public events.
- Pulse page size 20 (same as the app), ends cleanly after the backend's 60-video window.
- Pulse gets the same overlay actions as the app (like, comment, save, follow, Book/Buy link), applying Legend's web v1 actions to Pulse too.

## Left to the builder
Exact component and file names, CSS approach (scoped class prefix to avoid the `ev-*` collisions found in the audit), loading skeletons, the precise Pulse engagement body (from the backend zod schema), and the story view route's auth.

## Testing and checks
- Logic tests (`npx tsx`): media resolution, event card mixing, ordering, paging guards, relative time, BFF key filtering.
- BFF http tests against a local backend (pattern of `events-bff.http`), including Cookie forwarding for comments and engagement.
- Python Playwright checks (local): tab row on all four pages, signed-out prompts, one video playing at a time, `/events` links unchanged (re-run `events-list.browser.py`).
- `tsc`, `npm run build`, `npm run lint` (no new warnings beyond the existing pattern).
- Regression (audit D): only OutsydeCapture shares these routes, through data; no vendor site renders feed content; inside the web only `/events` gains the tab row; `eventsLogic`, `format.ts` and `hostApi.tsx` are imported, not changed.
