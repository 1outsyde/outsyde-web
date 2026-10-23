# Web Discover (Events step 4b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Discover on goutsyde.com: one tab row (Events, Following, Pro, Pulse) over `/events`, `/discover/following`, `/discover`, `/discover/pulse`, with posts, stories, event cards, Pulse videos, and like, save, comment, follow for signed-in viewers.

**Architecture:** Same pattern as `/events`: each page is a small server `page.tsx` (metadata only) plus a client component that loads through new BFF routes under `app/api/discover/**`. These forward the caller's Bearer token and Cookie to outsyde-backend. Pure logic lives in `app/discover/_lib/*.ts` and gets unit tests. UI lives in `app/discover/_ui/*` with one CSS module. No backend change, no migration.

**Tech Stack:** Next 16.2.9 (read `node_modules/next/dist/docs/` before writing route handlers or pages; AGENTS.md), React 19, CSS Modules, hls.js 1.7.3 (already a dependency). Tests: `npx tsx` unit and http tests, Python Playwright browser checks (local only).

**Spec:** `docs/superpowers/specs/2026-10-23-web-discover-design.md` (approved by Legend 2026-10-23). Audit: vault "Events Step 4b Web Discover — Audit & Regression (2026-10-23)".

## Global Constraints
- Branch `feat/web-discover` from `main` `53362a6`. One PR to outsyde-web. Never push to `main`; Legend merges in the GitHub UI after the +/- diff.
- No backend change, no new npm dependency.
- Every backend call goes through a BFF that forwards `Authorization: Bearer <outsyde_access_token>` AND the `Cookie` header, via `forward()` from `app/api/events/_lib/bff.ts` (import only, do not edit it). Comments POST and Pulse engagement only accept the backend session cookie `connect.sid`.
- Never send `lat`, `lng` or `city` to `/api/feed`: with `lat`/`lng` the backend saves them to the user (routes.ts:22299-22303).
- Colors: bg `#0B0B0B`, cream `#F5F0E6`, gold `#E8B930`, cards `#141414`, borders `#2A2A2A`, secondary text `#B8B0A0` / `#A0A0A0`, liked heart `#FF3B30`. Green: `#1A3C34` (emerald), `#224d43` (emerald-mid, hover), `#9FC2B5` (placeholder text on green). Fonts: `FONTS_HREF` (Bebas Neue + Hanken Grotesk).
- Green uses (spec "Outsyde green"): Follow button fill `#1A3C34` with cream text (hover `#224d43`); "Following" = green 1px outline, cream text; Buy Now / Book Now pill green with cream text; comment Send and sign-in prompt "Sign in" buttons green; media placeholders and event covers without a photo `#1A3C34` with `#9FC2B5` text; Discover header gets a top glow `linear-gradient(#1A3C34 → transparent)`.
- Copy: real punctuation, never a dash used as a break, no fee percentages, no points copy. Show names exactly as the backend sends them (display name or @username), never first or last name or email.
- Only `/events` and `components/Navbar.tsx` change outside the new folders. `eventsLogic.ts`, `app/e/_shared/format.ts`, `lib/coverMedia.ts`, `hostApi.tsx` and `CoverVideo.tsx` are imported or left alone, never edited.
- Media: `isPlayableUrl()` from `lib/coverMedia.ts` decides whether a media URL can play. Anything else (a Mux upload id still processing) is skipped.
- Accessibility: real `<a href>` and `<button>` elements; `aria-label` on icon buttons; `aria-current="page"` on the current tab; tap targets at least 44px; layouts work at 390px width with no horizontal scroll.

## Review Focus
1. **Token valid but session cookie gone** (cookie cleared, or a session that expired server-side): comment POST or engagement returns 401 while likes still work. Expect the sign-in prompt for comments and no crash; engagement fails silently. (Task 2 http test, Task 5 unit test `commentErrorCopy`.)
2. **Video still processing** (`mediaUrl`/`videoUrl` is a Mux upload id, not https): no broken player and no request for it. Pro shows the poster or the green placeholder; Pulse drops the item. (Task 1 tests.)
3. **Fast repeated like or save taps**: the final state matches the last thing the server confirmed, and the count never goes below 0. (Task 1 `toggleReducer` tests.)
4. **Pulse runs out** (an empty page after `hasMore: true`, or the same ids repeated): show "You're all caught up" and stop asking. No loop, no duplicate videos. (Task 1 `nextPulsePage` tests.)
5. **Events list fails or is empty while posts load**: Pro still shows its posts with no event cards and no error banner. (Task 1 `mixEventCards` test, Task 6 browser check.)

---

### Task 1: Feed logic (pure functions)

**Files:**
- Create: `app/discover/_lib/feedLogic.ts`
- Test: `tests/discover-logic.test.ts` (same harness style as `tests/events-list-logic.test.ts`: `eq()` counter, exit 1 on failure)

**Interfaces:**
- Produces:
  - `type Role = "consumer" | "photographer" | "vendor"`
  - `interface FeedAuthor { userId: string; username: string | null; displayName: string; profilePhotoUrl: string | null; role: Role }`
  - `interface FeedPost { id: string; author: FeedAuthor; caption: string; createdAt: string; likesCount: number; commentsCount: number; isLiked: boolean; isSaved: boolean; authorIsFollowed: boolean; media: PostMedia; commerce: "buy" | "book" | null }`
  - `type PostMedia = { kind: "none" } | { kind: "image"; url: string } | { kind: "carousel"; urls: string[] } | { kind: "video"; url: string | null; poster: string | null }` (a video with `url: null` is still processing; the card shows the poster or the green placeholder)
  - `interface PulseVideo { id: string; author: FeedAuthor; caption: string; videoUrl: string; poster: string | null; likesCount: number; commentsCount: number; isLiked: boolean; isSaved: boolean; commerce: "buy" | "book" | null }`
  - `interface StoryGroup { userId: string; authorName: string; avatarUrl: string | null; stories: { id: string; mediaUrl: string; mediaType: "image" | "video"; thumbnailUrl: string | null }[] }`
  - `toFeedPost(raw: unknown): FeedPost | null`: reads the `/api/feed` row (author block, `content`/`caption`, counts, flags, `product`/`service`/`photographerService` → `"buy"` for a product, `"book"` for a service; same media precedence as the app's `resolvePostMedia`). It is video when `mediaType === "video"` or `displayLayout`/`feedSurface === "pulse"`. Video url = `videoUrl || mediaUrl` if playable, else null; poster = `thumbnailUrl || imageUrl`. Image = `imageUrl || thumbnailUrl || mediaUrl || images[0]`. Carousel only when `mediaItems` has 2 or more playable urls. Returns null without an id or author.
  - `toPulseVideo(raw: unknown): PulseVideo | null`: VideoCard shape (`videoUrl`, `thumbnailUrl`, `caption`, `likeCount`, `commentCount`, `author`). Returns null when `videoUrl` is not playable.
  - `toStoryGroups(raw: unknown): StoryGroup[]`: from `{feed: [...]}`; drops stories whose `mediaUrl` isn't playable and groups left with none.
  - `sortPro(posts: FeedPost[], viewerId: string | null): FeedPost[]`: own posts first, then `authorIsFollowed`, then the input order (stable), deduped by id.
  - `type FeedItem = { type: "post"; post: FeedPost } | { type: "event"; event: EventCard }` (`EventCard` from `app/events/eventsLogic.ts`)
  - `mixEventCards(posts: FeedPost[], events: EventCard[]): FeedItem[]`: event k (0-based) goes right after the (4 + 8k)th post, counting posts from 1 (so after posts 4, 12, 20 …). Each event appears once, and no event comes after the last post.
  - `relativeTime(iso: string, now: Date, tz: string): string`: "Just now" under 1 minute, "5m ago", "5h ago", "Yesterday", "3d ago" up to 6 days, then "Oct 5" (adds the year when it differs from now's year).
  - `toggleReducer(state: {on: boolean; count: number; pending: number}, action: {type: "tap"} | {type: "settled"; on: boolean} | {type: "failed"; on: boolean}): same state type`: optimistic flip on tap; `failed` restores to the given server value; count never below 0.
  - `nextPulsePage(prev: {ids: Set<string>; done: boolean}, page: PulseVideo[], hasMore: boolean): {fresh: PulseVideo[]; ids: Set<string>; done: boolean}`: drops ids already seen; done when the page is empty, has no fresh ids, or `hasMore` is false.
  - `eventWindow(now: Date): {from: string; to: string}`: now through now + 14 days, ISO.

- [ ] **Step 1: Write failing tests** in `tests/discover-logic.test.ts`. Required cases, with these exact values:
  - `toFeedPost` with `mediaType:"video", mediaUrl:"upl_abc123", thumbnailUrl:"https://image.mux.com/x/thumbnail.jpg"` gives `{kind:"video", url:null, poster:"https://image.mux.com/x/thumbnail.jpg"}`.
  - `toFeedPost` with `mediaType:"video", mediaUrl:"https://stream.mux.com/abc.m3u8"` gives url `"https://stream.mux.com/abc.m3u8"`.
  - `feedSurface:"pulse"` with `mediaType:"image"` counts as video.
  - `mediaItems` with 3 https urls gives a carousel of 3; with 1 it gives an image using `imageUrl`.
  - `content:"hi"` with no `caption` gives caption `"hi"`.
  - a row with `product:{id:"p"}` gives commerce `"buy"`; `service:{id:"s"}` gives `"book"`.
  - `toPulseVideo` with `videoUrl:"upl_x"` returns null.
  - `toStoryGroups` drops a group whose only story has `mediaUrl:"upl_y"`.
  - `sortPro` with viewer `"me"` and input `[a(other), b(me), c(followed), b(dupe)]` gives `[b, c, a]`.
  - `mixEventCards` with 21 posts and 5 events gives events at mixed-list positions 4, 13, 22 (0-based) and 3 events in total. With 20 posts and 5 events it gives 2 events (positions 4, 13), because none comes after the last post. With 0 events it gives only posts. With 3 posts it gives no events.
  - `relativeTime` at now `2026-10-23T19:00:00Z` (zone America/New_York): `T18:59:30Z` gives "Just now", `T18:55:00Z` "4m ago", `T14:00:00Z` "5h ago", `2026-10-22T18:00:00Z` "Yesterday", `2026-10-20T18:00:00Z` "3d ago", `2026-10-05T18:00:00Z` "Oct 5", `2025-10-05T18:00:00Z` "Oct 5, 2025".
  - `toggleReducer`: from `{on:false,count:0,pending:0}`, tap → `{on:true,count:1,pending:1}`; tap again → `{on:false,count:0,pending:2}`; `failed` with `on:false` from `{on:true,count:0,pending:1}` → `{on:false,count:0,pending:0}` (count clamped at 0).
  - `nextPulsePage`: an empty page gives `done:true`; a page whose ids were all seen before gives `done:true` with no fresh items; `hasMore:false` gives `done:true` and keeps the fresh items.
  - `eventWindow(new Date("2026-10-23T19:00:00Z"))` gives `{from:"2026-10-23T19:00:00.000Z", to:"2026-11-06T19:00:00.000Z"}`.
- [ ] **Step 2: Run them and confirm they fail.** `npx tsx tests/discover-logic.test.ts`: fails because the module is missing.
- [ ] **Step 3: Implement** `app/discover/_lib/feedLogic.ts` with the signatures above. Import `isPlayableUrl` from `@/lib/coverMedia` and `EventCard` from `@/app/events/eventsLogic` (type only).
- [ ] **Step 4: Run them and confirm they pass.** `npx tsx tests/discover-logic.test.ts` should end with `0 failed`, and `npx tsc --noEmit` should be clean.
- [ ] **Step 5: Commit** `feat(discover): feed logic (posts, Pulse, stories, event mixing, toggles)`.

### Task 2: BFF routes

**Files:**
- Create: `app/api/discover/_lib/keys.ts`, `app/api/discover/feed/route.ts`, `app/api/discover/pulse/route.ts`, `app/api/discover/pulse/engagement/route.ts`, `app/api/discover/stories/route.ts`, `app/api/discover/stories/[storyId]/view/route.ts`, `app/api/discover/posts/[id]/like/route.ts`, `app/api/discover/posts/[id]/save/route.ts`, `app/api/discover/posts/[id]/comments/route.ts`, `app/api/discover/follow/[targetUserId]/route.ts`
- Test: `tests/discover-keys.test.ts` (unit), `tests/discover-bff.http.test.ts` (local, same env, skip and localhost-guard rules as `tests/events-bff.http.test.ts`, using a `DS_` prefix: `DS_WEB_URL`, `DS_BACKEND_URL`, `DS_PG_URL`, `DS_BACKEND_DIR`)

**Interfaces:**
- Consumes: `forward`, `isUuid`, `badRequest`, `readJsonObject`, `invalidBody` from `app/api/events/_lib/bff.ts`.
- Produces (web routes; each relays the backend status and body unchanged):
  - `GET /api/discover/feed`: keys `limit` (1-50), `scope` (only `following`), `offset` (≥0) → `GET /api/feed`. Every other key is dropped, so `lat`, `lng` and `city` never pass.
  - `GET /api/discover/pulse`: `limit` (1-20), `cursor` (base64 chars, ≤ 24) → `GET /api/pulse/feed`.
  - `POST /api/discover/pulse/engagement`: body must be `{postId: uuid, watchTimeMs: int ≥ 0, videoDurationMs: int ≥ 0, isRewatch?: boolean}`, else 400 `INVALID_BODY` → `POST /api/pulse/engagement`.
  - `GET /api/discover/stories` → `GET /api/stories/feed`. `POST /api/discover/stories/[storyId]/view` (uuid) → `POST /api/stories/:storyId/view`.
  - `POST|DELETE /api/discover/posts/[id]/like`, `POST|DELETE …/save` (uuid) → `/api/feed/:id/like|save`.
  - `GET|POST /api/discover/posts/[id]/comments`: POST body `{content: string, 1-500 characters after trim}`, else 400 → `/api/feed/:id/comments`.
  - `GET|POST|DELETE /api/discover/follow/[targetUserId]`: GET → `/api/follows/check/:id`, POST → `/api/follows` with `{targetUserId}`, DELETE → `/api/follows/:id`. The existing `app/api/account/follow/**` stays untouched; this one forwards Cookie too and relays status, so the UI can tell 401 apart.
  - `pickKeys(params: URLSearchParams, rules: Record<string, (v: string) => boolean>): URLSearchParams` in `keys.ts`, with rules `FEED_RULES` and `PULSE_RULES`.

- [ ] **Step 1: Write failing unit tests** `tests/discover-keys.test.ts`:
  - `pickKeys(?limit=50&lat=40&lng=-73&city=X&scope=following&offset=30, FEED_RULES)` gives `limit=50&scope=following&offset=30`.
  - `scope=pro` is dropped. `limit=0`, `limit=51` and `limit=abc` are dropped. `offset=-1` is dropped.
  - `PULSE_RULES`: `limit=21` is dropped, `cursor=MjA=` is kept, `cursor=<script>` is dropped.
- [ ] **Step 2: Run it and confirm it fails.** `npx tsx tests/discover-keys.test.ts`.
- [ ] **Step 3: Implement** `keys.ts` and the routes. Read the Next 16 route handler docs first (`node_modules/next/dist/docs/`, Route Handlers, async `params`). Bad uuids get 404 via `notFound()`.
- [ ] **Step 4: Run it and confirm it passes**, and `npx tsc --noEmit` is clean.
- [ ] **Step 5: Write the http test** `tests/discover-bff.http.test.ts`. Seed two users through `DS_PG_URL`, with password hashes made by the backend's `bcrypt`. Sign in through the web's own `POST /api/login` so the test cookie jar holds both `outsyde_access_token` and `connect.sid`. Then insert one image post, one ready video post (`mediaUrl` https m3u8, `feed_surface 'pulse'`, `media_type 'video'`) and one story. Assert:
  - signed out: `/api/discover/feed` gives 200 with `posts` an array; `?scope=following` gives 200 with `requiresAuth:true`; `/api/discover/pulse` gives 200 with `data.videos` an array; `/api/discover/stories` gives 200; like POST gives 401; comment POST gives 401.
  - `?lat=1&lng=2` signed in leaves `users.latitude` NULL in the database (checked with SQL).
  - signed in with both cookies: like POST 200, then the feed shows `isLiked:true`; like DELETE 200; save POST then DELETE 200; comment POST `{content:"Nice."}` 200, then the comment GET lists it; engagement POST `{postId, watchTimeMs:1500, videoDurationMs:10000}` 200; follow POST, then GET `isFollowing:true`, then DELETE.
  - **token only, no `connect.sid`** (Review Focus 1): comment POST 401 and engagement POST 401, while like POST is 200.
  - invalid inputs: comment `{content:""}` gives 400; a 501-character comment gives 400; engagement `{postId:"x"}` gives 400; like on `not-a-uuid` gives 404.
  - Clean up everything it created (posts, comments, likes, saves, follows, story, sessions, users).
- [ ] **Step 6: Run it** against a local backend (handoff "Local test stack notes": backend on :5071, web `next dev` on :3101). Expect `0 failed`.
- [ ] **Step 7: Commit** `feat(discover): BFF routes for feed, Pulse, stories, likes, saves, comments, follows`.

### Task 3: Tab row, /events and Navbar

**Files:**
- Create: `app/discover/_ui/DiscoverTabs.tsx`, `app/discover/_ui/discover.module.css` (shared styles for every Discover component, all class names local)
- Modify: `app/events/EventsClient.tsx` (render `<DiscoverTabs current="events" />` as the first element inside its page wrapper; nothing else changes), `components/Navbar.tsx` (add `<a href="/discover" className="on-link">Discover</a>` as the first link in each of the 5 desktop groups and the drawer equivalents with `onClick={() => setMenuOpen(false)}`)
- Test: `tests/discover-tabs.browser.py` (local, Playwright, same skip and localhost rules as `tests/events-list.browser.py`, env `DT_WEB_URL`), and re-run `tests/events-list.browser.py`

**Interfaces:**
- Produces: `DiscoverTabs({ current }: { current: "events" | "following" | "pro" | "pulse" }): JSX.Element`. It renders a `<nav aria-label="Discover">` with links in this order: Events `/events`, Following `/discover/following`, Pro `/discover`, Pulse `/discover/pulse`.
- Look (spec "Tab row"):
  - Container: max-width 1200px with 24px side padding, 28px gap, wraps on phones, 1px `#1F1F1F` bottom border.
  - Tabs: 48px tall, Hanken Grotesk 700 18px.
  - Current tab: cream text, 2px gold bottom border, `aria-current="page"`. The Events tab shows the 20px gold ticket outline icon from mockup 7.
  - Other tabs: `#B8B0A0`.
  - Header glow: `#1A3C34` fading to transparent behind the row.

- [ ] **Step 1: Write the failing browser check** `tests/discover-tabs.browser.py`:
  - On each of the 4 paths, the nav has 4 links in the order Events, Following, Pro, Pulse with the right hrefs.
  - The current one has `aria-current="page"`, and no other link has it.
  - At 390px width the page has no horizontal scroll (`scrollWidth <= clientWidth`).
  - The Navbar has a link named "Discover" to `/discover`, signed out and signed in as a consumer.
- [ ] **Step 2: Run it and confirm it fails.** `python3 tests/discover-tabs.browser.py`: the `/discover` paths 404 for now. The pages arrive in Tasks 6-8, so for this task the check covers `/events` and the Navbar only, and it skips missing paths with a printed note until those tasks are done.
- [ ] **Step 3: Implement** the component, the CSS module, the `/events` insertion and the Navbar links.
- [ ] **Step 4: Run** `python3 tests/discover-tabs.browser.py` and `python3 tests/events-list.browser.py`. Both should end with `0 failed`: every existing `/events` link name and href is unchanged. `npm run lint` should add no new warnings in the touched files.
- [ ] **Step 5: Commit** `feat(discover): shared tab row on /events and Discover link in the navbar`.

### Task 4: Viewer, client API and sign-in prompt

**Files:**
- Create: `app/discover/_lib/viewer.ts`, `app/discover/_lib/clientApi.ts`, `app/discover/_ui/SignInPrompt.tsx`
- Test: extend `tests/discover-logic.test.ts` (pure parts only)

**Interfaces:**
- Produces:
  - `useViewer(): { status: "loading" | "in" | "out"; userId: string | null; username: string | null; displayName: string | null; photo: string | null }`. It calls `GET /api/auth/me` once with no-store and maps `authenticated`, `userId`, `username`, `displayName` and `profilePhotoUrl` (never firstName, lastName or email). A 401 or 502 means `"out"`.
  - `clientApi` (all `fetch` with `cache:"no-store"`, returning `{ ok: boolean; status: number; body: any }` and never throwing): `feed({limit, scope?, offset?})`, `pulse({limit, cursor?})`, `stories()`, `storyView(id)`, `like(id, on: boolean)`, `save(id, on: boolean)`, `comments(id)`, `addComment(id, content)`, `engagement(body)`, `followCheck(userId)`, `follow(userId, on: boolean)`, `events(query: string)` (uses the existing `/api/events`).
  - `SignInPrompt({ open, message, onClose }: { open: boolean; message: string; onClose(): void })`. It's a dialog (`role="dialog"`, `aria-modal`, focus on open, Escape closes) showing the message and a green "Sign in" link to `/login?return=<current path>`, built with `safeReturn` rules from `lib/safe-return.ts`.
  - Copy constants in `viewer.ts`: `SIGN_IN_LIKE = "Please sign in to like posts."`, `SIGN_IN_COMMENT = "Please sign in to comment on posts."`, `SIGN_IN_SAVE = "Please sign in to save posts."`, `SIGN_IN_FOLLOW = "Please sign in to follow people."`, `SIGN_IN_FOLLOWING = "Sign in to see posts from people you follow."`
  - `commentErrorCopy(status: number): string`: 401 gives `SIGN_IN_COMMENT`, 400 gives "Comments can be up to 500 characters.", anything else gives `GENERIC_ERROR` from `app/e/_shared/format.ts`.

- [ ] **Step 1: Write the failing tests:** `commentErrorCopy(401) === SIGN_IN_COMMENT`, `(400)` gives the 500 characters copy, `(500)` gives `GENERIC_ERROR`. Also assert that no copy constant contains " - " or "—".
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement** the three files.
- [ ] **Step 4: Run them and confirm they pass**, and `npx tsc --noEmit` is clean.
- [ ] **Step 5: Commit** `feat(discover): viewer state, client API and sign-in prompt`.

### Task 5: Post card, media, comments, follow

**Files:**
- Create: `app/discover/_ui/PostCard.tsx`, `app/discover/_ui/PostMedia.tsx` (image, carousel, feed video), `app/discover/_ui/HlsVideo.tsx` (shared video element for posts and Pulse), `app/discover/_ui/CommentsPanel.tsx`, `app/discover/_ui/FollowButton.tsx`, `app/discover/_ui/useToggle.ts`

**Interfaces:**
- Consumes: `FeedPost`, `PostMedia`, `toggleReducer` and `relativeTime` (Task 1); `clientApi`, `useViewer` and `SignInPrompt` (Task 4).
- Produces:
  - `PostCard({ post, viewerId, onSignIn }: { post: FeedPost; viewerId: string | null; onSignIn(message: string): void })`
  - `HlsVideo({ src, poster, active, muted, loop, onTime? }: { src: string; poster: string | null; active: boolean; muted: boolean; loop: boolean; onTime?(watchedMs: number, durationMs: number, loops: number): void })`. It plays only while `active`. It loads hls.js with a dynamic `import("hls.js")` only when `src` ends in `.m3u8` and `canPlayType("application/vnd.apple.mpegurl")` is empty, and destroys the instance when it unmounts or `src` changes. It sets `playsInline` and `preload="metadata"`.
  - `useToggle(initial: {on: boolean; count: number}, send: (on: boolean) => Promise<{ok: boolean; status: number}>, onUnauthed: () => void)` returns `{ on, count, tap() }`. It uses `toggleReducer`; a 401 calls `onUnauthed` and rolls back.
  - `FollowButton({ userId, initial, viewerId, onSignIn })`: hidden when `userId === viewerId`. Green fill showing "Follow"; once following, a green outline showing "Following".
  - `CommentsPanel({ postId, open, onClose, viewer, onSignIn })`: a side panel 400px wide at 768px and up, a bottom sheet below that.
- Card behavior (spec "Post card"):
  - Header: 34px avatar, display name (a link to `/account/<username>` when a username is present), a role badge ("Business" for vendor, "Photographer"; none for consumer), `relativeTime`, and a FollowButton when not following.
  - Media: carousel with an i/N counter, dots, prev/next buttons and swipe. A double click or double tap on media likes (never unlikes) and pops a 96px heart.
  - Commerce: a green pill linking to the author's profile, reading "Buy Now" or "Book Now".
  - Actions row: like, comment and save buttons, then "{n} likes" (with "1 like" for one), the caption clamped to 2 lines with a "more" button, and "View all {n} comments" (only when n > 0).
  - Feed videos: muted, playing while at least 60% visible, with a sound toggle.

- [ ] **Step 1: Write the failing tests** (in `tests/discover-logic.test.ts`, for pure helpers added to `feedLogic.ts`):
  - `likesLabel(0) === "0 likes"`, `likesLabel(1) === "1 like"`, `likesLabel(1234) === "1,234 likes"`
  - `roleBadge("vendor") === "Business"`, `roleBadge("photographer") === "Photographer"`, `roleBadge("consumer") === null`
  - `profileHref({username:"nails_by_p"}) === "/account/nails_by_p"`, `profileHref({username:null}) === null`
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement** the helpers and the components. Comments render as text through React, never with `dangerouslySetInnerHTML`. An optimistic comment uses `viewer.displayName || "@" + viewer.username` and `viewer.photo`.
- [ ] **Step 4: Run them and confirm they pass**, and `npx tsc --noEmit` and `npm run lint` are clean for the new files.
- [ ] **Step 5: Commit** `feat(discover): post card, media, comments panel and follow button`.

### Task 6: Pro page `/discover` (stories and event cards)

**Files:**
- Create: `app/discover/page.tsx` (server, metadata `title: "Discover | Outsyde"`, description), `app/discover/ProClient.tsx`, `app/discover/_ui/StoriesBar.tsx`, `app/discover/_ui/StoryViewer.tsx`, `app/discover/_ui/EventFeedCard.tsx`
- Test: `tests/discover-pages.browser.py` (created here and extended in Tasks 7 and 8; env `DP_WEB_URL`, `DP_BACKEND_URL`, `DP_PG_URL`, `DP_BACKEND_DIR`; it seeds through SQL and the local backend and cleans up after itself)

**Interfaces:**
- Consumes: Tasks 1, 3, 4, 5; `whenLabel`, `whereLabel`, `priceLabel` from `app/events/eventsLogic.ts`.
- Behavior:
  - **Feed:** `clientApi.feed({limit:50})` once. `toFeedPost`, then `sortPro(viewerId)`, then `mixEventCards` with events from `clientApi.events(…)`. The events query uses `eventWindow(now)` with `limit=20`, plus `lat`, `lng` and `radiusKm=40` only when `navigator.permissions.query({name:"geolocation"})` is `"granted"`; it never prompts. A failed or empty events call gives no cards and no banner.
  - **Stories:** the StoriesBar sits above the posts and shows 64px rings, gold for unseen. Signed in, the first slot is "You", a grey dashed ring linking nowhere, labelled "You". It's hidden when there are no groups.
  - **Story viewer:** full screen with images for 5 seconds each and videos for their length. It has next, previous and close buttons, and Escape closes it. It calls `storyView` for each story shown, signed in only.
  - **EventFeedCard:** follows spec "Event card look" and links to `/e/<slug>`. A cover without a photo is green `#1A3C34` with the `#9FC2B5` label "Event".
  - **States:** loading skeletons; empty shows "No posts yet"; an error shows "Couldn't load posts. Try again." with a Retry button.

- [ ] **Step 1: Write the failing browser checks** in `tests/discover-pages.browser.py`, Pro section. Seed 10 posts by other users and 2 by the viewer, plus 1 published public free event starting tomorrow.
  - Signed out: posts render, the first event card sits after the 4th post and links to `/e/<slug>`, and like opens a dialog with "Please sign in to like posts.".
  - Signed in as the viewer: the viewer's 2 posts come first; liking a post turns its heart red and shows "1 like", and the like survives a reload; the comments panel opens, posting "Nice." shows it, and a reload still lists it.
  - With the events BFF route blocked through Playwright `page.route` returning 500 (Review Focus 5): posts still render and no error text shows.
  - No request from the page to `/api/discover/feed` carries `lat=` (checked with request logging).
- [ ] **Step 2: Run it and confirm it fails** (`/discover` 404).
- [ ] **Step 3: Implement** the files.
- [ ] **Step 4: Run** `python3 tests/discover-pages.browser.py`. The Pro section should end with `0 failed`, and `tests/discover-tabs.browser.py` now passes for `/discover` too.
- [ ] **Step 5: Commit** `feat(discover): Pro page with stories and event cards`.

### Task 7: Following page `/discover/following`

**Files:**
- Create: `app/discover/following/page.tsx` (metadata `title: "Following | Outsyde"`), `app/discover/following/FollowingClient.tsx`
- Test: extend `tests/discover-pages.browser.py`

**Interfaces:**
- Consumes: Tasks 1, 3, 4, 5.
- Behavior:
  - **Signed out:** show `SIGN_IN_FOLLOWING` with a green Sign in link and make **no** feed request.
  - **Signed in:** call `clientApi.feed({limit:30, scope:"following", offset})`, loading more when a sentinel scrolls into view. Use the next offset from `data.nextOffset` and keep going while `data.hasMore === true`. Dedupe by id, and discard stale responses with a sequence counter, as in `EventsClient.tsx`.
  - **Empty:** "Follow people to see their posts here."

- [ ] **Step 1: Write the failing checks:**
  - Signed out: the prompt text shows and the page logs zero requests to `/api/discover/feed` (Review Focus 4 of the audit).
  - Signed in following 1 author with 35 posts: 30 render first, scrolling loads 5 more, and all 35 ids are unique.
  - Signed in following nobody: the empty copy shows.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement** the page.
- [ ] **Step 4: Run them and confirm they pass.**
- [ ] **Step 5: Commit** `feat(discover): Following page`.

### Task 8: Pulse page `/discover/pulse`

**Files:**
- Create: `app/discover/pulse/page.tsx` (metadata `title: "Pulse | Outsyde"`), `app/discover/pulse/PulseClient.tsx`, `app/discover/_ui/PulseItem.tsx`
- Test: extend `tests/discover-pages.browser.py`

**Interfaces:**
- Consumes: `toPulseVideo` and `nextPulsePage` (Task 1), `HlsVideo`, `useToggle`, `CommentsPanel` and `FollowButton` (Task 5), and Task 4.
- Behavior (spec "Pulse"):
  - **Layout:** full-height items (`100dvh` minus the header) with `scroll-snap-type: y mandatory`.
  - **Playback:** an IntersectionObserver at 0.8 threshold sets the single active item, so only one video plays at a time. All videos start muted. One sound toggle (aria-label "Turn sound on" / "Turn sound off") applies to all of them.
  - **Taps:** a tap pauses or resumes and shows a 72px pause icon; a double tap likes.
  - **Paging:** `clientApi.pulse({limit:20, cursor})` with `nextPulsePage`. When done, show the end card "You're all caught up".
  - **Overlay (mirrors the app's `PulseFeedScreenV2`):**
    - Bottom left: 42px avatar, display name, "@username" when present, a FollowButton (state from `clientApi.followCheck` once per author for signed-in viewers, cached in a Map), a 2-line caption, and the green Buy/Book pill linking to the profile.
    - Right rail: like with count, comment with count (opens CommentsPanel over the video), save, and the sound toggle.
    - Gradient from transparent to `rgba(0,0,0,0.75)` over the bottom 55%.
  - **Watch time:** when an item stops being active, if signed in and watched for at least 1000 ms, send `clientApi.engagement({postId, watchTimeMs, videoDurationMs: duration || 30000, isRewatch: loops > 0})`, silently, with no retry.
  - **Empty:** "No videos yet".

- [ ] **Step 1: Write the failing checks.** Seed 25 ready videos (https m3u8 URLs to a local test HLS file served by the check, or MP4 under `/public` in the test only), plus 1 video whose `mediaUrl` is `upl_test`. Then check that:
  - the upload-id item never renders (Review Focus 2);
  - at any moment at most 1 `<video>` has `paused === false`;
  - every video starts with `muted === true`;
  - scrolling to the end shows "You're all caught up" and the page then stops requesting `/api/discover/pulse` (Review Focus 4);
  - signed in, after watching more than 1 second and scrolling on, one `POST /api/discover/pulse/engagement` request appears;
  - signed out, like opens the sign-in dialog.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement** the files.
- [ ] **Step 4: Run them and confirm they pass**, along with all of `tests/discover-pages.browser.py` and `tests/discover-tabs.browser.py`.
- [ ] **Step 5: Commit** `feat(discover): Pulse page`.

### Task 9: Whole-branch verification and handoff

**Files:**
- Modify: none in code. Vault notes are updated on Legend's PC: Design note status, Audit note "Build status", Home, Priority Queue, the Regression Check Protocol hotspot table (new row: `app/api/discover/**` BFFs, with consumers being the Discover pages only), and the Launch Board row p3-webfeed.

- [ ] **Step 1: Run everything:** `npx tsx` on every `tests/*.test.ts`, the two http suites against the local stack (`tests/events-bff.http.test.ts` still `0 failed`), every `tests/*.browser.py` (all `0 failed` or the documented skip), `npx tsc --noEmit` (0 errors), `npm run lint` (no new warnings compared with `main`), and `npm run build` in a separate worktree with a hard-linked `node_modules` (succeeds, and the `/discover`, `/discover/following` and `/discover/pulse` routes are listed).
- [ ] **Step 2: Regression re-check:** `git diff main --stat` touches only `app/discover/**`, `app/api/discover/**`, `app/events/EventsClient.tsx`, `components/Navbar.tsx`, `tests/discover-*`, `docs/superpowers/**`. Grep confirms `eventsLogic.ts`, `format.ts`, `coverMedia.ts`, `hostApi.tsx`, `CoverVideo.tsx` and `app/api/account/follow/**` are unchanged.
- [ ] **Step 3: Whole-branch review** by a fresh reviewer on the most capable model, against the spec and this plan. Fix the findings, then re-run Step 1.
- [ ] **Step 4: Push the branch and open the PR** "Web Discover: Following, Pro, Pulse with event cards (Events step 4b)". The body lists the routes, the no-backend-change note, the session cookie note, the test counts and the vault links, plus the attribution lines. Show Legend the +/- diff. Vercel preview: check one real Pulse video and one image post on the preview.
- [ ] **Step 5: Update the vault notes and the Launch Board** (p3-webfeed: "PR open, awaiting merge"), and write the next-chat handoff for step 5 (app Discover EVENTS tab and event card, using the same green uses).
