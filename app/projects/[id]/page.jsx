'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import useAccessGate from '@/hooks/useAccessGate'
import LockedNotice from '@/components/LockedNotice'

const stageStatusOptions = ['pending', 'in_progress', 'completed']
const stageStatusTone = {
  pending: 'neutral',
  in_progress: 'pending',
  completed: 'success',
}
const projectStatusOptions = ['planning', 'active', 'on_hold', 'completed']

export default function ProjectDetailPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const [project, setProject] = useState(null)
  const [stages, setStages] = useState([])
  const [members, setMembers] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stages')
  const [updatingStage, setUpdatingStage] = useState(null)
  const [showAddStage, setShowAddStage] = useState(false)
  const [newStageTitle, setNewStageTitle] = useState('')
  const [message, setMessage] = useState('')
  const [editingProject, setEditingProject] = useState(false)
  const [projectForm, setProjectForm] = useState({})

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(profileData)
      const { data: projectData } = await supabase.from('projects').select('*').eq('id', params.id).single()
      if (!projectData) { router.push('/projects'); return }
      setProject(projectData)
      setProjectForm(projectData)
      const { data: stagesData } = await supabase.from('project_stages').select('*').eq('project_id', params.id).order('order_index', { ascending: true })
      setStages(stagesData || [])
      const { data: membersData } = await supabase.from('project_members').select('*, user:profiles(full_name, role, avatar_url, is_verified)').eq('project_id', params.id)
      setMembers(membersData || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleUpdateStage = async (stageId, newStatus) => {
    setUpdatingStage(stageId)
    const { error } = await supabase.from('project_stages').update({ status: newStatus }).eq('id', stageId)
    if (!error) setStages(stages.map(s => s.id === stageId ? { ...s, status: newStatus } : s))
    setUpdatingStage(null)
  }

  const handleAddStage = async () => {
    if (!newStageTitle.trim()) return
    const { data, error } = await supabase.from('project_stages').insert({
      project_id: project.id,
      title: newStageTitle,
      status: 'pending',
      order_index: stages.length,
    }).select().single()
    if (!error && data) {
      setStages([...stages, data])
      setNewStageTitle('')
      setShowAddStage(false)
    }
  }

  const handleUpdateProject = async () => {
    const { error } = await supabase.from('projects').update({
      title: projectForm.title,
      description: projectForm.description,
      location: projectForm.location,
      budget: projectForm.budget ? Number(projectForm.budget) : null,
      status: projectForm.status,
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    if (!error) {
      setProject({ ...project, ...projectForm })
      setEditingProject(false)
      setMessage('Project updated!')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const getProgress = () => {
    if (stages.length === 0) return 0
    return Math.round((stages.filter(s => s.status === 'completed').length / stages.length) * 100)
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

  const progress = getProgress()
  const isOwner = profile?.id === project?.owner_id

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/projects" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← All Projects</Link>} />

      <div className="mx-auto max-w-[900px] px-6 py-10">

        {/* Project header */}
        <div className="mb-6 border border-clay-deep bg-ink p-8">
          {editingProject ? (
            <div>
              <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">TITLE</label>
                  <input type="text" value={projectForm.title || ''} onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                    className="w-full border border-line-strong bg-surface-sunk px-2.5 py-2.5 text-[14px] text-ink-text outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">LOCATION</label>
                  <input type="text" value={projectForm.location || ''} onChange={e => setProjectForm({ ...projectForm, location: e.target.value })}
                    className="w-full border border-line-strong bg-surface-sunk px-2.5 py-2.5 text-[14px] text-ink-text outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">BUDGET (₦)</label>
                  <input type="number" value={projectForm.budget || ''} onChange={e => setProjectForm({ ...projectForm, budget: e.target.value })}
                    className="w-full border border-line-strong bg-surface-sunk px-2.5 py-2.5 text-[14px] text-ink-text outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">STATUS</label>
                  <select value={projectForm.status || 'planning'} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="w-full border border-line-strong bg-surface-sunk px-2.5 py-2.5 text-[14px] text-ink-text outline-none">
                    {projectStatusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Button variant="outline" className="flex-1 justify-center border-line-strong text-ink-muted" onClick={() => setEditingProject(false)}>Cancel</Button>
                <Button className="flex-[2] justify-center" onClick={handleUpdateProject}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="m-0 mb-2 text-[24px] font-bold text-ink-text">{project.title}</h1>
                  <div className="flex flex-wrap items-center gap-3">
                    {project.location && <span className="text-[13px] text-ink-muted">{project.location}</span>}
                    {project.budget && <span className="text-[13px] text-ink-muted">₦{Number(project.budget).toLocaleString()}</span>}
                    <Badge tone="neutral">{project.status?.replace('_', ' ')}</Badge>
                  </div>
                  {project.description && <p className="m-0 mt-2.5 text-[14px] leading-relaxed text-ink-muted">{project.description}</p>}
                </div>
                {isOwner && (
                  <Button variant="outline" className="border-line-strong text-ink-text hover:border-ink-text" onClick={() => setEditingProject(true)}>Edit</Button>
                )}
              </div>

              {/* Progress */}
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="text-[13px] text-ink-muted">Overall Progress</span>
                  <span className="font-mono text-[13px] font-bold tabular-nums text-ink-text">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden bg-line-strong">
                  <div className={`h-full transition-[width] duration-300 ${progress === 100 ? 'bg-oasis' : 'bg-clay'}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {message && <p className="mb-4 text-[13px] font-semibold text-oasis">{message}</p>}

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {['stages', 'team'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`border px-5 py-2.5 text-[14px] font-bold capitalize ${activeTab === tab ? 'border-text bg-text text-surface' : 'border-line-strong text-text-muted hover:border-text'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Stages tab */}
        {activeTab === 'stages' && (
          <div>
            <div className="mb-4 flex flex-col gap-3">
              {stages.map((stage, index) => (
                <div key={stage.id} className="border border-line bg-surface-raised p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${stage.status === 'completed' ? 'border-oasis bg-oasis' : 'border-line-strong bg-surface-sunk'}`}>
                        {stage.status === 'completed'
                          ? <span className="text-[14px] font-bold text-clay-contrast">✓</span>
                          : <span className="font-mono text-[13px] font-bold text-clay">{index + 1}</span>
                        }
                      </div>
                      <div>
                        <p className="m-0 mb-1 text-[15px] font-bold text-text">{stage.title}</p>
                        <Badge tone={stageStatusTone[stage.status] || 'neutral'}>{stage.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                    {isOwner && (
                      <div className="flex flex-wrap gap-2">
                        {stageStatusOptions.filter(s => s !== stage.status).map(s => (
                          <button key={s} onClick={() => handleUpdateStage(stage.id, s)} disabled={updatingStage === stage.id}
                            className={`border px-3.5 py-1.5 text-[12px] font-semibold capitalize ${s === 'completed' ? 'border-oasis bg-oasis text-clay-contrast' : s === 'in_progress' ? 'border-clay bg-clay text-clay-contrast' : 'border-line-strong text-text-muted'}`}>
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isOwner && (
              showAddStage ? (
                <div className="border border-line bg-surface-raised p-5">
                  <div className="flex gap-2.5">
                    <input type="text" placeholder="Stage name e.g. Plastering" value={newStageTitle} onChange={e => setNewStageTitle(e.target.value)}
                      className="flex-1 border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay" />
                    <Button onClick={handleAddStage}>Add</Button>
                    <Button variant="outline" onClick={() => setShowAddStage(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddStage(true)} className="w-full border border-dashed border-clay p-4 text-[14px] font-bold text-clay">
                  + Add Custom Stage
                </button>
              )
            )}
          </div>
        )}

        {/* Team tab */}
        {activeTab === 'team' && (
          <div>
            {members.length === 0
              ? (
                <div className="border border-line bg-surface-raised p-10 text-center">
                  <p className="m-0 mb-2 text-[15px] font-semibold text-text-muted">No team members yet</p>
                  <p className="m-0 mb-5 text-[13px] text-text-muted">When you hire artisans or professionals, they will appear here</p>
                  <Button href="/browse">Browse Professionals</Button>
                </div>
              )
              : (
                <div className="flex flex-col gap-3">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-4 border border-line bg-surface-raised p-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-clay bg-surface-sunk font-display text-[18px] font-bold text-clay">
                        {member.user?.avatar_url
                          ? <img src={member.user.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                          : member.user?.full_name?.charAt(0)?.toUpperCase()
                        }
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="m-0 text-[15px] font-bold text-text">{member.user?.full_name}</p>
                          {member.user?.is_verified && <Badge tone="success">Verified</Badge>}
                        </div>
                        <p className="m-0 mt-1 text-[13px] capitalize text-text-muted">{member.role || member.user?.role?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  )
}
