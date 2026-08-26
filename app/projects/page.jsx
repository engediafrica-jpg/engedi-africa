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
  planning: { bg: '#1a1a0a', color: '#e08554', border: '#e0855444' },
  active: { bg: '#0a1a2e', color: '#86a98b', border: '#86a98b44' },
  on_hold: { bg: '#1a1200', color: '#F59E0B', border: '#F59E0B44' },
  completed: { bg: '#0a1a0f', color: '#86a98b', border: '#86a98b44' },
}

export default function ProjectsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newProject, setNewProject] = useState({ title: '', description: '', state: '', city: '', budget: '' })
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('all') // all | owned | member

  const inputStyle = { width: '100%', padding: '12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const userId = sessionData.session.user.id

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(profileData)

      // Projects this user owns
      const { data: owned, error: ownedError } = await supabase
        .from('projects')
        .select('*, project_stages(id, status)')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
      if (ownedError) console.log('Owned projects error:', ownedError)

      // Projects this user has been added to as a team member
      const { data: memberRows, error: memberError } = await supabase
        .from('project_members')
        .select('project:projects(*, project_stages(id, status))')
        .eq('user_id', userId)
      if (memberError) console.log('Member projects error:', memberError)

      const ownedList = (owned || []).map(p => ({ ...p, _relationship: 'owner' }))
      const memberList = (memberRows || [])
        .map(row => row.project)
        .filter(Boolean)
        .map(p => ({ ...p, _relationship: 'member' }))

      // De-dupe in case someone is both owner and member (shouldn't normally happen, but safe)
      const seen = new Set()
      const combined = [...ownedList, ...memberList].filter(p => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setProjects(combined)
      setLoading(false)
    }
    getData()
  }, [])

  const handleCreate = async () => {
    if (!newProject.title) { setMessage('Please enter a project title'); return }
    setCreating(true)
    setMessage('')
    const location = [newProject.city, newProject.state].filter(Boolean).join(', ')
    const { data, error } = await supabase.from('projects').insert({
      owner_id: profile.id,
      title: newProject.title,
      description: newProject.description || null,
      location: location || null,
      budget: newProject.budget ? Number(newProject.budget) : null,
      status: 'planning',
    }).select('*, project_stages(id, status)').single()

    if (error) {
      console.log('Create error:', error)
      setMessage('Error: ' + error.message)
      setCreating(false)
      return
    }

    const defaultStages = [
      { title: 'Foundation', order_index: 0 },
      { title: 'Walling', order_index: 1 },
      { title: 'Roofing', order_index: 2 },
      { title: 'Plumbing', order_index: 3 },
      { title: 'Electrical', order_index: 4 },
      { title: 'Finishing', order_index: 5 },
    ]

    await supabase.from('project_stages').insert(
      defaultStages.map(s => ({ ...s, project_id: data.id, status: 'pending' }))
    )

    setProjects([{ ...data, project_stages: defaultStages.map(s => ({ ...s, status: 'pending' })), _relationship: 'owner' }, ...projects])
    setNewProject({ title: '', description: '', state: '', city: '', budget: '' })
    setShowForm(false)
    setCreating(false)
    router.push(`/projects/${data.id}`)
  }

  const getProgress = (stages) => {
    if (!stages || stages.length === 0) return 0
    return Math.round((stages.filter(s => s.status === 'completed').length / stages.length) * 100)
  }

  const visibleProjects = projects.filter(p => {
    if (filter === 'owned') return p._relationship === 'owner'
    if (filter === 'member') return p._relationship === 'member'
    return true
  })

  const ownedCount = projects.filter(p => p._relationship === 'owner').length
  const memberCount = projects.filter(p => p._relationship === 'member').length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: C.muted, textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.text, margin: '0 0 6px' }}>Project Hub</h1>
            <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>Manage your construction projects from start to finish</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ background: C.clay, color: C.sunk, border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            + New Project
          </button>
        </div>

        {/* Filter tabs — only show if there's a mix worth filtering */}
        {(ownedCount > 0 && memberCount > 0) && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[
              { key: 'all', label: `All (${projects.length})` },
              { key: 'owned', label: `My Projects (${ownedCount})` },
              { key: 'member', label: `Invited To (${memberCount})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${filter === tab.key ? C.clay : C.line}`, background: filter === tab.key ? C.clay : 'transparent', color: filter === tab.key ? C.sunk : C.muted, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {message && <p style={{ color: message.includes('Error') ? C.danger : C.oasis, fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {/* New project form */}
        {showForm && (
          <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: C.text, margin: '0 0 20px' }}>Create New Project</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Title *</label>
                <input type="text" placeholder="e.g. Lekki 3-Bedroom Bungalow" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>State</label>
                  <select value={newProject.state} onChange={e => setNewProject({ ...newProject, state: e.target.value })}
                    style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="" style={{ background: C.sunk }}>Select state</option>
                    {nigeriaStates.map(s => <option key={s} value={s} style={{ background: C.sunk }}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>City / Area</label>
                  <input type="text" placeholder="e.g. Lekki Phase 1" value={newProject.city} onChange={e => setNewProject({ ...newProject, city: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Budget (₦)</label>
                  <input type="number" placeholder="e.g. 15000000" value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                <textarea placeholder="Describe your project..." value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setShowForm(false); setMessage('') }}
                style={{ flex: 1, background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                style={{ flex: 2, background: creating ? C.line : C.clay, color: creating ? C.muted : C.sunk, border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: creating ? 'not-allowed' : 'pointer' }}>
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        )}

        {/* Projects list */}
        {visibleProjects.length === 0 ? (
          <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>
              {filter === 'member' ? 'No projects you\'ve been invited to yet' : 'No projects yet'}
            </p>
            <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 20px' }}>
              {filter === 'member' ? 'When a project owner adds you to their team, it\'ll show up here' : 'Create your first project to start tracking your build'}
            </p>
            {filter !== 'member' && (
              <button onClick={() => setShowForm(true)}
                style={{ background: C.clay, color: C.sunk, border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Create First Project
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {visibleProjects.map(project => {
              const progress = getProgress(project.project_stages)
              const statusStyle = statusColors[project.status] || statusColors.planning
              return (
                <Link key={project.id} href={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '22px', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.clay}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.line}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: C.text, margin: 0, flex: 1 }}>{project.title}</h3>
                      <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', flexShrink: 0, textTransform: 'capitalize' }}>
                        {project.status?.replace('_', ' ')}
                      </span>
                    </div>
                    {project._relationship === 'member' && (
                      <span style={{ display: 'inline-block', background: C.sunk, border: `1px solid ${C.clay}44`, color: C.clay, fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', marginBottom: '10px' }}>
                        You're a team member
                      </span>
                    )}
                    {project.location && <p style={{ fontSize: '12px', color: C.muted, margin: '0 0 6px' }}>📍 {project.location}</p>}
                    {project.budget && <p style={{ fontSize: '12px', color: C.muted, margin: '0 0 14px' }}>₦{Number(project.budget).toLocaleString()}</p>}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: C.clay }}>{progress}%</span>
                      </div>
                      <div style={{ background: C.line, borderRadius: '20px', height: '3px', overflow: 'hidden' }}>
                        <div style={{ background: progress === 100 ? C.oasis : C.clay, height: '100%', borderRadius: '20px', width: `${progress}%` }}></div>
                      </div>
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