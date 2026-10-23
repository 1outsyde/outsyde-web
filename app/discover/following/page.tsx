import type { Metadata } from "next";
import FollowingClient from "./FollowingClient";

// Metadata only. The feed loads in the browser after mount (FollowingClient), so nothing per viewer is server rendered.
export const metadata: Metadata = {
  title: { absolute: "Following | Outsyde" },
  description: "Posts from the people you follow on Outsyde.",
  alternates: { canonical: "/discover/following" },
};

export default function FollowingPage() {
  return <FollowingClient />;
}
