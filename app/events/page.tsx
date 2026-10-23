import type { Metadata } from "next";
import EventsClient from "./EventsClient";

// No addresses here: title and description only.
export const metadata: Metadata = {
  title: "Events",
  description: "Find parties, shows and gatherings near you, RSVP for free or get tickets, and host your own on Outsyde.",
  alternates: { canonical: "/events" },
};

export default function EventsPage() {
  return <EventsClient />;
}
