"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Add future sections here — one line each (Refunds, Users, Photographers).
const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Overview", href: "/admin" },
  { label: "Applications", href: "/admin/applications" },
  { label: "Refunds", href: "/admin/refunds" },
  { label: "Users", href: "/admin/users" },
  { label: "Photographers", href: "/admin/photographers" },
  { label: "Influencers", href: "/admin/influencers" },
  { label: "Vendors", href: "/admin/vendors" },
  { label: "Emails", href: "/admin/emails" },
];

// "/admin" must match only itself, otherwise it would light up on every
// subsection. Deeper links also match their own nested routes.
function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return href !== "/admin" && pathname.startsWith(`${href}/`);
}

// Phone menu (below 768px). The desktop link row is unchanged above that width; on a phone it is
// hidden and replaced by the current section name plus a "Menu" button that opens a panel under
// the admin header. The phone rules for the header itself (padding, one line title) live in
// app/admin/layout.tsx and use the same width.
const PHONE_CSS = `
  .admin-nav-phone { display: none; }
  @media (max-width: 767px) {
    .admin-nav-desktop { display: none !important; }
    .admin-nav-phone { display: flex; align-items: center; gap: 10px; margin-left: auto; min-width: 0; }
  }
  @media (max-width: 419px) {
    .admin-nav-current { display: none; }
  }
  .admin-nav-current { font-size: 13px; letter-spacing: 0.04em; color: #E8B930; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-nav-btn { font-family: inherit; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 7px 12px; border-radius: 6px; border: 1px solid rgba(232,185,48,0.5); background: transparent; color: #E8B930; cursor: pointer; flex: none; }
  .admin-nav-btn[aria-expanded="true"] { background: rgba(232,185,48,0.14); }
  .admin-nav-panel { position: absolute; left: 0; right: 0; top: 100%; z-index: 9000; background: #050505; border-bottom: 1px solid rgba(232,185,48,0.35); box-shadow: 0 18px 40px rgba(0,0,0,0.6); padding: 8px 16px 14px; }
  .admin-nav-panel a { display: block; padding: 13px 4px; font-size: 15px; letter-spacing: 0.03em; text-decoration: none; color: rgba(245,240,230,0.75); border-bottom: 1px solid rgba(245,240,230,0.06); }
  .admin-nav-panel a:last-child { border-bottom: 0; }
  .admin-nav-panel a[aria-current="page"] { color: #E8B930; }
  @media (min-width: 768px) {
    .admin-nav-panel { display: none; }
  }
`;

// This component exists purely so the layout can stay a Server Component:
// usePathname is client-only, and marking the layout "use client" would move
// the hasAdminTokenCookie() gate off the server.
export default function AdminNav() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape closes the phone menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const current = NAV_LINKS.find((l) => isActive(pathname, l.href))?.label ?? "Admin";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PHONE_CSS }} />
      <nav className="admin-nav-desktop" style={{ display: "flex", alignItems: "center", gap: "24px", marginLeft: "24px" }}>
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

      <div className="admin-nav-phone">
        <span className="admin-nav-current">{current}</span>
        <button
          type="button"
          className="admin-nav-btn"
          aria-expanded={menuOpen}
          aria-controls="admin-nav-panel"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <nav id="admin-nav-panel" className="admin-nav-panel" aria-label="Admin sections">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
