"use client";

import { useEffect, useReducer, useRef } from "react";
import { toggleReducer, type ToggleAction } from "../_lib/feedLogic";

type Send = (on: boolean) => Promise<{ ok: boolean; status: number }>;

/**
 * Optimistic like/save/follow toggle. At most one request is in flight. Taps made
 * while it is in flight only move the optimistic state; when it settles, one more
 * request goes out if the latest wanted state differs from what the server just
 * confirmed. A 401 calls onUnauthed, rolls back to the server state and stops.
 */
export function useToggle(initial: { on: boolean; count: number }, send: Send, onUnauthed: () => void) {
  const [state, dispatch] = useReducer(toggleReducer, { on: initial.on, count: initial.count, pending: 0 });
  const wanted = useRef(initial.on); // latest state the user asked for
  const server = useRef(initial.on); // latest state the server confirmed
  const inFlight = useRef(false);
  const unsent = useRef(0); // taps not yet covered by a request
  const sendRef = useRef(send);
  const unauthedRef = useRef(onUnauthed);
  useEffect(() => {
    sendRef.current = send;
    unauthedRef.current = onUnauthed;
  });

  // Each tap added one to `pending`, so each one gets exactly one settle or fail.
  function settle(n: number, type: Exclude<ToggleAction["type"], "tap">, on: boolean) {
    for (let i = 0; i < n; i++) dispatch({ type, on });
  }

  function flush() {
    const target = wanted.current;
    const covered = unsent.current;
    unsent.current = 0;
    inFlight.current = true;
    sendRef.current(target)
      .catch(() => ({ ok: false, status: 0 }))
      .then((res) => {
        inFlight.current = false;
        if (res.status === 401) {
          settle(covered + unsent.current, "failed", server.current);
          unsent.current = 0;
          wanted.current = server.current;
          unauthedRef.current();
          return;
        }
        if (res.ok) server.current = target;
        settle(covered, res.ok ? "settled" : "failed", server.current);
        if (unsent.current === 0) return;
        if (wanted.current !== server.current) {
          flush();
        } else {
          settle(unsent.current, "settled", server.current);
          unsent.current = 0;
        }
      });
  }

  function tap() {
    dispatch({ type: "tap" });
    wanted.current = !wanted.current;
    unsent.current += 1;
    if (!inFlight.current) flush();
  }

  return { on: state.on, count: state.count, tap };
}
