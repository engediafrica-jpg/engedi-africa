'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthShell from '@/components/AuthShell'
import Input from '@/components/Input'
import Button from '@/components/Button'

const roles = [
  { value: 'project_owner', label: 'Project Owner', desc: 'I want to hire and buy materials' },
  { value: 'artisan', label: 'Artisan', desc: 'I offer construction trade skills' },
  { value: 'supplier', label: 'Supplier', desc: 'I sell building materials' },
  { value: 'professional', label: 'Professional', desc: 'I am an architect, engineer or QS' },
  { value: 'service_provider', label: 'Service Provider', desc: 'I offer facility services' },
  { value: 'equipment_provider', label: 'Equipment Provider', desc: 'I rent out equipment' },
]

function SignupForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: '', ref: searchParams.get('ref') || '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSignup = async () => {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, role: form.role },
        emailRedirectTo: 'https://engediafrica.com/dashboard',
      }
    })
    if (error) { setError(error.message); setLoading(false); return }
    await supabase.from('profiles').update({ full_name: form.full_name, role: form.role }).eq('email', form.email)
    if (form.ref) {
      const { data: marketer } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', form.ref)
        .eq('role', 'field_marketer')
        .single()
      if (marketer) {
        await supabase.from('profiles').update({ referred_by_marketer_id: marketer.id }).eq('email', form.email)
      }
    }
    setLoading(false)
    setDone(true)
  }

  if (done) return (
    <AuthShell>
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-oasis text-oasis">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6L12 13L21 6" /><rect x="3" y="5" width="18" height="14" /></svg>
        </div>
        <h1 className="mb-3 text-[1.35rem] font-bold">Check your email</h1>
        <p className="mb-6 text-[0.95rem] leading-relaxed text-text-muted">
          We sent a confirmation link to <strong className="text-text">{form.email}</strong>. Click the link in that email to activate your EnGedi Africa account.
        </p>
        <p className="text-[0.85rem] text-text-muted">
          Already confirmed? <Link href="/login" className="font-semibold text-clay no-underline">Log in</Link>
        </p>
      </div>
    </AuthShell>
  )

  return (
    <AuthShell>
      <h1 className="mb-2 text-[1.5rem] font-bold">Create your account</h1>
      <p className="mb-8 text-[0.9rem] text-text-muted">Join Nigeria&apos;s construction marketplace</p>

      {step === 1 && (
        <div>
          <div className="mb-4">
            <Input label="Full Name" placeholder="Your full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="mb-4">
            <Input label="Email" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="mb-6">
            <Input label="Password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="mb-3 text-[0.85rem] text-danger">{error}</p>}
          <Button
            className="w-full justify-center"
            onClick={() => {
              if (!form.full_name || !form.email || !form.password) { setError('Please fill all fields'); return }
              if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
              setError('')
              setStep(2)
            }}
          >
            Continue
          </Button>
          <p className="mt-5 text-center text-[0.85rem] text-text-muted">
            Already have an account? <Link href="/login" className="font-semibold text-clay no-underline">Log in</Link>
          </p>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="mb-4 text-[0.85rem] font-semibold">What best describes you?</p>
          <div className="mb-6 ticks border-l border-t border-line">
            {roles.map(role => (
              <div
                key={role.value}
                onClick={() => setForm({ ...form, role: role.value })}
                className={`cursor-pointer border-b border-r border-line px-4 py-3.5 transition-colors ${form.role === role.value ? 'bg-oasis-soft' : 'hover:bg-surface-sunk'}`}
              >
                <div className="flex items-center justify-between text-[0.9rem] font-bold">
                  {role.label}
                  {form.role === role.value && <span className="text-oasis">✓</span>}
                </div>
                <div className="text-[0.78rem] text-text-muted">{role.desc}</div>
              </div>
            ))}
          </div>
          {error && <p className="mb-3 text-[0.85rem] text-danger">{error}</p>}
          <div className="flex gap-2.5">
            <Button variant="outline" className="flex-1 justify-center" onClick={() => setStep(1)}>Back</Button>
            <Button
              className="flex-[2] justify-center"
              disabled={loading}
              onClick={() => {
                if (!form.role) { setError('Please select a role'); return }
                handleSignup()
              }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </div>
        </div>
      )}
    </AuthShell>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
