import type { Metadata } from "next";
import EventEditor from "../_host/EventEditor";

export const metadata: Metadata = {
  title: "Host an event",
  robots: { index: false, follow: false },
};

export default function NewEventPage() {
  return <EventEditor />;
}
