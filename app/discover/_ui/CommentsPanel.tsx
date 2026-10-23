"use client";
/* eslint-disable @next/next/no-img-element -- plain lazy <img> as on /events (controller ruling); feed media comes from many hosts */

import { useEffect, useRef, useState } from "react";
import { isPlayableUrl } from "@/lib/coverMedia";
import { GENERIC_ERROR } from "../../e/_shared/format";
import { mergeLoadedComments, relativeTime, resolvePendingComment } from "../_lib/feedLogic";
import { clientApi } from "../_lib/clientApi";
import { commentErrorCopy, SIGN_IN_COMMENT, type Viewer } from "../_lib/viewer";
import styles from "./discover.module.css";

const MAX = 500;

type Row = { id: string; name: string; photo: string | null; text: string; createdAt: string; pending: boolean };
type Rec = Record<string, unknown>;
const rec = (x: unknown): Rec => (x && typeof x === "object" && !Array.isArray(x) ? (x as Rec) : {});
const s = (x: unknown): string => (typeof x === "string" ? x : "");

/** Name as the backend sends it: display name, then public name, then @username. Never first or last name. */
function toRow(raw: unknown): Row | null {
  const c = rec(raw);
  const id = s(c.id);
  if (!id) return null;
  const a = rec(c.author);
  const u = rec(c.user);
  const username = s(a.username) || s(u.username);
  const name = s(a.displayName) || s(u.name) || (username ? `@${username}` : "Outsyde member");
  const photo = [a.profilePhotoUrl, u.profileImageUrl].map(s).find((p) => isPlayableUrl(p)) ?? null;
  return { id, name, photo, text: s(c.content), createdAt: s(c.createdAt), pending: false };
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  return photo ? (
    <img className={styles.commentAvatar} src={photo} alt="" loading="lazy" />
  ) : (
    <span className={styles.commentAvatar} aria-hidden="true">{name.replace(/^@/, "").charAt(0).toUpperCase()}</span>
  );
}

function Panel({ postId, onClose, viewer, onSignIn, onAdded }: {
  postId: string;
  onClose(): void;
  viewer: Viewer;
  onSignIn(message: string): void;
  onAdded?(): void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const seq = useRef(0);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [now] = useState(() => new Date());
  const [tz] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    let alive = true;
    clientApi.comments(postId).then((res) => {
      if (!alive) return;
      const list = res.ok && Array.isArray(res.body?.comments) ? res.body.comments : null;
      if (!list) return setLoadError(true);
      const loaded: Row[] = list.map(toRow).filter((r: Row | null): r is Row => r !== null);
      // A comment posted before the list arrived stays (pending, or saved but not in this older list).
      setRows((prev) => mergeLoadedComments(prev, loaded));
    });
    return () => {
      alive = false;
    };
  }, [postId]);

  // Focus moves in on open and back on close. Escape closes; Tab stays inside.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const signInOpen = () => !!document.querySelector("[data-signin-dialog]");
    const onKey = (e: KeyboardEvent) => {
      if (signInOpen()) return;
      if (e.key === "Escape") {
        onCloseRef.current();
      } else if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), textarea"));
        if (nodes.length === 0) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, []);

  const signedIn = viewer.status === "in";
  const content = text.trim();

  async function submit() {
    if (!content || content.length > MAX) return;
    const id = `pending-${++seq.current}`;
    const name = viewer.displayName || (viewer.username ? `@${viewer.username}` : "You");
    const row: Row = { id, name, photo: viewer.photo, text: content, createdAt: new Date().toISOString(), pending: true };
    setRows((r) => [...(r ?? []), row]);
    setText("");
    setError("");
    const res = await clientApi.addComment(postId, content);
    if (res.ok) {
      const saved = s(rec(res.body?.comment).id);
      setRows((r) => resolvePendingComment(r, id, saved));
      onAdded?.();
      return;
    }
    setRows((r) => resolvePendingComment(r, id, null));
    setText((t) => t || content);
    setError(commentErrorCopy(res.status));
    if (res.status === 401) onSignIn(SIGN_IN_COMMENT);
  }

  return (
    <div className={styles.sheetBackdrop} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetHead}>
          <h2 className={styles.sheetTitle}>Comments</h2>
          <button type="button" ref={closeRef} className={styles.iconBtn} aria-label="Close comments" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className={styles.sheetBody}>
          {loadError ? <p className={styles.sheetNote}>{GENERIC_ERROR}</p> : null}
          {!loadError && rows === null ? <p className={styles.sheetNote}>Loading comments</p> : null}
          {rows && rows.length === 0 ? <p className={styles.sheetNote}>No comments yet</p> : null}
          {rows && rows.length > 0 ? (
            <ul className={styles.commentList}>
              {rows.map((r) => (
                <li key={r.id} className={r.pending ? `${styles.comment} ${styles.commentPending}` : styles.comment}>
                  <Avatar name={r.name} photo={r.photo} />
                  <div className={styles.commentMain}>
                    <span className={styles.commentName}>{r.name}</span>
                    <span className={styles.commentTime}>{r.pending ? "Posting" : relativeTime(r.createdAt, now, tz)}</span>
                    <p className={styles.commentText}>{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={styles.sheetFoot}>
          {error ? <p className={styles.commentError} role="alert">{error}</p> : null}
          {signedIn ? (
            <form className={styles.commentForm} onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <textarea
                className={styles.commentInput}
                value={text}
                maxLength={MAX}
                rows={2}
                aria-label="Add a comment"
                placeholder="Add a comment"
                onChange={(e) => setText(e.target.value)}
              />
              <div className={styles.commentFormRow}>
                <span className={styles.commentCounter}>{text.length}/{MAX}</span>
                <button type="submit" className={styles.sendBtn} disabled={!content}>Send</button>
              </div>
            </form>
          ) : viewer.status === "out" ? (
            <button type="button" className={styles.sendBtn} onClick={() => onSignIn(SIGN_IN_COMMENT)}>Sign in to comment</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Comments for one post: a 400px side panel from 768px up, a bottom sheet below that. */
export default function CommentsPanel(props: {
  postId: string;
  open: boolean;
  onClose(): void;
  viewer: Viewer;
  onSignIn(message: string): void;
  onAdded?(): void;
}) {
  if (!props.open) return null;
  return <Panel key={props.postId} {...props} />;
}
