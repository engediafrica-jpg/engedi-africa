import type { ReactNode } from 'react'

type Tone = 'neutral' | 'pending' | 'success' | 'danger'

const toneClasses: Record<Tone, string> = {
  neutral: 'border-line-strong bg-surface-sunk text-text-muted',
  pending: 'border-clay bg-transparent text-clay',
  success: 'border-oasis bg-oasis-soft text-oasis',
  danger: 'border-danger bg-danger-soft text-danger',
}

export default function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block border px-2.5 py-0.5 font-mono text-[0.7rem] font-semibold uppercase tracking-wide ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
