import { PLANS } from '@/lib/types/subscription'
import { PlanCard } from '@/components/subscription/PlanCard'
import { AlaCarteSection } from '@/components/subscription/AlaCarteSection'

export const metadata = {
  title: 'Subscription Plans | Outsyde',
  description: 'Choose a plan to publish your products and services on Outsyde.',
}

export default function SubscriptionPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-white mb-2">Subscription plan</h1>
          <p className="text-zinc-400 text-sm mb-4">
            Choose a plan to publish your products and services. Upgrade or change at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

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