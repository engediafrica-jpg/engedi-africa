'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const modules = [
  {
    id: 1,
    title: 'How to Present Yourself to a Client',
    desc: 'First impressions matter. Learn how to dress, speak, and carry yourself professionally when meeting a client for the first time.',
    duration: '5 min read',
    category: 'Professionalism',
    content: [
      { heading: 'Dress the part', body: 'Wear clean, decent clothing to every client meeting. Your appearance tells the client whether you take your work seriously. You do not need expensive clothes — clean and neat is enough.' },
      { heading: 'Arrive on time', body: 'Punctuality is respect. If you say you will be there at 8am, be there at 7:55am. If something comes up, call ahead. Never just not show up.' },
      { heading: 'Greet properly', body: 'When you meet a client, greet them warmly. Introduce yourself with your full name and your trade. Example: "Good morning sir, I am Emeka Okonkwo, I am a licensed electrician."' },
      { heading: 'Listen before you speak', body: 'Let the client explain the job fully before you start asking questions or quoting prices. Clients want to feel heard. Ask clarifying questions only after they are done speaking.' },
      { heading: 'Be honest about your abilities', body: 'Never tell a client you can do something you cannot do. If a job is outside your skill set, say so and refer them to someone who can help. Honesty builds long-term trust.' },
    ],
    quiz: [
      { question: 'What time should you arrive for a client meeting scheduled at 9am?', options: ['9:30am', '9:05am', 'Before 9am', 'Exactly 9am'], answer: 2 },
      { question: 'What should you do if a job is beyond your skills?', options: ['Try it anyway', 'Ignore the question', 'Be honest and refer them', 'Charge more and figure it out'], answer: 2 },
      { question: 'When should you start asking questions about the job?', options: ['Before the client speaks', 'After the client has finished explaining', 'While they are talking', 'Only after signing a contract'], answer: 1 },
    ]
  },
  {
    id: 2,
    title: 'Quoting and Pricing Your Work',
    desc: 'Understand how to give fair, professional quotes that protect you and satisfy your client. Learn what to include and what to avoid.',
    duration: '6 min read',
    category: 'Business Skills',
    content: [
      { heading: 'Always give a written quote', body: 'A verbal agreement is hard to prove. Always write down what you are charging and what it covers — even a simple WhatsApp message works. This protects both you and the client.' },
      { heading: 'Break down your costs', body: 'Tell the client what you are charging for labour and what you are charging for materials separately. Clients trust tradespeople who are transparent about costs.' },
      { heading: 'Do not undercharge to win a job', body: 'Charging too little may win you the job today but it will hurt you later. You will rush the job, cut corners, or end up in a dispute. Charge what the job is worth.' },
      { heading: 'Include a payment schedule', body: 'For big jobs, agree on how payments will be made. A common structure is: 30% upfront, 50% midway, 20% on completion. Never do a large job with no upfront payment.' },
      { heading: 'Be clear about what is NOT included', body: 'If your quote does not include certain materials or tasks, say so clearly. Surprises at the end of a job lead to disputes and bad reviews.' },
    ],
    quiz: [
      { question: 'Why should you always give a written quote?', options: ['To look professional', 'To protect both you and the client', 'Because clients demand it', 'To charge more'], answer: 1 },
      { question: 'What is a good upfront payment structure for a large job?', options: ['100% upfront', '0% upfront', '30% upfront, 50% midway, 20% on completion', '50% upfront, 50% at end'], answer: 2 },
      { question: 'What should you do if certain tasks are NOT included in your quote?', options: ['Add them later', 'Say nothing and charge at the end', 'State clearly what is not included', 'Reduce the price'], answer: 2 },
    ]
  },
  {
    id: 3,
    title: 'Protecting Yourself on the Job',
    desc: 'Your safety and your rights matter. Learn how to protect yourself legally, physically, and financially on every job.',
    duration: '7 min read',
    category: 'Safety & Rights',
    content: [
      { heading: 'Always use a simple agreement', body: 'Before starting any job, have a simple written agreement that includes: your name, the client name, description of work, agreed price, and payment schedule. This is your legal protection if things go wrong.' },
      { heading: 'Use personal protective equipment (PPE)', body: 'Depending on your trade, always wear the right safety gear. Electricians need insulated gloves and rubber-soled boots. Welders need face shields and gloves. Bricklayers need hard hats on active sites. Your health is your business.' },
      { heading: 'Do not start work without an initial payment', body: 'If a client refuses to pay any amount upfront, that is a red flag. Legitimate clients understand that you need to buy materials and commit your time. Always take something before you start.' },
      { heading: 'Document your work with photos', body: 'Take photos before, during, and after every job. This protects you if a client later claims the work was poor or incomplete. Photos are evidence.' },
      { heading: 'Know when to walk away', body: 'If a client becomes abusive, refuses to honour the agreed terms, or creates an unsafe working environment, you have the right to stop work and leave. Your dignity and safety are not negotiable.' },
    ],
    quiz: [
      { question: 'What should a simple job agreement include?', options: ['Just the price', 'Name, work description, price and payment schedule', 'Only your name and the client name', 'Nothing — verbal is fine'], answer: 1 },
      { question: 'Why should you take photos during a job?', options: ['For social media', 'To show off your work', 'As evidence if there is a dispute', 'Clients like it'], answer: 2 },
      { question: 'What is a red flag from a client before starting a job?', options: ['They ask for a quote', 'They refuse any upfront payment', 'They ask about your experience', 'They want the job done quickly'], answer: 1 },
    ]
  },
  {
    id: 4,
    title: 'Handling Complaints and Disputes',
    desc: 'Even good tradespeople face complaints. Learn how to handle them calmly, professionally, and in a way that protects your reputation.',
    duration: '5 min read',
    category: 'Professionalism',
    content: [
      { heading: 'Listen without getting defensive', body: 'When a client complains, your first reaction might be to defend yourself. Do not. Listen fully, stay calm, and show that you take their concern seriously. This alone resolves many disputes.' },
      { heading: 'Inspect the issue yourself', body: 'Go back to the site and look at the problem with your own eyes. Sometimes clients are right — there is a genuine fault. Sometimes it is a misunderstanding. Either way, you need to see it.' },
      { heading: 'If it is your fault, fix it', body: 'If the problem was caused by your work, fix it — without charging extra. This is not a loss; it is an investment in your reputation. A client whose problem you fix properly often becomes your biggest referral source.' },
      { heading: 'If it is not your fault, explain clearly', body: 'If the issue was caused by something outside your work — poor materials the client supplied, decisions they made, or natural wear — explain this calmly with evidence. Show your photos.' },
      { heading: 'Use EnGedi as your mediator', body: 'If a dispute escalates, you can report it through the EnGedi platform. Our team will review the evidence from both sides and help reach a fair resolution.' },
    ],
    quiz: [
      { question: 'What is the first thing to do when a client complains?', options: ['Defend your work immediately', 'Ignore it', 'Listen calmly without getting defensive', 'Ask for more money'], answer: 2 },
      { question: 'If a problem was caused by your work, what should you do?', options: ['Charge extra to fix it', 'Blame the materials', 'Fix it without charging extra', 'Ignore the client'], answer: 2 },
      { question: 'What can you use as evidence in a dispute?', options: ['Your memory', 'Photos taken during the job', 'What your friends say', 'The client\'s word'], answer: 1 },
    ]
  },
  {
    id: 5,
    title: 'Building Your Reputation on EnGedi',
    desc: 'Your profile and reviews are your most valuable asset on this platform. Learn how to build a 5-star reputation that brings consistent work.',
    duration: '4 min read',
    category: 'Platform Skills',
    content: [
      { heading: 'Complete your profile fully', body: 'A profile with a photo, complete bio, skills listed, and location filled in gets significantly more views than an empty profile. Treat your EnGedi profile like your business card.' },
      { heading: 'Ask for reviews', body: 'After completing a job, politely ask your client to leave you a review on EnGedi. Most satisfied clients are happy to do this but will not think to do it unless you ask. Reviews are the most powerful trust signal on the platform.' },
      { heading: 'Respond to messages quickly', body: 'When a potential client sends you a message, respond within a few hours. Clients who do not hear back will move on to the next person. Speed shows professionalism.' },
      { heading: 'Keep your availability updated', body: 'If you are busy or unavailable, update your profile. It is better to be honest about availability than to take on jobs you cannot deliver properly.' },
      { heading: 'Get verified', body: 'Verified artisans receive significantly more enquiries than unverified ones. Upload your documents and get your EnGedi Verified badge as soon as possible.' },
    ],
    quiz: [
      { question: 'What is the most powerful trust signal on EnGedi?', options: ['Having a photo', 'Reviews from clients', 'Being online often', 'Having a long bio'], answer: 1 },
      { question: 'When should you respond to a client message?', options: ['Within a week', 'Whenever you feel like it', 'Within a few hours', 'Only if you want the job'], answer: 2 },
      { question: 'What does the EnGedi Verified badge tell clients?', options: ['You are the cheapest', 'Your documents have been reviewed and verified', 'You have been on the platform the longest', 'You have the most reviews'], answer: 1 },
    ]
  },
]

export default function TrainingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState(null)
  const [completedModules, setCompletedModules] = useState([])
  const [quizState, setQuizState] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [tab, setTab] = useState('modules')

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', sessionData.session.user.id).single()
      setProfile(profileData)
      const { data: completedData } = await supabase
        .from('training_completions')
        .select('module_id')
        .eq('user_id', sessionData.session.user.id)
      setCompletedModules(completedData?.map(c => c.module_id) || [])
      setLoading(false)
    }
    getData()
  }, [])

  const startQuiz = (mod) => {
    setQuizState(mod)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizScore(0)
    setTab('quiz')
  }

  const handleSubmitQuiz = async () => {
    let score = 0
    quizState.quiz.forEach((q, i) => {
      if (quizAnswers[i] === q.answer) score++
    })
    setQuizScore(score)
    setQuizSubmitted(true)
    const passed = score >= Math.ceil(quizState.quiz.length * 0.7)
    if (passed && !completedModules.includes(quizState.id)) {
      await supabase.from('training_completions').insert({
        user_id: profile.id,
        module_id: quizState.id,
        score,
        passed: true,
      })
      setCompletedModules([...completedModules, quizState.id])
    }
  }

  const allCompleted = completedModules.length === modules.length

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

        {/* Header */}
        <div style={{ background: '#1A1A1A', borderRadius: '16px', padding: '32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', background: 'linear-gradient(to left, #8B5E3C22, transparent)' }}></div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 8px' }}>EnGedi Training Hub</h1>
          <p style={{ color: '#999999', fontSize: '15px', margin: '0 0 20px', lineHeight: '1.6' }}>
            Complete all 5 modules and pass the quizzes to earn your <strong style={{ color: '#8B5E3C' }}>EnGedi Certified Professional</strong> badge.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: '#FFFFFF22', borderRadius: '10px', padding: '12px 20px' }}>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#FFFFFF' }}>{completedModules.length}/{modules.length}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#999999' }}>Modules completed</p>
            </div>
            {allCompleted && (
              <div style={{ background: '#2ecc71', borderRadius: '10px', padding: '12px 20px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#FFFFFF' }}>🏆 EnGedi Certified!</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#FFFFFF99' }}>All modules passed</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: '20px', background: '#FFFFFF22', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#8B5E3C', height: '100%', borderRadius: '20px', width: `${(completedModules.length / modules.length) * 100}%`, transition: 'width 0.3s' }}></div>
          </div>
        </div>

        {/* Tabs */}
        {activeModule && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {['modules', 'content', 'quiz'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: `1.5px solid ${tab === t ? '#1A1A1A' : '#EEE6DA'}`, background: tab === t ? '#1A1A1A' : '#FFFFFF', color: tab === t ? '#FFFFFF' : '#666666', fontWeight: '700', fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}
              >
                {t === 'modules' ? '← All Modules' : t === 'content' ? '📖 Read' : '✏️ Quiz'}
              </button>
            ))}
          </div>
        )}

        {/* Modules list */}
        {(!activeModule || tab === 'modules') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {modules.map((mod, index) => {
              const isCompleted = completedModules.includes(mod.id)
              const isLocked = index > 0 && !completedModules.includes(modules[index - 1].id)
              return (
                <div
                  key={mod.id}
                  style={{ background: '#FFFFFF', border: `1.5px solid ${isCompleted ? '#2ecc71' : '#EEE6DA'}`, borderRadius: '16px', padding: '24px', opacity: isLocked ? 0.6 : 1 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>{mod.category}</span>
                        <span style={{ color: '#999999', fontSize: '12px' }}>{mod.duration}</span>
                        {isCompleted && <span style={{ background: '#e8f8f0', border: '1px solid #2ecc71', color: '#27ae60', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>✓ Completed</span>}
                        {isLocked && <span style={{ background: '#F5EFE6', color: '#999999', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>🔒 Complete previous module first</span>}
                      </div>
                      <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 6px' }}>Module {mod.id}: {mod.title}</h3>
                      <p style={{ fontSize: '14px', color: '#666666', margin: 0, lineHeight: '1.5' }}>{mod.desc}</p>
                    </div>
                    {!isLocked && (
                      <button
                        onClick={() => { setActiveModule(mod); setQuizState(mod); setTab('content') }}
                        style={{ background: isCompleted ? '#e8f8f0' : '#1A1A1A', color: isCompleted ? '#27ae60' : '#FFFFFF', border: isCompleted ? '1.5px solid #2ecc71' : 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {isCompleted ? 'Review' : 'Start'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Module content */}
        {activeModule && tab === 'content' && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ background: '#F5EFE6', border: '1px solid #8B5E3C', color: '#8B5E3C', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>{activeModule.category}</span>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1A1A1A', margin: '12px 0 8px' }}>Module {activeModule.id}: {activeModule.title}</h2>
              <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>{activeModule.duration}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
              {activeModule.content.map((section, i) => (
                <div key={i} style={{ paddingLeft: '20px', borderLeft: '3px solid #8B5E3C' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px' }}>{section.heading}</h3>
                  <p style={{ fontSize: '15px', color: '#666666', margin: 0, lineHeight: '1.8' }}>{section.body}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => startQuiz(activeModule)}
              style={{ width: '100%', background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
            >
              Take the Quiz →
            </button>
          </div>
        )}

        {/* Quiz */}
        {activeModule && tab === 'quiz' && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>Quiz: {activeModule.title}</h2>
            <p style={{ color: '#666666', fontSize: '14px', margin: '0 0 32px' }}>Answer all questions. You need 70% to pass and earn your certificate.</p>

            {!quizSubmitted ? (
              <div>
                {activeModule.quiz.map((q, qi) => (
                  <div key={qi} style={{ marginBottom: '28px' }}>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 12px' }}>{qi + 1}. {q.question}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          onClick={() => setQuizAnswers({ ...quizAnswers, [qi]: oi })}
                          style={{ padding: '12px 16px', border: `1.5px solid ${quizAnswers[qi] === oi ? '#8B5E3C' : '#EEE6DA'}`, borderRadius: '10px', cursor: 'pointer', background: quizAnswers[qi] === oi ? '#F5EFE6' : '#FFFFFF', fontSize: '14px', color: '#1A1A1A' }}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(quizAnswers).length < activeModule.quiz.length}
                  style={{ width: '100%', background: Object.keys(quizAnswers).length < activeModule.quiz.length ? '#EEE6DA' : '#1A1A1A', color: Object.keys(quizAnswers).length < activeModule.quiz.length ? '#999999' : '#FFFFFF', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: Object.keys(quizAnswers).length < activeModule.quiz.length ? 'not-allowed' : 'pointer' }}
                >
                  Submit Quiz
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                  {quizScore >= Math.ceil(activeModule.quiz.length * 0.7) ? '🏆' : '📚'}
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>
                  {quizScore}/{activeModule.quiz.length} correct
                </h3>
                {quizScore >= Math.ceil(activeModule.quiz.length * 0.7) ? (
                  <div>
                    <p style={{ color: '#27ae60', fontSize: '15px', fontWeight: '700', margin: '0 0 24px' }}>You passed! Module {activeModule.id} is complete.</p>
                    {allCompleted
                      ? <div style={{ background: '#e8f8f0', border: '1.5px solid #2ecc71', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                          <p style={{ color: '#27ae60', fontWeight: '800', fontSize: '16px', margin: '0 0 4px' }}>🏆 Congratulations!</p>
                          <p style={{ color: '#27ae60', fontSize: '14px', margin: 0 }}>You have completed all modules and earned the EnGedi Certified Professional badge. It will appear on your profile.</p>
                        </div>
                      : <p style={{ color: '#666666', fontSize: '14px', margin: '0 0 24px' }}>Continue to the next module to progress toward your certificate.</p>
                    }
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#c0392b', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>Not quite — you need 70% to pass.</p>
                    <p style={{ color: '#666666', fontSize: '14px', margin: '0 0 24px' }}>Go back and read the module again, then try the quiz once more.</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setTab('content')} style={{ background: '#F5EFE6', color: '#8B5E3C', border: '1.5px solid #8B5E3C', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Re-read Module</button>
                  {quizScore >= Math.ceil(activeModule.quiz.length * 0.7)
                    ? <button onClick={() => { setActiveModule(null); setTab('modules') }} style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Back to Modules</button>
                    : <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false) }} style={{ background: '#1A1A1A', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Try Again</button>
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}