"use client";

// app/subscription/manage/page.tsx
// Vendor subscription management page — shows current plan, renewal date,
// and lets vendors switch plans or open the Stripe billing portal.
//
// Entry points:
//   1. Mobile app deep-link: /subscription/manage?from=app&token={jwt}
//      → the ?token= is exchanged for an httpOnly cookie via /api/subscription/set-token
//      → after cookie is set, behaves identically to the web-login flow
//   2. Direct web visit (already logged in via /api/subscription/login)
//      → reads outsyde_access_token cookie directly, no token param needed
//
// If no token param AND /api/subscription/status returns 401, redirects to /login.

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  CreditCard,
  Loader2,
  RefreshCw,
  Zap,
  CalendarClock,
  ChevronRight,
} from "lucide-react";

interface Tier {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceInCents: number;
  features: string[];
  sortOrder: number;
}

interface CurrentSubscription {
  id: string;
  tierId: string;
  tierName: string;
  tierDisplayName: string;
  priceInCents: number;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

const TIER_ACCENT: Record<string, string> = {
  starter: "text-emerald-400",
  growth: "text-amber-400",
  pro: "text-violet-400",
};

const TIER_BORDER_SELECTED: Record<string, string> = {
  starter:
    "border-emerald-500 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_0_24px_-4px_rgba(16,185,129,0.5)]",
  growth:
    "border-amber-400 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_0_24px_-4px_rgba(251,191,36,0.5)]",
  pro: "border-violet-500 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,92,246,0.4),0_0_24px_-4px_rgba(139,92,246,0.5)]",
};

function formatRenewalDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ManageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tokenReady, setTokenReady] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Step 1: if ?token= is present, exchange it for an httpOnly cookie
  useEffect(() => {
    const urlToken = searchParams.get("token");

    if (!urlToken) {
      // No token in URL — rely on existing cookie
      setTokenReady(true);
      return;
    }

    fetch("/api/subscription/set-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: urlToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || "Could not authenticate."
          );
        }
        setTokenReady(true);
      })
      .catch((err: unknown) => {
        setTokenError(
          err instanceof Error ? err.message : "Authentication failed."
        );
      });
  }, [searchParams]);

  // Step 2: once token is confirmed in cookie, load data
  useEffect(() => {
    if (!tokenReady) return;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [statusRes, tiersRes] = await Promise.all([
          fetch("/api/subscription/status"),
          fetch("/api/subscription/tiers"),
        ]);

        if (statusRes.status === 401) {
          router.push("/login");
          return;
        }

        const statusData = (await statusRes.json()) as {
          subscription?: CurrentSubscription;
          error?: string;
        };
        const tiersData = (await tiersRes.json()) as {
          tiers?: Tier[];
          error?: string;
        };

        if (!statusRes.ok) {
          throw new Error(statusData.error || "Could not load subscription.");
        }

        const sub = statusData.subscription ?? null;
        setCurrent(sub);
        setSelected(sub?.tierId ?? null);

        if (tiersRes.ok && Array.isArray(tiersData.tiers)) {
          const sorted = [...tiersData.tiers].sort(
            (a, b) => a.sortOrder - b.sortOrder
          );
          setTiers(sorted);
        }
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Could not load your plan."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tokenReady, router]);

  async function reloadStatus() {
    try {
      const res = await fetch("/api/subscription/status");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) return;
      const data = await res.json() as { subscription?: CurrentSubscription };
      setCurrent(data.subscription ?? null);
      setSelected(data.subscription?.tierId ?? null);
    } catch {
      // silent — current plan card stays visible
    }
  }

  async function handleChangePlan() {
    if (!selected || selected === current?.tierId) return;
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      const urlToken = searchParams.get("token");
const res = await fetch("/api/subscription/checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(urlToken ? { "x-auth-token": urlToken } : {}),
  },
  body: JSON.stringify({ tierId: selected }),
});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.tierChanged) {
        await reloadStatus();
      }
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/billing", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url)
        throw new Error(data.error || "Could not open billing portal.");
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Could not open billing portal."
      );
      setPortalLoading(false);
    }
  }

  // Token exchange failed
  if (tokenError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center space-y-4">
          <p className="text-red-400 text-sm" role="alert">
            {tokenError}
          </p>
          <a
            href="/login"
            className="inline-block rounded-xl bg-zinc-800 px-6 py-3 text-sm font-medium hover:bg-zinc-700"
          >
            Log in
          </a>
        </div>
      </div>
    );
  }

  // Waiting for token exchange
  if (!tokenReady || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-5 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <a
            href="/subscription"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Back to plans"
          >
            <ChevronRight size={18} className="rotate-180" />
          </a>
          <h1 className="text-2xl font-semibold">Manage Plan</h1>
        </div>
        <p className="text-sm text-zinc-400 mb-8 ml-7">
          Change your plan, update payment, or cancel.
        </p>

        {loadError && (
          <p className="text-sm text-red-400 mb-6" role="alert">
            {loadError}
          </p>
        )}

        {/* Current plan summary */}
        {current && (
          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
                  Current Plan
                </p>
                <p className="text-xl font-semibold">
                  {current.tierDisplayName || current.tierName}
                </p>
                <p
                  className={`text-lg font-semibold mt-0.5 ${
                    TIER_ACCENT[current.tierName?.toLowerCase()] ?? "text-white"
                  }`}
                >
                  ${(current.priceInCents / 100).toFixed(0)}
                  <span className="text-sm font-normal text-zinc-400">/mo</span>
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  current.status === "active"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : current.status === "past_due"
                      ? "bg-amber-400/15 text-amber-400"
                      : "bg-zinc-700 text-zinc-400"
                }`}
              >
                {current.status === "active"
                  ? "Active"
                  : current.status === "past_due"
                    ? "Past Due"
                    : current.status}
              </span>
            </div>

            {current.currentPeriodEnd && (
              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                <CalendarClock size={14} className="shrink-0" />
                {current.cancelAtPeriodEnd ? (
                  <span>
                    Cancels on{" "}
                    <span className="text-amber-400">
                      {formatRenewalDate(current.currentPeriodEnd)}
                    </span>
                  </span>
                ) : (
                  <span>
                    Renews on{" "}
                    <span className="text-white">
                      {formatRenewalDate(current.currentPeriodEnd)}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Plan picker */}
        {tiers && tiers.length > 0 && (
          <>
            <p className="text-sm text-zinc-400 mb-4">
              Select a plan to switch to:
            </p>
            <div className="space-y-3">
              {tiers.map((tier) => {
                const tierKey = tier.name.toLowerCase();
                const isSelected = tier.id === selected;
                const isCurrent = tier.id === current?.tierId;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelected(tier.id)}
                    className={`relative w-full rounded-2xl border p-5 text-left transition
                      ${isSelected ? (TIER_BORDER_SELECTED[tierKey] ?? "border-zinc-500") : "border-zinc-800"}
                      bg-zinc-900 hover:border-zinc-600`}
                  >
                    {isCurrent && (
                      <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
                        <Check size={11} /> Current
                      </span>
                    )}
                    <h2 className="text-base font-semibold">{tier.displayName}</h2>
                    <p
                      className={`mt-0.5 text-base font-semibold ${
                        TIER_ACCENT[tierKey] ?? "text-white"
                      }`}
                    >
                      ${(tier.priceInCents / 100).toFixed(0)}
                      <span className="text-sm font-normal text-zinc-400">/mo</span>
                    </p>
                    <ul className="mt-3 space-y-1">
                      {tier.features.slice(0, 3).map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-sm text-zinc-300"
                        >
                          <Check
                            size={14}
                            className="mt-0.5 shrink-0 text-emerald-500"
                          />
                          {f}
                        </li>
                      ))}
                      {tier.features.length > 3 && (
                        <li className="text-xs text-zinc-500 pl-5">
                          +{tier.features.length - 3} more
                        </li>
                      )}
                    </ul>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {checkoutError && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {checkoutError}
          </p>
        )}

        {/* Change plan button */}
        <button
          type="button"
          disabled={
            !selected || selected === current?.tierId || checkingOut
          }
          onClick={handleChangePlan}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-800 py-3.5 font-medium text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-zinc-700 transition-colors"
        >
          {checkingOut ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Redirecting…
            </>
          ) : !selected || selected === current?.tierId ? (
            <>
              <Zap size={16} /> Current Plan Selected
            </>
          ) : (
            <>
              <RefreshCw size={16} /> Switch to This Plan
            </>
          )}
        </button>

        {/* Billing portal button */}
        <button
          type="button"
          onClick={handleBillingPortal}
          disabled={portalLoading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-800 py-3.5 font-medium text-amber-400 hover:bg-zinc-900 disabled:opacity-50 transition-colors"
        >
          {portalLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CreditCard size={16} />
          )}
          Manage Billing &amp; Payment
        </button>
        <p className="mt-2 text-center text-xs text-zinc-500">
          Update payment method, download invoices, or cancel your plan.
        </p>
      </div>
    </div>
  );
}

export default function ManagePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      }
    >
      <ManageContent />
    </Suspense>
  );
}
