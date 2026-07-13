'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthShell from '@/components/AuthShell'
import Input from '@/components/Input'
import Button from '@/components/Button'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <AuthShell>
      <h1 className="mb-2 text-[1.5rem] font-bold">Welcome back</h1>
      <p className="mb-8 text-[0.9rem] text-text-muted">Log in to your EnGedi account</p>

      <div className="mb-4">
        <Input
          label="Email"
          type="email"
          placeholder="your@email.com"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />
      </div>

      <div className="mb-2">
        <Input
          label="Password"
          type="password"
          placeholder="Your password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
      </div>

      <div className="mb-6 text-right">
        <Link href="/forgot-password" className="text-[0.8rem] font-semibold text-clay no-underline">
          Forgot password?
        </Link>
      </div>

      {error && <p className="mb-4 text-[0.85rem] text-danger">{error}</p>}

      <Button onClick={handleLogin} disabled={loading} className="w-full justify-center">
        {loading ? 'Logging in...' : 'Log In'}
      </Button>

      <p className="mt-5 text-center text-[0.85rem] text-text-muted">
        Don&apos;t have an account? <Link href="/signup" className="font-semibold text-clay no-underline">Sign up</Link>
      </p>
    </AuthShell>
  )
}
