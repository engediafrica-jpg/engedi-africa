'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'

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
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      <div className="mx-auto max-w-[600px] px-6 py-10">
        <h1 className="mb-2 text-[24px] font-bold">Bank Details</h1>
        <p className="mb-8 text-[14px] text-text-muted">Add your bank account to receive payments from EnGedi Africa</p>

        {/* Current details */}
        {profile?.bank_account_name && (
          <div className="mb-6 border border-oasis bg-oasis-soft p-5">
            <p className="m-0 mb-2 text-[15px] font-bold text-oasis">✓ Bank account on file</p>
            <p className="m-0 mb-1 text-[14px] text-text-muted"><strong className="text-text">Bank:</strong> {profile.bank_name}</p>
            <p className="m-0 mb-1 text-[14px] text-text-muted"><strong className="text-text">Account Name:</strong> {profile.bank_account_name}</p>
            <p className="m-0 text-[14px] text-text-muted"><strong className="text-text">Account Number:</strong> {profile.bank_account_number?.replace(/(\d{6})(\d{4})/, '******$2')}</p>
          </div>
        )}

        <div className="ticks border border-line bg-surface-raised p-8">
          <div className="mb-4">
            <label className="mb-1.5 block text-[0.8rem] font-semibold text-text">Select Bank</label>
            <select
              value={form.bank_code}
              onChange={e => {
                const selected = banks.find(b => b.code === e.target.value)
                setForm({ ...form, bank_code: e.target.value, bank_name: selected?.name || '' })
                setAccountVerified(false)
                setForm(prev => ({ ...prev, bank_code: e.target.value, bank_name: selected?.name || '', bank_account_name: '' }))
              }}
              className="w-full border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
            >
              <option value="">Select your bank...</option>
              {banks.map(bank => (
                <option key={bank.code} value={bank.code}>{bank.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[0.8rem] font-semibold text-text">Account Number</label>
            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder="10-digit account number"
                value={form.bank_account_number}
                onChange={e => {
                  setForm({ ...form, bank_account_number: e.target.value, bank_account_name: '' })
                  setAccountVerified(false)
                }}
                maxLength={10}
                className="flex-1 border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
              />
              <Button
                onClick={handleVerifyAccount}
                disabled={verifying || form.bank_account_number.length !== 10 || !form.bank_code}
                variant="outline"
                className="whitespace-nowrap text-[13px]"
              >
                {verifying ? 'Checking...' : 'Verify'}
              </Button>
            </div>
          </div>

          {form.bank_account_name && (
            <div className="mb-4 border border-oasis bg-oasis-soft px-4 py-3">
              <p className="m-0 text-[14px] font-bold text-oasis">✓ {form.bank_account_name}</p>
            </div>
          )}

          {message && (
            <p className={`mb-4 text-[13px] font-semibold ${message.includes('Error') || message.includes('not') || message.includes('check') ? 'text-danger' : 'text-oasis'}`}>
              {message}
            </p>
          )}

          <Button onClick={handleSave} disabled={saving || !accountVerified} className="w-full justify-center">
            {saving ? 'Saving...' : 'Save Bank Details'}
          </Button>

          <p className="mt-3 text-center text-[12px] leading-relaxed text-text-muted">
            Your bank details are encrypted and only used to send you payments from EnGedi Africa.
          </p>
        </div>
      </div>
    </div>
  )
}
