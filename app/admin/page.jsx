'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TOTAL_MODULES = 5

const C = {
  black: '#111111',
  ink: '#1A1A1A',
  white: '#FFFFFF',
  laterite: '#8B5E3C',
  lateriteDark: '#6F472D',
  lateriteLight: '#F3E8DE',
  lateriteSoft: '#F8F2ED',
  background: '#F7F5F2',
  surface: '#FFFFFF',
  border: '#E5DED6',
  muted: '#77716B',
  lightMuted: '#A39D96',
  success: '#3F6B4F',
  successBg: '#EDF4EF',
  danger: '#8B3A32',
  dangerBg: '#F8ECEA',
  warning: '#8B6538',
  warningBg: '#F8F1E7',
  info: '#4C6175',
  infoBg: '#EEF2F5',
}

const teamRoleLabel = {
  admin: 'Admin',
  field_marketer: 'Field Marketer',
  verifier: 'Verifier',
  support: 'Support',
}

const teamRoleDescription = {
  admin: 'Full access to everything in the admin panel',
  field_marketer: 'Own referral code and signups only',
  verifier: 'Users and Pending Verification only',
  support: 'Disputes and Bookings only',
}

const roleLabel = {
  project_owner: 'Project Owner',
  artisan: 'Artisan',
  supplier: 'Supplier',
  professional: 'Professional',
  service_provider: 'Service Provider',
  equipment_provider: 'Equipment Provider',
}

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  const [docUrls, setDocUrls] = useState({})
  const [loadingDocs, setLoadingDocs] = useState(false)

  const [activeSection, setActiveSection] = useState('overview')

  const [training, setTraining] = useState([])
  const [trainingLoading, setTrainingLoading] = useState(false)

  const [team, setTeam] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)

  const [showTeamForm, setShowTeamForm] = useState(false)

  const [teamForm, setTeamForm] = useState({
    full_name: '',
    email: '',
    password: '',
    team_role: 'field_marketer',
  })

  const [creatingTeamMember, setCreatingTeamMember] = useState(false)
  const [deletingTeamMember, setDeletingTeamMember] = useState(null)

  const [revenue, setRevenue] = useState({ orders: 0, bookings: 0, total: 0 })
  const [revenueLoading, setRevenueLoading] = useState(false)

  const [disputes, setDisputes] = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | deactivated

  // Deactivate / delete
  const [togglingActive, setTogglingActive] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }

      const { data: me } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      if (!me?.is_admin) { router.push('/dashboard'); return }

      // Exclude team members from the regular Users view — they're managed under Team
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or('is_team_member.eq.false,is_team_member.is.null')
        .order('created_at', { ascending: false })

      setUsers(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const loadTraining = async () => {
    setTrainingLoading(true)
    const { data } = await supabase
      .from('training_completions')
      .select('*, user:profiles!training_completions_user_id_fkey(full_name, email, avatar_url)')
      .eq('passed', true)
      .order('created_at', { ascending: false })
    setTraining(data || [])
    setTrainingLoading(false)
  }

  const loadTeam = async () => {
    setTeamLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*, signups:field_marketer_signups(id, referred_user_name, referred_user_role, created_at)')
      .eq('is_team_member', true)
      .order('created_at', { ascending: false })
    setTeam(data || [])
    setTeamLoading(false)
  }

  const loadRevenue = async () => {
    setRevenueLoading(true)
    const { data: orders } = await supabase.from('orders').select('commission_amount').eq('payment_status', 'released')
    const { data: bookings } = await supabase.from('bookings').select('commission_amount').eq('payment_status', 'released')
    const orderRevenue = orders?.reduce((sum, o) => sum + Number(o.commission_amount || 0), 0) || 0
    const bookingRevenue = bookings?.reduce((sum, b) => sum + Number(b.commission_amount || 0), 0) || 0
    setRevenue({ orders: orderRevenue, bookings: bookingRevenue, total: orderRevenue + bookingRevenue })
    setRevenueLoading(false)
  }

  const loadDisputes = async () => {
    setDisputesLoading(true)
    const { data } = await supabase
      .from('disputes')
      .select('*, raiser:profiles!disputes_raised_by_fkey(full_name, email)')
      .order('created_at', { ascending: false })
    setDisputes(data || [])
    setDisputesLoading(false)
  }

  const loadDocuments = async (user) => {
    setLoadingDocs(true)
    const urls = {}
    if (user.id_document_url) {
      const { data } = await supabase.storage.from('verification-docs').createSignedUrl(user.id_document_url, 3600)
      if (data) urls.id = data.signedUrl
    }
    if (user.cac_document_url) {
      const { data } = await supabase.storage.from('verification-docs').createSignedUrl(user.cac_document_url, 3600)
      if (data) urls.cac = data.signedUrl
    }
    if (user.professional_license_url) {
      const { data } = await supabase.storage.from('verification-docs').createSignedUrl(user.professional_license_url, 3600)
      if (data) urls.license = data.signedUrl
    }
    setDocUrls(urls)
    setLoadingDocs(false)
  }

  const handleSelect = async (user) => {
    if (selected?.id === user.id) { setSelected(null); setDocUrls({}); return }
    setSelected(user)
    setNote(user.admin_notes || '')
    await loadDocuments(user)
  }

  const handleVerify = async (userId, status) => {
    setMessage('')
    const { error } = await supabase.from('profiles').update({
      verification_status: status,
      is_verified: status === 'approved',
      admin_notes: note,
    }).eq('id', userId)

    if (error) { setMessage('Error updating verification status'); return }

    setUsers(users.map((user) => user.id === userId
      ? { ...user, verification_status: status, is_verified: status === 'approved', admin_notes: note }
      : user))

    setSelected(null)
    setDocUrls({})
    setNote('')
    setMessage(status === 'approved' ? 'User approved successfully' : status === 'rejected' ? 'User rejected successfully' : 'Verification reset to pending')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleToggleActive = async (userId, currentlyActive) => {
    setTogglingActive(userId)
    const newActive = !currentlyActive
    const { error } = await supabase.from('profiles').update({ is_active: newActive }).eq('id', userId)
    if (!error) {
      setUsers(users.map((u) => u.id === userId ? { ...u, is_active: newActive } : u))
      setMessage(newActive ? 'Account reactivated' : 'Account deactivated')
      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('Error updating account status')
    }
    setTogglingActive(null)
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Permanently delete ${userName || 'this user'}? This cannot be undone.`)) return
    setDeletingUser(userId)

    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    const data = await res.json()

    if (data.success) {
      setUsers(users.filter((u) => u.id !== userId))
      if (selected?.id === userId) { setSelected(null); setDocUrls({}) }
      setMessage('User deleted successfully')
      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('Error: ' + data.error)
    }
    setDeletingUser(null)
  }

  const handleCreateTeamMember = async () => {
    if (!teamForm.full_name || !teamForm.email || !teamForm.password) { setMessage('Please fill all fields'); return }
    if (teamForm.password.length < 6) { setMessage('Password must be at least 6 characters'); return }

    setCreatingTeamMember(true)
    setMessage('')

    const res = await fetch('/api/admin/team-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamForm),
    })
    const data = await res.json()

    if (data.success) {
      if (data.email_sent === false) {
        setMessage(`Team member created, but the welcome email failed to send (${data.email_error || 'unknown error'}). Share their login details manually.`)
      } else {
        setMessage(
          teamForm.team_role === 'field_marketer'
            ? `Team member created and emailed. Referral code: ${data.referral_code}`
            : 'Team member created and emailed successfully'
        )
      }
      setTeamForm({ full_name: '', email: '', password: '', team_role: 'field_marketer' })
      setShowTeamForm(false)
      await loadTeam()
    } else {
      setMessage('Error: ' + data.error)
    }
    setCreatingTeamMember(false)
  }

  const handleDeleteTeamMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this team member? This cannot be undone.')) return
    setDeletingTeamMember(memberId)

    const res = await fetch('/api/admin/team-members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId }),
    })
    const data = await res.json()

    if (data.success) {
      setTeam(team.filter((m) => m.id !== memberId))
      setMessage('Team member removed successfully')
      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('Error: ' + data.error)
    }
    setDeletingTeamMember(null)
  }

  const handleChangeTeamRole = async (memberId, newRole) => {
    const { error } = await supabase.from('profiles').update({ team_role: newRole }).eq('id', memberId)
    if (!error) {
      setTeam(team.map((m) => m.id === memberId ? { ...m, team_role: newRole } : m))
      setMessage('Role updated')
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const handleResolveDispute = async (disputeId, resolution) => {
    const { error } = await supabase.from('disputes').update({
      status: 'resolved', resolution, resolved_at: new Date().toISOString(),
    }).eq('id', disputeId)

    if (!error) {
      setDisputes(disputes.map((d) => d.id === disputeId ? { ...d, status: 'resolved', resolution } : d))
      setMessage('Dispute resolved')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const trainingByUser = training.reduce((acc, item) => {
    const uid = item.user_id
    if (!acc[uid]) acc[uid] = { user: item.user, modules: [] }
    acc[uid].modules.push(item)
    return acc
  }, {})

  const pendingVerification = users.filter((u) => u.documents_submitted && u.verification_status === 'pending')

  // Apply search + filters to whichever list (all users or pending) is active
  const applyFilters = (list) => {
    return list.filter((u) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchesSearch = (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
        if (!matchesSearch) return false
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (verificationFilter !== 'all' && (u.verification_status || 'pending') !== verificationFilter) return false
      if (statusFilter === 'active' && u.is_active === false) return false
      if (statusFilter === 'deactivated' && u.is_active !== false) return false
      return true
    })
  }

  const visibleUsers = applyFilters(activeSection === 'pending' ? pendingVerification : users)

  const sections = [
    { key: 'overview', label: 'Overview', icon: '◆' },
    { key: 'users', label: 'All Users', icon: '◈', count: users.length },
    { key: 'pending', label: 'Pending Review', icon: '◉', count: pendingVerification.length },
    { key: 'training', label: 'Training', icon: '◎' },
    { key: 'team', label: 'Team', icon: '◐', count: team.length },
    { key: 'disputes', label: 'Disputes', icon: '◇' },
    { key: 'revenue', label: 'Revenue', icon: '◒' },
  ]

  const openSection = (key) => {
    setActiveSection(key)
    if (key === 'training' && training.length === 0) loadTraining()
    if (key === 'team' && team.length === 0) loadTeam()
    if (key === 'revenue') loadRevenue()
    if (key === 'disputes' && disputes.length === 0) loadDisputes()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.background, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: C.black, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontWeight: '800', fontSize: '16px' }}>E</div>
          <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.background, fontFamily: 'Arial, Helvetica, sans-serif', color: C.ink, display: 'flex' }}>

      <div style={{ width: '240px', flexShrink: 0, background: C.black, minHeight: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid #2A2A2A` }}>
          <Link href="/" style={{ color: C.white, textDecoration: 'none', fontWeight: '800', fontSize: '17px', letterSpacing: '-0.4px' }}>
            EnGedi Africa
          </Link>
          <p style={{ margin: '4px 0 0', color: C.laterite, fontSize: '10px', fontWeight: '800', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            Admin
          </p>
        </div>

        <div style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => openSection(s.key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: '8px',
                border: 'none', cursor: 'pointer',
                background: activeSection === s.key ? C.laterite : 'transparent',
                color: activeSection === s.key ? C.white : '#BDB8B2',
                fontWeight: activeSection === s.key ? '700' : '600',
                fontSize: '13px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', opacity: 0.8 }}>{s.icon}</span>
                {s.label}
              </span>
              {typeof s.count === 'number' && (
                <span style={{
                  background: activeSection === s.key ? 'rgba(255,255,255,0.25)' : '#2A2A2A',
                  color: activeSection === s.key ? C.white : '#BDB8B2',
                  fontSize: '11px', fontWeight: '700', padding: '2px 7px', borderRadius: '10px',
                }}>
                  {s.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 20px', borderTop: `1px solid #2A2A2A` }}>
          <Link href="/dashboard" style={{ color: '#BDB8B2', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 28px 70px' }}>

          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.black, margin: '0 0 6px', letterSpacing: '-0.6px' }}>
              {sections.find((s) => s.key === activeSection)?.label}
            </h1>
            {activeSection === 'overview' && (
              <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>
                {users.length} total users · {pendingVerification.length} pending verification
              </p>
            )}
          </div>

          {message && (
            <div style={{
              background: message.includes('Error') ? C.dangerBg : C.lateriteSoft,
              border: `1px solid ${message.includes('Error') ? C.danger : C.laterite}`,
              color: message.includes('Error') ? C.danger : C.lateriteDark,
              padding: '12px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '18px',
            }}>
              {message}
            </div>
          )}

          {activeSection === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              {[
                { label: 'Total Users', value: users.length, action: () => openSection('users') },
                { label: 'Pending Verification', value: pendingVerification.length, action: () => openSection('pending'), featured: pendingVerification.length > 0 },
                { label: 'Team Members', value: team.length, action: () => openSection('team') },
                { label: 'Open Disputes', value: disputes.filter(d => d.status === 'open').length, action: () => openSection('disputes') },
              ].map((item) => (
                <button key={item.label} onClick={item.action} style={{
                  textAlign: 'left', background: C.white, border: `1px solid ${item.featured ? C.laterite : C.border}`,
                  borderRadius: '12px', padding: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', color: C.muted, fontWeight: '700' }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: item.featured ? C.laterite : C.black }}>{item.value}</p>
                </button>
              ))}
            </div>
          )}

          {activeSection === 'revenue' && (
            <div>
              {revenueLoading ? <p style={{ color: C.muted }}>Loading revenue...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  {[
                    { label: 'Orders Commission', value: revenue.orders },
                    { label: 'Bookings Commission', value: revenue.bookings },
                    { label: 'Total Revenue', value: revenue.total, featured: true },
                  ].map((item) => (
                    <div key={item.label} style={{ background: C.white, border: `1px solid ${item.featured ? C.laterite : C.border}`, borderRadius: '12px', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: C.muted, fontWeight: '700' }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: item.featured ? C.laterite : C.black }}>₦{Number(item.value).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'disputes' && (
            <div>
              {disputesLoading ? <p style={{ color: C.muted }}>Loading disputes...</p>
                : disputes.length === 0 ? (
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '50px 30px', textAlign: 'center' }}>
                    <p style={{ color: C.lightMuted, fontSize: '14px', margin: 0, fontWeight: '600' }}>No disputes yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {disputes.map((dispute) => {
                      const resolved = dispute.status === 'resolved'
                      return (
                        <div key={dispute.id} style={{ background: C.white, border: `1px solid ${resolved ? C.border : C.laterite}`, borderRadius: '12px', padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                            <div>
                              <p style={{ margin: '0 0 5px', fontWeight: '800', fontSize: '15px', color: C.black }}>Dispute #{dispute.id.substring(0, 8)}</p>
                              <p style={{ margin: '0 0 5px', fontSize: '13px', color: C.muted }}>Raised by: {dispute.raiser?.full_name} · {dispute.raiser?.email}</p>
                              <p style={{ margin: 0, fontSize: '12px', color: C.lightMuted }}>{new Date(dispute.created_at).toLocaleDateString()}</p>
                            </div>
                            <span style={{
                              background: resolved ? C.successBg : C.lateriteSoft,
                              border: `1px solid ${resolved ? C.success : C.laterite}`,
                              color: resolved ? C.success : C.lateriteDark,
                              fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', textTransform: 'capitalize',
                            }}>{dispute.status}</span>
                          </div>

                          <div style={{ background: C.background, borderRadius: '8px', padding: '13px', marginBottom: '12px' }}>
                            <p style={{ margin: '0 0 5px', fontSize: '10px', color: C.lightMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Reason</p>
                            <p style={{ margin: 0, fontSize: '14px', color: C.black }}>{dispute.reason}</p>
                          </div>

                          {resolved && dispute.resolution && (
                            <div style={{ background: C.successBg, borderRadius: '8px', padding: '13px', marginBottom: '12px' }}>
                              <p style={{ margin: '0 0 5px', fontSize: '10px', color: C.success, fontWeight: '800', textTransform: 'uppercase' }}>Resolution</p>
                              <p style={{ margin: 0, fontSize: '14px', color: C.black }}>{dispute.resolution}</p>
                            </div>
                          )}

                          {dispute.status === 'open' && (
                            <div>
                              <input type="text" placeholder="Enter resolution..." id={`resolution-${dispute.id}`}
                                style={{ width: '100%', padding: '11px', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }} />
                              <button onClick={() => {
                                const input = document.getElementById(`resolution-${dispute.id}`)
                                if (input?.value) handleResolveDispute(dispute.id, input.value)
                              }} style={{ background: C.black, color: C.white, border: 'none', padding: '10px 18px', borderRadius: '7px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                                Mark Resolved
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
            </div>
          )}

          {activeSection === 'team' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <p style={{ margin: 0, color: C.muted, fontSize: '14px' }}>{team.length} team members</p>
                <button onClick={() => setShowTeamForm(!showTeamForm)} style={{ background: C.black, color: C.white, border: 'none', padding: '10px 18px', borderRadius: '7px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                  + Invite Team Member
                </button>
              </div>

              {showTeamForm && (
                <div style={{ background: C.white, border: `1px solid ${C.laterite}`, borderRadius: '12px', padding: '26px', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: C.black, margin: '0 0 20px' }}>Invite Team Member</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                    {[
                      { label: 'Full Name', type: 'text', placeholder: 'Team member name', key: 'full_name' },
                      { label: 'Email', type: 'email', placeholder: 'their@email.com', key: 'email' },
                      { label: 'Password', type: 'text', placeholder: 'Set their password', key: 'password' },
                    ].map((field) => (
                      <div key={field.key}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: C.black, marginBottom: '6px' }}>{field.label}</label>
                        <input type={field.type} placeholder={field.placeholder} value={teamForm[field.key]}
                          onChange={(e) => setTeamForm({ ...teamForm, [field.key]: e.target.value })}
                          style={{ width: '100%', padding: '11px', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: C.black, marginBottom: '6px' }}>Role</label>
                    <select value={teamForm.team_role} onChange={(e) => setTeamForm({ ...teamForm, team_role: e.target.value })}
                      style={{ width: '100%', padding: '11px', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', appearance: 'none', background: C.white }}>
                      {Object.entries(teamRoleLabel).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.muted }}>{teamRoleDescription[teamForm.team_role]}</p>
                  </div>

                  <div style={{ background: C.lateriteSoft, border: `1px solid ${C.laterite}`, borderRadius: '7px', padding: '12px', marginBottom: '18px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: C.lateriteDark, lineHeight: '1.6' }}>
                      A welcome email with their login details{teamForm.team_role === 'field_marketer' ? ' and referral code' : ''} will be sent automatically.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowTeamForm(false)} style={{ flex: 1, background: C.white, color: C.black, border: `1px solid ${C.border}`, padding: '11px', borderRadius: '7px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={handleCreateTeamMember} disabled={creatingTeamMember}
                      style={{ flex: 2, background: C.black, color: C.white, border: 'none', padding: '11px', borderRadius: '7px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                      {creatingTeamMember ? 'Creating & Sending Email...' : 'Invite Team Member'}
                    </button>
                  </div>
                </div>
              )}

              {teamLoading ? <p style={{ color: C.muted }}>Loading...</p>
                : team.length === 0 ? (
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '45px 30px', textAlign: 'center' }}>
                    <p style={{ color: C.lightMuted, fontSize: '14px', margin: '0 0 7px', fontWeight: '700' }}>No team members yet</p>
                    <p style={{ color: C.lightMuted, fontSize: '12px', margin: 0 }}>Invite your first team member above</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {team.map((member) => (
                      <div key={member.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: C.lateriteSoft, border: `2px solid ${C.laterite}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: C.laterite, fontSize: '18px', overflow: 'hidden', flexShrink: 0 }}>
                              {member.avatar_url ? <img src={member.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (member.full_name?.charAt(0)?.toUpperCase() || '?')}
                            </div>
                            <div>
                              <p style={{ margin: '0 0 4px', fontWeight: '800', fontSize: '15px', color: C.black }}>{member.full_name}</p>
                              <p style={{ margin: '0 0 8px', fontSize: '13px', color: C.muted }}>{member.email}</p>
                              <select value={member.team_role || ''} onChange={(e) => handleChangeTeamRole(member.id, e.target.value)}
                                style={{ padding: '5px 10px', border: `1px solid ${C.laterite}`, borderRadius: '20px', fontSize: '11px', fontWeight: '800', color: C.lateriteDark, background: C.lateriteSoft, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                                {Object.entries(teamRoleLabel).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                              {member.team_role === 'field_marketer' && member.referral_code && (
                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ background: C.background, color: C.muted, fontSize: '11px', padding: '3px 9px', borderRadius: '20px' }}>
                                    {member.referral_code} · {member.signups?.length || 0} referrals
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteTeamMember(member.id)} disabled={deletingTeamMember === member.id}
                            style={{ background: C.dangerBg, color: C.danger, border: `1px solid ${C.danger}`, padding: '8px 15px', borderRadius: '7px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                            {deletingTeamMember === member.id ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {activeSection === 'training' && (
            <div>
              {trainingLoading ? <p style={{ color: C.muted }}>Loading...</p>
                : Object.keys(trainingByUser).length === 0 ? (
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '45px 30px', textAlign: 'center' }}>
                    <p style={{ color: C.lightMuted, fontSize: '14px', margin: 0 }}>No artisans have completed any training modules yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.values(trainingByUser).map(({ user, modules }) => {
                      const completed = modules.length
                      const allDone = completed >= TOTAL_MODULES
                      const percentage = Math.min((completed / TOTAL_MODULES) * 100, 100)
                      return (
                        <div key={modules[0].user_id} style={{ background: C.white, border: `1px solid ${allDone ? C.laterite : C.border}`, borderRadius: '12px', padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.lateriteSoft, border: `2px solid ${C.laterite}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: C.laterite, fontSize: '16px', overflow: 'hidden', flexShrink: 0 }}>
                                {user?.avatar_url ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.full_name?.charAt(0)?.toUpperCase() || '?')}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: C.black }}>{user?.full_name}</p>
                                  {allDone && <span style={{ background: C.lateriteSoft, border: `1px solid ${C.laterite}`, color: C.lateriteDark, fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '20px' }}>CERTIFIED</span>}
                                </div>
                                <p style={{ margin: '3px 0 0', fontSize: '12px', color: C.muted }}>{user?.email}</p>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '800', color: C.black }}>{completed}/{TOTAL_MODULES} modules</p>
                              <div style={{ background: C.border, borderRadius: '20px', height: '6px', width: '120px', overflow: 'hidden' }}>
                                <div style={{ background: allDone ? C.black : C.laterite, height: '100%', borderRadius: '20px', width: `${percentage}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
            </div>
          )}

          {(activeSection === 'users' || activeSection === 'pending') && (
            <div>
              {/* Search + filters */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: '2 1 220px', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: C.white }}
                />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ flex: '1 1 150px', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', background: C.white, appearance: 'none' }}>
                  <option value="all">All Roles</option>
                  {Object.entries(roleLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)}
                  style={{ flex: '1 1 150px', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', background: C.white, appearance: 'none' }}>
                  <option value="all">All Verification</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ flex: '1 1 150px', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', background: C.white, appearance: 'none' }}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {visibleUsers.map((user) => {
                  const isDeactivated = user.is_active === false
                  return (
                  <div key={user.id} style={{
                    background: C.white,
                    border: `1px solid ${selected?.id === user.id ? C.laterite : isDeactivated ? C.danger + '55' : C.border}`,
                    borderRadius: '12px', padding: '20px',
                    boxShadow: selected?.id === user.id ? '0 4px 15px rgba(139,94,60,0.08)' : 'none',
                    opacity: isDeactivated ? 0.7 : 1,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: C.lateriteSoft, border: `2px solid ${user.is_verified ? C.black : C.laterite}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: C.laterite, fontSize: '18px', overflow: 'hidden' }}>
                            {user.avatar_url ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user.full_name?.charAt(0)?.toUpperCase() || '?')}
                          </div>
                          {user.is_verified && (
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderRadius: '50%', background: C.black, border: `2px solid ${C.white}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ color: C.white, fontSize: '9px', fontWeight: '800' }}>✓</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: C.black }}>{user.full_name || 'No name'}</p>
                            {user.is_admin && <span style={{ background: C.black, color: C.white, fontSize: '9px', fontWeight: '800', padding: '3px 7px', borderRadius: '20px', letterSpacing: '0.5px' }}>ADMIN</span>}
                            {user.is_verified && <span style={{ background: C.lateriteSoft, border: `1px solid ${C.laterite}`, color: C.lateriteDark, fontSize: '9px', fontWeight: '800', padding: '3px 7px', borderRadius: '20px' }}>VERIFIED</span>}
                            {isDeactivated && <span style={{ background: C.dangerBg, border: `1px solid ${C.danger}`, color: C.danger, fontSize: '9px', fontWeight: '800', padding: '3px 7px', borderRadius: '20px' }}>DEACTIVATED</span>}
                          </div>
                          <p style={{ margin: '0 0 8px', fontSize: '13px', color: C.muted }}>{user.email}</p>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ background: C.lateriteSoft, border: `1px solid ${C.laterite}`, color: C.lateriteDark, fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px' }}>
                              {roleLabel[user.role] || user.role || 'No role'}
                            </span>
                            <span style={{
                              background: user.verification_status === 'approved' ? C.successBg : user.verification_status === 'rejected' ? C.dangerBg : C.warningBg,
                              border: `1px solid ${user.verification_status === 'approved' ? C.success : user.verification_status === 'rejected' ? C.danger : C.warning}`,
                              color: user.verification_status === 'approved' ? C.success : user.verification_status === 'rejected' ? C.danger : C.warning,
                              fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px',
                            }}>
                              {user.verification_status || 'pending'}
                            </span>
                            {user.documents_submitted && (
                              <span style={{ background: C.background, border: `1px solid ${C.border}`, color: C.muted, fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px' }}>
                                Docs Submitted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleSelect(user)} style={{
                          background: selected?.id === user.id ? C.black : C.lateriteSoft,
                          border: `1px solid ${selected?.id === user.id ? C.black : C.laterite}`,
                          color: selected?.id === user.id ? C.white : C.lateriteDark,
                          padding: '8px 14px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                        }}>
                          {selected?.id === user.id ? 'Close' : 'Review'}
                        </button>
                        <button onClick={() => handleToggleActive(user.id, user.is_active !== false)} disabled={togglingActive === user.id}
                          style={{
                            background: isDeactivated ? C.successBg : C.warningBg,
                            border: `1px solid ${isDeactivated ? C.success : C.warning}`,
                            color: isDeactivated ? C.success : C.warning,
                            padding: '8px 14px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                          }}>
                          {togglingActive === user.id ? '...' : isDeactivated ? 'Reactivate' : 'Deactivate'}
                        </button>
                        <button onClick={() => handleDeleteUser(user.id, user.full_name)} disabled={deletingUser === user.id}
                          style={{
                            background: C.dangerBg, border: `1px solid ${C.danger}`, color: C.danger,
                            padding: '8px 14px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                          }}>
                          {deletingUser === user.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>

                    {selected?.id === user.id && (
                      <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${C.border}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '9px', marginBottom: '20px' }}>
                          {[
                            { label: 'Phone', value: user.phone },
                            { label: 'City', value: user.city },
                            { label: 'State', value: user.state },
                            { label: 'Company', value: user.company_name },
                            { label: 'Experience', value: user.experience_years ? `${user.experience_years} years` : null },
                            { label: 'Professional Body', value: user.professional_body },
                            { label: 'License Number', value: user.professional_license_number },
                            { label: 'CAC Number', value: user.cac_number },
                          ].filter((field) => field.value).map((field) => (
                            <div key={field.label} style={{ background: C.background, padding: '11px 12px', borderRadius: '7px' }}>
                              <p style={{ margin: '0 0 3px', fontSize: '9px', color: C.lightMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{field.label}</p>
                              <p style={{ margin: 0, fontSize: '13px', color: C.black, fontWeight: '600' }}>{field.value}</p>
                            </div>
                          ))}
                        </div>

                        {user.bio && (
                          <div style={{ background: C.background, padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                            <p style={{ margin: '0 0 6px', fontSize: '10px', color: C.lightMuted, fontWeight: '800', textTransform: 'uppercase' }}>Bio</p>
                            <p style={{ margin: 0, fontSize: '14px', color: C.black, lineHeight: '1.6' }}>{user.bio}</p>
                          </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                          <p style={{ fontSize: '13px', fontWeight: '800', color: C.black, marginBottom: '12px' }}>Uploaded Documents</p>
                          {loadingDocs ? <p style={{ color: C.lightMuted, fontSize: '13px' }}>Loading...</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {docUrls.id ? (
                                <a href={docUrls.id} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.background, padding: '14px', borderRadius: '9px', textDecoration: 'none', border: `1px solid ${C.border}` }}>
                                  <span style={{ fontSize: '20px' }}>🪪</span>
                                  <div>
                                    <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '800', color: C.black }}>Government ID</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: C.laterite, fontWeight: '700' }}>Click to view →</p>
                                  </div>
                                </a>
                              ) : (
                                <div style={{ background: C.background, padding: '14px', borderRadius: '9px', border: `1px solid ${C.border}` }}>
                                  <p style={{ margin: 0, fontSize: '12px', color: C.lightMuted }}>🪪 No government ID uploaded</p>
                                </div>
                              )}
                              {user.cac_document_url && docUrls.cac && (
                                <a href={docUrls.cac} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.background, padding: '14px', borderRadius: '9px', textDecoration: 'none', border: `1px solid ${C.border}` }}>
                                  <span style={{ fontSize: '20px' }}>🏢</span>
                                  <div>
                                    <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '800', color: C.black }}>CAC Certificate</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: C.laterite, fontWeight: '700' }}>Click to view →</p>
                                  </div>
                                </a>
                              )}
                              {user.professional_license_url && docUrls.license && (
                                <a href={docUrls.license} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.background, padding: '14px', borderRadius: '9px', textDecoration: 'none', border: `1px solid ${C.border}` }}>
                                  <span style={{ fontSize: '20px' }}>📋</span>
                                  <div>
                                    <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '800', color: C.black }}>Professional License</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: C.laterite, fontWeight: '700' }}>Click to view →</p>
                                  </div>
                                </a>
                              )}
                              {!user.id_document_url && !user.cac_document_url && !user.professional_license_url && (
                                <p style={{ color: C.lightMuted, fontSize: '12px', margin: 0 }}>No documents uploaded yet</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: C.black, marginBottom: '6px' }}>Admin Note</label>
                          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for approval or rejection..."
                            style={{ width: '100%', padding: '11px', border: `1px solid ${C.border}`, borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => handleVerify(user.id, 'approved')} style={{ background: C.black, color: C.white, border: 'none', padding: '11px 20px', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>✓ Approve</button>
                          <button onClick={() => handleVerify(user.id, 'rejected')} style={{ background: C.dangerBg, color: C.danger, border: `1px solid ${C.danger}`, padding: '11px 20px', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>Reject</button>
                          <button onClick={() => handleVerify(user.id, 'pending')} style={{ background: C.white, color: C.lateriteDark, border: `1px solid ${C.laterite}`, padding: '11px 20px', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>Reset to Pending</button>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>

              {visibleUsers.length === 0 && (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '50px 30px', textAlign: 'center' }}>
                  <p style={{ color: C.lightMuted, fontSize: '14px', margin: 0, fontWeight: '700' }}>No users match your search/filters</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}