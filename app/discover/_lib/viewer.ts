"use client";

import { useEffect, useState } from "react";
import { GENERIC_ERROR } from "../../e/_shared/format";

export const SIGN_IN_LIKE = "Please sign in to like posts.";
export const SIGN_IN_COMMENT = "Please sign in to comment on posts.";
export const SIGN_IN_SAVE = "Please sign in to save posts.";
export const SIGN_IN_FOLLOW = "Please sign in to follow people.";
export const SIGN_IN_FOLLOWING = "Sign in to see posts from people you follow.";

export function commentErrorCopy(status: number): string {
  if (status === 401) return SIGN_IN_COMMENT;
  if (status === 400) return "Comments can be up to 500 characters.";
  return GENERIC_ERROR;
}

export type Viewer = {
  status: "loading" | "in" | "out";
  userId: string | null;
  username: string | null;
  displayName: string | null;
  photo: string | null;
};

const LOADING: Viewer = { status: "loading", userId: null, username: null, displayName: null, photo: null };
const OUT: Viewer = { status: "out", userId: null, username: null, displayName: null, photo: null };

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/** Reads only the five public fields; firstName, lastName and email are never copied. */
export function useViewer(): Viewer {
  const [viewer, setViewer] = useState<Viewer>(LOADING);
  useEffect(() => {
    let alive = true;
    (async () => {
      let next = OUT;
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const b = await res.json().catch(() => null);
          if (b && b.authenticated === true) {
            next = {
              status: "in",
              userId: str(b.userId),
              username: str(b.username),
              displayName: str(b.displayName),
              photo: str(b.profilePhotoUrl),
            };
          }
        }
      } catch {
        /* network error: treat as signed out */
      }
      if (alive) setViewer(next);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return viewer;
}
