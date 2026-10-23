import type { Metadata } from "next";
import EventEditor from "../../_host/EventEditor";

export const metadata: Metadata = {
  title: "Edit event",
  robots: { index: false, follow: false },
};

// The editor loads the event through /api/events/[id]/manage, which answers 404 for an id that isn't a UUID.
export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventEditor key={id} eventId={id} />;
}
