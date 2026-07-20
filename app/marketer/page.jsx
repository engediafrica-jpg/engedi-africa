'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Badge from '@/components/Badge'

const roleLabel = {
  project_owner: 'Project Owner',
  artisan: 'Artisan',
  supplier: 'Supplier',
  professional: 'Professional',
  service_provider: 'Service Provider',
  equipment_provider: 'Equipment Provider',
}

export default function MarketerPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      if (me?.role !== 'field_marketer') { router.push('/dashboard'); return }
      setProfile(me)

      const { data: referredData } = await supabase
        .from('profiles')
        .select('full_name, role, created_at, verification_status')
        .eq('referred_by_marketer_id', me.id)
        .order('created_at', { ascending: false })
      setReferrals(referredData || [])

      const { data: paymentData } = await supabase
        .from('marketer_payments')
        .select('*')
        .eq('marketer_id', me.id)
        .order('month', { ascending: false })
      setPayments(paymentData || [])

      setLoading(false)
    }
    getData()
  }, [])

  const referralUrl = profile?.referral_code ? `https://engediafrica.com/signup?ref=${profile.referral_code}` : ''

  const handleCopy = () => {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      <div className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="mb-1 text-[24px] font-bold text-text">Referral Dashboard</h1>
        <p className="mb-8 text-[14px] text-text-muted">Share your link and track everyone who joins through it.</p>

        {/* Referral link */}
        <div className="ticks mb-6 border border-clay bg-surface-raised p-6">
          <p className="m-0 mb-2 text-[13px] font-semibold text-text-muted">Your referral link</p>
          <div className="flex flex-wrap items-center gap-3">
            <p className="m-0 break-all font-mono text-[15px] font-bold text-text">{referralUrl}</p>
            <button
              onClick={handleCopy}
              className="border border-line-strong px-4 py-2 text-[13px] font-bold text-text hover:border-text"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Referrals */}
        <div className="mb-6">
          <p className="mb-3 text-[15px] font-bold text-text">Your Referrals ({referrals.length})</p>
          {referrals.length === 0 ? (
            <div className="border border-line bg-surface-raised p-10 text-center">
              <p className="m-0 text-[15px] text-text-muted">No signups yet — share your link to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {referrals.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface-raised px-4 py-3">
                  <div>
                    <p className="m-0 text-[14px] font-bold text-text">{r.full_name || 'Unnamed'}</p>
                    <p className="m-0 text-[12px] text-text-muted">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge tone="pending">{roleLabel[r.role] || r.role}</Badge>
                    {r.verification_status === 'approved' && <Badge tone="success">Verified</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment history */}
        <div>
          <p className="mb-3 text-[15px] font-bold text-text">Payment History</p>
          {payments.length === 0 ? (
            <div className="border border-line bg-surface-raised p-10 text-center">
              <p className="m-0 text-[15px] text-text-muted">No payments logged yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {payments.map(p => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface-raised px-4 py-3">
                  <div>
                    <p className="m-0 text-[14px] font-bold text-text">{new Date(p.month).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</p>
                    {p.note && <p className="m-0 text-[12px] text-text-muted">{p.note}</p>}
                  </div>
                  <p className="m-0 font-mono text-[14px] font-bold text-text">₦{Number(p.amount).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
