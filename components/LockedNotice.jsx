import Link from 'next/link'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'

const COPY = {
  profile: {
    title: 'Complete your profile to continue',
    body: 'This area unlocks once your profile has all required details filled in.',
    cta: 'Complete Profile',
    href: '/dashboard/profile',
  },
  training: {
    title: 'Finish training to continue',
    body: 'As an artisan, you need to pass all 5 training modules before the rest of the platform unlocks.',
    cta: 'Go to Training Hub',
    href: '/training',
  },
}

export default function LockedNotice({ reason }) {
  const copy = COPY[reason] || COPY.profile
  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />
      <div className="mx-auto max-w-[680px] px-6 py-16 text-center">
        <div className="ticks border border-clay bg-surface-raised p-10">
          <p className="m-0 mb-2 text-[18px] font-bold text-text">{copy.title}</p>
          <p className="m-0 mb-6 text-[14px] text-text-muted">{copy.body}</p>
          <Button href={copy.href} variant="solid">{copy.cta}</Button>
        </div>
      </div>
    </div>
  )
}
