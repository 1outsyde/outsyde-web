"use client";

/**
 * The door scanner (mockups 14 and 15). Camera through getUserMedia, frames drawn to a canvas about 9 times a
 * second and decoded with jsQR (loaded only here, on demand). Manual code entry is always there.
 * Access: GET /door/guests answers 404 for anyone who isn't the host or on the door team. The role (for Undo,
 * host only) and the event times come from GET /door/mine.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { HostShell, useHostApi } from "../../_host/hostApi";
import { MANAGE_CSS } from "../../_host/manageStyles";
import { backendMessage, guestLine, guestName, isDoorGuest, type DoorGuest } from "../../_host/manageLogic";
import { isHostEvent } from "../../_host/editorLogic";
import { isDoorEvent, scanWindowNote, timeOnly, type DoorEvent } from "../../_host/doorLogic";
import { browserZone, errorCopy, GENERIC_ERROR, startLine } from "../../../e/_shared/format";
import {
  CODE_LENGTH, LAST_SCAN_COLOR, TONE_BG, cleanTyped, filterGuests, invalidCodeResult, lastScanLabel, makeRecent,
  progressPct, qrToCode, replaceGuest, resultFor, scanKey, undoneResult, type ScanResult,
} from "./scanLogic";

type Screen = "loading" | "ready" | "notfound" | "error";
type Cam = "off" | "starting" | "on" | "denied" | "missing" | "insecure" | "unsupported" | "failed";
type JsQR = typeof import("jsqr").default;

const CAM_MESSAGE: Partial<Record<Cam, string>> = {
  denied: "Camera access is blocked. Allow the camera for this site in your browser settings, or type the ticket code below.",
  missing: "No camera found on this device. Type the ticket code below.",
  insecure: "The camera only works on a secure (https) page. Type the ticket code below.",
  unsupported: "This browser can't use the camera. Type the ticket code below.",
  failed: "The camera couldn't start. Try again, or type the ticket code below.",
};

const DECODE_EVERY_MS = 110; // about 9 decodes a second
const MAX_SIDE = 640; // frames are scaled down before decoding
const LAST_SCANS = 5;

const SCAN_CSS = `
.sc-head { display: flex; align-items: center; gap: 4px; padding: 8px 12px 0; min-height: 60px; }
.sc-head-mid { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; text-align: center; }
.sc-head-h { font-size: 17px; font-weight: 700; margin: 0; }
.sc-head-sub { font-size: 12px; color: #A0A0A0; overflow-wrap: anywhere; }
.sc-body { padding: 10px 16px 32px; display: flex; flex-direction: column; gap: 14px; }
.sc-count { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; margin-bottom: 6px; }
.sc-cam { position: relative; width: 100%; aspect-ratio: 3 / 4; max-height: 62vh; border-radius: 22px; background: #1A1F1D; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.sc-cam video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.sc-frame { position: absolute; width: min(230px, 62%); aspect-ratio: 1; top: 50%; left: 50%; transform: translate(-50%, -55%); pointer-events: none; }
.sc-frame i { position: absolute; width: 44px; height: 44px; border: 0 solid #E8B930; }
.sc-frame i:nth-child(1) { top: 0; left: 0; border-top-width: 4px; border-left-width: 4px; border-radius: 14px 0 0 0; }
.sc-frame i:nth-child(2) { top: 0; right: 0; border-top-width: 4px; border-right-width: 4px; border-radius: 0 14px 0 0; }
.sc-frame i:nth-child(3) { bottom: 0; left: 0; border-bottom-width: 4px; border-left-width: 4px; border-radius: 0 0 0 14px; }
.sc-frame i:nth-child(4) { bottom: 0; right: 0; border-bottom-width: 4px; border-right-width: 4px; border-radius: 0 0 14px 0; }
.sc-cam-hint { position: absolute; bottom: 18px; left: 12px; right: 12px; text-align: center; color: #F5F0E6; font-size: 14px; font-weight: 600; text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
.sc-cam-off { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; text-align: center; color: #CFC7B8; font-size: 14px; line-height: 1.45; max-width: 320px; }
.sc-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.sc-btn { min-height: 50px; border-radius: 25px; border: 1px solid #38383A; background: #1C1C1E; color: #F5F0E6; font: 600 14px 'Hanken Grotesk', sans-serif; cursor: pointer; padding: 0 10px; }
.sc-btn.on { border-color: #E8B930; }
.sc-code { letter-spacing: 2px; font-weight: 700; text-transform: uppercase; }
.sc-row { display: flex; gap: 8px; }
.sc-row > .ed-in { flex: 1 1 auto; min-width: 0; }
.sc-last { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; }
.sc-last > :first-child { min-width: 0; overflow-wrap: anywhere; }
.sc-last > :last-child { font-weight: 700; flex: 0 0 auto; }
.sc-result { border-radius: 26px; min-height: 52vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 28px 20px; text-align: center; color: #FFF; }
.sc-result-icon { width: 96px; height: 96px; border-radius: 48px; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; }
.sc-result-title { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 44px; line-height: 1; margin: 0; }
.sc-result-who { font-size: 17px; font-weight: 700; overflow-wrap: anywhere; }
.sc-result-detail { font-size: 14px; color: rgba(255,255,255,0.88); max-width: 300px; line-height: 1.4; margin: 0; }
.sc-guest-side { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
`;

const noSubscribe = () => () => {};
/** "ok" when getUserMedia can be tried here. The server render says "ok"; the client knows better. */
function cameraSupport(): "ok" | "insecure" | "unsupported" {
  if (!window.isSecureContext) return "insecure";
  return typeof navigator.mediaDevices?.getUserMedia === "function" ? "ok" : "unsupported";
}

function ResultIcon({ tone }: { tone: ScanResult["tone"] }) {
  if (tone === "ok") return <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>;
  if (tone === "warn") return <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></svg>;
  return <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;
}

export default function Scanner({ eventId }: { eventId: string }) {
  const { call } = useHostApi();
  const [screen, setScreen] = useState<Screen>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guests, setGuests] = useState<DoorGuest[]>([]);
  // From /door/mine, or for the host from /manage when /door/mine doesn't list the event (ended, not published).
  const [info, setInfo] = useState<(DoorEvent & { status?: string }) | null>(null);
  const [notListed, setNotListed] = useState(false); // /door/mine loaded and this event isn't in it
  const [view, setView] = useState<"scan" | "list">("scan");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ key: string; r: ScanResult }[]>([]);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [typedNote, setTypedNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [cam, setCam] = useState<Cam>("off");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const lastDecodeRef = useRef(0);
  const jsqrRef = useRef<JsQR | null>(null);
  const wantCamRef = useRef(false); // the person turned the camera on (resume when the tab is visible again)
  const mountedRef = useRef(true);
  const pausedRef = useRef(true); // no decoding while a result shows, a request or an undo runs, or the list is open
  const resultRef = useRef<ScanResult | null>(null); // the card on screen now (an undo answer is checked against it)
  const recentRef = useRef(makeRecent());
  const seqRef = useRef(0);
  const onDecodedRef = useRef<(text: string) => void>(() => {});

  const support = useSyncExternalStore(noSubscribe, cameraSupport, () => "ok" as const);
  const isHost = info?.role === "host";
  // Times use the event's zone. Without event details (a team member on an event /door/mine no longer lists) the
  // browser's zone is used and the page says so.
  const inBrowserZone = !info;
  const tz = info?.timezone ?? browserZone();

  /* ---------- data ---------- */

  const loadGuests = useCallback(async (): Promise<boolean> => {
    const g = await call("GET", `/api/events/${eventId}/door/guests`);
    if (!g) return false;
    if (g.status === 404) { setScreen("notfound"); return false; }
    if (g.status !== 200 || !g.body?.success || !Array.isArray(g.body.guests)) {
      setListError(errorCopy(g.status, g.body));
      return false;
    }
    setListError(null);
    setGuests((g.body.guests as unknown[]).filter(isDoorGuest));
    return true;
  }, [call, eventId]);

  const load = useCallback(async () => {
    setScreen("loading");
    setLoadError(null);
    setCam((c) => (c === "on" || c === "starting" ? "off" : c)); // the camera stops while not ready (effect below)
    const [g, m] = await Promise.all([
      call("GET", `/api/events/${eventId}/door/guests`),
      call("GET", "/api/events/door/mine"),
    ]);
    if (!g || !m) return;
    if (g.status === 404) { setScreen("notfound"); return; }
    if (g.status !== 200 || !g.body?.success || !Array.isArray(g.body.guests)) {
      setLoadError(errorCopy(g.status, g.body));
      setScreen("error");
      return;
    }
    setGuests((g.body.guests as unknown[]).filter(isDoorGuest));
    // /door/mine lists published events that haven't ended. Missing here means check in is over (or the list failed):
    // the page still works, without Undo, and the backend answers every check in.
    const listed = m.status === 200 && Array.isArray(m.body?.events);
    const mine = listed ? (m.body.events as unknown[]).filter(isDoorEvent) : [];
    let found: (DoorEvent & { status?: string }) | null = mine.find((e) => e.id === eventId) ?? null;
    if (!found) {
      // Not listed, or the list failed: the host can still be told apart through /manage (404 for anyone else).
      const h = await call("GET", `/api/events/${eventId}/manage`);
      if (!h) return;
      if (h.status === 200 && isHostEvent(h.body?.event)) {
        const e = h.body.event;
        found = { id: e.id, slug: e.slug, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt, timezone: e.timezone, role: "host", status: e.status };
      }
    }
    setInfo(found);
    setNotListed(listed && !found);
    setScreen("ready");
  }, [call, eventId]);

  useEffect(() => { load(); }, [load]);

  /* ---------- check in ---------- */

  const show = useCallback((r: ScanResult) => {
    pausedRef.current = true;
    resultRef.current = r;
    setResult(r);
    setNotice(null);
    setUndoError(null);
    const key = scanKey(r, Date.now(), ++seqRef.current);
    setLast((l) => [{ key, r }, ...l].slice(0, LAST_SCANS));
    if (r.ticket) setGuests((gs) => replaceGuest(gs, r.ticket as DoorGuest));
  }, []);

  /** Sends one check in. False when the same key was sent less than 3 seconds ago (nothing sent). */
  const send = useCallback(async (key: string, path: string, body: Record<string, string>): Promise<boolean> => {
    if (!recentRef.current.allow(key, Date.now())) return false;
    pausedRef.current = true;
    setBusy(true);
    const r = await call("POST", `/api/events/${eventId}/door/${path}`, body);
    setBusy(false);
    if (!r) return true; // signed out: already on the way to /login
    show(resultFor(r.status, r.body, tz));
    return true;
  }, [call, eventId, show, tz]);

  const onDecoded = useCallback((text: string) => {
    if (busy || result) return;
    const code = qrToCode(text);
    if (!code) {
      // Not a ticket code: say so without calling the backend, once per 3 seconds for the same QR.
      if (recentRef.current.allow(`qr:${text}`, Date.now())) show(invalidCodeResult());
      return;
    }
    void send(code, "check-in", { code });
  }, [busy, result, send, show]);

  useEffect(() => { onDecodedRef.current = onDecoded; }, [onDecoded]);
  useEffect(() => { pausedRef.current = busy || !!result || !!undoing || view !== "scan"; }, [busy, result, undoing, view]);

  async function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setTypedNote(null);
    const code = qrToCode(typed);
    if (!code) { show(invalidCodeResult()); return; }
    const sent = await send(code, "check-in", { code });
    if (!sent) setTypedNote("That code was just sent. Wait a few seconds to try it again.");
    else setTyped("");
  }

  async function checkInGuest(g: DoorGuest) {
    if (busy) return;
    await send(`id:${g.ticketId}`, "check-in-ticket", { ticketId: g.ticketId });
  }

  async function undo(t: DoorGuest) {
    if (!isHost || undoing) return;
    pausedRef.current = true;
    const card = resultRef.current; // the card the undo was pressed on (null from the guest list)
    setUndoing(t.ticketId);
    setUndoError(null);
    const r = await call("POST", `/api/events/${eventId}/door/undo`, { ticketId: t.ticketId });
    setUndoing(null);
    if (!r) return;
    if (r.status !== 200 || !r.body?.success || !isDoorGuest(r.body.ticket)) { setUndoError(backendMessage(r.status, r.body)); return; }
    const t2 = r.body.ticket as DoorGuest;
    // Read the card on screen now (a ref, not this render's closure): only that same card becomes "Check in undone".
    if (card && resultRef.current === card && card.ticket?.ticketId === t2.ticketId) {
      // Undo from the result card: keep a card up (scanning stays paused) so the ticket still in front of the
      // camera isn't checked straight back in. Scanning resumes on Scan next.
      show(undoneResult(t2));
    } else {
      setGuests((gs) => replaceGuest(gs, t2));
      setNotice(`Check in undone for ${guestName(t2)}.`);
    }
  }

  function next() {
    if (undoing) return; // the undo answer belongs to this card
    resultRef.current = null;
    setResult(null);
    setUndoError(null);
    const v = videoRef.current;
    if (v && streamRef.current && v.paused) v.play().catch(() => {});
  }

  /* ---------- camera ---------- */

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const tickRef = useRef<() => void>(() => {});
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => tickRef.current());
    const now = performance.now();
    if (now - lastDecodeRef.current < DECODE_EVERY_MS) return;
    lastDecodeRef.current = now;
    const v = videoRef.current;
    const jsqr = jsqrRef.current;
    if (pausedRef.current || !v || !jsqr || v.readyState < 2 || !v.videoWidth || !v.videoHeight) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const qr = jsqr(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
    if (qr && qr.data) onDecodedRef.current(qr.data);
  }, []);
  useEffect(() => { tickRef.current = tick; }, [tick]);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    if (!window.isSecureContext) { setCam("insecure"); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setCam("unsupported"); return; }
    setCam("starting");
    try {
      if (!jsqrRef.current) jsqrRef.current = (await import("jsqr")).default;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (!mountedRef.current || document.hidden || streamRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        if (mountedRef.current && !streamRef.current) setCam("off");
        return;
      }
      streamRef.current = stream;
      const v = videoRef.current;
      if (!v) { stopCamera(); setCam("failed"); return; }
      v.srcObject = stream;
      await v.play().catch(() => {});
      setCam("on");
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      stopCamera();
      wantCamRef.current = false;
      const name = (err as { name?: string } | null)?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") setCam("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") setCam("missing");
      else setCam("failed");
    }
  }, [stopCamera, tick]);

  // Stop on unmount and when the tab is hidden; resume when visible again if the person had the camera on.
  useEffect(() => {
    mountedRef.current = true;
    const onVisibility = () => {
      if (document.hidden) {
        if (streamRef.current) { stopCamera(); setCam("off"); }
      } else if (wantCamRef.current) {
        void startCamera();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Access lost (a later guest list answered 404) or a reload: the video goes away, so the stream must too.
  useEffect(() => {
    if (screen !== "ready") { wantCamRef.current = false; stopCamera(); }
  }, [screen, stopCamera]);

  function turnOn() {
    wantCamRef.current = true;
    void startCamera();
  }

  /* ---------- render ---------- */

  const shown = useMemo(() => filterGuests(guests, query), [guests, query]);
  const checkedIn = guests.filter((g) => !!g.checkedInAt).length;
  const windowNote = info ? scanWindowNote(info) : notListed ? "Check in isn't open for this event right now." : null;
  // What this browser can do is known before the person taps Start camera (manual entry opens when there's no camera).
  const camState: Cam = cam === "off" && support !== "ok" ? support : cam;
  const camMessage = CAM_MESSAGE[camState];
  const manualOpen = typing || !!camMessage;
  const backHref = isHost ? `/events/${eventId}/manage` : "/events/door";

  const page = (inner: React.ReactNode) => <HostShell css={MANAGE_CSS + SCAN_CSS}>{inner}</HostShell>;

  if (screen === "loading") return page(<div className="ed-muted" role="status">Loading…</div>);

  if (screen === "notfound") {
    return page(
      <div className="ed-card-msg" role="alert" data-testid="not-found">
        <h1 className="ed-h1">EVENT NOT FOUND</h1>
        <p className="ed-text">Event not found. Only the host and their door team can scan tickets for an event.</p>
        <Link href="/events/door" className="ed-primary ed-auto">Events you can scan</Link>
      </div>,
    );
  }

  if (screen === "error") {
    return page(
      <div className="ed-card-msg" role="alert">
        <h1 className="ed-h1">CHECK IN</h1>
        <p className="ed-text">{loadError ?? GENERIC_ERROR}</p>
        <div className="ed-row-actions">
          <button type="button" className="ed-primary ed-auto" onClick={load}>Try again</button>
          <Link href="/events/door" className="ed-link">Events you can scan</Link>
        </div>
      </div>,
    );
  }

  return page(
    <>
      <header className="sc-head">
        <Link href={backHref} className="ed-icon-btn" aria-label="Close scanner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Link>
        <div className="sc-head-mid">
          <h1 className="sc-head-h">Check in</h1>
          {info && <div className="sc-head-sub" data-testid="scan-event">{info.title} · {startLine(info)}</div>}
        </div>
        <div className="ed-icon-spacer" />
      </header>

      <div className="sc-body">
        <div>
          <div className="sc-count">
            <div style={{ fontWeight: 700 }} data-testid="counter">{checkedIn} checked in</div>
            <div style={{ color: "#A0A0A0" }}>of {guests.length} {guests.length === 1 ? "ticket" : "tickets"}</div>
          </div>
          <div className="mg-bar" role="img" aria-label={`${checkedIn} of ${guests.length} checked in`}><div style={{ width: `${progressPct(checkedIn, guests.length)}%` }} /></div>
        </div>

        {inBrowserZone && <div className="ed-hint" data-testid="zone-note">Times are shown in your time zone.</div>}
        {windowNote && <div className="ed-banner" role="status" data-testid="window-note">{windowNote}</div>}
        {notice && <p className="ed-ok" role="status">{notice}</p>}

        {result && (
          <section className="ed-stack" aria-live="assertive" data-testid="result" data-outcome={result.outcome}>
            <div className="sc-result" style={{ background: TONE_BG[result.tone] }}>
              <div className="sc-result-icon"><ResultIcon tone={result.tone} /></div>
              <h2 className="sc-result-title" data-testid="result-title">{result.title}</h2>
              {result.who && <div className="sc-result-who">{result.who}</div>}
              <p className="sc-result-detail">{result.detail}</p>
            </div>
            {undoError && <p className="ed-err" role="alert">{undoError}</p>}
            <button type="button" className="ed-primary" style={{ minHeight: 54 }} onClick={next} disabled={!!undoing} autoFocus>
              {view === "list" ? "Back to guest list" : "Scan next"}
            </button>
            {isHost && result.outcome === "CHECKED_IN" && result.ticket && (
              <button type="button" className="ed-ghost" disabled={!!undoing} onClick={() => undo(result.ticket as DoorGuest)}>
                {undoing ? "Undoing…" : "Undo check in"}
              </button>
            )}
          </section>
        )}

        {/* The camera stays mounted (hidden) under a result or the guest list so the stream isn't torn down. */}
        <div style={{ display: !result && view === "scan" ? "contents" : "none" }}>
          <div className="sc-cam" aria-label="Camera view, point at a ticket QR code" data-testid="camera" data-state={camState}>
            <video ref={videoRef} playsInline muted autoPlay aria-hidden="true" style={{ visibility: camState === "on" ? "visible" : "hidden" }} />
            {camState === "on" && (
              <>
                <div className="sc-frame" aria-hidden="true"><i /><i /><i /><i /></div>
                <div className="sc-cam-hint">Point the camera at a ticket QR code</div>
              </>
            )}
            {camState !== "on" && (
              <div className="sc-cam-off">
                {camMessage ? (
                  <p style={{ margin: 0 }} role="alert" data-testid="camera-message">{camMessage}</p>
                ) : (
                  <p style={{ margin: 0 }}>Turn on the camera to scan the QR code on each guest&apos;s ticket.</p>
                )}
                {(camState === "off" || camState === "starting" || camState === "failed" || camState === "denied") && (
                  <button type="button" className="ed-pill" style={{ alignSelf: "center", padding: "0 22px" }} disabled={camState === "starting"} onClick={turnOn}>
                    {camState === "starting" ? "Starting camera…" : camState === "off" ? "Start camera" : "Try the camera again"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {!result && (
          <div className="sc-two">
            <button type="button" className={`sc-btn${view === "scan" && manualOpen ? " on" : ""}`} aria-expanded={view === "scan" && manualOpen}
              onClick={() => { setView("scan"); setTyping((t) => (view === "scan" ? !t : true)); }}>
              {view === "list" ? "Scan" : "Type a code"}
            </button>
            <button type="button" className={`sc-btn${view === "list" ? " on" : ""}`} onClick={() => { setView("list"); void loadGuests(); }}>Guest list</button>
          </div>
        )}

        {!result && view === "scan" && manualOpen && (
          <form className="ed-stack-sm" onSubmit={submitTyped} data-testid="manual">
            <label htmlFor="sc-code" className="ed-label">TICKET CODE</label>
            <div className="sc-row">
              <input id="sc-code" className="ed-in sc-code" value={typed} inputMode="text" autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false}
                maxLength={CODE_LENGTH} placeholder="16 letters and numbers" onChange={(e) => { setTyped(cleanTyped(e.target.value)); setTypedNote(null); }} />
              <button type="submit" className="ed-pill" style={{ alignSelf: "stretch" }} disabled={busy || typed.length !== CODE_LENGTH}>{busy ? "Checking…" : "Check in"}</button>
            </div>
            <div className="ed-hint">The code is under the QR code on the guest&apos;s ticket.</div>
            {typedNote && <div className="ed-hint ed-warn" role="status">{typedNote}</div>}
          </form>
        )}

        {!result && view === "scan" && last.length > 0 && (
          <section className="ed-stack-sm" aria-label="Last scans">
            <h2 className="mg-section">LAST SCANS</h2>
            {last.map(({ key, r }) => (
              <div key={key} className="sc-last">
                <div>{r.who || r.detail}</div>
                <div style={{ color: LAST_SCAN_COLOR[r.tone] }}>{lastScanLabel(r)}</div>
              </div>
            ))}
          </section>
        )}

        {!result && view === "list" && (
          <section className="ed-stack-sm" aria-label="Guest list" data-testid="guest-list">
            <label htmlFor="sc-search" className="ed-label">SEARCH GUESTS</label>
            <input id="sc-search" className="ed-in" type="search" value={query} placeholder="Name, @username or ticket type" autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
            {listError && (
              <p className="ed-err" role="alert">{listError} <button type="button" className="ed-textbtn ed-inline-btn" onClick={() => loadGuests()}>Try again</button></p>
            )}
            {undoError && <p className="ed-err" role="alert">{undoError}</p>}
            {guests.length === 0 && !listError && <div className="mg-sub">No guests yet.</div>}
            {guests.length > 0 && shown.length === 0 && <div className="mg-sub">No guests match that search.</div>}
            <ul className="mg-list">
              {shown.map((g) => (
                <li key={g.ticketId} className="mg-li" data-testid="scan-guest">
                  <div className="mg-li-main">
                    <div className="mg-li-name">{guestName(g)}</div>
                    <div className="mg-li-sub">{guestLine(g)}</div>
                  </div>
                  <div className="sc-guest-side">
                    {g.checkedInAt ? (
                      <>
                        <span className="mg-in">In {timeOnly(g.checkedInAt, tz)}</span>
                        {isHost && (
                          <button type="button" className="mg-small" disabled={!!undoing} onClick={() => undo(g)}>{undoing === g.ticketId ? "Undoing…" : "Undo"}</button>
                        )}
                      </>
                    ) : (
                      <button type="button" className="mg-small" disabled={busy} onClick={() => checkInGuest(g)}>Check in</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>,
  );
}
