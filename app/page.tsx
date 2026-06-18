import Link from 'next/link'

export default function HomePage() {
  const roles: { title: string; desc: string }[] = [
    { title: 'Project Owners', desc: 'Homeowners, developers, and contractors who need materials and skilled workers' },
    { title: 'Artisans', desc: 'Bricklayers, plumbers, electricians, carpenters — get verified and find jobs' },
    { title: 'Suppliers', desc: 'Building material vendors who want to reach more customers' },
    { title: 'Professionals', desc: 'Architects, engineers, and quantity surveyors offering their expertise' },
    { title: 'Service Providers', desc: 'Cleaning, security, pest control, and facility management companies' },
    { title: 'Equipment Providers', desc: 'Heavy machinery, truck hire, scaffolding, and generator rental' },
  ]

  const values: { title: string; desc: string }[] = [
    { title: 'Trust Before Transaction', desc: 'Every participant is verified before they transact on our platform' },
    { title: 'Built for African Reality', desc: 'We design for Nigerian infrastructure, budgets, and user behaviour' },
    { title: 'Radical Transparency', desc: 'No hidden prices, no surprises — what you see is what you pay' },
    { title: 'Builder Pride', desc: 'We celebrate the artisans and suppliers who build this continent' },
    { title: 'Infrastructure Thinking', desc: 'We are building for the next 50 years of African construction' },
    { title: 'Relentless Proximity', desc: 'We stay close to the market, the builders, and the communities we serve' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>

      {/* Topbar */}
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#FFFFFF', fontWeight: '800', fontSize: '22px', letterSpacing: '-0.5px' }}>EnGedi Africa</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '14px', padding: '8px 16px' }}>Log in</Link>
          <Link href="/signup" style={{ background: '#8B5E3C', color: '#FFFFFF', textDecoration: 'none', fontSize: '14px', padding: '8px 16px', borderRadius: '8px' }}>Sign up</Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
        <div style={{ background: '#F5EFE6', border: '1px solid #EEE6DA', borderRadius: '20px', display: 'inline-block', padding: '6px 16px', marginBottom: '24px' }}>
          <span style={{ color: '#8B5E3C', fontSize: '13px', fontWeight: '600' }}>Nigeria&apos;s #1 Construction Marketplace</span>
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 20px', lineHeight: '1.1' }}>
          Build Without<br />Barriers
        </h1>
        <p style={{ fontSize: '18px', color: '#666666', maxWidth: '520px', margin: '0 auto 40px', lineHeight: '1.6' }}>
          Find verified artisans, compare material prices, and manage your construction project — all in one place.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" style={{ background: '#1A1A1A', color: '#FFFFFF', textDecoration: 'none', padding: '14px 32px', borderRadius: '10px', fontWeight: '700', fontSize: '16px' }}>Get Started Free</Link>
          <Link href="/login" style={{ background: '#FFFFFF', color: '#1A1A1A', textDecoration: 'none', padding: '14px 32px', borderRadius: '10px', fontWeight: '700', fontSize: '16px', border: '1.5px solid #EEE6DA' }}>Log In</Link>
        </div>
      </div>

      {/* Who is EnGedi for */}
      <div style={{ padding: '0 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', color: '#1A1A1A', marginBottom: '40px' }}>Who is EnGedi for?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {roles.map((role) => (
            <div key={role.title} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px' }}>{role.title}</h3>
              <p style={{ fontSize: '14px', color: '#666666', margin: 0, lineHeight: '1.5' }}>{role.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mission & Vision */}
      <div style={{ background: '#1A1A1A', padding: '80px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          <div>
            <div style={{ background: '#8B5E3C', width: '40px', height: '4px', borderRadius: '2px', marginBottom: '20px' }}></div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF', marginBottom: '16px' }}>Our Mission</h2>
            <p style={{ color: '#999999', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
              To simplify construction across Africa by connecting every material, trade, and service into one trusted digital platform — with transparent pricing and verified participants.
            </p>
          </div>
          <div>
            <div style={{ background: '#8B5E3C', width: '40px', height: '4px', borderRadius: '2px', marginBottom: '20px' }}></div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF', marginBottom: '16px' }}>Our Vision</h2>
            <p style={{ color: '#999999', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
              A future where building in Africa is seamless, transparent, and accessible — where anyone can build homes, schools, and infrastructure with clarity and trust.
            </p>
          </div>
        </div>
      </div>

      {/* Core Values */}
      <div style={{ padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', color: '#1A1A1A', marginBottom: '40px' }}>Our Core Values</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {values.map((value) => (
            <div key={value.title} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '24px' }}>
              <div style={{ background: '#8B5E3C', width: '32px', height: '3px', borderRadius: '2px', marginBottom: '16px' }}></div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px' }}>{value.title}</h3>
              <p style={{ fontSize: '13px', color: '#666666', margin: 0, lineHeight: '1.5' }}>{value.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{ background: '#F5EFE6', borderTop: '1.5px solid #EEE6DA', borderBottom: '1.5px solid #EEE6DA', padding: '80px 24px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ background: '#8B5E3C', width: '40px', height: '4px', borderRadius: '2px', margin: '0 auto 24px' }}></div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1A1A1A', marginBottom: '20px' }}>Who We Are</h2>
          <p style={{ fontSize: '16px', color: '#666666', lineHeight: '1.8', marginBottom: '20px' }}>
            EnGedi Africa is a construction marketplace platform built for Nigeria and expanding across Africa. We connect project owners, artisans, suppliers, professionals, and equipment providers on one trusted platform.
          </p>
          <p style={{ fontSize: '16px', color: '#666666', lineHeight: '1.8', margin: 0 }}>
            Our name comes from En Gedi — an ancient oasis of abundance in harsh terrain. That is exactly what we are building: abundance and opportunity in a construction market that has long been fragmented, opaque, and hard to navigate.
          </p>
        </div>
      </div>

      {/* Contact */}
      <div style={{ padding: '80px 24px', maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1A1A1A', marginBottom: '16px' }}>Get in Touch</h2>
        <p style={{ fontSize: '16px', color: '#666666', marginBottom: '32px', lineHeight: '1.6' }}>
          Have a question, partnership idea, or want to list your business on EnGedi? We would love to hear from you.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <a href="mailto:hello@engediafrica.com" style={{ background: '#1A1A1A', color: '#FFFFFF', textDecoration: 'none', padding: '14px 32px', borderRadius: '10px', fontWeight: '700', fontSize: '16px' }}>
            hello@engediafrica.com
          </a>
          <a href="tel:+2349134459307" style={{ color: '#8B5E3C', textDecoration: 'none', fontWeight: '600', fontSize: '15px' }}>
            +234 913 445 9307
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1A1A1A', borderTop: '3px solid #8B5E3C', padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: '#FFFFFF', fontWeight: '800', fontSize: '18px', margin: '0 0 8px' }}>EnGedi Africa</p>
        <p style={{ color: '#999999', fontSize: '14px', margin: '0 0 20px' }}>hello@engediafrica.com · +234 913 445 9307</p>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          <Link href="/terms" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>Terms & Conditions</Link>
          <Link href="/privacy-policy" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>Privacy Policy</Link>
          <Link href="/signup" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>Sign Up</Link>
          <Link href="/login" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>Log In</Link>
        </div>
        <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>© 2026 EnGedi Africa. All rights reserved.</p>
      </div>

    </div>
  )
}