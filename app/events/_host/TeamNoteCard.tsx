"use client";

/**
 * The Event Team note (p4-team step 9d-2, mockup H): its six points and, when `onAccept` is given, an I accept button.
 * Used on the invite list (goutsyde.com/events/door), the invite link page (/team/CODE) and their event page
 * (/events/[id]/my-team). Where it sits above an Accept that also joins, the page passes no `onAccept` and its own
 * button says "Accept and join" (call 84). Text comes from the backend (GET /api/events/team-note) as plain text.
 */

import type { TeamNote } from "./teamNoteLogic";

export default function TeamNoteCard({ note, onAccept, busy, error, testId = "team-note" }: {
  note: TeamNote;
  onAccept?: () => void;
  busy?: boolean;
  error?: string | null;
  testId?: string;
}) {
  return (
    <section className="ed-box" style={{ padding: 14, gap: 8 }} aria-label={note.title} data-testid={testId}>
      <h2 className="mg-section" style={{ margin: 0 }}>{note.title.toUpperCase()}</h2>
      <p className="ed-hint" style={{ margin: 0 }}>{note.intro}</p>
      <ol style={{ margin: 0, paddingLeft: 22, listStyle: "decimal", display: "flex", flexDirection: "column", gap: 6, fontSize: 14, lineHeight: 1.45, color: "#CFC7B8" }}>
        {note.points.map((p, i) => <li key={i} style={{ overflowWrap: "anywhere" }}>{p}</li>)}
      </ol>
      {error && <p className="ed-err" role="alert" style={{ margin: 0 }}>{error}</p>}
      {onAccept && (
        <button type="button" className="ed-primary tm-btn" disabled={busy} onClick={onAccept} data-testid={`${testId}-accept`}>
          {busy ? "Saving…" : "I accept"}
        </button>
      )}
    </section>
  );
}
