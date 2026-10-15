// app/finish/page.tsx
// Finish-your-setup checklist — /finish (signed in; middleware sends signed-out visitors to
// /login?return=/finish). Linked from setup reminder emails, the plan success page and Stripe
// returns (?stripe=done | ?stripe=refresh).
//
// Steps come from GET /api/account-setup/status — the same list the app and the reminder emails
// use — so this page never decides on its own what's missing:
//   password · approval (business, waiting only) · plan (business) · payouts (business,
//   photographer, staff) · username
//
// Actions:
//   plan     → /subscription (checkout returns to /subscription/success → "Continue setup" → here)
//   payouts  → business:     POST /api/vendor-dashboard/stripe/create-link      { returnTo: "finish" }
//              photographer: POST /api/photographer/me/stripe-onboarding        { returnTo: "finish" }
//              staff:        POST /api/account-setup/staff-payouts              (409 → pick a business)
//   username → POST /api/account-setup/username (live check via /api/accept-invite/check-username)

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type StepKey = "password" | "username" | "approval" | "plan" | "payouts";
type StepState = "done" | "todo" | "waiting";
type Role = "consumer" | "business" | "photographer" | "staff";
type Step = { key: StepKey; state: StepState; label: string };
type Status = { role: Role; complete: boolean; next: StepKey | null; steps: Step[] };
type StaffBusiness = { businessId: string; displayName?: string | null };
type UsernameCheck = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

const APP_STORE_URL = "https://apps.apple.com/app/outsyde/id6738926870";
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const DONE_LABEL: Record<StepKey, string> = {
  password: "Password set",
  username: "Username picked",
  approval: "Business approved",
  plan: "Plan chosen",
  payouts: "Payouts connected",
};

const DASHBOARD: Record<Role, { href: string; label: string }> = {
  business: { href: "/vendor-dashboard", label: "Go to your dashboard" },
  photographer: { href: "/photographer-dashboard", label: "Go to your dashboard" },
  staff: { href: "/", label: "Keep exploring" },
  consumer: { href: "/", label: "Keep exploring" },
};

function FinishFlow() {
  const searchParams = useSearchParams();
  const stripeParam = searchParams.get("stripe"); // "done" | "refresh" | null

  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(
    stripeParam === "done"
      ? "Welcome back from Stripe. Checking your payouts…"
      : stripeParam === "refresh"
        ? "That Stripe link expired. Tap “Continue to Stripe” to pick up where you left off."
        : "",
  );
  const [staffChoices, setStaffChoices] = useState<StaffBusiness[] | null>(null);
  const [username, setUsername] = useState("");
  const [remoteCheck, setRemoteCheck] = useState<{ name: string; state: "available" | "taken" | "error" } | null>(null);

  const load = useCallback(async (): Promise<Status | null> => {
    setLoadError("");
    try {
      const res = await fetch("/api/account-setup/status", { cache: "no-store" });
      if (res.status === 401) {
        window.location.assign("/login?return=/finish");
        return null;
      }
      const data = (await res.json().catch(() => ({}))) as Partial<Status> & { error?: string };
      if (!res.ok || !Array.isArray(data.steps)) {
        setLoadError(data.error || "Couldn’t load your setup steps. Please try again.");
        return null;
      }
      const s = data as Status;
      setStatus(s);
      return s;
    } catch {
      setLoadError("Couldn’t reach the server. Please try again.");
      return null;
    }
  }, []);

  // First load; drop ?stripe= from the address bar so a refresh doesn't repeat the message.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await load();
      if (cancelled || !s) return;
      if (stripeParam === "done") {
        const payouts = s.steps.find((x) => x.key === "payouts");
        setNotice(
          payouts?.state === "done"
            ? "Payouts connected. Nice work."
            : "Stripe hasn’t confirmed yet. If you finished, tap “I already finished on Stripe” in a minute.",
        );
      }
      if (stripeParam) window.history.replaceState(null, "", "/finish");
    })();
    return () => {
      cancelled = true;
    };
  }, [load, stripeParam]);

  // A name for the heading: the business name for businesses, otherwise the first name.
  useEffect(() => {
    if (!status) return;
    let cancelled = false;
    (async () => {
      try {
        if (status.role === "business") {
          const r = await fetch("/api/vendor-dashboard/profile");
          const d = (await r.json().catch(() => ({}))) as { business?: { name?: string } };
          if (!cancelled && r.ok && d.business?.name) return setName(d.business.name);
        }
        const r = await fetch("/api/auth/me");
        const d = (await r.json().catch(() => ({}))) as { firstName?: string; user?: { firstName?: string } };
        const first = d.firstName || d.user?.firstName;
        if (!cancelled && r.ok && first) setName(first);
      } catch {
        // heading works without a name
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Live username availability (debounced). "idle"/"invalid"/"checking" are derived, not stored.
  const trimmed = username.trim();
  const usernameValid = USERNAME_RE.test(trimmed);
  const usernameCheck: UsernameCheck = !trimmed
    ? "idle"
    : !usernameValid
      ? "invalid"
      : remoteCheck?.name === trimmed
        ? remoteCheck.state
        : "checking";

  useEffect(() => {
    if (!usernameValid) return;
    const candidate = trimmed;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/accept-invite/check-username?username=${encodeURIComponent(candidate)}`);
        const data = (await res.json().catch(() => ({}))) as { available?: boolean };
        if (!cancelled) setRemoteCheck({ name: candidate, state: !res.ok ? "error" : data.available ? "available" : "taken" });
      } catch {
        if (!cancelled) setRemoteCheck({ name: candidate, state: "error" });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmed, usernameValid]);

  async function checkAgain() {
    setActionError("");
    setChecking(true);
    const s = await load();
    setChecking(false);
    if (s) {
      const payouts = s.steps.find((x) => x.key === "payouts");
      setNotice(payouts?.state === "done" ? "Payouts connected. Nice work." : "Stripe hasn’t confirmed your payouts yet. Finish the Stripe steps, then check again.");
    }
  }

  async function startPayouts(businessId?: string) {
    if (!status) return;
    setActionError("");
    setBusy(true);
    try {
      const url =
        status.role === "business"
          ? "/api/vendor-dashboard/stripe/create-link"
          : status.role === "photographer"
            ? "/api/photographer/me/stripe-onboarding"
            : "/api/account-setup/staff-payouts";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "finish", ...(businessId ? { businessId } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string | { message?: string };
        businesses?: StaffBusiness[];
      };
      if (res.ok && typeof data.url === "string") {
        window.location.assign(data.url);
        return;
      }
      if (res.status === 409 && Array.isArray(data.businesses) && data.businesses.length > 0) {
        setStaffChoices(data.businesses);
        return;
      }
      if (res.status === 401) {
        window.location.assign("/login?return=/finish");
        return;
      }
      const msg = typeof data.error === "string" ? data.error : data.error?.message;
      setActionError(msg || "Couldn’t start Stripe. Please try again.");
    } catch {
      setActionError("Couldn’t reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    setActionError("");
    if (!usernameValid) {
      setActionError("Use 3–20 lowercase letters, numbers or underscores.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account-setup/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (res.ok) {
        setUsername("");
        await load();
        return;
      }
      if (data.code === "USERNAME_TAKEN") setRemoteCheck({ name: trimmed, state: "taken" });
      if (data.code === "ALREADY_SET") {
        await load();
        return;
      }
      setActionError(data.error || "Couldn’t save your username.");
    } catch {
      setActionError("Couldn’t reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────
  const steps = status?.steps ?? [];
  const doneCount = steps.filter((s) => s.state === "done").length;
  const todoCount = steps.filter((s) => s.state === "todo").length;
  const waitingOnly = !!status && todoCount === 0 && !status.complete;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const who = name ? `, ${name}` : "";

  let heading: React.ReactNode = "Finish your setup";
  if (status?.complete) heading = <>You&rsquo;re all set<span>{who}</span></>;
  else if (waitingOnly) heading = <>Almost there<span>{who}</span></>;
  else if (todoCount === 1) heading = <>One step left<span>{who}</span></>;
  else if (todoCount > 1) heading = <>{todoCount} steps left<span>{who}</span></>;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <main className="bs-wrap">
        <div className="bs-bg" aria-hidden="true" />
        <div className="bs-veil" aria-hidden="true" />

        <div className="bs-inner">
          <Link href="/" className="bs-logo" aria-label="Go OutsYde home">
            <span className="bs-y" aria-hidden="true">Y</span>
            <span className="bs-word">Go OutsYde</span>
          </Link>

          <p className="bs-eyebrow">{status?.complete ? "Setup complete" : "Finish your setup"}</p>
          <h1 className="bs-h1">{heading}</h1>

          {status && !status.complete && (
            <div className="fs-progress" aria-label={`${doneCount} of ${steps.length} steps done`}>
              <div className="fs-track"><div className="fs-fill" style={{ width: `${pct}%` }} /></div>
              <span>{doneCount} of {steps.length}</span>
            </div>
          )}

          {notice && <p className="fs-notice" role="status">{notice}</p>}

          {!status && !loadError && <p className="bs-sub" role="status">Loading your steps&hellip;</p>}
          {loadError && (
            <div className="bs-card">
              <p className="bs-err" role="alert">{loadError}</p>
              <button type="button" className="bs-submit" onClick={() => void load()}>Try again</button>
            </div>
          )}

          {status && status.complete && (
            <div className="bs-card">
              <p className="fs-text">Everything&rsquo;s done. You can sign in on the app with your email or username.</p>
              <Link className="bs-submit fs-btn-link" href={DASHBOARD[status.role].href}>{DASHBOARD[status.role].label}</Link>
              <a className="fs-ghost" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Get the app</a>
            </div>
          )}

          {status && !status.complete && (
            <ol className="fs-list">
              {steps.map((s) => {
                const isNext = s.key === status.next;
                if (s.state === "done") {
                  return (
                    <li key={s.key} className="fs-row done">
                      <span className="fs-dot done" aria-hidden="true">&#10003;</span>
                      <span className="fs-row-label">{DONE_LABEL[s.key]}</span>
                      {s.key === "plan" && <Link className="fs-mini" href="/subscription">Change</Link>}
                    </li>
                  );
                }
                if (s.state === "waiting") {
                  return (
                    <li key={s.key} className="fs-row waiting">
                      <span className="fs-dot waiting" aria-hidden="true">&hellip;</span>
                      <span className="fs-row-label">
                        Business approval
                        <small>We&rsquo;re reviewing your business and will email you when it&rsquo;s approved.</small>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={s.key} className={`fs-row todo${isNext ? " next" : ""}`}>
                    <div className="fs-row-head">
                      <span className={`fs-dot${isNext ? " next" : ""}`} aria-hidden="true">{steps.indexOf(s) + 1}</span>
                      <span className="fs-row-label strong">{s.label}</span>
                    </div>

                    {s.key === "plan" && (
                      <div className="fs-body">
                        <p className="fs-text">Pick the plan that fits. Customers can book and buy from you once it&rsquo;s active. You can switch any time.</p>
                        <Link className={isNext ? "bs-submit fs-btn-link" : "fs-ghost"} href="/subscription">Choose your plan</Link>
                      </div>
                    )}

                    {s.key === "payouts" && (
                      <div className="fs-body">
                        <p className="fs-text">Stripe is the secure service that sends your booking money to your bank. You&rsquo;ll leave Outsyde for a few minutes, then come right back here.</p>
                        {isNext && (
                          <div className="fs-ready">
                            <p className="fs-kicker">Have these ready</p>
                            <ul>
                              <li>Your legal name and date of birth</li>
                              <li>Your bank account and routing number</li>
                              <li>Last 4 digits of your SSN (or your EIN)</li>
                            </ul>
                          </div>
                        )}
                        {staffChoices ? (
                          <div className="fs-choices">
                            <p className="fs-kicker">Which business is this for?</p>
                            {staffChoices.map((b) => (
                              <button key={b.businessId} type="button" className="fs-ghost" disabled={busy} onClick={() => void startPayouts(b.businessId)}>
                                {b.displayName || "Your staff profile"}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button type="button" className={isNext ? "bs-submit" : "fs-ghost"} disabled={busy} onClick={() => void startPayouts()}>
                            {busy ? "Opening Stripe…" : "Continue to Stripe"}
                          </button>
                        )}
                        <button type="button" className="fs-link" disabled={checking} onClick={() => void checkAgain()}>
                          {checking ? "Checking…" : "I already finished on Stripe — check again"}
                        </button>
                      </div>
                    )}

                    {s.key === "username" && (
                      <form className="fs-body" onSubmit={saveUsername} noValidate>
                        <p className="fs-text">It&rsquo;s how people find you in search, and you can sign in with it too.</p>
                        <div className="bs-field">
                          <label htmlFor="fs-un">Username</label>
                          <div className={`fs-un ${usernameCheck}`}>
                            <span aria-hidden="true">@</span>
                            <input id="fs-un" type="text" value={username} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/^@/, "").replace(/\s/g, ""))}
                              placeholder="yourname" maxLength={20} aria-describedby="fs-un-state" />
                          </div>
                          <span id="fs-un-state" className={`fs-un-state ${usernameCheck}`} aria-live="polite">
                            {usernameCheck === "checking" && "Checking…"}
                            {usernameCheck === "available" && "✓ Available"}
                            {usernameCheck === "taken" && "Taken — try another"}
                            {usernameCheck === "invalid" && "3–20 lowercase letters, numbers or _"}
                            {usernameCheck === "error" && "Couldn’t check right now — you can still save"}
                          </span>
                        </div>
                        <button type="submit" className={isNext ? "bs-submit" : "fs-ghost"}
                          disabled={busy || usernameCheck === "taken" || usernameCheck === "invalid" || !trimmed}>
                          {busy ? "Saving…" : "Save username"}
                        </button>
                      </form>
                    )}

                    {s.key === "password" && (
                      <div className="fs-body">
                        <p className="fs-text">Set a password so you can sign in on the website and the app.</p>
                        <Link className="bs-submit fs-btn-link" href="/forgot-password">Set a password</Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {actionError && <p className="bs-err fs-err" role="alert">{actionError}</p>}

          <p className="fs-help">Need help? <a href="mailto:info@goutsyde.com">info@goutsyde.com</a></p>
        </div>
      </main>
    </>
  );
}

export default function FinishPage() {
  return (
    <Suspense fallback={null}>
      <FinishFlow />
    </Suspense>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{
  --black:#000000; --gold:#E8B930; --cream:#F5F0E6;
  --emerald:#1A3C34; --emerald-light:#244e44; --off-black:#04100d;
  --serif:'Bebas Neue',Impact,sans-serif; --sans:'Hanken Grotesk',system-ui,sans-serif;
}
body{font-family:var(--sans);background:var(--black);color:var(--cream);overflow-x:hidden;}

.bs-wrap{position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:56px 16px;overflow:hidden;}
.bs-bg{position:absolute;inset:0;background:var(--off-black);overflow:hidden;z-index:0;}
.bs-bg::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 70% 65% at 22% 58%,rgba(26,60,52,.9) 0%,transparent 52%),radial-gradient(ellipse 55% 45% at 78% 22%,rgba(232,185,48,.1) 0%,transparent 48%),radial-gradient(ellipse 60% 70% at 62% 85%,rgba(26,60,52,.55) 0%,transparent 52%),#04100d;}
.bs-veil{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3),rgba(0,0,0,.72));z-index:1;}
.bs-inner{position:relative;z-index:2;max-width:440px;width:100%;}

.bs-logo{display:inline-flex;align-items:center;gap:12px;margin-bottom:28px;text-decoration:none;}
.bs-y{width:42px;height:42px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:24px;color:var(--black);}
.bs-word{font-family:var(--serif);font-size:22px;letter-spacing:.16em;color:var(--cream);text-transform:uppercase;}

.bs-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;}
.bs-h1{font-family:var(--serif);font-weight:400;font-size:clamp(34px,6vw,44px);line-height:1.02;letter-spacing:.03em;color:var(--cream);margin-bottom:16px;text-transform:uppercase;overflow-wrap:anywhere;}
.bs-h1 span{color:var(--gold);}
.bs-sub{font-size:14px;line-height:1.65;color:rgba(245,240,230,.7);margin:0 auto 24px;}

.fs-progress{display:flex;align-items:center;gap:10px;margin:0 0 18px;font-size:12px;color:rgba(245,240,230,.75);}
.fs-track{flex:1;height:6px;border-radius:3px;background:rgba(245,240,230,.14);overflow:hidden;}
.fs-fill{height:6px;background:var(--gold);}
.fs-notice{margin:0 0 16px;padding:12px 14px;border-radius:8px;background:rgba(26,60,52,.55);border:1px solid rgba(127,216,168,.35);font-size:13px;line-height:1.55;text-align:left;color:var(--cream);}

.bs-card{background:rgba(255,255,255,.05);border:1px solid rgba(245,240,230,.12);border-radius:8px;padding:24px 20px;text-align:left;display:flex;flex-direction:column;gap:12px;}

.fs-list{list-style:none;display:flex;flex-direction:column;gap:10px;text-align:left;}
.fs-row{display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(245,240,230,.1);}
.fs-row.todo{flex-direction:column;align-items:stretch;gap:12px;}
.fs-row.next{background:rgba(255,255,255,.06);border-color:var(--gold);padding:18px 16px;}
.fs-row-head{display:flex;gap:12px;align-items:center;}
.fs-row-label{flex:1;font-size:14px;color:rgba(245,240,230,.7);display:flex;flex-direction:column;gap:3px;}
.fs-row-label.strong{color:var(--cream);font-size:15px;font-weight:700;}
.fs-row-label small{font-size:12px;line-height:1.5;color:rgba(245,240,230,.6);}
.fs-dot{flex:none;width:26px;height:26px;border-radius:50%;border:1.5px solid var(--gold);color:var(--gold);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
.fs-dot.next{background:var(--gold);color:#000;}
.fs-dot.done{background:var(--emerald);border-color:var(--emerald);color:var(--gold);font-size:13px;}
.fs-dot.waiting{border-style:dashed;border-color:rgba(245,240,230,.4);color:rgba(245,240,230,.6);}
.fs-mini{font-size:12px;color:var(--gold);padding:8px 0;min-height:36px;display:inline-flex;align-items:center;}

.fs-body{display:flex;flex-direction:column;gap:12px;}
.fs-text{font-size:13px;line-height:1.6;color:rgba(245,240,230,.78);}
.fs-kicker{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.6);margin-bottom:6px;}
.fs-ready ul{list-style:disc;padding-left:18px;display:flex;flex-direction:column;gap:4px;font-size:13px;color:rgba(245,240,230,.85);}
.fs-choices{display:flex;flex-direction:column;gap:8px;}

.bs-field{display:flex;flex-direction:column;gap:6px;}
.bs-field label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.6);}
.fs-un{display:flex;align-items:center;background:rgba(0,0,0,.35);border:1px solid rgba(245,240,230,.16);border-radius:4px;padding:0 12px;}
.fs-un:focus-within{border-color:var(--gold);}
.fs-un.available{border-color:#5fbf8f;}
.fs-un.taken,.fs-un.invalid{border-color:#ff8f8f;}
.fs-un span{color:rgba(245,240,230,.55);font-size:16px;}
.fs-un input{flex:1;min-width:0;background:transparent;border:none;color:var(--cream);padding:12px 4px;font-family:var(--sans);font-size:16px;outline:none;}
.fs-un input::placeholder{color:rgba(245,240,230,.35);}
.fs-un-state{font-size:12px;min-height:18px;color:rgba(245,240,230,.6);}
.fs-un-state.available{color:#7fd8a8;}
.fs-un-state.taken,.fs-un-state.invalid{color:#ff8f8f;}

.bs-submit{display:block;width:100%;padding:14px;min-height:48px;background:var(--gold);color:var(--black);border:none;border-radius:4px;font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;text-align:center;text-decoration:none;transition:background .2s,opacity .2s;}
.bs-submit:hover:not(:disabled){background:#f2c835;}
.bs-submit:disabled{opacity:.55;cursor:not-allowed;}
.fs-btn-link{line-height:20px;}
.fs-ghost{display:block;width:100%;text-align:center;background:transparent;border:1px solid rgba(245,240,230,.3);color:var(--cream);text-decoration:none;padding:13px;border-radius:4px;font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;min-height:46px;cursor:pointer;}
.fs-ghost:hover:not(:disabled){border-color:var(--gold);color:var(--gold);}
.fs-ghost:disabled{opacity:.55;cursor:not-allowed;}
.fs-link{background:none;border:none;color:rgba(245,240,230,.8);font-family:var(--sans);font-size:13px;text-decoration:underline;text-underline-offset:3px;min-height:44px;cursor:pointer;}
.fs-link:disabled{opacity:.6;cursor:default;}

.bs-err{font-size:13px;color:#ff8f8f;line-height:1.5;}
.fs-err{margin-top:14px;text-align:left;}
.fs-help{margin-top:22px;font-size:12px;line-height:1.6;color:rgba(245,240,230,.6);}
.fs-help a{color:var(--gold);}
`;
