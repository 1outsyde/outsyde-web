import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Dia Lux Kollection",
  description:
    "100% raw hair in straight, wavy, and curly textures — crafted for a flawless install, minimal shedding, and a finish that lasts. Discover Dia Lux Kollection on Outsyde.",
  openGraph: {
    title: "Dia Lux Kollection",
    description:
      "Luxury raw hair bundles in straight, wavy, and curly textures. Discover Dia Lux Kollection on Outsyde.",
    url: "https://goutsyde.com/shop/dialux",
    siteName: "Outsyde",
    images: [
      {
        url: "/dialux-og.png",
        width: 1200,
        height: 630,
        alt: "Dia Lux Kollection",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dia Lux Kollection",
    description:
      "Luxury raw hair bundles in straight, wavy, and curly textures.",
    images: ["/dialux-og.png"],
  },
};
export default function DiaLuxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}