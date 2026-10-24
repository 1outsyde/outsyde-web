import type { Metadata } from "next";
import EventsMoneyClient from "./EventsMoneyClient";

// Metadata only. The page itself is a client component that reads the admin BFF.
export const metadata: Metadata = { title: { absolute: "Events money | Outsyde Admin" } };

export default function AdminEventsPage() {
  return <EventsMoneyClient />;
}
