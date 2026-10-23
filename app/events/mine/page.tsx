import type { Metadata } from "next";
import MineClient from "../_host/MineClient";

export const metadata: Metadata = {
  title: "Your events",
  robots: { index: false, follow: false },
};

export default function MyEventsPage() {
  return <MineClient />;
}
