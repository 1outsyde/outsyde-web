import type { Metadata } from "next";
import DoorClient from "./DoorClient";

export const metadata: Metadata = {
  title: "Events you can scan",
  robots: { index: false, follow: false },
};

export default function DoorPage() {
  return <DoorClient />;
}
