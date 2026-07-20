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

  const { locked, checking } = useAccessGate(profile)

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-surface"><p className="text-text-muted">Loading...</p></div>
  if (checking) return <div className="flex min-h-screen items-center justify-center bg-surface"><p className="text-text-muted">Loading...</p></div>
  if (locked) return <LockedNotice reason={locked} />

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      <div className="mx-auto max-w-[800px] px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 mb-1 text-[24px] font-bold text-text">Construction Q&amp;A</h1>
            <p className="m-0 text-[14px] text-text-muted">Ask questions, get answers from verified professionals and artisans</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>+ Ask a Question</Button>
        </div>

        {/* Ask form */}
        {showForm && (
          <div className="ticks mb-6 border border-clay bg-surface-raised p-8">
            <h3 className="m-0 mb-5 text-[16px] font-bold text-text">Ask your question</h3>
            <div className="mb-4">
              <Input label="Question Title" type="text" placeholder="e.g. What is the best cement mix ratio for columns?" value={newQuestion.title} onChange={e => setNewQuestion({ ...newQuestion, title: e.target.value })} />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-[13px] font-semibold text-text">Details</label>
              <textarea
                placeholder="Describe your question in detail..."
                value={newQuestion.body}
                onChange={e => setNewQuestion({ ...newQuestion, body: e.target.value })}
                rows={4}
                className="w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
              />
            </div>
            <div className="mb-6">
              <label className="mb-1.5 block text-[13px] font-semibold text-text">Category</label>
              <select
                value={newQuestion.category}
                onChange={e => setNewQuestion({ ...newQuestion, category: e.target.value })}
                className="w-full border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
              >
                <option value="">Select a category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-[2] justify-center" disabled={submitting} onClick={handleSubmitQuestion}>
                {submitting ? 'Posting...' : 'Post Question'}
              </Button>
            </div>
          </div>
        )}

        {/* Questions list */}
        {questions.length === 0
          ? <div className="border border-line bg-surface-raised p-10 text-center">
              <p className="m-0 text-[15px] text-text-muted">No questions yet. Be the first to ask!</p>
            </div>
          : questions.map(q => (
            <div key={q.id} className="mb-4 border border-line bg-surface-raised p-6">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1">
                  {q.category && <span className="mb-2 inline-block"><Badge tone="pending">{q.category}</Badge></span>}
                  <h3 className="m-0 mb-1.5 text-[16px] font-bold text-text">{q.title}</h3>
                  <p className="m-0 mb-3 text-[14px] leading-relaxed text-text-muted">{q.body}</p>
                  <p className="m-0 text-[12px] text-text-muted">Asked by {q.profiles?.full_name || 'Anonymous'} · {new Date(q.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Answers */}
              {q.answers && q.answers.length > 0 && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="mb-3 text-[13px] font-semibold text-text">{q.answers.length} {q.answers.length === 1 ? 'Answer' : 'Answers'}</p>
                  {q.answers.map(a => (
                    <div key={a.id} className="mb-2.5 border border-line bg-surface-sunk p-4">
                      <p className="m-0 mb-2 text-[14px] leading-relaxed text-text">{a.body}</p>
                      <p className="m-0 text-[12px] text-text-muted">{a.profiles?.full_name || 'Anonymous'} · {a.profiles?.role?.replace('_', ' ')} · {new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Answer input */}
              <div className="mt-4 border-t border-line pt-4">
                {selected === q.id
                  ? <div>
                      <textarea
                        placeholder="Write your answer..."
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        rows={3}
                        className="mb-2.5 w-full resize-y border border-line bg-surface-raised px-3.5 py-3 text-[14px] text-text outline-none focus:border-clay"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 justify-center text-[13px]" onClick={() => setSelected(null)}>Cancel</Button>
                        <Button className="flex-[2] justify-center text-[13px]" disabled={posting} onClick={() => handleSubmitAnswer(q.id)}>
                          {posting ? 'Posting...' : 'Post Answer'}
                        </Button>
                      </div>
                    </div>
                  : <Button variant="outline" className="text-[13px]" onClick={() => setSelected(q.id)}>
                      Answer this question
                    </Button>
                }
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
