"use client";

import { useEffect, useState } from "react";

interface MeUser {
  id: string;
  email: string;
  firstName?: string;
  role?: string;
  businessId?: string | null;
  photographerId?: string | null;
  loyaltyPoints?: number;
  profileImageUrl?: string | null;
}

type AuthState = "loading" | false | MeUser;

export default function Navbar() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean; user?: MeUser }) => {
        if (d.authenticated && d.user) {
          setAuth(d.user);
        } else {
          setAuth(false);
        }
      })
      .catch(() => setAuth(false));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  const user = auth !== "loading" && auth !== false ? auth : null;
  const role = user?.role ?? null;
  const isVendor = role === "vendor" || !!(user?.businessId);
  const isPhotographer = role === "photographer" || !!(user?.photographerId);
  const isAdmin = role === "admin";
  const isConsumer = !isVendor && !isPhotographer && !isAdmin;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .on-nav {
          position: sticky; top: 0; z-index: 200;
          background: #0a0a0a; border-bottom: 1px solid rgba(245,240,230,0.06);
          height: 56px; display: flex; align-items: center;
          padding: 0 28px; gap: 0;
          font-family: 'Hanken Grotesk', system-ui, sans-serif;
        }
        .on-nav * { box-sizing: border-box; }
        .on-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0; margin-right: auto;
        }
        .on-logo-y {
          width: 30px; height: 30px; object-fit: contain; flex-shrink: 0;
        }
        .on-logo-word {
          font-family: 'Bebas Neue', Impact, sans-serif; font-size: 16px;
          letter-spacing: 0.16em; color: #F5F0E6; text-transform: uppercase;
        }
        .on-links {
          display: flex; align-items: center; gap: 6px;
        }
        .on-link {
          font-size: 12px; font-weight: 500; letter-spacing: 0.04em;
          color: rgba(245,240,230,0.55); text-decoration: none; padding: 6px 10px;
          border-radius: 4px; transition: color 0.15s;
          background: transparent; border: none; cursor: pointer; font-family: inherit;
          white-space: nowrap;
        }
        .on-link:hover { color: #F5F0E6; }
        .on-link-btn {
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; text-decoration: none; padding: 7px 14px;
          border-radius: 4px; transition: background 0.15s, color 0.15s;
          cursor: pointer; font-family: inherit; border: none; white-space: nowrap;
        }
        .on-link-outline {
          color: #E8B930; border: 1px solid rgba(232,185,48,0.4);
          background: transparent;
        }
        .on-link-outline:hover { background: rgba(232,185,48,0.08); }
        .on-link-fill {
          background: #E8B930; color: #000;
        }
        .on-link-fill:hover { background: #f2c835; }
        .on-points {
          font-size: 11px; color: #E8B930; background: rgba(232,185,48,0.1);
          border: 1px solid rgba(232,185,48,0.25); border-radius: 999px;
          padding: 3px 10px; text-decoration: none; white-space: nowrap;
          transition: background 0.15s;
        }
        .on-points:hover { background: rgba(232,185,48,0.18); }
        .on-hamburger {
          display: none; flex-direction: column; gap: 4px; cursor: pointer;
          background: none; border: none; padding: 8px; margin-left: 8px;
        }
        .on-hamburger span {
          display: block; width: 20px; height: 2px; background: rgba(245,240,230,0.7);
          border-radius: 1px; transition: opacity 0.2s;
        }
        .on-drawer {
          display: none; position: fixed; top: 56px; left: 0; right: 0;
          background: #0a0a0a; border-bottom: 1px solid rgba(245,240,230,0.08);
          padding: 12px 0 16px; z-index: 199; flex-direction: column;
        }
        .on-drawer.open { display: flex; }
        .on-drawer a, .on-drawer button {
          font-size: 13px; font-weight: 500; letter-spacing: 0.04em;
          color: rgba(245,240,230,0.7); text-decoration: none; padding: 12px 24px;
          background: transparent; border: none; cursor: pointer;
          font-family: inherit; text-align: left; transition: color 0.15s;
          display: block; width: 100%;
        }
        .on-drawer a:hover, .on-drawer button:hover { color: #E8B930; }
        @media (max-width: 640px) {
          .on-links { display: none; }
          .on-hamburger { display: flex; }
        }
        @media (min-width: 641px) {
          .on-drawer { display: none !important; }
        }
      `}} />

      <nav className="on-nav">
        <a href="/" className="on-logo" aria-label="Go OutsYde home">
          <img src="/outsyde-y-transparent.png" className="on-logo-y" alt="" aria-hidden="true" />
          <span className="on-logo-word">Outsyde</span>
        </a>

        {/* Desktop links — hidden while loading to prevent flash */}
        {auth !== "loading" && (
          <div className="on-links">
            {!user && (
              <>
                <a href="/shop/lotus" className="on-link">Shop</a>
                <a href="/login" className="on-link-btn on-link-outline">Log In</a>
                <a href="/signup" className="on-link-btn on-link-fill">Sign Up</a>
              </>
            )}

            {user && isConsumer && (
              <>
                <a href="/shop/lotus" className="on-link">Shop</a>
                <a href="/account" className="on-link">My Activity</a>
                <a href="/account/points" className="on-points">
                  {(user.loyaltyPoints ?? 0).toLocaleString()} pts
                </a>
                <button onClick={handleLogout} className="on-link">Log Out</button>
              </>
            )}

            {user && isVendor && (
              <>
                <a href="/account" className="on-link">My Shop</a>
                <a href="/vendor-dashboard" className="on-link">Dashboard</a>
                <button onClick={handleLogout} className="on-link">Log Out</button>
              </>
            )}

            {user && isPhotographer && !isVendor && (
              <>
                <a href="/photographer-dashboard" className="on-link">Dashboard</a>
                <button onClick={handleLogout} className="on-link">Log Out</button>
              </>
            )}

            {user && isAdmin && (
              <>
                <a href="/admin" className="on-link">Admin Panel</a>
                <button onClick={handleLogout} className="on-link">Log Out</button>
              </>
            )}
          </div>
        )}

        {/* Hamburger button — mobile only */}
        {auth !== "loading" && (
          <button
            className="on-hamburger"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        )}
      </nav>

      {/* Mobile drawer */}
      {auth !== "loading" && (
        <div className={`on-drawer${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen}>
          {!user && (
            <>
              <a href="/shop/lotus" onClick={() => setMenuOpen(false)}>Shop</a>
              <a href="/login" onClick={() => setMenuOpen(false)}>Log In</a>
              <a href="/signup" onClick={() => setMenuOpen(false)}>Sign Up</a>
            </>
          )}

          {user && isConsumer && (
            <>
              <a href="/shop/lotus" onClick={() => setMenuOpen(false)}>Shop</a>
              <a href="/account" onClick={() => setMenuOpen(false)}>My Activity</a>
              <a href="/account/points" onClick={() => setMenuOpen(false)}>
                Points ({(user.loyaltyPoints ?? 0).toLocaleString()})
              </a>
              <button onClick={handleLogout}>Log Out</button>
            </>
          )}

          {user && isVendor && (
            <>
              <a href="/account" onClick={() => setMenuOpen(false)}>My Shop</a>
              <a href="/vendor-dashboard" onClick={() => setMenuOpen(false)}>Dashboard</a>
              <button onClick={handleLogout}>Log Out</button>
            </>
          )}

          {user && isPhotographer && !isVendor && (
            <>
              <a href="/photographer-dashboard" onClick={() => setMenuOpen(false)}>Dashboard</a>
              <button onClick={handleLogout}>Log Out</button>
            </>
          )}

          {user && isAdmin && (
            <>
              <a href="/admin" onClick={() => setMenuOpen(false)}>Admin Panel</a>
              <button onClick={handleLogout}>Log Out</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
