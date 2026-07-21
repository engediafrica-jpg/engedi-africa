'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import useAccessGate from '@/hooks/useAccessGate'
import LockedNotice from '@/components/LockedNotice'

const statusLabels = {
  requested: 'Awaiting response',
  countered: 'Counter-offer',
  declined: 'Declined',
  cancelled: 'Cancelled',
  accepted: 'Accepted — awaiting payment',
  paid: 'Paid — in escrow',
  completed_by_provider: 'Marked done',
  completed: 'Completed',
  disputed: 'Disputed',
}

const statusTone = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'declined' || status === 'disputed' || status === 'cancelled') return 'danger'
  if (status === 'requested' || status === 'countered' || status === 'accepted' || status === 'paid' || status === 'completed_by_provider') return 'pending'
  return 'neutral'
}

const statusSteps = ['requested', 'accepted', 'paid', 'completed_by_provider', 'completed']

export default function BookingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('requesting')
  const [updating, setUpdating] = useState(null)
  const [message, setMessage] = useState('')
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [payingBooking, setPayingBooking] = useState(null)

  const [respondBooking, setRespondBooking] = useState(null)
  const [respondMode, setRespondMode] = useState('accept')
  const [respondPrice, setRespondPrice] = useState('')
  const [respondReason, setRespondReason] = useState('')
  const [counterPrice, setCounterPrice] = useState('')
  const [counterDate, setCounterDate] = useState('')
  const [counterNote, setCounterNote] = useState('')
  const [submittingRespond, setSubmittingRespond] = useState(false)

  const [disputeBooking, setDisputeBooking] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [submittingDispute, setSubmittingDispute] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(profileData)
      await loadBookings(sessionData.session.user.id, 'requesting')
      setLoading(false)
    }
    getData()

    if (document.getElementById('paystack-script')) { setScriptLoaded(true); return }
    const script = document.createElement('script')
    script.id = 'paystack-script'
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)
  }, [])

  const loadBookings = async (uid, tab) => {
    setLoading(true)
    const field = tab === 'requesting' ? 'project_owner_id' : 'provider_id'
    const { data, error } = await supabase
      .from('bookings')
      .select('*, project_owner:profiles!bookings_project_owner_id_fkey(full_name, phone, city, avatar_url), provider:profiles!bookings_provider_id_fkey(full_name, company_name, phone, city, role, bank_account_name, paystack_recipient_code)')
      .eq(field, uid)
      .order('created_at', { ascending: false })
    if (error) { console.log('Bookings error:', error); setBookings([]) }
    else setBookings(data || [])
    setLoading(false)
  }

  const handleTabChange = async (tab) => {
    if (!profile) return
    setActiveTab(tab)
    await loadBookings(profile.id, tab)
  }

  const notify = async (userId, type, title, body) => {
    await supabase.from('notifications').insert({ user_id: userId, type, title, body, link: '/bookings', is_read: false })
  }

  const openRespond = (booking, mode) => {
    setRespondBooking(booking)
    setRespondMode(mode)
    setRespondPrice(booking.budget ? String(booking.budget) : '')
    setRespondReason('')
    setCounterPrice(booking.budget ? String(booking.budget) : '')
    setCounterDate(booking.preferred_date || '')
    setCounterNote('')
  }

  const closeRespond = () => { setRespondBooking(null) }

  const submitRespond = async () => {
    if (!respondBooking) return
    setSubmittingRespond(true)
    let updates = {}
    let notifyTitle = ''
    let notifyBody = ''

    if (respondMode === 'accept') {
      const price = Number(respondPrice)
      if (!price || price <= 0) { setMessage('Enter a valid price'); setSubmittingRespond(false); return }
      updates = { status: 'accepted', quoted_price: price, counter_price: null, counter_date: null, counter_note: null }
      notifyTitle = 'Your booking request was accepted!'
      notifyBody = `${profile.full_name} accepted at ₦${price.toLocaleString()} for "${respondBooking.job_title}". Pay to confirm.`
    } else if (respondMode === 'decline') {
      updates = { status: 'declined', decline_reason: respondReason }
      notifyTitle = 'Booking request declined'
      notifyBody = respondReason ? `${profile.full_name}: ${respondReason}` : `${profile.full_name} declined your request for "${respondBooking.job_title}"`
    } else {
      const price = Number(counterPrice)
      if (!price || price <= 0) { setMessage('Enter a valid counter price'); setSubmittingRespond(false); return }
      updates = { status: 'countered', counter_price: price, counter_date: counterDate || null, counter_note: counterNote }
      notifyTitle = 'New counter-offer received'
      notifyBody = `${profile.full_name} proposed ₦${price.toLocaleString()} for "${respondBooking.job_title}"`
    }

    const { error } = await supabase.from('bookings').update(updates).eq('id', respondBooking.id)
    if (error) { setMessage('Error: ' + error.message); setSubmittingRespond(false); return }
    setBookings(bookings.map(b => b.id === respondBooking.id ? { ...b, ...updates } : b))
    await notify(respondBooking.project_owner_id, 'booking', notifyTitle, notifyBody)
    setSubmittingRespond(false)
    setRespondBooking(null)
    setMessage('Response sent!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleCancelBooking = async (booking) => {
    setUpdating(booking.id)
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
    if (error) { setMessage('Error: ' + error.message); setUpdating(null); return }
    setBookings(bookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b))
    await notify(booking.provider_id, 'booking', 'Booking request cancelled', `${profile.full_name} cancelled the request for "${booking.job_title}"`)
    setUpdating(null)
  }

  const handleOwnerAcceptCounter = async (booking) => {
    setUpdating(booking.id)
    const updates = { status: 'accepted', quoted_price: booking.counter_price, counter_price: null, counter_date: null, counter_note: null }
    const { error } = await supabase.from('bookings').update(updates).eq('id', booking.id)
    if (error) { setMessage('Error: ' + error.message); setUpdating(null); return }
    setBookings(bookings.map(b => b.id === booking.id ? { ...b, ...updates } : b))
    await notify(booking.provider_id, 'booking', 'Counter-offer accepted', `${profile.full_name} accepted your counter-offer of ₦${Number(booking.counter_price).toLocaleString()}`)
    setUpdating(null)
  }

  const handleOwnerDeclineCounter = async (booking) => {
    setUpdating(booking.id)
    const { error } = await supabase.from('bookings').update({ status: 'declined' }).eq('id', booking.id)
    if (error) { setMessage('Error: ' + error.message); setUpdating(null); return }
    setBookings(bookings.map(b => b.id === booking.id ? { ...b, status: 'declined' } : b))
    await notify(booking.provider_id, 'booking', 'Counter-offer declined', `${profile.full_name} declined your counter-offer for "${booking.job_title}"`)
    setUpdating(null)
  }

  const handlePayForBooking = (booking) => {
    if (!scriptLoaded || !window.PaystackPop) { setMessage('Payment system loading. Please wait.'); return }
    setPayingBooking(booking.id)
    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: profile.email,
      amount: Math.round(booking.quoted_price * 100),
      currency: 'NGN',
      channels: ['card', 'bank', 'ussd', 'bank_transfer', 'opay', 'mobile_money'],
      ref: Date.now().toString() + '-booking-' + booking.id.substring(0, 8),
      metadata: { booking_id: booking.id },
      callback: async (response) => {
        const verifyRes = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: response.reference }),
        })
        const verifyData = await verifyRes.json()
        if (verifyData.data?.status === 'success') {
          const autoConfirmAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
          const commissionRate = booking.commission_rate || 0.12
          const commission = booking.quoted_price * commissionRate
          const payout = booking.quoted_price - commission
          const { error } = await supabase.from('bookings').update({
            payment_status: 'paid',
            payment_reference: response.reference,
            status: 'paid',
            commission_rate: commissionRate,
            commission_amount: commission,
            payout_amount: payout,
            auto_confirm_at: autoConfirmAt,
            paid_at: new Date().toISOString(),
          }).eq('id', booking.id)
          if (!error) {
            setBookings(bookings.map(b => b.id === booking.id ? { ...b, payment_status: 'paid', status: 'paid', payment_reference: response.reference, commission_amount: commission, payout_amount: payout, auto_confirm_at: autoConfirmAt } : b))
            await notify(booking.provider_id, 'payment', 'Payment received for your booking!', `${profile.full_name} paid ₦${Number(booking.quoted_price).toLocaleString()} for "${booking.job_title}"`)
            setMessage('Payment successful! Funds are held until you confirm the job is done.')
          }
        } else {
          setMessage('Payment verification failed. Contact support.')
        }
        setPayingBooking(null)
      },
      onClose: () => setPayingBooking(null),
    })
    handler.openIframe()
  }

  const handleMarkJobDone = async (booking) => {
    setUpdating(booking.id)
    const { error } = await supabase.from('bookings').update({ status: 'completed_by_provider' }).eq('id', booking.id)
    if (error) { setMessage('Error: ' + error.message); setUpdating(null); return }
    setBookings(bookings.map(b => b.id === booking.id ? { ...b, status: 'completed_by_provider' } : b))
    await notify(booking.project_owner_id, 'booking', 'Job marked as done', `${profile.full_name} marked "${booking.job_title}" as complete. Confirm to release payment.`)
    setUpdating(null)
    setMessage('Marked as done. Waiting for client to confirm.')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleConfirmCompletion = async (booking) => {
    setUpdating(booking.id)
    const { error } = await supabase.from('bookings').update({
      status: 'completed',
      payment_status: 'released',
      escrow_released: true,
      confirmed_at: new Date().toISOString(),
    }).eq('id', booking.id)
    if (error) { setMessage('Error: ' + error.message); setUpdating(null); return }

    if (booking.provider?.paystack_recipient_code && booking.payout_amount) {
      const transferRes = await fetch('/api/paystack/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: booking.payout_amount,
          recipient_code: booking.provider.paystack_recipient_code,
          reason: `EnGedi payout for booking ${booking.id.substring(0, 8)}`,
          reference: Date.now().toString() + '-payout-' + booking.id.substring(0, 8),
        }),
      })
      const transferData = await transferRes.json()
      if (transferData.data?.transfer_code) {
        await supabase.from('bookings').update({ payout_reference: transferData.data.transfer_code }).eq('id', booking.id)
      }
    }

    setBookings(bookings.map(b => b.id === booking.id ? { ...b, status: 'completed', payment_status: 'released', escrow_released: true } : b))
    await notify(booking.provider_id, 'payment', 'Payment released! 🎉', `₦${Number(booking.payout_amount).toLocaleString()} has been sent to your bank account.`)
    setUpdating(null)
    setMessage('Job confirmed! Payment released. You can now leave a review.')
    setTimeout(() => setMessage(''), 5000)
  }

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim()) { setMessage('Please describe the issue'); return }
    setSubmittingDispute(true)
    const { error } = await supabase.from('disputes').insert({
      booking_id: disputeBooking.id,
      raised_by: profile.id,
      reason: disputeReason,
      status: 'open',
    })
    if (!error) {
      await supabase.from('bookings').update({ dispute_raised: true, status: 'disputed' }).eq('id', disputeBooking.id)
      setBookings(bookings.map(b => b.id === disputeBooking.id ? { ...b, dispute_raised: true, status: 'disputed' } : b))
      await notify(disputeBooking.provider_id, 'dispute', 'A dispute has been raised', `${profile.full_name} raised a dispute on "${disputeBooking.job_title}"`)
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true)
      for (const a of admins || []) {
        await supabase.from('notifications').insert({
          user_id: a.id,
          type: 'dispute',
          title: 'New dispute raised',
          body: `${profile.full_name} raised a dispute on "${disputeBooking.job_title}"`,
          link: '/admin',
          is_read: false,
        })
      }
      setDisputeBooking(null)
      setDisputeReason('')
      setMessage('Dispute raised. Our team will review within 24 hours.')
    }
    setSubmittingDispute(false)
  }

  const { locked, checking } = useAccessGate(profile)

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading bookings...</p>
    </div>
  )

  if (checking) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading bookings...</p>
    </div>
  )

  if (locked) return <LockedNotice reason={locked} />

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      {/* Respond modal (accept / decline / counter) */}
      {respondBooking && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-6">
          <div className="ticks w-full max-w-[480px] border border-line bg-surface-raised p-8">
            <h3 className="m-0 mb-2 text-[18px] font-bold text-text">
              {respondMode === 'accept' && 'Accept Request'}
              {respondMode === 'decline' && 'Decline Request'}
              {respondMode === 'counter' && 'Send Counter-Offer'}
            </h3>
            <p className="m-0 mb-6 text-[14px] text-text-muted">{respondBooking.job_title}</p>

            <div className="mb-5 flex gap-2">
              {['accept', 'counter', 'decline'].map(m => (
                <button key={m} onClick={() => setRespondMode(m)}
                  className={`flex-1 border py-2 text-[12px] font-bold capitalize ${respondMode === m ? 'border-text bg-text text-surface' : 'border-line-strong text-text-muted hover:border-text'}`}>
                  {m === 'counter' ? 'Counter' : m}
                </button>
              ))}
            </div>

            {respondMode === 'accept' && (
              <div className="mb-5">
                <label className="mb-1.5 block text-[13px] font-semibold text-text">Your price (₦)</label>
                <input type="number" value={respondPrice} onChange={e => setRespondPrice(e.target.value)}
                  className="w-full border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
              </div>
            )}

            {respondMode === 'decline' && (
              <div className="mb-5">
                <label className="mb-1.5 block text-[13px] font-semibold text-text">Reason (optional)</label>
                <textarea value={respondReason} onChange={e => setRespondReason(e.target.value)} rows={3}
                  placeholder="Let them know why..."
                  className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
              </div>
            )}

            {respondMode === 'counter' && (
              <>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-[13px] font-semibold text-text">Your price (₦)</label>
                  <input type="number" value={counterPrice} onChange={e => setCounterPrice(e.target.value)}
                    className="w-full border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
                </div>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-[13px] font-semibold text-text">Proposed date</label>
                  <input type="date" value={counterDate} onChange={e => setCounterDate(e.target.value)}
                    className="w-full border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
                </div>
                <div className="mb-5">
                  <label className="mb-1.5 block text-[13px] font-semibold text-text">Note (optional)</label>
                  <textarea value={counterNote} onChange={e => setCounterNote(e.target.value)} rows={2}
                    className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
                </div>
              </>
            )}

            {message && <p className="mb-3 text-[13px] text-danger">{message}</p>}

            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1 justify-center" onClick={closeRespond}>Cancel</Button>
              <Button
                className={`flex-[2] justify-center ${respondMode === 'decline' ? 'border-danger bg-danger text-clay-contrast hover:bg-danger' : ''}`}
                disabled={submittingRespond}
                onClick={submitRespond}
              >
                {submittingRespond ? 'Sending...' : respondMode === 'accept' ? 'Accept' : respondMode === 'decline' ? 'Decline' : 'Send Counter-Offer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute modal */}
      {disputeBooking && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-6">
          <div className="ticks w-full max-w-[480px] border border-line bg-surface-raised p-8">
            <h3 className="m-0 mb-2 text-[18px] font-bold text-text">Raise a Dispute</h3>
            <p className="m-0 mb-6 text-[14px] text-text-muted">{disputeBooking.job_title}</p>
            <div className="mb-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-text">Describe the issue</label>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={4}
                placeholder="What went wrong? Be as specific as possible..."
                className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
              />
            </div>
            <div className="mb-5 border border-clay bg-surface-sunk p-3">
              <p className="m-0 text-[13px] leading-relaxed text-clay">
                Raising a dispute will freeze the payment until our team reviews the issue. We aim to resolve disputes within 24-48 hours.
              </p>
            </div>
            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => { setDisputeBooking(null); setDisputeReason('') }}>Cancel</Button>
              <Button className="flex-[2] justify-center border-danger bg-danger text-clay-contrast hover:bg-danger" disabled={submittingDispute} onClick={handleRaiseDispute}>
                {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="mb-8">
          <h1 className="m-0 mb-2 text-[26px] font-bold text-text">Bookings</h1>
          <p className="m-0 text-[15px] text-text-muted">Track job requests, quotes, and payments</p>
        </div>

        {activeTab === 'providing' && !profile?.bank_account_name && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-clay bg-surface-sunk p-5">
            <div>
              <p className="m-0 mb-1 text-[15px] font-bold text-text">Add your bank details</p>
              <p className="m-0 text-[13px] text-text-muted">You need to add your bank account to receive payments when jobs are confirmed.</p>
            </div>
            <Button href="/dashboard/bank-details" className="text-[13px]">Add Now</Button>
          </div>
        )}

        <div className="mb-6 flex gap-2">
          {[
            { key: 'requesting', label: 'My Requests' },
            { key: 'providing', label: 'Requests Received' },
          ].map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`border px-6 py-2.5 text-[14px] font-bold ${activeTab === tab.key ? 'border-text bg-text text-surface' : 'border-line-strong text-text-muted hover:border-text'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {message && <p className={`mb-4 text-[13px] font-semibold ${message.includes('Error') ? 'text-danger' : 'text-oasis'}`}>{message}</p>}

        {bookings.length === 0 ? (
          <div className="border border-line bg-surface-raised p-16 text-center">
            <p className="m-0 mb-2 text-[15px] font-bold text-text-muted">No bookings yet</p>
            <p className="m-0 mb-5 text-[13px] text-text-muted">
              {activeTab === 'requesting' ? 'Visit an artisan, professional, service provider, or equipment provider\'s profile to request a quote or book equipment' : 'Requests from clients will appear here'}
            </p>
            {activeTab === 'requesting' && (
              <Button href="/browse">Browse Providers</Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map(booking => {
              const currentStep = statusSteps.indexOf(booking.status)
              const showProgress = statusSteps.includes(booking.status)
              const isPaid = booking.payment_status === 'paid'
              const isReleased = booking.escrow_released

              return (
                <div key={booking.id} className="ticks border border-line bg-surface-raised p-6">

                  {/* Header */}
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="m-0 mb-1 text-[16px] font-bold text-text">{booking.job_title}</h3>
                      {booking.location && <p className="m-0 mb-1 text-[13px] text-text-muted">{booking.location}{booking.preferred_date ? ` · ${new Date(booking.preferred_date).toLocaleDateString()}` : ''}</p>}
                      <p className="m-0 font-mono text-[12px] text-text-muted">Booking #{booking.id.substring(0, 8)} · {new Date(booking.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      {(booking.quoted_price || booking.budget) && (
                        <p className="m-0 mb-1.5 font-mono text-[18px] font-bold tabular-nums text-text">₦{Number(booking.quoted_price || booking.budget).toLocaleString()}</p>
                      )}
                      <Badge tone={statusTone(booking.status)}>{statusLabels[booking.status] || booking.status}</Badge>
                    </div>
                  </div>

                  {/* Escrow status */}
                  {(isPaid || booking.status === 'completed') && (
                    <div className={`mb-4 border p-4 ${isReleased ? 'border-oasis bg-oasis-soft' : 'border-line-strong bg-surface-sunk'}`}>
                      <p className={`m-0 text-[13px] font-bold ${isReleased ? 'text-oasis' : 'text-text'}`}>
                        {isReleased ? '✓ Payment released to provider' : 'Payment held in escrow — waiting for job confirmation'}
                      </p>
                      {isPaid && !isReleased && booking.payout_amount && (
                        <p className="m-0 mt-1 text-[12px] text-text-muted">
                          Provider will receive ₦{Number(booking.payout_amount).toLocaleString()} after confirmation ({Math.round((booking.commission_rate || 0.12) * 100)}% platform fee deducted)
                        </p>
                      )}
                      {isPaid && !isReleased && booking.auto_confirm_at && (
                        <p className="m-0 mt-1 text-[12px] text-text-muted">
                          Auto-confirms on {new Date(booking.auto_confirm_at).toLocaleDateString()} if no dispute is raised
                        </p>
                      )}
                    </div>
                  )}

                  {/* Progress tracker */}
                  {showProgress && (
                    <div className="mb-5">
                      <div className="flex items-center">
                        {statusSteps.map((step, i) => (
                          <div key={step} className={`flex items-center ${i < statusSteps.length - 1 ? 'flex-1' : ''}`}>
                            <div className="flex flex-col items-center">
                              <div className={`flex h-6 w-6 shrink-0 items-center justify-center border ${i <= currentStep ? 'border-text bg-text' : 'border-line-strong bg-surface-raised'}`}>
                                {i <= currentStep
                                  ? <span className="text-[11px] font-bold text-surface">✓</span>
                                  : <span className="font-mono text-[10px] font-bold text-text-muted">{i + 1}</span>
                                }
                              </div>
                              <p className={`mb-4 mt-1 whitespace-nowrap text-[10px] capitalize ${i <= currentStep ? 'font-bold text-text' : 'text-text-muted'}`}>{step.replace(/_/g, ' ')}</p>
                            </div>
                            {i < statusSteps.length - 1 && (
                              <div className={`mx-1 mb-4 h-px flex-1 ${i < currentStep ? 'bg-text' : 'bg-line-strong'}`}></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div className="mb-4 border border-line bg-surface-sunk p-3.5">
                    {activeTab === 'requesting' ? (
                      <p className="m-0 text-[13px] text-text-muted">
                        <strong className="text-text">Provider:</strong> {booking.provider?.company_name || booking.provider?.full_name} · {booking.provider?.city}
                      </p>
                    ) : (
                      <p className="m-0 text-[13px] text-text-muted">
                        <strong className="text-text">Client:</strong> {booking.project_owner?.full_name} · {booking.project_owner?.city} · {booking.project_owner?.phone}
                      </p>
                    )}
                    {booking.job_description && <p className="m-0 mt-1.5 text-[13px] text-text-muted"><strong className="text-text">Job:</strong> {booking.job_description}</p>}
                    {booking.budget && <p className="m-0 mt-1.5 text-[13px] text-text-muted"><strong className="text-text">Budget:</strong> ₦{Number(booking.budget).toLocaleString()}</p>}
                  </div>

                  {/* Counter-offer banner */}
                  {booking.status === 'countered' && (
                    <div className="mb-4 border border-clay bg-surface-sunk p-3.5">
                      <p className="m-0 mb-1 text-[13px] font-bold text-clay">
                        {activeTab === 'requesting' ? 'Provider countered with:' : 'You countered with:'}
                      </p>
                      <p className="m-0 text-[14px] font-semibold text-text">
                        ₦{Number(booking.counter_price).toLocaleString()}{booking.counter_date ? ` · ${new Date(booking.counter_date).toLocaleDateString()}` : ''}
                      </p>
                      {booking.counter_note && <p className="m-0 mt-1 text-[13px] text-text-muted">{booking.counter_note}</p>}
                    </div>
                  )}

                  {booking.status === 'declined' && booking.decline_reason && (
                    <div className="mb-4 border border-danger bg-danger-soft p-3.5">
                      <p className="m-0 text-[13px] text-danger"><strong>Reason:</strong> {booking.decline_reason}</p>
                    </div>
                  )}

                  {/* Requesting (owner) actions */}
                  {activeTab === 'requesting' && (
                    <div className="flex flex-wrap gap-2.5">
                      {booking.status === 'requested' && (
                        <Button variant="outline" disabled={updating === booking.id} onClick={() => handleCancelBooking(booking)}>
                          {updating === booking.id ? 'Cancelling...' : 'Cancel Request'}
                        </Button>
                      )}
                      {booking.status === 'countered' && (
                        <>
                          <Button disabled={updating === booking.id} onClick={() => handleOwnerAcceptCounter(booking)}>
                            Accept ₦{Number(booking.counter_price).toLocaleString()}
                          </Button>
                          <Button variant="outline" className="border-danger text-danger hover:bg-danger-soft" disabled={updating === booking.id} onClick={() => handleOwnerDeclineCounter(booking)}>
                            Decline
                          </Button>
                        </>
                      )}
                      {booking.status === 'accepted' && (
                        <Button disabled={payingBooking === booking.id} onClick={() => handlePayForBooking(booking)}>
                          {payingBooking === booking.id ? 'Opening payment...' : `Pay ₦${Number(booking.quoted_price).toLocaleString()}`}
                        </Button>
                      )}
                      {booking.status === 'completed_by_provider' && (
                        <>
                          <Button disabled={updating === booking.id} onClick={() => handleConfirmCompletion(booking)}>
                            {updating === booking.id ? 'Confirming...' : '✓ Confirm Job Was Completed'}
                          </Button>
                          <Button variant="outline" className="border-danger text-danger hover:bg-danger-soft" onClick={() => setDisputeBooking(booking)}>
                            Raise Dispute
                          </Button>
                        </>
                      )}
                      {booking.status === 'completed' && (
                        <Button href={`/${booking.provider?.role === 'artisan' ? 'artisans' : booking.provider?.role === 'professional' ? 'professionals' : booking.provider?.role === 'equipment_provider' ? 'equipment-providers' : 'service-providers'}/${booking.provider_id}`}>
                          Leave a Review
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Providing actions */}
                  {activeTab === 'providing' && (
                    <div className="flex flex-wrap gap-2.5">
                      {booking.status === 'requested' && (
                        <>
                          <Button className="text-[13px]" onClick={() => openRespond(booking, 'accept')}>Accept</Button>
                          <Button variant="outline" className="text-[13px]" onClick={() => openRespond(booking, 'counter')}>Counter-Offer</Button>
                          <Button variant="outline" className="border-danger text-[13px] text-danger hover:bg-danger-soft" onClick={() => openRespond(booking, 'decline')}>Decline</Button>
                        </>
                      )}
                      {booking.status === 'paid' && (
                        <Button className="text-[13px]" disabled={updating === booking.id} onClick={() => handleMarkJobDone(booking)}>
                          {updating === booking.id ? 'Updating...' : 'Mark Job as Done'}
                        </Button>
                      )}
                      {!booking.provider?.bank_account_name && booking.payment_status === 'paid' && (
                        <Button href="/dashboard/bank-details" variant="outline" className="border-clay text-[13px] text-clay hover:bg-surface-sunk">
                          Add Bank Details to Receive Payment
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
