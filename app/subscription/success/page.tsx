"use client";

// app/subscription/success/page.tsx
// Shown after Stripe Checkout completes. Reads ?plan= from the URL, calls
// /api/subscription/status to confirm the plan is active, then presents a
// "Return to app" button that fires the outsyde:// deep link.
//
// Deep link behaviour:
//   - Tapping the button calls window.location.href = "outsyde://dashboard"
//   - If the deep link doesn't open the app (browser stays visible after 2 s),
//     the button is replaced with a plain message: "Return to the Outsyde app
//     on your device" — no external link, because the app is not yet on any
//     store.

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";

interface CurrentSubscription {
  id: string;
  tierId: string;
  tierName: string;
  tierDisplayName: string;
  priceInCents: number;
  status: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan") ?? "";

  const [confirming, setConfirming] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [sub, setSub] = useState<CurrentSubscription | null>(null);

  // deep-link state: idle → tapped → failed (stayed in browser > 2 s)
  const [deepLinkState, setDeepLinkState] = useState<"idle" | "tapped" | "failed">("idle");

  useEffect(() => {
    async function confirmPlan() {
      try {
        const res = await fetch("/api/subscription/status");
        if (res.status === 401) {
          setConfirmError("Session expired. Please return to the app and log in again.");
          return;
        }
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error || "Could not confirm your plan.");
        }
        const data = (await res.json()) as { subscription?: CurrentSubscription; error?: string };
        const subscription = data.subscription ?? null;
        setSub(subscription);
        if (subscription && subscription.status === "active") {
          setConfirmed(true);
        } else {
          setConfirmError("Your subscription is not active yet. Please allow a few moments and refresh.");
        }
      } catch (err) {
        setConfirmError(err instanceof Error ? err.message : "Could not confirm your plan.");
      } finally {
        setConfirming(false);
      }
    }

    confirmPlan();
  }, []);

  function handleReturnToApp() {
    setDeepLinkState("tapped");
    window.location.href = "outsyde://dashboard";

    // If the browser is still visible after 2 s the deep link didn't fire
    const timer = setTimeout(() => {
      setDeepLinkState("failed");
    }, 2000);

    // If the page hides (app opened), clear the timer so we don't flip state
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  const displayName =
    sub?.tierDisplayName ||
    sub?.tierName ||
    (planParam ? decodeURIComponent(planParam) : "your plan");

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-5">
      <div className="max-w-sm w-full text-center space-y-6">

        {/* Confirming */}
        {confirming && (
          <>
            <Loader2 size={32} className="animate-spin text-zinc-500 mx-auto" />
            <p className="text-sm text-zinc-400">Confirming your subscription…</p>
          </>
        )}

        {/* Error */}
        {!confirming && confirmError && (
          <>
            <p className="text-sm text-red-400" role="alert">{confirmError}</p>
            <a
              href="/subscription"
              className="inline-block rounded-xl bg-zinc-800 px-6 py-3 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Back to plans
            </a>
          </>
        )}

        {/* Confirmed */}
        {!confirming && confirmed && (
          <>
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 size={48} className="text-emerald-400" />
              <h1 className="text-2xl font-semibold">You&rsquo;re all set!</h1>
              <p className="text-sm text-zinc-400">
                <span className="text-white font-medium">{displayName}</span> is now active.
              </p>
            </div>

            {/* Return to app area */}
            {deepLinkState === "idle" && (
              <button
                type="button"
                onClick={handleReturnToApp}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22c55e] py-3.5 font-medium text-black hover:opacity-90 transition-opacity"
              >
                <Smartphone size={16} />
                Return to Outsyde App
              </button>
            )}

            {deepLinkState === "tapped" && (
              <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-800 py-3.5 text-sm text-zinc-400">
                <Loader2 size={16} className="animate-spin" />
                Opening app…
              </div>
            )}

            {deepLinkState === "failed" && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 space-y-1">
                <p className="text-sm text-zinc-300 font-medium">Return to the Outsyde app on your device</p>
                <p className="text-xs text-zinc-500">You can close this tab.</p>
              </div>
            )}

            <a
              href="/subscription/manage"
              className="block text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Manage your subscription
            </a>
          </>
        )}

      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
