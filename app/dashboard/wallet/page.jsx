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
  }, [])

  const handlePayment = () => {
    if (!amount || isNaN(amount) || Number(amount) < 100) { setMessage('Enter a valid amount (min ₦100)'); return }
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
        await supabase.from('transactions').insert({
          user_id: profile.id,
          reference: response.reference,
          amount: Number(amount),
          currency: 'NGN',
          status: 'success',
          purpose: 'wallet_topup',
          paystack_data: response,
        })
        setTransactions(prev => [{ reference: response.reference, amount: Number(amount), status: 'success', created_at: new Date().toISOString(), purpose: 'wallet_topup' }, ...prev])
        setMessage('Payment successful!')
        setAmount('')
        setPaying(false)
      },
      onClose: () => { setPaying(false) },
    })
    handler.openIframe()
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#666666' }}>Loading...</p></div>

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <script src="https://js.paystack.co/v1/inline.js" async></script>

      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Dashboard</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '32px' }}>Wallet</h1>

        {/* Top up */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 16px' }}>Top Up Wallet</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="number"
              placeholder="Enter amount in ₦"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ flex: 1, minWidth: '180px', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            />
            <button
              onClick={handlePayment}
              disabled={paying}
              style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >
              {paying ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
          {message && <p style={{ color: message.includes('successful') ? '#2ecc71' : '#c0392b', fontSize: '13px', marginTop: '12px' }}>{message}</p>}
        </div>

        {/* Transactions */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 20px' }}>Transaction History</h3>
          {transactions.length === 0
            ? <p style={{ color: '#999999', fontSize: '14px' }}>No transactions yet</p>
            : transactions.map(tx => (
              <div key={tx.id || tx.reference} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #EEE6DA' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>Wallet Top-up</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999999' }}>{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>₦{tx.amount?.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: tx.status === 'success' ? '#2ecc71' : '#c0392b', fontWeight: '600' }}>{tx.status}</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}