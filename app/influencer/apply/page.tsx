"use client";

// /influencer/apply: the Outsyde influencer application for signed-in customers (2026-10-18).
// Same questions as the app: every social, followers on each, what you post about (the shared
// industry list, up to 5, Other with words), and why you want to join. middleware.ts sends
// signed-out visitors to /login and back here. Businesses and photographers get the backend's
// "customers only" message.

import Link from "next/link";
import { useEffect, useState } from "react";
import { isTaxonomy, type TaxonomyCategory } from "@/lib/business-taxonomy";

const MAX_CATEGORIES = 5;

type Status = "loading" | "form" | "pending" | "approved" | "rejected" | "error";

interface Answers {
  instagramUrl: string; instagramFollowers: string;
  tiktokUrl: string; tiktokFollowers: string;
  youtubeUrl: string; youtubeFollowers: string;
  twitterUrl: string; twitterFollowers: string;
  contentCategories: string[];
  contentOther: string;
  whyInfluencer: string;
}

const EMPTY: Answers = {
  instagramUrl: "", instagramFollowers: "", tiktokUrl: "", tiktokFollowers: "",
  youtubeUrl: "", youtubeFollowers: "", twitterUrl: "", twitterFollowers: "",
  contentCategories: [], contentOther: "", whyInfluencer: "",
};

const PLATFORMS: { key: "instagram" | "tiktok" | "youtube" | "twitter"; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "@yourname or link" },
  { key: "tiktok", label: "TikTok", placeholder: "@yourname or link" },
  { key: "youtube", label: "YouTube", placeholder: "@yourchannel or link" },
  { key: "twitter", label: "X", placeholder: "@yourname or link" },
];

export default function InfluencerApplyPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [a, setA] = useState<Answers>(EMPTY);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/influencer/application")
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401) { window.location.href = "/login?return=/influencer/apply"; return; }
        const data = await r.json().catch(() => null);
        if (!r.ok) { setStatus("error"); return; }
        const s = data?.application?.status;
        setStatus(s === "pending" || s === "approved" ? s : s === "rejected" ? "rejected" : "form");
      })
      .catch(() => !cancelled && setStatus("error"));
    fetch("/api/taxonomy/business-categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && isTaxonomy(data)) setCategories(data.categories); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((prev) => ({ ...prev, [k]: v }));

  function toggleCategory(code: string) {
    setA((prev) => {
      const has = prev.contentCategories.includes(code);
      if (!has && prev.contentCategories.length >= MAX_CATEGORIES) return prev;
      const next = has ? prev.contentCategories.filter((c) => c !== code) : [...prev.contentCategories, code];
      return { ...prev, contentCategories: next, contentOther: next.includes("other") ? prev.contentOther : "" };
    });
  }

  async function submit() {
    setError(null);
    if (!PLATFORMS.some((p) => a[`${p.key}Url`].trim())) {
      setError({ field: "socials", text: "Add at least one social media handle or link." });
      return;
    }
    if (a.contentCategories.includes("other") && !a.contentOther.trim()) {
      setError({ field: "contentOther", text: "Tell us what you post about when you pick Other." });
      return;
    }
    setSending(true);
    try {
      const body: Record<string, unknown> = {
        contentCategories: a.contentCategories,
        contentOther: a.contentCategories.includes("other") ? a.contentOther.trim() : undefined,
        whyInfluencer: a.whyInfluencer.trim() || undefined,
      };
      for (const p of PLATFORMS) {
        body[`${p.key}Url`] = a[`${p.key}Url`].trim() || undefined;
        body[`${p.key}Followers`] = a[`${p.key}Followers`].trim() || undefined;
      }
      const r = await fetch("/api/influencer/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) { window.location.href = "/login?return=/influencer/apply"; return; }
      if (!r.ok) {
        setError({ field: typeof data?.field === "string" ? data.field : undefined, text: (typeof data?.error === "string" && data.error) || "Something went wrong. Please try again." });
        return;
      }
      setStatus("pending");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError({ text: "Could not reach the server. Check your connection and try again." });
    } finally {
      setSending(false);
    }
  }

  const css = `
    .ia-page { max-width: 640px; margin: 0 auto; padding: 48px 16px 64px; color: #F5F0E6; font-family: 'Hanken Grotesk', 'Inter', sans-serif; }
    .ia-h1 { font-family: 'Bebas Neue', sans-serif; font-size: 40px; letter-spacing: 0.04em; color: #E8B930; margin: 0 0 8px; }
    .ia-sub { color: rgba(245,240,230,0.6); font-size: 15px; line-height: 1.5; margin: 0 0 28px; }
    .ia-card { background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08); border-radius: 12px; padding: 20px; margin-bottom: 18px; }
    .ia-card h2 { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.06em; color: #F5F0E6; margin: 0 0 4px; }
    .ia-hint { font-size: 13px; color: rgba(245,240,230,0.5); margin: 0 0 14px; }
    .ia-row { display: grid; grid-template-columns: 1fr 140px; gap: 10px; margin-bottom: 12px; }
    .ia-label { display: block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(245,240,230,0.45); margin-bottom: 6px; }
    .ia-input { width: 100%; box-sizing: border-box; background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.12); border-radius: 8px; color: #F5F0E6; font-family: inherit; font-size: 15px; padding: 10px 12px; outline: none; }
    .ia-input:focus { border-color: rgba(232,185,48,0.5); }
    .ia-input.err { border-color: #ff6b6b; }
    textarea.ia-input { min-height: 96px; resize: vertical; }
    .ia-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .ia-chip { padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(245,240,230,0.15); background: transparent; color: rgba(245,240,230,0.75); font-family: inherit; font-size: 13px; cursor: pointer; }
    .ia-chip.on { border-color: #E8B930; color: #E8B930; background: rgba(232,185,48,0.1); }
    .ia-chip:disabled { opacity: 0.4; cursor: not-allowed; }
    .ia-error { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 14px; color: #ff6b6b; }
    .ia-btn { width: 100%; font-family: inherit; font-size: 15px; font-weight: 700; padding: 13px 18px; border-radius: 8px; border: none; background: #E8B930; color: #000; cursor: pointer; }
    .ia-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .ia-state { text-align: center; padding: 40px 0; }
    .ia-state p { color: rgba(245,240,230,0.65); font-size: 15px; line-height: 1.6; }
    .ia-link { color: #E8B930; }
    @media (max-width: 480px) { .ia-row { grid-template-columns: 1fr; } }
  `;

  const shell = (body: React.ReactNode) => (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="ia-page">{body}</div>
    </>
  );

  if (status === "loading") return shell(<div className="ia-state"><p>Loading…</p></div>);
  if (status === "error") return shell(
    <div className="ia-state">
      <h1 className="ia-h1">Something went wrong</h1>
      <p>We couldn&apos;t load your application. Please try again in a moment.</p>
    </div>,
  );
  if (status === "pending" || status === "approved") return shell(
    <div className="ia-state" data-testid="ia-status">
      <h1 className="ia-h1">{status === "pending" ? "Application received" : "You're an Outsyde influencer"}</h1>
      <p>
        {status === "pending"
          ? "Thanks for applying to the Outsyde influencer program. We'll review your application and get back to you soon."
          : "Your application was approved. Open the Outsyde app to see your influencer dashboard."}
      </p>
      <p><Link href="/" className="ia-link">Back to Outsyde</Link></p>
    </div>,
  );

  const errFor = (f: string) => error?.field === f;

  return shell(
    <>
      <h1 className="ia-h1">Become an Outsyde influencer</h1>
      <p className="ia-sub">
        Partner with local businesses and get early access to new features.
        {status === "rejected" ? " Your last application wasn't approved, but you're welcome to apply again." : ""}
      </p>

      {error && <div className="ia-error" role="alert">{error.text}</div>}

      <div className="ia-card">
        <h2>Your socials</h2>
        <p className="ia-hint">Add at least one. Followers are optional, for example 12500 or 3.5k.</p>
        {PLATFORMS.map((p) => (
          <div className="ia-row" key={p.key}>
            <div>
              <label className="ia-label" htmlFor={`ia-${p.key}`}>{p.label}</label>
              <input id={`ia-${p.key}`} className={`ia-input${errFor("socials") || errFor(`${p.key}Url`) ? " err" : ""}`}
                value={a[`${p.key}Url`]} placeholder={p.placeholder} autoCapitalize="none" autoCorrect="off"
                onChange={(e) => set(`${p.key}Url`, e.target.value)} />
            </div>
            <div>
              <label className="ia-label" htmlFor={`ia-${p.key}-f`}>Followers</label>
              <input id={`ia-${p.key}-f`} className={`ia-input${errFor(`${p.key}Followers`) ? " err" : ""}`} inputMode="decimal"
                value={a[`${p.key}Followers`]} placeholder="0" onChange={(e) => set(`${p.key}Followers`, e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <div className="ia-card">
        <h2>What do you post about?</h2>
        <p className="ia-hint">Pick up to {MAX_CATEGORIES}.</p>
        {categories.length === 0 ? (
          <p className="ia-hint">Loading choices…</p>
        ) : (
          <div className="ia-chips">
            {categories.map((c) => {
              const on = a.contentCategories.includes(c.code);
              return (
                <button key={c.code} type="button" data-code={c.code} className={`ia-chip${on ? " on" : ""}`}
                  disabled={!on && a.contentCategories.length >= MAX_CATEGORIES} onClick={() => toggleCategory(c.code)}>
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
        {a.contentCategories.includes("other") && (
          <div style={{ marginTop: 14 }}>
            <label className="ia-label" htmlFor="ia-other">Tell us what you post about</label>
            <textarea id="ia-other" className={`ia-input${errFor("contentOther") ? " err" : ""}`} maxLength={500}
              value={a.contentOther} onChange={(e) => set("contentOther", e.target.value)} />
          </div>
        )}
      </div>

      <div className="ia-card">
        <h2>Why do you want to join?</h2>
        <p className="ia-hint">Tell us about your content and the businesses you&apos;d love to work with.</p>
        <textarea id="ia-why" className={`ia-input${errFor("whyInfluencer") ? " err" : ""}`} maxLength={2000}
          value={a.whyInfluencer} onChange={(e) => set("whyInfluencer", e.target.value)} />
      </div>

      <button className="ia-btn" onClick={submit} disabled={sending}>{sending ? "Sending…" : "Send application"}</button>
    </>,
  );
}
