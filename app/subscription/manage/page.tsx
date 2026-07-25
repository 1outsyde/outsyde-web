'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PLANS } from '@/lib/types/subscription'
import { UsageBar } from '@/components/subscription/UsageBar'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

const MOCK_SUB = {
  planId: 'growth' as const,
  currentPeriodEnd: 'August 1, 2025',
  staffUsed: 3,
  influencerUsed: 1,
  shootCreditsRemaining: 1,
}

function ManageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromApp = searchParams.get('from') === 'app'
  const sub = MOCK_SUB
  const currentPlan = PLANS.find((p) => p.id === sub.planId)!
  const otherPlans = PLANS.filter((p) => p.id !== sub.planId)

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-400 text-sm mb-6 hover:text-white transition-colors">
          <ArrowLeft size={15} />
          {fromApp ? 'Back to app' : 'Back'}
        </button>

        {fromApp && (
          <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-6 text-xs text-zinc-400 leading-relaxed">
            <ShieldCheck size={16} className="text-green-400 shrink-0 mt-0.5" />
            You were redirected here from the Outsyde app. Plan changes are handled on our website — not in-app — so 100% of your subscription stays with your business.
          </div>
        )}

        <h1 className="text-2xl font-semibold text-white mb-6">Your subscription</h1>

        <div className="bg-zinc-900 border-2 border-green-600 rounded-xl p-5 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] bg-green-950 text-green-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                ✓ Current plan
              </span>
              <h2 className="text-xl font-semibold text-white mt-2">{currentPlan.name}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Active · Renews {sub.currentPeriodEnd}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-semibold text-green-400">${currentPlan.price}</span>
              <span className="text-sm text-zinc-500">/mo</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">This month's usage</h3>
          <UsageBar label="Staff accounts" used={sub.staffUsed} total={currentPlan.staffCapNum} />
          <UsageBar label="Influencer placements" used={sub.influencerUsed} total={1} />
          <UsageBar label="Shoot credits remaining" used={sub.shootCreditsRemaining} total={currentPlan.shootCreditsNum} />
        </div>

        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Change plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {otherPlans.map((plan) => {
            const isUpgrade = plan.price > currentPlan.price
            return (
              <div key={plan.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{plan.name}</p>
                <p className="text-2xl font-semibold text-white mb-1">
                  ${plan.price}<span className="text-sm text-zinc-500 font-normal">/mo</span>
                </p>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{plan.tagline}</p>
                <button
                  onClick={() => router.push(`/subscription/checkout?plan=${plan.id}`)}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
                    isUpgrade
                      ? plan.id === 'pro'
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-green-500 hover:bg-green-400 text-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button className="flex-1 py-2.5 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors">
            Update billing info
          </button>
          <button className="flex-1 py-2.5 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-red-800 hover:text-red-400 transition-colors">
            Cancel subscription
          </button>
        </div>
      </div>
    </main>
  )
}

export default function ManagePage() {
  return (
    <Suspense>
      <ManageContent />
    </Suspense>
  )
}