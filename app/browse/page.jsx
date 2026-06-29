'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const states = ['All', 'Lagos', 'Abuja', 'Rivers', 'Kano', 'Oyo', 'Anambra', 'Delta', 'Enugu', 'Ogun', 'Kaduna', 'Katsina', 'Borno', 'Imo', 'Edo']

const tabs = [
  { key: 'artisan', label: 'Artisans', desc: 'Skilled tradespeople' },
  { key: 'supplier', label: 'Suppliers', desc: 'Building materials' },
  { key: 'professional', label: 'Professionals', desc: 'Architects, engineers, QS' },
  { key: 'service_provider', label: 'Service Providers', desc: 'Cleaning, security, facility' },
  { key: 'equipment_provider', label: 'Equipment Providers', desc: 'Machinery, truck hire, scaffolding' },
]

const roleLabel = {
  artisan: 'Artisan',
  supplier: 'Supplier',
  professional: 'Professional',
  service_provider: 'Service Provider',
  equipment_provider: 'Equipment Provider',
}

export default function BrowsePage() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState('All')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('artisan')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  useEffect(() => {
    fetchUsers(activeTab)
  }, [activeTab])

  useEffect(() => {
    let results = [...users]
    if (search) results = results.filter(u =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.bio?.toLowerCase().includes(search.toLowerCase()) ||
      u.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.city?.toLowerCase().includes(search.toLowerCase())
    )
    if (state !== 'All') results = results.filter(u => u.state === state)
    if (verifiedOnly) results = results.filter(u => u.is_verified)
    setFiltered(results)
  }, [search, state, verifiedOnly, users])

  const fetchUsers = async (role) => {
    setLoading(true)
    setSearch('')
    setState('All')
    setVerifiedOnly(false)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .eq('profile_completed', true)
      .order('is_verified', { ascending: false })
    setUsers(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  const getProfileLink = (user) => {
    if (user.role === 'artisan') return `/artisans/${user.id}`
    if (user.role === 'supplier') return `/suppliers/${user.id}`
    if (user.role === 'professional') return `/professionals/${user.id}`
    if (user.role === 'service_provider') return `/service-providers/${user.id}`
    if (user.role === 'equipment_provider') return `/equipment-providers/${user.id}`
    return '/browse'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Find Professionals</h1>
        <p style={{ color: '#666666', fontSize: '15px', margin: '0 0 32px' }}>Browse verified artisans, suppliers, and professionals across Nigeria</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{ padding: '10px 18px', borderRadius: '8px', border: `1.5px solid ${activeTab === tab.key ? '#1A1A1A' : '#EEE6DA'}`, background: activeTab === tab.key ? '#1A1A1A' : '#FFFFFF', color: activeTab === tab.key ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 20px' }}>
          {tabs.find(t => t.key === activeTab)?.desc}
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name, skill, or location..."
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
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            style={{ padding: '12px 16px', borderRadius: '8px', border: `1.5px solid ${verifiedOnly ? '#2ecc71' : '#EEE6DA'}`, background: verifiedOnly ? '#e8f8f0' : '#FFFFFF', color: verifiedOnly ? '#27ae60' : '#666666', fontWeight: '700', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {verifiedOnly ? '✓ Verified Only' : 'All Users'}
          </button>
        </div>

        {/* Results count */}
        {!loading && (
          <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 20px' }}>
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'} found
          </p>
        )}

        {/* Results */}
        {loading ? (
          <p style={{ color: '#666666' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#999999', fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No results found</p>
            <p style={{ color: '#999999', fontSize: '13px', margin: 0 }}>Try a different search or filter</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map(user => (
              <Link key={user.id} href={getProfileLink(user)} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#F5EFE6', border: `2px solid ${user.is_verified ? '#2ecc71' : '#8B5E3C'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#8B5E3C', fontSize: '20px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (user.company_name || user.full_name)?.charAt(0)?.toUpperCase()
                      }
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '15px', color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.company_name || user.full_name}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>
                          {roleLabel[user.role]}
                        </span>
                        {user.is_verified && (
                          <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {user.bio && (
                    <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 12px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {user.bio}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#999999', flexWrap: 'wrap' }}>
                    {(user.city || user.state) && (
                      <span>📍 {[user.city, user.state].filter(Boolean).join(', ')}</span>
                    )}
                    {user.experience_years && (
                      <span>⏱ {user.experience_years} yrs exp</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}