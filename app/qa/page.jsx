'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function QAPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState({ title: '', body: '', category: '' })
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)
  const [answer, setAnswer] = useState('')
  const [posting, setPosting] = useState(false)

  const categories = ['Foundation', 'Roofing', 'Plumbing', 'Electrical', 'Tiling', 'Painting', 'Fencing', 'Drainage', 'General']

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(profileData)
      const { data: qData } = await supabase.from('questions').select('*, profiles(full_name, role), answers(*, profiles(full_name, role))').order('created_at', { ascending: false })
      setQuestions(qData || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleSubmitQuestion = async () => {
    if (!newQuestion.title || !newQuestion.body) return
    setSubmitting(true)
    const { data, error } = await supabase.from('questions').insert({
      user_id: profile.id,
      title: newQuestion.title,
      body: newQuestion.body,
      category: newQuestion.category,
    }).select('*, profiles(full_name, role), answers(*)').single()
    if (!error && data) {
      setQuestions([data, ...questions])
      setNewQuestion({ title: '', body: '', category: '' })
      setShowForm(false)
    }
    setSubmitting(false)
  }

  const handleSubmitAnswer = async (questionId) => {
    if (!answer.trim()) return
    setPosting(true)
    const { data, error } = await supabase.from('answers').insert({
      question_id: questionId,
      user_id: profile.id,
      body: answer,
    }).select('*, profiles(full_name, role)').single()
    if (!error && data) {
      setQuestions(questions.map(q => q.id === questionId ? { ...q, answers: [...(q.answers || []), data] } : q))
      setAnswer('')
    }
    setPosting(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#666666' }}>Loading...</p></div>

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 4px' }}>Construction Q&A</h1>
            <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>Ask questions, get answers from verified professionals and artisans</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            + Ask a Question
          </button>
        </div>

        {/* Ask form */}
        {showForm && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #8B5E3C', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 20px' }}>Ask your question</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Question Title</label>
              <input
                type="text"
                placeholder="e.g. What is the best cement mix ratio for columns?"
                value={newQuestion.title}
                onChange={e => setNewQuestion({ ...newQuestion, title: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Details</label>
              <textarea
                placeholder="Describe your question in detail..."
                value={newQuestion.body}
                onChange={e => setNewQuestion({ ...newQuestion, body: e.target.value })}
                rows={4}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>Category</label>
              <select
                value={newQuestion.category}
                onChange={e => setNewQuestion({ ...newQuestion, category: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#FFFFFF' }}
              >
                <option value="">Select a category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmitQuestion} disabled={submitting} style={{ flex: 2, background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                {submitting ? 'Posting...' : 'Post Question'}
              </button>
            </div>
          </div>
        )}

        {/* Questions list */}
        {questions.length === 0
          ? <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
              <p style={{ color: '#999999', fontSize: '15px', margin: 0 }}>No questions yet. Be the first to ask!</p>
            </div>
          : questions.map(q => (
            <div key={q.id} style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  {q.category && <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', marginBottom: '8px', display: 'inline-block' }}>{q.category}</span>}
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '8px 0 6px' }}>{q.title}</h3>
                  <p style={{ fontSize: '14px', color: '#666666', margin: '0 0 12px', lineHeight: '1.5' }}>{q.body}</p>
                  <p style={{ fontSize: '12px', color: '#999999', margin: 0 }}>Asked by {q.profiles?.full_name || 'Anonymous'} · {new Date(q.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Answers */}
              {q.answers && q.answers.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #EEE6DA' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '12px' }}>{q.answers.length} {q.answers.length === 1 ? 'Answer' : 'Answers'}</p>
                  {q.answers.map(a => (
                    <div key={a.id} style={{ background: '#F9F6F1', borderRadius: '10px', padding: '16px', marginBottom: '10px' }}>
                      <p style={{ fontSize: '14px', color: '#1A1A1A', margin: '0 0 8px', lineHeight: '1.5' }}>{a.body}</p>
                      <p style={{ fontSize: '12px', color: '#999999', margin: 0 }}>{a.profiles?.full_name || 'Anonymous'} · {a.profiles?.role?.replace('_', ' ')} · {new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Answer input */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #EEE6DA' }}>
                {selected === q.id
                  ? <div>
                      <textarea
                        placeholder="Write your answer..."
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        rows={3}
                        style={{ width: '100%', padding: '12px', border: '1.5px solid #EEE6DA', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: '10px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setSelected(null)} style={{ flex: 1, background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #EEE6DA', padding: '10px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleSubmitAnswer(q.id)} disabled={posting} style={{ flex: 2, background: '#8B5E3C', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          {posting ? 'Posting...' : 'Post Answer'}
                        </button>
                      </div>
                    </div>
                  : <button onClick={() => setSelected(q.id)} style={{ background: 'transparent', border: '1px solid #EEE6DA', color: '#666666', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      Answer this question
                    </button>
                }
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}