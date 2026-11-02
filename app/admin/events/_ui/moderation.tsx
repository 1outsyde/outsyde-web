"use client";
/**
 * p5-safety: one moderation button with its own reason box and confirm step, used by the Reports tab and the Safety
 * box on one event. First click opens the box (reason, what will happen, Confirm and Cancel); only Confirm sends.
 */
import { useId, useState } from "react";
import { REASON_MAX, reasonError } from "../_lib/moderation";

export type ModTone = "gold" | "green" | "ghost" | "red";
export type SendResult = { ok: true } | { ok: false; text: string };

/** POST JSON to a BFF route. 401 / 403 come back as auth so the page can show its sign in screen. Never throws. */
export async function postModeration(url: string, body: unknown): Promise<{ ok: true } | { ok: false; auth: "unauthorized" | "forbidden" } | { ok: false; auth?: undefined; status: number; body: unknown }> {
  try {
    const res = await fetch(url, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, auth: "unauthorized" };
    if (res.status === 403) return { ok: false, auth: "forbidden" };
    return { ok: false, status: res.status, body: await res.json().catch(() => null) };
  } catch {
    return { ok: false, status: 0, body: { error: "Couldn't reach the server. Refresh to see where this stands before trying again." } };
  }
}

export function ModerationButton(props: {
  label: string;
  tone: ModTone;
  confirm: string;
  /** Required by default. Optional fields (a trust note) pass false. */
  reasonRequired?: boolean;
  fieldLabel?: string;
  disabled?: boolean;
  onSend: (reason: string) => Promise<SendResult | null>;
  testId?: string;
}) {
  const { label, tone, confirm, reasonRequired = true, fieldLabel = "Reason", disabled, onSend, testId } = props;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fieldId = useId();

  async function send() {
    const problem = reasonRequired ? reasonError(reason) : reason.trim().length > REASON_MAX ? `Keep it under ${REASON_MAX} characters.` : null;
    if (problem) { setErr(problem); return; }
    setBusy(true);
    setErr(null);
    const r = await onSend(reason.trim());
    setBusy(false);
    // null: the page took over (signed out, or it reloaded with a notice). ok: close and clear.
    if (!r) return;
    if (r.ok) { setOpen(false); setReason(""); return; }
    setErr(r.text);
  }

  if (!open) {
    return (
      <button type="button" className={`aem-btn aem-btn-${tone}`} disabled={disabled} onClick={() => { setOpen(true); setErr(null); }} data-testid={testId}>
        {label}
      </button>
    );
  }
  return (
    <div className="aem-mod" data-testid={testId ? `${testId}-open` : undefined}>
      <div className="aem-mod-what">{confirm}</div>
      <label className="aem-mod-label" htmlFor={fieldId}>{fieldLabel}{reasonRequired ? "" : " (optional)"}</label>
      <textarea
        id={fieldId}
        className="aem-textarea"
        rows={3}
        maxLength={REASON_MAX}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={busy}
        autoFocus
      />
      <div className="aem-mod-foot">
        <span className="aem-mod-count">{reason.trim().length} / {REASON_MAX}</span>
        <div className="aem-actions">
          <button type="button" className={`aem-btn aem-btn-${tone}`} disabled={busy} onClick={send}>{busy ? "Working…" : `Confirm: ${label}`}</button>
          <button type="button" className="aem-btn aem-btn-ghost" disabled={busy} onClick={() => { setOpen(false); setErr(null); }}>Cancel</button>
        </div>
      </div>
      {err ? <div className="aem-mod-err" role="alert">{err}</div> : null}
    </div>
  );
}
