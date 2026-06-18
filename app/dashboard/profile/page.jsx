'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const getProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const uid = sessionData.session.user.id
      setUserId(uid)
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single()
      if (error) { setMessage('Error loading profile: ' + error.message); setLoading(false); return }
      setProfile(data)
      setLoading(false)
    }
    getProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    if (!userId) { setMessage('Not logged in. Please refresh.'); setSaving(false); return }
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone,
      bio: profile.bio,
      city: profile.city,
      state: profile.state,
      address_line: profile.address_line,
      company_name: profile.company_name,
      experience_years: profile.experience_years ? Number(profile.experience_years) : null,
      profile_completed: true,
    }).eq('id', userId)
    setSaving(false)
    if (error) { setMessage('Error: ' + error.message); return }
    setMessage('Profile saved successfully!')
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setMessage('File too large. Max 5MB.'); return }
    setUploading(true)
    setMessage('')
    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })
    if (uploadError) {
      setMessage('Upload error: ' + uploadError.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const { error: updateError } = await supabase.from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId)
    if (updateError) {
      setMessage('Photo uploaded but save failed: ' + updateError.message)
      setUploading(false)
      return
    }
    setProfile({ ...profile, avatar_url: data.publicUrl })
    setMessage('Photo updated successfully!')
    setUploading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Dashboard</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '32px' }}>Edit Profile</h1>

        {/* Avatar upload */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '88px', height: '88px', borderRadius: '50%', background: '#F5EFE6', border: '2px solid #8B5E3C', margin: '0 auto 20px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '32px', fontWeight: '800', color: '#8B5E3C' }}>{profile?.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
            }
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ background: uploading ? '#EEE6DA' : '#1A1A1A', color: uploading ? '#999999' : '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700' }}
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
          <p style={{ color: '#999999', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>JPG, PNG or WebP. Max 5MB.</p>
        </div>

        {/* Form */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px' }}>
          {[
            { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Your full name' },
            { label: 'Phone', key: 'phone', type: 'text', placeholder: '+234 800 000 0000' },
            { label: 'City', key: 'city', type: 'text', placeholder: 'e.g. Lagos' },
            { label: 'State', key: 'state', type: 'text', placeholder: 'e.g. Lagos State' },
            { label: 'Address', key: 'address_line', type: 'text', placeholder: 'Your street address' },
            { label: 'Company Name (optional)', key: 'company_name', type: 'text', placeholder: 'Your business name' },
            { label: 'Years of Experience', key: 'experience_years', type: 'number', placeholder: 'e.g. 5' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
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

          {message && (
            <p style={{ color: message.includes('Error') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>
              {message}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', background: saving ? '#EEE6DA' : '#1A1A1A', color: saving ? '#999999' : '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}