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
  const [admin, setAdmin] = useState(null)
  const [disputes, setDisputes] = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)
  const [resolvingId, setResolvingId] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState({})
  const [disputeMessage, setDisputeMessage] = useState('')
  const [openDisputeCount, setOpenDisputeCount] = useState(0)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      if (!me?.is_admin) { router.push('/dashboard'); return }
      setAdmin(me)
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
      const { count } = await supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open')
      setOpenDisputeCount(count || 0)
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

  const loadDisputes = async () => {
    setDisputesLoading(true)
    const { data } = await supabase
      .from('disputes')
      .select(`*,
        raiser:profiles!disputes_raised_by_fkey(full_name, email),
        order:orders(id, total_price, payment_reference, payout_amount, buyer_id, supplier_id,
          product:products(name),
          buyer:profiles!orders_buyer_id_fkey(full_name),
          supplier:profiles!orders_supplier_id_fkey(full_name, paystack_recipient_code)),
        booking:bookings(id, job_title, quoted_price, payment_reference, payout_amount, project_owner_id, provider_id,
          project_owner:profiles!bookings_project_owner_id_fkey(full_name),
          provider:profiles!bookings_provider_id_fkey(full_name, paystack_recipient_code))`)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (data) { setDisputes(data); setOpenDisputeCount(data.length) }
    setDisputesLoading(false)
  }

  const handleResolveDispute = async (dispute, action) => {
    setResolvingId(dispute.id)
    setDisputeMessage('')
    const note = resolutionNotes[dispute.id] || ''
    const item = dispute.order || dispute.booking
    const isOrder = !!dispute.order
    const table = isOrder ? 'orders' : 'bookings'
    const recipient = isOrder ? item?.supplier : item?.provider
    const payoutAmount = item?.payout_amount

    try {
      if (action === 'release') {
        if (!recipient?.paystack_recipient_code || !payoutAmount) {
          setDisputeMessage('Missing recipient bank details or payout amount — cannot release.')
          setResolvingId(null)
          return
        }
        const transferRes = await fetch('/api/paystack/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: payoutAmount,
            recipient_code: recipient.paystack_recipient_code,
            reason: `EnGedi dispute resolution payout for ${table} ${item.id.substring(0, 8)}`,
            reference: Date.now().toString() + '-disputepayout-' + item.id.substring(0, 8),
          }),
        })
        const transferData = await transferRes.json()
        await supabase.from(table).update({
          status: isOrder ? 'delivered' : 'completed',
          payment_status: 'released',
          escrow_released: true,
          dispute_raised: false,
          confirmed_at: new Date().toISOString(),
          ...(transferData?.data?.transfer_code ? { payout_reference: transferData.data.transfer_code } : {}),
        }).eq('id', item.id)
      } else if (action === 'refund') {
        if (!item?.payment_reference) {
          setDisputeMessage('No payment reference on this record — cannot refund.')
          setResolvingId(null)
          return
        }
        await fetch('/api/paystack/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: item.payment_reference }),
        })
        await supabase.from(table).update({
          status: isOrder ? 'cancelled' : 'declined',
          payment_status: 'refunded',
          dispute_raised: false,
        }).eq('id', item.id)
      }

      await supabase.from('disputes').update({
        status: 'resolved',
        resolution: note || (action === 'release' ? 'Released to provider' : action === 'refund' ? 'Refunded to client' : 'Resolved without payment action'),
        resolved_by: admin.id,
        resolved_at: new Date().toISOString(),
      }).eq('id', dispute.id)

      const remaining = disputes.filter(d => d.id !== dispute.id)
      setDisputes(remaining)
      setOpenDisputeCount(remaining.length)
      setDisputeMessage('Dispute resolved.')
    } catch (error) {
      setDisputeMessage('Error: ' + error.message)
    }
    setResolvingId(null)
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

  const roleLabel = {
    project_owner: 'Project Owner',
    artisan: 'Artisan',
    supplier: 'Supplier',
    professional: 'Professional',
    service_provider: 'Service Provider',
    equipment_provider: 'Equipment Provider',
  }

  // Group training by user
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

        {openDisputeCount > 0 && (
          <button
            onClick={() => { setActiveTab('disputes'); if (disputes.length === 0) loadDisputes() }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', background: '#fde8e8', border: '1.5px solid #c0392b', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', cursor: 'pointer' }}
          >
            <p style={{ margin: 0, fontWeight: '700', color: '#c0392b', fontSize: '14px' }}>
              ⚠️ {openDisputeCount} open {openDisputeCount === 1 ? 'dispute needs' : 'disputes need'} review
            </p>
            <span style={{ color: '#c0392b', fontSize: '13px', fontWeight: '700' }}>Review →</span>
          </button>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { key: 'users', label: `All Users (${users.length})` },
            { key: 'pending', label: `Pending Review (${pendingVerification.length})` },
            { key: 'disputes', label: `Disputes${openDisputeCount ? ` (${openDisputeCount})` : ''}` },
            { key: 'training', label: 'Training Progress' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                if (tab.key === 'training' && training.length === 0) loadTraining()
                if (tab.key === 'disputes') loadDisputes()
              }}
              style={{ padding: '10px 20px', borderRadius: '8px', border: `1.5px solid ${activeTab === tab.key ? '#1A1A1A' : '#EEE6DA'}`, background: activeTab === tab.key ? '#1A1A1A' : '#FFFFFF', color: activeTab === tab.key ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message && <p style={{ color: '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {/* Disputes tab */}
        {activeTab === 'disputes' && (
          <div>
            {disputeMessage && <p style={{ color: disputeMessage.includes('Error') || disputeMessage.includes('Missing') || disputeMessage.includes('No payment') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{disputeMessage}</p>}
            {disputesLoading ? (
              <p style={{ color: '#666666' }}>Loading disputes...</p>
            ) : disputes.length === 0 ? (
              <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#999999', fontSize: '15px', margin: 0 }}>No open disputes.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {disputes.map(dispute => {
                  const item = dispute.order || dispute.booking
                  const isOrder = !!dispute.order
                  const title = isOrder ? (item?.product?.name || 'Order') : (item?.job_title || 'Booking')
                  const clientName = isOrder ? item?.buyer?.full_name : item?.project_owner?.full_name
                  const providerName = isOrder ? item?.supplier?.full_name : item?.provider?.full_name
                  const amount = isOrder ? item?.total_price : item?.quoted_price
                  return (
                    <div key={dispute.id} style={{ background: '#FFFFFF', border: '1.5px solid #c0392b', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ background: '#fde8e8', border: '1px solid #c0392b', color: '#c0392b', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>{isOrder ? 'ORDER' : 'BOOKING'}</span>
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{title}</p>
                          </div>
                          <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#666666' }}>Raised by {dispute.raiser?.full_name || 'Unknown'} · {new Date(dispute.created_at).toLocaleDateString()}</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>Client: {clientName || '—'} · Provider: {providerName || '—'} · ₦{Number(amount || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div style={{ background: '#F9F6F1', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' }}>Reason</p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#1A1A1A' }}>{dispute.reason}</p>
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Resolution note (optional)</label>
                        <input
                          type="text"
                          value={resolutionNotes[dispute.id] || ''}
                          onChange={e => setResolutionNotes({ ...resolutionNotes, [dispute.id]: e.target.value })}
                          placeholder="What was decided and why..."
                          style={{ width: '100%', padding: '10px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleResolveDispute(dispute, 'release')} disabled={resolvingId === dispute.id}
                          style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                          Release to Provider
                        </button>
                        <button onClick={() => handleResolveDispute(dispute, 'refund')} disabled={resolvingId === dispute.id}
                          style={{ background: '#6366F1', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                          Refund Client
                        </button>
                        <button onClick={() => handleResolveDispute(dispute, 'none')} disabled={resolvingId === dispute.id}
                          style={{ background: '#F5EFE6', color: '#8B5E3C', border: '1px solid #8B5E3C', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                          {resolvingId === dispute.id ? 'Working...' : 'Mark Resolved (no payment action)'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Training tab */}
        {activeTab === 'training' && (
          <div>
            {trainingLoading ? (
              <p style={{ color: '#666666' }}>Loading training data...</p>
            ) : Object.keys(trainingByUser).length === 0 ? (
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
            )}
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

                  <button
                    onClick={() => handleSelect(user)}
                    style={{ background: selected?.id === user.id ? '#1A1A1A' : '#F5EFE6', border: `1px solid ${selected?.id === user.id ? '#1A1A1A' : '#8B5E3C'}`, color: selected?.id === user.id ? '#FFFFFF' : '#8B5E3C', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    {selected?.id === user.id ? 'Close' : 'Review'}
                  </button>
                </div>

                {/* Review panel */}
                {selected?.id === user.id && (
                  <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #EEE6DA' }}>

                    {/* User details */}
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

                    {/* Bio */}
                    {user.bio && (
                      <div style={{ background: '#F9F6F1', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' }}>Bio</p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#1A1A1A', lineHeight: '1.6' }}>{user.bio}</p>
                      </div>
                    )}

                    {/* Documents */}
                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>Uploaded Documents</p>
                      {loadingDocs ? (
                        <p style={{ color: '#999999', fontSize: '13px' }}>Loading documents...</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {docUrls.id ? (
                            <a href={docUrls.id} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F9F6F1', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid #EEE6DA' }}>
                              <span style={{ fontSize: '20px' }}>🪪</span>
                              <div>
                                <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>Government ID</p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#8B5E3C', fontWeight: '600' }}>Click to view →</p>
                              </div>
                            </a>
                          ) : (
                            <div style={{ background: '#F9F6F1', padding: '14px', borderRadius: '10px', border: '1px solid #EEE6DA' }}>
                              <p style={{ margin: 0, fontSize: '13px', color: '#999999' }}>🪪 No government ID uploaded</p>
                            </div>
                          )}

                          {user.cac_document_url && (
                            docUrls.cac ? (
                              <a href={docUrls.cac} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F9F6F1', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid #EEE6DA' }}>
                                <span style={{ fontSize: '20px' }}>🏢</span>
                                <div>
                                  <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>CAC Certificate</p>
                                  <p style={{ margin: 0, fontSize: '12px', color: '#8B5E3C', fontWeight: '600' }}>Click to view →</p>
                                </div>
                              </a>
                            ) : (
                              <div style={{ background: '#F9F6F1', padding: '14px', borderRadius: '10px', border: '1px solid #EEE6DA' }}>
                                <p style={{ margin: 0, fontSize: '13px', color: '#999999' }}>🏢 CAC Certificate uploaded</p>
                              </div>
                            )
                          )}

                          {user.professional_license_url && (
                            docUrls.license ? (
                              <a href={docUrls.license} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F9F6F1', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid #EEE6DA' }}>
                                <span style={{ fontSize: '20px' }}>📋</span>
                                <div>
                                  <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>Professional License</p>
                                  <p style={{ margin: 0, fontSize: '12px', color: '#8B5E3C', fontWeight: '600' }}>Click to view →</p>
                                </div>
                              </a>
                            ) : (
                              <div style={{ background: '#F9F6F1', padding: '14px', borderRadius: '10px', border: '1px solid #EEE6DA' }}>
                                <p style={{ margin: 0, fontSize: '13px', color: '#999999' }}>📋 Professional License uploaded</p>
                              </div>
                            )
                          )}

                          {!user.id_document_url && !user.cac_document_url && !user.professional_license_url && (
                            <p style={{ color: '#999999', fontSize: '13px', margin: 0 }}>No documents uploaded yet</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Admin note */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Admin Note (shown to user)</label>
                      <input
                        type="text"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Reason for approval or rejection..."
                        style={{ width: '100%', padding: '10px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Action buttons */}
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