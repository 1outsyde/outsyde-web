import type { Metadata } from "next";
import ProClient from "./ProClient";

// Metadata only. The feed loads in the browser after mount (ProClient), so nothing per viewer is server rendered.
export const metadata: Metadata = {
  title: { absolute: "Discover | Outsyde" },
  description: "Posts, stories and events from businesses, photographers and people on Outsyde.",
  alternates: { canonical: "/discover" },
};

export default function DiscoverPage() {
  return <ProClient />;
}
