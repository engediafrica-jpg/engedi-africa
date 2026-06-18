'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const trades = ['All', 'Bricklayer', 'Electrician', 'Plumber', 'Carpenter', 'Welder', 'Painter', 'Tiler', 'POP Installer', 'Roofer', 'Steel Fixer', 'Mason']
const states = ['All', 'Lagos', 'Abuja', 'Rivers', 'Kano', 'Oyo', 'Anambra', 'Delta', 'Enugu', 'Ogun', 'Kaduna']

export default function BrowsePage() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [trade, setTrade] = useState('All')
  const [state, setState] = useState('All')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('artisans')

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const roles = activeTab === 'artisans' ? ['artisan'] : activeTab === 'suppliers' ? ['supplier'] : ['professional']
      const { data } = await supabase.from('profiles').select('*').in('role', roles).eq('profile_completed', true)
      setUsers(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    getData()
  }, [activeTab])

  useEffect(() => {
    let results = [...users]
    if (search) results = results.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.bio?.toLowerCase().includes(search.toLowerCase()))
    if (state !== 'All') results = results.filter(u => u.state === state)
    setFiltered(results)
  }, [search, state, users])

  const roleLabel = { artisan: 'Artisan', supplier: 'Supplier', professional: 'Professional' }
  const getProfileLink = (user) => {
    if (user.role === 'artisan') return `/artisans/${user.id}`
    if (user.role === 'supplier') return `/suppliers/${user.id}`
    return `/professionals/${user.id}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1A1A1A', marginBottom: '8px' }}>Find Professionals</h1>
        <p style={{ color: '#666666', fontSize: '15px', marginBottom: '32px' }}>Browse verified artisans, suppliers, and professionals across Nigeria</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {['artisans', 'suppliers', 'professionals'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setLoading(true) }}
              style={{ padding: '10px 20px', borderRadius: '8px', border: `1.5px solid ${activeTab === tab ? '#1A1A1A' : '#EEE6DA'}`, background: activeTab === tab ? '#1A1A1A' : '#FFFFFF', color: activeTab === tab ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '14px', cursor: 'pointer', textTransform: 'capitalize' }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name or skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}
          />
          <select
            value={state}
            onChange={e => setState(e.target.value)}
            style={{ padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#FFFFFF', minWidth: '140px' }}
          >
            {states.map(s => <option key={s} value={s}>{s === 'All' ? 'All States' : s}</option>)}
          </select>
        </div>

        {loading
          ? <p style={{ color: '#666666' }}>Loading...</p>
          : filtered.length === 0
            ? <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
                <p style={{ color: '#999999', fontSize: '15px', margin: 0 }}>No results found. Try a different search.</p>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filtered.map(user => (
                  <Link key={user.id} href={getProfileLink(user)} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#F5EFE6', border: '2px solid #8B5E3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#8B5E3C', fontSize: '20px', overflow: 'hidden', flexShrink: 0 }}>
                          {user.avatar_url
                            ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : user.full_name?.charAt(0)?.toUpperCase()
                          }
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{user.full_name}</p>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>{roleLabel[user.role]}</span>
                            {user.is_verified && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>✓ Verified</span>}
                          </div>
                        </div>
                      </div>
                      {user.bio && <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 12px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{user.bio}</p>}
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#999999' }}>
                        {user.city && <span>📍 {user.city}{user.state ? `, ${user.state}` : ''}</span>}
                        {user.experience_years && <span>⏱ {user.experience_years} yrs exp</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
        }
      </div>
    </div>
  )
}