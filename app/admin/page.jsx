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

const TOTAL_MODULES = 5

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
  const [activeTab, setActiveTab] = useState('users')
  const [training, setTraining] = useState([])
  const [trainingLoading, setTrainingLoading] = useState(false)
  const [marketers, setMarketers] = useState([])
  const [marketersLoading, setMarketersLoading] = useState(false)
  const [showMarketerForm, setShowMarketerForm] = useState(false)
  const [marketerForm, setMarketerForm] = useState({ full_name: '', email: '', password: '' })
  const [creatingMarketer, setCreatingMarketer] = useState(false)
  const [deletingMarketer, setDeletingMarketer] = useState(null)
  const [revenue, setRevenue] = useState({ orders: 0, bookings: 0, total: 0 })
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [disputes, setDisputes] = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      if (!me?.is_admin) { router.push('/dashboard'); return }
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const loadTraining = async () => {
    setTrainingLoading(true)
    const { data } = await supabase.from('training_completions').select('*, user:profiles!training_completions_user_id_fkey(full_name, email, avatar_url)').eq('passed', true).order('created_at', { ascending: false })
    setTraining(data || [])
    setTrainingLoading(false)
  }

  const loadMarketers = async () => {
    setMarketersLoading(true)
    const { data } = await supabase.from('profiles').select('*, signups:field_marketer_signups(id, referred_user_name, referred_user_role, created_at)').eq('role', 'field_marketer').order('created_at', { ascending: false })
    setMarketers(data || [])
    setMarketersLoading(false)
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
    const { data } = await supabase.from('disputes').select('*, raiser:profiles!disputes_raised_by_fkey(full_name, email)').order('created_at', { ascending: false })
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
    const { error } = await supabase.from('profiles').update({ verification_status: status, is_verified: status === 'approved', admin_notes: note }).eq('id', userId)
    if (error) { setMessage('Error updating'); return }
    setUsers(users.map(u => u.id === userId ? { ...u, verification_status: status, is_verified: status === 'approved', admin_notes: note } : u))
    setSelected(null); setDocUrls({}); setNote('')
    setMessage(`User ${status} successfully`)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleCreateMarketer = async () => {
    if (!marketerForm.full_name || !marketerForm.email || !marketerForm.password) { setMessage('Please fill all fields'); return }
    if (marketerForm.password.length < 6) { setMessage('Password must be at least 6 characters'); return }
    setCreatingMarketer(true)
    setMessage('')
    const res = await fetch('/api/field-marketers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(marketerForm) })
    const data = await res.json()
    if (data.success) {
      setMessage(`✓ Field marketer created! Code: ${data.referral_code}. Welcome email sent.`)
      setMarketerForm({ full_name: '', email: '', password: '' })
      setShowMarketerForm(false)
      await loadMarketers()
    } else {
      setMessage('Error: ' + data.error)
    }
    setCreatingMarketer(false)
  }

  const handleDeleteMarketer = async (marketerId) => {
    if (!confirm('Delete this field marketer? This cannot be undone.')) return
    setDeletingMarketer(marketerId)
    const res = await fetch('/api/field-marketers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marketer_id: marketerId }) })
    const data = await res.json()
    if (data.success) { setMarketers(marketers.filter(m => m.id !== marketerId)); setMessage('Deleted') }
    else { setMessage('Error: ' + data.error) }
    setDeletingMarketer(null)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleResolveDispute = async (disputeId, resolution) => {
    const { error } = await supabase.from('disputes').update({ status: 'resolved', resolution, resolved_at: new Date().toISOString() }).eq('id', disputeId)
    if (!error) { setDisputes(disputes.map(d => d.id === disputeId ? { ...d, status: 'resolved', resolution } : d)); setMessage('Dispute resolved'); setTimeout(() => setMessage(''), 3000) }
  }

  const roleLabel = { project_owner: 'Project Owner', artisan: 'Artisan', supplier: 'Supplier', professional: 'Professional', service_provider: 'Service Provider', equipment_provider: 'Equipment Provider', field_marketer: 'Field Marketer' }
  const trainingByUser = training.reduce((acc, t) => { const uid = t.user_id; if (!acc[uid]) acc[uid] = { user: t.user, modules: [] }; acc[uid].modules.push(t); return acc }, {})
  const pendingVerification = users.filter(u => u.documents_submitted && u.verification_status === 'pending')

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }
  const tabBtn = (key, label) => (
    <button key={key} onClick={() => {
      setActiveTab(key)
      if (key === 'training' && training.length === 0) loadTraining()
      if (key === 'marketers' && marketers.length === 0) loadMarketers()
      if (key === 'revenue') loadRevenue()
      if (key === 'disputes' && disputes.length === 0) loadDisputes()
    }} style={{ padding: '10px 16px', borderRadius: '6px', border: `1px solid ${activeTab === key ? C.clay : C.line}`, background: activeTab === key ? C.clay : 'transparent', color: activeTab === key ? C.sunk : C.muted, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
      {label}
    </button>
  )

  if (loading) return <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: C.muted }}>Loading...</p></div>

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: C.muted, textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.text, marginBottom: '4px' }}>Admin Panel</h1>
        <p style={{ color: C.muted, fontSize: '14px', marginBottom: '32px' }}>{users.length} total users · {pendingVerification.length} pending verification</p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tabBtn('users', `All Users (${users.length})`)}
          {tabBtn('pending', `Pending Review (${pendingVerification.length})`)}
          {tabBtn('training', 'Training')}
          {tabBtn('marketers', `Field Marketers`)}
          {tabBtn('disputes', 'Disputes')}
          {tabBtn('revenue', 'Revenue')}
        </div>

        {message && <p style={{ color: message.includes('✓') || message.includes('successfully') || message.includes('resolved') ? C.oasis : C.danger, fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {/* Revenue */}
        {activeTab === 'revenue' && (
          revenueLoading ? <p style={{ color: C.muted }}>Loading...</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Orders Commission', value: revenue.orders },
                { label: 'Bookings Commission', value: revenue.bookings },
                { label: 'Total Revenue', value: revenue.total },
              ].map(item => (
                <div key={item.label} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '24px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: C.muted, fontWeight: '600' }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: C.clay }}>₦{Number(item.value).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )
        )}

        {/* Disputes */}
        {activeTab === 'disputes' && (
          disputesLoading ? <p style={{ color: C.muted }}>Loading...</p> :
            disputes.length === 0 ? (
              <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>No disputes yet</p>
              </div>
            ) : disputes.map(dispute => (
              <div key={dispute.id} style={{ background: C.raised, border: `1px solid ${dispute.status === 'resolved' ? C.oasis : C.danger}`, borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: '700', color: C.text }}>Dispute #{dispute.id.substring(0, 8)}</p>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: C.muted }}>{dispute.raiser?.full_name} · {dispute.raiser?.email}</p>
                  </div>
                  <span style={{ background: dispute.status === 'resolved' ? '#1a2e1d' : C.dangerSoft, color: dispute.status === 'resolved' ? C.oasis : C.danger, fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', height: 'fit-content' }}>
                    {dispute.status}
                  </span>
                </div>
                <div style={{ background: C.sunk, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: C.text }}>{dispute.reason}</p>
                </div>
                {dispute.status === 'open' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Enter resolution..." id={`res-${dispute.id}`} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => { const el = document.getElementById(`res-${dispute.id}`); if (el?.value) handleResolveDispute(dispute.id, el.value) }}
                      style={{ background: C.oasis, color: C.sunk, border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            ))
        )}

        {/* Field Marketers */}
        {activeTab === 'marketers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <p style={{ margin: 0, color: C.muted, fontSize: '14px' }}>{marketers.length} field marketers</p>
              <button onClick={() => setShowMarketerForm(!showMarketerForm)}
                style={{ background: C.clay, color: C.sunk, border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                + Create Field Marketer
              </button>
            </div>

            {showMarketerForm && (
              <div style={{ background: C.raised, border: `1px solid ${C.clay}`, borderRadius: '12px', padding: '28px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: C.text, margin: '0 0 20px' }}>Create Field Marketer</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  {[
                    { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Their full name' },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'their@email.com' },
                    { label: 'Password', key: 'password', type: 'text', placeholder: 'Set their password' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={marketerForm[f.key]} onChange={e => setMarketerForm({ ...marketerForm, [f.key]: e.target.value })} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div style={{ background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>A welcome email with login details and referral code will be sent automatically.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowMarketerForm(false)} style={{ flex: 1, background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleCreateMarketer} disabled={creatingMarketer} style={{ flex: 2, background: C.clay, color: C.sunk, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                    {creatingMarketer ? 'Creating...' : 'Create & Send Email'}
                  </button>
                </div>
              </div>
            )}

            {marketersLoading ? <p style={{ color: C.muted }}>Loading...</p> :
              marketers.length === 0 ? (
                <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>No field marketers yet</p>
                </div>
              ) : marketers.map(m => (
                <div key={m.id} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.sunk, border: `1px solid ${C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: C.clay, fontSize: '16px', overflow: 'hidden', flexShrink: 0 }}>
                        {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: '0 0 2px', fontWeight: '700', color: C.text }}>{m.full_name}</p>
                        <p style={{ margin: '0 0 6px', fontSize: '13px', color: C.muted }}>{m.email}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ background: C.sunk, border: `1px solid ${C.clay}`, color: C.clay, fontSize: '12px', fontWeight: '700', padding: '2px 10px', borderRadius: '4px', letterSpacing: '1px' }}>{m.referral_code}</span>
                          <span style={{ background: C.sunk, color: C.muted, fontSize: '12px', padding: '2px 10px', borderRadius: '4px' }}>{m.signups?.length || 0} referrals</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteMarketer(m.id)} disabled={deletingMarketer === m.id}
                      style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}`, padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                      {deletingMarketer === m.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.line}` }}>
                    <p style={{ fontSize: '12px', color: C.muted, margin: 0 }}>
                      Link: <span style={{ color: C.clay }}>engediafrica.com/signup?ref={m.referral_code}</span>
                    </p>
                  </div>
                  {m.signups?.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      {m.signups.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.muted, background: C.sunk, padding: '8px 12px', borderRadius: '6px', marginBottom: '4px' }}>
                          <span>{s.referred_user_name}</span>
                          <span style={{ textTransform: 'capitalize' }}>{s.referred_user_role?.replace('_', ' ')}</span>
                          <span>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* Training */}
        {activeTab === 'training' && (
          trainingLoading ? <p style={{ color: C.muted }}>Loading...</p> :
            Object.keys(trainingByUser).length === 0 ? (
              <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>No training completions yet</p>
              </div>
            ) : Object.values(trainingByUser).map(({ user, modules }) => {
              const completed = modules.length
              const allDone = completed >= TOTAL_MODULES
              return (
                <div key={modules[0].user_id} style={{ background: C.raised, border: `1px solid ${allDone ? C.oasis : C.line}`, borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: C.sunk, border: `1px solid ${C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: C.clay, overflow: 'hidden', flexShrink: 0 }}>
                        {user?.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <p style={{ margin: 0, fontWeight: '700', color: C.text }}>{user?.full_name}</p>
                          {allDone && <span style={{ background: '#1a2e1d', color: C.oasis, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>CERTIFIED</span>}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: C.muted }}>{user?.email}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 6px', fontWeight: '800', color: C.clay }}>{completed}/{TOTAL_MODULES}</p>
                      <div style={{ background: C.line, borderRadius: '20px', height: '4px', width: '100px', overflow: 'hidden' }}>
                        <div style={{ background: allDone ? C.oasis : C.clay, height: '100%', width: `${(completed / TOTAL_MODULES) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
        )}

        {/* Users list */}
        {(activeTab === 'users' || activeTab === 'pending') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(activeTab === 'pending' ? pendingVerification : users).map(user => (
              <div key={user.id} style={{ background: C.raised, border: `1px solid ${selected?.id === user.id ? C.clay : C.line}`, borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.sunk, border: `1px solid ${user.is_verified ? C.oasis : C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: C.clay, fontSize: '16px', overflow: 'hidden' }}>
                        {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      {user.is_verified && (
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', borderRadius: '50%', background: C.oasis, border: `2px solid ${C.raised}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: C.sunk, fontSize: '8px', fontWeight: '800' }}>✓</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <p style={{ margin: 0, fontWeight: '700', color: C.text }}>{user.full_name || 'No name'}</p>
                        {user.is_admin && <span style={{ background: C.clay, color: C.sunk, fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>ADMIN</span>}
                        {user.is_verified && <span style={{ background: '#1a2e1d', color: C.oasis, fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>VERIFIED</span>}
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '13px', color: C.muted }}>{user.email}</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ background: C.sunk, border: `1px solid ${C.line}`, color: C.muted, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>
                          {roleLabel[user.role] || user.role || 'No role'}
                        </span>
                        <span style={{
                          background: user.verification_status === 'approved' ? '#1a2e1d' : user.verification_status === 'rejected' ? C.dangerSoft : C.sunk,
                          color: user.verification_status === 'approved' ? C.oasis : user.verification_status === 'rejected' ? C.danger : C.muted,
                          fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px'
                        }}>
                          {user.verification_status || 'pending'}
                        </span>
                        {user.documents_submitted && <span style={{ background: '#1a2e1d', color: C.oasis, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>Docs Submitted</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleSelect(user)}
                    style={{ background: selected?.id === user.id ? C.clay : 'transparent', border: `1px solid ${selected?.id === user.id ? C.clay : C.line}`, color: selected?.id === user.id ? C.sunk : C.muted, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    {selected?.id === user.id ? 'Close' : 'Review'}
                  </button>
                </div>

                {selected?.id === user.id && (
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${C.line}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                      {[
                        { label: 'Phone', value: user.phone },
                        { label: 'City', value: user.city },
                        { label: 'State', value: user.state },
                        { label: 'Company', value: user.company_name },
                        { label: 'Experience', value: user.experience_years ? `${user.experience_years} yrs` : null },
                        { label: 'Professional Body', value: user.professional_body },
                        { label: 'License No.', value: user.professional_license_number },
                        { label: 'CAC No.', value: user.cac_number },
                      ].filter(f => f.value).map(field => (
                        <div key={field.label} style={{ background: C.sunk, padding: '10px 12px', borderRadius: '8px' }}>
                          <p style={{ margin: '0 0 2px', fontSize: '11px', color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</p>
                          <p style={{ margin: 0, fontSize: '13px', color: C.text, fontWeight: '600' }}>{field.value}</p>
                        </div>
                      ))}
                    </div>

                    {user.bio && (
                      <div style={{ background: C.sunk, padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: C.muted, fontWeight: '600', textTransform: 'uppercase' }}>Bio</p>
                        <p style={{ margin: 0, fontSize: '14px', color: C.text, lineHeight: '1.6' }}>{user.bio}</p>
                      </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '10px' }}>Documents</p>
                      {loadingDocs ? <p style={{ color: C.muted, fontSize: '13px' }}>Loading...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {docUrls.id ? (
                            <a href={docUrls.id} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.sunk, padding: '14px', borderRadius: '8px', textDecoration: 'none', border: `1px solid ${C.line}` }}>
                              <span>🪪</span>
                              <div><p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: C.text }}>Government ID</p><p style={{ margin: 0, fontSize: '12px', color: C.clay }}>Click to view →</p></div>
                            </a>
                          ) : <div style={{ background: C.sunk, padding: '14px', borderRadius: '8px' }}><p style={{ margin: 0, fontSize: '13px', color: C.muted }}>No government ID uploaded</p></div>}

                          {user.cac_document_url && docUrls.cac && (
                            <a href={docUrls.cac} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.sunk, padding: '14px', borderRadius: '8px', textDecoration: 'none', border: `1px solid ${C.line}` }}>
                              <span>🏢</span>
                              <div><p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: C.text }}>CAC Certificate</p><p style={{ margin: 0, fontSize: '12px', color: C.clay }}>Click to view →</p></div>
                            </a>
                          )}

                          {user.professional_license_url && docUrls.license && (
                            <a href={docUrls.license} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.sunk, padding: '14px', borderRadius: '8px', textDecoration: 'none', border: `1px solid ${C.line}` }}>
                              <span>📋</span>
                              <div><p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: C.text }}>Professional License</p><p style={{ margin: 0, fontSize: '12px', color: C.clay }}>Click to view →</p></div>
                            </a>
                          )}

                          {!user.id_document_url && !user.cac_document_url && !user.professional_license_url && (
                            <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>No documents uploaded yet</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase' }}>Admin Note (shown to user)</label>
                      <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for approval or rejection..." style={inputStyle} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleVerify(user.id, 'approved')} style={{ background: C.oasis, color: C.sunk, border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>✓ Approve</button>
                      <button onClick={() => handleVerify(user.id, 'rejected')} style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}`, padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>✕ Reject</button>
                      <button onClick={() => handleVerify(user.id, 'pending')} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>Reset</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {activeTab === 'pending' && pendingVerification.length === 0 && (
              <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>No pending verifications</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}