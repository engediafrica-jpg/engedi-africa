'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    const { data } = await supabase
      .from('training_completions')
      .select('*, user:profiles!training_completions_user_id_fkey(full_name, email, avatar_url)')
      .eq('passed', true)
      .order('created_at', { ascending: false })
    setTraining(data || [])
    setTrainingLoading(false)
  }

  const loadMarketers = async () => {
    setMarketersLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*, signups:field_marketer_signups(id, referred_user_name, referred_user_role, created_at)')
      .eq('role', 'field_marketer')
      .order('created_at', { ascending: false })
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
    if (error) { setMessage('Error updating'); return }
    setUsers(users.map(u => u.id === userId ? { ...u, verification_status: status, is_verified: status === 'approved', admin_notes: note } : u))
    setSelected(null)
    setDocUrls({})
    setNote('')
    setMessage(`User ${status} successfully`)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleCreateMarketer = async () => {
    if (!marketerForm.full_name || !marketerForm.email || !marketerForm.password) {
      setMessage('Please fill all fields')
      return
    }
    if (marketerForm.password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }
    setCreatingMarketer(true)
    setMessage('')
    const res = await fetch('/api/field-marketers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(marketerForm),
    })
    const data = await res.json()
    if (data.success) {
      setMessage(`✓ Field marketer created! Referral code: ${data.referral_code}. Welcome email sent.`)
      setMarketerForm({ full_name: '', email: '', password: '' })
      setShowMarketerForm(false)
      await loadMarketers()
    } else {
      setMessage('Error: ' + data.error)
    }
    setCreatingMarketer(false)
  }

  const handleDeleteMarketer = async (marketerId) => {
    if (!confirm('Are you sure you want to delete this field marketer? This cannot be undone.')) return
    setDeletingMarketer(marketerId)
    const res = await fetch('/api/field-marketers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketer_id: marketerId }),
    })
    const data = await res.json()
    if (data.success) {
      setMarketers(marketers.filter(m => m.id !== marketerId))
      setMessage('Field marketer deleted successfully')
      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('Error: ' + data.error)
    }
    setDeletingMarketer(null)
  }

  const handleResolveDispute = async (disputeId, resolution) => {
    const { error } = await supabase.from('disputes').update({
      status: 'resolved',
      resolution,
      resolved_at: new Date().toISOString(),
    }).eq('id', disputeId)
    if (!error) {
      setDisputes(disputes.map(d => d.id === disputeId ? { ...d, status: 'resolved', resolution } : d))
      setMessage('Dispute resolved')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const roleLabel = {
    project_owner: 'Project Owner',
    artisan: 'Artisan',
    supplier: 'Supplier',
    professional: 'Professional',
    service_provider: 'Service Provider',
    equipment_provider: 'Equipment Provider',
    field_marketer: 'Field Marketer',
  }

  const trainingByUser = training.reduce((acc, t) => {
    const uid = t.user_id
    if (!acc[uid]) acc[uid] = { user: t.user, modules: [] }
    acc[uid].modules.push(t)
    return acc
  }, {})

  const pendingVerification = users.filter(u => u.documents_submitted && u.verification_status === 'pending')

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading admin panel...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '4px' }}>Admin Panel</h1>
        <p style={{ color: '#666666', fontSize: '14px', marginBottom: '32px' }}>{users.length} total users · {pendingVerification.length} pending verification</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { key: 'users', label: `All Users (${users.length})` },
            { key: 'pending', label: `Pending Review (${pendingVerification.length})` },
            { key: 'training', label: 'Training Progress' },
            { key: 'marketers', label: `Field Marketers (${marketers.length})` },
            { key: 'disputes', label: 'Disputes' },
            { key: 'revenue', label: 'Revenue' },
          ].map(tab => (
            <button key={tab.key} onClick={() => {
              setActiveTab(tab.key)
              if (tab.key === 'training' && training.length === 0) loadTraining()
              if (tab.key === 'marketers' && marketers.length === 0) loadMarketers()
              if (tab.key === 'revenue') loadRevenue()
              if (tab.key === 'disputes' && disputes.length === 0) loadDisputes()
            }}
              style={{ padding: '10px 16px', borderRadius: '8px', border: `1.5px solid ${activeTab === tab.key ? '#1A1A1A' : '#EEE6DA'}`, background: activeTab === tab.key ? '#1A1A1A' : '#FFFFFF', color: activeTab === tab.key ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {message && <p style={{ color: message.includes('✓') ? '#2ecc71' : message.includes('Error') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {/* Revenue tab */}
        {activeTab === 'revenue' && (
          <div>
            {revenueLoading ? <p style={{ color: '#666666' }}>Loading revenue...</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'Orders Commission', value: revenue.orders, color: '#6366F1' },
                  { label: 'Bookings Commission', value: revenue.bookings, color: '#8B5E3C' },
                  { label: 'Total Revenue', value: revenue.total, color: '#2ecc71' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#FFFFFF', border: `1.5px solid ${item.color}`, borderRadius: '16px', padding: '24px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#666666', fontWeight: '600' }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: item.color }}>₦{Number(item.value).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Disputes tab */}
        {activeTab === 'disputes' && (
          <div>
            {disputesLoading ? <p style={{ color: '#666666' }}>Loading disputes...</p> :
              disputes.length === 0 ? (
                <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: '#999999', fontSize: '15px', margin: 0, fontWeight: '600' }}>No disputes yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {disputes.map(dispute => (
                    <div key={dispute.id} style={{ background: '#FFFFFF', border: `1.5px solid ${dispute.status === 'resolved' ? '#2ecc71' : '#c0392b'}`, borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>Dispute #{dispute.id.substring(0, 8)}</p>
                          <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#666666' }}>Raised by: {dispute.raiser?.full_name} · {dispute.raiser?.email}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#999999' }}>{new Date(dispute.created_at).toLocaleDateString()}</p>
                        </div>
                        <span style={{ background: dispute.status === 'resolved' ? '#e8f8f0' : '#fde8e8', border: `1px solid ${dispute.status === 'resolved' ? '#2ecc71' : '#c0392b'}`, color: dispute.status === 'resolved' ? '#27ae60' : '#c0392b', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', textTransform: 'capitalize' }}>
                          {dispute.status}
                        </span>
                      </div>
                      <div style={{ background: '#F9F6F1', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' }}>Reason</p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#1A1A1A' }}>{dispute.reason}</p>
                      </div>
                      {dispute.status === 'resolved' && dispute.resolution && (
                        <div style={{ background: '#e8f8f0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#27ae60', fontWeight: '600', textTransform: 'uppercase' }}>Resolution</p>
                          <p style={{ margin: 0, fontSize: '14px', color: '#1A1A1A' }}>{dispute.resolution}</p>
                        </div>
                      )}
                      {dispute.status === 'open' && (
                        <div>
                          <input type="text" placeholder="Enter resolution..." id={`resolution-${dispute.id}`}
                            style={{ width: '100%', padding: '10px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }} />
                          <button onClick={() => {
                            const input = document.getElementById(`resolution-${dispute.id}`)
                            if (input?.value) handleResolveDispute(dispute.id, input.value)
                          }} style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* Field Marketers tab */}
        {activeTab === 'marketers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <p style={{ margin: 0, color: '#666666', fontSize: '14px' }}>{marketers.length} field marketers</p>
              <button onClick={() => setShowMarketerForm(!showMarketerForm)}
                style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                + Create Field Marketer
              </button>
            </div>

            {showMarketerForm && (
              <div style={{ background: '#FFFFFF', border: '1.5px solid #8B5E3C', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 20px' }}>Create Field Marketer</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Full Name</label>
                    <input type="text" placeholder="Field marketer name" value={marketerForm.full_name} onChange={e => setMarketerForm({ ...marketerForm, full_name: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Email</label>
                    <input type="email" placeholder="their@email.com" value={marketerForm.email} onChange={e => setMarketerForm({ ...marketerForm, email: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Password</label>
                    <input type="text" placeholder="Set their password" value={marketerForm.password} onChange={e => setMarketerForm({ ...marketerForm, password: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#8B5E3C', lineHeight: '1.6' }}>
                    A welcome email with their login details and referral code will be sent automatically.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowMarketerForm(false)} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleCreateMarketer} disabled={creatingMarketer}
                    style={{ flex: 2, background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                    {creatingMarketer ? 'Creating & Sending Email...' : 'Create Field Marketer'}
                  </button>
                </div>
              </div>
            )}

            {marketersLoading ? <p style={{ color: '#666666' }}>Loading...</p> :
              marketers.length === 0 ? (
                <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: '#999999', fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No field marketers yet</p>
                  <p style={{ color: '#999999', fontSize: '13px', margin: 0 }}>Create your first field marketer above</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {marketers.map(marketer => (
                    <div key={marketer.id} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F5EFE6', border: '2px solid #8B5E3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#8B5E3C', fontSize: '18px', overflow: 'hidden', flexShrink: 0 }}>
                            {marketer.avatar_url
                              ? <img src={marketer.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : marketer.full_name?.charAt(0)?.toUpperCase() || '?'
                            }
                          </div>
                          <div>
                            <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{marketer.full_name}</p>
                            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#666666' }}>{marketer.email}</p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '12px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px', letterSpacing: '1px' }}>
                                {marketer.referral_code}
                              </span>
                              <span style={{ background: '#F9F6F1', color: '#666666', fontSize: '12px', padding: '2px 10px', borderRadius: '20px' }}>
                                {marketer.signups?.length || 0} referrals
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleDeleteMarketer(marketer.id)}
                            disabled={deletingMarketer === marketer.id}
                            style={{ background: '#fde8e8', color: '#c0392b', border: '1px solid #c0392b', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                          >
                            {deletingMarketer === marketer.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      {marketer.signups && marketer.signups.length > 0 && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #EEE6DA' }}>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '10px' }}>Referred Users</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {marketer.signups.map(signup => (
                              <div key={signup.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#666666', background: '#F9F6F1', padding: '8px 12px', borderRadius: '8px' }}>
                                <span>{signup.referred_user_name}</span>
                                <span style={{ textTransform: 'capitalize' }}>{signup.referred_user_role?.replace('_', ' ')}</span>
                                <span>{new Date(signup.created_at).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #EEE6DA' }}>
                        <p style={{ fontSize: '12px', color: '#999999', margin: 0 }}>
                          Referral link: <span style={{ color: '#8B5E3C', fontWeight: '600' }}>engediafrica.com/signup?ref={marketer.referral_code}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* Training tab */}
        {activeTab === 'training' && (
          <div>
            {trainingLoading ? <p style={{ color: '#666666' }}>Loading...</p> :
              Object.keys(trainingByUser).length === 0 ? (
                <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: '#999999', fontSize: '15px', margin: 0 }}>No artisans have completed any training modules yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.values(trainingByUser).map(({ user, modules }) => {
                    const completed = modules.length
                    const allDone = completed >= TOTAL_MODULES
                    return (
                      <div key={modules[0].user_id} style={{ background: '#FFFFFF', border: `1.5px solid ${allDone ? '#2ecc71' : '#EEE6DA'}`, borderRadius: '12px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F5EFE6', border: '2px solid #8B5E3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#8B5E3C', fontSize: '16px', overflow: 'hidden', flexShrink: 0 }}>
                              {user?.avatar_url
                                ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : user?.full_name?.charAt(0)?.toUpperCase() || '?'
                              }
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{user?.full_name}</p>
                                {allDone && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>🏆 Certified</span>}
                              </div>
                              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#666666' }}>{user?.email}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#1A1A1A' }}>{completed}/{TOTAL_MODULES} modules</p>
                            <div style={{ background: '#EEE6DA', borderRadius: '20px', height: '6px', width: '120px', overflow: 'hidden' }}>
                              <div style={{ background: allDone ? '#2ecc71' : '#8B5E3C', height: '100%', borderRadius: '20px', width: `${(completed / TOTAL_MODULES) * 100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        )}

        {/* Users list */}
        {(activeTab === 'users' || activeTab === 'pending') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(activeTab === 'pending' ? pendingVerification : users).map(user => (
              <div key={user.id} style={{ background: '#FFFFFF', border: `1.5px solid ${selected?.id === user.id ? '#8B5E3C' : '#EEE6DA'}`, borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F5EFE6', border: `2px solid ${user.is_verified ? '#2ecc71' : '#8B5E3C'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#8B5E3C', fontSize: '18px', overflow: 'hidden' }}>
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : user.full_name?.charAt(0)?.toUpperCase() || '?'
                        }
                      </div>
                      {user.is_verified && (
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderRadius: '50%', background: '#2ecc71', border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#FFFFFF', fontSize: '9px', fontWeight: '800' }}>✓</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{user.full_name || 'No name'}</p>
                        {user.is_admin && <span style={{ background: '#1A1A1A', color: '#FFFFFF', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>ADMIN</span>}
                        {user.is_verified && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>✓ VERIFIED</span>}
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#666666' }}>{user.email}</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>
                          {roleLabel[user.role] || user.role || 'No role'}
                        </span>
                        <span style={{
                          background: user.verification_status === 'approved' ? '#e8f8f0' : user.verification_status === 'rejected' ? '#fde8e8' : '#FFF8F0',
                          border: `1px solid ${user.verification_status === 'approved' ? '#2ecc71' : user.verification_status === 'rejected' ? '#c0392b' : '#8B5E3C'}`,
                          color: user.verification_status === 'approved' ? '#27ae60' : user.verification_status === 'rejected' ? '#c0392b' : '#8B5E3C',
                          fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px'
                        }}>
                          {user.verification_status || 'pending'}
                        </span>
                        {user.documents_submitted && (
                          <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>
                            Docs Submitted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleSelect(user)}
                    style={{ background: selected?.id === user.id ? '#1A1A1A' : '#F5EFE6', border: `1px solid ${selected?.id === user.id ? '#1A1A1A' : '#8B5E3C'}`, color: selected?.id === user.id ? '#FFFFFF' : '#8B5E3C', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    {selected?.id === user.id ? 'Close' : 'Review'}
                  </button>
                </div>

                {selected?.id === user.id && (
                  <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #EEE6DA' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                      {[
                        { label: 'Phone', value: user.phone },
                        { label: 'City', value: user.city },
                        { label: 'State', value: user.state },
                        { label: 'Company', value: user.company_name },
                        { label: 'Experience', value: user.experience_years ? `${user.experience_years} years` : null },
                        { label: 'Professional Body', value: user.professional_body },
                        { label: 'License Number', value: user.professional_license_number },
                        { label: 'CAC Number', value: user.cac_number },
                      ].filter(f => f.value).map(field => (
                        <div key={field.label} style={{ background: '#F9F6F1', padding: '10px 12px', borderRadius: '8px' }}>
                          <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' }}>{field.label}</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#1A1A1A', fontWeight: '600' }}>{field.value}</p>
                        </div>
                      ))}
                    </div>

                    {user.bio && (
                      <div style={{ background: '#F9F6F1', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' }}>Bio</p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#1A1A1A', lineHeight: '1.6' }}>{user.bio}</p>
                      </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>Uploaded Documents</p>
                      {loadingDocs ? <p style={{ color: '#999999', fontSize: '13px' }}>Loading...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {docUrls.id ? (
                            <a href={docUrls.id} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F9F6F1', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid #EEE6DA' }}>
                              <span style={{ fontSize: '20px' }}>🪪</span>
                              <div><p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>Government ID</p><p style={{ margin: 0, fontSize: '12px', color: '#8B5E3C', fontWeight: '600' }}>Click to view →</p></div>
                            </a>
                          ) : <div style={{ background: '#F9F6F1', padding: '14px', borderRadius: '10px', border: '1px solid #EEE6DA' }}><p style={{ margin: 0, fontSize: '13px', color: '#999999' }}>🪪 No government ID uploaded</p></div>}

                          {user.cac_document_url && docUrls.cac && (
                            <a href={docUrls.cac} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F9F6F1', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid #EEE6DA' }}>
                              <span style={{ fontSize: '20px' }}>🏢</span>
                              <div><p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>CAC Certificate</p><p style={{ margin: 0, fontSize: '12px', color: '#8B5E3C', fontWeight: '600' }}>Click to view →</p></div>
                            </a>
                          )}

                          {user.professional_license_url && docUrls.license && (
                            <a href={docUrls.license} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F9F6F1', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid #EEE6DA' }}>
                              <span style={{ fontSize: '20px' }}>📋</span>
                              <div><p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>Professional License</p><p style={{ margin: 0, fontSize: '12px', color: '#8B5E3C', fontWeight: '600' }}>Click to view →</p></div>
                            </a>
                          )}

                          {!user.id_document_url && !user.cac_document_url && !user.professional_license_url && (
                            <p style={{ color: '#999999', fontSize: '13px', margin: 0 }}>No documents uploaded yet</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Admin Note (shown to user)</label>
                      <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for approval or rejection..."
                        style={{ width: '100%', padding: '10px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleVerify(user.id, 'approved')} style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>✅ Approve</button>
                      <button onClick={() => handleVerify(user.id, 'rejected')} style={{ background: '#c0392b', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>❌ Reject</button>
                      <button onClick={() => handleVerify(user.id, 'pending')} style={{ background: '#F5EFE6', color: '#8B5E3C', border: '1px solid #8B5E3C', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>Reset to Pending</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {activeTab === 'pending' && pendingVerification.length === 0 && (
              <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#999999', fontSize: '15px', margin: 0, fontWeight: '600' }}>No pending verifications</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}