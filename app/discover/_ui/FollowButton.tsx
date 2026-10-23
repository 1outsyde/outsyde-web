"use client";

import { clientApi } from "../_lib/clientApi";
import { SIGN_IN_FOLLOW } from "../_lib/viewer";
import { useToggle } from "./useToggle";
import styles from "./discover.module.css";

/** Green "Follow", then a green outline "Following". Hidden on the viewer's own posts. */
export default function FollowButton({ userId, initial, viewerId, onSignIn }: {
  userId: string;
  initial: boolean;
  viewerId: string | null;
  onSignIn(message: string): void;
}) {
  const follow = useToggle(
    { on: initial, count: 0 },
    (on) => clientApi.follow(userId, on),
    () => onSignIn(SIGN_IN_FOLLOW),
  );
  if (userId === viewerId) return null;
  return (
    <button
      type="button"
      className={follow.on ? styles.followingBtn : styles.followBtn}
      onClick={() => (viewerId ? follow.tap() : onSignIn(SIGN_IN_FOLLOW))}
    >
      {follow.on ? "Following" : "Follow"}
    </button>
  );
}
