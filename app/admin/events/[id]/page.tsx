import type { Metadata } from "next";
import EventMoneyClient from "./EventMoneyClient";

// Metadata only. The page itself is a client component that reads the admin BFF.
export const metadata: Metadata = { title: { absolute: "Event money | Outsyde Admin" } };

export default async function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventMoneyClient id={id} />;
}
