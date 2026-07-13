'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const statusColors = {
  requested: { bg: '#FFF8F0', border: '#8B5E3C', color: '#8B5E3C' },
  countered: { bg: '#FFF8F0', border: '#F59E0B', color: '#F59E0B' },
  declined: { bg: '#fde8e8', border: '#c0392b', color: '#c0392b' },
  cancelled: { bg: '#F9F6F1', border: '#999999', color: '#999999' },
  accepted: { bg: '#EEF2FF', border: '#6366F1', color: '#6366F1' },
  paid: { bg: '#EEF2FF', border: '#6366F1', color: '#6366F1' },
  completed_by_provider: { bg: '#FFF8F0', border: '#F59E0B', color: '#F59E0B' },
  completed: { bg: '#e8f8f0', border: '#2ecc71', color: '#27ae60' },
  disputed: { bg: '#fde8e8', border: '#c0392b', color: '#c0392b' },
}

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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading bookings...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      {/* Respond modal (accept / decline / counter) */}
      {respondBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>
              {respondMode === 'accept' && 'Accept Request'}
              {respondMode === 'decline' && 'Decline Request'}
              {respondMode === 'counter' && 'Send Counter-Offer'}
            </h3>
            <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 24px' }}>{respondBooking.job_title}</p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['accept', 'counter', 'decline'].map(m => (
                <button key={m} onClick={() => setRespondMode(m)}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1.5px solid ${respondMode === m ? '#1A1A1A' : '#EEE6DA'}`, background: respondMode === m ? '#1A1A1A' : '#FFFFFF', color: respondMode === m ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize' }}>
                  {m === 'counter' ? 'Counter' : m}
                </button>
              ))}
            </div>

            {respondMode === 'accept' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Your price (₦)</label>
                <input type="number" value={respondPrice} onChange={e => setRespondPrice(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}

            {respondMode === 'decline' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Reason (optional)</label>
                <textarea value={respondReason} onChange={e => setRespondReason(e.target.value)} rows={3}
                  placeholder="Let them know why..."
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            )}

            {respondMode === 'counter' && (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Your price (₦)</label>
                  <input type="number" value={counterPrice} onChange={e => setCounterPrice(e.target.value)}
                    style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Proposed date</label>
                  <input type="date" value={counterDate} onChange={e => setCounterDate(e.target.value)}
                    style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Note (optional)</label>
                  <textarea value={counterNote} onChange={e => setCounterNote(e.target.value)} rows={2}
                    style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              </>
            )}

            {message && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{message}</p>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={closeRespond} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitRespond} disabled={submittingRespond}
                style={{ flex: 2, background: respondMode === 'decline' ? '#c0392b' : '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                {submittingRespond ? 'Sending...' : respondMode === 'accept' ? 'Accept' : respondMode === 'decline' ? 'Decline' : 'Send Counter-Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute modal */}
      {disputeBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Raise a Dispute</h3>
            <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 24px' }}>{disputeBooking.job_title}</p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Describe the issue</label>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={4}
                placeholder="What went wrong? Be as specific as possible..."
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div style={{ background: '#FFF8F0', border: '1px solid #8B5E3C', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#8B5E3C', lineHeight: '1.6' }}>
                ⚠️ Raising a dispute will freeze the payment until our team reviews the issue. We aim to resolve disputes within 24-48 hours.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setDisputeBooking(null); setDisputeReason('') }} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRaiseDispute} disabled={submittingDispute} style={{ flex: 2, background: '#c0392b', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Bookings</h1>
          <p style={{ color: '#666666', fontSize: '15px', margin: 0 }}>Track job requests, quotes, and payments</p>
        </div>

        {activeTab === 'providing' && !profile?.bank_account_name && (
          <div style={{ background: '#FFF8F0', border: '1.5px solid #8B5E3C', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: '700', color: '#1A1A1A', margin: '0 0 4px', fontSize: '15px' }}>⚠️ Add your bank details</p>
              <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>You need to add your bank account to receive payments when jobs are confirmed.</p>
            </div>
            <Link href="/dashboard/bank-details" style={{ background: '#8B5E3C', color: '#FFFFFF', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>Add Now</Link>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'requesting', label: '📋 My Requests' },
            { key: 'providing', label: '🛠 Requests Received' },
          ].map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              style={{ padding: '10px 24px', borderRadius: '8px', border: `1.5px solid ${activeTab === tab.key ? '#1A1A1A' : '#EEE6DA'}`, background: activeTab === tab.key ? '#1A1A1A' : '#FFFFFF', color: activeTab === tab.key ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {message && <p style={{ color: message.includes('Error') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {bookings.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#999999', fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No bookings yet</p>
            <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 20px' }}>
              {activeTab === 'requesting' ? 'Visit an artisan, professional, or service provider\'s profile to request a quote' : 'Requests from clients will appear here'}
            </p>
            {activeTab === 'requesting' && (
              <Link href="/browse" style={{ background: '#1A1A1A', color: '#FFFFFF', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
                Browse Providers
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {bookings.map(booking => {
              const statusStyle = statusColors[booking.status] || statusColors.requested
              const currentStep = statusSteps.indexOf(booking.status)
              const showProgress = statusSteps.includes(booking.status)
              const isPaid = booking.payment_status === 'paid'
              const isReleased = booking.escrow_released

              return (
                <div key={booking.id} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px' }}>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 4px' }}>{booking.job_title}</h3>
                      {booking.location && <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 4px' }}>📍 {booking.location}{booking.preferred_date ? ` · ${new Date(booking.preferred_date).toLocaleDateString()}` : ''}</p>}
                      <p style={{ fontSize: '12px', color: '#999999', margin: 0 }}>Booking #{booking.id.substring(0, 8)} · {new Date(booking.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {(booking.quoted_price || booking.budget) && (
                        <p style={{ margin: '0 0 6px', fontWeight: '800', fontSize: '18px', color: '#1A1A1A' }}>₦{Number(booking.quoted_price || booking.budget).toLocaleString()}</p>
                      )}
                      <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>
                        {statusLabels[booking.status] || booking.status}
                      </span>
                    </div>
                  </div>

                  {/* Escrow status */}
                  {(isPaid || booking.status === 'completed') && (
                    <div style={{ background: isReleased ? '#e8f8f0' : '#EEF2FF', border: `1px solid ${isReleased ? '#2ecc71' : '#6366F1'}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: isReleased ? '#27ae60' : '#6366F1' }}>
                        {isReleased ? '✓ Payment released to provider' : '🔒 Payment held in escrow — waiting for job confirmation'}
                      </p>
                      {isPaid && !isReleased && booking.payout_amount && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666666' }}>
                          Provider will receive ₦{Number(booking.payout_amount).toLocaleString()} after confirmation ({Math.round((booking.commission_rate || 0.12) * 100)}% platform fee deducted)
                        </p>
                      )}
                      {isPaid && !isReleased && booking.auto_confirm_at && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666666' }}>
                          Auto-confirms on {new Date(booking.auto_confirm_at).toLocaleDateString()} if no dispute is raised
                        </p>
                      )}
                    </div>
                  )}

                  {/* Progress tracker */}
                  {showProgress && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {statusSteps.map((step, i) => (
                          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < statusSteps.length - 1 ? 1 : 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: i <= currentStep ? '#1A1A1A' : '#EEE6DA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {i <= currentStep
                                  ? <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: '800' }}>✓</span>
                                  : <span style={{ color: '#999999', fontSize: '10px', fontWeight: '700' }}>{i + 1}</span>
                                }
                              </div>
                              <p style={{ fontSize: '10px', color: i <= currentStep ? '#1A1A1A' : '#999999', fontWeight: i <= currentStep ? '700' : '400', margin: '4px 0 0', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{step.replace(/_/g, ' ')}</p>
                            </div>
                            {i < statusSteps.length - 1 && (
                              <div style={{ flex: 1, height: '2px', background: i < currentStep ? '#1A1A1A' : '#EEE6DA', margin: '0 4px', marginBottom: '16px' }}></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div style={{ background: '#F9F6F1', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                    {activeTab === 'requesting' ? (
                      <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                        <strong style={{ color: '#1A1A1A' }}>Provider:</strong> {booking.provider?.company_name || booking.provider?.full_name} · {booking.provider?.city}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
                        <strong style={{ color: '#1A1A1A' }}>Client:</strong> {booking.project_owner?.full_name} · {booking.project_owner?.city} · {booking.project_owner?.phone}
                      </p>
                    )}
                    {booking.job_description && <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666666' }}><strong style={{ color: '#1A1A1A' }}>Job:</strong> {booking.job_description}</p>}
                    {booking.budget && <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#666666' }}><strong style={{ color: '#1A1A1A' }}>Budget:</strong> ₦{Number(booking.budget).toLocaleString()}</p>}
                  </div>

                  {/* Counter-offer banner */}
                  {booking.status === 'countered' && (
                    <div style={{ background: '#FFF8F0', border: '1px solid #F59E0B', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '700', color: '#8B5E3C' }}>
                        {activeTab === 'requesting' ? 'Provider countered with:' : 'You countered with:'}
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#1A1A1A', fontWeight: '600' }}>
                        ₦{Number(booking.counter_price).toLocaleString()}{booking.counter_date ? ` · ${new Date(booking.counter_date).toLocaleDateString()}` : ''}
                      </p>
                      {booking.counter_note && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666666' }}>{booking.counter_note}</p>}
                    </div>
                  )}

                  {booking.status === 'declined' && booking.decline_reason && (
                    <div style={{ background: '#fde8e8', border: '1px solid #c0392b', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#c0392b' }}><strong>Reason:</strong> {booking.decline_reason}</p>
                    </div>
                  )}

                  {/* Requesting (owner) actions */}
                  {activeTab === 'requesting' && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {booking.status === 'requested' && (
                        <button onClick={() => handleCancelBooking(booking)} disabled={updating === booking.id}
                          style={{ background: '#FFFFFF', color: '#666666', border: '1.5px solid #EEE6DA', padding: '12px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                          {updating === booking.id ? 'Cancelling...' : 'Cancel Request'}
                        </button>
                      )}
                      {booking.status === 'countered' && (
                        <>
                          <button onClick={() => handleOwnerAcceptCounter(booking)} disabled={updating === booking.id}
                            style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                            Accept ₦{Number(booking.counter_price).toLocaleString()}
                          </button>
                          <button onClick={() => handleOwnerDeclineCounter(booking)} disabled={updating === booking.id}
                            style={{ background: '#fde8e8', color: '#c0392b', border: '1px solid #c0392b', padding: '12px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                            Decline
                          </button>
                        </>
                      )}
                      {booking.status === 'accepted' && (
                        <button onClick={() => handlePayForBooking(booking)} disabled={payingBooking === booking.id}
                          style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                          {payingBooking === booking.id ? 'Opening payment...' : `Pay ₦${Number(booking.quoted_price).toLocaleString()}`}
                        </button>
                      )}
                      {booking.status === 'completed_by_provider' && (
                        <>
                          <button onClick={() => handleConfirmCompletion(booking)} disabled={updating === booking.id}
                            style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                            {updating === booking.id ? 'Confirming...' : '✓ Confirm Job Was Completed'}
                          </button>
                          <button onClick={() => setDisputeBooking(booking)}
                            style={{ background: '#fde8e8', color: '#c0392b', border: '1px solid #c0392b', padding: '12px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                            Raise Dispute
                          </button>
                        </>
                      )}
                      {booking.status === 'completed' && (
                        <Link href={`/${booking.provider?.role === 'artisan' ? 'artisans' : booking.provider?.role === 'professional' ? 'professionals' : 'service-providers'}/${booking.provider_id}`}
                          style={{ background: '#8B5E3C', color: '#FFFFFF', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
                          Leave a Review
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Providing actions */}
                  {activeTab === 'providing' && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {booking.status === 'requested' && (
                        <>
                          <button onClick={() => openRespond(booking, 'accept')}
                            style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                            Accept
                          </button>
                          <button onClick={() => openRespond(booking, 'counter')}
                            style={{ background: '#F59E0B', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                            Counter-Offer
                          </button>
                          <button onClick={() => openRespond(booking, 'decline')}
                            style={{ background: '#fde8e8', color: '#c0392b', border: '1px solid #c0392b', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                            Decline
                          </button>
                        </>
                      )}
                      {booking.status === 'paid' && (
                        <button onClick={() => handleMarkJobDone(booking)} disabled={updating === booking.id}
                          style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          {updating === booking.id ? 'Updating...' : 'Mark Job as Done'}
                        </button>
                      )}
                      {!booking.provider?.bank_account_name && booking.payment_status === 'paid' && (
                        <Link href="/dashboard/bank-details" style={{ background: '#FFF8F0', color: '#8B5E3C', border: '1px solid #8B5E3C', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>
                          Add Bank Details to Receive Payment
                        </Link>
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
