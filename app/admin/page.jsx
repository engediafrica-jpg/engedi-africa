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

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', sessionData.session.user.id).single()
      if (!me?.is_admin) { router.push('/dashboard'); return }
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleVerify = async (userId, status) => {
    setMessage('')
    const { error } = await supabase.from('profiles').update({
      verification_status: status,
      is_verified: status === 'approved',
      admin_notes: note,
    }).eq('id', userId)
    if (error) { setMessage('Error updating'); return }
    setUsers(users.map(u => u.id === userId ? { ...u, verification_status: status, is_verified: status === 'approved', admin_notes: note } : u))
    setSelected(null)
    setNote('')
    setMessage(`User ${status} successfully`)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#666666' }}>Loading...</p></div>

  const roleLabel = {
    project_owner: 'Project Owner',
    artisan: 'Artisan',
    supplier: 'Supplier',
    professional: 'Professional',
    service_provider: 'Service Provider',
    equipment_provider: 'Equipment Provider',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', marginBottom: '8px' }}>Admin Panel</h1>
        <p style={{ color: '#666666', fontSize: '14px', marginBottom: '32px' }}>{users.length} total users</p>

        {message && <p style={{ color: '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {/* User list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {users.map(user => (
            <div key={user.id} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{user.full_name || 'No name'}</p>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#666666' }}>{user.email}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>{roleLabel[user.role] || user.role}</span>
                    <span style={{ background: user.verification_status === 'approved' ? '#e8f8f0' : user.verification_status === 'rejected' ? '#fde8e8' : '#FFF8F0', border: `1px solid ${user.verification_status === 'approved' ? '#2ecc71' : user.verification_status === 'rejected' ? '#c0392b' : '#8B5E3C'}`, color: user.verification_status === 'approved' ? '#2ecc71' : user.verification_status === 'rejected' ? '#c0392b' : '#8B5E3C', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>{user.verification_status || 'pending'}</span>
                    {user.documents_submitted && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#2ecc71', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>Docs Submitted</span>}
                  </div>
                </div>
                <button
                  onClick={() => { setSelected(selected === user.id ? null : user.id); setNote(user.admin_notes || '') }}
                  style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                >
                  {selected === user.id ? 'Close' : 'Review'}
                </button>
              </div>

              {selected === user.id && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #EEE6DA' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Admin Note (optional)</label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Reason for approval or rejection..."
                      style={{ width: '100%', padding: '10px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleVerify(user.id, 'approved')} style={{ background: '#2ecc71', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>✅ Approve</button>
                    <button onClick={() => handleVerify(user.id, 'rejected')} style={{ background: '#c0392b', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>❌ Reject</button>
                    <button onClick={() => handleVerify(user.id, 'pending')} style={{ background: '#F5EFE6', color: '#8B5E3C', border: '1px solid #8B5E3C', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>Reset to Pending</button>
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