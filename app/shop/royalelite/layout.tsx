import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Royal Elite Moving",
  description:
    "Professional, reliable moving services. Request a free estimate and secure your date. Royal Elite Moving on Outsyde.",
  openGraph: {
    title: "Royal Elite Moving",
    description:
      "Professional, reliable moving services. Request a free estimate and secure your date. Royal Elite Moving on Outsyde.",
    url: "https://goutsyde.com/shop/royalelite",
    siteName: "Outsyde",
    images: [
      {
        url: "/royalelite-og.png",
        width: 1200,
        height: 630,
        alt: "Royal Elite Moving",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Royal Elite Moving",
    description:
      "Professional, reliable moving services. Request a free estimate and secure your date.",
    images: ["/royalelite-og.png"],
  },
};
export default function RoyalEliteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}