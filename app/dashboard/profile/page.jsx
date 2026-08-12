'use client'
import { useEffect, useState, useRef } from 'react'
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
  clayDeep: '#b85c38',
  danger: '#e2695f',
  dangerSoft: '#2e1712',
  oasis: '#86a98b',
}

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteText, setDeleteText] = useState('')

  useEffect(() => {
    const getProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const uid = sessionData.session.user.id
      setUserId(uid)
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single()
      if (error) { setMessage('Error: ' + error.message); setLoading(false); return }
      setProfile(data)
      setLoading(false)
    }
    getProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    if (!userId) { setMessage('Not logged in'); setSaving(false); return }
    const { data, error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone,
      bio: profile.bio,
      city: profile.city,
      state: profile.state,
      address_line: profile.address_line,
      company_name: profile.company_name,
      experience_years: profile.experience_years ? Number(profile.experience_years) : null,
      profile_completed: true,
    }).eq('id', userId).select()
    setSaving(false)
    if (error) { setMessage('Error: ' + error.message); return }
    if (!data || data.length === 0) { setMessage('No rows updated — contact support'); return }
    setProfile(data[0])
    setMessage('Profile saved!')
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setMessage('Max 5MB'); return }
    setUploading(true)
    setMessage('')
    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) { setMessage('Upload error: ' + uploadError.message); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
    if (updateError) { setMessage('Saved but not updated: ' + updateError.message); setUploading(false); return }
    setProfile({ ...profile, avatar_url: data.publicUrl })
    setMessage('Photo updated!')
    setUploading(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') { setMessage('Type DELETE to confirm'); return }
    setDeleting(true)
    const res = await fetch('/api/delete-account', { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { await supabase.auth.signOut(); router.push('/') }
    else { setMessage('Error: ' + data.error); setDeleting(false) }
  }

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: C.muted, textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.text, marginBottom: '32px' }}>Edit Profile</h1>

        {/* Avatar */}
        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '32px', marginBottom: '20px', textAlign: 'center' }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '84px', height: '84px', borderRadius: '50%', background: C.sunk, border: `2px solid ${C.clay}`, margin: '0 auto 20px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '28px', fontWeight: '800', color: C.clay }}>{profile?.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
            }
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ background: uploading ? C.line : C.clay, color: uploading ? C.muted : C.sunk, border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700' }}>
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
          <p style={{ color: C.muted, fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>JPG, PNG or WebP · Max 5MB</p>
        </div>

        {/* Form */}
        <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '32px', marginBottom: '20px' }}>
          {[
            { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Your full name' },
            { label: 'Phone', key: 'phone', type: 'text', placeholder: '+234 800 000 0000' },
            { label: 'City', key: 'city', type: 'text', placeholder: 'e.g. Lagos' },
            { label: 'State', key: 'state', type: 'text', placeholder: 'e.g. Lagos State' },
            { label: 'Address', key: 'address_line', type: 'text', placeholder: 'Street address' },
            { label: 'Company Name (optional)', key: 'company_name', type: 'text', placeholder: 'Business name' },
            { label: 'Years of Experience', key: 'experience_years', type: 'number', placeholder: 'e.g. 5' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</label>
              <input type={field.type} placeholder={field.placeholder} value={profile?.[field.key] || ''} onChange={e => setProfile({ ...profile, [field.key]: e.target.value })} style={inputStyle} />
            </div>
          ))}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bio</label>
            <textarea value={profile?.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} rows={4}
              placeholder="Tell people about yourself..."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {message && !message.includes('delete') && (
            <p style={{ color: message.includes('Error') ? C.danger : C.oasis, fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>
          )}

          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', background: saving ? C.line : C.clay, color: saving ? C.muted : C.sunk, border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Delete account */}
        <div style={{ background: C.raised, border: `1px solid ${C.danger}22`, borderRadius: '12px', padding: '28px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: C.danger, margin: '0 0 8px' }}>Delete Account</h3>
          <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 16px', lineHeight: '1.6' }}>
            Permanently delete your account and all data. This cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}44`, padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              Delete My Account
            </button>
          ) : (
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: C.danger, marginBottom: '10px' }}>
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input type="text" placeholder="Type DELETE here" value={deleteText} onChange={e => setDeleteText(e.target.value)}
                style={{ ...inputStyle, border: `1px solid ${C.danger}`, marginBottom: '12px' }} />
              {message && <p style={{ color: C.danger, fontSize: '13px', marginBottom: '12px' }}>{message}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteText('') }}
                  style={{ flex: 1, background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleDeleteAccount} disabled={deleting || deleteText !== 'DELETE'}
                  style={{ flex: 2, background: deleteText === 'DELETE' ? C.danger : C.dangerSoft, color: deleteText === 'DELETE' ? '#fff' : C.danger, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: deleteText === 'DELETE' ? 'pointer' : 'not-allowed' }}>
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}