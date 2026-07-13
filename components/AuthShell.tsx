import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-text">
      <div className="border-b border-clay-deep bg-ink">
        <div className="mx-auto flex h-[64px] max-w-[1120px] items-center px-8">
          <Link href="/" className="font-display text-[1.2rem] font-bold text-ink-text no-underline">
            EnGedi&nbsp;Africa
          </Link>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="ticks w-full max-w-[440px] border border-line bg-surface-raised p-9">
          {children}
        </div>
      </div>
    </div>
  )
}
