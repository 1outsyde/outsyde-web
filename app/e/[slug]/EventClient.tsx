"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckoutHost } from "./Checkout";
import type { EventPayload, TicketType } from "./types";
import { GENERIC_ERROR, errorCopy, fmt, maxQty, minQty, clampQty, money, newKey, rangeLine, revealLine } from "../_shared/format";
import { hasStarted } from "./checkoutLogic";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-stores";
import QuickAuthSheet, { type QuickPurpose } from "./QuickAuthSheet";
import AppGetBlock from "./AppGetBlock";
import { pendingReturnPath, type Pending, type QuickMode } from "./quickAuthLogic";
import { browserStorage, readRef, rememberRefFromUrl, withLinkCode } from "./promoterRef";

const whenLine = rangeLine;

function statusText(t: TicketType, tz: string): string {
  switch (t.salesStatus) {
    case "on_sale": {
      const left = typeof t.remaining === "number" && t.remaining <= 10 ? `${t.remaining} left` : "";
      const price = t.priceCents === 0 ? "Free" : money(t.priceCents);
      return left ? `${price} · ${left}` : price;
    }
    case "upcoming":
      return t.salesStartAt ? `On sale ${fmt(t.salesStartAt, tz, { month: "short", day: "numeric" })}` : "Not on sale yet";
    case "ended":
      return "Sales ended";
    case "sold_out":
      return "Sold out";
    case "locked":
      return "Opens when the tier before sells out";
    default:
      return "";
  }
}

/** Light signed in probe: true, false (401), or null when it can't tell. */
async function probeSignedIn(): Promise<boolean | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (res.status === 401) return false;
    if (res.ok) return true;
  } catch {
    /* unknown */
  }
  return null;
}

/* ---------- component ---------- */

type Phase = "ready" | "loading" | "notfound" | "error";

export default function EventClient({ slug, initial }: { slug: string; initial: EventPayload | null }) {
  const router = useRouter();
  const [data, setData] = useState<EventPayload | null>(initial);
  const [phase, setPhase] = useState<Phase>(initial ? "ready" : "loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [going, setGoing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followMsg, setFollowMsg] = useState("");
  const [toast, setToast] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const keyRef = useRef<string | null>(null);
  const ticketsRef = useRef<HTMLDivElement | null>(null);
  const preselected = useRef(false);
  // Quick sign up / log in sheet (p4-quicksignup): what to do once the person is signed in.
  const [authSheet, setAuthSheet] = useState<{ pending: Pending; mode: QuickMode } | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  // Bumped after the sheet signs someone in, so the follow check runs again with the new cookie.
  const [authVersion, setAuthVersion] = useState(0);
  const probingRef = useRef(false);
  const [newAccountEmail, setNewAccountEmail] = useState<string | null>(null);

  const load = useCallback(async (): Promise<EventPayload | null> => {
    try {
      const res = await fetch(`/api/events/slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (res.status === 404) {
        setData(null);
        setPhase("notfound");
        return null;
      }
      const body = await res.json().catch(() => null);
      if (res.ok && body?.event) {
        const next = { event: body.event, ticketTypes: body.ticketTypes ?? [] };
        setData(next);
        setPhase("ready");
        return next;
      }
    } catch {
      /* fall through */
    }
    setPhase((p) => (p === "ready" ? p : "error"));
    return null;
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const e = data?.event ?? null;

  // Event team step 3: a promoter link (`?ref=`) is saved for this event when the page opens, because later steps
  // (checkout, the sign in sheet, /login, /claim) drop the query. The last link opened wins; kept 7 days.
  const eventId = e?.id ?? null;
  useEffect(() => {
    if (!eventId) return;
    try { rememberRefFromUrl(browserStorage(), eventId, window.location.search, Date.now()); } catch { /* never breaks the page */ }
  }, [eventId]);
  const followTarget = e && !e.viewerIsHost ? e.host.followId ?? null : null;

  // Follow state doubles as the signed-in probe: 401 means signed out.
  useEffect(() => {
    if (!followTarget) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/account/follow/${encodeURIComponent(followTarget)}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          setSignedIn(false);
          return;
        }
        if (res.ok) {
          const body = await res.json().catch(() => null);
          setSignedIn(true);
          setFollowing(body?.isFollowing === true);
          return;
        }
      } catch {
        /* fall back below */
      }
      // The follow check didn't settle it (backend error, odd id): ask /api/auth/me instead.
      const me = await probeSignedIn();
      if (!cancelled && me !== null) setSignedIn(me);
    })();
    return () => {
      cancelled = true;
    };
  }, [followTarget, authVersion]);

  // No follow target (host has no follow id, or the viewer is the host): the light /api/auth/me probe decides.
  const eventLoaded = !!e;
  useEffect(() => {
    if (!eventLoaded || followTarget) return;
    let cancelled = false;
    (async () => {
      const me = await probeSignedIn();
      if (!cancelled && me !== null) setSignedIn(me);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventLoaded, followTarget]);
  const types = useMemo(() => data?.ticketTypes ?? [], [data]);
  const onSale = useMemo(() => types.filter((t) => t.salesStatus === "on_sale"), [types]);
  const selected = onSale.find((t) => t.id === selectedId) ?? (onSale.length === 1 ? onSale[0] : null);

  // Coming back from login after a signed out RSVP: preselect the type and quantity, never submit.
  useEffect(() => {
    if (preselected.current || !data) return;
    preselected.current = true;
    let sp: URLSearchParams;
    try { sp = new URLSearchParams(window.location.search); } catch { return; }
    const id = sp.get("rsvp");
    if (!id) return;
    const t = data.ticketTypes.find((x) => x.id === id && x.salesStatus === "on_sale" && x.priceCents === 0);
    if (!t) return;
    const n = Number(sp.get("qty"));
    setSelectedId(t.id);
    setQty(clampQty(t, Number.isInteger(n) && n > 0 ? n : 1));
  }, [data]);

  // Keep the quantity inside the selected type's limits.
  useEffect(() => {
    if (!selected) return;
    setQty((q) => clampQty(selected, q));
  }, [selected]);

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.origin + `/e/${slug}` : `/e/${slug}`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: e?.title, url });
        return;
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } catch {
      showToast(url);
    }
  }

  function openAuth(pending: Pending, mode: QuickMode = "signup") {
    setSheetKey((k) => k + 1);
    setAuthSheet({ pending, mode });
  }

  async function toggleFollow(afterAuth = false) {
    const id = e?.host.followId;
    if (!id || followBusy) return;
    if (signedIn === false && !afterAuth) {
      openAuth({ kind: "follow" });
      return;
    }
    setFollowBusy(true);
    setFollowMsg("");
    try {
      const res = await fetch(`/api/account/follow/${encodeURIComponent(id)}`, { method: following ? "DELETE" : "POST" });
      if (res.status === 401) {
        setSignedIn(false);
        openAuth({ kind: "follow" });
        return;
      }
      if (res.ok) {
        setFollowing(!following);
      } else {
        const body = await res.json().catch(() => null);
        setFollowMsg(res.status === 403 && typeof body?.error === "string" ? body.error : GENERIC_ERROR);
      }
    } catch {
      setFollowMsg(GENERIC_ERROR);
    } finally {
      setFollowBusy(false);
    }
  }

  async function rsvp(t: TicketType, count: number = qty, afterAuth = false) {
    if (!e || busy) return;
    if (signedIn === false && !afterAuth) {
      openAuth({ kind: "rsvp", typeId: t.id, qty: count });
      return;
    }
    setBusy(true);
    setMsg("");
    if (!keyRef.current) keyRef.current = newKey();
    try {
      const res = await fetch(`/api/events/${e.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withLinkCode({ ticketTypeId: t.id, quantity: count, idempotencyKey: keyRef.current }, readRef(browserStorage(), e.id, Date.now()))),
      });
      if (res.status === 401) {
        // Signed out or the token expired: the sheet signs them in, then the same RSVP (same key) is sent.
        setSignedIn(false);
        openAuth({ kind: "rsvp", typeId: t.id, qty: count });
        return;
      }
      const body = await res.json().catch(() => null);
      if (res.ok) {
        keyRef.current = null;
        setGoing(true);
        load();
      } else {
        setMsg(errorCopy(res.status, body));
      }
    } catch {
      setMsg(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function getTickets() {
    if (!selected) {
      ticketsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setMsg("Choose a ticket first.");
      return;
    }
    if (selected.priceCents === 0) {
      rsvp(selected);
      return;
    }
    // Signed in state not known yet (probe still running): ask once, so a signed out tap opens the sheet.
    if (signedIn === null && probingRef.current) return;
    probingRef.current = signedIn === null;
    let known: boolean | null;
    try {
      known = signedIn ?? (await probeSignedIn());
    } finally {
      probingRef.current = false;
    }
    if (known !== null && known !== signedIn) setSignedIn(known);
    if (known === false) {
      openAuth({ kind: "checkout", typeId: selected.id, qty });
      return;
    }
    router.push(checkoutPathFor(selected.id, qty));
  }

  function checkoutPathFor(typeId: string, count: number) {
    return `/e/${slug}?checkout=${encodeURIComponent(typeId)}&qty=${count}`;
  }

  async function onAuthDone(r: { email: string; created: boolean }) {
    const pending = authSheet?.pending ?? null;
    setAuthSheet(null);
    setSignedIn(true);
    if (r.created) setNewAccountEmail(r.email);
    // Refresh what depends on who is signed in (holder, host, follow state), like the old /login round trip did.
    setAuthVersion((v) => v + 1);
    const refreshed = pending?.kind === "checkout" ? (void load(), null) : await load();
    if (!pending) return;
    if (pending.kind === "checkout") {
      router.push(checkoutPathFor(pending.typeId, pending.qty));
    } else if (pending.kind === "rsvp") {
      const t = (refreshed?.ticketTypes ?? types).find((x) => x.id === pending.typeId);
      if (t) void rsvp(t, pending.qty, true);
    } else {
      // Skip the follow for the host themselves or someone who already follows.
      if (refreshed?.event.viewerIsHost) return;
      const id = refreshed?.event.host.followId ?? e?.host.followId;
      if (!id) return;
      try {
        const res = await fetch(`/api/account/follow/${encodeURIComponent(id)}`, { cache: "no-store" });
        const body = res.ok ? await res.json().catch(() => null) : null;
        if (body?.isFollowing === true) {
          setFollowing(true);
          return;
        }
      } catch {
        /* fall through to the follow */
      }
      void toggleFollow(true);
    }
  }

  function pick(t: TicketType) {
    if (t.salesStatus !== "on_sale") return;
    setSelectedId(t.id);
    setQty(minQty(t));
    setMsg("");
    keyRef.current = null;
  }

  function changeQty(next: number) {
    setQty(next);
    keyRef.current = null;
  }

  /* ---------- derived ---------- */
  const ended = e ? new Date(e.endsAt).getTime() < Date.now() : false;
  const started = e ? hasStarted(e, Date.now()) : false;
  const cancelled = e?.status === "cancelled";
  const draft = e?.status === "draft";
  const canBuy = !!e && !cancelled && !draft && !started && onSale.length > 0;
  const paidOnSale = onSale.filter((t) => t.priceCents > 0 && t.buyerTotalCents != null);
  const lowest = paidOnSale.length ? Math.min(...paidOnSale.map((t) => t.buyerTotalCents as number)) : null;
  const hasFreeOnSale = onSale.some((t) => t.priceCents === 0);
  const holderOnlyFree = !!e?.viewerHasTicket && onSale.every((t) => t.priceCents === 0);
  const showBar = canBuy && !going && !holderOnlyFree;
  const sheetPurpose: QuickPurpose = authSheet?.pending.kind ?? "checkout";

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    body { background: #0B0B0B; color: #F5F0E6; font-family: 'Hanken Grotesk', system-ui, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; }
    a { color: #E8B930; text-decoration: none; }
    a:hover { color: #F5D26B; }
    .ev-wrap { max-width: 680px; margin: 0 auto; padding-bottom: 120px; min-height: 100vh; background: #0B0B0B; }
    /* The whole 4:5 flyer (photo ratios 3c): full width on phones; wider screens show it up to
       480 wide, centered over a blurred copy of itself. */
    .ev-cover { position: relative; width: 100%; aspect-ratio: 4 / 5; background: #1A3C34; display: flex; align-items: center; justify-content: center; color: #9FC2B5; font-size: 13px; overflow: hidden; }
    .ev-cover .ev-flyer { position: relative; width: 100%; height: 100%; object-fit: cover; display: block; }
    .ev-cover .ev-cover-bg { display: none; }
    @media (min-width: 520px) {
      .ev-cover { aspect-ratio: auto; height: 600px; }
      .ev-cover .ev-flyer { width: auto; height: 100%; aspect-ratio: 4 / 5; max-width: 100%; }
      .ev-cover .ev-cover-bg { display: block; position: absolute; inset: -40px; width: calc(100% + 80px); height: calc(100% + 80px); object-fit: cover; filter: blur(32px) brightness(0.6); }
    }
    .ev-round { position: absolute; top: 16px; width: 44px; height: 44px; border-radius: 22px; border: 0; background: #0B0B0B; color: #F5F0E6; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; }
    .ev-round:hover { color: #E8B930; }
    .ev-body { padding: 18px 20px 0; display: flex; flex-direction: column; gap: 16px; }
    .ev-when { font-size: 13px; font-weight: 700; color: #E8B930; letter-spacing: 0.5px; }
    .ev-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; line-height: 1; margin: 6px 0 0; font-weight: 400; overflow-wrap: anywhere; }
    .ev-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .ev-host { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .ev-avatar { width: 40px; height: 40px; border-radius: 20px; background: #3A3A3A; flex-shrink: 0; object-fit: cover; }
    .ev-btn-outline { height: 36px; padding: 0 16px; border-radius: 18px; border: 1px solid #F5F0E6; background: transparent; color: #F5F0E6; font: 600 13px 'Hanken Grotesk', sans-serif; cursor: pointer; flex-shrink: 0; }
    .ev-btn-outline:disabled { opacity: 0.6; cursor: default; }
    .ev-card { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 12px 14px; display: flex; gap: 12px; align-items: flex-start; }
    .ev-app { border-color: #1A3C34; background: #10241F; }
    .ev-app-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
    .ev-app-link { min-height: 44px; padding: 0 16px; border-radius: 22px; background: #1A3C34; color: #F5F0E6; display: inline-flex; align-items: center; font-size: 14px; font-weight: 600; }
    .ev-app-link:hover { background: #224d43; color: #F5F0E6; }
    .ev-label { font-size: 12px; font-weight: 700; color: #B8B0A0; letter-spacing: 1px; }
    .ev-trow { width: 100%; text-align: left; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border: 0; border-bottom: 1px solid #1F1F1F; background: transparent; color: #F5F0E6; font-family: inherit; cursor: pointer; min-height: 44px; }
    .ev-trow[disabled] { cursor: default; }
    .ev-pick { width: 18px; height: 18px; border-radius: 9px; border: 2px solid #5A5A5A; flex-shrink: 0; }
    .ev-pick.on { border-color: #E8B930; background: radial-gradient(#E8B930 45%, transparent 50%); }
    .ev-desc { font-size: 14px; line-height: 1.55; color: #CFC7B8; white-space: pre-wrap; overflow-wrap: anywhere; }
    .ev-muted { font-size: 12px; color: #B8B0A0; }
    .ev-banner { padding: 12px 20px; font-size: 14px; font-weight: 600; }
    .ev-bar { position: fixed; left: 0; right: 0; bottom: 0; background: #0B0B0B; border-top: 1px solid #1F1F1F; z-index: 150; }
    .ev-bar-in { max-width: 680px; margin: 0 auto; padding: 14px 20px 22px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .ev-cta { height: 52px; padding: 0 28px; border-radius: 26px; background: #E8B930; color: #0B0B0B; font-weight: 700; font-size: 16px; border: 0; font-family: inherit; cursor: pointer; }
    .ev-cta:disabled { opacity: 0.6; cursor: default; }
    .ev-step { display: flex; align-items: center; justify-content: center; padding: 0; width: 44px; height: 44px; border-radius: 22px; border: 1px solid #3A3A3A; background: transparent; color: #F5F0E6; font-size: 20px; cursor: pointer; font-family: inherit; }
    .ev-step:disabled { opacity: 0.35; cursor: default; }
    .ev-err { font-size: 13px; color: #ff8a80; }
    .ev-toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: 110px; background: #F5F0E6; color: #0B0B0B; padding: 10px 18px; border-radius: 20px; font-size: 14px; font-weight: 600; z-index: 300; }
    .ev-center { max-width: 680px; margin: 0 auto; padding: 96px 20px; text-align: center; color: #B8B0A0; }
  `;
  const fonts = <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />;

  if (!e) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {fonts}
        <div className="ev-center" role="status">
          {phase === "notfound" ? (
            <>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontWeight: 400, fontSize: 36, color: "#F5F0E6", margin: "0 0 12px" }}>Event not found</h1>
              <p style={{ margin: "0 0 20px" }}>This event may have been removed or the link is wrong.</p>
              <Link href="/">Go home</Link>
            </>
          ) : phase === "error" ? (
            <>
              <p style={{ margin: "0 0 16px" }}>{GENERIC_ERROR}</p>
              <button className="ev-btn-outline" onClick={() => { setPhase("loading"); load(); }}>Try again</button>
            </>
          ) : (
            <p>Loading</p>
          )}
        </div>
      </>
    );
  }

  const place = [e.city, e.state].filter(Boolean).join(", ");
  const streetLines = [e.addressLine1, e.addressLine2].filter(Boolean).join(", ");
  const cityLine = [[e.city, e.state].filter(Boolean).join(", "), e.postalCode].filter(Boolean).join(" ");
  const mapQuery = [e.venueName, e.addressLine1, e.addressLine2, e.city, e.state, e.postalCode].filter(Boolean).join(", ");
  const showFollow = !e.viewerIsHost && !!e.host.followId;
  const refundLine =
    e.refundPolicy === "no_refunds"
      ? "No refunds."
      : e.refundCutoffHours == null
        ? "Refunds until the event starts."
        : `Refunds until ${e.refundCutoffHours} hours before the event.`;
  const unitTotal = selected ? (selected.priceCents === 0 ? 0 : (selected.buyerTotalCents ?? selected.priceCents)) : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {fonts}
      <div className="ev-wrap">
        {draft && <div className="ev-banner" style={{ background: "#3A2F0B", color: "#E8B930" }}>Draft preview. Only you can see this page.</div>}
        {cancelled && <div className="ev-banner" style={{ background: "#3B1414", color: "#ff8a80" }}>This event was cancelled.</div>}

        <div className="ev-cover">
          {e.coverImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> as elsewhere on events; covers come from many hosts */}
              <img className="ev-cover-bg" src={e.coverImageUrl} alt="" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element -- same flyer, shown whole */}
              <img className="ev-flyer" src={e.coverImageUrl} alt="" />
            </>
          ) : null}
          <Link href="/" aria-label="Back" className="ev-round" style={{ left: 16, color: "#F5F0E6" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <button type="button" aria-label="Share" className="ev-round" style={{ right: 16 }} onClick={share}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="M7 8l5-5 5 5" /><path d="M5 14v5h14v-5" /></svg>
          </button>
        </div>

        <div className="ev-body">
          <div>
            <div className="ev-when">{whenLine(e)}</div>
            <h1 className="ev-title">{e.title}</h1>
          </div>

          <div className="ev-row">
            <div className="ev-host">
              {e.host.avatarUrl ? <img className="ev-avatar" src={e.host.avatarUrl} alt="" /> : <div className="ev-avatar" />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{e.host.name}</div>
                <div className="ev-muted">Host</div>
              </div>
            </div>
            {showFollow && (
              <button type="button" className="ev-btn-outline" onClick={() => toggleFollow()} disabled={followBusy} aria-pressed={following}>
                {following ? "Following" : "Follow"}
              </button>
            )}
          </div>
          {followMsg && <div className="ev-err" role="alert">{followMsg}</div>}

          {(e.viewerHasTicket || going) && (
            <div className="ev-card" style={{ borderColor: "#1A3C34", background: "#10241F" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>You're going</div>
                <div className="ev-muted"><Link href="/tickets">View your tickets</Link></div>
              </div>
            </div>
          )}
          {going && <AppGetBlock newAccountEmail={newAccountEmail} />}

          <div className="ev-card">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8B930" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              {e.addressHidden ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{place || "Location to be announced"}</div>
                  <div className="ev-muted">
                    {e.addressRevealAt ? `${revealLine(e.addressRevealAt, e.timezone)}.` : "The exact address is shared once you have a ticket."}
                  </div>
                </>
              ) : (
                <>
                  {e.venueName && <div style={{ fontSize: 14, fontWeight: 600 }}>{e.venueName}</div>}
                  {streetLines && <div style={{ fontSize: 13, color: "#CFC7B8" }}>{streetLines}</div>}
                  {cityLine && <div style={{ fontSize: 13, color: "#CFC7B8" }}>{cityLine}</div>}
                  {!e.venueName && !streetLines && !cityLine && <div style={{ fontSize: 14, fontWeight: 600 }}>Location to be announced</div>}
                  {mapQuery && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                      Directions
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          <div ref={ticketsRef} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="ev-label">TICKETS</div>
            {types.length === 0 && <div className="ev-muted" style={{ padding: "10px 0" }}>No tickets are available yet.</div>}
            {types.map((t) => {
              const can = t.salesStatus === "on_sale" && canBuy;
              const isSel = selected?.id === t.id;
              return (
                <div key={t.id}>
                  <button type="button" className="ev-trow" disabled={!can} onClick={() => pick(t)} aria-pressed={isSel}>
                    <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      {can && onSale.length > 1 && <span className={`ev-pick${isSel ? " on" : ""}`} aria-hidden="true" />}
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: t.salesStatus === "on_sale" ? 600 : 400, color: t.salesStatus === "on_sale" ? "#F5F0E6" : "#8F887B", overflowWrap: "anywhere" }}>{t.name}</span>
                        {t.description && <span style={{ display: "block", fontSize: 12, color: "#B8B0A0", marginTop: 2 }}>{t.description}</span>}
                      </span>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: t.salesStatus === "on_sale" ? 600 : 400, color: t.salesStatus === "on_sale" ? "#F5F0E6" : "#8F887B", textAlign: "right", flexShrink: 0 }}>
                      {statusText(t, e.timezone)}
                    </span>
                  </button>
                  {isSel && can && !going && (
                    <div style={{ padding: "12px 0 6px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <button type="button" className="ev-step" aria-label="Fewer tickets" disabled={qty <= minQty(t)} onClick={() => changeQty(qty - 1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg></button>
                        <span style={{ minWidth: 24, textAlign: "center", fontSize: 18, fontWeight: 700 }} aria-live="polite">{qty}</span>
                        <button type="button" className="ev-step" aria-label="More tickets" disabled={qty >= maxQty(t)} onClick={() => changeQty(qty + 1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
                      </div>
                      {t.priceCents > 0 && (
                        <div className="ev-muted">
                          {qty} x {money(t.priceCents)}
                          {t.serviceFeeCents != null ? `, service fee ${money(t.serviceFeeCents * qty)}` : ""}
                          {`. Total ${money(unitTotal * qty)}.`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {msg && <div className="ev-err" role="alert" style={{ paddingTop: 6 }}>{msg}</div>}
          </div>

          {e.description && <div className="ev-desc">{e.description}</div>}
          {ended && !cancelled && <div className="ev-muted">This event has ended.</div>}
          {started && !ended && !cancelled && !draft && <div className="ev-muted">This event has started.</div>}
          <div className="ev-muted">{refundLine}</div>

          {!going && <div className="ev-card ev-app" data-testid="get-the-app">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Get the Outsyde app</div>
              <div className="ev-muted">Faster checkout and all your tickets in one place.</div>
              <div className="ev-app-links">
                <a className="ev-app-link" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Download on the App Store</a>
                <a className="ev-app-link" href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Get it on Google Play</a>
              </div>
            </div>
          </div>}
        </div>

        {showBar && (
          <div className="ev-bar">
            <div className="ev-bar-in">
              <div>
                {selected ? (
                  <>
                    <div className="ev-muted">{qty > 1 ? `${qty} tickets` : "Total"}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.priceCents === 0 ? "Free" : money(unitTotal * qty)}</div>
                  </>
                ) : lowest != null ? (
                  <>
                    <div className="ev-muted">From</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{money(lowest)}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{hasFreeOnSale ? "Free" : ""}</div>
                )}
              </div>
              <button type="button" className="ev-cta" onClick={getTickets} disabled={busy}>
                {busy ? "Working" : selected && selected.priceCents === 0 ? "RSVP" : "Get tickets"}
              </button>
            </div>
          </div>
        )}
        <Suspense fallback={null}>
          <CheckoutHost slug={slug} event={e} ticketTypes={types} onPaid={load} newAccountEmail={newAccountEmail} />
        </Suspense>
        {authSheet && (
          <QuickAuthSheet
            key={sheetKey}
            open
            initialMode={authSheet.mode}
            purpose={sheetPurpose}
            returnPath={pendingReturnPath(slug, authSheet.pending)}
            onClose={() => setAuthSheet(null)}
            onDone={onAuthDone}
          />
        )}
        {toast && <div className="ev-toast" role="status">{toast}</div>}
      </div>
    </>
  );
}
