"use client";

// app/subscription/page.tsx
// Web equivalent of the in-app "Subscription Plan" screen. A vendor logs in
// here and pays through Stripe Checkout directly — no Apple cut, since this
// never touches iOS in-app purchase. Keep this page's plan data flowing from
// /api/subscription/tiers (which mirrors the backend's subscriptionTiers
// table) rather than hardcoding prices here, so web and app can't drift.

import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2, LogIn, Zap } from "lucide-react";

interface Tier {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceInCents: number;
  features: string[];
  sortOrder: number;
}

const BADGE_BY_NAME: Record<string, { label: string; className: string } | undefined> = {
  growth: { label: "Most Popular", className: "bg-amber-400 text-black" },
  pro: { label: "Best Value", className: "bg-violet-500 text-white" },
};

const ACCENT_BY_NAME: Record<string, string> = {
  starter: "border-emerald-500",
  growth: "border-amber-400",
  pro: "border-violet-500",
};

const PRICE_COLOR_BY_NAME: Record<string, string> = {
  starter: "text-emerald-400",
  growth: "text-amber-400",
  pro: "text-violet-400",
};

export default function SubscriptionPage() {
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [selected, setSelected] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetch("/api/subscription/tiers")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load plans.");
        const sorted = [...(data.tiers as Tier[])].sort((a, b) => a.sortOrder - b.sortOrder);
        setTiers(sorted);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const res = await fetch("/api/subscription/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not log in.");
      setLoggedIn(true);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleSelectPlan() {
    if (!selected) return;
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      if (data.url) {
        window.location.href = data.url; // hand off to Stripe Checkout
        return;
      }
      if (data.tierChanged) {
        window.location.href = "/subscription?status=changed";
        return;
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-semibold">Subscription Plan</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Choose a plan to publish your products and services. You can
          upgrade or change plans at any time.
        </p>

        {!loggedIn && (
          <form
            onSubmit={handleLogin}
            className="mt-6 space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
          >
            <p className="text-sm text-neutral-400">
              Log in with your business account to manage your plan.
            </p>
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            {loginError && (
              <p className="text-sm text-red-400" role="alert">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loggingIn}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 py-2.5 text-sm font-medium hover:bg-neutral-700 disabled:opacity-50"
            >
              {loggingIn ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              Log in
            </button>
          </form>
        )}

        {loadError && (
          <p className="mt-6 text-sm text-red-400" role="alert">
            {loadError}
          </p>
        )}

        {!tiers && !loadError && (
          <div className="mt-8 flex justify-center text-neutral-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        )}

        {tiers && (
          <fieldset
            disabled={!loggedIn}
            className="mt-6 space-y-4 disabled:opacity-60"
          >
            {tiers.map((tier) => {
              const badge = BADGE_BY_NAME[tier.name];
              const isSelected = tier.id === selected;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelected(tier.id)}
                  className={`relative w-full rounded-2xl border p-5 text-left transition
                    ${isSelected ? ACCENT_BY_NAME[tier.name] ?? "border-neutral-500" : "border-neutral-800"}
                    bg-neutral-950 hover:border-neutral-600`}
                >
                  {badge && (
                    <span
                      className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  )}

                  <h2 className="text-lg font-semibold">{tier.displayName}</h2>
                  <p
                    className={`mt-0.5 text-lg font-semibold ${
                      PRICE_COLOR_BY_NAME[tier.name] ?? "text-white"
                    }`}
                  >
                    ${(tier.priceInCents / 100).toFixed(0)}
                    <span className="text-sm font-normal text-neutral-400">/mo</span>
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">{tier.description}</p>

                  <ul className="mt-3 space-y-1.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-neutral-300">
                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </fieldset>
        )}

        {checkoutError && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {checkoutError}
          </p>
        )}

        <button
          type="button"
          disabled={!loggedIn || !selected || checkingOut}
          onClick={handleSelectPlan}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-800 py-3.5 font-medium text-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-neutral-700"
        >
          {checkingOut ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Redirecting to checkout…
            </>
          ) : (
            <>
              <Zap size={16} /> Select a Plan
            </>
          )}
        </button>

        <a
          href="https://billing.stripe.com/p/login/your_billing_portal_link"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-800 py-3.5 font-medium text-amber-400 hover:bg-neutral-900"
        >
          <CreditCard size={16} /> Manage Billing
        </a>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Update payment method, download invoices, or cancel your plan.
        </p>
      </div>
    </div>
  );
}
