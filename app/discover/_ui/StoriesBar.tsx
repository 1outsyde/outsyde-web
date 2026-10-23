"use client";
/* eslint-disable @next/next/no-img-element -- plain lazy <img> as on /events (controller ruling) */

import { isPlayableUrl } from "@/lib/coverMedia";
import type { StoryGroup } from "../_lib/feedLogic";
import styles from "./discover.module.css";

export const storyName = (g: StoryGroup) => g.authorName || "Outsyde member";

/**
 * Story rings above the Pro posts: gold while a group has a story the viewer hasn't opened here, grey after.
 * Signed in, the first slot is a grey dashed "You" ring that does nothing (adding stories is app only).
 * Hidden when there are no groups.
 */
export default function StoriesBar({ groups, seen, signedIn, onOpen }: {
  groups: StoryGroup[];
  seen: ReadonlySet<string>;
  signedIn: boolean;
  onOpen(index: number): void;
}) {
  if (groups.length === 0) return null;
  return (
    <section aria-label="Stories" className={styles.stories}>
      <ul className={styles.storyList}>
        {signedIn ? (
          <li className={styles.storyItem}>
            <div className={styles.storySlot}>
              <span className={`${styles.storyRing} ${styles.storyRingYou}`} aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </span>
              <span className={styles.storyLabel}>You</span>
            </div>
          </li>
        ) : null}
        {groups.map((g, i) => {
          const unseen = g.stories.some((s) => !seen.has(s.id));
          const name = storyName(g);
          const avatar = isPlayableUrl(g.avatarUrl) ? g.avatarUrl : null;
          return (
            <li key={g.userId} className={styles.storyItem}>
              <button type="button" className={styles.storySlot} onClick={() => onOpen(i)}>
                <span className={unseen ? `${styles.storyRing} ${styles.storyRingNew}` : styles.storyRing}>
                  {avatar ? (
                    <img className={styles.storyAvatar} src={avatar} alt="" loading="lazy" />
                  ) : (
                    <span className={styles.storyAvatar} aria-hidden="true">{name.replace(/^@/, "").charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span className={styles.storyLabel}>{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
