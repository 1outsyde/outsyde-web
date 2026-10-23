"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FONTS_HREF } from "../../e/_shared/format";
import { toFeedPost, type FeedPost } from "../_lib/feedLogic";
import { clientApi } from "../_lib/clientApi";
import { SIGN_IN_FOLLOWING, useViewer } from "../_lib/viewer";
import DiscoverTabs from "../_ui/DiscoverTabs";
import { FollowStateProvider } from "../_ui/followState";
import PostCard from "../_ui/PostCard";
import SignInPrompt from "../_ui/SignInPrompt";
import styles from "../_ui/discover.module.css";

const PAGE_SIZE = 30;

type Phase = "first" | "firstError" | "ready";
type Paging = { offset: number | undefined; hasMore: boolean; moreError: boolean; loadingMore: boolean };

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

export default function FollowingClient() {
  const viewer = useViewer();
  const [phase, setPhase] = useState<Phase>("first");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [paging, setPaging] = useState<Paging>({ offset: undefined, hasMore: false, moreError: false, loadingMore: false });
  const [prompt, setPrompt] = useState({ open: false, message: "" });
  const seq = useRef(0);
  const busy = useRef(false);
  const pagingRef = useRef(paging);
  useEffect(() => { pagingRef.current = paging; }, [paging]);
  const sentinel = useRef<HTMLDivElement>(null);

  const onSignIn = useCallback((message: string) => setPrompt({ open: true, message }), []);
  const closePrompt = useCallback(() => setPrompt((p) => ({ ...p, open: false })), []);

  /** Loads one page. The first page (offset undefined) replaces the list; later pages append, deduped by id. */
  const load = useCallback(async (offset: number | undefined) => {
    const id = ++seq.current;
    const first = offset === undefined;
    busy.current = true;
    const res = await clientApi.feed({ limit: PAGE_SIZE, scope: "following", offset });
    if (id !== seq.current) return; // a newer load owns the state
    busy.current = false;
    const data = res.body?.data;
    const raw = data?.posts ?? res.body?.posts;
    if (!res.ok || !Array.isArray(raw)) {
      if (res.status === 401) onSignIn(SIGN_IN_FOLLOWING);
      if (first) setPhase("firstError");
      else setPaging((p) => ({ ...p, loadingMore: false, moreError: true }));
      return;
    }
    const mapped = (raw as unknown[]).map(toFeedPost).filter((p): p is FeedPost => p !== null);
    const next = typeof data?.nextOffset === "number" ? data.nextOffset : undefined;
    // Keep going only while the server says so AND the offset moves forward (no loop on a stuck cursor).
    const moves = next !== undefined && next > (offset ?? 0);
    setPosts((prev) => {
      const base = first ? [] : prev;
      const seen = new Set(base.map((p) => p.id));
      return [...base, ...mapped.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))];
    });
    setPaging({ offset: next, hasMore: data?.hasMore === true && moves, moreError: false, loadingMore: false });
    setPhase("ready");
  }, [onSignIn]);

  useEffect(() => {
    if (viewer.status !== "in") return;
    load(undefined);
    return () => { seq.current++; busy.current = false; };
  }, [viewer.status, load]);

  const retryFirst = useCallback(() => { setPhase("first"); load(undefined); }, [load]);

  const loadMore = useCallback(() => {
    const p = pagingRef.current;
    if (busy.current || !p.hasMore || p.offset === undefined) return;
    setPaging((q) => ({ ...q, loadingMore: true, moreError: false }));
    load(p.offset);
  }, [load]);

  const watching = phase === "ready" && paging.hasMore && !paging.moreError && !paging.loadingMore;
  useEffect(() => {
    const el = sentinel.current;
    if (!watching || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [watching, posts.length, loadMore]);

  const viewerId = viewer.userId;

  let body;
  if (viewer.status === "loading") {
    body = (
      <>
        <p role="status" className={styles.srOnly}>Loading posts</p>
        <Skeleton />
      </>
    );
  } else if (viewer.status === "out") {
    body = (
      <div className={styles.feedState}>
        <p className={styles.feedStateText}>{SIGN_IN_FOLLOWING}</p>
        <a href="/login?return=/discover/following" className={styles.signInBtn}>Sign in</a>
      </div>
    );
  } else if (phase === "firstError") {
    body = (
      <div className={styles.feedState}>
        <p role="alert" className={styles.feedStateText}>Couldn&apos;t load posts. Try again.</p>
        <button type="button" className={styles.retryBtn} onClick={retryFirst}>Retry</button>
      </div>
    );
  } else if (phase === "first") {
    body = (
      <>
        <p role="status" className={styles.srOnly}>Loading posts</p>
        <Skeleton />
      </>
    );
  } else if (posts.length === 0) {
    body = (
      <div className={styles.feedState}>
        <p className={styles.feedStateText}>Follow people to see their posts here.</p>
        <a href="/discover" className={styles.signInBtn}>Find people on Pro</a>
      </div>
    );
  } else {
    body = (
      <FollowStateProvider>
        <section aria-label="Posts" className={styles.feed}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={viewerId} viewer={viewer} onSignIn={onSignIn} />
          ))}
        </section>
        {paging.loadingMore ? <p role="status" className={styles.srOnly}>Loading more posts</p> : null}
        {paging.moreError ? (
          <div className={styles.feedState}>
            <p role="alert" className={styles.feedStateText}>Couldn&apos;t load more. Try again.</p>
            <button type="button" className={styles.retryBtn} onClick={loadMore}>Retry</button>
          </div>
        ) : null}
        {paging.hasMore ? <div ref={sentinel} aria-hidden="true" style={{ height: 1 }} data-testid="feed-sentinel" /> : null}
      </FollowStateProvider>
    );
  }

  return (
    <main className={styles.proPage}>
      <DiscoverTabs current="following" />
      <link href={FONTS_HREF} rel="stylesheet" />
      <div className={styles.proWrap}>
        <h1 className={styles.srOnly}>Following</h1>
        {body}
      </div>
      <SignInPrompt open={prompt.open} message={prompt.message} onClose={closePrompt} />
    </main>
  );
}
