"use client";
/* eslint-disable @next/next/no-img-element -- plain <img> as on /events (controller ruling) */

import { useCallback, useEffect, useRef, useState } from "react";
import { isPlayableUrl } from "@/lib/coverMedia";
import type { StoryGroup } from "../_lib/feedLogic";
import { clientApi } from "../_lib/clientApi";
import HlsVideo from "./HlsVideo";
import { storyName } from "./StoriesBar";
import styles from "./discover.module.css";

const IMAGE_MS = 5000;

/**
 * Full screen story viewer. Images show for 5 seconds, videos for their length; then the next story,
 * then the next person's stories, then it closes. Escape closes, arrow keys move. Records a view for
 * each story shown, only when signed in. Focus moves in on open and goes back on close.
 */
export default function StoryViewer({ groups, start, signedIn, onShown, onClose }: {
  groups: StoryGroup[];
  start: number;
  signedIn: boolean;
  onShown(storyId: string): void;
  onClose(): void;
}) {
  const [pos, setPos] = useState({ g: start, s: 0 });
  const [muted, setMuted] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const viewed = useRef(new Set<string>());
  const handlers = useRef({ onShown, onClose });
  useEffect(() => {
    handlers.current = { onShown, onClose };
  });

  const group = groups[pos.g];
  const story = group?.stories[pos.s];

  const next = useCallback(() => {
    setPos((p) => {
      const g = groups[p.g];
      if (g && p.s + 1 < g.stories.length) return { g: p.g, s: p.s + 1 };
      if (p.g + 1 < groups.length) return { g: p.g + 1, s: 0 };
      return { g: -1, s: 0 }; // past the end: close
    });
  }, [groups]);

  const prev = useCallback(() => {
    setPos((p) => {
      if (p.s > 0) return { g: p.g, s: p.s - 1 };
      if (p.g > 0) return { g: p.g - 1, s: Math.max(0, groups[p.g - 1].stories.length - 1) };
      return p;
    });
  }, [groups]);

  useEffect(() => {
    if (!story) handlers.current.onClose();
  }, [story]);

  // Each story shown: tell the page (ring turns grey) and record the view once, signed in only.
  useEffect(() => {
    if (!story) return;
    handlers.current.onShown(story.id);
    if (signedIn && !viewed.current.has(story.id)) {
      viewed.current.add(story.id);
      clientApi.storyView(story.id);
    }
  }, [story, signedIn]);

  // Images advance after 5 seconds. Videos advance when they end, or after 5 seconds if they fail to load.
  useEffect(() => {
    if (!story) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (story.mediaType === "image") {
      timer = setTimeout(next, IMAGE_MS);
      return () => { if (timer) clearTimeout(timer); };
    }
    const box = mediaRef.current;
    if (!box) return;
    const onEnded = () => next();
    const onError = () => { if (!timer) timer = setTimeout(next, IMAGE_MS); };
    // Media events don't bubble, so listen in the capture phase on the wrapper.
    box.addEventListener("ended", onEnded, true);
    box.addEventListener("error", onError, true);
    return () => {
      box.removeEventListener("ended", onEnded, true);
      box.removeEventListener("error", onError, true);
      if (timer) clearTimeout(timer);
    };
  }, [story, next]);

  // Focus in, Escape and arrows, Tab stays inside, focus back on close. The page behind doesn't scroll.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); handlers.current.onClose(); }
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Tab" && boxRef.current) {
        const nodes = Array.from(boxRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
        if (nodes.length === 0) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [next, prev]);

  if (!group || !story) return null;
  const name = storyName(group);
  const avatar = isPlayableUrl(group.avatarUrl) ? group.avatarUrl : null;
  const isFirst = pos.g === 0 && pos.s === 0;

  return (
    <div ref={boxRef} className={styles.storyViewer} role="dialog" aria-modal="true" aria-label={`Stories by ${name}`}>
      <div className={styles.storyStage}>
        <div className={styles.storyBars} aria-hidden="true">
          {group.stories.map((s, i) => (
            <span key={s.id} className={styles.storyBar}>
              <span
                key={i === pos.s ? `${s.id}-on` : s.id}
                className={i < pos.s ? `${styles.storyBarFill} ${styles.storyBarDone}`
                  : i === pos.s && story.mediaType === "image" ? `${styles.storyBarFill} ${styles.storyBarRun}`
                  : i === pos.s ? `${styles.storyBarFill} ${styles.storyBarDone}` : styles.storyBarFill}
              />
            </span>
          ))}
        </div>
        <div className={styles.storyHead}>
          {avatar ? (
            <img className={styles.avatar} src={avatar} alt="" />
          ) : (
            <span className={styles.avatar} aria-hidden="true">{name.replace(/^@/, "").charAt(0).toUpperCase()}</span>
          )}
          <span className={styles.storyName}>{name}</span>
          {story.mediaType === "video" ? (
            <button type="button" className={styles.iconBtn} aria-label={muted ? "Turn sound on" : "Turn sound off"} onClick={() => setMuted((m) => !m)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4z" />
                {muted ? <path d="m23 9-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
              </svg>
            </button>
          ) : null}
          <button type="button" ref={closeRef} className={styles.iconBtn} aria-label="Close story" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div ref={mediaRef} className={styles.storyMedia}>
          {story.mediaType === "video" ? (
            <HlsVideo key={story.id} src={story.mediaUrl} poster={story.thumbnailUrl} active muted={muted} loop={false} />
          ) : (
            <img key={story.id} className={styles.storyImg} src={story.mediaUrl} alt="" />
          )}
        </div>
        <button type="button" className={`${styles.storyNav} ${styles.storyNavPrev}`} aria-label="Previous story" onClick={prev} disabled={isFirst}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button type="button" className={`${styles.storyNav} ${styles.storyNavNext}`} aria-label="Next story" onClick={next}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  );
}
