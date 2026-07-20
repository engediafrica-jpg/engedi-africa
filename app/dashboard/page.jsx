'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import useAccessGate from '@/hooks/useAccessGate'

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
    { title: 'Bookings', desc: 'Track quote requests and hired jobs', href: '/bookings' },
    { title: 'Project Hub', desc: 'Manage your construction projects', href: '/projects' },
  ],
  artisan: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Bank Details', desc: 'Add your account to receive payments', href: '/dashboard/bank-details' },
    { title: 'Bookings', desc: 'Respond to job requests from clients', href: '/bookings' },
    { title: 'Messages', desc: 'Chat with clients', href: '/messages' },
    { title: 'Q&A Forum', desc: 'Answer construction questions', href: '/qa' },
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
    { title: 'Bookings', desc: 'Respond to job requests from clients', href: '/bookings' },
    { title: 'Messages', desc: 'Chat with clients', href: '/messages' },
    { title: 'Q&A Forum', desc: 'Answer construction questions', href: '/qa' },
    { title: 'Marketplace', desc: 'Browse building materials', href: '/marketplace' },
    { title: 'Project Hub', desc: 'Manage client projects', href: '/projects' },
  ],
  service_provider: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Bank Details', desc: 'Add your account to receive payments', href: '/dashboard/bank-details' },
    { title: 'Bookings', desc: 'Respond to job requests from clients', href: '/bookings' },
    { title: 'Messages', desc: 'Chat with clients', href: '/messages' },
    { title: 'Project Hub', desc: 'Manage service projects', href: '/projects' },
  ],
  equipment_provider: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Verification', desc: 'Upload your documents', href: '/dashboard/verification' },
    { title: 'Wallet', desc: 'Manage payments', href: '/dashboard/wallet' },
    { title: 'Bank Details', desc: 'Add your account to receive payments', href: '/dashboard/bank-details' },
    { title: 'Bookings', desc: 'Respond to equipment hire requests from clients', href: '/bookings' },
    { title: 'Messages', desc: 'Chat with clients', href: '/messages' },
    { title: 'Manage Listings', desc: 'List your equipment for rent', href: '/marketplace' },
    { title: 'My Orders', desc: 'View and fulfill equipment orders received', href: '/orders' },
  ],
  field_marketer: [
    { title: 'My Profile', desc: 'Edit your details and avatar', href: '/dashboard/profile' },
    { title: 'Referral Dashboard', desc: 'Your referral link, signups, and payment history', href: '/marketer' },
  ],
}

const roleWelcome = {
  project_owner: { title: 'Project Owner', tip: 'Browse verified artisans, compare material prices, and manage your build — all in one place.' },
  artisan: { title: 'Artisan', tip: 'Complete your profile and get verified to start receiving job enquiries from project owners.' },
  supplier: { title: 'Supplier', tip: 'List your products, manage orders, and connect with buyers across Nigeria.' },
  professional: { title: 'Professional', tip: 'Showcase your credentials, answer questions, and connect with clients who need your expertise.' },
  service_provider: { title: 'Service Provider', tip: 'Get verified and connect with project owners who need your services.' },
  equipment_provider: { title: 'Equipment Provider', tip: 'List your equipment and connect with construction projects that need it.' },
  field_marketer: { title: 'Field Marketer', tip: 'Share your referral link and track everyone who joins through it.' },
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

  const { locked } = useAccessGate(profile)

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  const allMenuItems = roleMenus[profile?.role] || roleMenus.project_owner
  const menuItems = allMenuItems.filter(item => {
    if (locked === 'profile') return item.href === '/dashboard/profile'
    if (locked === 'training') return item.href === '/dashboard/profile' || item.href === '/training'
    return true
  })
  const roleInfo = roleWelcome[profile?.role] || roleWelcome.project_owner
  const isVerified = profile?.verification_status === 'approved'
  const isProfileComplete = profile?.profile_completed === true

  const needsBankDetails = ['artisan', 'supplier', 'professional', 'service_provider', 'equipment_provider'].includes(profile?.role) && !profile?.bank_account_name

  return (
    <div className="min-h-screen bg-surface">

      <AppNav
        right={
          <div className="flex items-center gap-4">
            {notifications.length > 0 && (
              <div className="relative">
                <Link href="/messages" className="text-ink-text no-underline" aria-label="Notifications">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
                    <path d="M10 19a2 2 0 0 0 4 0" />
                  </svg>
                </Link>
                <div className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center bg-danger px-[3px] font-mono text-[10px] font-bold text-clay-contrast">
                  {notifications.length}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="cursor-pointer border border-line-strong bg-transparent px-4 py-2 font-mono text-[13px] text-ink-muted transition-colors hover:text-ink-text"
            >
              Log out
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-[900px] px-6 py-10">

        {/* Welcome card */}
        <div className={`ticks mb-6 border ${isVerified ? 'border-oasis' : 'border-line'} bg-surface-raised p-8`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative shrink-0">
              <div className={`flex h-[68px] w-[68px] items-center justify-center overflow-hidden border-2 ${isVerified ? 'border-oasis' : 'border-clay'} bg-surface-sunk font-display text-[26px] font-bold text-clay`}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                  : profile?.full_name?.charAt(0)?.toUpperCase() || '?'
                }
              </div>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 flex h-[22px] w-[22px] items-center justify-center border-2 border-surface-raised bg-oasis">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--oasis-soft)" strokeWidth="3">
                    <path d="M4 12l6 6L20 6" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2.5">
                <h1 className="m-0 font-display text-[22px] font-bold text-text">
                  Welcome, {profile?.full_name?.split(' ')[0] || 'there'}
                </h1>
                {isVerified && <Badge tone="success">EnGedi Verified</Badge>}
              </div>
              <Badge tone="pending">{roleInfo.title}</Badge>
              <p className="mb-0 mt-2.5 text-[13px] leading-relaxed text-text-muted">{roleInfo.tip}</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="ticks mb-4 border border-line bg-surface-raised p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="m-0 font-display text-[15px] font-bold text-text">Notifications</p>
              <button onClick={markAllRead} className="cursor-pointer border-none bg-transparent p-0 font-mono text-[13px] font-semibold text-clay">Mark all read</button>
            </div>
            {notifications.map(n => (
              <div key={n.id} className="flex items-center justify-between gap-3 border-t border-line py-2.5">
                <div className="flex-1">
                  <p className="m-0 mb-0.5 text-[14px] font-semibold text-text">{n.title}</p>
                  {n.body && <p className="m-0 text-[12px] text-text-muted">{n.body}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {n.link && (
                    <Link href={n.link} onClick={() => markRead(n.id)} className="bg-text px-3 py-1.5 font-mono text-[12px] font-semibold text-surface no-underline">View</Link>
                  )}
                  <button onClick={() => markRead(n.id)} className="cursor-pointer border border-line bg-transparent px-2.5 py-1.5 text-[12px] text-text-muted">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile completion */}
        {!isProfileComplete && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-clay bg-surface-raised p-5">
            <div>
              <p className="m-0 mb-1 text-[15px] font-bold text-text">Complete your profile</p>
              <p className="m-0 text-[13px] text-text-muted">Add your details so customers can find and trust you</p>
            </div>
            <Button href="/dashboard/profile" variant="solid">Complete Now</Button>
          </div>
        )}

        {/* Verification prompt */}
        {isProfileComplete && !profile?.documents_submitted && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-line bg-surface-raised p-5">
            <div>
              <p className="m-0 mb-1 text-[15px] font-bold text-text">Get verified</p>
              <p className="m-0 text-[13px] text-text-muted">Upload your documents to earn the EnGedi Verified badge</p>
            </div>
            <Button href="/dashboard/verification" variant="solid">Upload Docs</Button>
          </div>
        )}

        {profile?.documents_submitted && !isVerified && profile?.verification_status !== 'rejected' && (
          <div className="mb-4 border border-clay bg-surface-raised px-5 py-4">
            <p className="m-0 font-mono text-[13px] font-bold text-clay">Documents submitted — Your verification is under review</p>
          </div>
        )}

        {profile?.verification_status === 'rejected' && (
          <div className="mb-4 border border-danger bg-danger-soft px-5 py-4">
            <p className="m-0 mb-1 font-mono text-[13px] font-bold text-danger">Verification rejected</p>
            {profile?.admin_notes && <p className="m-0 text-[13px] text-text-muted">{profile.admin_notes}</p>}
          </div>
        )}

        {/* Bank details prompt for providers */}
        {needsBankDetails && isProfileComplete && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-clay bg-surface-raised p-5">
            <div>
              <p className="m-0 mb-1 text-[15px] font-bold text-text">Add your bank details</p>
              <p className="m-0 text-[13px] text-text-muted">Required to receive payments when clients confirm orders</p>
            </div>
            <Button href="/dashboard/bank-details" variant="solid">Add Now</Button>
          </div>
        )}

        {/* Artisan training prompt */}
        {profile?.role === 'artisan' && locked === 'training' && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-line-strong bg-ink p-5">
            <div>
              <p className="m-0 mb-1 text-[15px] font-bold text-ink-text">Complete your training</p>
              <p className="m-0 text-[13px] text-ink-muted">Finish all 5 modules to earn your EnGedi Certified Professional badge</p>
            </div>
            <Button href="/training" variant="solid">Start Training</Button>
          </div>
        )}

        {/* Supplier listings prompt */}
        {profile?.role === 'supplier' && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-line-strong bg-ink p-5">
            <div>
              <p className="m-0 mb-1 text-[15px] font-bold text-ink-text">List your products</p>
              <p className="m-0 text-[13px] text-ink-muted">Add your materials so buyers across Nigeria can find and order from you</p>
            </div>
            <Button href="/marketplace" variant="solid">Manage Listings</Button>
          </div>
        )}

        {/* Menu */}
        <div className="ticks grid grid-cols-1 border-l border-t border-line sm:grid-cols-2">
          {menuItems.map(item => (
            <Link key={item.title} href={item.href} className="border-b border-r border-line p-6 no-underline transition-colors hover:bg-surface-raised">
              <h3 className="m-0 mb-1.5 font-display text-[15px] font-bold text-text">{item.title}</h3>
              <p className="m-0 text-[13px] leading-relaxed text-text-muted">{item.desc}</p>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
