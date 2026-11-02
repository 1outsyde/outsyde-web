"use client";

// Quick sign up / log in sheet on the event page (p4-quicksignup, Events canvas mockups 42 and 43).
// Sign up: first name, email, phone, password, optional profile photo. Log in: email, password.
// An email that already has an account switches to log in with the email kept.
// The parent mounts it fresh for each use (state starts from the props).
// The photo never blocks anything: if it can't be read, uploaded or saved, the account and the
// pending checkout or RSVP still go ahead, with a short note.

import { useEffect, useRef, useState } from "react";
import { GENERIC_ERROR } from "../_shared/format";
import { QUICK_COPY, existsCopy, loginOutcome, quickErrorCopy, validateQuickLogin, validateQuickSignup, type QuickMode, type QuickPurpose } from "./quickAuthLogic";
import { useCropFile } from "@/components/crop/useCropFile";

export type { QuickPurpose };

type Props = {
  open: boolean;
  initialMode: QuickMode;
  purpose?: QuickPurpose;
  /** Same-origin path to come back to if the person has to leave the page (finish setup, Apple or Google log in). */
  returnPath: string;
  onClose: () => void;
  onDone: (r: { email: string; created: boolean }) => void;
};

type Errors = Partial<Record<"firstName" | "email" | "phone" | "password", string>>;

const PHOTO_MAX_SIDE = 512;
const PHOTO_NOTE_MS = 3000;

/** Decode the picked file in the browser and re-encode it as a small JPEG, so only a real image is sent. */
function photoToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

async function savePhoto(file: File): Promise<boolean> {
  try {
    const jpeg = await photoToJpeg(file);
    const fd = new FormData();
    fd.append("file", jpeg, "profile.jpg");
    fd.append("folder", "profiles");
    const up = await fetch("/api/vendor-dashboard/upload-image", { method: "POST", body: fd });
    const d = await up.json().catch(() => null);
    if (!up.ok || typeof d?.url !== "string" || !d.url) return false;
    const patch = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileImageUrl: d.url }),
    });
    return patch.ok;
  } catch {
    return false;
  }
}

const COPY: Record<QuickPurpose, { title: string; sub: string; loginTitle: string; cta: string; loginCta: string }> = {
  checkout: { title: "Get your tickets", sub: "Create your free Outsyde account to check out. It takes a few seconds.", loginTitle: "Log in to get your tickets", cta: "Create account and continue", loginCta: "Log in and continue" },
  rsvp: { title: "Get your tickets", sub: "Create your free Outsyde account to RSVP. It takes a few seconds.", loginTitle: "Log in to get your tickets", cta: "Create account and continue", loginCta: "Log in and continue" },
  follow: { title: "Join Outsyde", sub: "Create your free Outsyde account to follow this host. It takes a few seconds.", loginTitle: "Log in to follow", cta: "Create account and follow", loginCta: "Log in and follow" },
  team: { title: "Join the Event team", sub: "Create your free Outsyde account to accept. It takes a few seconds.", loginTitle: "Log in to accept", cta: "Create account and accept", loginCta: "Log in and accept" },
  report: { title: "Report this event", sub: "Create your free Outsyde account to send a report. It takes a few seconds.", loginTitle: "Log in to report", cta: "Create account and continue", loginCta: "Log in and continue" },
};

export default function QuickAuthSheet({ open, initialMode, purpose = "checkout", returnPath, onClose, onDone }: Props) {
  const [mode, setMode] = useState<QuickMode>(initialMode);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  // 1:1 circle crop box for the profile photo (photo ratios 3b).
  const { crop, cropModal } = useCropFile();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [existsNote, setExistsNote] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [photoNote, setPhotoNote] = useState("");
  const [oauthMsg, setOauthMsg] = useState("");
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const firstRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus the first field when the sheet opens or the mode changes.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (mode === "signup") firstRef.current?.focus();
      else if (existsNote) passRef.current?.focus();
      else emailRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open, mode, existsNote]);

  const photoUrlRef = useRef<string | null>(null);
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
  }, []);

  // Modal: the page behind doesn't scroll, and focus goes back to what opened the sheet on close.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      if (opener && opener.isConnected) opener.focus();
    };
  }, [open]);

  function trapTab(ev: React.KeyboardEvent) {
    if (ev.key !== "Tab" || !sheetRef.current) return;
    const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])"))
      .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0 || el.id === "qa-photo");
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (ev.shiftKey && (active === first || !sheetRef.current.contains(active))) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && (active === last || !sheetRef.current.contains(active))) {
      ev.preventDefault();
      first.focus();
    }
  }

  async function pickPhoto(picked: File | null) {
    // Crop to a 1:1 circle first; cancelling keeps the photo already chosen.
    const f = picked ? (await crop(picked, "profile"))?.file ?? null : null;
    if (picked && !f) return;
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = f ? URL.createObjectURL(f) : null;
    setPhoto(f);
    setPhotoUrl(photoUrlRef.current);
  }

  if (!open) return null;
  const c = COPY[purpose];

  function close() {
    if (busyRef.current) return;
    onClose();
  }

  function switchMode(next: QuickMode) {
    if (busyRef.current) return;
    setMode(next);
    setErrors({});
    setFormError("");
    setExistsNote(false);
    setWrongPassword(false);
    setOauthMsg("");
  }

  async function submitSignup() {
    const f = { firstName, email, phone, password };
    const v = validateQuickSignup(f);
    setErrors(v);
    setFormError("");
    if (Object.keys(v).length) return;
    busyRef.current = true;
    setBusy(true);
    let finished = false;
    try {
      const res = await fetch("/api/quick-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), email: email.trim(), phone: phone.trim(), password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const copy = quickErrorCopy(res.status, body, "signup");
        if (copy.switchToLogin) {
          setMode("login");
          setPassword("");
          setExistsNote(true);
          setWrongPassword(false);
          setErrors({});
        } else {
          setFormError(copy.message);
        }
        return;
      }
      const signedEmail = typeof body?.email === "string" && body.email ? body.email : email.trim().toLowerCase();
      finished = true;
      if (photo) {
        const ok = await savePhoto(photo);
        if (!ok) {
          setPhotoNote(QUICK_COPY.photo);
          timerRef.current = setTimeout(() => onDone({ email: signedEmail, created: true }), PHOTO_NOTE_MS);
          return;
        }
      }
      onDone({ email: signedEmail, created: true });
    } catch {
      setFormError(GENERIC_ERROR);
    } finally {
      if (!finished) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  async function submitLogin() {
    const v = validateQuickLogin({ email, password });
    setErrors(v);
    setFormError("");
    setWrongPassword(false);
    setOauthMsg("");
    if (Object.keys(v).length) return;
    busyRef.current = true;
    setBusy(true);
    let finished = false;
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email.trim(), password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const out = loginOutcome(res.status, body);
        if (out.kind === "claim") {
          // Imported account with no password yet: the backend just emailed a code. Finish on /claim
          // (same hand off as /login), then come back to this event with the pending action.
          const q = new URLSearchParams({ sent: "1", email: email.trim().toLowerCase(), return: returnPath });
          finished = true;
          window.location.href = `/claim?${q.toString()}`;
          return;
        }
        if (out.kind === "oauth") setOauthMsg(out.message);
        else if (out.wrongPassword) setWrongPassword(true);
        else setFormError(out.message);
        return;
      }
      finished = true;
      onDone({ email: email.trim().toLowerCase(), created: false });
    } catch {
      setFormError(GENERIC_ERROR);
    } finally {
      if (!finished) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (busyRef.current) return;
    if (mode === "signup") void submitSignup();
    else void submitLogin();
  }

  const signup = mode === "signup";
  const title = signup ? c.title : existsNote ? "Welcome back" : c.loginTitle;
  const inputStyle = (bad: boolean): React.CSSProperties => ({
    height: 46, borderRadius: 12, border: `1px solid ${bad ? "#FF8A7A" : "#2A2A2A"}`, background: "#0B0B0B", color: "#F5F0E6",
    padding: "0 12px", font: "500 16px 'Hanken Grotesk', sans-serif", marginTop: -6, width: "100%",
  });
  const fieldErr = (k: keyof Errors, id: string) => errors[k] ? <div id={id} className="qa-err" role="alert">{errors[k]}</div> : null;

  return (
    <>
    <div className="qa-root" onKeyDown={(ev) => { if (ev.key === "Escape") { ev.stopPropagation(); close(); } else trapTab(ev); }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .qa-root { position: fixed; inset: 0; z-index: 350; }
        .qa-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.55); border: 0; padding: 0; width: 100%; cursor: default; }
        .qa-sheet { position: absolute; left: 0; right: 0; bottom: 0; margin: 0 auto; max-width: 520px; max-height: 92vh; overflow-y: auto; background: #141414; border-radius: 22px 22px 0 0; border-top: 1px solid #2A2A2A; padding: 20px 18px 26px; display: flex; flex-direction: column; gap: 12px; color: #F5F0E6; font-family: 'Hanken Grotesk', system-ui, sans-serif; box-sizing: border-box; }
        .qa-sheet *, .qa-sheet *::before, .qa-sheet *::after { box-sizing: border-box; }
        .qa-label { font-size: 12px; font-weight: 700; color: #B8B0A0; letter-spacing: 1px; }
        .qa-hint { font-size: 12px; color: #8A8478; margin-top: -6px; }
        .qa-err { font-size: 13px; color: #FF8A7A; margin-top: -4px; }
        .qa-sheet input::placeholder { color: #8A8478; }
        .qa-cta { height: 52px; border-radius: 26px; border: 0; background: #E8B930; color: #000; font: 700 16px 'Hanken Grotesk', sans-serif; margin-top: 4px; cursor: pointer; }
        .qa-cta:disabled { opacity: 0.6; cursor: default; }
        .qa-switch { height: 40px; border: 0; background: transparent; color: #CFC7B8; font: 600 14px 'Hanken Grotesk', sans-serif; cursor: pointer; }
        .qa-close { width: 44px; height: 44px; border: 0; background: transparent; color: #F5F0E6; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; flex-shrink: 0; }
        .qa-photo { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .qa-photo:focus-within .qa-ring { outline: 2px solid #E8B930; outline-offset: 2px; }
        .qa-ring { width: 48px; height: 48px; flex: none; border-radius: 24px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .qa-ring img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .qa-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
      ` }} />
      <button type="button" className="qa-scrim" aria-label="Close" tabIndex={-1} onClick={close} />
      <div className="qa-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="qa-title" data-testid="quick-auth-sheet">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 id="qa-title" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{title}</h2>
          <button type="button" className="qa-close" aria-label="Close" onClick={close} disabled={busy}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {existsNote && !signup ? (
          <div role="status" style={{ fontSize: 13, lineHeight: 1.45, color: "#F5D26B", background: "#2E2510", borderRadius: 12, padding: "10px 12px" }}>{existsCopy(purpose)}</div>
        ) : (
          <div style={{ fontSize: 13, color: "#B8B0A0", lineHeight: 1.45, marginTop: -6 }}>
            {signup ? c.sub : "Use your Outsyde email and password."}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {signup && (
            <>
              <label className="qa-photo" htmlFor="qa-photo">
                <span className="qa-ring" aria-hidden="true" style={{ border: `1px dashed ${photoUrl ? "#E8B930" : "#38383A"}`, background: photoUrl ? "#2E2510" : "#0B0B0B" }}>
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8B0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                  )}
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E6" }}>{photo ? "Change photo" : "Add a profile photo"}</span>
                  <span style={{ fontSize: 12, color: "#8A8478" }}>Optional. You can skip this.</span>
                </span>
                <input id="qa-photo" className="qa-sr" type="file" accept="image/*" disabled={busy}
                  onChange={(ev) => { const f = ev.target.files?.[0] ?? null; ev.target.value = ""; void pickPhoto(f); }} />
              </label>
              <label htmlFor="qa-first" className="qa-label">FIRST NAME</label>
              <input id="qa-first" ref={firstRef} autoComplete="given-name" value={firstName} onChange={(ev) => setFirstName(ev.target.value)}
                style={inputStyle(!!errors.firstName)} aria-invalid={!!errors.firstName} aria-describedby={errors.firstName ? "qa-first-err" : undefined} />
              {fieldErr("firstName", "qa-first-err")}
            </>
          )}
          <label htmlFor="qa-email" className="qa-label">EMAIL</label>
          <input id="qa-email" ref={emailRef} type="email" inputMode="email" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)}
            style={inputStyle(!!errors.email)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "qa-email-err" : undefined} />
          {fieldErr("email", "qa-email-err")}
          {signup && (
            <>
              <label htmlFor="qa-phone" className="qa-label">PHONE</label>
              <input id="qa-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(ev) => setPhone(ev.target.value)}
                style={inputStyle(!!errors.phone)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "qa-phone-err" : undefined} />
              {fieldErr("phone", "qa-phone-err")}
            </>
          )}
          <label htmlFor="qa-pass" className="qa-label">PASSWORD</label>
          <input id="qa-pass" ref={passRef} type="password" autoComplete={signup ? "new-password" : "current-password"} value={password}
            placeholder={signup ? undefined : "Your Outsyde password"} onChange={(ev) => setPassword(ev.target.value)}
            style={inputStyle(!!errors.password || wrongPassword)} aria-invalid={!!errors.password || wrongPassword}
            aria-describedby={errors.password ? "qa-pass-err" : wrongPassword ? "qa-pass-wrong" : signup ? "qa-pass-hint" : undefined} />
          {fieldErr("password", "qa-pass-err")}
          {!errors.password && signup && <div id="qa-pass-hint" className="qa-hint">At least 6 characters.</div>}
          {wrongPassword && <div id="qa-pass-wrong" className="qa-err" role="alert">{QUICK_COPY.mismatch}</div>}
          {formError && <div className="qa-err" role="alert" style={{ marginTop: 0 }}>{formError}</div>}
          {oauthMsg && (
            <div role="alert" style={{ fontSize: 13, lineHeight: 1.45, color: "#F5D26B" }}>
              {oauthMsg} <a href={`/login?return=${encodeURIComponent(returnPath)}`}>Go to log in</a>
            </div>
          )}
          {photoNote && <div role="status" style={{ fontSize: 13, color: "#F5D26B" }}>{photoNote}</div>}

          <button type="submit" className="qa-cta" disabled={busy} aria-busy={busy}>
            {busy ? "Working" : signup ? c.cta : c.loginCta}
          </button>
        </form>
        {signup ? (
          <div style={{ fontSize: 12, color: "#8A8478", lineHeight: 1.45, textAlign: "center" }}>
            By continuing you agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </div>
        ) : (
          <a href="/forgot-password" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, textAlign: "center" }}>Forgot password?</a>
        )}
        <button type="button" className="qa-switch" onClick={() => switchMode(signup ? "login" : "signup")} disabled={busy}>
          {signup ? "Already have an account? Log in" : "New to Outsyde? Create an account"}
        </button>
      </div>
    </div>
    {/* Outside qa-root, so its Escape and Tab handling don't reach the crop box. */}
    {cropModal}
    </>
  );
}
