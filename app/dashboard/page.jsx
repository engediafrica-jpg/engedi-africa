'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const userId = sessionData.session.user.id
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data)
      setLoading(false)
    }
    getProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading...</p>
    </div>
  )

  const roleLabel = {
    project_owner: 'Project Owner',
    artisan: 'Artisan',
    supplier: 'Supplier',
    professional: 'Professional',
    service_provider: 'Service Provider',
    equipment_provider: 'Equipment Provider',
  }

  const menuItems = [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Q&A Forum', desc: 'Ask and answer construction questions', href: '/qa' },
    { title: 'Messages', desc: 'Chat with artisans and suppliers', href: '/messages' },
    { title: 'Browse Professionals', desc: 'Find artisans, suppliers and professionals', href: '/browse' },
    { title: 'Marketplace', desc: 'Browse and compare building materials', href: '/marketplace' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>

      {/* Topbar */}
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <button onClick={handleLogout} style={{ background: 'transparent', color: '#999999', border: '1px solid #333', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Log out</button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Welcome card */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F5EFE6', border: '2px solid #8B5E3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: '#8B5E3C', overflow: 'hidden', flexShrink: 0 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : profile?.full_name?.charAt(0)?.toUpperCase() || '?'
              }
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 6px' }}>
                Welcome, {profile?.full_name || 'there'} 👋
              </h1>
              <div style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', borderRadius: '20px', display: 'inline-block', padding: '3px 12px' }}>
                <span style={{ color: '#8B5E3C', fontSize: '12px', fontWeight: '600' }}>
                  {roleLabel[profile?.role] || profile?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile completion warning */}
        {!profile?.profile_completed && (
          <div style={{ background: '#FFF8F0', border: '1.5px solid #8B5E3C', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: '#1A1A1A', margin: '0 0 4px', fontSize: '15px' }}>Complete your profile</p>
              <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>Add your details so customers can find and trust you</p>
            </div>
            <Link href="/dashboard/profile" style={{ background: '#8B5E3C', color: '#FFFFFF', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>
              Complete Now
            </Link>
          </div>
        )}

        {/* Verified badge */}
        {profile?.verification_status === 'approved' && (
          <div style={{ background: '#e8f8f0', border: '1.5px solid #2ecc71', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <p style={{ margin: 0, fontWeight: '700', color: '#27ae60', fontSize: '14px' }}>
              ✅ EnGedi Verified — Your account has been verified
            </p>
          </div>
        )}

        {/* Pending verification notice */}
        {profile?.documents_submitted && profile?.verification_status === 'pending' && (
          <div style={{ background: '#FFF8F0', border: '1.5px solid #8B5E3C', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <p style={{ margin: 0, fontWeight: '700', color: '#8B5E3C', fontSize: '14px' }}>
              ⏳ Documents submitted — Your verification is under review
            </p>
          </div>
        )}

        {/* Menu grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {menuItems.map(item => (
            <Link key={item.title} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '24px', cursor: 'pointer', height: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 6px' }}>{item.title}</h3>
                <p style={{ fontSize: '13px', color: '#666666', margin: 0, lineHeight: '1.5' }}>{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}