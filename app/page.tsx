import type { ReactNode } from 'react'
import Button from '@/components/Button'
import MarketingNav from '@/components/MarketingNav'
import MarketingFooter from '@/components/MarketingFooter'

const roles: { title: string; desc: string; icon: ReactNode }[] = [
  {
    title: 'Project Owners',
    desc: 'Homeowners, developers, and contractors who need materials and skilled workers.',
    icon: (
      <path d="M4 20V10L12 4L20 10V20 M9 20V13H15V20" fill="none" stroke="currentColor" strokeWidth="1.4" />
    ),
  },
  {
    title: 'Artisans',
    desc: 'Bricklayers, plumbers, electricians, carpenters — get verified and find jobs.',
    icon: (
      <path d="M5 19L15 9 M13 6L18 11L15 14L10 9Z M4 20L6 18" fill="none" stroke="currentColor" strokeWidth="1.4" />
    ),
  },
  {
    title: 'Suppliers',
    desc: 'Building material vendors who want to reach more customers.',
    icon: (
      <>
        <rect x="4" y="14" width="7" height="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="13" y="14" width="7" height="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="8" y="6" width="7" height="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </>
    ),
  },
  {
    title: 'Professionals',
    desc: 'Architects, engineers, and quantity surveyors offering their expertise.',
    icon: (
      <>
        <path d="M4 4V14H10 M14 20L20 20L20 10" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12" cy="15" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </>
    ),
  },
  {
    title: 'Service Providers',
    desc: 'Cleaning, security, pest control, and facility management companies.',
    icon: (
      <path d="M12 4L19 7V12C19 16 16 19 12 21C8 19 5 16 5 12V7Z M9 12L11 14L15 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    ),
  },
  {
    title: 'Equipment Providers',
    desc: 'Heavy machinery, truck hire, scaffolding, and generator rental.',
    icon: (
      <>
        <rect x="3" y="12" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M13 14H18L21 17V18H13Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="7.5" cy="19.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="17" cy="19.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </>
    ),
  },
]

const values: { title: string; desc: string }[] = [
  { title: 'Trust before transaction', desc: 'Every participant is verified before they transact on our platform.' },
  { title: 'Built for African reality', desc: 'We design for Nigerian infrastructure, budgets, and user behaviour.' },
  { title: 'Radical transparency', desc: 'No hidden prices, no surprises — what you see is what you pay.' },
  { title: 'Builder pride', desc: 'We celebrate the artisans and suppliers who build this continent.' },
  { title: 'Infrastructure thinking', desc: 'We are building for the next 50 years of African construction.' },
  { title: 'Relentless proximity', desc: 'We stay close to the market, the builders, and the communities we serve.' },
]

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 font-mono text-[0.72rem] tracking-[0.18em] text-clay uppercase before:h-px before:w-[22px] before:bg-clay before:content-['']">
      {children}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface text-text">
      <MarketingNav />

      {/* Hero */}
      <header className="relative overflow-hidden py-24">
        <div className="blueprint-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_0%,black_65%,transparent_100%)]" />
        <div className="relative mx-auto grid max-w-[1120px] grid-cols-1 gap-14 px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <Eyebrow>Site 06°27&apos;N 3°23&apos;E · Lagos, Nigeria</Eyebrow>
            <h1 className="my-5 text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-[3.4rem] lg:text-[4.1rem]">
              Build without
              <br />
              barriers<span className="text-clay">.</span>
            </h1>
            <p className="mb-8 max-w-[46ch] text-[1.15rem] text-text-muted">
              Find verified artisans, compare material prices, and manage your construction project — all in one trusted marketplace built for how Nigeria actually builds.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button href="/signup" variant="solid">Get started free →</Button>
              <Button href="/login" variant="outline">Log in</Button>
            </div>
          </div>

          <div className="ticks border border-line bg-surface-raised p-[26px] font-mono">
            <Eyebrow>Platform survey</Eyebrow>
            <div className="mt-[18px] grid grid-cols-2 gap-x-4 gap-y-5">
              <div>
                <b className="font-display block text-[1.7rem] leading-none text-text">6</b>
                <span className="text-[0.72rem] text-text-muted">TRADES CONNECTED</span>
              </div>
              <div>
                <b className="font-display block text-[1.7rem] leading-none text-text">36</b>
                <span className="text-[0.72rem] text-text-muted">STATES + FCT</span>
              </div>
              <div>
                <b className="font-display block text-[1.7rem] leading-none text-text">0%</b>
                <span className="text-[0.72rem] text-text-muted">HIDDEN PRICING</span>
              </div>
              <div>
                <b className="font-display block text-[1.7rem] leading-none text-text">100%</b>
                <span className="text-[0.72rem] text-text-muted">ESCROW HELD</span>
              </div>
            </div>
            <hr className="my-[22px] border-t border-dashed border-line-strong" />
            <div className="flex justify-between text-[0.78rem] text-oasis">
              <span>STATUS</span>
              <span>VERIFIED PARTICIPANTS ONLY</span>
            </div>
          </div>
        </div>
      </header>

      {/* Who is EnGedi for */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mb-12 flex items-end justify-between gap-6 border-b border-line pb-5">
            <h2 className="text-[1.6rem] font-bold tracking-tight sm:text-[2.2rem]">Who is EnGedi for</h2>
            <span className="whitespace-nowrap pb-1 font-mono text-[0.8rem] text-text-muted">06 ROLES</span>
          </div>
          <div className="ticks grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role, i) => (
              <div key={role.title} className="relative border-b border-r border-line p-7 pb-8 transition-colors hover:bg-surface-raised">
                <span className="absolute right-4 top-3.5 font-mono text-[0.7rem] text-line-strong">
                  {String.fromCharCode(65 + i)}
                </span>
                <svg width="26" height="26" viewBox="0 0 24 24" className="mb-[18px] text-clay">
                  {role.icon}
                </svg>
                <h3 className="mb-2 text-[1.05rem] font-bold">{role.title}</h3>
                <p className="m-0 text-[0.92rem] leading-relaxed text-text-muted">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-ink text-ink-text">
        <div className="mx-auto max-w-[1120px] px-8 py-20 sm:py-24">
          <div className="mb-8">
            <Eyebrow>Why we exist</Eyebrow>
          </div>
          <div className="grid grid-cols-1 border-t border-line-strong sm:grid-cols-2">
            <div className="border-line-strong py-10 pr-0 sm:border-b-0 sm:border-r sm:pr-11">
              <h3 className="mb-4 text-[1.35rem] font-bold">Our mission</h3>
              <p className="max-w-[42ch] text-[1rem] text-ink-muted">
                To simplify construction across Africa by connecting every material, trade, and service into one trusted digital platform — with transparent pricing and verified participants.
              </p>
            </div>
            <div className="border-t border-line-strong py-10 pl-0 sm:border-t-0 sm:pl-11">
              <h3 className="mb-4 text-[1.35rem] font-bold">Our vision</h3>
              <p className="max-w-[42ch] text-[1rem] text-ink-muted">
                A future where building in Africa is seamless, transparent, and accessible — where anyone can build homes, schools, and infrastructure with clarity and trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1120px] px-8">
          <div className="mb-12 flex items-end justify-between gap-6 border-b border-line pb-5">
            <h2 className="text-[1.6rem] font-bold tracking-tight sm:text-[2.2rem]">Our core values</h2>
            <span className="whitespace-nowrap pb-1 font-mono text-[0.8rem] text-text-muted">06 PRINCIPLES</span>
          </div>
          <div className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
            {values.map((value, i) => (
              <div key={value.title} className="grid grid-cols-[28px_1fr] gap-3.5 border-b border-line py-[22px]">
                <span className="pt-0.5 font-mono text-[0.95rem] text-clay">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="mb-1 text-[1rem] font-bold">{value.title}</h3>
                  <p className="m-0 text-[0.9rem] text-text-muted">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="border-y border-line bg-surface-sunk">
        <div className="mx-auto max-w-[1120px] px-8 py-20 sm:py-24">
          <div className="mx-auto max-w-[640px]">
            <Eyebrow>Who we are</Eyebrow>
            <h2 className="mb-6 mt-5 text-[1.7rem] font-bold sm:text-[2.3rem]">An oasis, built on purpose.</h2>
            <p className="mb-5 max-w-[60ch] text-[1.05rem] text-text-muted">
              EnGedi Africa is a construction marketplace platform built for Nigeria and expanding across the continent. We connect project owners, artisans, suppliers, professionals, and equipment providers on one trusted platform.
            </p>
            <p className="font-display my-8 max-w-[60ch] border-l-2 border-oasis pl-5 text-[1.2rem] font-semibold text-oasis">
              Our name comes from En Gedi — an ancient oasis of abundance in harsh terrain.
            </p>
            <p className="m-0 max-w-[60ch] text-[1.05rem] text-text-muted">
              That is exactly what we are building: abundance and opportunity in a construction market that has long been fragmented, opaque, and hard to navigate.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-8 px-8 sm:flex-row sm:items-end">
          <h2 className="max-w-[20ch] text-[1.6rem] font-bold sm:text-[2.2rem]">Get in touch</h2>
          <div className="flex flex-col items-start gap-3.5">
            <a href="mailto:hello@engediafrica.com" className="font-display border-b-2 border-clay pb-0.5 text-[1.1rem] font-bold text-text no-underline">
              hello@engediafrica.com
            </a>
            <a href="tel:+2349134459307" className="font-mono text-[0.92rem] text-oasis no-underline mono-nums">
              +234 913 445 9307
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
