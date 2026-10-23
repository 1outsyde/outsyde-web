// Pure helpers for the web Discover page: shape raw API rows, order and mix
// the feed, format times, and run optimistic like/save toggles.
import { isPlayableUrl } from "@/lib/coverMedia";
import type { EventCard } from "@/app/events/eventsLogic";

export type Role = "consumer" | "photographer" | "vendor";

export interface FeedAuthor {
  userId: string;
  username: string | null;
  displayName: string;
  profilePhotoUrl: string | null;
  role: Role;
}

export type PostMedia =
  | { kind: "none" }
  | { kind: "image"; url: string }
  | { kind: "carousel"; urls: string[] }
  | { kind: "video"; url: string | null; poster: string | null };

export interface FeedPost {
  id: string;
  author: FeedAuthor;
  caption: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  authorIsFollowed: boolean;
  media: PostMedia;
  commerce: "buy" | "book" | null;
}

export interface PulseVideo {
  id: string;
  author: FeedAuthor;
  caption: string;
  videoUrl: string;
  poster: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  commerce: "buy" | "book" | null;
}

export interface StoryGroup {
  userId: string;
  authorName: string;
  avatarUrl: string | null;
  stories: { id: string; mediaUrl: string; mediaType: "image" | "video"; thumbnailUrl: string | null }[];
}

type Rec = Record<string, unknown>;
const isRec = (x: unknown): x is Rec => !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown): string => (typeof x === "string" ? x : "");
const num = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? x : 0);
const hasObj = (x: unknown): boolean => isRec(x) && !!str(x.id);

function toAuthor(raw: unknown): FeedAuthor | null {
  if (!isRec(raw)) return null;
  const userId = str(raw.userId);
  if (!userId) return null;
  const role: Role = raw.role === "photographer" || raw.role === "vendor" ? raw.role : "consumer";
  const username = str(raw.username) || null;
  return {
    userId,
    username,
    displayName: str(raw.displayName) || username || "Outsyde member",
    profilePhotoUrl: str(raw.profilePhotoUrl) || null,
    role,
  };
}

function firstPlayable(...vals: unknown[]): string | null {
  for (const v of vals) {
    const s = str(v);
    if (isPlayableUrl(s)) return s;
  }
  return null;
}

function postMedia(r: Rec): PostMedia {
  const isVideo = r.mediaType === "video" || r.displayLayout === "pulse" || r.feedSurface === "pulse";
  if (isVideo) {
    const url = firstPlayable(r.videoUrl, r.mediaUrl);
    const poster = firstPlayable(r.thumbnailUrl, r.imageUrl);
    return { kind: "video", url, poster };
  }
  const items = Array.isArray(r.mediaItems) ? r.mediaItems : [];
  const urls = items.map((m) => (isRec(m) ? str(m.url) : "")).filter((u) => isPlayableUrl(u));
  if (urls.length >= 2) return { kind: "carousel", urls };
  const images = Array.isArray(r.images) ? r.images : [];
  const url = firstPlayable(r.imageUrl, r.thumbnailUrl, r.mediaUrl, images[0], urls[0]);
  return url ? { kind: "image", url } : { kind: "none" };
}

export function toFeedPost(raw: unknown): FeedPost | null {
  if (!isRec(raw)) return null;
  const id = str(raw.id);
  const author = toAuthor(raw.author);
  if (!id || !author) return null;
  const commerce = hasObj(raw.product) ? "buy" : hasObj(raw.service) || hasObj(raw.photographerService) ? "book" : null;
  return {
    id,
    author,
    caption: str(raw.caption) || str(raw.content),
    createdAt: str(raw.createdAt),
    likesCount: num(raw.likesCount),
    commentsCount: num(raw.commentsCount),
    isLiked: raw.isLiked === true,
    isSaved: raw.isSaved === true,
    authorIsFollowed: raw.authorIsFollowed === true,
    media: postMedia(raw),
    commerce,
  };
}

export function toPulseVideo(raw: unknown): PulseVideo | null {
  if (!isRec(raw)) return null;
  const id = str(raw.id);
  const author = toAuthor(raw.author);
  const videoUrl = str(raw.videoUrl);
  if (!id || !author || !isPlayableUrl(videoUrl)) return null;
  const commerce = str(raw.productId) ? "buy" : str(raw.serviceId) || str(raw.photographerServiceId) ? "book" : null;
  return {
    id,
    author,
    caption: str(raw.caption),
    videoUrl,
    poster: firstPlayable(raw.thumbnailUrl),
    likesCount: num(raw.likeCount),
    commentsCount: num(raw.commentCount),
    isLiked: raw.isLiked === true,
    isSaved: raw.isSaved === true,
    commerce,
  };
}

export function toStoryGroups(raw: unknown): StoryGroup[] {
  const feed = isRec(raw) && Array.isArray(raw.feed) ? raw.feed : [];
  const out: StoryGroup[] = [];
  for (const g of feed) {
    if (!isRec(g)) continue;
    const userId = str(g.userId);
    if (!userId) continue;
    const stories = (Array.isArray(g.stories) ? g.stories : []).flatMap((s) => {
      if (!isRec(s)) return [];
      const id = str(s.id);
      const mediaUrl = str(s.mediaUrl);
      if (!id || !isPlayableUrl(mediaUrl)) return [];
      return [{
        id,
        mediaUrl,
        mediaType: s.mediaType === "video" ? ("video" as const) : ("image" as const),
        thumbnailUrl: firstPlayable(s.thumbnailUrl),
      }];
    });
    if (stories.length === 0) continue;
    out.push({ userId, authorName: str(g.authorName), avatarUrl: str(g.authorAvatarUrl) || null, stories });
  }
  return out;
}

export function sortPro(posts: FeedPost[], viewerId: string | null): FeedPost[] {
  const seen = new Set<string>();
  const unique = posts.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  const rank = (p: FeedPost) => (viewerId && p.author.userId === viewerId ? 0 : p.authorIsFollowed ? 1 : 2);
  return unique
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map((x) => x.p);
}

export type FeedItem = { type: "post"; post: FeedPost } | { type: "event"; event: EventCard };

export function mixEventCards(posts: FeedPost[], events: EventCard[]): FeedItem[] {
  const out: FeedItem[] = [];
  let k = 0;
  posts.forEach((post, i) => {
    out.push({ type: "post", post });
    // Event k goes after the (4 + 8k)th post, but never after the last post.
    if (i + 1 === 4 + 8 * k && i + 1 < posts.length && k < events.length) {
      out.push({ type: "event", event: events[k] });
      k++;
    }
  });
  return out;
}

function ymd(d: Date, tz: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function relativeTime(iso: string, now: Date, tz: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 60_000) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const a = ymd(then, tz);
  const b = ymd(now, tz);
  const days = Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
  if (days <= 1) return "Yesterday";
  if (days <= 6) return `${days}d ago`;
  const label = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(then);
  return a.y === b.y ? label : `${label}, ${a.y}`;
}

export interface ToggleState { on: boolean; count: number; pending: number }
export type ToggleAction = { type: "tap" } | { type: "settled"; on: boolean } | { type: "failed"; on: boolean };

export function toggleReducer(state: ToggleState, action: ToggleAction): ToggleState {
  switch (action.type) {
    case "tap":
      return { on: !state.on, count: Math.max(0, state.count + (state.on ? -1 : 1)), pending: state.pending + 1 };
    case "settled":
    case "failed": {
      // Later taps may still be in flight; only reconcile once the last one answers.
      const pending = Math.max(0, state.pending - 1);
      if (pending > 0) return { ...state, pending };
      const delta = action.on === state.on ? 0 : action.on ? 1 : -1;
      return { on: action.on, count: Math.max(0, state.count + delta), pending: 0 };
    }
  }
}

export function nextPulsePage(
  prev: { ids: Set<string>; done: boolean },
  page: PulseVideo[],
  hasMore: boolean,
): { fresh: PulseVideo[]; ids: Set<string>; done: boolean } {
  const ids = new Set(prev.ids);
  const fresh: PulseVideo[] = [];
  for (const v of page) {
    if (ids.has(v.id)) continue;
    ids.add(v.id);
    fresh.push(v);
  }
  return { fresh, ids, done: page.length === 0 || fresh.length === 0 || !hasMore };
}

export function eventWindow(now: Date): { from: string; to: string } {
  return { from: now.toISOString(), to: new Date(now.getTime() + 14 * 86_400_000).toISOString() };
}

export function likesLabel(n: number): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? "like" : "likes"}`;
}

export function roleBadge(role: Role): string | null {
  return role === "vendor" ? "Business" : role === "photographer" ? "Photographer" : null;
}

export function profileHref(author: { username: string | null }): string | null {
  return author.username ? `/account/${encodeURIComponent(author.username)}` : null;
}

/** Request bookkeeping for a serialized toggle: at most one request in flight. */
export interface ToggleSync { server: boolean; wanted: boolean; inFlight: boolean; covered: number; unsent: number }
type SettleAction = Extract<ToggleAction, { type: "settled" | "failed" }>;
const repeat = (n: number, a: SettleAction): SettleAction[] => Array.from({ length: n }, () => a);

/** A tap: flips the wanted state; returns the state to send, or null while a request is in flight. */
export function toggleTap(s: ToggleSync): { sync: ToggleSync; send: boolean | null } {
  const wanted = !s.wanted;
  if (s.inFlight) return { sync: { ...s, wanted, unsent: s.unsent + 1 }, send: null };
  return { sync: { ...s, wanted, inFlight: true, covered: s.unsent + 1, unsent: 0 }, send: wanted };
}

/**
 * The in-flight request for `target` answered. Returns the reducer actions (one per
 * tap it settles), the next state to send (or null), and whether it was a 401.
 * Once nothing is in flight or queued, wanted is reset to the server state.
 */
export function toggleSettle(
  s: ToggleSync,
  res: { ok: boolean; status: number },
  target: boolean,
): { sync: ToggleSync; actions: SettleAction[]; send: boolean | null; unauthed: boolean } {
  const idle = (server: boolean): ToggleSync => ({ server, wanted: server, inFlight: false, covered: 0, unsent: 0 });
  if (res.status === 401) {
    return { sync: idle(s.server), actions: repeat(s.covered + s.unsent, { type: "failed", on: s.server }), send: null, unauthed: true };
  }
  const server = res.ok ? target : s.server;
  const actions = repeat(s.covered, { type: res.ok ? "settled" : "failed", on: server });
  if (s.unsent > 0 && s.wanted !== server) {
    return { sync: { server, wanted: s.wanted, inFlight: true, covered: s.unsent, unsent: 0 }, actions, send: s.wanted, unauthed: false };
  }
  return { sync: idle(server), actions: [...actions, ...repeat(s.unsent, { type: "settled", on: server })], send: null, unauthed: false };
}
