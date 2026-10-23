"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { toggleSettle, toggleTap, type ToggleSync } from "../_lib/feedLogic";
import { clientApi } from "../_lib/clientApi";

type Ctx = {
  following: Record<string, boolean>;
  tap(userId: string, current: boolean, onUnauthed: () => void): void;
};

const FollowCtx = createContext<Ctx | null>(null);

/**
 * One follow state per author for a whole page, so every card by the same author agrees.
 * Each author gets the same serialized toggle as useToggle (toggleTap / toggleSettle in feedLogic):
 * at most one request in flight, the last tap wins, a 401 rolls back and calls onUnauthed.
 */
export function FollowStateProvider({ children }: { children: ReactNode }) {
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const syncs = useRef(new Map<string, ToggleSync>());
  const unauthed = useRef(new Map<string, () => void>());

  const tap = useCallback((userId: string, current: boolean, onUnauthed: () => void) => {
    unauthed.current.set(userId, onUnauthed);
    function go(target: boolean) {
      clientApi.follow(userId, target)
        .catch(() => ({ ok: false, status: 0 }))
        .then((res) => {
          const s = syncs.current.get(userId);
          if (!s) return;
          const r = toggleSettle(s, res, target);
          syncs.current.set(userId, r.sync);
          if (!r.sync.inFlight) setFollowing((f) => ({ ...f, [userId]: r.sync.server }));
          if (r.unauthed) unauthed.current.get(userId)?.();
          if (r.send !== null) go(r.send);
        });
    }
    const prev = syncs.current.get(userId) ?? { server: current, wanted: current, inFlight: false, covered: 0, unsent: 0 };
    const r = toggleTap(prev);
    syncs.current.set(userId, r.sync);
    setFollowing((f) => ({ ...f, [userId]: r.sync.wanted }));
    if (r.send !== null) go(r.send);
  }, []);

  return <FollowCtx.Provider value={{ following, tap }}>{children}</FollowCtx.Provider>;
}

/**
 * The shared follow state for one author, seeded from `initial` (the post's authorIsFollowed) until
 * someone taps. Returns null outside a FollowStateProvider, so callers can fall back to local state.
 */
export function useFollowState(userId: string, initial: boolean): { on: boolean; tap(onUnauthed: () => void): void } | null {
  const ctx = useContext(FollowCtx);
  if (!ctx) return null;
  const on = ctx.following[userId] ?? initial;
  return { on, tap: (onUnauthed) => ctx.tap(userId, on, onUnauthed) };
}
