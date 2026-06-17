'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const roles = [
  { value: 'project_owner', label: 'Project Owner', desc: 'I want to hire and buy materials' },
  { value: 'artisan', label: 'Artisan', desc: 'I offer construction trade skills' },
  { value: 'supplier', label: 'Supplier', desc: 'I sell building materials' },
  { value: 'professional', label: 'Professional', desc: 'I am an architect, engineer or QS' },
  { value: 'service_provider', label: 'Service Provider', desc: 'I offer facility services' },
  { value: 'equipment_provider', label: 'Equipment Provider', desc: 'I rent out equipment' },
]

export default function SignupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSignup = async () => {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, role: form.role } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    await supabase.from('profiles').update({ full_name: form.full_name, role: form.role }).eq('email', form.email)
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '480px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Create your account</h1>
          <p style={{ color: '#666666', fontSize: '14px', margin: '0 0 32px' }}>Join Nigeria&apos;s construction marketplace</p>

          {step === 1 && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{ width: '100%', padding: '12px', paddingRight: '48px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666666', fontSize: '13px', fontWeight: '600' }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {error && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
              <button
                onClick={() => {
                  if (!form.full_name || !form.email || !form.password) { setError('Please fill all fields'); return }
                  setError(''); setStep(2)
                }}
                style={{ width: '100%', background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
              >
                Continue
              </button>
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#666666', marginTop: '20px' }}>
                Already have an account? <Link href="/login" style={{ color: '#8B5E3C', fontWeight: '600', textDecoration: 'none' }}>Log in</Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>What best describes you?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {roles.map(role => (
                  <div
                    key={role.value}
                    onClick={() => setForm({ ...form, role: role.value })}
                    style={{ padding: '14px 16px', border: `1.5px solid ${form.role === role.value ? '#8B5E3C' : '#EEE6DA'}`, borderRadius: '10px', cursor: 'pointer', background: form.role === role.value ? '#F5EFE6' : '#FFFFFF' }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>{role.label}</div>
                    <div style={{ fontSize: '12px', color: '#666666' }}>{role.desc}</div>
                  </div>
                ))}
              </div>
              {error && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Back</button>
                <button
                  onClick={() => { if (!form.role) { setError('Please select a role'); return } handleSignup() }}
                  disabled={loading}
                  style={{ flex: 2, background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}