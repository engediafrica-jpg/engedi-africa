'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import Input from '@/components/Input'

export default function ServiceProviderProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
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
      .select('id').eq('reviewer_id', currentUser.id).eq('booking_id', selectedBookingId).single()
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
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: size }} className={s <= value ? 'text-clay' : 'text-line-strong'}>★</span>
      ))}
    </div>
  )

  const StarInput = () => (
    <div className="mb-4 flex gap-1">
      {[1,2,3,4,5].map(s => (
        <span key={s} onClick={() => setRating(s)} onMouseEnter={() => setHoveredStar(s)} onMouseLeave={() => setHoveredStar(0)}
          className={`cursor-pointer text-[32px] ${s <= (hoveredStar || rating) ? 'text-clay' : 'text-line-strong'}`}>★</span>
      ))}
    </div>
  )

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-surface"><p className="text-text-muted">Loading...</p></div>

  const canReview = completedBookings.length > 0

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/browse" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Back to Browse</Link>} />

      <div className="mx-auto max-w-[720px] px-6 py-10">

        {/* Profile card */}
        <div className="ticks mb-6 border border-line bg-surface-raised p-8">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-clay bg-surface-sunk font-display text-[28px] font-bold text-clay">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" /> : (profile.company_name || profile.full_name)?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2.5">
                <h1 className="m-0 text-[22px] font-bold text-text">{profile.company_name || profile.full_name}</h1>
                {profile.is_verified && <Badge tone="success">EnGedi Verified</Badge>}
              </div>
              <Badge tone="pending">Service Provider</Badge>
              {(profile.city || profile.state) && <p className="mb-0 mt-2.5 text-[14px] text-text-muted">{[profile.city, profile.state].filter(Boolean).join(', ')}</p>}
              {profile.experience_years && <p className="m-0 mt-1 text-[14px] text-text-muted">{profile.experience_years} years experience</p>}
              {avgRating && (
                <div className="mt-2.5 flex items-center gap-2">
                  <StarDisplay value={Math.round(avgRating)} size={18} />
                  <span className="text-[14px] font-bold text-text">{avgRating}</span>
                  <span className="text-[13px] text-text-muted">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-6 border border-line bg-surface-raised p-6">
            <h3 className="m-0 mb-3 text-[16px] font-bold text-text">About</h3>
            <p className="m-0 text-[14px] leading-relaxed text-text-muted">{profile.bio}</p>
          </div>
        )}

        {/* Details */}
        <div className="mb-6 border border-line bg-surface-raised p-6">
          <h3 className="m-0 mb-4 text-[16px] font-bold text-text">Details</h3>
          <div className="flex flex-col gap-3">
            {profile.company_name && <div className="flex gap-3"><span className="min-w-[140px] text-[13px] text-text-muted">Company</span><span className="text-[13px] font-semibold text-text">{profile.company_name}</span></div>}
            {profile.cac_number && <div className="flex gap-3"><span className="min-w-[140px] text-[13px] text-text-muted">CAC Number</span><span className="text-[13px] font-semibold text-text">{profile.cac_number}</span></div>}
            {profile.state && <div className="flex gap-3"><span className="min-w-[140px] text-[13px] text-text-muted">State</span><span className="text-[13px] font-semibold text-text">{profile.state}</span></div>}
            {profile.experience_years && <div className="flex gap-3"><span className="min-w-[140px] text-[13px] text-text-muted">Experience</span><span className="text-[13px] font-semibold text-text">{profile.experience_years} years</span></div>}
            <div className="flex gap-3"><span className="min-w-[140px] text-[13px] text-text-muted">Verification</span><span className={`text-[13px] font-semibold ${profile.is_verified ? 'text-oasis' : 'text-text-muted'}`}>{profile.is_verified ? 'Verified' : 'Not yet verified'}</span></div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-6 border border-line bg-surface-raised p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="m-0 mb-1 text-[16px] font-bold text-text">Reviews {reviews.length > 0 && `(${reviews.length})`}</h3>
              {avgRating && <div className="flex items-center gap-2"><StarDisplay value={Math.round(avgRating)} size={16} /><span className="text-[14px] font-bold text-text">{avgRating} out of 5</span></div>}
            </div>
            {currentUser?.id !== profile.id && canReview && (
              <Button className="text-[13px]" onClick={() => setShowReviewForm(!showReviewForm)}>+ Write a Review</Button>
            )}
          </div>

          {currentUser?.id !== profile.id && !canReview && (
            <p className="mb-4 text-[12px] text-text-muted">You can leave a review once you&apos;ve completed a booking with this provider.</p>
          )}

          {showReviewForm && (
            <div className="mb-5 border border-line bg-surface-sunk p-5">
              {completedBookings.length > 1 && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-[13px] font-semibold text-text">Which job is this review for?</label>
                  <select value={selectedBookingId} onChange={e => setSelectedBookingId(e.target.value)}
                    className="w-full border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay">
                    {completedBookings.map(b => (
                      <option key={b.id} value={b.id}>{b.job_title} — {new Date(b.created_at).toLocaleDateString()}</option>
                    ))}
                  </select>
                </div>
              )}
              <p className="m-0 mb-3 text-[14px] font-semibold text-text">Your rating</p>
              <StarInput />
              <div className="mb-4">
                <label className="mb-1.5 block text-[13px] font-semibold text-text">Your review (optional)</label>
                <textarea value={reviewBody} onChange={e => setReviewBody(e.target.value)} rows={3} placeholder="Share your experience with this service provider..."
                  className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
              </div>
              {reviewMessage && <p className="mb-3 text-[13px] text-danger">{reviewMessage}</p>}
              <div className="flex gap-2.5">
                <Button variant="outline" className="flex-1 justify-center text-[13px]" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                <Button className="flex-[2] justify-center text-[13px]" disabled={submittingReview} onClick={handleSubmitReview}>
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          )}

          {reviewMessage && !showReviewForm && <p className="mb-4 text-[13px] font-semibold text-oasis">{reviewMessage}</p>}

          {reviews.length === 0
            ? <p className="m-0 text-[14px] text-text-muted">No reviews yet. Be the first to leave one.</p>
            : reviews.map(review => (
              <div key={review.id} className="mt-4 border-t border-line pt-4">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="m-0 mb-1 text-[14px] font-bold text-text">{review.reviewer?.full_name || 'Anonymous'}</p>
                    <StarDisplay value={review.rating} size={14} />
                  </div>
                  <p className="m-0 text-[12px] text-text-muted">{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
                {review.body && <p className="mt-2 text-[14px] leading-relaxed text-text-muted">{review.body}</p>}
              </div>
            ))
          }
        </div>

        {currentUser?.id !== profile.id && (
          <div className="flex flex-wrap gap-2.5">
            <Button className="min-w-[200px] flex-[2] justify-center" onClick={() => setShowBookingForm(true)}>Request a Quote</Button>
            <Button variant="outline" className="min-w-[160px] flex-1 justify-center" disabled={messaging || messageSent} onClick={handleStartConversation}>
              {messageSent ? '✓ Redirecting...' : messaging ? 'Opening chat...' : `Contact`}
            </Button>
          </div>
        )}
        {bookingMessage && !showBookingForm && <p className={`mt-3 text-[13px] font-semibold ${bookingMessage.includes('Error') ? 'text-danger' : 'text-oasis'}`}>{bookingMessage}</p>}
      </div>

      {/* Booking request modal */}
      {showBookingForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-6">
          <div className="ticks max-h-[90vh] w-full max-w-[480px] overflow-y-auto border border-line bg-surface-raised p-8">
            <h3 className="m-0 mb-2 text-[18px] font-bold text-text">Request a Quote</h3>
            <p className="m-0 mb-6 text-[14px] text-text-muted">Tell {profile.company_name || profile.full_name?.split(' ')[0]} about the job. They&apos;ll respond with a price.</p>

            <div className="mb-3.5">
              <Input label="Job title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Weekly office cleaning for construction site" />
            </div>
            <div className="mb-3.5">
              <label className="mb-1.5 block text-[13px] font-semibold text-text">Job description</label>
              <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} rows={3} placeholder="Describe the scope of work..."
                className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
            </div>
            <div className="mb-3.5">
              <Input label="Location" value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="e.g. Lekki, Lagos" />
            </div>
            <div className="mb-3.5 flex gap-3">
              <div className="flex-1">
                <Input label="Preferred date" type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <Input label="Budget (₦)" type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            {bookingMessage && <p className={`mb-3 text-[13px] ${bookingMessage.includes('Error') ? 'text-danger' : 'text-oasis'}`}>{bookingMessage}</p>}

            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => { setShowBookingForm(false); setBookingMessage('') }}>Cancel</Button>
              <Button className="flex-[2] justify-center" disabled={submittingBooking} onClick={handleSubmitBooking}>
                {submittingBooking ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
