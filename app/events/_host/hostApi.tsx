"use client";

/** Shared by the host pages (editor, manage, my events, and Task 5's team and scan): the BFF caller and the page shell. */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { EDITOR_CSS } from "./editorStyles";

export type ApiResult = { status: number; body: any } | null; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * `call(method, path, body?)` fetches a BFF and never throws: { status: 0, body: null } when the network fails,
 * null when the person is signed out (already sent to /login?return=<current path>).
 */
export function useHostApi() {
  const router = useRouter();
  const toLogin = useCallback(() => {
    router.replace(`/login?return=${encodeURIComponent(window.location.pathname)}`);
  }, [router]);

  const call = useCallback(async (method: string, path: string, body?: unknown): Promise<ApiResult> => {
    try {
      const res = await fetch(path, {
        method,
        cache: "no-store",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) { toLogin(); return null; }
      return { status: res.status, body: await res.json().catch(() => null) };
    } catch {
      return { status: 0, body: null };
    }
  }, [toLogin]);

  return { call, toLogin };
}

/** The centered black page with the site fonts. `css` adds page specific styles after the shared ones. */
export function HostShell({ css = "", children }: { css?: string; children: React.ReactNode }) {
  return (
    <main className="ed-page">
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {/* One string child: two text children inside <style> break hydration. */}
      <style>{EDITOR_CSS + css}</style>
      <div className="ed-wrap">{children}</div>
    </main>
  );
}
