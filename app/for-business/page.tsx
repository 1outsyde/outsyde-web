import type { Metadata } from "next";
import ForBusinessClient from "./ForBusinessClient";

const DESCRIPTION =
  "Sell products, take bookings with deposits and reach new customers on Outsyde. Compare Starter, Growth and Pro, and keep 98% of every sale.";

export const metadata: Metadata = {
  title: { absolute: "Outsyde for Business: Plans and Pricing" },
  description: DESCRIPTION,
  alternates: { canonical: "/for-business" },
  openGraph: {
    title: "Outsyde for Business",
    description: DESCRIPTION,
    url: "https://goutsyde.com/for-business",
    siteName: "Outsyde",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Outsyde for Business",
    description: DESCRIPTION,
  },
};

export default function ForBusinessPage() {
  return <ForBusinessClient />;
}
