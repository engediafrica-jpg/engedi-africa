'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const C = {
  surface: '#15120e',
  raised: '#201a14',
  sunk: '#0f0c09',
  text: '#f1eae0',
  muted: '#a79a85',
  line: '#362d22',
  clay: '#e08554',
  oasis: '#86a98b',
  danger: '#e2695f',
  dangerSoft: '#2e1712',
}

export default function FieldMarketerDashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [signups, setSignups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      if (!profileData || profileData.role !== 'field_marketer') { router.push('/dashboard'); return }
      setProfile(profileData)
      const { data: signupData } = await supabase
        .from('field_marketer_signups')
        .select('*')
        .eq('field_marketer_id', sessionData.session.user.id)
        .order('created_at', { ascending: false })
      setSignups(signupData || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted }}>Loading...</p>
    </div>
  )

  const totalCommission = signups.reduce((sum, s) => sum + Number(s.commission_earned || 0), 0)

  const roleLabel = {
    project_owner: 'Project Owner', artisan: 'Artisan', supplier: 'Supplier',
    professional: 'Professional', service_provider: 'Service Provider', equipment_provider: 'Equipment Provider',
  }

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
        <button onClick={handleLogout} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
          Log out
        </button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Welcome */}
        <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '28px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: C.sunk, border: `2px solid ${C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '800', color: C.clay, overflow: 'hidden', flexShrink: 0 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : profile?.full_name?.charAt(0)?.toUpperCase() || '?'
              }
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: '0 0 6px' }}>
                Welcome, {profile?.full_name?.split(' ')[0]}
              </h1>
              <span style={{ background: C.sunk, border: `1px solid ${C.clay}44`, color: C.clay, fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '4px' }}>
                Field Marketer · {profile?.referral_code}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Referrals', value: signups.length, color: C.clay },
            { label: 'Total Earnings', value: `₦${totalCommission.toLocaleString()}`, color: C.oasis },
          ].map(stat => (
            <div key={stat.label} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '20px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Referral Link</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '14px', color: C.clay, fontFamily: 'monospace', background: C.sunk, padding: '10px 14px', borderRadius: '6px', flex: 1, wordBreak: 'break-all' }}>
              engediafrica.com/signup?ref={profile?.referral_code}
            </p>
            <button
              onClick={() => { navigator.clipboard.writeText(`https://engediafrica.com/signup?ref=${profile?.referral_code}`); alert('Copied!') }}
              style={{ background: C.clay, color: C.sunk, border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
            >
              Copy
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: C.muted }}>Share this link with artisans, suppliers, and professionals to earn commission on every verified signup.</p>
        </div>

        {/* Referral code */}
        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Referral Code</p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: C.clay, letterSpacing: '4px' }}>{profile?.referral_code}</p>
        </div>

        {/* Signups list */}
        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: C.text, margin: '0 0 20px' }}>
            People You Referred ({signups.length})
          </h3>

          {signups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ color: C.muted, fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No referrals yet</p>
              <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>Share your referral link to start earning</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {signups.map((signup, i) => (
                <div key={signup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.sunk, padding: '14px 16px', borderRadius: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: '700', color: C.text, fontSize: '14px' }}>{signup.referred_user_name || 'Unknown'}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: C.muted, textTransform: 'capitalize' }}>
                      {roleLabel[signup.referred_user_role] || signup.referred_user_role?.replace('_', ' ')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: C.oasis }}>
                      {signup.commission_earned > 0 ? `₦${Number(signup.commission_earned).toLocaleString()}` : 'Pending'}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: C.muted }}>{new Date(signup.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}