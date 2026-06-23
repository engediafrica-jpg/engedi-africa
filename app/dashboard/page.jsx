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
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const getProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const userId = sessionData.session.user.id
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) { console.log('Profile error:', error); setLoading(false); return }
      setProfile(data)
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5)
      setNotifications(notifData || [])
      setLoading(false)
    }
    getProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const markAllRead = async () => {
    if (!profile) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id)
    setNotifications([])
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
    { title: 'Training Hub', desc: 'Learn professional skills and earn certificates', href: '/training' },
  ]

  const isVerified = profile?.verification_status === 'approved'
  const isProfileComplete = profile?.profile_completed === true

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>

      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {notifications.length > 0 && (
            <div style={{ position: 'relative' }}>
              <Link href="/messages" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '20px' }}>🔔</Link>
              <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#c0392b', color: '#FFFFFF', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>
                {notifications.length}
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ background: 'transparent', color: '#999999', border: '1px solid #333', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Log out</button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Welcome card */}
        <div style={{ background: '#FFFFFF', border: `1.5px solid ${isVerified ? '#2ecc71' : '#EEE6DA'}`, borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#F5EFE6', border: `2px solid ${isVerified ? '#2ecc71' : '#8B5E3C'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '800', color: '#8B5E3C', overflow: 'hidden' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile?.full_name?.charAt(0)?.toUpperCase() || '?'
                }
              </div>
              {isVerified && (
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '22px', height: '22px', borderRadius: '50%', background: '#2ecc71', border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: '800' }}>✓</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1A1A1A', margin: 0 }}>
                  {profile?.full_name || 'Welcome'}
                </h1>
                {isVerified && (
                  <span style={{ background: '#e8f8f0', border: '1.5px solid #2ecc71', color: '#27ae60', fontSize: '12px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px' }}>
                    ✓ EnGedi Verified
                  </span>
                )}
              </div>
              <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '12px', fontWeight: '600', padding: '3px 12px', borderRadius: '20px' }}>
                {roleLabel[profile?.role] || profile?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontWeight: '700', color: '#1A1A1A', margin: 0, fontSize: '15px' }}>🔔 Notifications</p>
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#8B5E3C', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Mark all read</button>
            </div>
            {notifications.map(n => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #EEE6DA', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>{n.title}</p>
                  {n.body && <p style={{ margin: 0, fontSize: '12px', color: '#666666' }}>{n.body}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {n.link && (
                    <Link href={n.link} onClick={() => markRead(n.id)} style={{ background: '#1A1A1A', color: '#FFFFFF', textDecoration: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>View</Link>
                  )}
                  <button onClick={() => markRead(n.id)} style={{ background: 'none', border: '1px solid #EEE6DA', color: '#999999', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile completion */}
        {!isProfileComplete && (
          <div style={{ background: '#FFF8F0', border: '1.5px solid #8B5E3C', borderRadius: '12px', padding: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: '#1A1A1A', margin: '0 0 4px', fontSize: '15px' }}>Complete your profile</p>
              <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>Add your details so customers can find and trust you</p>
            </div>
            <Link href="/dashboard/profile" style={{ background: '#8B5E3C', color: '#FFFFFF', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>Complete Now</Link>
          </div>
        )}

        {/* Verification prompt */}
        {isProfileComplete && !profile?.documents_submitted && (
          <div style={{ background: '#FFF8F0', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: '#1A1A1A', margin: '0 0 4px', fontSize: '15px' }}>Get verified</p>
              <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>Upload your documents to earn the EnGedi Verified badge</p>
            </div>
            <Link href="/dashboard/verification" style={{ background: '#1A1A1A', color: '#FFFFFF', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>Upload Docs</Link>
          </div>
        )}

        {profile?.documents_submitted && !isVerified && profile?.verification_status !== 'rejected' && (
          <div style={{ background: '#FFF8F0', border: '1.5px solid #8B5E3C', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontWeight: '700', color: '#8B5E3C', fontSize: '14px' }}>⏳ Documents submitted — Your verification is under review</p>
          </div>
        )}

        {profile?.verification_status === 'rejected' && (
          <div style={{ background: '#fde8e8', border: '1.5px solid #c0392b', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 4px', fontWeight: '700', color: '#c0392b', fontSize: '14px' }}>❌ Verification rejected</p>
            {profile?.admin_notes && <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>{profile.admin_notes}</p>}
          </div>
        )}

        {/* Menu */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {menuItems.map(item => (
            <Link key={item.title} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '24px', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
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