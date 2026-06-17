'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '440px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Forgot Password</h1>
          <p style={{ color: '#666666', fontSize: '14px', margin: '0 0 32px' }}>We will send a reset link to your email</p>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
          {message && <p style={{ color: '#2ecc71', fontSize: '13px', marginBottom: '16px' }}>{message}</p>}

          <button
            onClick={handleReset}
            disabled={loading}
            style={{ width: '100%', background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#666666', marginTop: '20px' }}>
            Remember your password? <Link href="/login" style={{ color: '#8B5E3C', fontWeight: '600', textDecoration: 'none' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}