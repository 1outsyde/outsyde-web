import type { Metadata } from "next";
import TeamClient from "./TeamClient";

export const metadata: Metadata = {
  title: "Door team",
  robots: { index: false, follow: false },
};

// Host only: /api/events/[id]/door/team answers 404 for anyone else.
export default async function DoorTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeamClient key={id} eventId={id} />;
}
