"use client";

import { useState } from "react";
import { safeHttpUrl } from "../../tickets/ticketsLogic";
import { autoEndDate, clockChangeNote, dayOfNote, hostAsLabel, timeZoneList, type EventForm, type HostAs } from "./editorLogic";

export interface DetailsStepProps {
  form: EventForm;
  setForm: (f: EventForm) => void;
  hosts: HostAs[];
  /** Host type can only be picked before the draft exists. */
  hostLocked: boolean;
  /** The event started: its start (date, start time, zone) can't change. */
  startLocked: boolean;
  uploading: boolean;
  onPickCover: (file: File) => void;
}

const VISIBILITY: { value: EventForm["addressVisibility"]; label: string }[] = [
  { value: "ticket_holders", label: "People with a ticket, right away" },
  { value: "ticket_holders_day_of", label: "People with a ticket, on the day of the event" },
  { value: "public", label: "Everyone" },
];

export default function DetailsStep({ form, setForm, hosts, hostLocked, startLocked, uploading, onPickCover }: DetailsStepProps) {
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm({ ...form, [k]: v });
  const hostChoices = hostLocked ? [form.hostAs] : hosts;
  const cover = safeHttpUrl(form.coverImageUrl);
  // Open when the saved end is on a day the simple rule wouldn't give (formFromEvent fills endDate only then).
  const [multiDay, setMultiDay] = useState(form.endDate !== "");
  const endDay = form.endDate || autoEndDate(form);
  const notes = [
    form.date && form.startTime ? clockChangeNote(form.date, form.startTime, form.timezone) : null,
    endDay && form.endTime ? clockChangeNote(endDay, form.endTime, form.timezone) : null,
  ].filter((n, i, all): n is string => !!n && all.indexOf(n) === i);

  function toggleMultiDay() {
    if (multiDay) { setMultiDay(false); set("endDate", ""); return; }
    setMultiDay(true);
    set("endDate", autoEndDate(form));
  }

  return (
    <div className="ed-stack">
      <div className="ed-namerow">
        <label className="ed-thumb" aria-label={cover ? "Change cover photo" : "Add a cover photo"}>
          {cover
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={cover} alt="" />
            : <span className="ed-thumb-plus" aria-hidden="true">+</span>}
          <span className="ed-thumb-text">{uploading ? "Uploading…" : cover ? "Change" : "Cover"}</span>
          <input
            type="file" accept="image/*" className="ed-hidden-file" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPickCover(f); }}
          />
        </label>
        <div className="ed-field ed-grow">
          <label htmlFor="ev-title" className="ed-label">EVENT NAME</label>
          <input id="ev-title" className="ed-in" placeholder="Name your event" maxLength={120}
            value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
      </div>

      <div className="ed-field">
        <div className="ed-label" id="hosted-as">HOSTED AS</div>
        <div className="ed-choice-row" role="radiogroup" aria-labelledby="hosted-as">
          {hostChoices.map((h) => (
            <button key={h} type="button" role="radio" aria-checked={form.hostAs === h} disabled={hostLocked}
              className={`ed-choice${form.hostAs === h ? " on" : ""}`} onClick={() => set("hostAs", h)}>
              {hostAsLabel(h)}
            </button>
          ))}
        </div>
        {hostLocked && <div className="ed-hint">Who hosts can&apos;t change after the draft is saved.</div>}
      </div>

      <div className="ed-when">
        <div className="ed-field ed-date">
          <label htmlFor="ev-date" className="ed-label">DATE</label>
          <input id="ev-date" type="date" className="ed-in" value={form.date} disabled={startLocked}
            onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="ed-field">
          <label htmlFor="ev-start" className="ed-label">STARTS</label>
          <input id="ev-start" type="time" className="ed-in" value={form.startTime} disabled={startLocked}
            onChange={(e) => set("startTime", e.target.value)} />
        </div>
        <div className="ed-field">
          <label htmlFor="ev-end" className="ed-label">ENDS</label>
          <input id="ev-end" type="time" className="ed-in" value={form.endTime}
            onChange={(e) => set("endTime", e.target.value)} />
        </div>
      </div>
      {!multiDay && form.startTime && form.endTime && form.endTime < form.startTime && (
        <div className="ed-hint">Ends the next day.</div>
      )}
      {notes.map((n) => <div key={n} className="ed-hint ed-warn" role="status">{n}</div>)}
      <button type="button" className="ed-textbtn ed-gold ed-left" aria-expanded={multiDay} aria-controls="ev-enddate-field"
        onClick={toggleMultiDay}>
        {multiDay ? "Ends the same day or the next morning" : "Ends on a different day"}
      </button>
      {multiDay && (
        <div className="ed-field" id="ev-enddate-field">
          <label htmlFor="ev-enddate" className="ed-label">END DATE</label>
          <input id="ev-enddate" type="date" className="ed-in" value={form.endDate || endDay} min={form.date || undefined}
            onChange={(e) => set("endDate", e.target.value)} />
        </div>
      )}
      {startLocked && <div className="ed-hint">This event has started, so its start time can&apos;t change.</div>}

      <div className="ed-field">
        <label htmlFor="ev-tz" className="ed-label">TIME ZONE</label>
        <select id="ev-tz" className="ed-in" value={form.timezone} disabled={startLocked}
          onChange={(e) => set("timezone", e.target.value)}>
          {timeZoneList(form.timezone).map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <fieldset className="ed-fieldset">
        <legend className="ed-label">LOCATION</legend>
        <div className="ed-field">
          <label htmlFor="ev-venue" className="ed-sublabel">Venue name</label>
          <input id="ev-venue" className="ed-in" maxLength={200} placeholder="The Hall" value={form.venueName}
            onChange={(e) => set("venueName", e.target.value)} />
        </div>
        <div className="ed-field">
          <label htmlFor="ev-a1" className="ed-sublabel">Address</label>
          <input id="ev-a1" className="ed-in" maxLength={200} autoComplete="address-line1" value={form.addressLine1}
            onChange={(e) => set("addressLine1", e.target.value)} />
        </div>
        <div className="ed-field">
          <label htmlFor="ev-a2" className="ed-sublabel">Apartment, suite or floor (optional)</label>
          <input id="ev-a2" className="ed-in" maxLength={200} autoComplete="address-line2" value={form.addressLine2}
            onChange={(e) => set("addressLine2", e.target.value)} />
        </div>
        <div className="ed-grid3">
          <div className="ed-field">
            <label htmlFor="ev-city" className="ed-sublabel">City</label>
            <input id="ev-city" className="ed-in" maxLength={100} autoComplete="address-level2" value={form.city}
              onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="ed-field">
            <label htmlFor="ev-state" className="ed-sublabel">State</label>
            <input id="ev-state" className="ed-in" maxLength={100} autoComplete="address-level1" value={form.state}
              onChange={(e) => set("state", e.target.value)} />
          </div>
          <div className="ed-field">
            <label htmlFor="ev-zip" className="ed-sublabel">Postal code</label>
            <input id="ev-zip" className="ed-in" maxLength={20} autoComplete="postal-code" value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)} />
          </div>
        </div>

        <div className="ed-box" role="radiogroup" aria-labelledby="who-sees">
          <div className="ed-box-title" id="who-sees">Who sees the full address?</div>
          {VISIBILITY.map((o) => (
            <label key={o.value} className="ed-radio">
              <span className="ed-radio-text">
                <span>{o.label}</span>
                {o.value === "ticket_holders_day_of" && <span className="ed-hint">{dayOfNote(form.city, form.state)}</span>}
              </span>
              <input type="radio" name="addr-vis" value={o.value} checked={form.addressVisibility === o.value}
                onChange={() => set("addressVisibility", o.value)} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="ed-field">
        <label htmlFor="ev-about" className="ed-label">ABOUT</label>
        <textarea id="ev-about" className="ed-in ed-area" maxLength={5000}
          placeholder="What should guests know? Dress code, parking, age limit." value={form.description}
          onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="ed-switchrow">
        <div className="ed-radio-text">
          <span className="ed-strong" id="discover-label">Show in Discover</span>
          <span className="ed-hint">Off means only people with the link can find it.</span>
        </div>
        <button type="button" role="switch" aria-checked={form.listed} aria-labelledby="discover-label"
          className={`ed-switch${form.listed ? " on" : ""}`} onClick={() => set("listed", !form.listed)}>
          <span className="ed-knob" />
        </button>
      </div>
    </div>
  );
}
