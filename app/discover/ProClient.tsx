"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FONTS_HREF } from "../e/_shared/format";
import { NEAR_ME_RADIUS_KM, isEventCard, type Coords, type EventCard } from "../events/eventsLogic";
import { eventWindow, mixEventCards, sortPro, toFeedPost, toStoryGroups, type FeedPost, type StoryGroup } from "./_lib/feedLogic";
import { clientApi } from "./_lib/clientApi";
import { useViewer } from "./_lib/viewer";
import DiscoverTabs from "./_ui/DiscoverTabs";
import EventFeedCard from "./_ui/EventFeedCard";
import { FollowStateProvider } from "./_ui/followState";
import PostCard from "./_ui/PostCard";
import SignInPrompt from "./_ui/SignInPrompt";
import StoriesBar from "./_ui/StoriesBar";
import StoryViewer from "./_ui/StoryViewer";
import styles from "./_ui/discover.module.css";

type Feed = { status: "loading" } | { status: "error" } | { status: "ready"; posts: FeedPost[] };

/** Coordinates only when location permission is already granted. Never prompts; any failure is null. */
async function grantedCoords(): Promise<Coords | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions || !navigator.geolocation) return null;
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (status.state !== "granted") return null;
    return await new Promise<Coords | null>((resolve) => {
      const fallback = setTimeout(() => resolve(null), 6000);
      navigator.geolocation.getCurrentPosition(
        (p) => { clearTimeout(fallback); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        () => { clearTimeout(fallback); resolve(null); },
        { timeout: 5000, maximumAge: 5 * 60 * 1000 },
      );
    });
  } catch {
    return null;
  }
}

/** Upcoming public events for the feed cards. Any failure gives an empty list (no cards, no banner). */
async function loadEvents(now: Date): Promise<EventCard[]> {
  try {
    const w = eventWindow(now);
    const query = new URLSearchParams({ from: w.from, to: w.to, limit: "20" });
    const coords = await grantedCoords();
    if (coords) {
      query.set("lat", String(coords.lat));
      query.set("lng", String(coords.lng));
      query.set("radiusKm", String(NEAR_ME_RADIUS_KM));
    }
    const res = await clientApi.events(query.toString());
    if (!res.ok || res.body?.success !== true || !Array.isArray(res.body.events)) return [];
    const seen = new Set<string>();
    return (res.body.events as unknown[]).filter(isEventCard).filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  } catch {
    return [];
  }
}

function Skeleton() {
  return (
    <div className={styles.skeletonList} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonHead}><span className={styles.skeletonDot} /><span className={styles.skeletonLine} /></div>
          <div className={styles.skeletonMedia} />
        </div>
      ))}
    </div>
  );
}

export default function ProClient() {
  const viewer = useViewer();
  const [feed, setFeed] = useState<Feed>({ status: "loading" });
  const [events, setEvents] = useState<EventCard[]>([]);
  // Only read after mount (cards render on the client only), so the server's value never shows.
  const [now] = useState(() => new Date());
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [seenStories, setSeenStories] = useState<ReadonlySet<string>>(() => new Set());
  const [openStories, setOpenStories] = useState<number | null>(null);
  const [prompt, setPrompt] = useState({ open: false, message: "" });
  const feedSeq = useRef(0);

  const fetchFeed = useCallback(async (): Promise<Feed | null> => {
    const id = ++feedSeq.current;
    const res = await clientApi.feed({ limit: 50 });
    if (id !== feedSeq.current) return null; // a newer load (Retry) owns the state
    const raw = res.body?.data?.posts ?? res.body?.posts;
    if (!res.ok || !Array.isArray(raw)) return { status: "error" };
    return { status: "ready", posts: (raw as unknown[]).map(toFeedPost).filter((p): p is FeedPost => p !== null) };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchFeed().then((f) => { if (alive && f) setFeed(f); });
    loadEvents(now).then((list) => { if (alive) setEvents(list); });
    clientApi.stories().then((res) => { if (alive && res.ok) setStories(toStoryGroups(res.body)); });
    return () => { alive = false; };
  }, [fetchFeed, now]);

  const retry = useCallback(() => {
    setFeed({ status: "loading" });
    fetchFeed().then((f) => { if (f) setFeed(f); });
  }, [fetchFeed]);

  const onSignIn = useCallback((message: string) => setPrompt({ open: true, message }), []);
  const closePrompt = useCallback(() => setPrompt((p) => ({ ...p, open: false })), []);
  const closeStories = useCallback(() => setOpenStories(null), []);
  const storyShown = useCallback((id: string) => {
    setSeenStories((s) => (s.has(id) ? s : new Set(s).add(id)));
  }, []);

  const viewerId = viewer.userId;
  const ready = feed.status === "ready" && viewer.status !== "loading";
  const items = useMemo(
    () => (feed.status === "ready" ? mixEventCards(sortPro(feed.posts, viewerId), events) : []),
    [feed, viewerId, events],
  );

  return (
    <main className={styles.proPage}>
      <DiscoverTabs current="pro" />
      <link href={FONTS_HREF} rel="stylesheet" />
      <div className={styles.proWrap}>
        <h1 className={styles.srOnly}>Discover</h1>
        <StoriesBar groups={stories} seen={seenStories} signedIn={viewer.status === "in"} onOpen={setOpenStories} />

        {feed.status === "error" ? (
          <div className={styles.feedState}>
            <p role="alert" className={styles.feedStateText}>Couldn&apos;t load posts. Try again.</p>
            <button type="button" className={styles.retryBtn} onClick={retry}>Retry</button>
          </div>
        ) : !ready ? (
          <>
            <p role="status" className={styles.srOnly}>Loading posts</p>
            <Skeleton />
          </>
        ) : items.length === 0 ? (
          <div className={styles.feedState}>
            <p className={styles.feedStateText}>No posts yet</p>
          </div>
        ) : (
          <FollowStateProvider>
            <section aria-label="Posts" className={styles.feed}>
              {items.map((item) =>
                item.type === "post" ? (
                  <PostCard key={item.post.id} post={item.post} viewerId={viewerId} viewer={viewer} onSignIn={onSignIn} />
                ) : (
                  <EventFeedCard key={`event-${item.event.id}`} event={item.event} now={now} />
                ),
              )}
            </section>
          </FollowStateProvider>
        )}
      </div>

      {openStories !== null ? (
        <StoryViewer
          groups={stories}
          start={openStories}
          signedIn={viewer.status === "in"}
          onShown={storyShown}
          onClose={closeStories}
        />
      ) : null}
      <SignInPrompt open={prompt.open} message={prompt.message} onClose={closePrompt} />
    </main>
  );
}
