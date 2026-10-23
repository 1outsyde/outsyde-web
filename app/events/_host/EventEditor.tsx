"use client";

/**
 * Create and edit flow for hosts (/events/new, /events/[id]/edit): start (cover and drafts), Details, Tickets,
 * Review (with the Event Host Agreement gate) and the live screen. The first save creates the draft (POST) and
 * moves the address bar to /events/<id>/edit, later saves PATCH only what changed. Pages call BFFs only.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GENERIC_ERROR, browserZone, errorCopy, fmt, stripeUrl } from "../../e/_shared/format";
import { safeHttpUrl } from "../../tickets/ticketsLogic";
import DetailsStep from "./DetailsStep";
import TicketsStep, { type PayoutBanner } from "./TicketsStep";
import TicketTypeSheet from "./TicketTypeSheet";
import ReviewStep, { type Agreement } from "./ReviewStep";
import LiveStep from "./LiveStep";
import { HostShell, useHostApi } from "./hostApi";
import {
  activeTypes, changedFields, createBody, emptyForm, emptySheet, formFromEvent, hostOptions, isHostEvent, isHostTicketType,
  nextStepLabel, patchBody, profilePayoutNote, publishFailure, sheetFromType, ticketBody, validateForm,
  type EventForm, type HostAs, type HostEvent, type HostTicketType, type PublishNext, type TicketSheet,
} from "./editorLogic";

type Screen = "loading" | "error" | "start" | "details" | "tickets" | "review" | "live";
type Step = "details" | "tickets" | "review";

const STEPS: Record<Step, { n: number; title: string }> = {
  details: { n: 1, title: "Event details" },
  tickets: { n: 2, title: "Tickets" },
  review: { n: 3, title: "Review" },
};
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const UPLOAD_FAILED = "We couldn't upload that photo. Try again, or continue without one for now.";

function toAgreement(a: unknown): Agreement | null {
  const x = a as Record<string, unknown> | null;
  if (!x || typeof x.version !== "string" || typeof x.text !== "string") return null;
  return {
    version: x.version,
    title: typeof x.title === "string" ? x.title : "Event Host Agreement",
    text: x.text,
    accepted: x.accepted === true,
    acceptedAt: typeof x.acceptedAt === "string" ? x.acceptedAt : null,
  };
}

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export default function EventEditor({ eventId: routeId }: { eventId?: string }) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(routeId ?? null);
  const [event, setEvent] = useState<HostEvent | null>(null);
  const [types, setTypes] = useState<HostTicketType[]>([]);
  const [form, setForm] = useState<EventForm>(() => emptyForm(browserZone()));
  const [base, setBase] = useState<EventForm | null>(null);
  const [startLocked, setStartLocked] = useState(false);
  const [hosts, setHosts] = useState<HostAs[]>(["user"]);
  const [drafts, setDrafts] = useState<HostEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ initial: TicketSheet; editing: HostTicketType | null } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [payout, setPayout] = useState<PayoutBanner>({ kind: "none" });
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [agreementNotice, setAgreementNotice] = useState<string | null>(null);
  const [read, setRead] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [publishError, setPublishError] = useState<{ message: string; next: PublishNext } | null>(null);

  const { call, toLogin } = useHostApi();

  const applyServer = useCallback((e: HostEvent, ts?: unknown) => {
    const f = formFromEvent(e);
    setEvent(e);
    setForm(f);
    setBase(f);
    setStartLocked(new Date(e.startsAt).getTime() <= Date.now());
    if (Array.isArray(ts)) setTypes(ts.filter(isHostTicketType));
  }, []);

  const loadEvent = useCallback(async (id: string): Promise<boolean> => {
    const r = await call("GET", `/api/events/${id}/manage`);
    if (!r) return false;
    if (r.status !== 200 || !r.body?.success || !isHostEvent(r.body.event)) {
      setLoadError(r.status === 404 ? "We couldn't find that event on your account." : errorCopy(r.status, r.body));
      setScreen("error");
      return false;
    }
    const e = r.body.event as HostEvent;
    if (e.status === "cancelled") {
      setLoadError("This event was cancelled, so it can't be edited.");
      setScreen("error");
      return false;
    }
    applyServer(e, r.body.ticketTypes);
    return true;
  }, [call, applyServer]);

  const loadStart = useCallback(async () => {
    const [me, mine] = await Promise.all([call("GET", "/api/auth/me"), call("GET", "/api/events/mine")]);
    if (!me || !mine) return;
    if (me.status !== 200 || me.body?.authenticated !== true) {
      setLoadError(errorCopy(me.status, me.body));
      setScreen("error");
      return;
    }
    setHosts(hostOptions(me.body.user));
    const list: unknown[] = mine.status === 200 && Array.isArray(mine.body?.events) ? mine.body.events : [];
    setDrafts(list.filter(isHostEvent).filter((e) => e.status === "draft"));
    setScreen("start");
  }, [call]);

  const load = useCallback(async () => {
    setScreen("loading");
    setLoadError(null);
    if (routeId) {
      if (await loadEvent(routeId)) setScreen("details");
    } else {
      await loadStart();
    }
  }, [routeId, loadEvent, loadStart]);

  useEffect(() => { load(); }, [load]);

  /** Form edits from the steps: an old "fix this" message goes away once the person changes something. */
  const editForm = useCallback((f: EventForm) => {
    setForm(f);
    setError(null);
  }, []);

  const go = useCallback((s: Screen) => {
    setScreen(s);
    setError(null);
    setNotice(null);
    setPublishError(null);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);

  /* ---------- saving ---------- */

  async function save(): Promise<boolean> {
    if (busy) return false;
    const problem = validateForm(form);
    if (problem) { setError(problem); return false; }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!eventId) {
        const r = await call("POST", "/api/events", createBody(form));
        if (!r) return false;
        if ((r.status !== 201 && r.status !== 200) || !r.body?.success || !isHostEvent(r.body.event)) {
          setError(errorCopy(r.status, r.body));
          return false;
        }
        const e = r.body.event as HostEvent;
        setEventId(e.id);
        applyServer(e, r.body.ticketTypes ?? []);
        // Reloading now opens the saved draft.
        window.history.replaceState(null, "", `/events/${e.id}/edit`);
        return true;
      }
      const patch = patchBody(base ?? form, form);
      if (Object.keys(patch).length === 0) return true;
      const r = await call("PATCH", `/api/events/${eventId}`, patch);
      if (!r) return false;
      if (r.status !== 200 || !r.body?.success || !isHostEvent(r.body.event)) {
        setError(errorCopy(r.status, r.body));
        return false;
      }
      applyServer(r.body.event, r.body.ticketTypes);
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (await save()) setNotice(event && event.status !== "draft" ? "Changes saved." : "Draft saved.");
  }

  async function next(to: Step) {
    if (!(await save())) return;
    go(to);
    // The review step of a draft shows the Event Host Agreement: load it fresh each time it opens.
    if (to === "review" && event?.status !== "cancelled") await loadAgreement();
  }

  /* ---------- cover ---------- */

  async function uploadCover(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) { setError("Choose a photo file."); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setError("That photo is too large. Choose one under 20 MB."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("folder", "covers");
      fd.append("file", file);
      const res = await fetch("/api/vendor-dashboard/upload-image", { method: "POST", body: fd });
      if (res.status === 401) { toLogin(); return; }
      const body = await res.json().catch(() => null);
      const url = res.ok ? safeHttpUrl(body?.url) : null;
      if (!url) { setError(UPLOAD_FAILED); return; }
      setForm((f) => ({ ...f, coverImageUrl: url }));
    } catch {
      setError(UPLOAD_FAILED);
    } finally {
      setUploading(false);
    }
  }

  /* ---------- ticket types ---------- */

  const closeSheet = useCallback(() => setSheet(null), []);

  async function saveType(body: Record<string, unknown>): Promise<string | null> {
    if (!eventId || !sheet) return GENERIC_ERROR;
    const editing = sheet.editing;
    // PATCH only what changed, like the event itself: unchanged price, sales start and unlock are not resent.
    let patch = body;
    if (editing && event) {
      const before = ticketBody(sheetFromType(editing, event.timezone), event.timezone);
      if (before.ok) patch = changedFields(before.body, body);
      if (Object.keys(patch).length === 0) { setSheet(null); return null; }
    }
    const r = editing
      ? await call("PATCH", `/api/events/${eventId}/ticket-types/${editing.id}`, patch)
      : await call("POST", `/api/events/${eventId}/ticket-types`, body);
    if (!r) return null;
    if ((r.status !== 200 && r.status !== 201) || !r.body?.success || !isHostTicketType(r.body.ticketType)) {
      return errorCopy(r.status, r.body);
    }
    const t = r.body.ticketType as HostTicketType;
    setTypes((prev) => (editing ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t]));
    setSheet(null);
    setNotice(editing ? `${t.name} saved.` : `${t.name} added.`);
    return null;
  }

  async function removeType(t: HostTicketType) {
    if (!eventId || removingId) return;
    if (t.takenCount > 0 && !window.confirm(`Tickets for ${t.name} were already taken, so it will stop selling instead of being deleted. Tickets already taken stay valid. Stop selling ${t.name}?`)) return;
    setRemovingId(t.id);
    setError(null);
    setNotice(null);
    const r = await call("DELETE", `/api/events/${eventId}/ticket-types/${t.id}`);
    setRemovingId(null);
    if (!r) return;
    if (r.status !== 200 || !r.body?.success) { setError(errorCopy(r.status, r.body)); return; }
    if (r.body.removed === "archived" && isHostTicketType(r.body.ticketType)) {
      const archived = r.body.ticketType as HostTicketType;
      setTypes((prev) => prev.map((x) => (x.id === t.id ? archived : x)));
      setNotice(`${t.name} has sales, so it stopped selling instead of being deleted. Tickets already taken stay valid.`);
    } else {
      setTypes((prev) => prev.filter((x) => x.id !== t.id));
      setNotice(`${t.name} removed.`);
    }
  }

  /* ---------- payouts ---------- */

  const hasPaid = activeTypes(types).some((t) => t.priceCents > 0);
  const hostType = event?.hostType;
  const evId = event?.id;

  useEffect(() => {
    if (!evId || !hostType || !hasPaid) return;
    let live = true;
    call("GET", `/api/events/payouts/status?hostType=${hostType}`).then((r) => {
      if (!live || !r) return;
      // Unknown status shows nothing: publishing still says when payouts are missing.
      if (r.status === 200 && r.body?.success && r.body.ready !== true) {
        setPayout({ kind: "setup", canStart: hostType === "user", sending: false, error: null });
      } else {
        setPayout({ kind: "none" });
      }
    });
    return () => { live = false; };
  }, [evId, hostType, hasPaid, call]);

  async function startPayouts() {
    setPayout((p) => (p.kind === "setup" ? { ...p, sending: true, error: null } : p));
    const r = await call("POST", "/api/events/payouts/setup-link", {});
    if (!r) return;
    const url = r.status === 200 && r.body?.success ? stripeUrl(r.body.url) : null;
    if (url) { window.location.assign(url); return; }
    const message = r.status === 200 && r.body?.success ? GENERIC_ERROR : errorCopy(r.status, r.body);
    setPayout({ kind: "setup", canStart: true, sending: false, error: message });
    if (screen === "review") setPublishError({ message, next: null });
  }

  /* ---------- agreement and publish ---------- */

  const loadAgreement = useCallback(async () => {
    setAgreement(null);
    setAgreementError(null);
    setRead(false);
    const r = await call("GET", "/api/events/host-agreement");
    if (!r) return;
    const a = r.status === 200 && r.body?.success ? toAgreement(r.body.agreement) : null;
    if (!a) { setAgreementError(errorCopy(r.status, r.body)); return; }
    setAgreement(a);
  }, [call]);


  async function accept() {
    if (!agreement || accepting || !read) return;
    setAccepting(true);
    setAgreementNotice(null);
    const r = await call("POST", "/api/events/host-agreement/accept", { version: agreement.version });
    setAccepting(false);
    if (!r) return;
    if (r.status === 409 && r.body?.code === "AGREEMENT_VERSION_CHANGED") {
      setAgreementNotice(publishFailure(r.status, r.body).message);
      await loadAgreement();
      return;
    }
    const a = r.status === 200 && r.body?.success ? toAgreement(r.body.agreement) : null;
    if (!a || !a.accepted) { setAgreementNotice(errorCopy(r.status, r.body)); return; }
    setAgreement(a);
  }

  async function publish() {
    if (!eventId || busy || !agreement?.accepted) return;
    setBusy(true);
    setPublishError(null);
    setNotice(null);
    const r = await call("POST", `/api/events/${eventId}/publish`);
    setBusy(false);
    if (!r) return;
    if (r.status === 200 && r.body?.success && isHostEvent(r.body.event)) {
      applyServer(r.body.event, r.body.ticketTypes);
      go("live");
      return;
    }
    const pf = publishFailure(r.status, r.body);
    if (pf.next === "agreement") {
      // Not accepted for the current version: show the agreement again.
      setAgreementNotice(pf.message);
      await loadAgreement();
      return;
    }
    setPublishError({ message: pf.message, next: pf.next });
  }

  async function runNext(n: PublishNext) {
    // A full load gives a fresh editor (a client navigation could keep this one's state).
    if (n === "new") window.location.assign("/events/new");
    else if (n === "tickets") go("tickets");
    else if (n === "payouts") await startPayouts();
    else if (n === "manage" && eventId) router.push(`/events/${eventId}/manage`);
    else if (n === "reload" && eventId) {
      setPublishError(null);
      await loadEvent(eventId);
      await loadAgreement();
    }
  }

  /* ---------- render ---------- */

  const page = (children: React.ReactNode) => <HostShell>{children}</HostShell>;

  const messages = (
    <>
      {error && <p className="ed-err" role="alert">{error}</p>}
      {notice && <p className="ed-ok" role="status">{notice}</p>}
    </>
  );

  if (screen === "loading") return page(<div className="ed-muted" role="status">Loading…</div>);

  if (screen === "error") {
    return page(
      <div className="ed-card-msg" role="alert">
        <h1 className="ed-h1">EVENTS</h1>
        <p className="ed-text">{loadError ?? GENERIC_ERROR}</p>
        <div className="ed-row-actions">
          <button type="button" className="ed-primary ed-auto" onClick={load}>Try again</button>
          <Link href="/events/mine" className="ed-link">Your events</Link>
        </div>
      </div>,
    );
  }

  if (screen === "start") {
    const startCover = safeHttpUrl(form.coverImageUrl);
    return page(
      <>
        <div className="ed-top">
          <Link href="/events" className="ed-icon-btn" aria-label="Close"><CloseIcon /></Link>
          <div className="ed-top-title"><h1 className="ed-top-h">Create Event</h1></div>
          <div className="ed-icon-spacer" />
        </div>
        <div className="ed-body ed-stack">
          <label className={`ed-cover-tile${startCover ? " has" : ""}`}>
            {startCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={startCover} alt="" className="ed-cover-img" />
            ) : (
              <span className="ed-cover-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
              </span>
            )}
            <span className="ed-cover-title">{uploading ? "Uploading…" : startCover ? "Change cover photo" : "Add a cover photo"}</span>
            <span className="ed-hint ed-cover-sub">This is what people see in Discover. You can change it later.</span>
            <input type="file" accept="image/*" className="ed-hidden-file" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadCover(f); }} />
          </label>
          {messages}
          {drafts.length > 0 && (
            <div className="ed-stack-sm">
              <div className="ed-label">YOUR DRAFTS</div>
              {drafts.map((d) => (
                <Link key={d.id} href={`/events/${d.id}/edit`} className="ed-draft">
                  <span className="ed-draft-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {safeHttpUrl(d.coverImageUrl) ? <img src={d.coverImageUrl as string} alt="" /> : null}
                  </span>
                  <span className="ed-draft-main">
                    <span className="ed-strong">{d.title}</span>
                    <span className="ed-hint">Draft · {fmt(d.startsAt, d.timezone, { weekday: "short", month: "short", day: "numeric" })}</span>
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="ed-foot">
          <button type="button" className="ed-primary" onClick={() => go("details")} disabled={uploading}>Next</button>
        </div>
      </>,
    );
  }

  if (screen === "live" && event) {
    return page(
      <>
        <div className="ed-top">
          <Link href="/events/mine" className="ed-icon-btn" aria-label="Close"><CloseIcon /></Link>
        </div>
        <LiveStep event={event} form={form} types={types} />
      </>,
    );
  }

  const step = screen as Step;
  const meta = STEPS[step];
  const published = !!event && event.status !== "draft";
  const back =
    step === "details"
      ? routeId ? <Link href="/events/mine" className="ed-icon-btn" aria-label="Back to your events"><BackIcon /></Link>
        : <button type="button" className="ed-icon-btn" aria-label="Back" onClick={() => go("start")}><BackIcon /></button>
      : <button type="button" className="ed-icon-btn" aria-label="Back" onClick={() => go(step === "review" ? "tickets" : "details")}><BackIcon /></button>;

  return page(
    <>
      <div className="ed-top">
        {back}
        <div className="ed-top-title">
          <h1 className="ed-top-h">{meta.title}</h1>
          <div className="ed-hint">Step {meta.n} of 3</div>
        </div>
        {step !== "review" ? (
          <button type="button" className="ed-top-action" onClick={saveDraft} disabled={busy || uploading}>
            {published ? "Save" : "Save draft"}
          </button>
        ) : <div className="ed-icon-spacer" />}
      </div>
      <div className="ed-progress" aria-hidden="true"><div style={{ width: `${(meta.n / 3) * 100}%` }} /></div>

      <div className="ed-body">
        {step === "details" && (
          <DetailsStep form={form} setForm={editForm} hosts={hosts} hostLocked={!!eventId} startLocked={startLocked}
            uploading={uploading} onPickCover={uploadCover} />
        )}
        {step === "tickets" && event && (
          <TicketsStep event={event} types={types} form={form} setForm={editForm} payout={hasPaid ? payout : { kind: "none" }} onStartPayouts={startPayouts}
            onAdd={() => setSheet({ initial: emptySheet(false), editing: null })}
            onEdit={(t) => setSheet({ initial: sheetFromType(t, event.timezone), editing: t })}
            onRemove={removeType} removingId={removingId} />
        )}
        {step === "review" && event && (
          <ReviewStep event={event} types={types} form={form} onEdit={(s) => go(s)}
            agreement={agreement} agreementError={agreementError} agreementNotice={agreementNotice}
            read={read} setRead={setRead} accepting={accepting} onAccept={accept} onRetryAgreement={loadAgreement} />
        )}
      </div>

      <div className="ed-foot">
        {messages}
        {publishError && (
          <div className="ed-stack-sm" role="alert">
            <p className="ed-err">{publishError.message}</p>
            {publishError.next === "payouts" && event && event.hostType !== "user" && (
              <p className="ed-hint">{profilePayoutNote(event.hostType)}</p>
            )}
            {nextStepLabel(publishError.next) && !(publishError.next === "payouts" && event?.hostType !== "user") && (
              <button type="button" className="ed-secondary" onClick={() => runNext(publishError.next)}>
                {nextStepLabel(publishError.next)}
              </button>
            )}
          </div>
        )}
        {step === "details" && (
          <button type="button" className="ed-primary" onClick={() => next("tickets")} disabled={busy || uploading}>
            {busy ? "Saving…" : "Next: tickets"}
          </button>
        )}
        {step === "tickets" && (
          <button type="button" className="ed-primary" onClick={() => next("review")} disabled={busy}>
            {busy ? "Saving…" : "Next: review"}
          </button>
        )}
        {step === "review" && !published && (
          <>
            <button type="button" className="ed-primary" onClick={publish} disabled={busy || !agreement?.accepted}>
              {busy ? "Publishing…" : "Publish event"}
            </button>
            <button type="button" className="ed-ghost" onClick={saveDraft} disabled={busy}>Save as draft</button>
          </>
        )}
        {step === "review" && published && event && (
          <div className="ed-live-actions">
            <Link href={`/e/${event.slug}`} className="ed-outline">View event</Link>
            <Link href={`/events/${event.id}/manage`} className="ed-outline">Manage event</Link>
          </div>
        )}
      </div>

      {sheet && event && (
        <TicketTypeSheet initial={sheet.initial} editing={sheet.editing}
          others={activeTypes(types).filter((t) => t.id !== sheet.editing?.id)}
          timezone={event.timezone} onSave={saveType} onClose={closeSheet} />
      )}
    </>,
  );
}
