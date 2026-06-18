'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [docUrls, setDocUrls] = useState({})
  const [loadingDocs, setLoadingDocs] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      if (!me?.is_admin) { router.push('/dashboard'); return }
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const loadDocuments = async (user) => {
    setLoadingDocs(true)
    const urls = {}

    if (user.id_document_url) {
      const { data } = await supabase.storage.from('verification-docs').createSignedUrl(user.id_document_url, 3600)
      if (data) urls.id = data.signedUrl
    }
    if (user.cac_document_url) {
      const { data } = await supabase.storage.from('verification-docs').createSignedUrl(user.cac_document_url, 3600)
      if (data) urls.cac = data.signedUrl
    }
    if (user.professional_license_url) {
      const { data } = await supabase.storage.from('verification-docs').createSignedUrl(user.professional_license_url, 3600)
      if (data) urls.license = data.signedUrl
    }

    setDocUrls(urls)
    setLoadingDocs(false)
  }

  const handleSelect = async (user) => {
    if (selected?.id === user.id) {
      setSelected(null)
      setDocUrls({})
      return
    }
    setSelected(user)
    setNote(user.admin_notes || '')
    await loadDocuments(user)
  }

  const handleVerify = async (userId, status) => {
    setMessage('')
    const { error } = await supabase.from('profiles').update({
      verification_status: status,
      is_verified: status === 'approved',
      admin_notes: note,
    }).eq('id', userId)
    if (error) { setMessage('Error updating'); return }
    setUsers(users.map(u => u.id === userId
      ? { ...u, verification_status: status, is_verified: status === 'approved', admin_notes: note }
      : u
    ))
    setSelected(null)
    setDocUrls({})
    setNote('')
    setMessage(`User ${status} successfully`)
  }

  const roleLabel = {
    project_owner: 'Project Owner',
    artisan: 'Artisan',
    supplier: 'Supplier',
    professional: 'Professional',
    service_provider: 'Service Provider',
    equipment_provider: 'Equipment Provider',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading admin panel...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '4px' }}>Admin Panel</h1>
        <p style={{ color: '#666666', fontSize: '14px', marginBottom: '32px' }}>{users.length} total users</p>

        {message && <p style={{ color: '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {users.map(user => (
            <div key={user.id} style={{ background: '#FFFFFF', border: `1.5px solid ${selected?.id === user.id ? '#8B5E3C' : '#EEE6DA'}`, borderRadius: '12px', padding: '20px' }}>

              {/* User row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F5EFE6', border: `2px solid ${user.is_verified ? '#2ecc71' : '#8B5E3C'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#8B5E3C', fontSize: '18px', overflow: 'hidden' }}>
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : user.full_name?.charAt(0)?.toUpperCase() || '?'
                      }
                    </div>
                    {user.is_verified && (
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderRadius: '50%', background: '#2ecc71', border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#FFFFFF', fontSize: '9px', fontWeight: '800' }}>✓</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{user.full_name || 'No name'}</p>
                      {user.is_admin && <span style={{ background: '#1A1A1A', color: '#FFFFFF', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>ADMIN</span>}
                      {user.is_verified && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>✓ VERIFIED</span>}
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#666666' }}>{user.email}</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>
                        {roleLabel[user.role] || user.role || 'No role'}
                      </span>
                      <span style={{
                        background: user.verification_status === 'approved' ? '#e8f8f0' : user.verification_status === 'rejected' ? '#fde8e8' : '#FFF8F0',
                        border: `1px solid ${user.verification_status === 'approved' ? '#2ecc71' : user.verification_status === 'rejected' ? '#c0392b' : '#8B5E3C'}`,
                        color: user.verification_status === 'approved' ? '#27ae60' : user.verification_status === 'rejected' ? '#c0392b' : '#8B5E3C',
                        fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px'
                      }}>
                        {user.verification_status || 'pending'}
                      </span>
                      {user.documents_submitted && (
                        <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>
                          Docs Submitted
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelect(user)}
                  style={{ background: selected?.id === user.id ? '#1A1A1A' : '#F5EFE6', border: `1px solid ${selected?.id === user.id ? '#1A1A1A' : '#8B5E3C'}`, color: selected?.id === user.id ? '#FFFFFF' : '#8B5E3C', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                >
                  {selected?.id === user.id ? 'Close' : 'Review'}
                </button>
              </div>

              {/* Review panel */}
              {selected?.id === user.id && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #EEE6DA' }}>

                  {/* User details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    {[
                      { label: 'Phone', value: user.phone },
                      { label: 'City', value: user.city },
                      { label: 'State', value: user.state },
                      { label: 'Company', value: user.company_name },
                      { label: 'Experience', value: user.experience_years ? `${user.experience_years} years` : null },
                      { label: 'Professional Body', value: user.professional_body },
                      { label: 'License Number', value: user.professional_license_number },
                      { label: 'CAC Number', value: user.cac_number },
                    ].filter(f => f.value).map(field => (
                      <div key={field.label} style={{ background: '#F9F6F1', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' }}>{field.label}</p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#1A1A1A', fontWeight: '600' }}>{field.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bio */}
                  {user.bio && (
                    <div style={{ background: '#F9F6F1', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                      <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#999999', fontWeight: '600', textTransform: 'uppercase' }}>Bio</p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#1A1A1A', lineHeight: '1.6' }}>{user.bio}</p>
                    </div>
                  )}

                  {/* Documents */}
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>Uploaded Documents</p>
                    {loadingDocs ? (
                      <p style={{ color: '#999999', fontSize: '13px' }}>Loading documents...</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {docUrls.id ? (
                          <a href={docUrls.id} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F9F6F1', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid #EEE6DA' }}>
                            <span style={{ fontSize: '20px' }}>🪪</span>
                            <div>
                              <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>Government ID</p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#8B5E3C', fontWeight: '600' }}>Click to view document →</p>
                            </div>
                          </a>
                        ) : user.id_document_url ? (
                          <div style={{ background: '#F9F6F1', padding: '14px', borderRadius: '10px', border: '1px solid #EEE6DA' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#999999' }}>🪪 Government ID — link expired, reload to refresh</p>
                          </div>
                        ) : (
                          <div style={{ background: '#F9F6F1', padding: '14px', borderRadius: '10px', border: '1px solid #EEE6DA' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#999999' }}>🪪 No government ID uploaded</p>
                          </div>
                        )}

                        {docUrls.cac ? (
                          <a href={docUrls.cac} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F9F6F1', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid #EEE6DA' }}>
                            <span style={{ fontSize: '20px' }}>🏢</span>
                            <div>
                              <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>CAC Certificate</p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#8B5E3C', fontWeight: '600' }}>Click to view document →</p>
                            </div>
                          </a>
                        ) : user.cac_document_url && (
                          <div style={{ background: '#F9F6F1', padding: '14px', borderRadius: '10px', border: '1px solid #EEE6DA' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#999999' }}>🏢 CAC Certificate — link expired, reload to refresh</p>
                          </div>
                        )}

                        {docUrls.license ? (
                          <a href={docUrls.license} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F9F6F1', padding: '14px', borderRadius: '10px', textDecoration: 'none', border: '1px solid #EEE6DA' }}>
                            <span style={{ fontSize: '20px' }}>📋</span>
                            <div>
                              <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>Professional License</p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#8B5E3C', fontWeight: '600' }}>Click to view document →</p>
                            </div>
                          </a>
                        ) : user.professional_license_url && (
                          <div style={{ background: '#F9F6F1', padding: '14px', borderRadius: '10px', border: '1px solid #EEE6DA' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#999999' }}>📋 Professional License — link expired, reload to refresh</p>
                          </div>
                        )}

                        {!user.id_document_url && !user.cac_document_url && !user.professional_license_url && (
                          <p style={{ color: '#999999', fontSize: '13px', margin: 0 }}>No documents uploaded yet</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Admin note */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Admin Note (shown to user)</label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Reason for approval or rejection..."
                      style={{ width: '100%', padding: '10px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleVerify(user.id, 'approved')} style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>✅ Approve</button>
                    <button onClick={() => handleVerify(user.id, 'rejected')} style={{ background: '#c0392b', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>❌ Reject</button>
                    <button onClick={() => handleVerify(user.id, 'pending')} style={{ background: '#F5EFE6', color: '#8B5E3C', border: '1px solid #8B5E3C', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>Reset to Pending</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}