import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AppNav({ right }: { right?: ReactNode }) {
  return (
    <div className="flex h-16 items-center justify-between border-b-[3px] border-clay-deep bg-ink px-6">
      <Link href="/" className="font-display text-[1.15rem] font-bold text-ink-text no-underline">
        EnGedi&nbsp;Africa
      </Link>
      {right}
    </div>
  )
}
