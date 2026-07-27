'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plan, PLAN_SECTIONS } from '@/lib/types/subscription'
import { FeatureRow } from './FeatureRow'

interface PlanCardProps {
  plan: Plan
  isCurrent?: boolean
  isOnboarding?: boolean
  isSelected?: boolean
  onSelect?: (planId: string) => void
}

// Auth state resolved once per page load — shared across all PlanCard instances
// via module-level cache so we only hit /api/auth/me once, not three times.
type AuthState = { authenticated: boolean; isVendor: boolean } | null
let _authCache: AuthState = null
let _authPromise: Promise<AuthState> | null = null

function resolveAuth(): Promise<AuthState> {
  if (_authCache !== null) return Promise.resolve(_authCache)
  if (_authPromise) return _authPromise
  _authPromise = fetch('/api/auth/me')
    .then(r => r.json())
    .then((d: { authenticated?: boolean; isVendor?: boolean }) => {
      _authCache = { authenticated: !!d.authenticated, isVendor: !!d.isVendor }
      return _authCache
    })
    .catch(() => {
      _authCache = { authenticated: false, isVendor: false }
      return _authCache
    })
  return _authPromise
}

const STYLES: Record<string, { border: string; cta: string; ctaText: string; badgeBg: string; badgeText: string }> = {
  starter: { border: 'border-zinc-700', cta: 'bg-zinc-800 hover:bg-zinc-700', ctaText: 'text-zinc-200', badgeBg: '', badgeText: '' },
  growth:  { border: 'border-green-500', cta: 'bg-green-500 hover:bg-green-400', ctaText: 'text-black', badgeBg: 'bg-green-950', badgeText: 'text-green-400' },
  pro:     { border: 'border-purple-600', cta: 'bg-purple-600 hover:bg-purple-500', ctaText: 'text-white', badgeBg: 'bg-purple-950', badgeText: 'text-purple-300' },
}

export function PlanCard({ plan, isCurrent = false, isOnboarding = false, isSelected = false, onSelect }: PlanCardProps) {
  const router = useRouter()
  const s = STYLES[plan.id]
  const highlighted = plan.id === 'growth' || isSelected

  const [auth, setAuth] = useState<AuthState>(null)

  useEffect(() => {
    // Skip the auth check when this card is used inside the onboarding flow —
    // onboarding already gates on auth before rendering PlanCard.
    if (isOnboarding) return
    resolveAuth().then(setAuth)
  }, [isOnboarding])

  const handleCta = () => {
    // ── Onboarding mode: delegate to parent ──────────────────────────────
    if (isOnboarding && onSelect) { onSelect(plan.id); return }
    if (isCurrent) return

    // ── Auth not yet resolved: wait (button shows spinner) ───────────────
    if (auth === null) return

    // ── Signed in as a vendor → go straight to /subscription/manage ─────
    // Pre-select the chosen tier via query param so the manage page lands
    // on the right plan without the user having to re-click.
    if (auth.authenticated && auth.isVendor) {
      router.push(`/subscription/manage?tier=${plan.id}`)
      return
    }

    // ── Signed in but NOT a vendor (consumer / photographer) ────────────
    // They need a business account to subscribe. Send them to the business
    // sign-up page with a return URL so they land back here after registering.
    if (auth.authenticated && !auth.isVendor) {
      router.push(`/business-signup?return=/subscription`)
      return
    }

    // ── Not signed in at all ─────────────────────────────────────────────
    // Send to /login. After login the app currently redirects to "/", but
    // we append ?return= so future login improvements can honour it.
    router.push(`/login?return=/subscription`)
  }

  // Button label adapts to auth state
  const ctaLabel = isCurrent
    ? '✓ Current plan'
    : isOnboarding
      ? (isSelected ? '✓ Selected' : 'Select plan')
      : auth === null && !isOnboarding
        ? 'Get started'           // still resolving — show neutral text
        : auth?.authenticated && auth.isVendor
          ? 'Switch to this plan'
          : 'Get started'

  return (
    <div
      className={`relative flex flex-col rounded-xl bg-zinc-900 p-5 transition-all duration-200 ${highlighted ? `border-2 ${s.border}` : 'border border-zinc-700'} ${isOnboarding && !isSelected ? 'cursor-pointer hover:border-zinc-500' : ''}`}
      onClick={isOnboarding && onSelect ? handleCta : undefined}
    >
      {plan.badge && !isCurrent && (
        <span className={`absolute top-4 right-4 text-[10px] font-semibold px-2.5 py-1 rounded-full ${s.badgeBg} ${s.badgeText}`}>
          {plan.badge}
        </span>
      )}
      {isCurrent && (
        <span className="absolute top-4 right-4 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-zinc-700 text-zinc-300">
          ✓ Current plan
        </span>
      )}

      <h3 className="text-base font-semibold text-white mb-1">{plan.name}</h3>
      <div className="mb-1">
        <span className="text-3xl font-semibold" style={{ color: plan.accentColor }}>${plan.price}</span>
        <span className="text-sm text-zinc-500">/mo</span>
      </div>
      <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{plan.tagline}</p>

      <button
        onClick={handleCta}
        disabled={isCurrent}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition-all mb-5 ${isCurrent ? 'bg-zinc-800 text-zinc-500 cursor-default' : `${s.cta} ${s.ctaText}`}`}
      >
        {ctaLabel}
      </button>

      {PLAN_SECTIONS.map((section) => {
        const [start, end] = section.range
        const feats = plan.features.slice(start, end + 1)
        return (
          <div key={section.heading} className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[9px] uppercase tracking-widest font-semibold text-zinc-500">{section.heading}</p>
              {section.comingSoon && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-950 text-indigo-400">Coming soon</span>
              )}
            </div>
            {feats.map((feat) => (
              <FeatureRow key={feat.label} label={feat.label} included={feat.included} note={feat.note} accentColor={plan.accentColor} />
            ))}
            <div className="border-t border-zinc-800 mt-2" />
          </div>
        )
      })}
    </div>
  )
}