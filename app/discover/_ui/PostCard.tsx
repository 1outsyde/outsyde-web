"use client";
/* eslint-disable @next/next/no-img-element -- plain lazy <img> as on /events (controller ruling); feed media comes from many hosts */

import { useCallback, useEffect, useRef, useState } from "react";
import { isPlayableUrl } from "@/lib/coverMedia";
import { likesLabel, profileHref, relativeTime, roleBadge, type FeedPost } from "../_lib/feedLogic";
import { clientApi } from "../_lib/clientApi";
import { SIGN_IN_COMMENT, SIGN_IN_LIKE, SIGN_IN_SAVE, type Viewer } from "../_lib/viewer";
import CommentsPanel from "./CommentsPanel";
import FollowButton from "./FollowButton";
import PostMedia from "./PostMedia";
import { useToggle } from "./useToggle";
import styles from "./discover.module.css";

const HEART = "M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z";

function Caption({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const ro = new ResizeObserver(() => setClamped(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);
  if (!text) return null;
  return (
    <div className={styles.caption}>
      <p ref={ref} className={open ? styles.captionText : `${styles.captionText} ${styles.captionClamp}`}>{text}</p>
      {!open && clamped ? (
        <button type="button" className={styles.textBtn} onClick={() => setOpen(true)}>more</button>
      ) : null}
    </div>
  );
}

/**
 * One post in a feed. Signed-out actions call onSignIn with the app's copy; the page
 * owns the sign-in prompt. `viewer` names the optimistic comment (pages pass useViewer()).
 */
export default function PostCard({ post, viewerId, onSignIn, viewer }: {
  post: FeedPost;
  viewerId: string | null;
  onSignIn(message: string): void;
  viewer?: Viewer;
}) {
  const { author } = post;
  const href = profileHref(author);
  const badge = roleBadge(author.role);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [now] = useState(() => new Date());
  const [tz] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const like = useToggle({ on: post.isLiked, count: post.likesCount }, (on) => clientApi.like(post.id, on), () => onSignIn(SIGN_IN_LIKE));
  const save = useToggle({ on: post.isSaved, count: 0 }, (on) => clientApi.save(post.id, on), () => onSignIn(SIGN_IN_SAVE));
  const closeComments = useCallback(() => setCommentsOpen(false), []);
  const addedComment = useCallback(() => setCommentsCount((n) => n + 1), []);
  const me: Viewer = viewer ?? { status: viewerId ? "in" : "out", userId: viewerId, username: null, displayName: null, photo: null };

  const onLike = () => (viewerId ? like.tap() : onSignIn(SIGN_IN_LIKE));
  const onSave = () => (viewerId ? save.tap() : onSignIn(SIGN_IN_SAVE));
  const onDoubleTap = () => {
    if (!viewerId) {
      onSignIn(SIGN_IN_LIKE);
      return false;
    }
    if (!like.on) like.tap(); // double tap only likes, never unlikes
    return true;
  };
  const avatar = isPlayableUrl(author.profilePhotoUrl) ? author.profilePhotoUrl : null;

  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        {avatar ? (
          <img className={styles.avatar} src={avatar} alt="" loading="lazy" />
        ) : (
          <span className={styles.avatar} aria-hidden="true">{author.displayName.replace(/^@/, "").charAt(0).toUpperCase()}</span>
        )}
        <div className={styles.cardWho}>
          <div className={styles.cardNameRow}>
            {href ? <a className={styles.cardName} href={href}>{author.displayName}</a> : <span className={styles.cardName}>{author.displayName}</span>}
            {badge ? <span className={styles.roleBadge}>{badge}</span> : null}
          </div>
          <span className={styles.cardTime}>{relativeTime(post.createdAt, now, tz)}</span>
        </div>
        {!post.authorIsFollowed ? (
          <FollowButton userId={author.userId} initial={false} viewerId={viewerId} onSignIn={onSignIn} />
        ) : null}
      </header>

      <PostMedia media={post.media} onDoubleTap={onDoubleTap} />

      {post.commerce && href ? (
        <a className={styles.commercePill} href={href}>{post.commerce === "buy" ? "Buy Now" : "Book Now"}</a>
      ) : null}

      <div className={styles.cardBody}>
        <div className={styles.actions}>
          <button type="button" className={styles.iconBtn} aria-label="Like" aria-pressed={like.on} onClick={onLike}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={like.on ? "#FF3B30" : "none"} stroke={like.on ? "#FF3B30" : "currentColor"} strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d={HEART} /></svg>
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Comment"
            onClick={() => (viewerId ? setCommentsOpen(true) : onSignIn(SIGN_IN_COMMENT))}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" /></svg>
          </button>
          <button type="button" className={`${styles.iconBtn} ${styles.saveBtn}`} aria-label="Save" aria-pressed={save.on} onClick={onSave}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={save.on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>
          </button>
        </div>
        <p className={styles.likes}>{likesLabel(like.count)}</p>
        <Caption text={post.caption} />
        {commentsCount > 0 ? (
          <button type="button" className={styles.textBtn} onClick={() => setCommentsOpen(true)}>
            {commentsCount === 1 ? "View 1 comment" : `View all ${commentsCount.toLocaleString("en-US")} comments`}
          </button>
        ) : null}
      </div>

      <CommentsPanel postId={post.id} open={commentsOpen} onClose={closeComments} viewer={me} onSignIn={onSignIn} onAdded={addedComment} />
    </article>
  );
}
