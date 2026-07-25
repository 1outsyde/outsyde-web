interface UsageBarProps {
  label: string
  used: number
  total: number | null
}

export function UsageBar({ label, used, total }: UsageBarProps) {
  const isUnlimited = total === null
  const pct = isUnlimited ? 0 : Math.min((used / (total || 1)) * 100, 100)
  const isAtLimit = !isUnlimited && pct >= 100

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs text-zinc-300">
          {isUnlimited ? `${used} / Unlimited` : `${used} / ${total}`}
        </span>
      </div>
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        {isUnlimited ? (
          <div className="h-full w-1/4 rounded-full bg-zinc-600" />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: isAtLimit ? '#f59e0b' : '#22c55e' }}
          />
        )}
      </div>
    </div>
  )
}