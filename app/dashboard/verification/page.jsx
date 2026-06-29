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
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const getProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const uid = sessionData.session.user.id
      setUserId(uid)
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
      setProfile(data)
      setLoading(false)
    }
    getProfile()
  }, [])

  const handleUpload = async (e, docType) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setMessage('File too large. Max 10MB.'); return }
    setUploading(docType)
    setMessage('')
    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}/${docType}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('verification-docs')
      .upload(filePath, file, { upsert: true })
    if (uploadError) { setMessage('Upload failed: ' + uploadError.message); setUploading(''); return }

    const fieldMap = {
      id: 'id_document_url',
      cac: 'cac_document_url',
      license: 'professional_license_url',
    }
    const updateField = fieldMap[docType]
    const { error: updateError } = await supabase.from('profiles')
      .update({ [updateField]: filePath, documents_submitted: true })
      .eq('id', userId)
    if (updateError) { setMessage('Upload saved but profile not updated: ' + updateError.message); setUploading(''); return }
    setProfile({ ...profile, [updateField]: filePath, documents_submitted: true })
    setMessage('Document uploaded successfully!')
    setUploading('')
  }

  const UploadCard = ({ title, desc, docType, uploaded, icon }) => (
    <div style={{ background: '#FFFFFF', border: `1.5px solid ${uploaded ? '#2ecc71' : '#EEE6DA'}`, borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>{title}</h3>
            {uploaded && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>✓ Uploaded</span>}
          </div>
          <p style={{ fontSize: '13px', color: '#666666', margin: 0, lineHeight: '1.5' }}>{desc}</p>
        </div>
        <div>
          {uploaded ? (
            <label style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'inline-block' }}>
              Replace
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, docType)} style={{ display: 'none' }} />
            </label>
          ) : (
            <label style={{ background: uploading === docType ? '#EEE6DA' : '#1A1A1A', color: uploading === docType ? '#999999' : '#FFFFFF', padding: '10px 20px', borderRadius: '8px', cursor: uploading === docType ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700', display: 'inline-block' }}>
              {uploading === docType ? 'Uploading...' : 'Upload'}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, docType)} style={{ display: 'none' }} disabled={uploading === docType} />
            </label>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading...</p>
    </div>
  )

  const statusColor = {
    approved: '#2ecc71',
    rejected: '#c0392b',
    pending: '#8B5E3C',
  }[profile?.verification_status] || '#8B5E3C'

  const businessRoles = ['supplier', 'service_provider', 'equipment_provider']
  const isBusinessRole = businessRoles.includes(profile?.role)
  const isProfessional = profile?.role === 'professional'

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Dashboard</Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '8px' }}>Verification</h1>
        <p style={{ color: '#666666', fontSize: '14px', marginBottom: '32px' }}>
          Upload your documents to get the EnGedi Verified badge and build trust with clients.
        </p>

        {/* Status */}
        <div style={{ background: '#FFFFFF', border: `1.5px solid ${statusColor}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColor, flexShrink: 0 }}></div>
            <p style={{ margin: 0, fontWeight: '700', color: statusColor, fontSize: '15px', textTransform: 'capitalize' }}>
              {profile?.verification_status === 'approved'
                ? '✓ Verified — Your account is verified'
                : profile?.verification_status === 'rejected'
                ? 'Verification rejected'
                : profile?.documents_submitted
                ? 'Documents submitted — Under review'
                : 'Not yet submitted'}
            </p>
          </div>
          {profile?.admin_notes && (
            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#666666', paddingLeft: '20px' }}>{profile.admin_notes}</p>
          )}
        </div>

        {message && (
          <p style={{ color: message.includes('failed') || message.includes('Error') ? '#c0392b' : '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>
            {message}
          </p>
        )}

        {/* Government ID — required for everyone */}
        <UploadCard
          title="Government-Issued ID"
          desc="NIN slip, Voter's card, Driver's license, or International passport. Required for all users."
          docType="id"
          uploaded={!!profile?.id_document_url}
          icon="🪪"
        />

        {/* CAC Certificate — for business roles */}
        {isBusinessRole && (
          <UploadCard
            title="CAC Certificate"
            desc="Corporate Affairs Commission business registration certificate. Required for suppliers, service providers, and equipment providers."
            docType="cac"
            uploaded={!!profile?.cac_document_url}
            icon="🏢"
          />
        )}

        {/* Professional License — for professionals */}
        {isProfessional && (
          <UploadCard
            title="Professional License"
            desc="Your license from COREN, ARCON, NIQS, NIA, or any other recognized Nigerian professional body."
            docType="license"
            uploaded={!!profile?.professional_license_url}
            icon="📋"
          />
        )}

        {/* What happens next */}
        <div style={{ background: '#F5EFE6', border: '1px solid #EEE6DA', borderRadius: '12px', padding: '20px', marginTop: '8px' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 10px' }}>What happens after you submit?</p>
          <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 6px', lineHeight: '1.6' }}>✓ Our team reviews your documents within 24-48 hours</p>
          <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 6px', lineHeight: '1.6' }}>✓ You receive a notification when approved or rejected</p>
          <p style={{ fontSize: '13px', color: '#666666', margin: 0, lineHeight: '1.6' }}>✓ Verified users get the EnGedi Verified badge on their profile and receive more enquiries</p>
        </div>
      </div>
    </div>
  )
}