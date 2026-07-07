'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function BankDetailsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    bank_name: '',
    bank_code: '',
    bank_account_number: '',
    bank_account_name: '',
  })
  const [accountVerified, setAccountVerified] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const uid = sessionData.session.user.id
      setUserId(uid)
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', uid).single()
      setProfile(profileData)
      if (profileData.bank_name) {
        setForm({
          bank_name: profileData.bank_name || '',
          bank_code: '',
          bank_account_number: profileData.bank_account_number || '',
          bank_account_name: profileData.bank_account_name || '',
        })
        if (profileData.bank_account_name) setAccountVerified(true)
      }
      const res = await fetch('/api/paystack/banks')
      const banksData = await res.json()
      if (banksData.status) setBanks(banksData.data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleVerifyAccount = async () => {
    if (!form.bank_account_number || form.bank_account_number.length !== 10) {
      setMessage('Enter a valid 10-digit account number')
      return
    }
    if (!form.bank_code) { setMessage('Please select a bank'); return }
    setVerifying(true)
    setMessage('')
    const res = await fetch(`https://api.paystack.co/bank/resolve?account_number=${form.bank_account_number}&bank_code=${form.bank_code}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY}` }
    })
    const data = await res.json()
    if (data.status && data.data?.account_name) {
      setForm({ ...form, bank_account_name: data.data.account_name })
      setAccountVerified(true)
      setMessage('Account verified: ' + data.data.account_name)
    } else {
      setMessage('Could not verify account. Please check your details.')
      setAccountVerified(false)
    }
    setVerifying(false)
  }

  const handleSave = async () => {
    if (!accountVerified) { setMessage('Please verify your account number first'); return }
    setSaving(true)
    setMessage('')

    // Create Paystack transfer recipient
    const selectedBank = banks.find(b => b.code === form.bank_code)
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: form.bank_account_name,
        account_number: form.bank_account_number,
        bank_code: form.bank_code,
        currency: 'NGN',
      })
    })
    const recipientData = await recipientRes.json()
    const recipientCode = recipientData.data?.recipient_code || null

    const { error } = await supabase.from('profiles').update({
      bank_name: selectedBank?.name || form.bank_name,
      bank_account_number: form.bank_account_number,
      bank_account_name: form.bank_account_name,
      paystack_recipient_code: recipientCode,
    }).eq('id', userId)

    setSaving(false)
    if (error) { setMessage('Error saving: ' + error.message); return }
    setMessage('Bank details saved successfully!')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '8px' }}>Bank Details</h1>
        <p style={{ color: '#666666', fontSize: '14px', marginBottom: '32px' }}>Add your bank account to receive payments from EnGedi Africa</p>

        {/* Current details */}
        {profile?.bank_account_name && (
          <div style={{ background: '#e8f8f0', border: '1.5px solid #2ecc71', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ fontWeight: '700', color: '#27ae60', margin: '0 0 8px', fontSize: '15px' }}>✓ Bank account on file</p>
            <p style={{ color: '#666666', fontSize: '14px', margin: '0 0 4px' }}><strong>Bank:</strong> {profile.bank_name}</p>
            <p style={{ color: '#666666', fontSize: '14px', margin: '0 0 4px' }}><strong>Account Name:</strong> {profile.bank_account_name}</p>
            <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}><strong>Account Number:</strong> {profile.bank_account_number?.replace(/(\d{6})(\d{4})/, '******$2')}</p>
          </div>
        )}

        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Select Bank</label>
            <select
              value={form.bank_code}
              onChange={e => {
                const selected = banks.find(b => b.code === e.target.value)
                setForm({ ...form, bank_code: e.target.value, bank_name: selected?.name || '' })
                setAccountVerified(false)
                setForm(prev => ({ ...prev, bank_code: e.target.value, bank_name: selected?.name || '', bank_account_name: '' }))
              }}
              style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#FFFFFF', boxSizing: 'border-box' }}
            >
              <option value="">Select your bank...</option>
              {banks.map(bank => (
                <option key={bank.code} value={bank.code}>{bank.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Account Number</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="10-digit account number"
                value={form.bank_account_number}
                onChange={e => {
                  setForm({ ...form, bank_account_number: e.target.value, bank_account_name: '' })
                  setAccountVerified(false)
                }}
                maxLength={10}
                style={{ flex: 1, padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleVerifyAccount}
                disabled={verifying || form.bank_account_number.length !== 10 || !form.bank_code}
                style={{ background: verifying ? '#EEE6DA' : '#8B5E3C', color: verifying ? '#999999' : '#FFFFFF', border: 'none', padding: '12px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: verifying ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
              >
                {verifying ? 'Checking...' : 'Verify'}
              </button>
            </div>
          </div>

          {form.bank_account_name && (
            <div style={{ background: '#e8f8f0', border: '1px solid #2ecc71', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#27ae60' }}>✓ {form.bank_account_name}</p>
            </div>
          )}

          {message && (
            <p style={{ color: message.includes('Error') || message.includes('not') || message.includes('check') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>
              {message}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !accountVerified}
            style={{ width: '100%', background: saving || !accountVerified ? '#EEE6DA' : '#1A1A1A', color: saving || !accountVerified ? '#999999' : '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: saving || !accountVerified ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Bank Details'}
          </button>

          <p style={{ color: '#999999', fontSize: '12px', marginTop: '12px', textAlign: 'center', lineHeight: '1.6' }}>
            Your bank details are encrypted and only used to send you payments from EnGedi Africa.
          </p>
        </div>
      </div>
    </div>
  )
}