'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const C = {
  surface: '#15120e', raised: '#201a14', sunk: '#0f0c09',
  text: '#f1eae0', muted: '#a79a85', line: '#362d22',
  clay: '#e08554', oasis: '#86a98b', danger: '#e2695f', dangerSoft: '#2e1712',
}

const statusColors = {
  pending: { bg: '#1a1200', border: '#e0855444', color: '#e08554' },
  quoted: { bg: '#0a1a2e', border: '#86a98b44', color: '#86a98b' },
  paid: { bg: '#0a1a2e', border: '#86a98b44', color: '#86a98b' },
  in_progress: { bg: '#0a1200', border: '#F59E0B44', color: '#F59E0B' },
  completed: { bg: '#0a1a0f', border: '#86a98b44', color: '#86a98b' },
  delivered: { bg: '#0a1a0f', border: '#86a98b44', color: '#86a98b' },
  cancelled: { bg: '#2e1712', border: '#e2695f44', color: '#e2695f' },
  disputed: { bg: '#2e1712', border: '#e2695f44', color: '#e2695f' },
  declined: { bg: '#2e1712', border: '#e2695f44', color: '#e2695f' },
}

const timeframeLabels = {
  asap: 'As soon as possible',
  this_week: 'This week',
  next_week: 'Next week',
  this_month: 'This month',
  next_month: 'Next month',
  flexible: 'Flexible',
}

export default function BookingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('client')
  const [updating, setUpdating] = useState(null)
  const [message, setMessage] = useState('')
  const [quoteInput, setQuoteInput] = useState({})
  const [disputeBooking, setDisputeBooking] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [submittingDispute, setSubmittingDispute] = useState(false)

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  const clientRoles = ['project_owner', 'supplier', 'equipment_provider']
  const providerRoles = ['artisan', 'professional', 'service_provider']

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(profileData)

      // Determine initial tab based on role
      const initialTab = providerRoles.includes(profileData.role) ? 'provider' : 'client'
      setActiveTab(initialTab)
      await loadBookings(sessionData.session.user.id, initialTab)
      setLoading(false)
    }
    getData()

    const existing = document.getElementById('paystack-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'paystack-script'
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  const loadBookings = async (uid, tab) => {
    setLoading(true)
    const field = tab === 'client' ? 'client_id' : 'provider_id'
    const { data, error } = await supabase
      .from('bookings')
      .select('*, client:profiles!bookings_client_id_fkey(id, full_name, phone, city, avatar_url), provider:profiles!bookings_provider_id_fkey(id, full_name, role, city, avatar_url, bank_account_name, paystack_recipient_code)')
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

  const handleQuote = async (bookingId) => {
    const price = quoteInput[bookingId]
    if (!price || isNaN(price) || Number(price) < 1) { setMessage('Enter a valid price'); return }
    setUpdating(bookingId)
    const commission = Number(price) * 0.12
    const payout = Number(price) - commission
    const { error } = await supabase.from('bookings').update({
      quoted_price: Number(price), status: 'quoted',
      commission_rate: 0.12, commission_amount: commission, payout_amount: payout,
      updated_at: new Date().toISOString(),
    }).eq('id', bookingId)
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, quoted_price: Number(price), status: 'quoted', commission_amount: commission, payout_amount: payout } : b))
      const booking = bookings.find(b => b.id === bookingId)
      await supabase.from('notifications').insert({
        user_id: booking.client_id, type: 'booking',
        title: 'You received a quote!',
        body: `${profile.full_name} quoted ₦${Number(price).toLocaleString()} for your job.`,
        link: '/bookings', is_read: false,
      })
      setMessage('Quote sent!')
    }
    setUpdating(null)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDecline = async (bookingId) => {
    setUpdating(bookingId)
    const { error } = await supabase.from('bookings').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', bookingId)
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'declined' } : b))
      const booking = bookings.find(b => b.id === bookingId)
      await supabase.from('notifications').insert({
        user_id: booking.client_id, type: 'booking',
        title: 'Booking request declined',
        body: `${profile.full_name} has declined your job request.`,
        link: '/bookings', is_read: false,
      })
    }
    setUpdating(null)
  }

  const handlePayForBooking = (booking) => {
    if (!window.PaystackPop) { setMessage('Payment loading. Please wait.'); return }
    setUpdating(booking.id)
    const profileEmail = profile.email
    const bookingId = booking.id
    const payAmount = booking.quoted_price
    const supabaseClient = supabase
    const providerId = booking.provider_id

    function onSuccess(response) {
      supabaseClient.from('bookings').update({
        payment_status: 'paid', payment_reference: response.reference,
        status: 'paid', auto_confirm_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', bookingId).then(() => {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, payment_status: 'paid', status: 'paid' } : b))
        supabaseClient.from('notifications').insert({
          user_id: providerId, type: 'booking',
          title: 'Payment received!',
          body: `Payment of ₦${Number(payAmount).toLocaleString()} is held in escrow.`,
          link: '/bookings', is_read: false,
        })
        setMessage('✓ Payment successful! Funds held until job is complete.')
        setUpdating(null)
      })
    }

    function onClose() { setUpdating(null); setMessage('') }

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: profileEmail,
      amount: Math.round(payAmount * 100),
      currency: 'NGN',
      channels: ['card', 'bank', 'ussd', 'bank_transfer', 'opay', 'mobile_money'],
      ref: new Date().getTime().toString() + '-booking-' + bookingId.substring(0, 8),
      callback: onSuccess,
      onClose: onClose,
    })
    handler.openIframe()
  }

  const handleMarkComplete = async (bookingId) => {
    setUpdating(bookingId)
    const { error } = await supabase.from('bookings').update({
      status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', bookingId)
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b))
      const booking = bookings.find(b => b.id === bookingId)
      await supabase.from('notifications').insert({
        user_id: booking.client_id, type: 'booking',
        title: 'Job marked as complete!',
        body: `${profile.full_name} has marked your job as complete. Please confirm to release payment.`,
        link: '/bookings', is_read: false,
      })
      setMessage('Job marked complete. Waiting for client confirmation.')
    }
    setUpdating(null)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleConfirmComplete = async (booking) => {
    setUpdating(booking.id)
    const { error } = await supabase.from('bookings').update({
      status: 'delivered', payment_status: 'released', escrow_released: true,
      confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', booking.id)
    if (!error) {
      if (booking.provider?.paystack_recipient_code && booking.payout_amount) {
        await fetch('/api/paystack/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: booking.payout_amount,
            recipient_code: booking.provider.paystack_recipient_code,
            reason: `EnGedi payout for booking ${booking.id.substring(0, 8)}`,
            reference: Date.now().toString() + '-payout-' + booking.id.substring(0, 8),
          }),
        })
      }
      setBookings(bookings.map(b => b.id === booking.id ? { ...b, status: 'delivered', payment_status: 'released', escrow_released: true } : b))
      await supabase.from('notifications').insert({
        user_id: booking.provider_id, type: 'payment',
        title: 'Payment released! 🎉',
        body: `₦${Number(booking.payout_amount).toLocaleString()} sent to your bank account.`,
        link: '/bookings', is_read: false,
      })
      setMessage('✓ Job confirmed! Payment released.')
    }
    setUpdating(null)
    setTimeout(() => setMessage(''), 5000)
  }

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim()) { setMessage('Please describe the issue'); return }
    setSubmittingDispute(true)
    await supabase.from('disputes').insert({ order_id: disputeBooking.id, raised_by: profile.id, reason: disputeReason, status: 'open' })
    await supabase.from('bookings').update({ dispute_raised: true, status: 'disputed' }).eq('id', disputeBooking.id)
    setBookings(bookings.map(b => b.id === disputeBooking.id ? { ...b, dispute_raised: true, status: 'disputed' } : b))
    await supabase.from('notifications').insert({
      user_id: disputeBooking.provider_id, type: 'dispute',
      title: 'A dispute has been raised',
      body: `${profile.full_name} raised a dispute on booking #${disputeBooking.id.substring(0, 8)}`,
      link: '/bookings', is_read: false,
    })
    setDisputeBooking(null); setDisputeReason('')
    setMessage('Dispute raised. Our team will review within 24 hours.')
    setSubmittingDispute(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted }}>Loading bookings...</p>
    </div>
  )

  const isProviderRole = providerRoles.includes(profile?.role)
  const isClientRole = clientRoles.includes(profile?.role)

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: C.muted, textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      {/* Dispute modal */}
      {disputeBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000000cc', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: C.raised, border: `1px solid ${C.danger}44`, borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>Raise a Dispute</h3>
            <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 20px' }}>Booking #{disputeBooking.id.substring(0, 8)} · {disputeBooking.title}</p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Describe the issue</label>
              <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={4} placeholder="What went wrong? Be specific..."
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ background: C.dangerSoft, border: `1px solid ${C.danger}44`, borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: C.danger, lineHeight: '1.6' }}>⚠️ This will freeze the payment until our team reviews the issue.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setDisputeBooking(null); setDisputeReason('') }} style={{ flex: 1, background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRaiseDispute} disabled={submittingDispute} style={{ flex: 2, background: C.danger, color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>Bookings</h1>
        <p style={{ color: C.muted, fontSize: '14px', margin: '0 0 28px' }}>
          {isProviderRole ? 'Manage your job requests and send quotes' : 'Manage your bookings and track job progress'}
        </p>

        {/* Tabs — only show both if they could be both client and provider */}
        {!isProviderRole || isClientRole ? (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {isClientRole && (
              <button onClick={() => handleTabChange('client')}
                style={{ padding: '9px 18px', borderRadius: '6px', border: `1px solid ${activeTab === 'client' ? C.clay : C.line}`, background: activeTab === 'client' ? C.clay : 'transparent', color: activeTab === 'client' ? C.sunk : C.muted, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                My Requests
              </button>
            )}
            {isProviderRole && (
              <button onClick={() => handleTabChange('provider')}
                style={{ padding: '9px 18px', borderRadius: '6px', border: `1px solid ${activeTab === 'provider' ? C.clay : C.line}`, background: activeTab === 'provider' ? C.clay : 'transparent', color: activeTab === 'provider' ? C.sunk : C.muted, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                Jobs Received
              </button>
            )}
          </div>
        ) : null}

        {message && <p style={{ color: message.includes('✓') ? C.oasis : C.danger, fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {bookings.length === 0 ? (
          <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No bookings yet</p>
            <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 20px' }}>
              {activeTab === 'client' ? 'Browse professionals to request a quote' : 'Job requests from clients will appear here'}
            </p>
            {activeTab === 'client' && (
              <Link href="/browse" style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
                Browse Professionals
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {bookings.map(booking => {
              const statusStyle = statusColors[booking.status] || statusColors.pending
              const isPaid = booking.payment_status === 'paid'
              const isReleased = booking.escrow_released
              const otherPerson = activeTab === 'client' ? booking.provider : booking.client

              return (
                <div key={booking.id} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '22px' }}>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: C.text, margin: '0 0 6px' }}>{booking.title}</h3>
                      <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 4px' }}>
                        {activeTab === 'client' ? `Provider: ${otherPerson?.full_name}` : `Client: ${otherPerson?.full_name}`}
                        {otherPerson?.city && ` · ${otherPerson.city}`}
                      </p>
                      <p style={{ fontSize: '12px', color: C.muted, margin: 0 }}>#{booking.id.substring(0, 8)} · {new Date(booking.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {booking.quoted_price
                        ? <p style={{ margin: '0 0 6px', fontWeight: '800', fontSize: '17px', color: C.clay }}>₦{Number(booking.quoted_price).toLocaleString()}</p>
                        : booking.budget ? <p style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '14px', color: C.muted }}>Budget: ₦{Number(booking.budget).toLocaleString()}</p>
                        : null
                      }
                      <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {booking.description && (
                    <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 12px', lineHeight: '1.6', background: C.sunk, padding: '10px 12px', borderRadius: '8px' }}>
                      {booking.description}
                    </p>
                  )}

                  {/* Details */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    {booking.location && <span style={{ fontSize: '12px', color: C.muted }}>📍 {booking.location}</span>}
                    {booking.scheduled_date && <span style={{ fontSize: '12px', color: C.muted }}>📅 {timeframeLabels[booking.scheduled_date] || booking.scheduled_date}</span>}
                  </div>

                  {/* Escrow status */}
                  {(isPaid || isReleased) && (
                    <div style={{ background: isReleased ? '#0a1a0f' : '#0a1a2e', border: `1px solid ${isReleased ? C.oasis + '44' : '#86a98b44'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: isReleased ? C.oasis : '#86a98b' }}>
                        {isReleased ? '✓ Payment released to provider' : '🔒 Payment held in escrow — waiting for job confirmation'}
                      </p>
                      {isPaid && !isReleased && booking.payout_amount && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.muted }}>
                          Provider receives ₦{Number(booking.payout_amount).toLocaleString()} after confirmation (12% fee deducted)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Provider actions */}
                  {activeTab === 'provider' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {booking.status === 'pending' && (
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Send your quote</p>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <input type="number" placeholder="Enter your price in ₦" value={quoteInput[booking.id] || ''} onChange={e => setQuoteInput({ ...quoteInput, [booking.id]: e.target.value })}
                              style={{ flex: 1, minWidth: '160px', padding: '10px 12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', color: C.text }} />
                            <button onClick={() => handleQuote(booking.id)} disabled={updating === booking.id}
                              style={{ background: C.clay, color: C.sunk, border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                              {updating === booking.id ? 'Sending...' : 'Send Quote'}
                            </button>
                            <button onClick={() => handleDecline(booking.id)} disabled={updating === booking.id}
                              style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}44`, padding: '10px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                              Decline
                            </button>
                          </div>
                        </div>
                      )}
                      {booking.status === 'paid' && (
                        <button onClick={() => handleMarkComplete(booking.id)} disabled={updating === booking.id}
                          style={{ background: C.oasis, color: C.sunk, border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-start' }}>
                          {updating === booking.id ? 'Updating...' : '✓ Mark Job as Complete'}
                        </button>
                      )}
                      {!booking.provider?.bank_account_name && isPaid && (
                        <Link href="/dashboard/bank-details" style={{ background: C.sunk, color: C.clay, border: `1px solid ${C.clay}44`, padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none', display: 'inline-block' }}>
                          Add Bank Details to Receive Payment
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Client actions */}
                  {activeTab === 'client' && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {booking.status === 'quoted' && !isPaid && (
                        <button onClick={() => handlePayForBooking(booking)} disabled={updating === booking.id}
                          style={{ background: C.clay, color: C.sunk, border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                          {updating === booking.id ? 'Opening payment...' : `Accept & Pay ₦${Number(booking.quoted_price).toLocaleString()}`}
                        </button>
                      )}
                      {booking.status === 'completed' && !isReleased && !booking.dispute_raised && (
                        <>
                          <button onClick={() => handleConfirmComplete(booking)} disabled={updating === booking.id}
                            style={{ background: C.oasis, color: C.sunk, border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                            {updating === booking.id ? 'Confirming...' : '✓ Confirm Job Complete & Release Payment'}
                          </button>
                          <button onClick={() => setDisputeBooking(booking)}
                            style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}44`, padding: '12px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                            Raise Dispute
                          </button>
                        </>
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