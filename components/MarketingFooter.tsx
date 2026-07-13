import Link from 'next/link'

export default function MarketingFooter() {
  return (
    <footer className="border-t-[3px] border-clay-deep bg-ink py-11 text-ink-muted">
      <div className="mx-auto max-w-[1120px] px-8">
        <div className="mb-[22px] flex flex-wrap items-center justify-between gap-4 border-b border-line-strong pb-[26px]">
          <Link href="/" className="flex items-center gap-2.5 text-ink-text no-underline">
            <svg width="22" height="22" viewBox="0 0 26 26" fill="none" className="shrink-0">
              <rect x="1" y="1" width="24" height="24" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6 19V11L13 6L20 11V19" stroke="currentColor" strokeWidth="1.3" />
              <path d="M6 19H20" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span className="font-display text-[1.05rem] font-bold">EnGedi&nbsp;Africa</span>
          </Link>
          <div className="flex flex-wrap gap-7">
            <Link href="/terms" className="text-[0.85rem] text-ink-muted no-underline hover:text-ink-text">Terms &amp; Conditions</Link>
            <Link href="/privacy-policy" className="text-[0.85rem] text-ink-muted no-underline hover:text-ink-text">Privacy Policy</Link>
            <Link href="/signup" className="text-[0.85rem] text-ink-muted no-underline hover:text-ink-text">Sign Up</Link>
            <Link href="/login" className="text-[0.85rem] text-ink-muted no-underline hover:text-ink-text">Log In</Link>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2.5 font-mono text-[0.8rem] mono-nums">
          <span>hello@engediafrica.com · +234 913 445 9307</span>
          <span>© 2026 EnGedi Africa. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
