'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProfessionalProfilePage({ params }) {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messaging, setMessaging] = useState(false)
  const [messageSent, setMessageSent] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setCurrentUser(me)
      const { data } = await supabase.from('profiles').select('*').eq('id', params.id).single()
      if (!data) { router.push('/browse'); return }
      setProfile(data)
      setLoading(false)
    }
    getData()
  }, [])

  const handleStartConversation = async () => {
    setMessaging(true)
    const { data: existing } = await supabase.from('conversations')
      .select('id')
      .or(`and(participant_one.eq.${currentUser.id},participant_two.eq.${profile.id}),and(participant_one.eq.${profile.id},participant_two.eq.${currentUser.id})`)
      .single()
    if (existing) { router.push('/messages'); return }
    await supabase.from('conversations').insert({ participant_one: currentUser.id, participant_two: profile.id })
    setMessaging(false)
    setMessageSent(true)
    setTimeout(() => router.push('/messages'), 1000)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#666666' }}>Loading...</p></div>

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/browse" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Browse</Link>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F5EFE6', border: '2px solid #8B5E3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#8B5E3C', fontSize: '28px', overflow: 'hidden', flexShrink: 0 }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1A1A1A', margin: 0 }}>{profile.full_name}</h1>
                {profile.is_verified && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>✓ EnGedi Verified</span>}
              </div>
              <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>Professional</span>
              {(profile.city || profile.state) && <p style={{ color: '#666666', fontSize: '14px', margin: '10px 0 0' }}>📍 {[profile.city, profile.state].filter(Boolean).join(', ')}</p>}
              {profile.experience_years && <p style={{ color: '#666666', fontSize: '14px', margin: '4px 0 0' }}>⏱ {profile.experience_years} years experience</p>}
              {profile.professional_body && <p style={{ color: '#666666', fontSize: '14px', margin: '4px 0 0' }}>🏛 {profile.professional_body}</p>}
            </div>
          </div>
        </div>

        {profile.bio && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 12px' }}>About</h3>
            <p style={{ fontSize: '14px', color: '#666666', lineHeight: '1.7', margin: 0 }}>{profile.bio}</p>
          </div>
        )}

        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 16px' }}>Credentials</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {profile.professional_body && <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: '#999999', minWidth: '140px' }}>Professional Body</span><span style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '600' }}>{profile.professional_body}</span></div>}
            {profile.professional_license_number && <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: '#999999', minWidth: '140px' }}>License Number</span><span style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '600' }}>{profile.professional_license_number}</span></div>}
            {profile.experience_years && <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: '#999999', minWidth: '140px' }}>Experience</span><span style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '600' }}>{profile.experience_years} years</span></div>}
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: '#999999', minWidth: '140px' }}>Verification</span><span style={{ fontSize: '13px', color: profile.is_verified ? '#27ae60' : '#999999', fontWeight: '600' }}>{profile.is_verified ? '✓ Verified' : 'Not yet verified'}</span></div>
          </div>
        </div>

        {currentUser?.id !== profile.id && (
          <button
            onClick={handleStartConversation}
            disabled={messaging || messageSent}
            style={{ width: '100%', background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
          >
            {messageSent ? '✓ Conversation started — redirecting...' : messaging ? 'Opening chat...' : `Contact ${profile.full_name?.split(' ')[0]}`}
          </button>
        )}
      </div>
    </div>
  )
}