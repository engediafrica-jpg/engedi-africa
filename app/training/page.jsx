'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import Button from '@/components/Button'
import Badge from '@/components/Badge'

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
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-text-muted">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      <div className="mx-auto max-w-[900px] px-6 py-10">

        {/* Header */}
        <div className="mb-6 border border-clay-deep bg-ink p-8">
          <h1 className="m-0 mb-2 text-[26px] font-bold text-ink-text">EnGedi Training Hub</h1>
          <p className="m-0 mb-5 text-[15px] leading-relaxed text-ink-muted">
            Complete all 5 modules and pass the quizzes to earn your <strong className="text-clay">EnGedi Certified Professional</strong> badge.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="border border-line-strong px-5 py-3">
              <p className="m-0 font-mono text-[22px] font-bold tabular-nums text-ink-text">{completedModules.length}/{modules.length}</p>
              <p className="m-0 text-[12px] text-ink-muted">Modules completed</p>
            </div>
            {allCompleted && (
              <div className="border border-oasis bg-oasis-soft px-5 py-3">
                <p className="m-0 text-[14px] font-bold text-oasis">EnGedi Certified!</p>
                <p className="m-0 text-[12px] text-oasis">All modules passed</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-5 h-2 overflow-hidden bg-line-strong">
            <div className="h-full bg-clay transition-[width] duration-300" style={{ width: `${(completedModules.length / modules.length) * 100}%` }}></div>
          </div>
        </div>

        {/* Tabs */}
        {activeModule && (
          <div className="mb-6 flex gap-2">
            {['modules', 'content', 'quiz'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border px-5 py-2.5 text-[13px] font-bold capitalize ${tab === t ? 'border-text bg-text text-surface' : 'border-line-strong text-text-muted hover:border-text'}`}
              >
                {t === 'modules' ? '← All Modules' : t === 'content' ? 'Read' : 'Quiz'}
              </button>
            ))}
          </div>
        )}

        {/* Modules list */}
        {(!activeModule || tab === 'modules') && (
          <div className="flex flex-col gap-4">
            {modules.map((mod, index) => {
              const isCompleted = completedModules.includes(mod.id)
              const isLocked = index > 0 && !completedModules.includes(modules[index - 1].id)
              return (
                <div
                  key={mod.id}
                  className={`border p-6 ${isCompleted ? 'border-oasis' : 'border-line'} bg-surface-raised ${isLocked ? 'opacity-60' : ''}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone="pending">{mod.category}</Badge>
                        <span className="text-[12px] text-text-muted">{mod.duration}</span>
                        {isCompleted && <Badge tone="success">Completed</Badge>}
                        {isLocked && <Badge tone="neutral">Complete previous module first</Badge>}
                      </div>
                      <h3 className="m-0 mb-1.5 text-[17px] font-bold text-text">Module {mod.id}: {mod.title}</h3>
                      <p className="m-0 text-[14px] leading-relaxed text-text-muted">{mod.desc}</p>
                    </div>
                    {!isLocked && (
                      <Button
                        variant={isCompleted ? 'outline' : 'solid'}
                        className={`shrink-0 ${isCompleted ? 'border-oasis text-oasis hover:bg-oasis-soft' : ''}`}
                        onClick={() => { setActiveModule(mod); setQuizState(mod); setTab('content') }}
                      >
                        {isCompleted ? 'Review' : 'Start'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Module content */}
        {activeModule && tab === 'content' && (
          <div className="border border-line bg-surface-raised p-8">
            <div className="mb-6">
              <Badge tone="pending">{activeModule.category}</Badge>
              <h2 className="m-0 mb-2 mt-3 text-[22px] font-bold text-text">Module {activeModule.id}: {activeModule.title}</h2>
              <p className="m-0 text-[14px] text-text-muted">{activeModule.duration}</p>
            </div>

            <div className="mb-8 flex flex-col gap-6">
              {activeModule.content.map((section, i) => (
                <div key={i} className="border-l-2 border-clay pl-5">
                  <h3 className="m-0 mb-2 text-[16px] font-bold text-text">{section.heading}</h3>
                  <p className="m-0 text-[15px] leading-[1.8] text-text-muted">{section.body}</p>
                </div>
              ))}
            </div>

            <Button className="w-full justify-center" onClick={() => startQuiz(activeModule)}>Take the Quiz →</Button>
          </div>
        )}

        {/* Quiz */}
        {activeModule && tab === 'quiz' && (
          <div className="border border-line bg-surface-raised p-8">
            <h2 className="m-0 mb-2 text-[20px] font-bold text-text">Quiz: {activeModule.title}</h2>
            <p className="m-0 mb-8 text-[14px] text-text-muted">Answer all questions. You need 70% to pass and earn your certificate.</p>

            {!quizSubmitted ? (
              <div>
                {activeModule.quiz.map((q, qi) => (
                  <div key={qi} className="mb-7">
                    <p className="m-0 mb-3 text-[15px] font-bold text-text">{qi + 1}. {q.question}</p>
                    <div className="flex flex-col gap-2">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          onClick={() => setQuizAnswers({ ...quizAnswers, [qi]: oi })}
                          className={`cursor-pointer border px-4 py-3 text-[14px] text-text ${quizAnswers[qi] === oi ? 'border-clay bg-surface-sunk' : 'border-line hover:border-line-strong'}`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button
                  className="w-full justify-center"
                  disabled={Object.keys(quizAnswers).length < activeModule.quiz.length}
                  onClick={handleSubmitQuiz}
                >
                  Submit Quiz
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="m-0 mb-2 text-[22px] font-bold text-text">
                  {quizScore}/{activeModule.quiz.length} correct
                </h3>
                {quizScore >= Math.ceil(activeModule.quiz.length * 0.7) ? (
                  <div>
                    <p className="m-0 mb-6 text-[15px] font-bold text-oasis">You passed! Module {activeModule.id} is complete.</p>
                    {allCompleted
                      ? <div className="mb-6 border border-oasis bg-oasis-soft p-5">
                          <p className="m-0 mb-1 text-[16px] font-bold text-oasis">Congratulations!</p>
                          <p className="m-0 text-[14px] text-oasis">You have completed all modules and earned the EnGedi Certified Professional badge. It will appear on your profile.</p>
                        </div>
                      : <p className="m-0 mb-6 text-[14px] text-text-muted">Continue to the next module to progress toward your certificate.</p>
                    }
                  </div>
                ) : (
                  <div>
                    <p className="m-0 mb-2 text-[15px] font-bold text-danger">Not quite — you need 70% to pass.</p>
                    <p className="m-0 mb-6 text-[14px] text-text-muted">Go back and read the module again, then try the quiz once more.</p>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" onClick={() => setTab('content')}>Re-read Module</Button>
                  {quizScore >= Math.ceil(activeModule.quiz.length * 0.7)
                    ? <Button onClick={() => { setActiveModule(null); setTab('modules') }}>Back to Modules</Button>
                    : <Button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false) }}>Try Again</Button>
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
