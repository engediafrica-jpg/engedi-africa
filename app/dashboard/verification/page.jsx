'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function VerificationPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState('')
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

  const handleUpload = async (e, docType) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(docType)
    const fileExt = file.name.split('.').pop()
    const filePath = `${profile.id}/${docType}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('verification-docs').upload(filePath, file, { upsert: true })
    if (uploadError) { setMessage('Upload failed. Try again.'); setUploading(''); return }
    const updateField = docType === 'id' ? 'id_document_url' : docType === 'cac' ? 'cac_document_url' : 'professional_license_url'
    await supabase.from('profiles').update({ [updateField]: filePath, documents_submitted: true }).eq('id', profile.id)
    setProfile({ ...profile, [updateField]: filePath, documents_submitted: true })
    setMessage('Document uploaded successfully!')
    setUploading('')
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#666666' }}>Loading...</p></div>

  const statusColor = profile?.verification_status === 'approved' ? '#2ecc71' : profile?.verification_status === 'rejected' ? '#c0392b' : '#8B5E3C'

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Dashboard</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '8px' }}>Verification</h1>
        <p style={{ color: '#666666', fontSize: '14px', marginBottom: '32px' }}>Upload your documents to get the EnGedi Verified badge</p>

        {/* Status */}
        <div style={{ background: '#FFFFFF', border: `1.5px solid ${statusColor}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontWeight: '700', color: statusColor, fontSize: '15px' }}>
            Status: {profile?.verification_status?.charAt(0).toUpperCase() + profile?.verification_status?.slice(1) || 'Pending'}
          </p>
          {profile?.admin_notes && <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#666666' }}>{profile.admin_notes}</p>}
        </div>

        {message && <p style={{ color: '#2ecc71', fontSize: '13px', marginBottom: '16px' }}>{message}</p>}

        {/* ID Document */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px' }}>Government ID</h3>
          <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 16px' }}>NIN slip, Voter's card, Driver's license, or International passport</p>
          {profile?.id_document_url
            ? <p style={{ color: '#2ecc71', fontSize: '13px', fontWeight: '600' }}>✅ Uploaded</p>
            : <label style={{ background: '#1A1A1A', color: '#FFFFFF', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                {uploading === 'id' ? 'Uploading...' : 'Upload ID'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, 'id')} style={{ display: 'none' }} />
              </label>
          }
        </div>

        {/* CAC for business roles */}
        {['supplier', 'service_provider', 'equipment_provider'].includes(profile?.role) && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px' }}>CAC Certificate</h3>
            <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 16px' }}>Corporate Affairs Commission business registration</p>
            {profile?.cac_document_url
              ? <p style={{ color: '#2ecc71', fontSize: '13px', fontWeight: '600' }}>✅ Uploaded</p>
              : <label style={{ background: '#1A1A1A', color: '#FFFFFF', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  {uploading === 'cac' ? 'Uploading...' : 'Upload CAC'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, 'cac')} style={{ display: 'none' }} />
                </label>
            }
          </div>
        )}

        {/* Professional license */}
        {profile?.role === 'professional' && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px' }}>Professional License</h3>
            <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 16px' }}>COREN, ARCON, NIQS, or other professional body license</p>
            {profile?.professional_license_url
              ? <p style={{ color: '#2ecc71', fontSize: '13px', fontWeight: '600' }}>✅ Uploaded</p>
              : <label style={{ background: '#1A1A1A', color: '#FFFFFF', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  {uploading === 'license' ? 'Uploading...' : 'Upload License'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, 'license')} style={{ display: 'none' }} />
                </label>
            }
          </div>
        )}

      </div>
    </div>
  )
}