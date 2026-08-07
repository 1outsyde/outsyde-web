"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Add future sections here — one line each (Refunds, Users, Photographers).
const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Overview", href: "/admin" },
  { label: "Applications", href: "/admin/applications" },
  { label: "Refunds", href: "/admin/refunds" },
];

// "/admin" must match only itself, otherwise it would light up on every
// subsection. Deeper links also match their own nested routes.
function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return href !== "/admin" && pathname.startsWith(`${href}/`);
}

// This component exists purely so the layout can stay a Server Component:
// usePathname is client-only, and marking the layout "use client" would move
// the hasAdminTokenCookie() gate off the server.
export default function AdminNav() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: "24px", marginLeft: "24px" }}>
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        const color = active
          ? "#E8B930"
          : hovered === link.href
            ? "rgba(245,240,230,0.8)"
            : "rgba(245,240,230,0.5)";

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => setHovered(link.href)}
            onMouseLeave={() => setHovered(null)}
            style={{
              fontSize: "13px",
              letterSpacing: "0.04em",
              textDecoration: "none",
              color,
              transition: "color .15s",
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
