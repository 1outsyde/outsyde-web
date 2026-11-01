"use client";

/**
 * goutsyde.com/team/CODE (p4-team step 9-0, mockup G, calls 66 to 71): what an Event team invite link offers (host,
 * role, the event or all of the host's events, the pay) and Accept. Signed out, Accept opens quick sign up (new to
 * Outsyde, or log in) and accepts right after. Never shows who it was emailed to. Taken, cancelled or over links say so.
 * Step 9d-2: a link with pay shows the Event Team note. Signed in, it sits above one "Accept and join" (join first, then
 * the note: call 84). Signed out, the note can't load yet, so it shows right after they join, with its own I accept:
 * nobody accepts a note they haven't seen.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HostShell } from "../../events/_host/hostApi";
import { MANAGE_CSS } from "../../events/_host/manageStyles";
import { TEAM_CSS } from "../../events/_host/teamStyles";
import { backendMessage } from "../../events/_host/manageLogic";
import { GENERIC_ERROR } from "../../e/_shared/format";
import { cleanCode, isLinkPage, linkPageView, type LinkPage } from "../../events/_host/teamLinksLogic";
import QuickAuthSheet from "../../e/[slug]/QuickAuthSheet";
import TeamNoteCard from "../../events/_host/TeamNoteCard";
import { acceptLabel, isTeamNote, noteOnAccept, NOTE_SAVE_FAILED_HERE, payOffered, type TeamNote } from "../../events/_host/teamNoteLogic";

type Res = { status: number; body: any } | null; // eslint-disable-line @typescript-eslint/no-explicit-any

async function req(method: string, path: string, body: unknown = {}): Promise<Res> {
  try {
    const r = await fetch(path, { method, cache: "no-store", headers: method === "POST" ? { "Content-Type": "application/json" } : undefined, body: method === "POST" ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  } catch {
    return { status: 0, body: null };
  }
}

export default function TeamLinkClient({ code: raw }: { code: string }) {
  const code = cleanCode(raw);
  const [link, setLink] = useState<LinkPage | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(code ? "loading" : "missing");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const busyRef = useRef(false);
  // The Event Team note: null while signed out (it needs a sign in) or if it failed to load.
  const [note, setNote] = useState<TeamNote | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const loadNote = useCallback(async (): Promise<TeamNote | null> => {
    const r = await req("GET", "/api/events/team-note");
    const n = r && r.status === 200 && isTeamNote(r.body?.note) ? (r.body.note as TeamNote) : null;
    setNote(n);
    return n;
  }, []);

  /** Applies a GET answer (404 = no such link). */
  const apply = useCallback((r: Res) => {
    if (r && r.status === 404) { setState("missing"); return; }
    if (!r || r.status !== 200 || !isLinkPage(r.body?.link)) { setState("error"); return; }
    setLink(r.body.link);
    setState("ready");
  }, []);

  const load = useCallback(async () => {
    if (!code) return; // started as "missing"
    apply(await req("GET", `/api/events/team-links/${code}`));
  }, [code, apply]);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    req("GET", `/api/events/team-links/${code}`).then((r) => { if (alive) apply(r); });
    req("GET", "/api/events/team-note").then((r) => { if (alive && r && r.status === 200 && isTeamNote(r.body?.note)) setNote(r.body.note); });
    return () => { alive = false; };
  }, [code, apply]);

  /** Accept the note on its own (after joining, or when it couldn't be shown before). */
  async function acceptNote(n: TeamNote): Promise<boolean> {
    const r = await req("POST", "/api/events/team-note/accept", { version: n.version });
    if (r && r.status === 200 && isTeamNote(r.body?.note)) { setNote(r.body.note); return true; }
    return false;
  }
  const noteBusyRef = useRef(false);
  async function acceptNoteNow() {
    if (!note || noteBusyRef.current) return;
    noteBusyRef.current = true;
    setNoteBusy(true);
    setNoteErr(null);
    const ok = await acceptNote(note);
    noteBusyRef.current = false;
    setNoteBusy(false);
    if (ok) setErr(null); // the earlier "didn't save" message no longer applies
    else setNoteErr(GENERIC_ERROR);
  }

  async function accept() {
    if (!code || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setErr(null);
    // The note was on screen above "Accept and join" only if it had loaded (signed in) and the link offers pay.
    const shown = link ? noteOnAccept(link.pay, note) : false;
    const r = await req("POST", `/api/events/team-links/${code}/accept`);
    if (r && r.status === 200 && r.body?.success && shown && note) {
      // Call 84: joined first; a failed note save never undoes it.
      if (!(await acceptNote(note))) setErr(NOTE_SAVE_FAILED_HERE);
    }
    busyRef.current = false;
    setBusy(false);
    if (!r) return;
    if (r.status === 401) { setSheetKey((k) => k + 1); setSheet(true); return; }
    if (r.status === 200 && r.body?.success) {
      // Signed up or logged in just now: load the note, so it can be read and accepted on the joined screen.
      if (!shown) await loadNote();
      await load();
      return;
    }
    setErr(r.status === 0 ? GENERIC_ERROR : backendMessage(r.status, r.body));
    await load();
  }

  const page = (inner: React.ReactNode) => <HostShell css={MANAGE_CSS + TEAM_CSS}>{inner}</HostShell>;
  if (state === "loading") return page(<div className="ed-muted" role="status">Loading…</div>);
  if (state === "missing") {
    return page(
      <div className="ed-card-msg" role="alert" data-testid="link-missing">
        <h1 className="ed-h1">INVITE NOT FOUND</h1>
        <p className="ed-text">This link doesn&apos;t exist. Check it was copied in full, or ask the host for a new one.</p>
        <Link href="/events" className="ed-primary ed-auto">Browse events</Link>
      </div>,
    );
  }
  if (state === "error" || !link) {
    return page(
      <div className="ed-card-msg" role="alert">
        <h1 className="ed-h1">EVENT TEAM INVITE</h1>
        <p className="ed-text">{GENERIC_ERROR}</p>
        <button type="button" className="ed-primary ed-auto" onClick={() => { setState("loading"); load(); }}>Try again</button>
      </div>,
    );
  }

  const v = linkPageView(link);
  return page(
    <>
      <header className="ed-top">
        <div className="ed-icon-spacer" />
        <div className="ed-top-title"><h1 className="ed-top-h">Event team</h1></div>
        <div className="ed-icon-spacer" />
      </header>
      <div className="mg-body" data-testid="team-link" data-state={v.state}>
        <div className="ed-box" style={{ padding: 16, gap: 10 }}>
          <h2 className="ed-h1" style={{ fontSize: 26, lineHeight: 1.15 }} data-testid="link-headline">{v.headline}</h2>
          {v.what && <div className="ed-text" data-testid="link-what">{v.what}</div>}
          {link.scope === "standing" && link.upcoming.length > 0 && v.state !== "closed" && (
            <ul className="mg-sub" style={{ margin: 0, paddingLeft: 18 }} aria-label="Upcoming events">
              {link.upcoming.map((e) => <li key={e.id}>{e.title}</li>)}
            </ul>
          )}
          <p className="ed-text" data-testid="link-body">{v.body}</p>
        </div>
        {v.payLines.length > 0 && (
          <section className="ed-stack-sm" style={{ gap: 6 }} aria-label="Your pay" data-testid="link-pay">
            <h2 className="mg-section">YOUR PAY</h2>
            {v.payLines.map((l) => <div key={l.label} className="mg-trow"><span>{l.label}</span><b>{l.value}</b></div>)}
            {v.payNote && <div className="ed-hint">{v.payNote}</div>}
          </section>
        )}
        {v.canAccept && noteOnAccept(link.pay, note) && note && <TeamNoteCard note={note} testId="link-note" />}
        {v.state === "yours" && payOffered(link.pay) && note && !note.accepted && (
          <TeamNoteCard note={note} onAccept={acceptNoteNow} busy={noteBusy} error={noteErr} testId="link-note" />
        )}
        {v.canAccept && (
          <button type="button" className="ed-primary tm-btn" disabled={busy} onClick={accept} data-testid="link-accept">{busy ? "Accepting…" : acceptLabel(noteOnAccept(link.pay, note))}</button>
        )}
        {v.canAccept && <div className="ed-hint">Not for you? Just close this page. Nothing changes unless you accept.</div>}
        {v.next && <Link href={v.next.href} className="ed-primary tm-btn" style={{ textAlign: "center" }} data-testid="link-next">{v.next.label}</Link>}
        {err && <p className="ed-err" role="alert" data-testid="link-error">{err}</p>}
      </div>
      {sheet && (
        <QuickAuthSheet key={sheetKey} open initialMode="signup" purpose="team" returnPath={`/team/${code}`}
          onClose={() => setSheet(false)} onDone={() => { setSheet(false); accept(); }} />
      )}
    </>,
  );
}
