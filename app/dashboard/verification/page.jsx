'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Badge from '@/components/Badge'

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

  const UploadCard = ({ title, desc, docType, uploaded, label }) => (
    <div className={`mb-4 border p-6 ${uploaded ? 'border-oasis' : 'border-line'} bg-surface-raised`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
            <h3 className="m-0 text-[16px] font-bold text-text">{title}</h3>
            {uploaded && <Badge tone="success">Uploaded</Badge>}
          </div>
          <p className="m-0 text-[13px] leading-relaxed text-text-muted">{desc}</p>
        </div>
        <div>
          {uploaded ? (
            <label className="inline-block cursor-pointer border border-clay px-4 py-2 text-[13px] font-semibold text-clay">
              Replace
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, docType)} className="hidden" />
            </label>
          ) : (
            <label className={`inline-block px-5 py-2.5 text-[13px] font-bold ${uploading === docType ? 'cursor-not-allowed bg-surface-sunk text-text-muted' : 'cursor-pointer bg-text text-surface'}`}>
              {uploading === docType ? 'Uploading...' : 'Upload'}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, docType)} className="hidden" disabled={uploading === docType} />
            </label>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  const statusTone = {
    approved: 'success',
    rejected: 'danger',
    pending: 'pending',
  }[profile?.verification_status] || 'pending'

  const businessRoles = ['supplier', 'service_provider', 'equipment_provider']
  const isBusinessRole = businessRoles.includes(profile?.role)
  const isProfessional = profile?.role === 'professional'

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Back to Dashboard</Link>} />

      <div className="mx-auto max-w-[680px] px-6 py-10">
        <h1 className="mb-2 text-[24px] font-bold">Verification</h1>
        <p className="mb-8 text-[14px] text-text-muted">
          Upload your documents to get the EnGedi Verified badge and build trust with clients.
        </p>

        {/* Status */}
        <div className="mb-6 border border-line bg-surface-raised p-5">
          <div className="flex items-center gap-2.5">
            <Badge tone={statusTone}>{profile?.verification_status || 'pending'}</Badge>
            <p className="m-0 text-[15px] font-bold text-text">
              {profile?.verification_status === 'approved'
                ? 'Verified — Your account is verified'
                : profile?.verification_status === 'rejected'
                ? 'Verification rejected'
                : profile?.documents_submitted
                ? 'Documents submitted — Under review'
                : 'Not yet submitted'}
            </p>
          </div>
          {profile?.admin_notes && (
            <p className="mt-2.5 mb-0 pl-1 text-[13px] text-text-muted">{profile.admin_notes}</p>
          )}
        </div>

        {message && (
          <p className={`mb-4 text-[13px] font-semibold ${message.includes('failed') || message.includes('Error') ? 'text-danger' : 'text-oasis'}`}>
            {message}
          </p>
        )}

        {/* Government ID — required for everyone */}
        <UploadCard
          title="Government-Issued ID"
          desc="NIN slip, Voter's card, Driver's license, or International passport. Required for all users."
          docType="id"
          uploaded={!!profile?.id_document_url}
          label="Required"
        />

        {/* CAC Certificate — for business roles */}
        {isBusinessRole && (
          <UploadCard
            title="CAC Certificate"
            desc="Corporate Affairs Commission business registration certificate. Required for suppliers, service providers, and equipment providers."
            docType="cac"
            uploaded={!!profile?.cac_document_url}
            label="Business"
          />
        )}

        {/* Professional License — for professionals */}
        {isProfessional && (
          <UploadCard
            title="Professional License"
            desc="Your license from COREN, ARCON, NIQS, NIA, or any other recognized Nigerian professional body."
            docType="license"
            uploaded={!!profile?.professional_license_url}
            label="Professional"
          />
        )}

        {/* What happens next */}
        <div className="mt-2 border border-line bg-surface-sunk p-5">
          <p className="m-0 mb-2.5 text-[14px] font-bold text-text">What happens after you submit?</p>
          <p className="m-0 mb-1.5 text-[13px] leading-relaxed text-text-muted">Our team reviews your documents within 24-48 hours</p>
          <p className="m-0 mb-1.5 text-[13px] leading-relaxed text-text-muted">You receive a notification when approved or rejected</p>
          <p className="m-0 text-[13px] leading-relaxed text-text-muted">Verified users get the EnGedi Verified badge on their profile and receive more enquiries</p>
        </div>
      </div>
    </div>
  )
}
