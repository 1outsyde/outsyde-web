'use client'
import { useEffect, useState } from 'react'
import { AlaCarteSection } from '@/components/subscription/AlaCarteSection'

interface Tier {
  id: string
  name: string
  displayName: string
  description: string | null
  priceInCents: number
  features: string[]
  sortOrder: number
  isActive: boolean
}

const ACCENT: Record<string, string> = {
  starter: '#22c55e',
  growth:  '#22c55e',
  pro:     '#a78bfa',
}

const CTA_CLASS: Record<string, string> = {
  starter: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
  growth:  'bg-green-500 hover:bg-green-400 text-black',
  pro:     'bg-purple-600 hover:bg-purple-500 text-white',
}

const BORDER_CLASS: Record<string, string> = {
  starter: 'border border-zinc-700',
  growth:  'border-2 border-green-500',
  pro:     'border-2 border-purple-600',
}

export default function SubscriptionPage() {
  const [tiers, setTiers] = useState<Tier[] | null>(null)
  const [currentTierName, setCurrentTierName] = useState<string | null>(null)
  const [authed, setAuthed] = useState<boolean>(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/subscription/tiers').then(r => r.json()).catch(() => ({ tiers: [] })),
      fetch('/api/subscription/status').then(r => {
        if (r.status === 401) return { subscription: null, _authed: false }
        return r.json().then((d: object) => ({ ...d, _authed: true })).catch(() => ({ subscription: null, _authed: false }))
      }),
    ]).then(([tiersData, statusData]) => {
      const tierName: string | null = (statusData as { subscription?: { tierName?: string } }).subscription?.tierName ?? null
      const loggedIn: boolean = (statusData as { _authed?: boolean })._authed ?? false
      setCurrentTierName(tierName)
      setAuthed(loggedIn)
      const filtered: Tier[] = ((tiersData as { tiers?: Tier[] }).tiers ?? [])
        .filter((t: Tier) => t.isActive && (t.name !== 'grandfathered' || t.name === tierName))
        .sort((a: Tier, b: Tier) => a.sortOrder - b.sortOrder)
      setTiers(filtered)
    })
  }, [])

  function handleSelect(tier: Tier) {
    if (tier.name === 'grandfathered') return
    if (!authed) {
      window.location.href = '/login?return=/subscription'
      return
    }
    window.location.href = `/subscription/manage?tier=${tier.id}`
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-white mb-2">Subscription plan</h1>
          <p className="text-zinc-400 text-sm mb-4">
            Choose a plan to publish your products and services. Upgrade or change at any time.
          </p>
        </div>

        {tiers === null ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-xl bg-zinc-900 border border-zinc-700 p-5 animate-pulse h-64" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tiers.map(tier => {
              const isCurrent = tier.name === currentTierName
              const isGrandfathered = tier.name === 'grandfathered'
              const accent = ACCENT[tier.name] ?? '#ffffff'
              const borderClass = BORDER_CLASS[tier.name] ?? 'border border-zinc-700'
              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col rounded-xl bg-zinc-900 p-5 transition-all duration-200 ${borderClass}`}
                >
                  {isCurrent && (
                    <span className="absolute top-4 right-4 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-zinc-700 text-zinc-300">
                      ✓ Current plan
                    </span>
                  )}
                  <h3 className="text-base font-semibold text-white mb-1">{tier.displayName}</h3>
                  <div className="mb-1">
                    <span className="text-3xl font-semibold" style={{ color: accent }}>
                      ${(tier.priceInCents / 100).toFixed(0)}
                    </span>
                    <span className="text-sm text-zinc-500">/mo</span>
                  </div>
                  {tier.description && (
                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{tier.description}</p>
                  )}
                  <button
                    onClick={() => handleSelect(tier)}
                    disabled={isCurrent || isGrandfathered}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-all mb-5 ${
                      isCurrent || isGrandfathered
                        ? 'bg-zinc-800 text-zinc-500 cursor-default'
                        : (CTA_CLASS[tier.name] ?? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200')
                    }`}
                  >
                    {isCurrent ? '✓ Current plan' : isGrandfathered ? 'Legacy plan' : 'Get started'}
                  </button>
                  {tier.features.length > 0 && (
                    <ul className="space-y-1.5">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">📊 How audience analytics work</h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">
            We collect consumer demographics — age, niche/interest category, location, and geo-data —
            so you can advertise to exactly the right people. When matched with an influencer,
            their audience profile must align with yours before any campaign goes live.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { emoji: '👥', label: 'Age demographics' },
              { emoji: '📍', label: 'Location & geo-data' },
              { emoji: '🎯', label: 'Niche & interest category' },
              { emoji: '🔗', label: 'Influencer audience match' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300">
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            No influencer match? We post through our generic UGC channel and mirror the content to your vendor page automatically.
          </p>
        </div>

        <AlaCarteSection />

        <p className="text-center text-xs text-zinc-600 mt-8">
          All transactions processed securely on Outsyde. Influencer placements verified for audience alignment before any campaign activates.
        </p>
      </div>
    </main>
  )
}
