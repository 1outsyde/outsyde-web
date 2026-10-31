import type { Metadata } from "next";
import MyTeamClient from "./MyTeamClient";

export const metadata: Metadata = {
  title: "Your Event team spot",
  robots: { index: false, follow: false },
};

// Only my own things: /api/events/[id]/team/me answers 404 for anyone not on the team.
export default async function MyTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MyTeamClient key={id} eventId={id} />;
}
