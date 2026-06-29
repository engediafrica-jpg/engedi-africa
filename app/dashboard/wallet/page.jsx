'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function WalletPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [message, setMessage] = useState('')
  const [scriptLoaded, setScriptLoaded] = useState(false)

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
    if (document.getElementById('paystack-script')) {
      setScriptLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'paystack-script'
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => setMessage('Payment system failed to load. Please refresh.')
    document.body.appendChild(script)
  }, [])

  const handlePayment = () => {
    if (!scriptLoaded) { setMessage('Payment system still loading. Please wait a moment.'); return }
    if (!amount || isNaN(amount) || Number(amount) < 100) { setMessage('Enter a valid amount (min ₦100)'); return }
    if (!window.PaystackPop) { setMessage('Payment system not ready. Please refresh the page.'); return }
    setPaying(true)
    setMessage('')

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: profile.email,
      amount: Number(amount) * 100,
      currency: 'NGN',
      channels: ['card', 'bank', 'ussd', 'bank_transfer', 'opay', 'mobile_money'],
      ref: Date.now().toString() + '-engedi',
      callback: async (response) => {
        const { error } = await supabase.from('transactions').insert({
          user_id: profile.id,
          reference: response.reference,
          amount: Number(amount),
          currency: 'NGN',
          status: 'success',
          purpose: 'wallet_topup',
          paystack_data: response,
        })
        if (!error) {
          setTransactions(prev => [{
            reference: response.reference,
            amount: Number(amount),
            status: 'success',
            created_at: new Date().toISOString(),
            purpose: 'wallet_topup'
          }, ...prev])
          setMessage('Payment successful! ₦' + Number(amount).toLocaleString() + ' added to your wallet.')
          setAmount('')
        }
        setPaying(false)
      },
      onClose: () => {
        setPaying(false)
        setMessage('Payment cancelled.')
      },
    })
    handler.openIframe()
  }

  const totalDeposited = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Dashboard</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '32px' }}>Wallet</h1>

        {/* Balance card */}
        <div style={{ background: '#1A1A1A', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Deposited</p>
          <p style={{ color: '#FFFFFF', fontSize: '36px', fontWeight: '800', margin: '0 0 4px' }}>₦{totalDeposited.toLocaleString()}</p>
          <p style={{ color: '#8B5E3C', fontSize: '13px', margin: 0 }}>{transactions.filter(t => t.status === 'success').length} successful transactions</p>
        </div>

        {/* Top up */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 16px' }}>Top Up Wallet</h3>

          {!scriptLoaded && (
            <p style={{ color: '#8B5E3C', fontSize: '13px', marginBottom: '12px' }}>⏳ Loading payment system...</p>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {[1000, 5000, 10000, 50000].map(preset => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                style={{ background: amount === preset.toString() ? '#1A1A1A' : '#F5EFE6', color: amount === preset.toString() ? '#FFFFFF' : '#8B5E3C', border: `1px solid ${amount === preset.toString() ? '#1A1A1A' : '#8B5E3C'}`, padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                ₦{preset.toLocaleString()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="number"
              placeholder="Or enter amount in ₦"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ flex: 1, minWidth: '180px', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            />
            <button
              onClick={handlePayment}
              disabled={paying || !scriptLoaded}
              style={{ background: paying || !scriptLoaded ? '#EEE6DA' : '#1A1A1A', color: paying || !scriptLoaded ? '#999999' : '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: paying || !scriptLoaded ? 'not-allowed' : 'pointer' }}
            >
              {paying ? 'Opening...' : !scriptLoaded ? 'Loading...' : 'Pay Now'}
            </button>
          </div>

          {message && (
            <p style={{ color: message.includes('successful') ? '#2ecc71' : message.includes('cancelled') ? '#999999' : '#c0392b', fontSize: '13px', marginTop: '12px', fontWeight: '600' }}>
              {message}
            </p>
          )}
        </div>

        {/* Transactions */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 20px' }}>Transaction History</h3>
          {transactions.length === 0
            ? <p style={{ color: '#999999', fontSize: '14px', margin: 0 }}>No transactions yet</p>
            : transactions.map((tx, i) => (
              <div key={tx.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < transactions.length - 1 ? '1px solid #EEE6DA' : 'none' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>
                    {tx.purpose === 'wallet_topup' ? 'Wallet Top-up' : tx.purpose || 'Transaction'}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999999' }}>{new Date(tx.created_at).toLocaleDateString()} · {tx.reference}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>₦{Number(tx.amount).toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: tx.status === 'success' ? '#2ecc71' : '#c0392b', fontWeight: '600', textTransform: 'capitalize' }}>{tx.status}</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}