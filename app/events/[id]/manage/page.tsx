import type { Metadata } from "next";
import ManageClient from "../../_host/ManageClient";

export const metadata: Metadata = {
  title: "Manage event",
  robots: { index: false, follow: false },
};

// The client loads the event through /api/events/[id]/manage, which answers 404 for an id that isn't a UUID
// or isn't yours.
export default async function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ManageClient key={id} eventId={id} />;
}
