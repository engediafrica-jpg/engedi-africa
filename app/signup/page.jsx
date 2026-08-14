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
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [done, setDone] = useState(false)

  const handleSignup = async () => {
    setError('')
    setLoading(true)

    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, role: form.role },
        emailRedirectTo: 'https://engediafrica.com/dashboard',
      }
    })
    if (error) { setError(error.message); setLoading(false); return }

    // Update profile with role and referral
    if (data.user) {
      await supabase.from('profiles').update({
        full_name: form.full_name,
        role: form.role,
        referred_by: ref || null,
      }).eq('id', data.user.id)

      // If referred by a field marketer, log the signup
      if (ref) {
        const { data: marketer } = await supabase.from('profiles').select('id, full_name').eq('referral_code', ref).eq('role', 'field_marketer').single()
        if (marketer) {
          await supabase.from('field_marketer_signups').insert({
            field_marketer_id: marketer.id,
            referred_user_id: data.user.id,
            referred_user_name: form.full_name,
            referred_user_role: form.role,
            commission_earned: 5000,
          })
        }
      }
    }

    setLoading(false)
    setDone(true)
  }

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  if (done) return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📬</div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: C.text, margin: '0 0 12px' }}>Check your email</h1>
          <p style={{ color: C.muted, fontSize: '14px', lineHeight: '1.7', margin: '0 0 8px' }}>
            We sent a confirmation link to
          </p>
          <p style={{ color: C.clay, fontSize: '14px', fontWeight: '700', margin: '0 0 20px' }}>{form.email}</p>
          <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 24px', lineHeight: '1.6' }}>
            Click the link in that email to activate your account. Check your spam folder if you don't see it.
          </p>
          <Link href="/login" style={{ display: 'inline-block', background: C.clay, color: C.sunk, textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '480px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>Create your account</h1>
          <p style={{ color: C.muted, fontSize: '14px', margin: '0 0 28px' }}>Join Nigeria&apos;s construction marketplace</p>

          {/* Progress */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
            {[1, 2].map(s => (
              <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: step >= s ? C.clay : C.line }} />
            ))}
          </div>

          {step === 1 && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                <input type="text" placeholder="Your full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
                <input type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{ ...inputStyle, paddingRight: '56px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.clay, fontSize: '13px', fontWeight: '700' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {error && <p style={{ color: C.danger, fontSize: '13px', marginBottom: '12px', fontWeight: '600' }}>{error}</p>}
              <button onClick={() => {
                if (!form.full_name || !form.email || !form.password) { setError('Please fill all fields'); return }
                if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
                setError(''); setStep(2)
              }} style={{ width: '100%', background: C.clay, color: C.sunk, border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px' }}>
                Continue
              </button>
              <p style={{ textAlign: 'center', fontSize: '13px', color: C.muted, margin: 0 }}>
                Already have an account? <Link href="/login" style={{ color: C.clay, fontWeight: '600', textDecoration: 'none' }}>Log in</Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <p style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What best describes you?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {roles.map(role => (
                  <div key={role.value} onClick={() => setForm({ ...form, role: role.value })}
                    style={{ padding: '14px 16px', border: `1px solid ${form.role === role.value ? C.clay : C.line}`, borderRadius: '8px', cursor: 'pointer', background: form.role === role.value ? '#201a14' : 'transparent' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: form.role === role.value ? C.clay : C.text }}>{role.label}</div>
                    <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{role.desc}</div>
                  </div>
                ))}
              </div>
              {error && <p style={{ color: C.danger, fontSize: '13px', marginBottom: '12px', fontWeight: '600' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Back</button>
                <button onClick={() => { if (!form.role) { setError('Please select a role'); return } handleSignup() }} disabled={loading}
                  style={{ flex: 2, background: loading ? C.line : C.clay, color: loading ? C.muted : C.sunk, border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
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