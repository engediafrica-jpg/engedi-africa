'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const C = {
  surface: '#15120e', raised: '#201a14', sunk: '#0f0c09',
  text: '#f1eae0', muted: '#a79a85', line: '#362d22',
  clay: '#e08554', oasis: '#86a98b', danger: '#e2695f', dangerSoft: '#2e1712',
}

function RequestQuoteButton({ profile, currentUser, supabase, router }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', location: '', budget: '', scheduled_date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  const handleSubmit = async () => {
    if (!form.title || !form.description) { setError('Please fill in job title and description'); return }
    setSubmitting(true)
    setError('')
    const { error: insertError } = await supabase.from('bookings').insert({
      client_id: currentUser.id,
      provider_id: profile.id,
      title: form.title,
      description: form.description,
      location: form.location || null,
      budget: form.budget ? Number(form.budget) : null,
      scheduled_date: form.scheduled_date || null,
      status: 'pending',
      payment_status: 'unpaid',
    })
    if (insertError) { setError('Error: ' + insertError.message); setSubmitting(false); return }
    await supabase.from('notifications').insert({
      user_id: profile.id, type: 'booking',
      title: 'New job request!',
      body: `${currentUser.full_name} wants to hire you for: ${form.title}`,
      link: '/bookings', is_read: false,
    })
    setDone(true); setShowForm(false); setSubmitting(false)
  }

  if (done) return (
    <div style={{ background: '#1a2e1d', border: `1px solid ${C.oasis}44`, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 6px', fontWeight: '700', color: C.oasis, fontSize: '14px' }}>✓ Quote request sent!</p>
      <button onClick={() => router.push('/bookings')} style={{ background: 'none', border: 'none', color: C.clay, fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>View your bookings →</button>
    </div>
  )

  if (showForm) return (
    <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '24px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '700', color: C.text, margin: '0 0 20px' }}>Request a Quote from {profile.full_name?.split(' ')[0]}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job Title *</label>
          <input type="text" placeholder="e.g. Architectural drawings for 4-bedroom duplex" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description *</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the project in detail..." style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</label>
          <input type="text" placeholder="Where is the project?" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Budget (₦)</label>
            <input type="number" placeholder="Your budget" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preferred Timeframe</label>
            <select value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} style={{ ...inputStyle, appearance: 'none' }}>
              <option value="" style={{ background: C.sunk }}>Select timeframe</option>
              <option value="asap" style={{ background: C.sunk }}>As soon as possible</option>
              <option value="this_week" style={{ background: C.sunk }}>This week</option>
              <option value="next_week" style={{ background: C.sunk }}>Next week</option>
              <option value="this_month" style={{ background: C.sunk }}>This month</option>
              <option value="next_month" style={{ background: C.sunk }}>Next month</option>
              <option value="flexible" style={{ background: C.sunk }}>I am flexible</option>
            </select>
          </div>
        </div>
        {error && <p style={{ color: C.danger, fontSize: '13px', margin: 0, fontWeight: '600' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setShowForm(false); setError('') }} style={{ flex: 1, background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !form.title || !form.description}
            style={{ flex: 2, background: submitting || !form.title || !form.description ? C.line : C.clay, color: submitting || !form.title || !form.description ? C.muted : C.sunk, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            {submitting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <button onClick={() => setShowForm(true)} style={{ width: '100%', background: C.clay, color: C.sunk, border: 'none', padding: '16px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
      Request a Quote
    </button>
  )
}

export default function ProfessionalProfilePage({ params }) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [messaging, setMessaging] = useState(false)
  const [messageSent, setMessageSent] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewBody, setReviewBody] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewMessage, setReviewMessage] = useState('')
  const [hoveredStar, setHoveredStar] = useState(0)

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }

      const { data: me, error: meError } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      if (meError) console.error('Error loading current user profile:', meError)
      setCurrentUser(me)

      console.log('Looking up professional with id:', id)
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()

      if (error) {
        console.error('Error loading professional profile:', error)
        setLoadError(`${error.message} (code: ${error.code || 'none'})`)
        setLoading(false)
        return
      }
      if (!data) {
        console.error('No profile row returned for id:', id)
        setLoadError('No profile found for this id.')
        setLoading(false)
        return
      }

      setProfile(data)
      const { data: reviewData, error: reviewError } = await supabase.from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url, role)')
        .eq('reviewed_id', id).order('created_at', { ascending: false })
      if (reviewError) console.error('Error loading reviews:', reviewError)
      setReviews(reviewData || [])
      setLoading(false)
    }
    getData()
  }, [id])

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null
  const alreadyReviewed = reviews.some(r => r.reviewer_id === currentUser?.id)

  const handleStartConversation = async () => {
    setMessaging(true)
    const { data: existing } = await supabase.from('conversations').select('id')
      .or(`and(participant_one.eq.${currentUser.id},participant_two.eq.${profile.id}),and(participant_one.eq.${profile.id},participant_two.eq.${currentUser.id})`).single()
    if (existing) { router.push('/messages'); return }
    await supabase.from('conversations').insert({ participant_one: currentUser.id, participant_two: profile.id })
    setMessaging(false); setMessageSent(true)
    setTimeout(() => router.push('/messages'), 1000)
  }

  const handleSubmitReview = async () => {
    if (rating === 0) { setReviewMessage('Please select a rating'); return }
    setSubmittingReview(true)
    const { data: existing } = await supabase.from('reviews').select('id').eq('reviewer_id', currentUser.id).eq('reviewed_id', profile.id).single()
    if (existing) { setReviewMessage('Already reviewed'); setSubmittingReview(false); return }
    const { data, error } = await supabase.from('reviews').insert({
      reviewer_id: currentUser.id, reviewed_id: profile.id, rating, body: reviewBody,
    }).select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url, role)').single()
    if (error) { setReviewMessage('Error'); setSubmittingReview(false); return }
    setReviews([data, ...reviews]); setRating(0); setReviewBody(''); setShowReviewForm(false); setReviewMessage('Review submitted!'); setSubmittingReview(false)
  }

  const StarDisplay = ({ value, size = 18 }) => (
    <div style={{ display: 'flex', gap: '2px' }}>{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: size, color: s <= value ? '#F59E0B' : C.line }}>★</span>)}</div>
  )
  const StarInput = () => (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
      {[1,2,3,4,5].map(s => <span key={s} onClick={() => setRating(s)} onMouseEnter={() => setHoveredStar(s)} onMouseLeave={() => setHoveredStar(0)} style={{ fontSize: '32px', cursor: 'pointer', color: s <= (hoveredStar || rating) ? '#F59E0B' : C.line }}>★</span>)}
    </div>
  )

  if (loading) return <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: C.muted }}>Loading...</p></div>

  if (loadError) return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: C.raised, border: `1px solid ${C.danger}44`, borderRadius: '12px', padding: '28px', maxWidth: '480px', textAlign: 'center' }}>
        <p style={{ color: C.danger, fontWeight: '700', margin: '0 0 8px' }}>Could not load this profile</p>
        <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 16px' }}>{loadError}</p>
        <Link href="/browse" style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>← Back to Browse</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
        <Link href="/browse" style={{ color: C.muted, textDecoration: 'none', fontSize: '13px' }}>← Browse</Link>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: C.sunk, border: `2px solid ${C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: C.clay, fontSize: '26px', overflow: 'hidden', flexShrink: 0 }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: 0 }}>{profile.full_name}</h1>
                {profile.is_verified && <span style={{ background: '#1a2e1d', border: `1px solid ${C.oasis}44`, color: C.oasis, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>VERIFIED</span>}
              </div>
              <span style={{ background: C.sunk, border: `1px solid ${C.clay}44`, color: C.clay, fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>Professional</span>
              {(profile.city || profile.state) && <p style={{ color: C.muted, fontSize: '13px', margin: '8px 0 0' }}>📍 {[profile.city, profile.state].filter(Boolean).join(', ')}</p>}
              {profile.experience_years && <p style={{ color: C.muted, fontSize: '13px', margin: '4px 0 0' }}>⏱ {profile.experience_years} years experience</p>}
              {profile.professional_body && <p style={{ color: C.muted, fontSize: '13px', margin: '4px 0 0' }}>🏛 {profile.professional_body}</p>}
              {avgRating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <StarDisplay value={Math.round(avgRating)} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{avgRating}</span>
                  <span style={{ fontSize: '12px', color: C.muted }}>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {profile.bio && (
          <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: C.muted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>About</h3>
            <p style={{ fontSize: '14px', color: C.text, lineHeight: '1.7', margin: 0 }}>{profile.bio}</p>
          </div>
        )}

        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: C.muted, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credentials</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile.professional_body && <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: C.muted, minWidth: '140px' }}>Professional Body</span><span style={{ fontSize: '13px', color: C.text, fontWeight: '600' }}>{profile.professional_body}</span></div>}
            {profile.professional_license_number && <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: C.muted, minWidth: '140px' }}>License Number</span><span style={{ fontSize: '13px', color: C.text, fontWeight: '600' }}>{profile.professional_license_number}</span></div>}
            {profile.experience_years && <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: C.muted, minWidth: '140px' }}>Experience</span><span style={{ fontSize: '13px', color: C.text, fontWeight: '600' }}>{profile.experience_years} years</span></div>}
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ fontSize: '13px', color: C.muted, minWidth: '140px' }}>Verification</span><span style={{ fontSize: '13px', color: profile.is_verified ? C.oasis : C.muted, fontWeight: '600' }}>{profile.is_verified ? '✓ Verified' : 'Not verified'}</span></div>
          </div>
        </div>

        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: C.muted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reviews {reviews.length > 0 && `(${reviews.length})`}</h3>
              {avgRating && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><StarDisplay value={Math.round(avgRating)} size={14} /><span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{avgRating} out of 5</span></div>}
            </div>
            {currentUser?.id !== profile.id && !alreadyReviewed && (
              <button onClick={() => setShowReviewForm(!showReviewForm)} style={{ background: C.clay, color: C.sunk, border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>+ Write Review</button>
            )}
          </div>

          {showReviewForm && (
            <div style={{ background: C.sunk, borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
              <StarInput />
              <div style={{ marginBottom: '14px' }}>
                <textarea value={reviewBody} onChange={e => setReviewBody(e.target.value)} rows={3} placeholder="Share your experience..." style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              {reviewMessage && <p style={{ color: C.danger, fontSize: '13px', marginBottom: '12px' }}>{reviewMessage}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowReviewForm(false)} style={{ flex: 1, background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSubmitReview} disabled={submittingReview} style={{ flex: 2, background: C.clay, color: C.sunk, border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          )}

          {reviewMessage && !showReviewForm && <p style={{ color: C.oasis, fontSize: '13px', marginBottom: '12px', fontWeight: '600' }}>{reviewMessage}</p>}

          {reviews.length === 0
            ? <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>No reviews yet.</p>
            : reviews.map(review => (
              <div key={review.id} style={{ borderTop: `1px solid ${C.line}`, paddingTop: '14px', marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '14px', color: C.text }}>{review.reviewer?.full_name || 'Anonymous'}</p>
                    <StarDisplay value={review.rating} size={13} />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
                {review.body && <p style={{ fontSize: '14px', color: C.muted, margin: '8px 0 0', lineHeight: '1.6' }}>{review.body}</p>}
              </div>
            ))
          }
        </div>

        {currentUser?.id !== profile.id && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <RequestQuoteButton profile={profile} currentUser={currentUser} supabase={supabase} router={router} />
            <button onClick={handleStartConversation} disabled={messaging || messageSent}
              style={{ width: '100%', background: 'transparent', color: C.clay, border: `1px solid ${C.clay}44`, padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {messageSent ? '✓ Chat started — redirecting...' : messaging ? 'Opening chat...' : `Message ${profile.full_name?.split(' ')[0]}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}