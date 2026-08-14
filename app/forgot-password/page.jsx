'use client'
import { useState } from 'react'
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
  oasis: '#86a98b',
  danger: '#e2695f',
}

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleReset = async () => {
    setError('')
    setMessage('')
    if (!email) { setError('Please enter your email'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://engediafrica.com/reset-password',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '440px' }}>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📬</div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: '0 0 12px' }}>Check your inbox</h1>
              <p style={{ color: C.muted, fontSize: '14px', lineHeight: '1.7', margin: '0 0 8px' }}>
                We sent a password reset link to
              </p>
              <p style={{ color: C.clay, fontSize: '14px', fontWeight: '700', margin: '0 0 24px' }}>{email}</p>
              <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 20px', lineHeight: '1.6' }}>
                Click the link in the email to reset your password. Check your spam folder if you don't see it.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={{ background: 'transparent', color: C.clay, border: `1px solid ${C.clay}44`, padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>Forgot password</h1>
              <p style={{ color: C.muted, fontSize: '14px', margin: '0 0 28px', lineHeight: '1.6' }}>
                Enter your email and we will send you a link to reset your password.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  style={inputStyle}
                />
              </div>

              {error && <p style={{ color: C.danger, fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{error}</p>}

              <button
                onClick={handleReset}
                disabled={loading}
                style={{ width: '100%', background: loading ? C.line : C.clay, color: loading ? C.muted : C.sunk, border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px' }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '13px', color: C.muted, margin: 0 }}>
                Remember your password? <Link href="/login" style={{ color: C.clay, fontWeight: '600', textDecoration: 'none' }}>Log in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}