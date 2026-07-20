'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Input from '@/components/Input'
import Button from '@/components/Button'
import { computeProfileCompleted, getMissingFields, requiresCompanyName } from '@/lib/profileCompletion'

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
    const profileCompleted = computeProfileCompleted(profile)
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone,
      bio: profile.bio,
      city: profile.city,
      state: profile.state,
      address_line: profile.address_line,
      company_name: profile.company_name,
      experience_years: profile.experience_years ? Number(profile.experience_years) : null,
      profile_completed: profileCompleted,
    }).eq('id', userId)
    setSaving(false)
    if (error) { setMessage('Error: ' + error.message); return }
    if (profileCompleted) {
      setMessage('Profile saved successfully!')
    } else {
      const missing = getMissingFields(profile)
      setMessage(`Profile saved — still missing: ${missing.join(', ')}`)
    }
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
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  const fields = [
    { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Your full name' },
    { label: 'Phone', key: 'phone', type: 'text', placeholder: '+234 800 000 0000' },
    { label: 'City', key: 'city', type: 'text', placeholder: 'e.g. Lagos' },
    { label: 'State', key: 'state', type: 'text', placeholder: 'e.g. Lagos State' },
    { label: 'Address', key: 'address_line', type: 'text', placeholder: 'Your street address' },
    { label: requiresCompanyName(profile?.role) ? 'Company Name' : 'Company Name (optional)', key: 'company_name', type: 'text', placeholder: 'Your business name' },
    { label: 'Years of Experience', key: 'experience_years', type: 'number', placeholder: 'e.g. 5' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Back to Dashboard</Link>} />

      <div className="mx-auto max-w-[680px] px-6 py-10">
        <h1 className="mb-8 text-[24px] font-bold">Edit Profile</h1>

        {/* Avatar upload */}
        <div className="ticks mb-6 border border-line bg-surface-raised p-8 text-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mx-auto mb-5 flex h-[88px] w-[88px] cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-clay bg-surface-sunk"
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              : <span className="font-display text-[32px] font-bold text-clay">{profile?.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
            }
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            className="hidden"
          />

          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="solid">
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
          <p className="mt-2 mb-0 text-[12px] text-text-muted">JPG, PNG or WebP. Max 5MB.</p>
        </div>

        {/* Form */}
        <div className="ticks border border-line bg-surface-raised p-8">
          {fields.map(field => (
            <div key={field.key} className="mb-4">
              <Input
                label={field.label}
                type={field.type}
                placeholder={field.placeholder}
                value={profile?.[field.key] || ''}
                onChange={e => setProfile({ ...profile, [field.key]: e.target.value })}
              />
            </div>
          ))}

          <div className="mb-6">
            <label className="mb-1.5 block text-[0.8rem] font-semibold text-text">Bio</label>
            <textarea
              value={profile?.bio || ''}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
              placeholder="Tell people about yourself and your work..."
              className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[0.95rem] text-text outline-none transition-colors focus:border-clay"
            />
          </div>

          {message && (
            <p className={`mb-4 text-[13px] font-semibold ${message.includes('Error') ? 'text-danger' : message.includes('still missing') ? 'text-clay' : 'text-oasis'}`}>
              {message}
            </p>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full justify-center">
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  )
}
