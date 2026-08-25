import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RequestQuoteForm from '@/components/RequestQuoteForm'

const C = {
  surface: '#15120e',
  raised: '#201a14',
  sunk: '#0f0c09',
  text: '#f1eae0',
  muted: '#a79a85',
  line: '#362d22',
  clay: '#e08554',
  oasis: '#86a98b',
  gold: '#d4af37',
  danger: '#e2695f',
  dangerSoft: '#2e1712',
}

export default async function ProfessionalProfilePage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  // maybeSingle() returns null on zero rows instead of throwing,
  // which is the most likely reason the old code's `if (!data)` check
  // was firing on a harmless "not found yet" case and bouncing silently.
  const { data: professional, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'professional')
    .maybeSingle()

  // Real database/RLS error — show it instead of hiding it
  if (error) {
    return (
      <div style={{ background: C.surface, minHeight: '100vh', padding: 40 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Couldn't load this profile</div>
            <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{error.message}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Error code: {error.code || 'unknown'}</div>
          </div>
        </div>
      </div>
    )
  }

  // Genuinely no matching profile — use Next's real not-found handling,
  // not a manual redirect back to Browse
  if (!professional) {
    notFound()
  }

  // Extra guard: if the profile exists but isn't public yet, say so clearly
  // instead of pretending it doesn't exist
  if (professional.profile_completed === false) {
    return (
      <div style={{ background: C.surface, minHeight: '100vh', padding: 40 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', color: C.muted, textAlign: 'center', paddingTop: 60 }}>
          This professional hasn't finished setting up their profile yet.
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: C.surface, minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <img
              src={professional.avatar_url || '/default-avatar.png'}
              alt={professional.full_name || 'Professional'}
              style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'cover', background: C.sunk }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ color: C.text, fontSize: 22, margin: 0 }}>
                  {professional.full_name || 'Unnamed Professional'}
                </h1>
                {professional.is_verified && (
                  <span style={{ color: C.gold, border: `1px solid ${C.gold}55`, borderRadius: 6, padding: '2px 8px', fontSize: 11, textTransform: 'uppercase' }}>
                    Verified
                  </span>
                )}
              </div>
              {(professional.city || professional.state) && (
                <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
                  {[professional.city, professional.state].filter(Boolean).join(', ')}
                </div>
              )}
              {professional.specialty && (
                <div style={{ color: C.clay, fontSize: 13, marginTop: 6 }}>{professional.specialty}</div>
              )}
            </div>
          </div>

          {professional.bio && (
            <div style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
              {professional.bio}
            </div>
          )}

          <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.line}`, fontSize: 13, color: C.muted }}>
            {professional.years_experience && <div>{professional.years_experience} years experience</div>}
            {professional.phone && <div>{professional.phone}</div>}
            {professional.email && <div>{professional.email}</div>}
          </div>
        </div>

        {/* Portfolio, if you store one */}
        {Array.isArray(professional.portfolio_images) && professional.portfolio_images.length > 0 && (
          <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ color: C.text, fontWeight: 600, marginBottom: 14 }}>Portfolio</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {professional.portfolio_images.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, background: C.sunk }} />
              ))}
            </div>
          </div>
        )}

        {/* Request Quote */}
        <RequestQuoteForm providerId={professional.id} providerName={professional.full_name} />
      </div>
    </div>
  )
}