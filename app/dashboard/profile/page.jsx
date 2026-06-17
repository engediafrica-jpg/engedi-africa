'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const getProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(data)
      setLoading(false)
    }
    getProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone,
      bio: profile.bio,
      city: profile.city,
      state: profile.state,
      address_line: profile.address_line,
      company_name: profile.company_name,
      experience_years: profile.experience_years,
      profile_completed: true,
    }).eq('id', profile.id)
    setSaving(false)
    if (error) { setMessage('Error saving. Try again.'); return }
    setMessage('Profile saved successfully!')
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fileExt = file.name.split('.').pop()
    const filePath = `${profile.id}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) { setMessage('Error uploading photo'); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
    setProfile({ ...profile, avatar_url: data.publicUrl })
    setMessage('Photo updated!')
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#666666' }}>Loading...</p></div>

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>

      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Dashboard</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '32px' }}>Edit Profile</h1>

        {/* Avatar */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F5EFE6', border: '2px solid #8B5E3C', margin: '0 auto 16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '32px', fontWeight: '800', color: '#8B5E3C' }}>{profile?.full_name?.charAt(0)?.toUpperCase()}</span>
            }
          </div>
          <label style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            Upload Photo
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Form */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px' }}>
          {[
            { label: 'Full Name', key: 'full_name', type: 'text' },
            { label: 'Phone', key: 'phone', type: 'text' },
            { label: 'City', key: 'city', type: 'text' },
            { label: 'State', key: 'state', type: 'text' },
            { label: 'Address', key: 'address_line', type: 'text' },
            { label: 'Company Name (optional)', key: 'company_name', type: 'text' },
            { label: 'Years of Experience', key: 'experience_years', type: 'number' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>{field.label}</label>
              <input
                type={field.type}
                value={profile?.[field.key] || ''}
                onChange={e => setProfile({ ...profile, [field.key]: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Bio</label>
            <textarea
              value={profile?.bio || ''}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
              placeholder="Tell people about yourself and your work..."
              style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {message && <p style={{ color: message.includes('Error') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '16px' }}>{message}</p>}

          <button onClick={handleSave} disabled={saving} style={{ width: '100%', background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}