import { Check, Minus } from 'lucide-react'

interface FeatureRowProps {
  label: string
  included: boolean
  note?: string
  accentColor: string
}

export function FeatureRow({ label, included, note, accentColor }: FeatureRowProps) {
  return (
    <div className="flex items-start gap-2 py-[3px]">
      {included ? (
        <Check size={13} className="mt-0.5 shrink-0" style={{ color: accentColor }} />
      ) : (
        <Minus size={13} className="mt-0.5 shrink-0 text-zinc-600" />
      )}
      <span className="text-xs leading-snug" style={{ color: included ? '#d4d4d8' : '#52525b' }}>
        {label}
        {note && (
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium align-middle">
            {note}
          </span>
        )}
      </span>
    </div>
  )
}