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
  lineStrong: '#4a3d2c',
  clay: '#e08554',
  clayDeep: '#b85c38',
  oasis: '#86a98b',
  danger: '#e2695f',
  dangerSoft: '#2e1712',
}

const roleMenus = {
  project_owner: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Messages', desc: 'Chat with professionals', href: '/messages' },
    { title: 'Q&A Forum', desc: 'Ask construction questions', href: '/qa' },
    { title: 'Browse Professionals', desc: 'Find artisans, suppliers and professionals', href: '/browse' },
    { title: 'Marketplace', desc: 'Browse and compare building materials', href: '/marketplace' },
    { title: 'My Orders', desc: 'Track your material orders', href: '/orders' },
    { title: 'My Bookings', desc: 'Manage your job requests', href: '/bookings' },
    { title: 'Project Hub', desc: 'Manage your construction projects', href: '/projects' },
  ],
  artisan: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Bank Details', desc: 'Add your account to receive payments', href: '/dashboard/bank-details' },
    { title: 'Messages', desc: 'Chat with clients', href: '/messages' },
    { title: 'Q&A Forum', desc: 'Answer construction questions', href: '/qa' },
    { title: 'My Bookings', desc: 'View and manage job requests', href: '/bookings' },
    { title: 'Training Hub', desc: 'Learn skills and earn certificates', href: '/training' },
  ],
  supplier: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Bank Details', desc: 'Add your account to receive payments', href: '/dashboard/bank-details' },
    { title: 'Messages', desc: 'Chat with buyers', href: '/messages' },
    { title: 'Manage Listings', desc: 'Add and manage your products', href: '/marketplace' },
    { title: 'My Orders', desc: 'View and fulfill orders received', href: '/orders' },
  ],
  professional: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Bank Details', desc: 'Add your account to receive payments', href: '/dashboard/bank-details' },
    { title: 'Messages', desc: 'Chat with clients', href: '/messages' },
    { title: 'Q&A Forum', desc: 'Answer construction questions', href: '/qa' },
    { title: 'My Bookings', desc: 'View and manage client requests', href: '/bookings' },
    { title: 'Marketplace', desc: 'Browse building materials', href: '/marketplace' },
    { title: 'Project Hub', desc: 'Manage client projects', href: '/projects' },
  ],
  service_provider: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Bank Details', desc: 'Add your account to receive payments', href: '/dashboard/bank-details' },
    { title: 'Messages', desc: 'Chat with clients', href: '/messages' },
    { title: 'My Bookings', desc: 'View and manage service requests', href: '/bookings' },
    { title: 'Project Hub', desc: 'Manage service projects', href: '/projects' },
  ],
  equipment_provider: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Bank Details', desc: 'Add your account to receive payments', href: '/dashboard/bank-details' },
    { title: 'Messages', desc: 'Chat with clients', href: '/messages' },
  ],
  field_marketer: [
    { title: 'My Dashboard', desc: 'View your referrals and earnings', href: '/field-marketer' },
    { title: 'My Profile', desc: 'Edit your details', href: '/dashboard/profile' },
  ],
}

const roleWelcome = {
  project_owner: { title: 'Project Owner', tip: 'Browse verified artisans, compare material prices, and manage your build.' },
  artisan: { title: 'Artisan', tip: 'Complete your profile and get verified to start receiving job enquiries.' },
  supplier: { title: 'Supplier', tip: 'List your products, manage orders, and connect with buyers across Nigeria.' },
  professional: { title: 'Professional', tip: 'Showcase your credentials and connect with clients who need your expertise.' },
  service_provider: { title: 'Service Provider', tip: 'Get verified and connect with project owners who need your services.' },
  equipment_provider: { title: 'Equipment Provider', tip: 'List your equipment and connect with construction projects.' },
  field_marketer: { title: 'Field Marketer', tip: 'Track your referrals and earnings from the EnGedi Africa programme.' },
}

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
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error) { console.log('Profile error:', error); setLoading(false); return }
      setProfile(data)
      if (data.role === 'field_marketer') { router.push('/field-marketer'); return }
      const { data: notifData } = await supabase.from('notifications').select('*').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false }).limit(5)
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
    <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted }}>Loading...</p>
    </div>
  )

  const menuItems = roleMenus[profile?.role] || roleMenus.project_owner
  const roleInfo = roleWelcome[profile?.role] || roleWelcome.project_owner
  const isVerified = profile?.verification_status === 'approved'
  const isProfileComplete = profile?.profile_completed === true
  const needsBankDetails = ['artisan', 'supplier', 'professional', 'service_provider', 'equipment_provider'].includes(profile?.role) && !profile?.bank_account_name

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>

      {/* Topbar */}
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>EnGedi Africa</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {notifications.length > 0 && (
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => router.push('/messages')}>
              <span style={{ fontSize: '18px' }}>🔔</span>
              <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: C.danger, color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '800' }}>
                {notifications.length}
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            Log out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Welcome card */}
        <div style={{ background: C.raised, border: `1px solid ${isVerified ? C.oasis + '44' : C.line}`, borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.sunk, border: `2px solid ${isVerified ? C.oasis : C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: C.clay, overflow: 'hidden' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile?.full_name?.charAt(0)?.toUpperCase() || '?'
                }
              </div>
              {isVerified && (
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderRadius: '50%', background: C.oasis, border: `2px solid ${C.raised}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: C.sunk, fontSize: '10px', fontWeight: '800' }}>✓</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: 0 }}>
                  Welcome, {profile?.full_name?.split(' ')[0] || 'there'}
                </h1>
                {isVerified && (
                  <span style={{ background: '#1a2e1d', border: `1px solid ${C.oasis}44`, color: C.oasis, fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.3px' }}>
                    VERIFIED
                  </span>
                )}
              </div>
              <span style={{ background: C.sunk, border: `1px solid ${C.clay}44`, color: C.clay, fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '4px' }}>
                {roleInfo.title}
              </span>
              <p style={{ color: C.muted, fontSize: '13px', margin: '10px 0 0', lineHeight: '1.6' }}>{roleInfo.tip}</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontWeight: '700', color: C.text, margin: 0, fontSize: '14px' }}>Notifications</p>
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: C.clay, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Mark all read</button>
            </div>
            {notifications.map(n => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${C.line}`, gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600', color: C.text }}>{n.title}</p>
                  {n.body && <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>{n.body}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {n.link && <Link href={n.link} onClick={() => markRead(n.id)} style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>View</Link>}
                  <button onClick={() => markRead(n.id)} style={{ background: 'none', border: `1px solid ${C.line}`, color: C.muted, padding: '5px 8px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile completion */}
        {!isProfileComplete && (
          <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '18px 20px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: C.text, margin: '0 0 4px', fontSize: '14px' }}>Complete your profile</p>
              <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>Add your details so customers can find and trust you</p>
            </div>
            <Link href="/dashboard/profile" style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px' }}>Complete Now</Link>
          </div>
        )}

        {/* Verification prompt */}
        {isProfileComplete && !profile?.documents_submitted && (
          <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '18px 20px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: C.text, margin: '0 0 4px', fontSize: '14px' }}>Get verified</p>
              <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>Upload your documents to earn the EnGedi Verified badge</p>
            </div>
            <Link href="/dashboard/verification" style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px' }}>Upload Docs</Link>
          </div>
        )}

        {profile?.documents_submitted && !isVerified && profile?.verification_status !== 'rejected' && (
          <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '14px 20px', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontWeight: '600', color: C.clay, fontSize: '13px' }}>⏳ Documents submitted — under review</p>
          </div>
        )}

        {profile?.verification_status === 'rejected' && (
          <div style={{ background: C.dangerSoft, border: `1px solid ${C.danger}44`, borderRadius: '12px', padding: '14px 20px', marginBottom: '12px' }}>
            <p style={{ margin: '0 0 4px', fontWeight: '700', color: C.danger, fontSize: '14px' }}>Verification rejected</p>
            {profile?.admin_notes && <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>{profile.admin_notes}</p>}
          </div>
        )}

        {/* Bank details prompt */}
        {needsBankDetails && isProfileComplete && (
          <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '18px 20px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: C.text, margin: '0 0 4px', fontSize: '14px' }}>Add your bank details</p>
              <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>Required to receive payments when clients confirm orders</p>
            </div>
            <Link href="/dashboard/bank-details" style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px' }}>Add Now</Link>
          </div>
        )}

        {/* Artisan training prompt */}
        {profile?.role === 'artisan' && (
          <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '18px 20px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: C.text, margin: '0 0 4px', fontSize: '14px' }}>Complete your training</p>
              <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>Finish all 5 modules to earn your EnGedi Certified Professional badge</p>
            </div>
            <Link href="/training" style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px' }}>Start Training</Link>
          </div>
        )}

        {/* Supplier listings prompt */}
        {profile?.role === 'supplier' && (
          <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '18px 20px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: C.text, margin: '0 0 4px', fontSize: '14px' }}>List your products</p>
              <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>Add your materials so buyers can find and order from you</p>
            </div>
            <Link href="/marketplace" style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '700', fontSize: '13px' }}>Manage Listings</Link>
          </div>
        )}

        {/* Menu grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '8px' }}>
          {menuItems.map(item => (
            <Link key={item.title} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '20px', cursor: 'pointer', height: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.clay}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.line}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: C.text, margin: '0 0 6px' }}>{item.title}</h3>
                <p style={{ fontSize: '12px', color: C.muted, margin: 0, lineHeight: '1.5' }}>{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}