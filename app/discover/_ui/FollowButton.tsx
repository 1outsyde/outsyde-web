"use client";

import { clientApi } from "../_lib/clientApi";
import { SIGN_IN_FOLLOW } from "../_lib/viewer";
import { useFollowState } from "./followState";
import { useToggle } from "./useToggle";
import styles from "./discover.module.css";

/**
 * Green "Follow", then a green outline "Following". Hidden on the viewer's own posts.
 * Inside a FollowStateProvider every button for the same author shares one state;
 * outside one it keeps its own.
 */
export default function FollowButton({ userId, initial, viewerId, onSignIn }: {
  userId: string;
  initial: boolean;
  viewerId: string | null;
  onSignIn(message: string): void;
}) {
  const local = useToggle(
    { on: initial, count: 0 },
    (on) => clientApi.follow(userId, on),
    () => onSignIn(SIGN_IN_FOLLOW),
  );
  const shared = useFollowState(userId, initial);
  if (userId === viewerId) return null;
  const on = shared ? shared.on : local.on;
  const tap = () => (shared ? shared.tap(() => onSignIn(SIGN_IN_FOLLOW)) : local.tap());
  return (
    <button
      type="button"
      className={on ? styles.followingBtn : styles.followBtn}
      onClick={() => (viewerId ? tap() : onSignIn(SIGN_IN_FOLLOW))}
    >
      {on ? "Following" : "Follow"}
    </button>
  );
}
