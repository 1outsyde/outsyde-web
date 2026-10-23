import styles from "./DiscoverTabs.module.css";

export type DiscoverTab = "events" | "following" | "pro" | "pulse";

const TABS: { key: DiscoverTab; label: string; href: string }[] = [
  { key: "events", label: "Events", href: "/events" },
  { key: "following", label: "Following", href: "/discover/following" },
  { key: "pro", label: "Pro", href: "/discover" },
  { key: "pulse", label: "Pulse", href: "/discover/pulse" },
];

function TicketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8B930" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
    </svg>
  );
}

export default function DiscoverTabs({ current }: { current: DiscoverTab }) {
  return (
    <div className={styles.tabsHeader}>
      <nav aria-label="Discover" className={styles.tabs}>
        {TABS.map((t) => {
          const on = t.key === current;
          return (
            <a
              key={t.key}
              href={t.href}
              className={on ? `${styles.tab} ${styles.tabOn}` : styles.tab}
              aria-current={on ? "page" : undefined}
            >
              {t.key === "events" ? <TicketIcon /> : null}
              {t.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
