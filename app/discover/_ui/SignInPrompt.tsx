"use client";

import { useEffect, useRef } from "react";
import { safeReturn } from "../../../lib/safe-return";
import styles from "./discover.module.css";

export default function SignInPrompt({ open, message, onClose }: { open: boolean; message: string; onClose(): void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab") {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-signin-dialog] a, [data-signin-dialog] button"));
        if (nodes.length === 0) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  // Only rendered after a user action, so window exists; the server render never gets here with open true.
  const here = typeof window === "undefined" ? "/" : safeReturn(window.location.pathname + window.location.search, window.location.origin);
  const href = `/login?return=${encodeURIComponent(here)}`;
  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        data-signin-dialog
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.dialogMessage}>{message}</p>
        <div className={styles.dialogActions}>
          <a href={href} className={styles.signInBtn}>Sign in</a>
          <button type="button" ref={closeRef} className={styles.dialogClose} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
