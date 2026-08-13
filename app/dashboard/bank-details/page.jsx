'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const C = {
  surface: '#15120e',
  raised: '#201a14',
  sunk: '#0f0c09',
  text: '#f1eae0',
  muted: '#a79a85',
  line: '#362d22',
  clay: '#e08554',
  clayDeep: '#b85c38',
  oasis: '#86a98b',
  danger: '#e2695f',
  dangerSoft: '#2e1712',
}

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
  const [form, setForm] = useState({ bank_name: '', bank_code: '', bank_account_number: '', bank_account_name: '' })
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
    try {
      const res = await fetch(`/api/paystack/resolve?account_number=${form.bank_account_number}&bank_code=${form.bank_code}`)
      const data = await res.json()
      if (data.status && data.data?.account_name) {
        setForm(prev => ({ ...prev, bank_account_name: data.data.account_name }))
        setAccountVerified(true)
        setMessage('✓ Account verified: ' + data.data.account_name)
      } else {
        setMessage('Could not verify account. Check your details and try again.')
        setAccountVerified(false)
      }
    } catch (err) {
      setMessage('Verification failed. Please try again.')
      setAccountVerified(false)
    }
    setVerifying(false)
  }

  const handleSave = async () => {
    if (!accountVerified) { setMessage('Please verify your account number first'); return }
    setSaving(true)
    setMessage('')
    const selectedBank = banks.find(b => b.code === form.bank_code)

    // Create Paystack transfer recipient
    let recipientCode = null
    try {
      const recipientRes = await fetch('/api/paystack/transfer-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.bank_account_name,
          account_number: form.bank_account_number,
          bank_code: form.bank_code,
        }),
      })
      const recipientData = await recipientRes.json()
      recipientCode = recipientData.data?.recipient_code || null
    } catch (err) {
      console.log('Recipient creation failed:', err)
    }

    const { error } = await supabase.from('profiles').update({
      bank_name: selectedBank?.name || form.bank_name,
      bank_account_number: form.bank_account_number,
      bank_account_name: form.bank_account_name,
      paystack_recipient_code: recipientCode,
    }).eq('id', userId)

    setSaving(false)
    if (error) { setMessage('Error saving: ' + error.message); return }
    setProfile({ ...profile, bank_name: selectedBank?.name, bank_account_number: form.bank_account_number, bank_account_name: form.bank_account_name })
    setMessage('✓ Bank details saved successfully!')
  }

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: C.muted, textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '580px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.text, marginBottom: '8px' }}>Bank Details</h1>
        <p style={{ color: C.muted, fontSize: '14px', marginBottom: '32px' }}>Add your bank account to receive payments from EnGedi Africa</p>

        {/* Current details */}
        {profile?.bank_account_name && (
          <div style={{ background: '#1a2e1d', border: `1px solid ${C.oasis}44`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ fontWeight: '700', color: C.oasis, margin: '0 0 10px', fontSize: '14px' }}>✓ Bank account on file</p>
            <p style={{ color: C.muted, fontSize: '14px', margin: '0 0 4px' }}><span style={{ color: C.text, fontWeight: '600' }}>Bank:</span> {profile.bank_name}</p>
            <p style={{ color: C.muted, fontSize: '14px', margin: '0 0 4px' }}><span style={{ color: C.text, fontWeight: '600' }}>Account Name:</span> {profile.bank_account_name}</p>
            <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}><span style={{ color: C.text, fontWeight: '600' }}>Account Number:</span> {profile.bank_account_number?.replace(/(\d{6})(\d{4})/, '******$2')}</p>
          </div>
        )}

        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '32px' }}>

          {/* Bank select */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Bank</label>
            <select
              value={form.bank_code}
              onChange={e => {
                const selected = banks.find(b => b.code === e.target.value)
                setForm(prev => ({ ...prev, bank_code: e.target.value, bank_name: selected?.name || '', bank_account_name: '' }))
                setAccountVerified(false)
              }}
              style={{ ...inputStyle, appearance: 'none' }}
            >
              <option value="" style={{ background: C.sunk }}>Select your bank...</option>
              {banks.map(bank => (
                <option key={bank.code} value={bank.code} style={{ background: C.sunk }}>{bank.name}</option>
              ))}
            </select>
          </div>

          {/* Account number + verify */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Number</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="10-digit account number"
                value={form.bank_account_number}
                onChange={e => {
                  setForm(prev => ({ ...prev, bank_account_number: e.target.value, bank_account_name: '' }))
                  setAccountVerified(false)
                }}
                maxLength={10}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleVerifyAccount}
                disabled={verifying || form.bank_account_number.length !== 10 || !form.bank_code}
                style={{ background: verifying ? C.line : form.bank_account_number.length === 10 && form.bank_code ? C.clay : C.line, color: verifying || !form.bank_code || form.bank_account_number.length !== 10 ? C.muted : C.sunk, border: 'none', padding: '12px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: verifying || !form.bank_code || form.bank_account_number.length !== 10 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {verifying ? 'Checking...' : 'Verify'}
              </button>
            </div>
          </div>

          {/* Verified account name */}
          {form.bank_account_name && (
            <div style={{ background: '#1a2e1d', border: `1px solid ${C.oasis}44`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: C.oasis }}>✓ {form.bank_account_name}</p>
            </div>
          )}

          {message && (
            <p style={{ color: message.includes('✓') ? C.oasis : C.danger, fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>
              {message}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !accountVerified}
            style={{ width: '100%', background: saving || !accountVerified ? C.line : C.clay, color: saving || !accountVerified ? C.muted : C.sunk, border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: saving || !accountVerified ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Bank Details'}
          </button>

          <p style={{ color: C.muted, fontSize: '12px', marginTop: '12px', textAlign: 'center', lineHeight: '1.6' }}>
            Your details are only used to send you payments from EnGedi Africa.
          </p>
        </div>
      </div>
    </div>
  )
}