"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FONTS_HREF } from "../../e/_shared/format";
import { isCurrent, nextPulsePage, toPulseVideo, type PulseVideo } from "../_lib/feedLogic";
import { clientApi } from "../_lib/clientApi";
import { useViewer } from "../_lib/viewer";
import DiscoverTabs from "../_ui/DiscoverTabs";
import { FollowStateProvider } from "../_ui/followState";
import PulseItem from "../_ui/PulseItem";
import SignInPrompt from "../_ui/SignInPrompt";
import styles from "../_ui/discover.module.css";

const PAGE_SIZE = 20; // same as the app
const ACTIVE_RATIO = 0.8;
const PLAYER_WINDOW = 2; // players stay mounted this many items either side of the active one

type Phase = "first" | "firstError" | "ready";
type Paging = { cursor: string | undefined; done: boolean; moreError: boolean; loadingMore: boolean };
/**
 * The one playing item (null between items while scrolling), whether the viewer tap-paused it, and the last
 * item that was active (players are mounted around it). A new active item always starts unpaused.
 */
type Play = { id: string | null; paused: boolean; anchor: string | null };

export default function PulseClient() {
  const viewer = useViewer();
  const [phase, setPhase] = useState<Phase>("first");
  const [videos, setVideos] = useState<PulseVideo[]>([]);
  const [paging, setPaging] = useState<Paging>({ cursor: undefined, done: false, moreError: false, loadingMore: false });
  const [play, setPlay] = useState<Play>({ id: null, paused: false, anchor: null });
  const [muted, setMuted] = useState(true);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [prompt, setPrompt] = useState({ open: false, message: "" });
  const seq = useRef(0);
  const busy = useRef(false);
  const seen = useRef<Set<string>>(new Set());
  const followChecks = useRef(new Map<string, boolean | null>()); // author id -> isFollowing (null while asking)
  const pagingRef = useRef(paging);
  useEffect(() => { pagingRef.current = paging; }, [paging]);
  const mainRef = useRef<HTMLElement>(null);
  const feedRef = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const onSignIn = useCallback((message: string) => setPrompt({ open: true, message }), []);
  const closePrompt = useCallback(() => setPrompt((p) => ({ ...p, open: false })), []);
  const toggleSound = useCallback(() => setMuted((m) => !m), []);
  const togglePause = useCallback((id: string) => {
    setPlay((p) => (p.id === id ? { ...p, paused: !p.paused } : p));
  }, []);

  const viewerId = viewer.userId;

  /** One followCheck per author for a signed-in viewer, cached for the page. */
  const checkFollows = useCallback((page: PulseVideo[]) => {
    if (!viewerId) return;
    for (const v of page) {
      const id = v.author.userId;
      if (id === viewerId || followChecks.current.has(id)) continue;
      followChecks.current.set(id, null);
      clientApi.followCheck(id).then((res) => {
        const on = res.ok && res.body?.isFollowing === true;
        followChecks.current.set(id, on);
        setFollowed((f) => ({ ...f, [id]: on }));
      });
    }
  }, [viewerId]);

  /** Loads one page. The first page (cursor undefined) replaces the list; later pages append only unseen ids. */
  const load = useCallback(async (cursor: string | undefined) => {
    const id = ++seq.current;
    const first = cursor === undefined;
    busy.current = true;
    const res = await clientApi.pulse({ limit: PAGE_SIZE, cursor });
    if (!isCurrent(id, seq.current)) return; // a newer load owns the state
    busy.current = false;
    const data = res.body?.data;
    if (!res.ok || !Array.isArray(data?.videos)) {
      if (first) setPhase("firstError");
      else setPaging((p) => ({ ...p, loadingMore: false, moreError: true }));
      return;
    }
    // Rows still processing (a Mux upload id, not a URL) are dropped here and never rendered.
    const page = (data.videos as unknown[]).map(toPulseVideo).filter((v): v is PulseVideo => v !== null);
    const next = nextPulsePage({ ids: first ? new Set() : seen.current, done: false }, page, data.hasMore === true);
    seen.current = next.ids;
    const nextCursor = typeof data.nextCursor === "string" && data.nextCursor ? data.nextCursor : undefined;
    setVideos((prev) => (first ? next.fresh : [...prev, ...next.fresh]));
    setPaging({ cursor: nextCursor, done: next.done || !nextCursor, moreError: false, loadingMore: false });
    setPhase("ready");
    checkFollows(next.fresh);
  }, [checkFollows]);

  useEffect(() => {
    if (viewer.status === "loading") return;
    const run = seq;
    const flag = busy;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) load(undefined); });
    return () => { cancelled = true; run.current++; flag.current = false; };
  }, [viewer.status, viewer.userId, load]);

  const retryFirst = useCallback(() => { setPhase("first"); load(undefined); }, [load]);

  const loadMore = useCallback(() => {
    const p = pagingRef.current;
    if (busy.current || p.done || p.cursor === undefined) return;
    setPaging((q) => ({ ...q, loadingMore: true, moreError: false }));
    load(p.cursor);
  }, [load]);

  // Items fill the viewport below the site header and the tab row: measure where the feed starts.
  useEffect(() => {
    const feed = feedRef.current;
    const main = mainRef.current;
    if (!feed || !main) return;
    const measure = () => {
      const top = feed.getBoundingClientRect().top + window.scrollY;
      feed.style.setProperty("--pulse-top", `${Math.max(0, Math.round(top))}px`);
    };
    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (ro && main.firstElementChild) ro.observe(main.firstElementChild);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // The single active item: the one at least 80% visible. Leaving it pauses it (and drops its tap pause).
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || videos.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.postId;
        if (!id) continue;
        if (e.isIntersecting && e.intersectionRatio >= ACTIVE_RATIO) {
          setPlay((p) => (p.id === id ? p : { id, paused: false, anchor: id }));
        } else {
          setPlay((p) => (p.id === id ? { ...p, id: null, paused: false } : p));
        }
      }
    }, { root: feed, threshold: [0, ACTIVE_RATIO] });
    feed.querySelectorAll<HTMLElement>("article[data-post-id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [videos]);

  // Next page when the end item comes near. Nothing is watched once the feed is done.
  const watching = phase === "ready" && !paging.done && !paging.moreError && !paging.loadingMore;
  useEffect(() => {
    const feed = feedRef.current;
    const el = sentinel.current;
    if (!watching || !feed || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    }, { root: feed, rootMargin: "0px 0px 200% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [watching, videos.length, loadMore]);

  const anchorIndex = Math.max(0, videos.findIndex((v) => v.id === play.anchor));

  let body;
  if (phase === "firstError") {
    body = (
      <div className={styles.pulseState}>
        <p role="alert" className={styles.pulseStateText}>Couldn&apos;t load videos. Try again.</p>
        <button type="button" className={styles.retryBtn} onClick={retryFirst}>Retry</button>
      </div>
    );
  } else if (phase === "first" || viewer.status === "loading") {
    body = (
      <div className={styles.pulseState}>
        <p role="status" className={styles.srOnly}>Loading videos</p>
        <div className={styles.pulseLoading} aria-hidden="true" />
      </div>
    );
  } else if (videos.length === 0 && paging.done) {
    body = (
      <div className={styles.pulseState}>
        <p className={styles.pulseStateTitle}>No videos yet</p>
      </div>
    );
  } else {
    body = (
      <FollowStateProvider>
        {videos.map((v, i) => (
          <PulseItem
            key={v.id}
            video={v}
            active={play.id === v.id}
            near={Math.abs(i - anchorIndex) <= PLAYER_WINDOW}
            paused={play.id === v.id && play.paused}
            muted={muted}
            viewer={viewer}
            followed={viewerId ? followed[v.author.userId] : false}
            onTogglePause={togglePause}
            onToggleSound={toggleSound}
            onSignIn={onSignIn}
          />
        ))}
        {paging.done ? (
          <div className={styles.pulseState}>
            <p className={styles.pulseStateTitle}>You&apos;re all caught up</p>
            <p className={styles.pulseStateText}>Check back soon for new videos.</p>
          </div>
        ) : paging.moreError ? (
          <div className={styles.pulseState}>
            <p role="alert" className={styles.pulseStateText}>Couldn&apos;t load more. Try again.</p>
            <button type="button" className={styles.retryBtn} onClick={loadMore}>Retry</button>
          </div>
        ) : (
          <div ref={sentinel} className={styles.pulseState} data-testid="pulse-sentinel">
            <p role="status" className={styles.srOnly}>Loading more videos</p>
            <div className={styles.pulseLoading} aria-hidden="true" />
          </div>
        )}
      </FollowStateProvider>
    );
  }

  return (
    <main ref={mainRef} className={styles.pulsePage}>
      <DiscoverTabs current="pulse" />
      <link href={FONTS_HREF} rel="stylesheet" />
      <h1 className={styles.srOnly}>Pulse</h1>
      <section ref={feedRef} aria-label="Pulse videos" className={styles.pulseFeed}>
        {body}
      </section>
      <SignInPrompt open={prompt.open} message={prompt.message} onClose={closePrompt} />
    </main>
  );
}
