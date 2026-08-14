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
  oasis: '#86a98b',
  danger: '#e2695f',
}

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
        setChecking(false)
      } else if (event === 'SIGNED_IN' && session) {
        setReady(true)
        setChecking(false)
      }
    })

    // Also check if already has session from URL hash
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true)
        setChecking(false)
      } else {
        setTimeout(() => setChecking(false), 3000)
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    setError('')
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setMessage('Password updated! Taking you to login...')
    await supabase.auth.signOut()
    setTimeout(() => router.push('/login'), 2000)
  }

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '440px' }}>

          {checking ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: '15px', margin: '0 0 8px' }}>Verifying your reset link...</p>
              <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>Please wait a moment.</p>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: C.text, margin: '0 0 12px' }}>Link expired or invalid</h2>
              <p style={{ color: C.muted, fontSize: '14px', margin: '0 0 24px', lineHeight: '1.6' }}>
                This reset link has expired or already been used. Request a new one.
              </p>
              <Link href="/forgot-password" style={{ display: 'inline-block', background: C.clay, color: C.sunk, textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
                Request New Link
              </Link>
            </div>
          ) : message ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: C.oasis, margin: '0 0 12px' }}>Password updated!</h2>
              <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>Taking you to login...</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>Reset your password</h1>
              <p style={{ color: C.muted, fontSize: '14px', margin: '0 0 28px' }}>Enter your new password below.</p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: '56px' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.clay, fontSize: '13px', fontWeight: '700' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  style={inputStyle}
                />
              </div>

              {error && <p style={{ color: C.danger, fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{error}</p>}

              <button
                onClick={handleReset}
                disabled={loading}
                style={{ width: '100%', background: loading ? C.line : C.clay, color: loading ? C.muted : C.sunk, border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}