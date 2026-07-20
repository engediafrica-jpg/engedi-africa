'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import Input from '@/components/Input'

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
  const [marketerForm, setMarketerForm] = useState({ full_name: '', email: '', password: '' })
  const [creatingMarketer, setCreatingMarketer] = useState(false)
  const [marketerMessage, setMarketerMessage] = useState('')
  const [marketerPayments, setMarketerPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ marketer_id: '', month: '', amount: '', note: '' })
  const [loggingPayment, setLoggingPayment] = useState(false)
  const [revenueBookings, setRevenueBookings] = useState([])
  const [revenueOrders, setRevenueOrders] = useState([])
  const [revenueLoading, setRevenueLoading] = useState(false)

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

  const loadMarketerPayments = async () => {
    setPaymentsLoading(true)
    const { data } = await supabase
      .from('marketer_payments')
      .select('*')
      .order('month', { ascending: false })
    setMarketerPayments(data || [])
    setPaymentsLoading(false)
  }

  const loadRevenue = async () => {
    setRevenueLoading(true)
    const since = new Date()
    since.setMonth(since.getMonth() - 5)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)
    const sinceIso = since.toISOString()

    // Filtering by created_at (not paid_at) means a transaction created 7+
    // months ago but paid this month is missed from the trend window — an
    // acceptable approximation at current data volume, matching how every
    // other tab in this file aggregates client-side rather than via SQL.
    const [{ data: bookingRows }, { data: orderRows }] = await Promise.all([
      supabase.from('bookings')
        .select('id, quoted_price, commission_amount, payment_status, dispute_raised, created_at, paid_at')
        .gte('created_at', sinceIso),
      supabase.from('orders')
        .select('id, total_price, commission_amount, payment_status, dispute_raised, created_at, paid_at')
        .gte('created_at', sinceIso),
    ])
    setRevenueBookings(bookingRows || [])
    setRevenueOrders(orderRows || [])
    setRevenueLoading(false)
  }

  const handleCreateMarketer = async () => {
    setMarketerMessage('')
    if (!marketerForm.full_name || !marketerForm.email || !marketerForm.password) {
      setMarketerMessage('Please fill all fields')
      return
    }
    setCreatingMarketer(true)
    try {
      const res = await fetch('/api/admin/create-marketer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(marketerForm),
      })
      const data = await res.json()
      if (!res.ok) { setMarketerMessage('Error: ' + data.error); setCreatingMarketer(false); return }
      const { data: refreshed } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(refreshed || [])
      setMarketerForm({ full_name: '', email: '', password: '' })
      setMarketerMessage(`Marketer created — referral code ${data.referral_code}`)
    } catch (error) {
      setMarketerMessage('Error: ' + error.message)
    }
    setCreatingMarketer(false)
  }

  const handleLogPayment = async () => {
    setMarketerMessage('')
    if (!paymentForm.marketer_id || !paymentForm.month || !paymentForm.amount) {
      setMarketerMessage('Please select a marketer and fill month + amount')
      return
    }
    setLoggingPayment(true)
    const { error } = await supabase.from('marketer_payments').insert({
      marketer_id: paymentForm.marketer_id,
      month: `${paymentForm.month}-01`,
      amount: Number(paymentForm.amount),
      note: paymentForm.note,
      created_by: admin.id,
    })
    setLoggingPayment(false)
    if (error) { setMarketerMessage('Error: ' + error.message); return }
    setPaymentForm({ marketer_id: '', month: '', amount: '', note: '' })
    setMarketerMessage('Payment logged')
    loadMarketerPayments()
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
    field_marketer: 'Field Marketer',
  }

  const marketers = users.filter(u => u.role === 'field_marketer')
  const referredCounts = users.reduce((acc, u) => {
    if (u.referred_by_marketer_id) acc[u.referred_by_marketer_id] = (acc[u.referred_by_marketer_id] || 0) + 1
    return acc
  }, {})

  // Group training by user
  const trainingByUser = training.reduce((acc, t) => {
    const uid = t.user_id
    if (!acc[uid]) acc[uid] = { user: t.user, modules: [] }
    acc[uid].modules.push(t)
    return acc
  }, {})

  const pendingVerification = users.filter(u => u.documents_submitted && u.verification_status === 'pending')

  const verificationTone = (status) => status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'pending'

  // --- Revenue tab aggregation ---
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const now = new Date()
  const thisMonthKey = monthKey(now)
  const paidStatuses = ['paid', 'released']

  const revenueRows = [
    ...revenueBookings.map(b => ({
      amount: b.commission_amount, gmv: b.quoted_price,
      payment_status: b.payment_status, disputed: b.dispute_raised,
      date: b.paid_at || b.created_at,
    })),
    ...revenueOrders.map(o => ({
      amount: o.commission_amount, gmv: o.total_price,
      payment_status: o.payment_status, disputed: o.dispute_raised,
      date: o.paid_at || o.created_at,
    })),
  ].filter(r => paidStatuses.includes(r.payment_status))

  const thisMonthRows = revenueRows.filter(r => monthKey(new Date(r.date)) === thisMonthKey)

  const monthlyRevenue = thisMonthRows.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const annualRunRate = monthlyRevenue * 12
  const gmvThisMonth = thisMonthRows.reduce((sum, r) => sum + Number(r.gmv || 0), 0)
  const takeRate = gmvThisMonth > 0 ? (monthlyRevenue / gmvThisMonth) * 100 : 0

  // Trailing 6-month trend — explicit month keys so empty months render as 0, not gaps
  const trendMap = revenueRows.reduce((acc, r) => {
    const key = monthKey(new Date(r.date))
    if (!acc[key]) acc[key] = { month: key, revenue: 0, gmv: 0 }
    acc[key].revenue += Number(r.amount || 0)
    acc[key].gmv += Number(r.gmv || 0)
    return acc
  }, {})
  const revenueTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = monthKey(d)
    return trendMap[key] || { month: key, revenue: 0, gmv: 0 }
  })
  const trendMaxGmv = Math.max(1, ...revenueTrend.map(t => t.gmv))

  // New signups this month, by role
  const newSignupsThisMonth = users.filter(u => monthKey(new Date(u.created_at)) === thisMonthKey)
  const signupsByRole = newSignupsThisMonth.reduce((acc, u) => {
    const r = u.role || 'unknown'
    acc[r] = (acc[r] || 0) + 1
    return acc
  }, {})

  // Artisan certification rate — reuses trainingByUser above
  const artisanProfiles = users.filter(u => u.role === 'artisan')
  const certifiedArtisanIds = new Set(
    Object.entries(trainingByUser).filter(([, t]) => t.modules.length >= TOTAL_MODULES).map(([uid]) => uid)
  )
  const certificationRate = artisanProfiles.length > 0
    ? (artisanProfiles.filter(a => certifiedArtisanIds.has(a.id)).length / artisanProfiles.length) * 100
    : 0

  // Dispute rate — same this-month cohort as Monthly Revenue for apples-to-apples comparison
  const disputeRate = thisMonthRows.length > 0
    ? (thisMonthRows.filter(r => r.disputed).length / thisMonthRows.length) * 100
    : 0

  // Field marketer cost-per-signup
  const totalMarketerSpend = marketerPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const totalReferredSignups = users.filter(u => u.referred_by_marketer_id).length
  const costPerSignup = totalReferredSignups > 0 ? totalMarketerSpend / totalReferredSignups : 0

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading admin panel...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      <div className="mx-auto max-w-[1000px] px-6 py-10">
        <h1 className="mb-1 text-[24px] font-bold text-text">Admin Panel</h1>
        <p className="mb-8 text-[14px] text-text-muted">{users.length} total users · {pendingVerification.length} pending verification</p>

        {openDisputeCount > 0 && (
          <button
            onClick={() => { setActiveTab('disputes'); if (disputes.length === 0) loadDisputes() }}
            className="mb-6 flex w-full items-center justify-between border border-danger bg-danger-soft px-5 py-4 text-left"
          >
            <p className="m-0 text-[14px] font-bold text-danger">
              {openDisputeCount} open {openDisputeCount === 1 ? 'dispute needs' : 'disputes need'} review
            </p>
            <span className="text-[13px] font-bold text-danger">Review →</span>
          </button>
        )}

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { key: 'users', label: `All Users (${users.length})` },
            { key: 'pending', label: `Pending Review (${pendingVerification.length})` },
            { key: 'disputes', label: `Disputes${openDisputeCount ? ` (${openDisputeCount})` : ''}` },
            { key: 'training', label: 'Training Progress' },
            { key: 'marketers', label: `Field Marketers (${marketers.length})` },
            { key: 'revenue', label: 'Revenue' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                if (tab.key === 'training' && training.length === 0) loadTraining()
                if (tab.key === 'disputes') loadDisputes()
                if (tab.key === 'marketers' && marketerPayments.length === 0) loadMarketerPayments()
                if (tab.key === 'revenue') {
                  loadRevenue()
                  if (training.length === 0) loadTraining()
                  if (marketerPayments.length === 0) loadMarketerPayments()
                }
              }}
              className={`border px-5 py-2.5 text-[13px] font-bold ${activeTab === tab.key ? 'border-text bg-text text-surface' : 'border-line-strong text-text-muted hover:border-text'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message && <p className="mb-4 text-[13px] font-semibold text-oasis">{message}</p>}

        {/* Disputes tab */}
        {activeTab === 'disputes' && (
          <div>
            {disputeMessage && <p className={`mb-4 text-[13px] font-semibold ${disputeMessage.includes('Error') || disputeMessage.includes('Missing') || disputeMessage.includes('No payment') ? 'text-danger' : 'text-oasis'}`}>{disputeMessage}</p>}
            {disputesLoading ? (
              <p className="text-text-muted">Loading disputes...</p>
            ) : disputes.length === 0 ? (
              <div className="border border-line bg-surface-raised p-10 text-center">
                <p className="m-0 text-[15px] text-text-muted">No open disputes.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {disputes.map(dispute => {
                  const item = dispute.order || dispute.booking
                  const isOrder = !!dispute.order
                  const title = isOrder ? (item?.product?.name || 'Order') : (item?.job_title || 'Booking')
                  const clientName = isOrder ? item?.buyer?.full_name : item?.project_owner?.full_name
                  const providerName = isOrder ? item?.supplier?.full_name : item?.provider?.full_name
                  const amount = isOrder ? item?.total_price : item?.quoted_price
                  return (
                    <div key={dispute.id} className="ticks border border-danger bg-surface-raised p-5">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <Badge tone="danger">{isOrder ? 'Order' : 'Booking'}</Badge>
                            <p className="m-0 text-[15px] font-bold text-text">{title}</p>
                          </div>
                          <p className="m-0 mb-0.5 text-[13px] text-text-muted">Raised by {dispute.raiser?.full_name || 'Unknown'} · {new Date(dispute.created_at).toLocaleDateString()}</p>
                          <p className="m-0 text-[13px] text-text-muted">Client: {clientName || '—'} · Provider: {providerName || '—'} · ₦{Number(amount || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mb-4 border border-line bg-surface-sunk p-3.5">
                        <p className="m-0 mb-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">Reason</p>
                        <p className="m-0 text-[14px] text-text">{dispute.reason}</p>
                      </div>

                      <div className="mb-4">
                        <Input
                          label="Resolution note (optional)"
                          type="text"
                          value={resolutionNotes[dispute.id] || ''}
                          onChange={e => setResolutionNotes({ ...resolutionNotes, [dispute.id]: e.target.value })}
                          placeholder="What was decided and why..."
                        />
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        <Button className="border-oasis bg-oasis text-clay-contrast hover:bg-oasis text-[13px]" disabled={resolvingId === dispute.id} onClick={() => handleResolveDispute(dispute, 'release')}>
                          Release to Provider
                        </Button>
                        <Button className="text-[13px]" disabled={resolvingId === dispute.id} onClick={() => handleResolveDispute(dispute, 'refund')}>
                          Refund Client
                        </Button>
                        <Button variant="outline" className="text-[13px]" disabled={resolvingId === dispute.id} onClick={() => handleResolveDispute(dispute, 'none')}>
                          {resolvingId === dispute.id ? 'Working...' : 'Mark Resolved (no payment action)'}
                        </Button>
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
              <p className="text-text-muted">Loading training data...</p>
            ) : Object.keys(trainingByUser).length === 0 ? (
              <div className="border border-line bg-surface-raised p-10 text-center">
                <p className="m-0 text-[15px] text-text-muted">No artisans have completed any training modules yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {Object.values(trainingByUser).map(({ user, modules }) => {
                  const completed = modules.length
                  const allDone = completed >= TOTAL_MODULES
                  return (
                    <div key={modules[0].user_id} className={`border p-5 ${allDone ? 'border-oasis' : 'border-line'} bg-surface-raised`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-clay bg-surface-sunk font-display text-[16px] font-bold text-clay">
                            {user?.avatar_url
                              ? <img src={user.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                              : user?.full_name?.charAt(0)?.toUpperCase() || '?'
                            }
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="m-0 text-[15px] font-bold text-text">{user?.full_name}</p>
                              {allDone && <Badge tone="success">Certified</Badge>}
                            </div>
                            <p className="m-0.5 mt-0.5 text-[13px] text-text-muted">{user?.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="m-0 mb-1 font-mono text-[16px] font-bold tabular-nums text-text">{completed}/{TOTAL_MODULES} modules</p>
                          <div className="h-1.5 w-[120px] overflow-hidden bg-line-strong">
                            <div className={`h-full ${allDone ? 'bg-oasis' : 'bg-clay'}`} style={{ width: `${(completed / TOTAL_MODULES) * 100}%` }}></div>
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

        {/* Field Marketers tab */}
        {activeTab === 'marketers' && (
          <div>
            {marketerMessage && (
              <p className={`mb-4 text-[13px] font-semibold ${marketerMessage.includes('Error') || marketerMessage.includes('Please') ? 'text-danger' : 'text-oasis'}`}>
                {marketerMessage}
              </p>
            )}

            {/* Create marketer */}
            <div className="ticks mb-6 border border-line bg-surface-raised p-6">
              <p className="mb-4 text-[15px] font-bold text-text">Create Field Marketer</p>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input label="Full Name" value={marketerForm.full_name} onChange={e => setMarketerForm({ ...marketerForm, full_name: e.target.value })} placeholder="Marketer's name" />
                <Input label="Email" type="email" value={marketerForm.email} onChange={e => setMarketerForm({ ...marketerForm, email: e.target.value })} placeholder="marketer@email.com" />
                <Input label="Password" type="password" value={marketerForm.password} onChange={e => setMarketerForm({ ...marketerForm, password: e.target.value })} placeholder="Set initial password" />
              </div>
              <Button disabled={creatingMarketer} onClick={handleCreateMarketer}>
                {creatingMarketer ? 'Creating...' : 'Create Marketer'}
              </Button>
            </div>

            {/* Marketers list */}
            <div className="mb-6 flex flex-col gap-3">
              {marketers.length === 0 ? (
                <div className="border border-line bg-surface-raised p-10 text-center">
                  <p className="m-0 text-[15px] text-text-muted">No field marketers yet.</p>
                </div>
              ) : marketers.map(m => (
                <div key={m.id} className="border border-line bg-surface-raised p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="m-0 mb-1 text-[15px] font-bold text-text">{m.full_name}</p>
                      <p className="m-0 mb-1 text-[13px] text-text-muted">{m.email}</p>
                      <p className="m-0 font-mono text-[13px] text-clay">engediafrica.com/signup?ref={m.referral_code}</p>
                    </div>
                    <Badge tone="pending">{referredCounts[m.id] || 0} signups</Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Log a monthly payment */}
            <div className="ticks mb-6 border border-line bg-surface-raised p-6">
              <p className="mb-4 text-[15px] font-bold text-text">Log Monthly Payment</p>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-[0.8rem] font-semibold text-text">Marketer</label>
                  <select
                    value={paymentForm.marketer_id}
                    onChange={e => setPaymentForm({ ...paymentForm, marketer_id: e.target.value })}
                    className="w-full border border-line bg-surface-raised px-3.5 py-3 text-[0.95rem] text-text outline-none focus:border-clay"
                  >
                    <option value="">Select marketer</option>
                    {marketers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <Input label="Month" type="month" value={paymentForm.month} onChange={e => setPaymentForm({ ...paymentForm, month: e.target.value })} />
                <Input label="Amount (₦)" type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="e.g. 15000" />
                <Input label="Note (optional)" value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="Transport + stipend" />
              </div>
              <Button disabled={loggingPayment} onClick={handleLogPayment}>
                {loggingPayment ? 'Logging...' : 'Log Payment'}
              </Button>
            </div>

            {/* Payment history */}
            <div>
              <p className="mb-3 text-[14px] font-bold text-text">Payment History</p>
              {paymentsLoading ? (
                <p className="text-text-muted">Loading payments...</p>
              ) : marketerPayments.length === 0 ? (
                <div className="border border-line bg-surface-raised p-10 text-center">
                  <p className="m-0 text-[15px] text-text-muted">No payments logged yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {marketerPayments.map(p => {
                    const marketer = users.find(u => u.id === p.marketer_id)
                    return (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface-raised px-4 py-3">
                        <div>
                          <p className="m-0 text-[14px] font-bold text-text">{marketer?.full_name || 'Unknown marketer'}</p>
                          <p className="m-0 text-[12px] text-text-muted">{new Date(p.month).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}{p.note ? ` · ${p.note}` : ''}</p>
                        </div>
                        <p className="m-0 font-mono text-[14px] font-bold text-text">₦{Number(p.amount).toLocaleString()}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revenue tab */}
        {activeTab === 'revenue' && (
          <div>
            {revenueLoading ? (
              <p className="text-text-muted">Loading revenue data...</p>
            ) : (
              <>
                <div className="mb-2 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                  <div className="border border-line bg-surface-sunk px-3 py-2.5">
                    <p className="m-0 mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">Monthly Revenue (MRR)</p>
                    <p className="m-0 text-[15px] font-bold tabular-nums text-text">₦{Number(monthlyRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="border border-line bg-surface-sunk px-3 py-2.5">
                    <p className="m-0 mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">Annual Run-Rate (ARR)</p>
                    <p className="m-0 text-[15px] font-bold tabular-nums text-text">₦{Number(annualRunRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="border border-line bg-surface-sunk px-3 py-2.5">
                    <p className="m-0 mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">GMV This Month</p>
                    <p className="m-0 text-[15px] font-bold tabular-nums text-text">₦{Number(gmvThisMonth).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="border border-line bg-surface-sunk px-3 py-2.5">
                    <p className="m-0 mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">Take Rate</p>
                    <p className="m-0 text-[15px] font-bold tabular-nums text-text">{takeRate.toFixed(1)}%</p>
                  </div>
                </div>
                <p className="m-0 mb-5 text-[11.5px] text-text-muted">Monthly Revenue and Annual Run-Rate are derived from commission on bookings + orders, not subscription revenue — there are no subscriptions on this platform.</p>

                <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                  <div className="border border-line bg-surface-sunk px-3 py-2.5">
                    <p className="m-0 mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">New Signups (This Month)</p>
                    <p className="m-0 text-[15px] font-bold tabular-nums text-text">{newSignupsThisMonth.length}</p>
                    {Object.keys(signupsByRole).length > 0 && (
                      <p className="m-0 mt-1 text-[11px] text-text-muted">{Object.entries(signupsByRole).map(([r, c]) => `${roleLabel[r] || r}: ${c}`).join(' · ')}</p>
                    )}
                  </div>
                  <div className="border border-line bg-surface-sunk px-3 py-2.5">
                    <p className="m-0 mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">Artisan Certification Rate</p>
                    <p className="m-0 text-[15px] font-bold tabular-nums text-text">{certificationRate.toFixed(0)}%</p>
                  </div>
                  <div className="border border-line bg-surface-sunk px-3 py-2.5">
                    <p className="m-0 mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">Dispute Rate (This Month)</p>
                    <p className="m-0 text-[15px] font-bold tabular-nums text-text">{disputeRate.toFixed(1)}%</p>
                  </div>
                  <div className="border border-line bg-surface-sunk px-3 py-2.5">
                    <p className="m-0 mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">Cost per Marketer Signup</p>
                    <p className="m-0 text-[15px] font-bold tabular-nums text-text">₦{Number(costPerSignup).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>

                <p className="mb-3 text-[14px] font-bold text-text">Revenue &amp; GMV — Last 6 Months</p>
                <div className="mb-2 flex items-center gap-4 text-[11.5px] text-text-muted">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 bg-clay"></span>Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 bg-line-strong"></span>GMV</span>
                </div>
                <div className="flex flex-col gap-2.5 border border-line bg-surface-raised p-4">
                  {revenueTrend.map(t => (
                    <div key={t.month} className="flex items-center gap-3">
                      <p className="m-0 w-14 shrink-0 font-mono text-[11px] text-text-muted">
                        {new Date(t.month + '-01').toLocaleDateString('en-NG', { month: 'short', year: '2-digit' })}
                      </p>
                      <div className="flex-1">
                        <div className="mb-1 h-2 overflow-hidden bg-surface-sunk" title={`GMV ₦${Number(t.gmv).toLocaleString()}`}>
                          <div className="h-full bg-line-strong" style={{ width: `${(t.gmv / trendMaxGmv) * 100}%` }}></div>
                        </div>
                        <div className="h-2 overflow-hidden bg-surface-sunk" title={`Revenue ₦${Number(t.revenue).toLocaleString()}`}>
                          <div className="h-full bg-clay" style={{ width: `${(t.revenue / trendMaxGmv) * 100}%` }}></div>
                        </div>
                      </div>
                      <p className="m-0 w-24 shrink-0 text-right font-mono text-[11px] tabular-nums text-text-muted">₦{Number(t.revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Users list */}
        {(activeTab === 'users' || activeTab === 'pending') && (
          <div className="flex flex-col gap-3">
            {(activeTab === 'pending' ? pendingVerification : users).map(user => (
              <div key={user.id} className={`border p-5 ${selected?.id === user.id ? 'border-clay' : 'border-line'} bg-surface-raised`}>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 ${user.is_verified ? 'border-oasis' : 'border-clay'} bg-surface-sunk font-display text-[18px] font-bold text-clay`}>
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                          : user.full_name?.charAt(0)?.toUpperCase() || '?'
                        }
                      </div>
                      {user.is_verified && (
                        <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface-raised bg-oasis">
                          <span className="text-[9px] font-bold text-clay-contrast">✓</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="m-0 text-[15px] font-bold text-text">{user.full_name || 'No name'}</p>
                        {user.is_admin && <Badge tone="neutral">Admin</Badge>}
                        {user.is_verified && <Badge tone="success">Verified</Badge>}
                      </div>
                      <p className="m-0 mb-2 text-[13px] text-text-muted">{user.email}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone="pending">{roleLabel[user.role] || user.role || 'No role'}</Badge>
                        <Badge tone={verificationTone(user.verification_status)}>{user.verification_status || 'pending'}</Badge>
                        {user.documents_submitted && (
                          <Badge tone="success">Docs Submitted</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button variant={selected?.id === user.id ? 'solid' : 'outline'} className="text-[13px]" onClick={() => handleSelect(user)}>
                    {selected?.id === user.id ? 'Close' : 'Review'}
                  </Button>
                </div>

                {/* Review panel */}
                {selected?.id === user.id && (
                  <div className="mt-6 border-t border-line pt-6">

                    {/* User details */}
                    <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
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
                        <div key={field.label} className="border border-line bg-surface-sunk px-3 py-2.5">
                          <p className="m-0 mb-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">{field.label}</p>
                          <p className="m-0 text-[13px] font-semibold text-text">{field.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Bio */}
                    {user.bio && (
                      <div className="mb-5 border border-line bg-surface-sunk p-4">
                        <p className="m-0 mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">Bio</p>
                        <p className="m-0 text-[14px] leading-relaxed text-text">{user.bio}</p>
                      </div>
                    )}

                    {/* Documents */}
                    <div className="mb-5">
                      <p className="mb-3 text-[14px] font-bold text-text">Uploaded Documents</p>
                      {loadingDocs ? (
                        <p className="text-[13px] text-text-muted">Loading documents...</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {docUrls.id ? (
                            <a href={docUrls.id} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-line bg-surface-sunk p-3.5 no-underline">
                              <div>
                                <p className="m-0 mb-0.5 text-[14px] font-bold text-text">Government ID</p>
                                <p className="m-0 text-[12px] font-semibold text-clay">Click to view →</p>
                              </div>
                            </a>
                          ) : (
                            <div className="border border-line bg-surface-sunk p-3.5">
                              <p className="m-0 text-[13px] text-text-muted">No government ID uploaded</p>
                            </div>
                          )}

                          {user.cac_document_url && (
                            docUrls.cac ? (
                              <a href={docUrls.cac} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-line bg-surface-sunk p-3.5 no-underline">
                                <div>
                                  <p className="m-0 mb-0.5 text-[14px] font-bold text-text">CAC Certificate</p>
                                  <p className="m-0 text-[12px] font-semibold text-clay">Click to view →</p>
                                </div>
                              </a>
                            ) : (
                              <div className="border border-line bg-surface-sunk p-3.5">
                                <p className="m-0 text-[13px] text-text-muted">CAC Certificate uploaded</p>
                              </div>
                            )
                          )}

                          {user.professional_license_url && (
                            docUrls.license ? (
                              <a href={docUrls.license} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-line bg-surface-sunk p-3.5 no-underline">
                                <div>
                                  <p className="m-0 mb-0.5 text-[14px] font-bold text-text">Professional License</p>
                                  <p className="m-0 text-[12px] font-semibold text-clay">Click to view →</p>
                                </div>
                              </a>
                            ) : (
                              <div className="border border-line bg-surface-sunk p-3.5">
                                <p className="m-0 text-[13px] text-text-muted">Professional License uploaded</p>
                              </div>
                            )
                          )}

                          {!user.id_document_url && !user.cac_document_url && !user.professional_license_url && (
                            <p className="m-0 text-[13px] text-text-muted">No documents uploaded yet</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Admin note */}
                    <div className="mb-4">
                      <Input
                        label="Admin Note (shown to user)"
                        type="text"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Reason for approval or rejection..."
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2.5">
                      <Button className="border-oasis bg-oasis text-clay-contrast hover:bg-oasis" onClick={() => handleVerify(user.id, 'approved')}>Approve</Button>
                      <Button className="border-danger bg-danger text-clay-contrast hover:bg-danger" onClick={() => handleVerify(user.id, 'rejected')}>Reject</Button>
                      <Button variant="outline" onClick={() => handleVerify(user.id, 'pending')}>Reset to Pending</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {activeTab === 'pending' && pendingVerification.length === 0 && (
              <div className="border border-line bg-surface-raised p-10 text-center">
                <p className="m-0 text-[15px] font-semibold text-text-muted">No pending verifications</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
