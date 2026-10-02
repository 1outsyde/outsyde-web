// components/royalelite/FreeConsultSection.tsx
// "Book a free consultation" for Royal Elite Moving (rendered inside <section id="consult"> on
// app/shop/royalelite/page.tsx). Talks only to the BFFs in app/api/royalelite/consult/*.
// Times are the backend's "HH:MM" strings, shown in 12h form with no Date/timezone conversion.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type QuestionType = "text" | "long_text" | "select" | "date" | "address";

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  serviceLocationType: string | null;
  imageUrl: string | null;
  bookingQuestions: Question[];
}

interface AddressValue {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zipCode: string;
}

interface ServiceAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

type AnswerValue = string | AddressValue;

type Result = { kind: "confirmed" | "pending"; bookingNumber: number | null; date: string; time: string };

const SIGN_IN_HREF = "/login?return=%2Fshop%2Froyalelite%23consult";
const EMPTY_ADDRESS: AddressValue = { line1: "", line2: "", city: "", state: "", zipCode: "" };
const EMPTY_SERVICE_ADDRESS: ServiceAddress = { line1: "", line2: "", city: "", state: "", zip: "" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "14:30" → "2:30 PM" (string math only). */
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "2026-10-10" → "Oct 10, 2026" (string math only). */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** Local calendar date, offset by `days`, as YYYY-MM-DD. */
function localIsoDate(days: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function bookingRef(n: number | null): string | null {
  return typeof n === "number" ? `#A${String(n).padStart(4, "0")}` : null;
}

export default function FreeConsultSection({ onAvailabilityChange }: { onAvailabilityChange?: (available: boolean) => void }) {
  const [phase, setPhase] = useState<"loading" | "unavailable" | "ready">("loading");
  const [services, setServices] = useState<Service[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [dateRange, setDateRange] = useState<{ min: string; max: string } | null>(null);

  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsState, setSlotsState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [time, setTime] = useState("");

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [serviceAddress, setServiceAddress] = useState<ServiceAddress>(EMPTY_SERVICE_ADDRESS);

  const [submitting, setSubmitting] = useState(false);
  // Guards a double-click: two clicks in one render both see submitting === false.
  const inFlight = useRef(false);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [servicesRes, meRes] = await Promise.allSettled([
        fetch("/api/royalelite/consult/services").then((r) => r.json()),
        fetch("/api/auth/me").then((r) => r.json()),
      ]);
      if (cancelled) return;

      setDateRange({ min: localIsoDate(1), max: localIsoDate(30) });
      setSignedIn(meRes.status === "fulfilled" && meRes.value?.authenticated === true);

      const list: Service[] =
        servicesRes.status === "fulfilled" && servicesRes.value?.available && Array.isArray(servicesRes.value.services)
          ? servicesRes.value.services
          : [];
      setServices(list);
      setPhase(list.length > 0 ? "ready" : "unavailable");
      if (list.length === 1) setServiceId(list[0].id);
      onAvailabilityChange?.(list.length > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [onAvailabilityChange]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const needsAddress = service?.serviceLocationType === "customer";

  async function loadSlots(forServiceId: string, forDate: string) {
    setTime("");
    setSlots([]);
    if (!forServiceId || !forDate) {
      setSlotsState("idle");
      return;
    }
    setSlotsState("loading");
    try {
      const qs = new URLSearchParams({ serviceId: forServiceId, date: forDate });
      const res = await fetch(`/api/royalelite/consult/slots?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setSlotsState("error");
        return;
      }
      setSlots(Array.isArray(data.slots) ? data.slots.map((s: { startTime: string }) => s.startTime) : []);
      setSlotsState("loaded");
    } catch {
      setSlotsState("error");
    }
  }

  function chooseService(id: string) {
    setServiceId(id);
    setAnswers({});
    setFieldErrors({});
    setMessage("");
    void loadSlots(id, date);
  }

  function chooseDate(value: string) {
    setDate(value);
    setMessage("");
    void loadSlots(serviceId, value);
  }

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }

  function buildAnswers(questions: Question[]) {
    const out: { questionId: string; answer: unknown }[] = [];
    for (const q of questions) {
      const v = answers[q.id];
      if (q.type === "address") {
        const a = (v as AddressValue | undefined) ?? EMPTY_ADDRESS;
        if (![a.line1, a.line2, a.city, a.state, a.zipCode].some((x) => x.trim())) continue;
        out.push({
          questionId: q.id,
          answer: {
            line1: a.line1,
            ...(a.line2.trim() ? { line2: a.line2 } : {}),
            city: a.city,
            state: a.state,
            zipCode: a.zipCode,
          },
        });
      } else if (typeof v === "string" && v.trim()) {
        out.push({ questionId: q.id, answer: v });
      }
    }
    return out;
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current || result || !service || !date || !time) return;
    inFlight.current = true;
    setSubmitting(true);
    setMessage("");
    setFieldErrors({});
    setAddressErrors({});
    try {
      const res = await fetch("/api/royalelite/consult/book", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          date,
          startTime: time,
          answers: buildAnswers(service.bookingQuestions),
          ...(needsAddress ? { address: serviceAddress } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setResult({
          kind: data.status === "pending_provider" ? "pending" : "confirmed",
          bookingNumber: typeof data.bookingNumber === "number" ? data.bookingNumber : null,
          date,
          time,
        });
        return;
      }
      if (res.status === 401) {
        setSignedIn(false);
        return;
      }
      if (data.code === "FREE_CONSULTATION_LIMIT") {
        setMessage(data.message || data.error || "You already have an open free consultation with Royal Elite.");
        return;
      }
      if (data.code === "INVALID_BOOKING_ANSWERS") {
        const errs: Record<string, string> = {};
        for (const err of Array.isArray(data.errors) ? data.errors : []) {
          if (err?.questionId && !errs[err.questionId]) errs[err.questionId] = err.message;
        }
        setFieldErrors(errs);
        setMessage("Please check the highlighted answers.");
        return;
      }
      if (data.code === "INVALID_ADDRESS") {
        setAddressErrors(data.errors && typeof data.errors === "object" ? data.errors : {});
        setMessage("Please check the service address.");
        return;
      }
      if (data.stage === "hold" || data.errorCode) {
        setMessage("That time was just taken, pick another.");
        void loadSlots(service.id, date);
        return;
      }
      setMessage(data.message || data.error || "Something went wrong. Please try again or call 757-944-4925.");
    } catch {
      setMessage("Couldn’t reach the server. Please try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (phase === "unavailable") return null;

  return (
    <div className="re-book">
    <div className="rec-inner">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.rec-inner{max-width:760px;margin:0 auto;padding:76px 40px;}
.rec-services{display:grid;gap:12px;margin-bottom:22px;}
.rec-service{display:flex;flex-direction:column;gap:4px;text-align:left;background:rgba(0,0,0,.3);border:1px solid var(--re-line);border-radius:4px;padding:14px 16px;color:var(--re-cream);font-family:var(--re-sans);cursor:pointer;}
.rec-service.active{border-color:var(--re-gold);background:rgba(201,162,39,.12);}
.rec-service b{font-size:15px;font-weight:600;}
.rec-service span{font-size:12.5px;color:var(--re-muted);}
.rec-slots{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:8px;}
.rec-slot{background:rgba(0,0,0,.3);border:1px solid var(--re-line);border-radius:3px;padding:9px 14px;color:var(--re-cream);font-family:var(--re-sans);font-size:13px;cursor:pointer;}
.rec-slot.active{background:var(--re-gold);color:#1E0E33;border-color:var(--re-gold);font-weight:700;}
.rec-hint{grid-column:1 / -1;font-size:12.5px;color:var(--re-muted);}
.rec-err{font-size:12px;color:#f0b9b9;}
.rec-group{grid-column:1 / -1;display:grid;grid-template-columns:1fr 1fr;gap:12px;border:1px solid var(--re-line);border-radius:4px;padding:14px;}
.rec-group legend{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--re-muted);padding:0 6px;}
.rec-signin{grid-column:1 / -1;text-align:center;font-size:13.5px;line-height:1.9;color:var(--re-cream);}
.rec-signin a{color:var(--re-gold-light);text-decoration:underline;}
@media (max-width:880px){.rec-inner{padding:54px 22px;}.rec-group{grid-template-columns:1fr;}}
`,
        }}
      />
      <div className="re-sec-head">
        <h2>Book a Free Consultation</h2>
        <p>Pick a time · No payment needed</p>
      </div>

      {phase === "ready" && result && (
        <div className="re-status ok">
          {result.kind === "confirmed" ? (
            <>
              You’re booked! {bookingRef(result.bookingNumber) && <>Booking {bookingRef(result.bookingNumber)} · </>}
              {formatDate(result.date)} at {to12h(result.time)}
            </>
          ) : (
            <>Request sent — Royal Elite will confirm your consultation on {formatDate(result.date)} at {to12h(result.time)}.</>
          )}
        </div>
      )}

      {phase === "ready" && !result && (
        <form className="re-form" onSubmit={handleBook}>
          {services.length > 1 && (
            <div className="re-field full">
              <label>Consultation</label>
              <div className="rec-services">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`rec-service${s.id === serviceId ? " active" : ""}`}
                    onClick={() => chooseService(s.id)}
                  >
                    <b>{s.name}</b>
                    {s.description && <span>{s.description}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {services.length === 1 && service && (
            <div className="re-field full">
              <label>Consultation</label>
              <div className="rec-service active">
                <b>{service.name}</b>
                {service.description && <span>{service.description}</span>}
              </div>
            </div>
          )}

          {service && (
            <div className="re-field full">
              <label htmlFor="rec-date">Date</label>
              <input
                id="rec-date"
                type="date"
                min={dateRange?.min}
                max={dateRange?.max}
                value={date}
                onChange={(e) => chooseDate(e.target.value)}
                required
              />
            </div>
          )}

          {service && date && (
            <div className="rec-slots" role="group" aria-label="Available times">
              {slotsState === "loading" && <span className="rec-hint">Loading times…</span>}
              {slotsState === "error" && <span className="rec-hint">Couldn’t load times. Pick the date again.</span>}
              {slotsState === "loaded" && slots.length === 0 && <span className="rec-hint">No open times that day. Try another date.</span>}
              {slotsState === "loaded" &&
                slots.map((s) => (
                  <button key={s} type="button" className={`rec-slot${s === time ? " active" : ""}`} onClick={() => setTime(s)}>
                    {to12h(s)}
                  </button>
                ))}
            </div>
          )}

          {service && time && (
            <>
              {service.bookingQuestions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  error={fieldErrors[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              ))}

              {needsAddress && (
                <fieldset className="rec-group">
                  <legend>Where should Royal Elite meet you?</legend>
                  {(
                    [
                      ["line1", "Street address", true],
                      ["line2", "Apt / unit (optional)", false],
                      ["city", "City", true],
                      ["state", "State", true],
                      ["zip", "ZIP code", true],
                    ] as const
                  ).map(([key, label, req]) => (
                    <div className="re-field" key={key}>
                      <label htmlFor={`rec-addr-${key}`}>{label}</label>
                      <input
                        id={`rec-addr-${key}`}
                        value={serviceAddress[key]}
                        maxLength={200}
                        required={req}
                        onChange={(e) => setServiceAddress((a) => ({ ...a, [key]: e.target.value }))}
                      />
                      {addressErrors[key] && <span className="rec-err">{addressErrors[key]}</span>}
                    </div>
                  ))}
                </fieldset>
              )}

              {signedIn === false ? (
                <div className="rec-signin">
                  <Link href={SIGN_IN_HREF}>Sign in to book</Link>
                  <br />
                  New here? <Link href="/consumer-signup">Create an account</Link>, then sign in.
                </div>
              ) : (
                <button className="re-submit" type="submit" disabled={submitting || signedIn === null}>
                  {submitting ? "Booking…" : "Book Free Consultation"}
                </button>
              )}
            </>
          )}

          {message && <div className="re-status error">{message}</div>}
        </form>
      )}
    </div>
    </div>
  );
}

function QuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: Question;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (value: AnswerValue) => void;
}) {
  const id = `rec-q-${question.id}`;
  const label = `${question.label}${question.required ? "" : " (optional)"}`;
  const text = typeof value === "string" ? value : "";

  if (question.type === "address") {
    const a = (value as AddressValue | undefined) ?? EMPTY_ADDRESS;
    const set = (key: keyof AddressValue, v: string) => onChange({ ...a, [key]: v });
    return (
      <fieldset className="rec-group">
        <legend>{label}</legend>
        {(
          [
            ["line1", "Street address", question.required],
            ["line2", "Apt / unit (optional)", false],
            ["city", "City", question.required],
            ["state", "State", question.required],
            ["zipCode", "ZIP code", question.required],
          ] as const
        ).map(([key, sub, req]) => (
          <div className="re-field" key={key}>
            <label htmlFor={`${id}-${key}`}>{sub}</label>
            <input id={`${id}-${key}`} value={a[key]} maxLength={200} required={req} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
        {error && <span className="rec-err">{error}</span>}
      </fieldset>
    );
  }

  return (
    <div className="re-field full">
      <label htmlFor={id}>{label}</label>
      {question.type === "long_text" && (
        <textarea id={id} value={text} maxLength={2000} required={question.required} onChange={(e) => onChange(e.target.value)} />
      )}
      {question.type === "text" && (
        <input id={id} value={text} maxLength={500} required={question.required} onChange={(e) => onChange(e.target.value)} />
      )}
      {question.type === "date" && (
        <input id={id} type="date" value={text} required={question.required} onChange={(e) => onChange(e.target.value)} />
      )}
      {question.type === "select" && (
        <select id={id} value={text} required={question.required} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {(question.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {error && <span className="rec-err">{error}</span>}
    </div>
  );
}
