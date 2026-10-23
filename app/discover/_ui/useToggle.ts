"use client";

import { useEffect, useReducer, useRef } from "react";
import { toggleReducer, toggleSettle, toggleTap, type ToggleSync } from "../_lib/feedLogic";

type Send = (on: boolean) => Promise<{ ok: boolean; status: number }>;

/**
 * Optimistic like/save/follow toggle. At most one request is in flight. Taps made
 * while it is in flight only move the optimistic state; when it settles, one more
 * request goes out if the latest wanted state differs from what the server just
 * confirmed. A 401 calls onUnauthed, rolls back to the server state and stops.
 * The send decisions live in toggleTap/toggleSettle (feedLogic.ts, unit tested).
 */
export function useToggle(initial: { on: boolean; count: number }, send: Send, onUnauthed: () => void) {
  const [state, dispatch] = useReducer(toggleReducer, { on: initial.on, count: initial.count, pending: 0 });
  const sync = useRef<ToggleSync>({ server: initial.on, wanted: initial.on, inFlight: false, covered: 0, unsent: 0 });
  const sendRef = useRef(send);
  const unauthedRef = useRef(onUnauthed);
  useEffect(() => {
    sendRef.current = send;
    unauthedRef.current = onUnauthed;
  });

  function go(target: boolean) {
    sendRef.current(target)
      .catch(() => ({ ok: false, status: 0 }))
      .then((res) => {
        const r = toggleSettle(sync.current, res, target);
        sync.current = r.sync;
        r.actions.forEach(dispatch);
        if (r.unauthed) unauthedRef.current();
        if (r.send !== null) go(r.send);
      });
  }

  function tap() {
    dispatch({ type: "tap" });
    const r = toggleTap(sync.current);
    sync.current = r.sync;
    if (r.send !== null) go(r.send);
  }

  return { on: state.on, count: state.count, tap };
}
