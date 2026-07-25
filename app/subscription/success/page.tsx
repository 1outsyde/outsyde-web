'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PLANS } from '@/lib/types/subscription'
import { CircleCheck } from 'lucide-react'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan') ?? 'starter'
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0]

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-5">
          <CircleCheck size={56} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">You're on {plan.name}!</h1>
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          Your subscription is active. Head back to the Outsyde app to start listing your products and services.
        </p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-zinc-300 font-medium">{plan.name} plan</span>
            <span className="text-sm font-semibold" style={{ color: plan.accentColor }}>${plan.price}/mo</span>
          </div>
          <ul className="text-xs text-zinc-500 space-y-1">
            <li>✓ {plan.staffCap} staff accounts</li>
            {plan.influencer !== 'None' && <li>✓ {plan.influencer}</li>}
            {plan.shootCreditsNum > 0 && <li>✓ {plan.shootCreditsNum} shoot credit{plan.shootCreditsNum > 1 ? 's' : ''}/mo</li>}
          </ul>
        </div>
        <button
          onClick={() => { window.location.href = 'outsyde://dashboard' }}
          className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl text-sm transition-all mb-3"
        >
          Open Outsyde app
        </button>
        <button
          onClick={() => router.push('/subscription/manage')}
          className="w-full py-2 text-zinc-500 text-xs hover:text-zinc-400 transition-colors"
        >
          Manage your subscription
        </button>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>
}