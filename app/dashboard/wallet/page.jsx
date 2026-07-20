'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import useAccessGate from '@/hooks/useAccessGate'
import LockedNotice from '@/components/LockedNotice'

export default function WalletPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const userId = sessionData.session.user.id
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single()
      const { data: txData } = await supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      setProfile(profileData)
      setTransactions(txData || [])
      setLoading(false)
    }
    getData()

    // Load Paystack script
    const existing = document.getElementById('paystack-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'paystack-script'
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  const handlePayment = () => {
    if (!amount || isNaN(amount) || Number(amount) < 100) {
      setMessage('Enter a valid amount (min ₦100)')
      return
    }

    if (!window.PaystackPop) {
      setMessage('Payment is still loading. Please wait 2 seconds and try again.')
      return
    }

    setMessage('')
    setPaying(true)

    const profileId = profile.id
    const profileEmail = profile.email
    const payAmount = Number(amount)
    const supabaseClient = supabase

    function onSuccess(response) {
      supabaseClient.from('transactions').insert({
        user_id: profileId,
        reference: response.reference,
        amount: payAmount,
        currency: 'NGN',
        status: 'success',
        purpose: 'wallet_topup',
        paystack_data: response,
      }).then(({ error }) => {
        if (!error) {
          setTransactions(prev => [{
            reference: response.reference,
            amount: payAmount,
            status: 'success',
            created_at: new Date().toISOString(),
            purpose: 'wallet_topup',
          }, ...prev])
          setMessage('Payment successful! ₦' + payAmount.toLocaleString() + ' added to your wallet.')
          setAmount('')
        }
        setPaying(false)
      })
    }

    function onClose() {
      setPaying(false)
      setMessage('')
    }

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: profileEmail,
      amount: payAmount * 100,
      currency: 'NGN',
      channels: ['card', 'bank', 'ussd', 'bank_transfer', 'opay', 'mobile_money'],
      ref: new Date().getTime().toString() + '-engedi',
      callback: onSuccess,
      onClose: onClose,
    })

    handler.openIframe()
  }

  const totalDeposited = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const { locked, checking } = useAccessGate(profile)

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  if (checking) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  if (locked) return <LockedNotice reason={locked} />

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Back to Dashboard</Link>} />

      <div className="mx-auto max-w-[680px] px-6 py-10">
        <h1 className="mb-8 text-[24px] font-bold">Wallet</h1>

        {/* Balance card */}
        <div className="mb-6 border border-clay-deep bg-ink p-8">
          <p className="m-0 mb-2 font-mono text-[12px] font-semibold uppercase tracking-wider text-ink-muted">Total Deposited</p>
          <p className="m-0 mb-1 font-mono text-[36px] font-bold tabular-nums text-ink-text">₦{totalDeposited.toLocaleString()}</p>
          <p className="m-0 text-[13px] text-clay">
            {transactions.filter(t => t.status === 'success').length} successful transactions
          </p>
        </div>

        {/* Top up */}
        <div className="ticks mb-6 border border-line bg-surface-raised p-8">
          <h3 className="m-0 mb-4 text-[16px] font-bold text-text">Top Up Wallet</h3>

          {/* Quick amounts */}
          <div className="mb-4 flex flex-wrap gap-2.5">
            {[1000, 5000, 10000, 50000].map(preset => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className={`border px-4 py-2 font-mono text-[13px] font-bold tabular-nums ${amount === preset.toString() ? 'border-text bg-text text-surface' : 'border-clay text-clay hover:bg-surface-sunk'}`}
              >
                ₦{preset.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap gap-3">
            <input
              type="number"
              placeholder="Or enter amount in ₦"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePayment()}
              className="min-w-[180px] flex-1 border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
            />
            <Button onClick={handlePayment} disabled={paying} className="shrink-0">
              {paying ? 'Processing...' : 'Pay Now'}
            </Button>
          </div>

          {message && (
            <p className={`mt-2 text-[13px] font-semibold leading-relaxed ${message.includes('successful') ? 'text-oasis' : message.includes('failed') || message.includes('Error') ? 'text-danger' : 'text-clay'}`}>
              {message}
            </p>
          )}
        </div>

        {/* Transactions */}
        <div className="border border-line bg-surface-raised p-8">
          <h3 className="m-0 mb-5 text-[16px] font-bold text-text">Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="m-0 text-[14px] text-text-muted">No transactions yet</p>
          ) : (
            transactions.map((tx, i) => (
              <div key={tx.id || i} className={`flex items-center justify-between py-3.5 ${i < transactions.length - 1 ? 'border-b border-line' : ''}`}>
                <div>
                  <p className="m-0 mb-1 text-[14px] font-semibold text-text">
                    {tx.purpose === 'wallet_topup' ? 'Wallet Top-up' : tx.purpose || 'Transaction'}
                  </p>
                  <p className="m-0 font-mono text-[12px] text-text-muted">
                    {new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="m-0 mb-1 font-mono text-[15px] font-bold tabular-nums text-text">
                    ₦{Number(tx.amount).toLocaleString()}
                  </p>
                  <p className={`m-0 text-[12px] font-semibold capitalize ${tx.status === 'success' ? 'text-oasis' : 'text-danger'}`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
