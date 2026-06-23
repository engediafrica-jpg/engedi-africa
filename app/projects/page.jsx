'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const statusColors = {
  planning: { bg: '#F5EFE6', color: '#8B5E3C', border: '#8B5E3C' },
  active: { bg: '#EEF2FF', color: '#6366F1', border: '#6366F1' },
  on_hold: { bg: '#FFF8F0', color: '#F59E0B', border: '#F59E0B' },
  completed: { bg: '#e8f8f0', color: '#27ae60', border: '#2ecc71' },
}

export default function ProjectsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newProject, setNewProject] = useState({ title: '', description: '', location: '', budget: '' })
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(profileData)
      const { data } = await supabase
        .from('projects')
        .select('*, project_stages(id, status)')
        .eq('owner_id', sessionData.session.user.id)
        .order('created_at', { ascending: false })
      setProjects(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleCreate = async () => {
    if (!newProject.title) { setMessage('Please enter a project title'); return }
    setCreating(true)
    const { data, error } = await supabase.from('projects').insert({
      owner_id: profile.id,
      title: newProject.title,
      description: newProject.description,
      location: newProject.location,
      budget: newProject.budget ? Number(newProject.budget) : null,
      status: 'planning',
    }).select('*, project_stages(id, status)').single()
    if (error) { setMessage('Error creating project'); setCreating(false); return }

    // Create default stages
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

    setProjects([{ ...data, project_stages: defaultStages.map(s => ({ ...s, status: 'pending' })) }, ...projects])
    setNewProject({ title: '', description: '', location: '', budget: '' })
    setShowForm(false)
    setCreating(false)
    router.push(`/projects/${data.id}`)
  }

  const getProgress = (stages) => {
    if (!stages || stages.length === 0) return 0
    const done = stages.filter(s => s.status === 'completed').length
    return Math.round((done / stages.length) * 100)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Project Hub</h1>
            <p style={{ color: '#666666', fontSize: '15px', margin: 0 }}>Manage your construction projects from start to finish</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            + New Project
          </button>
        </div>

        {message && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '16px' }}>{message}</p>}

        {/* New project form */}
        {showForm && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #8B5E3C', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 20px' }}>Create New Project</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Project Title *</label>
                <input type="text" placeholder="e.g. Lekki 3-Bedroom Bungalow" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Location</label>
                <input type="text" placeholder="e.g. Lekki Phase 1, Lagos" value={newProject.location} onChange={e => setNewProject({ ...newProject, location: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Total Budget (₦)</label>
                <input type="number" placeholder="e.g. 15000000" value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Description</label>
              <textarea placeholder="Describe your project..." value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} rows={3}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} style={{ flex: 2, background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        )}

        {/* Projects list */}
        {projects.length === 0
          ? (
            <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
              <p style={{ color: '#999999', fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No projects yet</p>
              <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 20px' }}>Create your first project to start tracking your build</p>
              <button onClick={() => setShowForm(true)} style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Create First Project
              </button>
            </div>
          )
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {projects.map(project => {
                const progress = getProgress(project.project_stages)
                const statusStyle = statusColors[project.status] || statusColors.planning
                return (
                  <Link key={project.id} href={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: 0, flex: 1, paddingRight: '12px' }}>{project.title}</h3>
                        <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', flexShrink: 0, textTransform: 'capitalize' }}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      {project.location && <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 8px' }}>📍 {project.location}</p>}
                      {project.budget && <p style={{ fontSize: '13px', color: '#666666', margin: '0 0 12px' }}>💰 Budget: ₦{Number(project.budget).toLocaleString()}</p>}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#666666' }}>Progress</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#1A1A1A' }}>{progress}%</span>
                        </div>
                        <div style={{ background: '#EEE6DA', borderRadius: '20px', height: '6px', overflow: 'hidden' }}>
                          <div style={{ background: progress === 100 ? '#2ecc71' : '#8B5E3C', height: '100%', borderRadius: '20px', width: `${progress}%`, transition: 'width 0.3s' }}></div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        }
      </div>
    </div>
  )
}