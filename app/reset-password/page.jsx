'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthShell from '@/components/AuthShell'
import Input from '@/components/Input'
import Button from '@/components/Button'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
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
    setTimeout(() => router.push('/login'), 2000)
  }

  return (
    <AuthShell>
      {!ready ? (
        <div className="text-center">
          <p className="text-[0.95rem] text-text-muted">Verifying your reset link...</p>
          <p className="mt-2 text-[0.85rem] text-text-muted">
            If nothing happens, your link may have expired. <Link href="/forgot-password" className="font-semibold text-clay no-underline">Request a new one</Link>
          </p>
        </div>
      ) : (
        <>
          <h1 className="mb-2 text-[1.5rem] font-bold">Reset Password</h1>
          <p className="mb-8 text-[0.9rem] text-text-muted">Enter your new password below</p>

          <div className="mb-4">
            <Input label="New Password" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="mb-6">
            <Input label="Confirm Password" type="password" placeholder="Repeat your password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>

          {error && <p className="mb-4 text-[0.85rem] text-danger">{error}</p>}
          {message && <p className="mb-4 text-[0.85rem] text-oasis">{message}</p>}

          <Button onClick={handleReset} disabled={loading} className="w-full justify-center">
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </>
      )}
    </AuthShell>
  )
}
