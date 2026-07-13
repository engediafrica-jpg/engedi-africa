import Link from 'next/link'

export default function MarketingNav() {
  return (
    <nav className="bg-ink border-b border-clay-deep">
      <div className="mx-auto flex h-[68px] max-w-[1120px] items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-2.5 text-ink-text no-underline">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className="shrink-0">
            <rect x="1" y="1" width="24" height="24" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 19V11L13 6L20 11V19" stroke="currentColor" strokeWidth="1.3" />
            <path d="M6 19H20" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <span className="font-display text-[1.2rem] font-bold tracking-tight">EnGedi&nbsp;Africa</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/login" className="rounded-sm px-[18px] py-2.5 text-[0.86rem] text-ink-muted no-underline transition-colors hover:text-ink-text">
            Log in
          </Link>
          <Link href="/signup" className="rounded-sm bg-clay px-[18px] py-2.5 text-[0.86rem] font-semibold text-clay-contrast no-underline transition-colors hover:bg-clay-deep">
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  )
}
