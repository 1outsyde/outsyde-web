import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lotus House Blends",
  description:
    "Handcrafted herbal aromatherapy blends crafted for every ritual of your day — morning, midday, and night. Discover Lotus House Blends on Outsyde.",
  openGraph: {
    title: "Lotus House Blends",
    description:
      "Handcrafted herbal aromatherapy blends crafted for every ritual of your day. Discover Lotus House Blends on Outsyde.",
    url: "https://goutsyde.com/shop/lotus",
    siteName: "Outsyde",
    images: [
      {
        url: "/lotus-og.png",
        width: 1200,
        height: 630,
        alt: "Lotus House Blends",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lotus House Blends",
    description:
      "Handcrafted herbal aromatherapy blends crafted for every ritual of your day.",
    images: ["/lotus-og.png"],
  },
};

export default function LotusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}