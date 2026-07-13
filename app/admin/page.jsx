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

  const verificationTone = (status) => status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'pending'

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
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                if (tab.key === 'training' && training.length === 0) loadTraining()
                if (tab.key === 'disputes') loadDisputes()
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
