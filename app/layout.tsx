import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://goutsyde.com"),
  title: {
    default: "Outsyde",
    template: "%s | Outsyde",
  },
  description:
    "Discover, shop, and book from local vendors and creators — all in one place.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Outsyde",
    description:
      "Discover, shop, and book from local vendors and creators — all in one place.",
    url: "https://goutsyde.com",
    siteName: "Outsyde",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Outsyde" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Outsyde",
    description:
      "Discover, shop, and book from local vendors and creators — all in one place.",
    images: ["/og-image.png"],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}