'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Badge from '@/components/Badge'

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
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      <div className="mx-auto max-w-[1000px] px-6 py-10">
        <h1 className="m-0 mb-2 text-[28px] font-bold text-text">Find Professionals</h1>
        <p className="m-0 mb-8 text-[15px] text-text-muted">Browse verified artisans, suppliers, and professionals across Nigeria</p>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border px-[18px] py-2.5 text-[13px] font-bold ${activeTab === tab.key ? 'border-text bg-text text-surface' : 'border-line-strong text-text-muted hover:border-text'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p className="m-0 mb-5 text-[13px] text-text-muted">
          {tabs.find(t => t.key === activeTab)?.desc}
        </p>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name, skill, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="min-w-[200px] flex-1 border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
          />
          <select
            value={state}
            onChange={e => setState(e.target.value)}
            className="min-w-[140px] border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
          >
            {states.map(s => <option key={s} value={s}>{s === 'All' ? 'All States' : s}</option>)}
          </select>
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`whitespace-nowrap border px-4 py-3 text-[13px] font-bold ${verifiedOnly ? 'border-oasis bg-oasis-soft text-oasis' : 'border-line-strong text-text-muted hover:border-text'}`}
          >
            {verifiedOnly ? '✓ Verified Only' : 'All Users'}
          </button>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="m-0 mb-5 text-[13px] text-text-muted">
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'} found
          </p>
        )}

        {/* Results */}
        {loading ? (
          <p className="text-text-muted">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="border border-line bg-surface-raised p-16 text-center">
            <p className="m-0 mb-2 text-[15px] font-semibold text-text-muted">No results found</p>
            <p className="m-0 text-[13px] text-text-muted">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {filtered.map(user => (
              <Link key={user.id} href={getProfileLink(user)} className="no-underline">
                <div className="h-full border border-line bg-surface-raised p-6 transition-colors hover:bg-surface-sunk">
                  <div className="mb-3.5 flex items-center gap-3.5">
                    <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${user.is_verified ? 'border-oasis' : 'border-clay'} bg-surface-sunk font-display text-[20px] font-bold text-clay`}>
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                        : (user.company_name || user.full_name)?.charAt(0)?.toUpperCase()
                      }
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="m-0 mb-1 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold text-text">
                        {user.company_name || user.full_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="pending">{roleLabel[user.role]}</Badge>
                        {user.is_verified && <Badge tone="success">Verified</Badge>}
                      </div>
                    </div>
                  </div>

                  {user.bio && (
                    <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-text-muted">
                      {user.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-[12px] text-text-muted">
                    {(user.city || user.state) && (
                      <span>{[user.city, user.state].filter(Boolean).join(', ')}</span>
                    )}
                    {user.experience_years && (
                      <span>{user.experience_years} yrs exp</span>
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
