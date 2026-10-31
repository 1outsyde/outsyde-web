import type { Metadata } from "next";
import DoorClient from "./DoorClient";

export const metadata: Metadata = {
  title: "Event team",
  robots: { index: false, follow: false },
};

export default function DoorPage() {
  return <DoorClient />;
}
