"use client";
/**
 * goutsyde.com/admin/events: the Money tab (the events money page, unchanged) and the Reports tab (p5-safety W1).
 * The tab follows the address hash, so the admin alert email's link with #reports opens Reports.
 * The Reports tab shows how many events and posts wait for review. The tabs are drawn inside each tab's own page.
 */
import { useCallback, useEffect, useState } from "react";
import EventsMoneyClient from "./EventsMoneyClient";
import ReportsClient from "./ReportsClient";
import { tabFromHash, type AdminEventsTab } from "./_lib/moderation";

async function countReports(): Promise<number | null> {
  try {
    const [a, b] = await Promise.all(["event", "post"].map((t) => fetch(`/api/admin/events/reports?type=${t}`, { cache: "no-store" })));
    if (!a.ok || !b.ok) return null;
    const [x, y] = await Promise.all([a.json().catch(() => null), b.json().catch(() => null)]);
    return Array.isArray(x?.items) && Array.isArray(y?.items) ? x.items.length + y.items.length : null;
  } catch {
    return null;
  }
}

export default function EventsAdminClient() {
  // null until the address hash is read, so a #reports link never starts the Money page first.
  const [tab, setTab] = useState<AdminEventsTab | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setTab(tabFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const refreshCount = useCallback(() => {
    void countReports().then(setCount);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  function pick(t: AdminEventsTab) {
    setTab(t);
    try {
      // Keep the address in step without a new history entry per click.
      window.history.replaceState(null, "", t === "reports" ? "#reports" : window.location.pathname + window.location.search);
    } catch {
      /* the tab still switches */
    }
  }

  const tabs = (
    <div className="aem-tabs" role="group" aria-label="Events admin">
      <button type="button" className="aem-tab" aria-pressed={tab === "money"} onClick={() => pick("money")} data-testid="aem-tab-money">Money</button>
      <button type="button" className="aem-tab" aria-pressed={tab === "reports"} onClick={() => pick("reports")} data-testid="aem-tab-reports">
        Reports{count ? <span className="aem-badge" aria-label={`${count} waiting`}>{count}</span> : null}
      </button>
    </div>
  );
  if (tab === null) return null;
  return tab === "money" ? <EventsMoneyClient top={tabs} /> : <ReportsClient top={tabs} onChanged={refreshCount} />;
}
