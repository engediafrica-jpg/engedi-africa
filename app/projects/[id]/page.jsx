'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const stageStatusOptions = ['pending', 'in_progress', 'completed']
const stageStatusColors = {
  pending: { bg: '#F9F6F1', color: '#999999', border: '#EEE6DA' },
  in_progress: { bg: '#EEF2FF', color: '#6366F1', border: '#6366F1' },
  completed: { bg: '#e8f8f0', color: '#27ae60', border: '#2ecc71' },
}
const projectStatusOptions = ['planning', 'active', 'on_hold', 'completed']

export default function ProjectDetailPage({ params }) {
  const supabase = createClient()
  const router = useRouter()
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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading...</p>
    </div>
  )

  const progress = getProgress()
  const isOwner = profile?.id === project?.owner_id

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/projects" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← All Projects</Link>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Project header */}
        <div style={{ background: '#1A1A1A', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          {editingProject ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#999999', marginBottom: '6px' }}>TITLE</label>
                  <input type="text" value={projectForm.title || ''} onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #333', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#333', color: '#FFFFFF' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#999999', marginBottom: '6px' }}>LOCATION</label>
                  <input type="text" value={projectForm.location || ''} onChange={e => setProjectForm({ ...projectForm, location: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #333', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#333', color: '#FFFFFF' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#999999', marginBottom: '6px' }}>BUDGET (₦)</label>
                  <input type="number" value={projectForm.budget || ''} onChange={e => setProjectForm({ ...projectForm, budget: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #333', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#333', color: '#FFFFFF' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#999999', marginBottom: '6px' }}>STATUS</label>
                  <select value={projectForm.status || 'planning'} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #333', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#333', color: '#FFFFFF' }}>
                    {projectStatusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setEditingProject(false)} style={{ flex: 1, background: 'transparent', color: '#999999', border: '1px solid #333', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleUpdateProject} style={{ flex: 2, background: '#8B5E3C', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 8px' }}>{project.title}</h1>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {project.location && <span style={{ color: '#999999', fontSize: '13px' }}>📍 {project.location}</span>}
                    {project.budget && <span style={{ color: '#999999', fontSize: '13px' }}>💰 ₦{Number(project.budget).toLocaleString()}</span>}
                    <span style={{ background: '#FFFFFF22', color: '#FFFFFF', fontSize: '12px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px', textTransform: 'capitalize' }}>
                      {project.status?.replace('_', ' ')}
                    </span>
                  </div>
                  {project.description && <p style={{ color: '#999999', fontSize: '14px', margin: '10px 0 0', lineHeight: '1.6' }}>{project.description}</p>}
                </div>
                {isOwner && (
                  <button onClick={() => setEditingProject(true)} style={{ background: '#FFFFFF22', color: '#FFFFFF', border: '1px solid #FFFFFF33', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                    Edit
                  </button>
                )}
              </div>

              {/* Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#999999' }}>Overall Progress</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF' }}>{progress}%</span>
                </div>
                <div style={{ background: '#FFFFFF22', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ background: progress === 100 ? '#2ecc71' : '#8B5E3C', height: '100%', borderRadius: '20px', width: `${progress}%`, transition: 'width 0.3s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {message && <p style={{ color: '#2ecc71', fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['stages', 'team'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '10px 20px', borderRadius: '8px', border: `1.5px solid ${activeTab === tab ? '#1A1A1A' : '#EEE6DA'}`, background: activeTab === tab ? '#1A1A1A' : '#FFFFFF', color: activeTab === tab ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '14px', cursor: 'pointer', textTransform: 'capitalize' }}>
              {tab === 'stages' ? '📋 Stages' : '👥 Team'}
            </button>
          ))}
        </div>

        {/* Stages tab */}
        {activeTab === 'stages' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {stages.map((stage, index) => {
                const statusStyle = stageStatusColors[stage.status] || stageStatusColors.pending
                return (
                  <div key={stage.id} style={{ background: '#FFFFFF', border: `1.5px solid ${statusStyle.border}`, borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: stage.status === 'completed' ? '#2ecc71' : '#F5EFE6', border: `2px solid ${statusStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {stage.status === 'completed'
                            ? <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '800' }}>✓</span>
                            : <span style={{ color: '#8B5E3C', fontSize: '13px', fontWeight: '700' }}>{index + 1}</span>
                          }
                        </div>
                        <div>
                          <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{stage.title}</p>
                          <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', textTransform: 'capitalize' }}>
                            {stage.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      {isOwner && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {stageStatusOptions.filter(s => s !== stage.status).map(s => (
                            <button key={s} onClick={() => handleUpdateStage(stage.id, s)} disabled={updatingStage === stage.id}
                              style={{ background: s === 'completed' ? '#2ecc71' : s === 'in_progress' ? '#6366F1' : '#F9F6F1', color: s === 'pending' ? '#666666' : '#FFFFFF', border: 'none', padding: '7px 14px', borderRadius: '8px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize' }}>
                              {s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {isOwner && (
              showAddStage ? (
                <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Stage name e.g. Plastering" value={newStageTitle} onChange={e => setNewStageTitle(e.target.value)}
                      style={{ flex: 1, padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                    <button onClick={handleAddStage} style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Add</button>
                    <button onClick={() => setShowAddStage(false)} style={{ background: '#F9F6F1', color: '#666666', border: '1px solid #EEE6DA', padding: '12px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddStage(true)} style={{ background: '#FFFFFF', color: '#8B5E3C', border: '1.5px dashed #8B5E3C', padding: '14px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', width: '100%' }}>
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
                <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: '#999999', fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No team members yet</p>
                  <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 20px' }}>When you hire artisans or professionals, they will appear here</p>
                  <Link href="/browse" style={{ background: '#1A1A1A', color: '#FFFFFF', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
                    Browse Professionals
                  </Link>
                </div>
              )
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {members.map(member => (
                    <div key={member.id} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F5EFE6', border: '2px solid #8B5E3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#8B5E3C', fontSize: '18px', overflow: 'hidden', flexShrink: 0 }}>
                        {member.user?.avatar_url
                          ? <img src={member.user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : member.user?.full_name?.charAt(0)?.toUpperCase()
                        }
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>{member.user?.full_name}</p>
                          {member.user?.is_verified && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>✓ Verified</span>}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666666', textTransform: 'capitalize' }}>{member.role || member.user?.role?.replace('_', ' ')}</p>
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