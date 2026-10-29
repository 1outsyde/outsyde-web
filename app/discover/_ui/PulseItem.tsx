"use client";
/* eslint-disable @next/next/no-img-element -- plain lazy <img> as on /events (controller ruling); feed media comes from many hosts */

import { useCallback, useEffect, useRef, useState } from "react";
import { isPlayableUrl } from "@/lib/coverMedia";
import { profileHref, type PulseVideo } from "../_lib/feedLogic";
import { clientApi } from "../_lib/clientApi";
import { SIGN_IN_COMMENT, SIGN_IN_LIKE, SIGN_IN_SAVE, type Viewer } from "../_lib/viewer";
import CommentsPanel from "./CommentsPanel";
import FollowButton from "./FollowButton";
import HlsVideo from "./HlsVideo";
import FitBackdrop from "./FitBackdrop";
import { useToggle } from "./useToggle";
import styles from "./discover.module.css";

const HEART = "M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z";
const TAP_MS = 250; // a second tap inside this window is a double tap (like), so the single tap waits for it
const MIN_WATCH_MS = 1000;
const DEFAULT_DURATION_MS = 30000;

const count = (n: number) => n.toLocaleString("en-US");

/**
 * One full-height Pulse video with the app's overlay (PulseFeedScreenV2): author, Follow, caption and
 * the Buy/Book pill bottom left; like, comment, save and sound on the right rail. The page decides which
 * item is active (plays), whether it is tap-paused, and whether its player is mounted at all (`near`).
 * `followed` is the author's follow state from the page's followCheck cache (undefined while unknown).
 */
export default function PulseItem({ video, active, near, paused, muted, viewer, followed, onTogglePause, onToggleSound, onSignIn }: {
  video: PulseVideo;
  active: boolean;
  near: boolean;
  paused: boolean;
  muted: boolean;
  viewer: Viewer;
  followed: boolean | undefined;
  onTogglePause(id: string): void;
  onToggleSound(): void;
  onSignIn(message: string): void;
}) {
  const { author } = video;
  const viewerId = viewer.userId;
  const href = profileHref(author);
  const [failed, setFailed] = useState(false);
  const [heart, setHeart] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(video.commentsCount);
  const like = useToggle({ on: video.isLiked, count: video.likesCount }, (on) => clientApi.like(video.id, on), () => onSignIn(SIGN_IN_LIKE));
  const save = useToggle({ on: video.isSaved, count: 0 }, (on) => clientApi.save(video.id, on), () => onSignIn(SIGN_IN_SAVE));
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A waiting single tap never outlives the item being active (or the item itself).
  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = null;
  }, [active]);
  useEffect(() => () => {
    if (heartTimer.current) clearTimeout(heartTimer.current);
  }, []);

  const closeComments = useCallback(() => setCommentsOpen(false), []);
  const addedComment = useCallback(() => setCommentsCount((n) => n + 1), []);
  const onError = useCallback(() => setFailed(true), []);

  /** Watch time for Pulse ranking: signed in, at least 1 second, sent once per activation, silently, no retry. */
  const onTime = (watchedMs: number, durationMs: number, loops: number) => {
    if (!viewerId || watchedMs < MIN_WATCH_MS) return;
    void clientApi.engagement({
      postId: video.id,
      watchTimeMs: watchedMs,
      videoDurationMs: durationMs || DEFAULT_DURATION_MS,
      isRewatch: loops > 0,
    });
  };

  const doubleTap = () => {
    if (!viewerId) {
      onSignIn(SIGN_IN_LIKE);
      return;
    }
    if (!like.on) like.tap(); // double tap only likes, never unlikes
    setHeart((h) => h + 1);
    if (heartTimer.current) clearTimeout(heartTimer.current);
    heartTimer.current = setTimeout(() => setHeart(0), 700);
  };
  const onSurface = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      doubleTap();
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      onTogglePause(video.id);
    }, TAP_MS);
  };

  const onLike = () => (viewerId ? like.tap() : onSignIn(SIGN_IN_LIKE));
  const onSave = () => (viewerId ? save.tap() : onSignIn(SIGN_IN_SAVE));
  const onComment = () => (viewerId ? setCommentsOpen(true) : onSignIn(SIGN_IN_COMMENT));
  const avatar = isPlayableUrl(author.profilePhotoUrl) ? author.profilePhotoUrl : null;
  const showPaused = active && paused && !failed;
  // Signed in: the button waits for the follow check so it never flips from Follow to Following.
  const showFollow = viewerId ? followed !== undefined : viewer.status === "out";

  return (
    <article className={styles.pulseItem} data-post-id={video.id} data-active={active ? "true" : undefined} aria-label={`Video by ${author.displayName}`}>
      <div className={styles.pulseStage} data-fit={video.fit}>
        {video.fit === "fit" ? <FitBackdrop src={video.blurUrl} /> : null}
        {failed || !near ? (
          video.poster ? (
            <img className={styles.pulsePoster} data-fit={video.fit} src={video.poster} alt="" loading="lazy" />
          ) : (
            <div className={styles.mediaPlaceholder} />
          )
        ) : (
          <HlsVideo src={video.videoUrl} poster={video.poster} active={active} paused={paused} muted={muted} loop fit={video.fit} onTime={onTime} onError={onError} />
        )}
        {failed ? <span className={styles.pulseUnavailable}>Video unavailable</span> : null}

        <button type="button" className={styles.pulseSurface} aria-label={showPaused ? "Play video" : "Pause video"} onClick={onSurface} />
        <div className={styles.pulseShade} aria-hidden="true" />

        {showPaused ? (
          <span className={styles.pulsePausedIcon} data-testid="pulse-paused" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
          </span>
        ) : null}
        {heart > 0 ? (
          <svg key={heart} className={styles.heartPop} width="96" height="96" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true"><path d={HEART} /></svg>
        ) : null}

        <div className={styles.pulseInfo}>
          <div className={styles.pulseWho}>
            {avatar ? (
              <img className={styles.pulseAvatar} src={avatar} alt="" loading="lazy" />
            ) : (
              <span className={styles.pulseAvatar} aria-hidden="true">{author.displayName.replace(/^@/, "").charAt(0).toUpperCase()}</span>
            )}
            <div className={styles.pulseNames}>
              {href ? <a className={styles.pulseName} href={href}>{author.displayName}</a> : <span className={styles.pulseName}>{author.displayName}</span>}
              {author.username ? <span className={styles.pulseHandle}>@{author.username}</span> : null}
            </div>
            {showFollow ? <FollowButton userId={author.userId} initial={followed === true} viewerId={viewerId} onSignIn={onSignIn} /> : null}
          </div>
          {video.caption ? <p className={styles.pulseCaption}>{video.caption}</p> : null}
          {video.commerce && href ? (
            <a className={styles.pulsePill} href={href}>{video.commerce === "buy" ? "Buy Now" : "Book Now"}</a>
          ) : null}
        </div>

        <div className={styles.pulseRail}>
          <div className={styles.pulseAction}>
            <button type="button" className={styles.pulseBtn} aria-label="Like" aria-pressed={like.on} onClick={onLike}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill={like.on ? "#FF3B30" : "none"} stroke={like.on ? "#FF3B30" : "currentColor"} strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d={HEART} /></svg>
            </button>
            <span className={styles.pulseCount} data-testid="pulse-like-count">{count(like.count)}</span>
          </div>
          <div className={styles.pulseAction}>
            <button type="button" className={styles.pulseBtn} aria-label="Comment" onClick={onComment}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" /></svg>
            </button>
            <span className={styles.pulseCount}>{count(commentsCount)}</span>
          </div>
          <div className={styles.pulseAction}>
            <button type="button" className={styles.pulseBtn} aria-label="Save" aria-pressed={save.on} onClick={onSave}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill={save.on ? "#E8B930" : "none"} stroke={save.on ? "#E8B930" : "currentColor"} strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>
            </button>
          </div>
          <div className={styles.pulseAction}>
            <button type="button" className={styles.pulseBtn} aria-label={muted ? "Turn sound on" : "Turn sound off"} onClick={onToggleSound}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4z" />
                {muted ? <path d="m23 9-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <CommentsPanel postId={video.id} open={commentsOpen} onClose={closeComments} viewer={viewer} onSignIn={onSignIn} onAdded={addedComment} />
    </article>
  );
}
