"use client";

// Admin → Emails. Tab shell: ?tab=setup (default) | broadcast | push | history.
//   Account setup: ./AccountSetupTab.tsx (unchanged from #64)
//   Broadcast:     ./BroadcastTab.tsx (Legend's own HTML announcements, backend #292)
//   Push:          ./PushTab.tsx (app push notifications, backend #368)
//   History:       ./HistoryTab.tsx (every logged email, by send and by person, backend #292; push sends with &view=push)
// Design: the Admin Email Pages Design note in the vault. Copy: plain punctuation, no dashes.

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AccountSetupTab from "./AccountSetupTab";
import BroadcastTab from "./BroadcastTab";
import HistoryTab from "./HistoryTab";
import PushTab from "./PushTab";
import { EM_CSS } from "./shared";

type Tab = "setup" | "broadcast" | "push" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "setup", label: "Account setup" },
  { key: "broadcast", label: "Broadcast" },
  { key: "push", label: "Push" },
  { key: "history", label: "History" },
];

const SHELL_CSS = `
  .em-shell { font-family: 'Hanken Grotesk', 'Inter', sans-serif; max-width: 980px; }
  .em-h1 { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.04em; color: #F5F0E6; margin-bottom: 14px; }
  .em-tabs { display: flex; gap: 4px; border-bottom: 1px solid rgba(245,240,230,0.1); margin-bottom: 22px; overflow-x: auto; scrollbar-width: none; }
  .em-tabs::-webkit-scrollbar { display: none; }
  .em-tab { font-family: inherit; font-size: 13.5px; padding: 10px 14px; background: none; border: 0; border-bottom: 2px solid transparent; margin-bottom: -1px; color: rgba(245,240,230,0.55); cursor: pointer; white-space: nowrap; }
  .em-tab:hover { color: rgba(245,240,230,0.85); }
  .em-tab.on { color: #E8B930; border-bottom-color: #E8B930; }
`;

function parseTab(value: string | null): Tab {
  return value === "broadcast" || value === "push" || value === "history" ? value : "setup";
}

function EmailsShell() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = parseTab(params.get("tab"));
  const openSend = params.get("send");
  const openPush = params.get("push");
  const pushView = params.get("view") === "push";

  const go = useCallback(
    (next: Tab, extra?: Record<string, string>) => {
      const q = new URLSearchParams();
      if (next !== "setup") q.set("tab", next);
      for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SHELL_CSS + EM_CSS }} />
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="em-shell">
        <div className="em-h1">Emails</div>
        <div className="em-tabs" role="tablist" aria-label="Email tools">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`em-tab${tab === t.key ? " on" : ""}`}
              onClick={() => go(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "setup" && <AccountSetupTab />}
      {tab === "broadcast" && <BroadcastTab onOpenSend={(id) => go("history", { send: id })} />}
      {tab === "push" && <PushTab onOpenSend={(id) => go("history", { view: "push", push: id })} />}
      {tab === "history" && (
        <HistoryTab
          openSendId={openSend}
          onOpenSend={(id) => go("history", id ? { send: id } : undefined)}
          pushView={pushView}
          openPushId={openPush}
          onOpenPush={(id) => go("history", id ? { view: "push", push: id } : { view: "push" })}
          onLeavePush={() => go("history")}
        />
      )}
    </>
  );
}

export default function AdminEmailsPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <EmailsShell />
    </Suspense>
  );
}
