'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const C = {
  surface: '#15120e', raised: '#201a14', sunk: '#0f0c09',
  text: '#f1eae0', muted: '#a79a85', line: '#362d22',
  clay: '#e08554', oasis: '#86a98b', danger: '#e2695f', dangerSoft: '#2e1712',
}

const nigeriaStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

const statusColors = {
  planning: { bg: 'transparent', color: '#a79a85', border: '#362d22' },
  active: { bg: '#0a1a2e', color: '#86a98b', border: '#86a98b44' },
  on_hold: { bg: '#1a1200', color: '#e08554', border: '#e0855444' },
  completed: { bg: '#0a1a0f', color: '#86a98b', border: '#86a98b44' },
}

export default function ProjectsHubPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', city: '', state: '', budget: '' })

  const inputStyle = { width: '100%', padding: '11px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  const loadProjects = async (userId) => {
    const { data: owned, error: ownedError } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId)

    const { data: memberRows, error: memberError } = await supabase
      .from('project_members')
      .select('project:projects(*)')
      .eq('user_id', userId)

    if (ownedError || memberError) {
      console.error('Error loading projects:', ownedError || memberError)
      setFetchError((ownedError || memberError).message)
      setLoading(false)
      return
    }

    const memberProjects = (memberRows || []).map(r => r.project).filter(Boolean)

    const merged = [...(owned || [])]
    memberProjects.forEach(p => {
      if (!merged.some(existing => existing.id === p.id)) merged.push(p)
    })

    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setProjects(merged)
    setLoading(false)
  }

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const userId = sessionData.session.user.id
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(profileData)
      await loadProjects(userId)
    }
    getData()
  }, [])

  const handleCreate = async () => {
    if (!form.title.trim()) { setCreateError('Please enter a project title'); return }
    setCreating(true)
    setCreateError('')

    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session.user.id
    const location = [form.city, form.state].filter(Boolean).join(', ')

    const { data, error } = await supabase.from('projects').insert({
      owner_id: userId,
      title: form.title,
      description: form.description || null,
      location: location || null,
      city: form.city || null,
      state: form.state || null,
      budget: form.budget ? Number(form.budget) : null,
      status: 'planning',
    }).select().single()

    if (error) {
      console.error('Error creating project:', error)
      setCreateError(error.message)
      setCreating(false)
      return
    }

    setProjects([data, ...projects])
    setForm({ title: '', description: '', city: '', state: '', budget: '' })
    setShowCreate(false)
    setCreating(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: C.muted }}>Loading...</p></div>

  if (fetchError) return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: C.raised, border: `1px solid ${C.danger}44`, borderRadius: '12px', padding: '28px', maxWidth: '480px', textAlign: 'center' }}>
        <p style={{ color: C.danger, fontWeight: '700', margin: '0 0 8px' }}>Couldn't load your projects</p>
        <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>{fetchError}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: C.muted, textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.text, margin: '0 0 6px' }}>Projects</h1>
            <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>Projects you own or have been added to as a team member</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            style={{ background: C.clay, color: C.sunk, border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
            {showCreate ? 'Cancel' : '+ New Project'}
          </button>
        </div>

        {showCreate && (
          <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: C.text, margin: '0 0 16px' }}>New Project</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title *</label>
                <input type="text" placeholder="e.g. 4-bedroom duplex in Lekki" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>State</label>
                  <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="" style={{ background: C.sunk }}>Select state</option>
                    {nigeriaStates.map(s => <option key={s} value={s} style={{ background: C.sunk }}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>City / Area</label>
                  <input type="text" placeholder="e.g. Lekki Phase 1" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Budget (₦)</label>
                  <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} style={inputStyle} />
                </div>
              </div>
              {createError && <p style={{ color: C.danger, fontSize: '13px', margin: 0, fontWeight: '600' }}>{createError}</p>}
              <button onClick={handleCreate} disabled={creating}
                style={{ background: C.clay, color: C.sunk, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No projects yet</p>
            <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>Create your first project, or wait to be added to one as a team member</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {projects.map(project => {
              const statusStyle = statusColors[project.status] || statusColors.planning
              const isOwner = project.owner_id === profile?.id
              return (
                <Link key={project.id} href={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '22px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '700', color: C.text, margin: 0 }}>{project.title}</h3>
                          {!isOwner && <span style={{ background: C.sunk, border: `1px solid ${C.clay}44`, color: C.clay, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>Team Member</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {project.location && <span style={{ color: C.muted, fontSize: '13px' }}>📍 {project.location}</span>}
                          {project.budget && <span style={{ color: C.muted, fontSize: '13px' }}>₦{Number(project.budget).toLocaleString()}</span>}
                        </div>
                      </div>
                      <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                        {project.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}