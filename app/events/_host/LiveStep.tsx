"use client";

import { useState } from "react";
import Link from "next/link";
import { PreviewCard } from "./ReviewStep";
import { shareUrl, type EventForm, type HostEvent, type HostTicketType } from "./editorLogic";

export default function LiveStep({ event, form, types }: { event: HostEvent; form: EventForm; types: HostTicketType[] }) {
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const url = shareUrl(event.slug);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  }

  return (
    <div className="ed-live">
      <div className="ed-live-check" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
      </div>
      <h1 className="ed-live-title">YOUR EVENT IS LIVE</h1>
      <p className="ed-live-text">
        {event.visibility === "unlisted"
          ? "Only people with the link can find it. Share the link to fill it up."
          : "People can find it in Discover under Events. Share the link to fill it up."}
      </p>
      <PreviewCard form={form} types={types} startsAt={event.startsAt} showPrice={false} />
      <div className="ed-share">
        <div className="ed-share-url" data-testid="share-url">{url.replace(/^https:\/\//, "")}</div>
        <button type="button" className="ed-copy" onClick={copy}>{copied === "yes" ? "Copied" : "Copy"}</button>
      </div>
      <div className="ed-hint" aria-live="polite">
        {copied === "no" ? `Couldn't copy. The link is ${url}` : ""}
      </div>
      <div className="ed-live-actions">
        <Link href={`/e/${event.slug}`} className="ed-outline">View event</Link>
        <Link href={`/events/${event.id}/manage`} className="ed-outline">Manage event</Link>
      </div>
    </div>
  );
}
