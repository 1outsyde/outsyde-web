/** Unit tests for the web Discover feed helpers. No server needed: npx tsx tests/discover-logic.test.ts */
import {
  toFeedPost, toPulseVideo, toStoryGroups, sortPro, mixEventCards, relativeTime,
  toggleReducer, nextPulsePage, eventWindow, likesLabel, roleBadge, profileHref,
  type FeedPost, type PulseVideo,
} from "../app/discover/_lib/feedLogic";
import {
  commentErrorCopy, SIGN_IN_LIKE, SIGN_IN_COMMENT, SIGN_IN_SAVE, SIGN_IN_FOLLOW, SIGN_IN_FOLLOWING,
} from "../app/discover/_lib/viewer";
import { GENERIC_ERROR } from "../app/e/_shared/format";
import type { EventCard } from "../app/events/eventsLogic";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}
const NY = "America/New_York";
const author = { userId: "u1", username: "u", displayName: "U", profilePhotoUrl: null, role: "vendor" };
const row = (o: Record<string, unknown> = {}) => ({ id: "p1", authorId: "u1", author, content: "", imageUrl: "", mediaUrl: "", thumbnailUrl: "", mediaType: "image", ...o });

console.log("toFeedPost");
eq((toFeedPost(row({ mediaType: "video", mediaUrl: "upl_abc123", thumbnailUrl: "https://image.mux.com/x/thumbnail.jpg" })) as FeedPost).media,
  { kind: "video", url: null, poster: "https://image.mux.com/x/thumbnail.jpg" }, "processing video: url null, poster kept");
eq((toFeedPost(row({ mediaType: "video", mediaUrl: "https://stream.mux.com/abc.m3u8" })) as FeedPost).media,
  { kind: "video", url: "https://stream.mux.com/abc.m3u8", poster: null }, "playable video");
eq((toFeedPost(row({ mediaType: "image", feedSurface: "pulse", mediaUrl: "https://stream.mux.com/z.m3u8" })) as FeedPost).media.kind, "video", "pulse surface counts as video");
const items = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `https://cdn.x/${i}.jpg`, type: "image" }));
eq((toFeedPost(row({ mediaItems: items(3), imageUrl: "https://cdn.x/main.jpg" })) as FeedPost).media, { kind: "carousel", urls: ["https://cdn.x/0.jpg", "https://cdn.x/1.jpg", "https://cdn.x/2.jpg"] }, "3 items: carousel");
eq((toFeedPost(row({ mediaItems: items(1), imageUrl: "https://cdn.x/main.jpg" })) as FeedPost).media, { kind: "image", url: "https://cdn.x/main.jpg" }, "1 item: image uses imageUrl");
eq((toFeedPost(row({})) as FeedPost).media, { kind: "none" }, "no media");
eq((toFeedPost(row({ content: "hi" })) as FeedPost).caption, "hi", "content fallback for caption");
eq((toFeedPost(row({ content: "hi", caption: "cap" })) as FeedPost).caption, "cap", "caption wins");
eq((toFeedPost(row({ product: { id: "p" } })) as FeedPost).commerce, "buy", "product: buy");
eq((toFeedPost(row({ service: { id: "s" } })) as FeedPost).commerce, "book", "service: book");
eq((toFeedPost(row({ photographerService: { id: "s" } })) as FeedPost).commerce, "book", "photographerService: book");
eq((toFeedPost(row({ product: null, service: null })) as FeedPost).commerce, null, "no commerce");
eq(toFeedPost({ ...row(), id: "" }), null, "no id");
eq(toFeedPost({ ...row(), author: null }), null, "no author");
eq(toFeedPost(null), null, "non-object");

console.log("toPulseVideo");
const vc = (o: Record<string, unknown> = {}) => ({ id: "v1", videoUrl: "https://stream.mux.com/a.m3u8", thumbnailUrl: "", caption: "c", likeCount: 2, commentCount: 1, isLiked: false, isSaved: false, author, ...o });
eq(toPulseVideo(vc({ videoUrl: "upl_x" })), null, "unplayable video url");
eq(toPulseVideo(vc())?.poster, null, "empty thumbnail is null poster");
eq(toPulseVideo(vc({ productId: "p" }))?.commerce, "buy", "productId: buy");
eq(toPulseVideo(vc({ serviceId: "s" }))?.commerce, "book", "serviceId: book");
eq(toPulseVideo(vc({ photographerServiceId: "s" }))?.commerce, "book", "photographerServiceId: book");
eq(toPulseVideo(vc({ productId: "" }))?.commerce, null, "empty id is none");
eq([toPulseVideo(vc())?.likesCount, toPulseVideo(vc())?.commentsCount], [2, 1], "counts mapped");

console.log("toStoryGroups");
const sg = (stories: unknown[]) => ({ feed: [{ userId: "a", authorName: "A", authorAvatarUrl: null, stories }] });
eq(toStoryGroups(sg([{ id: "s1", mediaUrl: "upl_y", mediaType: "video" }])), [], "drops unplayable-only group");
eq(toStoryGroups(sg([{ id: "s1", mediaUrl: "upl_y", mediaType: "video" }, { id: "s2", mediaUrl: "https://cdn.x/a.jpg", mediaType: "image", thumbnailUrl: "" }])),
  [{ userId: "a", authorName: "A", avatarUrl: null, stories: [{ id: "s2", mediaUrl: "https://cdn.x/a.jpg", mediaType: "image", thumbnailUrl: null }] }], "keeps playable stories");
eq(toStoryGroups(null), [], "bad input");

console.log("sortPro");
const mk = (id: string, authorId: string, followed = false) => ({ id, author: { ...author, userId: authorId }, authorIsFollowed: followed } as unknown as FeedPost);
eq(sortPro([mk("a", "x"), mk("b", "me"), mk("c", "y", true), mk("b", "me")], "me").map((p) => p.id), ["b", "c", "a"], "own, followed, rest, deduped");
eq(sortPro([mk("a", "x"), mk("b", "y")], null).map((p) => p.id), ["a", "b"], "no viewer keeps order");

console.log("mixEventCards");
const posts = (n: number) => Array.from({ length: n }, (_, i) => mk(`p${i}`, "x"));
const evs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `e${i}` }) as unknown as EventCard);
const pos = (l: ReturnType<typeof mixEventCards>) => l.map((x, i) => (x.type === "event" ? i : -1)).filter((i) => i >= 0);
eq(pos(mixEventCards(posts(21), evs(5))), [4, 13, 22], "21 posts, 5 events");
eq(pos(mixEventCards(posts(20), evs(5))), [4, 13], "20 posts, 5 events");
eq(mixEventCards(posts(5), []).length, 5, "no events");
eq(pos(mixEventCards(posts(3), evs(2))), [], "3 posts: no events");
eq(pos(mixEventCards(posts(4), evs(2))), [], "event not after last post when posts = 4");

console.log("relativeTime");
const now = new Date("2026-10-23T19:00:00Z");
eq(relativeTime("2026-10-23T18:59:30Z", now, NY), "Just now", "just now");
eq(relativeTime("2026-10-23T18:55:00Z", now, NY), "5m ago", "5m ago");
eq(relativeTime("2026-10-23T14:00:00Z", now, NY), "5h ago", "hours");
eq(relativeTime("2026-10-22T18:00:00Z", now, NY), "Yesterday", "yesterday");
eq(relativeTime("2026-10-20T18:00:00Z", now, NY), "3d ago", "days");
eq(relativeTime("2026-10-05T18:00:00Z", now, NY), "Oct 5", "date");
eq(relativeTime("2025-10-05T18:00:00Z", now, NY), "Oct 5, 2025", "date with year");
eq(relativeTime("2026-10-23T19:30:00Z", now, NY), "Just now", "future clamps");

console.log("toggleReducer");
const t1 = toggleReducer({ on: false, count: 0, pending: 0 }, { type: "tap" });
eq(t1, { on: true, count: 1, pending: 1 }, "tap on");
eq(toggleReducer(t1, { type: "tap" }), { on: false, count: 0, pending: 2 }, "tap off");
eq(toggleReducer({ on: true, count: 0, pending: 1 }, { type: "failed", on: false }), { on: false, count: 0, pending: 0 }, "failed restores, clamped");
eq(toggleReducer({ on: true, count: 5, pending: 1 }, { type: "settled", on: true }), { on: true, count: 5, pending: 0 }, "settled");
eq(toggleReducer({ on: false, count: 0, pending: 0 }, { type: "tap" }).count, 1, "count up");
eq(toggleReducer({ on: false, count: 0, pending: 1 }, { type: "failed", on: true }), { on: true, count: 1, pending: 0 }, "failed to on adds one");
eq(toggleReducer({ on: true, count: 1, pending: 1 }, { type: "settled", on: false }), { on: false, count: 0, pending: 0 }, "settled adopts a different server value");
{
  let s = toggleReducer({ on: false, count: 0, pending: 0 }, { type: "tap" });
  s = toggleReducer(s, { type: "tap" });
  s = toggleReducer(s, { type: "failed", on: false });
  eq(s, { on: false, count: 0, pending: 1 }, "tap, tap, failed: only pending changes while one is in flight");
  eq(toggleReducer(s, { type: "settled", on: false }), { on: false, count: 0, pending: 0 }, "then settled reconciles");
}
{
  let s = { on: false, count: 0, pending: 0 };
  for (let i = 0; i < 3; i++) s = toggleReducer(s, { type: "tap" });
  s = toggleReducer(s, { type: "failed", on: false });
  s = toggleReducer(s, { type: "settled", on: false });
  eq(s, { on: true, count: 1, pending: 1 }, "three taps, two answers: still optimistic");
  eq(toggleReducer(s, { type: "settled", on: true }), { on: true, count: 1, pending: 0 }, "last answer on:true");
}

console.log("nextPulsePage");
const pv = (id: string) => ({ id }) as unknown as PulseVideo;
const e0 = { ids: new Set<string>(), done: false };
eq(nextPulsePage(e0, [], true).done, true, "empty page done");
const seen = { ids: new Set(["a", "b"]), done: false };
const r2 = nextPulsePage(seen, [pv("a"), pv("b")], true);
eq([r2.done, r2.fresh.length], [true, 0], "all seen done");
const r3 = nextPulsePage(seen, [pv("a"), pv("c")], false);
eq([r3.done, r3.fresh.map((v) => v.id), [...r3.ids]], [true, ["c"], ["a", "b", "c"]], "hasMore false keeps fresh");
eq(nextPulsePage(seen, [pv("c")], true).done, false, "more to come");

console.log("eventWindow");
eq(eventWindow(new Date("2026-10-23T19:00:00Z")), { from: "2026-10-23T19:00:00.000Z", to: "2026-11-06T19:00:00.000Z" }, "14 days");

console.log("card labels");
eq(likesLabel(0), "0 likes", "likesLabel 0");
eq(likesLabel(1), "1 like", "likesLabel 1");
eq(likesLabel(1234), "1,234 likes", "likesLabel 1234");
eq(roleBadge("vendor"), "Business", "roleBadge vendor");
eq(roleBadge("photographer"), "Photographer", "roleBadge photographer");
eq(roleBadge("consumer"), null, "roleBadge consumer");
eq(profileHref({ username: "nails_by_p" }), "/account/nails_by_p", "profileHref username");
eq(profileHref({ username: null }), null, "profileHref none");

console.log("viewer copy");
eq(commentErrorCopy(401), SIGN_IN_COMMENT, "401: sign in to comment");
eq(commentErrorCopy(400), "Comments can be up to 500 characters.", "400: length copy");
eq(commentErrorCopy(500), GENERIC_ERROR, "500: generic");
eq(commentErrorCopy(0), GENERIC_ERROR, "network error: generic");
for (const c of [SIGN_IN_LIKE, SIGN_IN_COMMENT, SIGN_IN_SAVE, SIGN_IN_FOLLOW, SIGN_IN_FOLLOWING, commentErrorCopy(400)]) {
  eq(c.includes(" - ") || c.includes("\u2014"), false, `no dash break: ${c}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
