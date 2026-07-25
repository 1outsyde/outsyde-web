import { ALA_CARTE_ITEMS } from '@/lib/types/subscription'

export function AlaCarteSection() {
  return (
    <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-zinc-200">À la carte add-ons</h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300">
          All plans
        </span>
      </div>
      <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
        Purchase individual services anytime on top of your subscription.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ALA_CARTE_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300"
          >
            <span>{item.emoji}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}