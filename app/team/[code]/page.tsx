import type { Metadata } from "next";
import TeamLinkClient from "./TeamLinkClient";

export const metadata: Metadata = {
  title: "Event team invite",
  robots: { index: false, follow: false },
};

// p4-team step 9-0: a one person Event team invite link (backend #402). Public; accepting needs an account.
export default async function TeamLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <TeamLinkClient key={code} code={code} />;
}
