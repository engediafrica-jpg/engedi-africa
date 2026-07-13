'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthShell from '@/components/AuthShell'
import Input from '@/components/Input'
import Button from '@/components/Button'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleReset = async () => {
    setError('')
    setMessage('')
    if (!email) { setError('Please enter your email'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setMessage('Check your email for a reset link!')
  }

  return (
    <AuthShell>
      <h1 className="mb-2 text-[1.5rem] font-bold">Forgot Password</h1>
      <p className="mb-8 text-[0.9rem] text-text-muted">We will send a reset link to your email</p>

      <div className="mb-6">
        <Input label="Email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      {error && <p className="mb-4 text-[0.85rem] text-danger">{error}</p>}
      {message && <p className="mb-4 text-[0.85rem] text-oasis">{message}</p>}

      <Button onClick={handleReset} disabled={loading} className="w-full justify-center">
        {loading ? 'Sending...' : 'Send Reset Link'}
      </Button>

      <p className="mt-5 text-center text-[0.85rem] text-text-muted">
        Remember your password? <Link href="/login" className="font-semibold text-clay no-underline">Log in</Link>
      </p>
    </AuthShell>
  )
}
