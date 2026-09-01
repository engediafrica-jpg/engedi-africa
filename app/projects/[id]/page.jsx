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

const stageStatusOptions = ['pending', 'in_progress', 'completed']
const stageStatusColors = {
  pending: { bg: 'transparent', color: '#a79a85', border: '#362d22' },
  in_progress: { bg: '#0a1a2e', color: '#86a98b', border: '#86a98b44' },
  completed: { bg: '#0a1a0f', color: '#86a98b', border: '#86a98b44' },
}
const projectStatusOptions = ['planning', 'active', 'on_hold', 'completed']

const bookingStatusColors = {
  pending: { bg: '#1a1200', border: '#e0855444', color: '#e08554' },
  quoted: { bg: '#0a1a2e', border: '#86a98b44', color: '#86a98b' },
  paid: { bg: '#0a1a2e', border: '#86a98b44', color: '#86a98b' },
  completed: { bg: '#0a1a0f', border: '#86a98b44', color: '#86a98b' },
  delivered: { bg: '#0a1a0f', border: '#86a98b44', color: '#86a98b' },
  cancelled: { bg: '#2e1712', border: '#e2695f44', color: '#e2695f' },
  disputed: { bg: '#2e1712', border: '#e2695f44', color: '#e2695f' },
  declined: { bg: '#2e1712', border: '#e2695f44', color: '#e2695f' },
}

export default function ProjectDetailPage({ params }) {
  const supabase = createClient()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [stages, setStages] = useState([])
  const [members, setMembers] = useState([])
  const [projectBookings, setProjectBookings] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('stages')
  const [updatingStage, setUpdatingStage] = useState(null)
  const [showAddStage, setShowAddStage] = useState(false)
  const [newStageTitle, setNewStageTitle] = useState('')
  const [newStageAssignee, setNewStageAssignee] = useState('')
  const [message, setMessage] = useState('')
  const [editingProject, setEditingProject] = useState(false)
  const [projectForm, setProjectForm] = useState({})

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [removingMember, setRemovingMember] = useState(null)

  const inputStyle = { width: '100%', padding: '11px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: C.text }
  const darkInputStyle = { ...inputStyle, background: '#0a0807', border: `1px solid #4a3d2c` }

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(profileData)

      const { data: projectData, error } = await supabase.from('projects').select('*').eq('id', params.id).single()
      if (error) {
        console.error('Error loading project:', error)
        setLoadError(`${error.message} (code: ${error.code || 'none'})`)
        setLoading(false)
        return
      }
      if (!projectData) {
        setLoadError('No project found for this id.')
        setLoading(false)
        return
      }

      setProject(projectData)
      setProjectForm(projectData)
      const { data: stagesData, error: stagesError } = await supabase.from('project_stages').select('*').eq('project_id', params.id).order('order_index', { ascending: true })
      if (stagesError) console.error('Error loading stages:', stagesError)
      setStages(stagesData || [])
      const { data: membersData, error: membersError } = await supabase.from('project_members').select('*, user:profiles(full_name, role, avatar_url, is_verified)').eq('project_id', params.id)
      if (membersError) console.error('Error loading members:', membersError)
      setMembers(membersData || [])
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, provider:profiles!bookings_provider_id_fkey(full_name, avatar_url, role)')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })
      if (bookingsError) console.error('Error loading project bookings:', bookingsError)
      setProjectBookings(bookingsData || [])
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
      assigned_to: newStageAssignee || null,
    }).select().single()
    if (!error && data) { setStages([...stages, data]); setNewStageTitle(''); setNewStageAssignee(''); setShowAddStage(false) }
  }

  const handleUpdateProject = async () => {
    const location = [projectForm.city, projectForm.state].filter(Boolean).join(', ') || projectForm.location
    const { error } = await supabase.from('projects').update({
      title: projectForm.title,
      description: projectForm.description,
      location,
      budget: projectForm.budget ? Number(projectForm.budget) : null,
      status: projectForm.status,
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    if (!error) {
      setProject({ ...project, ...projectForm, location })
      setEditingProject(false)
      setMessage('Project updated!')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleInvite = async () => {
    setInviteError('')
    const email = inviteEmail.trim().toLowerCase()
    if (!email) { setInviteError('Enter an email address'); return }

    setInviteLoading(true)

    const { data: foundProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url, is_verified, email')
      .eq('email', email)
      .single()

    if (lookupError || !foundProfile) {
      setInviteError('No EnGedi account found with that email. Ask them to sign up first.')
      setInviteLoading(false)
      return
    }

    if (foundProfile.id === project.owner_id) {
      setInviteError('That person already owns this project.')
      setInviteLoading(false)
      return
    }

    if (members.some(m => m.user_id === foundProfile.id)) {
      setInviteError('That person is already on the team.')
      setInviteLoading(false)
      return
    }

    const { data: newMember, error: insertError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: foundProfile.id,
        role: inviteRole || foundProfile.role,
      })
      .select('*, user:profiles(full_name, role, avatar_url, is_verified)')
      .single()

    if (insertError) {
      setInviteError('Could not add member. Try again.')
      setInviteLoading(false)
      return
    }

    await supabase.from('notifications').insert({
      user_id: foundProfile.id,
      type: 'project_invite',
      title: 'Added to a project',
      body: `You've been added to "${project.title}"`,
      link: `/projects/${project.id}`,
      is_read: false,
    })

    setMembers([...members, newMember])
    setInviteEmail('')
    setInviteRole('')
    setShowInvite(false)
    setInviteLoading(false)
    setMessage(`${foundProfile.full_name} added to the project`)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleRemoveMember = async (memberId) => {
    setRemovingMember(memberId)
    const { error } = await supabase.from('project_members').delete().eq('id', memberId)
    if (!error) setMembers(members.filter(m => m.id !== memberId))
    setRemovingMember(null)
  }

  const getProgress = () => {
    if (stages.length === 0) return 0
    return Math.round((stages.filter(s => s.status === 'completed').length / stages.length) * 100)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: C.muted }}>Loading...</p></div>

  if (loadError) return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: C.raised, border: `1px solid ${C.danger}44`, borderRadius: '12px', padding: '28px', maxWidth: '480px', textAlign: 'center' }}>
        <p style={{ color: C.danger, fontWeight: '700', margin: '0 0 8px' }}>Could not load this project</p>
        <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 16px' }}>{loadError}</p>
        <Link href="/projects" style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>← Back to Projects</Link>
      </div>
    </div>
  )

  const progress = getProgress()
  const isOwner = profile?.id === project?.owner_id
  const isMember = members.some(m => m.user_id === profile?.id)
  const canManageStages = isOwner || isMember

  const getAssigneeName = (assignedTo) => {
    if (!assignedTo) return null
    if (assignedTo === project.owner_id) return 'Owner'
    const member = members.find(m => m.user_id === assignedTo)
    return member?.user?.full_name || 'Unknown'
  }

  const canUpdateStage = (stage) => isOwner || stage.assigned_to === profile?.id

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.text }}>
      <div style={{ background: C.sunk, borderBottom: `1px solid ${C.line}`, padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: C.clay, textDecoration: 'none', fontWeight: '800', fontSize: '18px' }}>EnGedi Africa</Link>
        <Link href="/projects" style={{ color: C.muted, textDecoration: 'none', fontSize: '13px' }}>← All Projects</Link>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Project header */}
        <div style={{ background: C.raised, border: `1px solid ${C.clay}44`, borderRadius: '12px', padding: '28px', marginBottom: '20px' }}>
          {editingProject ? (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</label>
                  <input type="text" value={projectForm.title || ''} onChange={e => setProjectForm({ ...projectForm, title: e.target.value })} style={darkInputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>State</label>
                    <select value={projectForm.state || ''} onChange={e => setProjectForm({ ...projectForm, state: e.target.value })} style={{ ...darkInputStyle, appearance: 'none' }}>
                      <option value="" style={{ background: C.sunk }}>Select state</option>
                      {nigeriaStates.map(s => <option key={s} value={s} style={{ background: C.sunk }}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>City / Area</label>
                    <input type="text" placeholder="e.g. Lekki Phase 1" value={projectForm.city || ''} onChange={e => setProjectForm({ ...projectForm, city: e.target.value })} style={darkInputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Budget (₦)</label>
                    <input type="number" value={projectForm.budget || ''} onChange={e => setProjectForm({ ...projectForm, budget: e.target.value })} style={darkInputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                    <select value={projectForm.status || 'planning'} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })} style={{ ...darkInputStyle, appearance: 'none' }}>
                      {projectStatusOptions.map(s => <option key={s} value={s} style={{ background: C.sunk }}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                  <textarea value={projectForm.description || ''} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} rows={2} style={{ ...darkInputStyle, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setEditingProject(false)} style={{ flex: 1, background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleUpdateProject} style={{ flex: 2, background: C.clay, color: C.sunk, border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: '22px', fontWeight: '800', color: C.text, margin: '0 0 8px' }}>{project.title}</h1>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {project.location && <span style={{ color: C.muted, fontSize: '13px' }}>📍 {project.location}</span>}
                    {project.budget && <span style={{ color: C.muted, fontSize: '13px' }}>₦{Number(project.budget).toLocaleString()}</span>}
                    <span style={{ background: C.sunk, color: C.clay, fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                      {project.status?.replace('_', ' ')}
                    </span>
                  </div>
                  {project.description && <p style={{ color: C.muted, fontSize: '13px', margin: '10px 0 0', lineHeight: '1.6' }}>{project.description}</p>}
                </div>
                {isOwner && (
                  <button onClick={() => setEditingProject(true)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '8px 14px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                    Edit
                  </button>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Progress</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: C.clay }}>{progress}%</span>
                </div>
                <div style={{ background: C.line, borderRadius: '20px', height: '4px', overflow: 'hidden' }}>
                  <div style={{ background: progress === 100 ? C.oasis : C.clay, height: '100%', borderRadius: '20px', width: `${progress}%`, transition: 'width 0.3s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {message && <p style={{ color: C.oasis, fontSize: '13px', marginBottom: '16px', fontWeight: '600' }}>{message}</p>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { key: 'stages', label: 'Stages' },
            { key: 'team', label: 'Team' },
            { key: 'bookings', label: `Bookings${projectBookings.length > 0 ? ` (${projectBookings.length})` : ''}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '9px 18px', borderRadius: '6px', border: `1px solid ${activeTab === tab.key ? C.clay : C.line}`, background: activeTab === tab.key ? C.clay : 'transparent', color: activeTab === tab.key ? C.sunk : C.muted, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stages */}
        {activeTab === 'stages' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {stages.map((stage, index) => {
                const statusStyle = stageStatusColors[stage.status] || stageStatusColors.pending
                const assigneeName = getAssigneeName(stage.assigned_to)
                const userCanUpdate = canUpdateStage(stage)
                return (
                  <div key={stage.id} style={{ background: C.raised, border: `1px solid ${statusStyle.border}`, borderRadius: '10px', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: stage.status === 'completed' ? C.oasis : C.sunk, border: `1px solid ${statusStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {stage.status === 'completed'
                            ? <span style={{ color: C.sunk, fontSize: '12px', fontWeight: '800' }}>✓</span>
                            : <span style={{ color: C.muted, fontSize: '11px', fontWeight: '700' }}>{index + 1}</span>
                          }
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '14px', color: C.text }}>{stage.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                              {stage.status.replace('_', ' ')}
                            </span>
                            {assigneeName && (
                              <span style={{ fontSize: '11px', color: C.muted }}>
                                Assigned to {assigneeName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {userCanUpdate && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {stageStatusOptions.filter(s => s !== stage.status).map(s => (
                            <button key={s} onClick={() => handleUpdateStage(stage.id, s)} disabled={updatingStage === stage.id}
                              style={{ background: s === 'completed' ? C.oasis : s === 'in_progress' ? '#1a2e1d' : C.sunk, color: s === 'completed' ? C.sunk : s === 'in_progress' ? C.oasis : C.muted, border: `1px solid ${s === 'completed' ? C.oasis : s === 'in_progress' ? C.oasis + '44' : C.line}`, padding: '5px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize' }}>
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

            {canManageStages && (
              showAddStage ? (
                <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" placeholder="Stage name e.g. Plastering" value={newStageTitle} onChange={e => setNewStageTitle(e.target.value)}
                      style={{ padding: '10px 12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', color: C.text }} />
                    <select value={newStageAssignee} onChange={e => setNewStageAssignee(e.target.value)}
                      style={{ padding: '10px 12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', color: C.text, appearance: 'none' }}>
                      <option value="" style={{ background: C.sunk }}>Unassigned</option>
                      {members.map(m => (
                        <option key={m.user_id} value={m.user_id} style={{ background: C.sunk }}>{m.user?.full_name}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleAddStage} style={{ flex: 1, background: C.clay, color: C.sunk, border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Add</button>
                      <button onClick={() => { setShowAddStage(false); setNewStageTitle(''); setNewStageAssignee('') }} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '10px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddStage(true)}
                  style={{ background: 'transparent', color: C.clay, border: `1px dashed ${C.clay}44`, padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', width: '100%' }}>
                  + Add Custom Stage
                </button>
              )
            )}
          </div>
        )}

        {/* Team */}
        {activeTab === 'team' && (
          <div>
            {isOwner && (
              <div style={{ marginBottom: '16px' }}>
                {showInvite ? (
                  <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Invite by Email
                    </label>
                    <p style={{ fontSize: '12px', color: C.muted, margin: '0 0 12px' }}>
                      They must already have an EnGedi account.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        style={{ flex: '1 1 200px', padding: '10px 12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', color: C.text }}
                      />
                      <input
                        type="text"
                        placeholder="Role on this project (optional)"
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value)}
                        style={{ flex: '1 1 160px', padding: '10px 12px', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: '8px', fontSize: '14px', outline: 'none', color: C.text }}
                      />
                      <button onClick={handleInvite} disabled={inviteLoading}
                        style={{ background: C.clay, color: C.sunk, border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                        {inviteLoading ? 'Adding...' : 'Add'}
                      </button>
                      <button onClick={() => { setShowInvite(false); setInviteError('') }}
                        style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '10px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                    {inviteError && <p style={{ color: C.danger, fontSize: '12px', marginTop: '10px' }}>{inviteError}</p>}
                  </div>
                ) : (
                  <button onClick={() => setShowInvite(true)}
                    style={{ background: 'transparent', color: C.clay, border: `1px dashed ${C.clay}44`, padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', width: '100%' }}>
                    + Invite Team Member
                  </button>
                )}
              </div>
            )}

            {members.length === 0 ? (
              <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: C.muted, fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No team members yet</p>
                <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 20px' }}>Invite someone by email, or browse professionals to hire</p>
                <Link href="/browse" style={{ background: C.clay, color: C.sunk, textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
                  Browse Professionals
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {members.map(member => (
                  <div key={member.id} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.sunk, border: `1px solid ${C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: C.clay, fontSize: '16px', overflow: 'hidden', flexShrink: 0 }}>
                        {member.user?.avatar_url ? <img src={member.user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : member.user?.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: C.text }}>{member.user?.full_name}</p>
                          {member.user?.is_verified && <span style={{ background: '#1a2e1d', color: C.oasis, fontSize: '11px', fontWeight: '600', padding: '2px 6px', borderRadius: '4px' }}>VERIFIED</span>}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.muted, textTransform: 'capitalize' }}>{member.role || member.user?.role?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={() => handleRemoveMember(member.id)} disabled={removingMember === member.id}
                        style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}44`, padding: '6px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                        {removingMember === member.id ? 'Removing...' : 'Remove'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings */}
        {activeTab === 'bookings' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Link href={`/browse?project=${project.id}`}
                style={{ display: 'block', textAlign: 'center', background: 'transparent', color: C.clay, border: `1px dashed ${C.clay}44`, padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', textDecoration: 'none' }}>
                + Request a Quote for This Project
              </Link>
            </div>

            {projectBookings.length === 0 ? (
              <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: C.muted, fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>No bookings linked to this project yet</p>
                <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>Request a quote above to get started</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {projectBookings.map(booking => {
                  const statusStyle = bookingStatusColors[booking.status] || bookingStatusColors.pending
                  return (
                    <div key={booking.id} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '10px', padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: C.sunk, border: `1px solid ${C.clay}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: C.clay, fontSize: '14px', overflow: 'hidden', flexShrink: 0 }}>
                            {booking.provider?.avatar_url ? <img src={booking.provider.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : booking.provider?.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '14px', color: C.text }}>{booking.title}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>
                              {booking.provider?.full_name} · {booking.provider?.role?.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {booking.quoted_price
                            ? <p style={{ margin: '0 0 4px', fontWeight: '800', fontSize: '14px', color: C.clay }}>₦{Number(booking.quoted_price).toLocaleString()}</p>
                            : booking.budget ? <p style={{ margin: '0 0 4px', fontSize: '12px', color: C.muted }}>Budget: ₦{Number(booking.budget).toLocaleString()}</p>
                            : null
                          }
                          <span style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                            {booking.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <Link href="/bookings" style={{ textAlign: 'center', color: C.muted, fontSize: '12px', textDecoration: 'none', marginTop: '4px' }}>
                  Manage payments, quotes, and status changes in Bookings →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}