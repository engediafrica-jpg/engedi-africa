'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ArtisanProfilePage({ params }) {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [messaging, setMessaging] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewBody, setReviewBody] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewMessage, setReviewMessage] = useState('')
  const [hoveredStar, setHoveredStar] = useState(0)
  const [completedBookings, setCompletedBookings] = useState([])
  const [selectedBookingId, setSelectedBookingId] = useState('')

  const [showBookingForm, setShowBookingForm] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobLocation, setJobLocation] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [budget, setBudget] = useState('')
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [bookingMessage, setBookingMessage] = useState('')

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setCurrentUser(me)
      const { data } = await supabase.from('profiles').select('*').eq('id', params.id).single()
      if (!data) { router.push('/browse'); return }
      setProfile(data)
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url, role)')
        .eq('reviewed_id', params.id)
        .order('created_at', { ascending: false })
      setReviews(reviewData || [])
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('id, job_title, created_at')
        .eq('project_owner_id', me.id)
        .eq('provider_id', params.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
      const unreviewed = (bookingData || []).filter(b => !(reviewData || []).some(r => r.booking_id === b.id))
      setCompletedBookings(unreviewed)
      if (unreviewed.length > 0) setSelectedBookingId(unreviewed[0].id)
      setLoading(false)
    }
    getData()
  }, [])

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const handleStartConversation = async () => {
    setMessaging(true)
    const { data: existing } = await supabase.from('conversations')
      .select('id')
      .or(`and(participant_one.eq.${currentUser.id},participant_two.eq.${profile.id}),and(participant_one.eq.${profile.id},participant_two.eq.${currentUser.id})`)
      .single()
    if (existing) { router.push('/messages'); return }
    await supabase.from('conversations').insert({ participant_one: currentUser.id, participant_two: profile.id })
    setMessaging(false)
    setMessageSent(true)
    setTimeout(() => router.push('/messages'), 1000)
  }

  const handleSubmitReview = async () => {
    if (rating === 0) { setReviewMessage('Please select a star rating'); return }
    if (!selectedBookingId) { setReviewMessage('Select which job this review is for'); return }
    setSubmittingReview(true)
    const { data: existing } = await supabase.from('reviews')
      .select('id')
      .eq('reviewer_id', currentUser.id)
      .eq('booking_id', selectedBookingId)
      .single()
    if (existing) { setReviewMessage('You have already reviewed this job'); setSubmittingReview(false); return }
    const { data, error } = await supabase.from('reviews').insert({
      reviewer_id: currentUser.id,
      reviewed_id: profile.id,
      booking_id: selectedBookingId,
      rating,
      body: reviewBody,
    }).select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url, role)').single()
    if (error) { setReviewMessage('Error submitting review'); setSubmittingReview(false); return }
    setReviews([data, ...reviews])
    const remaining = completedBookings.filter(b => b.id !== selectedBookingId)
    setCompletedBookings(remaining)
    setSelectedBookingId(remaining[0]?.id || '')
    setRating(0)
    setReviewBody('')
    setShowReviewForm(false)
    setReviewMessage('Review submitted!')
    setSubmittingReview(false)
  }

  const handleSubmitBooking = async () => {
    if (!jobTitle.trim()) { setBookingMessage('Enter a job title'); return }
    setSubmittingBooking(true)
    const { error } = await supabase.from('bookings').insert({
      project_owner_id: currentUser.id,
      provider_id: profile.id,
      job_title: jobTitle,
      job_description: jobDescription,
      location: jobLocation,
      preferred_date: preferredDate || null,
      budget: budget ? Number(budget) : null,
      status: 'requested',
    })
    if (error) { setBookingMessage('Error: ' + error.message); setSubmittingBooking(false); return }
    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'booking',
      title: 'New booking request',
      body: `${currentUser.full_name} wants a quote for "${jobTitle}"`,
      link: '/bookings',
      is_read: false,
    })
    setSubmittingBooking(false)
    setShowBookingForm(false)
    setJobTitle('')
    setJobDescription('')
    setJobLocation('')
    setPreferredDate('')
    setBudget('')
    setBookingMessage('Quote requested! Track its status in your Bookings tab.')
  }

  const StarDisplay = ({ value, size = 20 }) => (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= value ? '#F59E0B' : '#EEE6DA' }}>★</span>
      ))}
    </div>
  )

  const StarInput = () => (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
      {[1,2,3,4,5].map(s => (
        <span
          key={s}
          onClick={() => setRating(s)}
          onMouseEnter={() => setHoveredStar(s)}
          onMouseLeave={() => setHoveredStar(0)}
          style={{ fontSize: '32px', cursor: 'pointer', color: s <= (hoveredStar || rating) ? '#F59E0B' : '#EEE6DA' }}
        >★</span>
      ))}
    </div>
  )

  if (loading) return <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#666666' }}>Loading...</p></div>

  const canReview = completedBookings.length > 0

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/browse" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Browse</Link>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Profile card */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F5EFE6', border: '2px solid #8B5E3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#8B5E3C', fontSize: '28px', overflow: 'hidden', flexShrink: 0 }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1A1A1A', margin: 0 }}>{profile.full_name}</h1>
                {profile.is_verified && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>✓ EnGedi Verified</span>}
              </div>
              <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>Artisan</span>
              {(profile.city || profile.state) && <p style={{ color: '#666666', fontSize: '14px', margin: '10px 0 0' }}>📍 {[profile.city, profile.state].filter(Boolean).join(', ')}</p>}
              {profile.experience_years && <p style={{ color: '#666666', fontSize: '14px', margin: '4px 0 0' }}>⏱ {profile.experience_years} years experience</p>}
              {avgRating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  <StarDisplay value={Math.round(avgRating)} size={18} />
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>{avgRating}</span>
                  <span style={{ fontSize: '13px', color: '#999999' }}>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 12px' }}>About</h3>
            <p style={{ fontSize: '14px', color: '#666666', lineHeight: '1.7', margin: 0 }}>{profile.bio}</p>
          </div>
        )}

        {/* Details */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 16px' }}>Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {profile.company_name && <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: '#999999', minWidth: '120px' }}>Company</span><span style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '600' }}>{profile.company_name}</span></div>}
            {profile.state && <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: '#999999', minWidth: '120px' }}>State</span><span style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '600' }}>{profile.state}</span></div>}
            {profile.experience_years && <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: '#999999', minWidth: '120px' }}>Experience</span><span style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '600' }}>{profile.experience_years} years</span></div>}
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: '#999999', minWidth: '120px' }}>Verification</span><span style={{ fontSize: '13px', color: profile.is_verified ? '#27ae60' : '#999999', fontWeight: '600' }}>{profile.is_verified ? '✓ Verified' : 'Not yet verified'}</span></div>
          </div>
        </div>

        {/* Reviews */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 4px' }}>Reviews {reviews.length > 0 && `(${reviews.length})`}</h3>
              {avgRating && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><StarDisplay value={Math.round(avgRating)} size={16} /><span style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>{avgRating} out of 5</span></div>}
            </div>
            {currentUser?.id !== profile.id && canReview && (
              <button onClick={() => setShowReviewForm(!showReviewForm)} style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                + Write a Review
              </button>
            )}
          </div>

          {currentUser?.id !== profile.id && !canReview && (
            <p style={{ color: '#999999', fontSize: '12px', margin: '0 0 16px' }}>You can leave a review once you&apos;ve completed a booking with this artisan.</p>
          )}

          {/* Review form */}
          {showReviewForm && (
            <div style={{ background: '#F9F6F1', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              {completedBookings.length > 1 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Which job is this review for?</label>
                  <select value={selectedBookingId} onChange={e => setSelectedBookingId(e.target.value)}
                    style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                    {completedBookings.map(b => (
                      <option key={b.id} value={b.id}>{b.job_title} — {new Date(b.created_at).toLocaleDateString()}</option>
                    ))}
                  </select>
                </div>
              )}
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A', margin: '0 0 12px' }}>Your rating</p>
              <StarInput />
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Your review (optional)</label>
                <textarea
                  value={reviewBody}
                  onChange={e => setReviewBody(e.target.value)}
                  rows={3}
                  placeholder="Share your experience working with this person..."
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              {reviewMessage && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{reviewMessage}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowReviewForm(false)} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSubmitReview} disabled={submittingReview} style={{ flex: 2, background: '#8B5E3C', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          )}

          {reviewMessage && !showReviewForm && <p style={{ color: '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{reviewMessage}</p>}

          {reviews.length === 0
            ? <p style={{ color: '#999999', fontSize: '14px', margin: 0 }}>No reviews yet. Be the first to leave one.</p>
            : reviews.map(review => (
              <div key={review.id} style={{ borderTop: '1px solid #EEE6DA', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '14px', color: '#1A1A1A' }}>{review.reviewer?.full_name || 'Anonymous'}</p>
                    <StarDisplay value={review.rating} size={14} />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999999' }}>{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
                {review.body && <p style={{ fontSize: '14px', color: '#666666', margin: '8px 0 0', lineHeight: '1.6' }}>{review.body}</p>}
              </div>
            ))
          }
        </div>

        {/* Contact actions */}
        {currentUser?.id !== profile.id && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowBookingForm(true)} style={{ flex: 2, minWidth: '200px', background: '#8B5E3C', color: '#FFFFFF', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
              Request a Quote
            </button>
            <button onClick={handleStartConversation} disabled={messaging || messageSent} style={{ flex: 1, minWidth: '160px', background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
              {messageSent ? '✓ Redirecting...' : messaging ? 'Opening chat...' : `Message`}
            </button>
          </div>
        )}
        {bookingMessage && !showBookingForm && <p style={{ color: bookingMessage.includes('Error') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginTop: '12px', fontWeight: '600' }}>{bookingMessage}</p>}
      </div>

      {/* Booking request modal */}
      {showBookingForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Request a Quote</h3>
            <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 24px' }}>Tell {profile.full_name?.split(' ')[0]} about the job. They&apos;ll respond with a price.</p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Job title</label>
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Lay foundation blocks for 3-bedroom bungalow"
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Job description</label>
              <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} rows={3} placeholder="Describe the scope of work..."
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Location</label>
              <input value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="e.g. Lekki, Lagos"
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Preferred date</label>
                <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Budget (₦)</label>
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Optional"
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {bookingMessage && <p style={{ color: bookingMessage.includes('Error') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '12px' }}>{bookingMessage}</p>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowBookingForm(false); setBookingMessage('') }} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmitBooking} disabled={submittingBooking} style={{ flex: 2, background: '#8B5E3C', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                {submittingBooking ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}