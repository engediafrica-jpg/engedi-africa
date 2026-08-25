'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = {
  surface: '#15120e',
  raised: '#201a14',
  sunk: '#0f0c09',
  text: '#f1eae0',
  muted: '#a79a85',
  line: '#362d22',
  lineStrong: '#4a3d2c',
  clay: '#e08554',
  clayDeep: '#b85c38',
  oasis: '#86a98b',
  danger: '#e2695f',
  dangerSoft: '#2e1712',
}

export default function RequestQuoteForm({ providerId, providerName }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [timeframe, setTimeframe] = useState('asap')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function scheduledDateFromTimeframe(tf) {
    const now = new Date()
    if (tf === 'asap') return now.toISOString()
    if (tf === 'this_week') {
      now.setDate(now.getDate() + 7)
      return now.toISOString()
    }
    if (tf === 'next_week') {
      now.setDate(now.getDate() + 14)
      return now.toISOString()
    }
    return null
  }

  async function handleSubmit() {
    setError('')

    if (!title.trim() || !description.trim()) {
      setError('Please fill in a title and description for the job.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.push('/login')
      return
    }
    const clientId = sessionData.session.user.id

    if (clientId === providerId) {
      setError("You can't request a quote from yourself.")
      setLoading(false)
      return
    }

    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        client_id: clientId,
        provider_id: providerId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || null,
        budget: budget ? Number(budget) : null,
        status: 'pending',
        payment_status: 'unpaid',
        escrow_released: false,
        dispute_raised: false,
        scheduled_date: scheduledDateFromTimeframe(timeframe),
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    await supabase.from('notifications').insert({
      user_id: providerId,
      type: 'new_booking_request',
      title: 'New job request',
      body: `You have a new request: "${title.trim()}"`,
      link: '/bookings',
      is_read: false,
    })

    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div style={{ background: '#1a2e1d', border: `1px solid ${C.oasis}44`, borderRadius: 12, padding: 20 }}>
        <div style={{ color: C.oasis, fontWeight: 600, marginBottom: 6 }}>Request sent</div>
        <div style={{ color: C.text, fontSize: 14 }}>
          {providerName || 'The provider'} has been notified. You can track this request under{' '}
          <a href="/bookings" style={{ color: C.clay }}>My Bookings</a>.
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20 }}>
      <div style={{ color: C.text, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>
        Request a Quote{providerName ? ` from ${providerName}` : ''}
      </div>

      {error && (
        <div style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12, color: C.muted, marginBottom: 6 }}>
          Job Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Repair kitchen plumbing"
          style={{ width: '100%', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12, color: C.muted, marginBottom: 6 }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe the job in detail..."
          style={{ width: '100%', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12, color: C.muted, marginBottom: 6 }}>
          Location
        </label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Lekki, Lagos"
          style={{ width: '100%', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12, color: C.muted, marginBottom: 6 }}>
            Budget (₦)
          </label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Optional"
            style={{ width: '100%', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12, color: C.muted, marginBottom: 6 }}>
            Timeframe
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={{ width: '100%', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, boxSizing: 'border-box' }}
          >
            <option value="asap">ASAP</option>
            <option value="this_week">This week</option>
            <option value="next_week">Next week</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ background: C.clay, color: C.sunk, border: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, width: '100%' }}
      >
        {loading ? 'Sending Request...' : 'Send Request'}
      </button>
    </div>
  )
}