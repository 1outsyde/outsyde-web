"use client";
/**
 * p5-safety W9: the Report this event sheet. Six reasons, a note (needed for Something else, up to 500), Send.
 * Sends POST /api/events/:id/report through the BFF. A signed out tap never reaches here: the page opens the quick
 * sign up sheet first. A 401 here (token expired) asks the page to sign in again.
 */
import { useEffect, useId, useRef, useState } from "react";
import { GENERIC_ERROR } from "../_shared/format";
import {
  REPORT_COPY,
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  reportBody,
  reportErrorCopy,
  reportFormError,
  type ReportReasonId,
} from "./reportLogic";

export default function ReportSheet({ eventId, onClose, onSent, onSignedOut }: {
  eventId: string;
  onClose: () => void;
  onSent: (message: string) => void;
  onSignedOut: () => void;
}) {
  const [reason, setReason] = useState<ReportReasonId | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const noteId = useId();

  // Focus the first reason when the sheet opens.
  useEffect(() => {
    const t = setTimeout(() => sheetRef.current?.querySelector<HTMLInputElement>("input[type=radio]")?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  function close() {
    if (!busy) onClose();
  }

  function trapTab(ev: React.KeyboardEvent) {
    if (ev.key !== "Tab" || !sheetRef.current) return;
    const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled])"));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (ev.shiftKey && (active === first || !sheetRef.current.contains(active))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && (active === last || !sheetRef.current.contains(active))) { ev.preventDefault(); first.focus(); }
  }

  async function send(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    const problem = reportFormError(reason, note);
    if (problem || !reason) { setErr(problem ?? REPORT_COPY.pick); return; }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportBody(reason, note)),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 401) { setBusy(false); onSignedOut(); return; }
      if (res.ok && body?.success) { setBusy(false); onSent(REPORT_COPY.thanks); return; }
      setErr(reportErrorCopy(res.status, body));
    } catch {
      setErr(GENERIC_ERROR);
    }
    setBusy(false);
  }

  const other = reason === "other";
  return (
    <div className="rp-root" onKeyDown={(ev) => { if (ev.key === "Escape") { ev.stopPropagation(); close(); } else trapTab(ev); }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .rp-root { position: fixed; inset: 0; z-index: 350; }
        .rp-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.55); border: 0; padding: 0; width: 100%; cursor: default; }
        .rp-sheet { position: absolute; left: 0; right: 0; bottom: 0; margin: 0 auto; max-width: 520px; max-height: 92vh; overflow-y: auto; background: #141414; border-radius: 22px 22px 0 0; border-top: 1px solid #2A2A2A; padding: 20px 18px calc(26px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 12px; color: #F5F0E6; font-family: 'Hanken Grotesk', system-ui, sans-serif; box-sizing: border-box; }
        .rp-sheet *, .rp-sheet *::before, .rp-sheet *::after { box-sizing: border-box; }
        .rp-close { width: 44px; height: 44px; border: 0; background: transparent; color: #F5F0E6; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; flex-shrink: 0; }
        .rp-opt { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 14px; border: 1px solid #2A2A2A; border-radius: 12px; cursor: pointer; font-size: 15px; }
        .rp-opt:has(input:checked) { border-color: #E8B930; background: #1F1A0B; }
        .rp-opt input { accent-color: #E8B930; width: 18px; height: 18px; margin: 0; flex: none; }
        .rp-opt:focus-within { outline: 2px solid #E8B930; outline-offset: 2px; }
        .rp-label { font-size: 12px; font-weight: 700; color: #B8B0A0; letter-spacing: 1px; }
        .rp-note { width: 100%; min-height: 88px; resize: vertical; border-radius: 12px; border: 1px solid #2A2A2A; background: #0B0B0B; color: #F5F0E6; padding: 10px 12px; font: 500 16px 'Hanken Grotesk', sans-serif; }
        .rp-note:focus { outline: none; border-color: #E8B930; }
        .rp-count { font-size: 12px; color: #8A8478; text-align: right; margin-top: -6px; font-variant-numeric: tabular-nums; }
        .rp-err { font-size: 13px; color: #FF8A7A; }
        .rp-cta { height: 52px; border-radius: 26px; border: 0; background: #E8B930; color: #000; font: 700 16px 'Hanken Grotesk', sans-serif; margin-top: 4px; cursor: pointer; }
        .rp-cta:disabled { opacity: 0.6; cursor: default; }
      ` }} />
      <button type="button" className="rp-scrim" aria-label="Close" tabIndex={-1} onClick={close} />
      <div className="rp-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="rp-title" data-testid="report-sheet">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 id="rp-title" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{REPORT_COPY.title}</h2>
          <button type="button" className="rp-close" aria-label="Close" onClick={close} disabled={busy}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ fontSize: 13, color: "#B8B0A0", lineHeight: 1.45, marginTop: -6 }}>{REPORT_COPY.sub}</div>
        <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 10 }} noValidate>
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <legend className="rp-label" style={{ marginBottom: 8 }}>REASON</legend>
            {REPORT_REASONS.map((r) => (
              <label className="rp-opt" key={r.id}>
                <input type="radio" name="report-reason" value={r.id} checked={reason === r.id} onChange={() => { setReason(r.id); setErr(""); }} disabled={busy} />
                <span>{r.label}</span>
              </label>
            ))}
          </fieldset>
          <label className="rp-label" htmlFor={noteId} style={{ marginTop: 6 }}>{(other ? REPORT_COPY.noteLabelOther : `${REPORT_COPY.noteLabel} (optional)`).toUpperCase()}</label>
          <textarea id={noteId} className="rp-note" maxLength={REPORT_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} />
          <div className="rp-count">{note.trim().length} / {REPORT_NOTE_MAX}</div>
          {err ? <div className="rp-err" role="alert">{err}</div> : null}
          <button type="submit" className="rp-cta" disabled={busy}>{busy ? "Sending" : REPORT_COPY.send}</button>
        </form>
      </div>
    </div>
  );
}
