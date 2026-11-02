import type { Metadata } from "next";
import EventsAdminClient from "./EventsAdminClient";

// Metadata only. The page itself is a client component: the Money and Reports tabs, each reading the admin BFF.
export const metadata: Metadata = { title: { absolute: "Events | Outsyde Admin" } };

export default function AdminEventsPage() {
  return <EventsAdminClient />;
}
