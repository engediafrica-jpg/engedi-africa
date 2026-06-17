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
    {
      title: 'Trust Before Transaction',
      desc: 'Every supplier, price, and artisan on the platform is verified. We earn trust before we earn revenue.'
    },
    {
      title: 'Built for African Reality',
      desc: 'We design for intermittent internet, cash payments, local languages, and informal trade — not a Western ideal.'
    },
    {
      title: 'Radical Transparency',
      desc: 'Real market prices, published. No hidden markups. Suppliers compete openly. Customers win.'
    },
    {
      title: 'Infrastructure Thinking',
      desc: "We don't build features — we build the plumbing that every construction business in Africa will one day run on."
    },
    {
      title: 'Relentless Proximity',
      desc: 'We stay physically close to markets, suppliers, and builders. No armchair strategy — we are in the sand depots and building sites.'
    },
    {
      title: "Builder's Pride",
      desc: 'We honor the artisans, suppliers, and laborers who build Africa every day. We make their work visible and their income dignified.'
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>

      {/* Topbar */}
      <div style={{
        background: '#1A1A1A',
        borderBottom: '3px solid #8B5E3C',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          color: '#FFFFFF',
          fontWeight: '800',
          fontSize: '22px',
          letterSpacing: '-0.5px'
        }}>
          EnGedi Africa
        </span>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login" style={{
            color: '#FFFFFF',
            textDecoration: 'none',
            fontSize: '14px',
            padding: '8px 16px'
          }}>
            Log in
          </Link>

          <Link href="/signup" style={{
            background: '#8B5E3C',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontSize: '14px',
            padding: '8px 16px',
            borderRadius: '8px'
          }}>
            Sign up
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
        <div style={{
          background: '#F5EFE6',
          border: '1px solid #EEE6DA',
          borderRadius: '20px',
          display: 'inline-block',
          padding: '6px 16px',
          marginBottom: '24px'
        }}>
          <span style={{
            color: '#8B5E3C',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            Nigeria&apos;s #1 Construction Marketplace
          </span>
        </div>

        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          color: '#1A1A1A',
          margin: '0 0 20px',
          lineHeight: '1.1'
        }}>
          Build Without<br />Barriers
        </h1>

        {/* UPDATED SUBTITLE */}
        <p style={{
          fontSize: '18px',
          color: '#666666',
          maxWidth: '520px',
          margin: '0 auto 40px',
          lineHeight: '1.6'
        }}>
          Every Material. Every Trade. One Platform.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link href="/signup" style={{
            background: '#1A1A1A',
            color: '#FFFFFF',
            textDecoration: 'none',
            padding: '14px 32px',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '16px'
          }}>
            Get Started Free
          </Link>

          <Link href="/login" style={{
            background: '#FFFFFF',
            color: '#1A1A1A',
            textDecoration: 'none',
            padding: '14px 32px',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '16px',
            border: '1.5px solid #EEE6DA'
          }}>
            Log In
          </Link>
        </div>
      </div>

      {/* Who is EnGedi for */}
      <div style={{ padding: '0 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '28px',
          fontWeight: '800',
          color: '#1A1A1A',
          marginBottom: '40px'
        }}>
          Who is EnGedi for?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px'
        }}>
          {roles.map((role) => (
            <div key={role.title} style={{
              background: '#FFFFFF',
              border: '1.5px solid #EEE6DA',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#1A1A1A',
                margin: '0 0 8px'
              }}>
                {role.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#666666',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {role.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mission & Vision */}
      <div style={{
        background: '#1A1A1A',
        padding: '80px 24px'
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '40px'
        }}>

          <div>
            <div style={{
              background: '#8B5E3C',
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              marginBottom: '20px'
            }} />
            <h2 style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#FFFFFF',
              marginBottom: '16px'
            }}>
              Our Mission
            </h2>
            <p style={{
              color: '#999999',
              fontSize: '15px',
              lineHeight: '1.7',
              margin: 0
            }}>
              To simplify construction across Africa by connecting every material, trade, and service into one trusted digital platform — with transparent pricing and verified participants.
            </p>
          </div>

          <div>
            <div style={{
              background: '#8B5E3C',
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              marginBottom: '20px'
            }} />
            <h2 style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#FFFFFF',
              marginBottom: '16px'
            }}>
              Our Vision
            </h2>
            <p style={{
              color: '#999999',
              fontSize: '15px',
              lineHeight: '1.7',
              margin: 0
            }}>
              A future where building in Africa is seamless, transparent, and accessible — where anyone can build homes, schools, and infrastructure with clarity and trust.
            </p>
          </div>

        </div>
      </div>

      {/* Core Values */}
      <div style={{ padding: '80px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '28px',
          fontWeight: '800',
          color: '#1A1A1A',
          marginBottom: '40px'
        }}>
          Our Core Values
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px'
        }}>
          {values.map((value) => (
            <div key={value.title} style={{
              background: '#FFFFFF',
              border: '1.5px solid #EEE6DA',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{
                background: '#8B5E3C',
                width: '32px',
                height: '3px',
                borderRadius: '2px',
                marginBottom: '16px'
              }} />

              <h3 style={{
                fontSize: '15px',
                fontWeight: '700',
                color: '#1A1A1A',
                margin: '0 0 8px'
              }}>
                {value.title}
              </h3>

              <p style={{
                fontSize: '13px',
                color: '#666666',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {value.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: '#1A1A1A',
        borderTop: '3px solid #8B5E3C',
        padding: '40px 24px',
        textAlign: 'center'
      }}>
        <p style={{
          color: '#FFFFFF',
          fontWeight: '800',
          fontSize: '18px',
          margin: '0 0 8px'
        }}>
          EnGedi Africa
        </p>

        <p style={{
          color: '#999999',
          fontSize: '14px',
          margin: '0 0 20px'
        }}>
          © 2026 EnGedi Africa. All rights reserved.
        </p>

        <div style={{
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link href="/terms" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>
            Terms & Conditions
          </Link>
          <Link href="/privacy-policy" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>
            Privacy Policy
          </Link>
          <Link href="/login" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>
            Log In
          </Link>
        </div>
      </div>

    </div>
  )
}