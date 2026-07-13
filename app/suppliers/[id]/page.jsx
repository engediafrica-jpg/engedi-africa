'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'

export default function SupplierProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const [profile, setProfile] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [products, setProducts] = useState([])
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

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setCurrentUser(me)
      const { data } = await supabase.from('profiles').select('*').eq('id', params.id).single()
      if (!data) { router.push('/browse'); return }
      setProfile(data)
      const { data: productData } = await supabase.from('products').select('*').eq('supplier_id', params.id).eq('is_active', true)
      setProducts(productData || [])
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url, role)')
        .eq('reviewed_id', params.id)
        .order('created_at', { ascending: false })
      setReviews(reviewData || [])
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
    setSubmittingReview(true)
    const { data: existing } = await supabase.from('reviews')
      .select('id').eq('reviewer_id', currentUser.id).eq('reviewed_id', profile.id).single()
    if (existing) { setReviewMessage('You have already reviewed this supplier'); setSubmittingReview(false); return }
    const { data, error } = await supabase.from('reviews').insert({
      reviewer_id: currentUser.id,
      reviewed_id: profile.id,
      rating,
      body: reviewBody,
    }).select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url, role)').single()
    if (error) { setReviewMessage('Error submitting review'); setSubmittingReview(false); return }
    setReviews([data, ...reviews])
    setRating(0)
    setReviewBody('')
    setShowReviewForm(false)
    setReviewMessage('Review submitted!')
    setSubmittingReview(false)
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

  const alreadyReviewed = reviews.some(r => r.reviewer_id === currentUser?.id)

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/browse" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Back to Browse</Link>} />

      <div className="mx-auto max-w-[720px] px-6 py-10">

        <div className="ticks mb-6 border border-line bg-surface-raised p-8">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-clay bg-surface-sunk font-display text-[28px] font-bold text-clay">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" /> : profile.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2.5">
                <h1 className="m-0 text-[22px] font-bold text-text">{profile.company_name || profile.full_name}</h1>
                {profile.is_verified && <Badge tone="success">EnGedi Verified</Badge>}
              </div>
              <Badge tone="pending">Supplier</Badge>
              {(profile.city || profile.state) && <p className="mb-0 mt-2.5 text-[14px] text-text-muted">{[profile.city, profile.state].filter(Boolean).join(', ')}</p>}
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

        {profile.bio && (
          <div className="mb-6 border border-line bg-surface-raised p-6">
            <h3 className="m-0 mb-3 text-[16px] font-bold text-text">About</h3>
            <p className="m-0 text-[14px] leading-relaxed text-text-muted">{profile.bio}</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="mb-6 border border-line bg-surface-raised p-6">
            <h3 className="m-0 mb-5 text-[16px] font-bold text-text">Products &amp; Materials</h3>
            <div className="ticks grid grid-cols-1 border-l border-t border-line sm:grid-cols-2">
              {products.map(product => (
                <div key={product.id} className="flex items-center justify-between border-b border-r border-line p-3.5">
                  <div>
                    <p className="m-0 mb-1 text-[14px] font-bold text-text">{product.name}</p>
                    <p className="m-0 text-[12px] text-text-muted">{product.category} · {product.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="m-0 mb-0.5 font-mono text-[16px] font-bold tabular-nums text-text">₦{Number(product.price).toLocaleString()}</p>
                    <p className="m-0 text-[11px] text-text-muted">per {product.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mb-6 border border-line bg-surface-raised p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="m-0 mb-1 text-[16px] font-bold text-text">Reviews {reviews.length > 0 && `(${reviews.length})`}</h3>
              {avgRating && <div className="flex items-center gap-2"><StarDisplay value={Math.round(avgRating)} size={16} /><span className="text-[14px] font-bold text-text">{avgRating} out of 5</span></div>}
            </div>
            {currentUser?.id !== profile.id && !alreadyReviewed && (
              <Button className="text-[13px]" onClick={() => setShowReviewForm(!showReviewForm)}>+ Write a Review</Button>
            )}
          </div>

          {showReviewForm && (
            <div className="mb-5 border border-line bg-surface-sunk p-5">
              <p className="m-0 mb-3 text-[14px] font-semibold text-text">Your rating</p>
              <StarInput />
              <div className="mb-4">
                <label className="mb-1.5 block text-[13px] font-semibold text-text">Your review (optional)</label>
                <textarea value={reviewBody} onChange={e => setReviewBody(e.target.value)} rows={3} placeholder="Share your experience with this supplier..."
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
          <Button className="w-full justify-center" disabled={messaging || messageSent} onClick={handleStartConversation}>
            {messageSent ? '✓ Conversation started — redirecting...' : messaging ? 'Opening chat...' : `Contact ${profile.company_name || profile.full_name?.split(' ')[0]}`}
          </Button>
        )}
      </div>
    </div>
  )
}
