'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = {
  surface: '#15120e',
  raised: '#201a14',
  sunk: '#0f0c09',
  text: '#f1eae0',
  muted: '#a79a85',
  line: '#362d22',
  clay: '#e08554',
  oasis: '#86a98b',
  gold: '#d4af37',
  danger: '#e2695f',
  dangerSoft: '#2e1712',
}

const TABS = ['Overview', 'Stages', 'Team', 'Notes', 'Comments']

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [userId, setUserId] = useState(null)
  const [project, setProject] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [tab, setTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [stages, setStages] = useState([])
  const [members, setMembers] = useState([])
  const [notes, setNotes] = useState([])
  const [comments, setComments] = useState([])
  const [peopleById, setPeopleById] = useState({})

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const [noteText, setNoteText] = useState('')
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.push('/login')
      return
    }
    const uid = sessionData.session.user.id
    setUserId(uid)

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (projectError) {
      setError(projectError.message)
      setLoading(false)
      return
    }
    if (!projectData) {
      setError('not_found')
      setLoading(false)
      return
    }
    setProject(projectData)

    const owner = projectData.owner_id === uid
    setIsOwner(owner)

    const { data: memberRows } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', id)

    const member = owner || (memberRows || []).some((m) => m.user_id === uid)
    setIsMember(member)

    if (!member) {
      setLoading(false)
      return
    }

    setMembers(memberRows || [])

    const [{ data: stageRows }, { data: noteRows }, { data: commentRows }] = await Promise.all([
      supabase.from('project_stages').select('*').eq('project_id', id).order('created_at', { ascending: true }),
      supabase.from('project_notes').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('project_comments').select('*').eq('project_id', id).order('created_at', { ascending: true }),
    ])
    setStages(stageRows || [])
    setNotes(noteRows || [])
    setComments(commentRows || [])

    // Gather everyone's names in one go: owner, members, note authors, comment authors
    const ids = new Set([projectData.owner_id])
    ;(memberRows || []).forEach((m) => ids.add(m.user_id))
    ;(noteRows || []).forEach((n) => ids.add(n.author_id))
    ;(commentRows || []).forEach((c) => ids.add(c.author_id))

    if (ids.size > 0) {
      const { data: people } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(ids))
      const map = {}
      ;(people || []).forEach((p) => { map[p.id] = p })
      setPeopleById(map)
    }

    setLoading(false)
  }

  async function handleInvite() {
    setInviteError('')
    if (!inviteEmail.trim()) {
      setInviteError('Enter an email address.')
      return
    }
    setInviteLoading(true)
    const supabase = createClient()

    const { data: invitedProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', inviteEmail.trim().toLowerCase())
      .maybeSingle()

    if (lookupError) {
      setInviteError(lookupError.message)
      setInviteLoading(false)
      return
    }
    if (!invitedProfile) {
      setInviteError('No EnGedi account found with that email. Ask them to sign up first.')
      setInviteLoading(false)
      return
    }
    if (invitedProfile.id === project.owner_id || members.some((m) => m.user_id === invitedProfile.id)) {
      setInviteError('This person is already on the team.')
      setInviteLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('project_members')
      .insert({ project_id: id, user_id: invitedProfile.id })

    if (insertError) {
      setInviteError(insertError.message)
      setInviteLoading(false)
      return
    }

    await supabase.from('notifications').insert({
      user_id: invitedProfile.id,
      type: 'project_invite',
      title: 'Added to a project',
      body: `You were added to the project "${project.title}"`,
      link: `/projects/${id}`,
      is_read: false,
    })

    setInviteEmail('')
    setInviteLoading(false)
    await loadAll()
  }

  async function handleRemoveMember(memberUserId) {
    const supabase = createClient()
    await supabase.from('project_members').delete().eq('project_id', id).eq('user_id', memberUserId)
    await loadAll()
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    setPosting(true)
    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('project_notes')
      .insert({ project_id: id, author_id: userId, content: noteText.trim() })
    if (!insertError) setNoteText('')
    setPosting(false)
    await loadAll()
  }

  async function handleDeleteNote(noteId) {
    const supabase = createClient()
    await supabase.from('project_notes').delete().eq('id', noteId)
    await loadAll()
  }

  async function handleAddComment() {
    if (!commentText.trim()) return
    setPosting(true)
    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('project_comments')
      .insert({ project_id: id, author_id: userId, content: commentText.trim() })
    if (!insertError) setCommentText('')
    setPosting(false)
    await loadAll()
  }

  async function handleDeleteComment(commentId) {
    const supabase = createClient()
    await supabase.from('project_comments').delete().eq('id', commentId)
    await loadAll()
  }

  if (loading) {
    return <div style={{ background: C.surface, minHeight: '100vh', color: C.text, padding: 40 }}>Loading project...</div>
  }

  if (error === 'not_found') {
    return (
      <div style={{ background: C.surface, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: C.text, fontSize: 18 }}>Project not found</div>
        <a href="/projects" style={{ color: C.clay }}>← Back to Projects</a>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ background: C.surface, minHeight: '100vh', padding: 40 }}>
        <div style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: 20, maxWidth: 600, margin: '0 auto' }}>
          {error}
        </div>
      </div>
    )
  }

  if (!isMember) {
    return (
      <div style={{ background: C.surface, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: C.text, fontSize: 18 }}>You don't have access to this project</div>
        <a href="/projects" style={{ color: C.clay }}>← Back to Projects</a>
      </div>
    )
  }

  return (
    <div style={{ background: C.surface, minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: C.text, fontSize: 24, margin: 0 }}>{project.title}</h1>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {project.status && <span style={{ textTransform: 'capitalize' }}>{project.status}</span>}
            {project.location ? ` · ${project.location}` : ''}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'transparent',
                color: tab === t ? C.clay : C.muted,
                border: 'none',
                borderBottom: tab === t ? `2px solid ${C.clay}` : '2px solid transparent',
                padding: '10px 14px',
                fontSize: 14,
                fontWeight: tab === t ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'Overview' && (
          <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20 }}>
            <div style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              {project.description || 'No description yet.'}
            </div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: C.muted, flexWrap: 'wrap' }}>
              {project.budget && <div>Budget: ₦{Number(project.budget).toLocaleString()}</div>}
              <div>Owner: {peopleById[project.owner_id]?.full_name || 'Unknown'}</div>
              <div>Team size: {members.length + 1}</div>
            </div>
          </div>
        )}

        {/* STAGES */}
        {tab === 'Stages' && (
          <div>
            {stages.length === 0 && <div style={{ color: C.muted, padding: 20, textAlign: 'center' }}>No stages added yet.</div>}
            {stages.map((s) => (
              <div key={s.id} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: C.text, fontSize: 14 }}>{s.name || s.title}</div>
                <span style={{ color: s.status === 'completed' ? C.oasis : C.muted, fontSize: 12, textTransform: 'uppercase' }}>{s.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* TEAM */}
        {tab === 'Team' && (
          <div>
            {isOwner && (
              <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ color: C.text, fontWeight: 600, marginBottom: 12 }}>Invite someone by email</div>
                {inviteError && (
                  <div style={{ background: C.dangerSoft, color: C.danger, borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 10 }}>
                    {inviteError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@email.com"
                    style={{ flex: 1, background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14 }}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviteLoading}
                    style={{ background: C.clay, color: C.sunk, border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {inviteLoading ? 'Inviting...' : 'Invite'}
                  </button>
                </div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
                  They need an existing EnGedi account. If they don't have one, ask them to sign up first.
                </div>
              </div>
            )}

            <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20 }}>
              <div style={{ color: C.text, fontWeight: 600, marginBottom: 14 }}>Team</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.line}` }}>
                <div style={{ color: C.text, fontSize: 14 }}>{peopleById[project.owner_id]?.full_name || 'Unknown'}</div>
                <span style={{ color: C.gold, fontSize: 12, textTransform: 'uppercase' }}>Owner</span>
              </div>

              {members.map((m) => (
                <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ color: C.text, fontSize: 14 }}>{peopleById[m.user_id]?.full_name || 'Unknown'}</div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}44`, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {members.length === 0 && <div style={{ color: C.muted, fontSize: 13, paddingTop: 10 }}>No team members yet.</div>}
            </div>
          </div>
        )}

        {/* NOTES */}
        {tab === 'Notes' && (
          <div>
            <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder="Write a note for the team..."
                style={{ width: '100%', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', marginBottom: 10 }}
              />
              <button
                onClick={handleAddNote}
                disabled={posting || !noteText.trim()}
                style={{ background: C.clay, color: C.sunk, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Add Note
              </button>
            </div>

            {notes.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: 20 }}>No notes yet.</div>}
            {notes.map((n) => (
              <div key={n.id} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: C.clay, fontSize: 13, fontWeight: 600 }}>{peopleById[n.author_id]?.full_name || 'Unknown'}</span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{timeAgo(n.created_at)}</span>
                </div>
                <div style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>{n.content}</div>
                {n.author_id === userId && (
                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    style={{ background: 'transparent', color: C.muted, border: 'none', fontSize: 12, cursor: 'pointer', marginTop: 8, padding: 0 }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* COMMENTS */}
        {tab === 'Comments' && (
          <div>
            {comments.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: 20 }}>No comments yet.</div>}
            {comments.map((c) => (
              <div key={c.id} style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: C.oasis, fontSize: 13, fontWeight: 600 }}>{peopleById[c.author_id]?.full_name || 'Unknown'}</span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{timeAgo(c.created_at)}</span>
                </div>
                <div style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>{c.content}</div>
                {c.author_id === userId && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    style={{ background: 'transparent', color: C.muted, border: 'none', fontSize: 12, cursor: 'pointer', marginTop: 8, padding: 0 }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}

            <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginTop: 20 }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                style={{ width: '100%', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', marginBottom: 10 }}
              />
              <button
                onClick={handleAddComment}
                disabled={posting || !commentText.trim()}
                style={{ background: C.clay, color: C.sunk, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Post Comment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}