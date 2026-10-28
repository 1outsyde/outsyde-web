import type { Metadata } from "next";
import DoorClient from "./DoorClient";

export const metadata: Metadata = {
  title: "Door check in",
  robots: { index: false, follow: false },
};

export default function DoorPage() {
  return <DoorClient />;
}
