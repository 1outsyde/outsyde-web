"use client";

import { useEffect, useRef, useState } from "react";
import { browserZone, fmt } from "../../e/_shared/format";
import { safeHttpUrl } from "../../tickets/ticketsLogic";
import { priceLabel, whenLabel, whereLabel } from "../eventsLogic";
import AgreementText from "./AgreementText";
import {
  addressLabel, eventTimes, hostAsLabel, isScrolledToEnd, previewPrice, refundLabel, ticketsSummary, whenRange,
  type EventForm, type HostEvent, type HostTicketType,
} from "./editorLogic";

export interface Agreement {
  version: string;
  title: string;
  text: string;
  accepted: boolean;
  acceptedAt: string | null;
}

export interface ReviewStepProps {
  event: HostEvent;
  types: HostTicketType[];
  form: EventForm;
  onEdit: (step: "details" | "tickets") => void;
  agreement: Agreement | null;
  agreementError: string | null;
  agreementNotice: string | null;
  read: boolean;
  setRead: (v: boolean) => void;
  accepting: boolean;
  onAccept: () => void;
  onRetryAgreement: () => void;
}

/** Discover card (mockup 12), also used on the live screen. */
export function PreviewCard({ form, types, startsAt, showPrice = true }: { form: EventForm; types: HostTicketType[]; startsAt: string; showPrice?: boolean }) {
  const card = { venueName: form.venueName || null, city: form.city || null, state: form.state || null, addressHidden: form.addressVisibility !== "public" };
  const parts = [
    whenLabel({ startsAt, timezone: form.timezone }, new Date()),
    // A hidden address shows only the city and state in Discover, like the list does.
    whereLabel(card.addressHidden ? { ...card, venueName: null } : card),
    showPrice ? priceLabel(previewPrice(types)) : "",
  ].filter(Boolean);
  const cover = safeHttpUrl(form.coverImageUrl);
  return (
    <div className="ed-card">
      <div className="ed-card-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover ? <img src={cover} alt="" /> : <span>No cover photo yet</span>}
        <span className="ed-card-tag">EVENT</span>
      </div>
      <div className="ed-card-body">
        <div className="ed-card-title">{form.title || "Your event"}</div>
        <div className="ed-hint">{parts.join(" · ")}</div>
      </div>
    </div>
  );
}

export default function ReviewStep(p: ReviewStepProps) {
  const { event, types, form, onEdit, agreement } = p;
  const box = useRef<HTMLDivElement>(null);
  const [showAgain, setShowAgain] = useState(false);
  const times = eventTimes(form);
  const draft = event.status === "draft";
  const { setRead } = p;

  // Text that fits its box counts as read; check after it renders and when the window changes size.
  useEffect(() => {
    const el = box.current;
    if (!el || !agreement || agreement.accepted) return;
    const check = () => { if (isScrolledToEnd(el.scrollTop, el.clientHeight, el.scrollHeight)) setRead(true); };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [agreement, setRead]);

  const rows: { label: string; value: string; to: "details" | "tickets" }[] = [
    { label: "Hosted as", value: hostAsLabel(event.hostType), to: "details" },
    { label: "When", value: times ? whenRange(times.startsAt, times.endsAt, form.timezone) : "Not set", to: "details" },
    { label: "Address", value: addressLabel(form.addressVisibility), to: "details" },
    { label: "Discover", value: form.listed ? "Shown in Discover" : "Only people with the link", to: "details" },
    { label: "Tickets", value: ticketsSummary(types), to: "tickets" },
    { label: "Capacity", value: form.capacity.trim() ? `${form.capacity.trim()} people` : "No limit", to: "tickets" },
    { label: "Refunds", value: refundLabel(form.refundPolicy, form.refundPolicy === "until_cutoff" ? Number(form.refundCutoffHours) : null), to: "tickets" },
  ];

  const showBox = agreement && (!agreement.accepted || showAgain);

  return (
    <div className="ed-stack">
      <div className="ed-label">HOW IT LOOKS IN DISCOVER</div>
      {times && <PreviewCard form={form} types={types} startsAt={times.startsAt} />}

      <ul className="ed-rows">
        {rows.map((r) => (
          <li key={r.label} className="ed-row">
            <div className="ed-row-main">
              <div className="ed-hint">{r.label}</div>
              <div className="ed-strong">{r.value}</div>
            </div>
            <button type="button" className="ed-textbtn ed-gold" onClick={() => onEdit(r.to)} aria-label={`Edit ${r.label.toLowerCase()}`}>Edit</button>
          </li>
        ))}
      </ul>

      {draft && (
        <section className="ed-agree" aria-labelledby="agree-title">
          <h2 className="ed-agree-title" id="agree-title">{agreement?.title ?? "Event Host Agreement"}</h2>
          {p.agreementNotice && <p className="ed-err" role="alert">{p.agreementNotice}</p>}
          {!agreement && !p.agreementError && <div className="ed-hint" role="status">Loading the Event Host Agreement…</div>}
          {!agreement && p.agreementError && (
            <div className="ed-stack-sm">
              <p className="ed-err" role="alert">{p.agreementError}</p>
              <button type="button" className="ed-textbtn ed-gold" onClick={p.onRetryAgreement}>Try again</button>
            </div>
          )}
          {agreement?.accepted && (
            <p className="ed-accepted">
              You accepted the Event Host Agreement{agreement.acceptedAt ? ` on ${fmt(agreement.acceptedAt, browserZone(), { month: "long", day: "numeric", year: "numeric" })}` : ""}.{" "}
              <button type="button" className="ed-textbtn ed-gold ed-inline-btn" aria-expanded={showAgain} onClick={() => setShowAgain((v) => !v)}>
                {showAgain ? "Hide it" : "Read it again"}
              </button>
            </p>
          )}
          {showBox && (
            <div
              ref={box}
              className="ed-agree-box"
              tabIndex={0}
              role="document"
              aria-label="Event Host Agreement text"
              data-testid="agreement-box"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (!p.read && isScrolledToEnd(el.scrollTop, el.clientHeight, el.scrollHeight)) setRead(true);
              }}
            >
              <AgreementText text={agreement.text} />
            </div>
          )}
          {agreement && !agreement.accepted && (
            <>
              <label className={`ed-check${p.read ? "" : " off"}`}>
                <input type="checkbox" checked={p.accepting} disabled={!p.read || p.accepting}
                  onChange={(e) => { if (e.target.checked) p.onAccept(); }} />
                <span>I have read and agree to the Event Host Agreement.</span>
              </label>
              <div className="ed-hint" aria-live="polite">
                {p.accepting ? "Saving your acceptance…" : p.read ? "You can accept it now." : "Scroll to the end of the agreement to accept it."}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
