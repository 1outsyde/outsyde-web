"use client";

// Admin → Emails → History → Push (?tab=history&view=push, &push=<id> opens one push send).
// Every push sent from the Push tab (outsyde-backend #368: push_sends + push_log): announcements and tests,
// newest first, then one send with every recipient account and what happened to its push.
// Shown inside HistoryTab as a third view next to By send and By person; the email views are unchanged.
//
// BFFs: GET /api/admin/push/sends?limit&before, GET /api/admin/push/sends/:id.
// Copy follows the house style: plain punctuation, no dashes.

import { useCallback, useEffect, useState } from "react";
import { AUDIENCE_LABEL, OFFLINE, ROLE_LABEL, api, errorText, when } from "./shared";

interface PushSendRow {
  id: string; kind: string; audience: string; title: string; body: string; screen: string | null; url: string | null;
  status: string; recipientCount: number; sentCount: number; failedCount: number; skippedCount: number;
  createdByName: string | null; createdAt: string; finishedAt: string | null; receiptsCheckedAt: string | null;
}
interface PushRecipientRow { userId: string | null; name: string | null; role: string | null; status: string; error: string | null; sentAt: string | null }
interface Screen { key: string; label: string }

const PAGE = 50;
const POLL_MS = 2000;

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Waiting", cls: "" },
  sending: { label: "Sending", cls: "em-tag-gold" },
  sent: { label: "Sent", cls: "em-tag-green" },
  failed: { label: "Failed", cls: "em-tag-red" },
  skipped: { label: "Skipped", cls: "" },
  unknown: { label: "Maybe sent", cls: "em-tag-gold" },
  done: { label: "Done", cls: "em-tag-green" },
};

/** Plain words for the codes the backend stores in push_log.error. */
const REASON: Record<string, string> = {
  duplicate_device: "Same phone as another account, that account got the push",
  no_longer_eligible: "Turned off news and offers or the account changed",
  no_token: "No phone set up for notifications",
  invalid_token: "Phone address not valid",
  DeviceNotRegistered: "App removed or notifications turned off on the phone",
  MessageTooBig: "Message too long for Expo",
  MessageRateExceeded: "Expo slowed this phone down",
  InvalidCredentials: "Expo credentials problem",
  send_error: "Expo couldn't be reached",
  server_restarted: "Server restarted while sending",
  not_sent: "Not sent",
};

function Status({ value }: { value: string }) {
  const s = STATUS[value] ?? { label: value, cls: "" };
  return <span className={`em-tag ${s.cls}`}>{s.label}</span>;
}

function counts(s: PushSendRow): string {
  const parts = [`${s.sentCount} sent`];
  if (s.failedCount) parts.push(`${s.failedCount} failed`);
  if (s.skippedCount) parts.push(`${s.skippedCount} skipped`);
  return `${parts.join(", ")} of ${s.recipientCount}`;
}

export default function PushHistory({
  openId,
  onOpen,
  onAuth,
}: {
  openId: string | null;
  onOpen: (id: string | null) => void;
  onAuth: (status: number) => boolean;
}) {
  const [sends, setSends] = useState<PushSendRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detail, setDetail] = useState<{ send: PushSendRow; recipients: PushRecipientRow[] } | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);

  const screenLabel = (s: PushSendRow) =>
    s.screen === "link" ? (s.url ?? "A link") : screens.find((x) => x.key === s.screen)?.label ?? s.screen ?? "Activity";

  const loadSends = useCallback(async (before?: string) => {
    const qs = new URLSearchParams({ limit: String(PAGE) });
    if (before) qs.set("before", before);
    const r = await api<{ sends?: PushSendRow[] }>(`/api/admin/push/sends?${qs}`);
    if (onAuth(r.status)) return;
    if (!r.ok) {
      setListError(r.status === 0 ? OFFLINE : errorText(r.data, `Couldn't load the push history (${r.status}).`));
      setSends((prev) => prev ?? []);
      return;
    }
    const rows = Array.isArray(r.data?.sends) ? r.data!.sends! : [];
    setSends((prev) => (before && prev ? [...prev, ...rows] : rows));
    setMore(rows.length === PAGE);
    setListError(null);
  }, [onAuth]);

  const loadDetail = useCallback(async (id: string) => {
    const r = await api<{ send?: PushSendRow; recipients?: PushRecipientRow[] }>(`/api/admin/push/sends/${encodeURIComponent(id)}`);
    if (onAuth(r.status)) return;
    if (!r.ok || !r.data?.send) {
      setDetailError(r.status === 404 ? "This push wasn't found." : r.status === 0 ? OFFLINE : errorText(r.data, `Couldn't load this push (${r.status}).`));
      return;
    }
    setDetail({ send: r.data.send, recipients: Array.isArray(r.data.recipients) ? r.data.recipients : [] });
    setDetailError(null);
  }, [onAuth]);

  useEffect(() => {
    // Screen names for the list (the same list the Push tab uses). Only sets state after the request.
    let off = false;
    api<{ screens?: Screen[] }>("/api/admin/push/screens").then((r) => {
      if (!off && r.ok && Array.isArray(r.data?.screens)) setScreens(r.data!.screens!);
    });
    return () => { off = true; };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!openId) loadSends();
  }, [openId, loadSends]);

  useEffect(() => {
    if (!openId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDetail(openId);
  }, [openId, loadDetail]);

  const running = !!openId && detail?.send.id === openId && detail.send.status === "sending";
  useEffect(() => {
    if (!running || !openId) return;
    const t = setInterval(() => loadDetail(openId), POLL_MS);
    return () => clearInterval(t);
  }, [running, openId, loadDetail]);

  function close() {
    setDetail(null);
    setDetailError(null);
    onOpen(null);
  }

  if (openId) {
    const s = detail?.send.id === openId ? detail.send : null;
    return (
      <>
        <button className="em-btn em-btn-ghost em-btn-small" onClick={close} style={{ marginBottom: 16 }}>Back to push history</button>
        {detailError ? (
          <div className="em-banner em-banner-err" role="alert">{detailError}</div>
        ) : !s || !detail ? (
          <div className="em-state"><div className="em-state-title">Loading</div></div>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span className={`em-tag ${s.kind === "test" ? "em-tag-blue" : "em-tag-gold"}`}>{s.kind === "test" ? "Test push" : "Push"}</span>
              <Status value={s.status} />
            </div>
            <div className="em-h2" style={{ marginTop: 10 }}>{s.title}</div>
            <div className="em-row-meta" style={{ marginTop: 0, marginBottom: 6, fontSize: 13.5 }}>{s.body}</div>
            <dl className="em-kv">
              <dt>Started</dt><dd>{when(s.createdAt)}</dd>
              {s.finishedAt && (<><dt>Finished</dt><dd>{when(s.finishedAt)}</dd></>)}
              <dt>Sent by</dt><dd>{s.createdByName || "Unknown"}</dd>
              <dt>Audience</dt><dd>{s.kind === "test" ? "Your phone" : AUDIENCE_LABEL[s.audience] ?? s.audience}</dd>
              <dt>Opens</dt><dd>{screenLabel(s)}</dd>
              <dt>Result</dt><dd>{counts(s)}</dd>
              <dt>Receipts</dt><dd>{s.receiptsCheckedAt ? `Checked ${when(s.receiptsCheckedAt)}` : "Checked about 15 minutes after sending"}</dd>
            </dl>
            {s.status === "sending" && (
              <div className="em-banner em-banner-info">
                Still sending. This page updates by itself.
                <div className="em-progress" aria-hidden="true">
                  <div style={{ width: `${s.recipientCount ? Math.round(((s.sentCount + s.failedCount + s.skippedCount) / s.recipientCount) * 100) : 0}%` }} />
                </div>
              </div>
            )}
            <span className="em-label">Recipients ({detail.recipients.length})</span>
            {detail.recipients.length === 0 ? (
              <div className="em-empty">No recipients were logged for this push.</div>
            ) : (
              detail.recipients.map((r, i) => (
                <div className="em-row" key={`${r.userId}-${i}`}>
                  <div className="em-row-main">
                    <div className="em-row-title">{r.name?.trim() || "Unknown account"}</div>
                    <div className="em-row-meta">
                      {r.role ? <span className="em-tag">{ROLE_LABEL[r.role] ?? r.role}</span> : null}
                      {r.error ? <span style={{ color: r.status === "failed" ? "#ff6b6b" : "rgba(245,240,230,0.55)" }}>{REASON[r.error] ?? r.error}</span> : null}
                    </div>
                  </div>
                  <div className="em-row-side">
                    <Status value={r.status} />
                    {r.sentAt && <div>{when(r.sentAt)}</div>}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </>
    );
  }

  if (sends === null) return <div className="em-state"><div className="em-state-title">Loading</div></div>;

  return (
    <>
      {listError && <div className="em-banner em-banner-err" role="alert">{listError}</div>}
      {sends.length === 0 && !listError ? (
        <div className="em-empty">No pushes have been sent yet.</div>
      ) : (
        sends.map((s) => (
          <div
            key={s.id}
            className="em-row click"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(s.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(s.id); } }}
          >
            <div className="em-row-main">
              <div className="em-row-title">{s.title}</div>
              <div className="em-row-meta">
                <span className={`em-tag ${s.kind === "test" ? "em-tag-blue" : "em-tag-gold"}`}>{s.kind === "test" ? "Test" : "Push"}</span>
                {s.status !== "done" && <Status value={s.status} />}
                {when(s.createdAt)}
                {s.kind === "test" ? " · Your phone" : AUDIENCE_LABEL[s.audience] ? ` · ${AUDIENCE_LABEL[s.audience]}` : ""}
                {` · opens ${screenLabel(s)}`}
                {s.createdByName ? ` · by ${s.createdByName}` : ""}
              </div>
            </div>
            <div className="em-row-side">{counts(s)}</div>
          </div>
        ))
      )}
      {more && (
        <button
          className="em-btn em-btn-ghost"
          style={{ marginTop: 8 }}
          disabled={loadingMore}
          onClick={async () => {
            setLoadingMore(true);
            await loadSends(sends[sends.length - 1]?.createdAt);
            setLoadingMore(false);
          }}
        >
          {loadingMore ? "Loading" : "Load older pushes"}
        </button>
      )}
    </>
  );
}
