/* eslint-disable @next/next/no-img-element -- plain lazy <img> as on /events (controller ruling) */
import { isPlayableUrl } from "@/lib/coverMedia";
import { fmt } from "../../e/_shared/format";
import { priceLabel, whenLabel, whereLabel, type EventCard } from "../../events/eventsLogic";
import styles from "./discover.module.css";

/** An event in the Pro feed (spec "Event card look"). The whole card links to the event page. */
export default function EventFeedCard({ event, now }: { event: EventCard; now: Date }) {
  const time = whenLabel(event, now).split(" · ").pop() ?? "";
  const line = [time, whereLabel(event), priceLabel(event)].filter(Boolean).join(" · ");
  const weekday = fmt(event.startsAt, event.timezone, { weekday: "short" }).toUpperCase();
  const day = fmt(event.startsAt, event.timezone, { day: "numeric" });
  const hostName = event.host?.name || "Outsyde host";
  const avatar = isPlayableUrl(event.host?.avatarUrl) ? event.host.avatarUrl : null;
  const cover = isPlayableUrl(event.coverImageUrl) ? event.coverImageUrl : null;

  return (
    <a href={`/e/${event.slug}`} className={styles.eventCard}>
      <div className={styles.cardHead}>
        {avatar ? (
          <img className={styles.avatar} src={avatar} alt="" loading="lazy" />
        ) : (
          <span className={styles.avatar} aria-hidden="true">{hostName.replace(/^@/, "").charAt(0).toUpperCase()}</span>
        )}
        <div className={styles.cardWho}>
          <span className={styles.cardName}>{hostName}</span>
          <span className={styles.cardTime}>Hosting an event</span>
        </div>
        <span className={styles.eventTag}>EVENT</span>
      </div>
      <div className={styles.eventCover}>
        {cover ? <img className={styles.mediaImg} src={cover} alt="" loading="lazy" /> : <span className={styles.eventCoverLabel}>Event</span>}
        <span className={styles.dateBlock}>
          <span className={styles.dateWeekday}>{weekday}</span>
          <span className={styles.dateDay}>{day}</span>
        </span>
      </div>
      <div className={styles.eventFoot}>
        <div className={styles.eventText}>
          <span className={styles.eventTitle}>{event.title}</span>
          {line ? <span className={styles.eventLine}>{line}</span> : null}
        </div>
        <span className={styles.ticketsBtn}>Get tickets</span>
      </div>
    </a>
  );
}
