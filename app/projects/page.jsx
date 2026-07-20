'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import Input from '@/components/Input'
import useAccessGate from '@/hooks/useAccessGate'
import LockedNotice from '@/components/LockedNotice'

const statusTone = {
  planning: 'pending',
  active: 'pending',
  on_hold: 'pending',
  completed: 'success',
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

  const { locked, checking } = useAccessGate(profile)

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  if (checking) return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  if (locked) return <LockedNotice reason={locked} />

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="m-0 mb-2 text-[26px] font-bold text-text">Project Hub</h1>
            <p className="m-0 text-[15px] text-text-muted">Manage your construction projects from start to finish</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>+ New Project</Button>
        </div>

        {message && <p className="mb-4 text-[13px] text-danger">{message}</p>}

        {/* New project form */}
        {showForm && (
          <div className="ticks mb-6 border border-clay bg-surface-raised p-8">
            <h3 className="m-0 mb-5 text-[16px] font-bold text-text">Create New Project</h3>
            <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <Input label="Project Title *" type="text" placeholder="e.g. Lekki 3-Bedroom Bungalow" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} />
              <Input label="Location" type="text" placeholder="e.g. Lekki Phase 1, Lagos" value={newProject.location} onChange={e => setNewProject({ ...newProject, location: e.target.value })} />
              <Input label="Total Budget (₦)" type="number" placeholder="e.g. 15000000" value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: e.target.value })} />
            </div>
            <div className="mb-5">
              <label className="mb-1.5 block text-[13px] font-semibold text-text">Description</label>
              <textarea placeholder="Describe your project..." value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} rows={3}
                className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
            </div>
            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-[2] justify-center" disabled={creating} onClick={handleCreate}>
                {creating ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        )}

        {/* Projects list */}
        {projects.length === 0
          ? (
            <div className="border border-line bg-surface-raised p-16 text-center">
              <p className="m-0 mb-2 text-[15px] font-semibold text-text-muted">No projects yet</p>
              <p className="m-0 mb-5 text-[13px] text-text-muted">Create your first project to start tracking your build</p>
              <Button onClick={() => setShowForm(true)}>Create First Project</Button>
            </div>
          )
          : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {projects.map(project => {
                const progress = getProgress(project.project_stages)
                return (
                  <Link key={project.id} href={`/projects/${project.id}`} className="no-underline">
                    <div className="h-full border border-line bg-surface-raised p-6 transition-colors hover:bg-surface-sunk">
                      <div className="mb-3 flex items-start justify-between">
                        <h3 className="m-0 flex-1 pr-3 text-[16px] font-bold text-text">{project.title}</h3>
                        <Badge tone={statusTone[project.status] || 'pending'}>{project.status.replace('_', ' ')}</Badge>
                      </div>
                      {project.location && <p className="m-0 mb-2 text-[13px] text-text-muted">{project.location}</p>}
                      {project.budget && <p className="m-0 mb-3 text-[13px] text-text-muted">Budget: ₦{Number(project.budget).toLocaleString()}</p>}
                      <div>
                        <div className="mb-1.5 flex justify-between">
                          <span className="text-[12px] text-text-muted">Progress</span>
                          <span className="font-mono text-[12px] font-bold tabular-nums text-text">{progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden bg-line-strong">
                          <div className={`h-full transition-[width] duration-300 ${progress === 100 ? 'bg-oasis' : 'bg-clay'}`} style={{ width: `${progress}%` }}></div>
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
