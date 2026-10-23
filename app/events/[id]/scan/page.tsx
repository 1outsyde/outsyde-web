import type { Metadata } from "next";
import Scanner from "./Scanner";

export const metadata: Metadata = {
  title: "Check in",
  robots: { index: false, follow: false },
};

// The scanner loads the guest list through /api/events/[id]/door/guests, which answers 404 for an id that
// isn't a UUID, or for anyone who isn't the host or on the door team.
export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Scanner key={id} eventId={id} />;
}
