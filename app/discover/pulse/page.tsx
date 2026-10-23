import type { Metadata } from "next";
import PulseClient from "./PulseClient";

// Metadata only. The videos load in the browser after mount (PulseClient), so nothing per viewer is server rendered.
export const metadata: Metadata = {
  title: { absolute: "Pulse | Outsyde" },
  description: "Short videos from people and businesses on Outsyde.",
  alternates: { canonical: "/discover/pulse" },
};

export default function PulsePage() {
  return <PulseClient />;
}
