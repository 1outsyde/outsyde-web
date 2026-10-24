import type { Metadata } from "next";
import ReferralsClient from "./ReferralsClient";

// Metadata only. The page itself is a client component that reads the admin BFF.
export const metadata: Metadata = { title: { absolute: "Referrals | Outsyde Admin" }, robots: { index: false, follow: false } };

export default function AdminReferralsPage() {
  return <ReferralsClient />;
}
