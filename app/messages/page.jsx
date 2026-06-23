'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    const getData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single()
      setProfile(profileData)
      const { data: convData } = await supabase
        .from('conversations')
        .select('*, participant_one:profiles!conversations_participant_one_fkey(id, full_name, role, avatar_url), participant_two:profiles!conversations_participant_two_fkey(id, full_name, role, avatar_url)')
        .or(`participant_one.eq.${profileData.id},participant_two.eq.${profileData.id}`)
        .order('updated_at', { ascending: false })
      setConversations(convData || [])
      setLoading(false)
    }
    getData()
  }, [])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openConversation = async (conv) => {
    setSelected(conv)
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selected) return
    setSending(true)
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selected.id,
        sender_id: profile.id,
        body: newMessage,
      })
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
      .single()

    if (!error && data) {
      setMessages([...messages, data])
      setNewMessage('')

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selected.id)

      const otherPersonId = selected.participant_one?.id === profile.id
        ? selected.participant_two?.id
        : selected.participant_one?.id

      if (otherPersonId) {
        await supabase.from('notifications').insert({
          user_id: otherPersonId,
          type: 'message',
          title: `New message from ${profile.full_name}`,
          body: newMessage.length > 60 ? newMessage.substring(0, 60) + '...' : newMessage,
          link: '/messages',
          is_read: false,
        })
      }
    }
    setSending(false)
  }

  const getOtherPerson = (conv) => {
    if (!profile) return null
    return conv.participant_one?.id === profile.id ? conv.participant_two : conv.participant_one
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666666' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/dashboard" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Dashboard</Link>
      </div>

      <div style={{ flex: 1, display: 'flex', maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '24px', gap: '20px', boxSizing: 'border-box' }}>

        {/* Conversations list */}
        <div style={{ width: '280px', flexShrink: 0, background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #EEE6DA' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1A1A1A', margin: 0 }}>Messages</h2>
            <p style={{ fontSize: '12px', color: '#999999', margin: '4px 0 0' }}>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0
              ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 8px' }}>No conversations yet</p>
                  <p style={{ color: '#999999', fontSize: '12px', margin: 0 }}>Visit an artisan or supplier profile to start a conversation</p>
                </div>
              )
              : conversations.map(conv => {
                  const other = getOtherPerson(conv)
                  const isSelected = selected?.id === conv.id
                  return (
                    <div
                      key={conv.id}
                      onClick={() => openConversation(conv)}
                      style={{ padding: '16px 20px', borderBottom: '1px solid #EEE6DA', cursor: 'pointer', background: isSelected ? '#F5EFE6' : '#FFFFFF', borderLeft: isSelected ? '3px solid #8B5E3C' : '3px solid transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#F5EFE6', border: '1.5px solid #8B5E3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#8B5E3C', fontSize: '16px', flexShrink: 0, overflow: 'hidden' }}>
                          {other?.avatar_url
                            ? <img src={other.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : other?.full_name?.charAt(0)?.toUpperCase() || '?'
                          }
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '14px', color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {other?.full_name || 'Unknown'}
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#999999', textTransform: 'capitalize' }}>
                            {other?.role?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* Chat window */}
        <div style={{ flex: 1, background: '#FFFFFF', border: '1.5px solid #EEE6DA', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '500px' }}>
          {!selected
            ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <p style={{ color: '#999999', fontSize: '24px', marginBottom: '12px' }}>💬</p>
                <p style={{ color: '#999999', fontSize: '15px', fontWeight: '600', margin: '0 0 8px' }}>Select a conversation</p>
                <p style={{ color: '#999999', fontSize: '13px', margin: 0, textAlign: 'center' }}>Choose a conversation from the left to start chatting</p>
              </div>
            )
            : (
              <>
                {/* Chat header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #EEE6DA', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#F5EFE6', border: '1.5px solid #8B5E3C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#8B5E3C', overflow: 'hidden', flexShrink: 0 }}>
                    {getOtherPerson(selected)?.avatar_url
                      ? <img src={getOtherPerson(selected).avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getOtherPerson(selected)?.full_name?.charAt(0)?.toUpperCase()
                    }
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '15px', color: '#1A1A1A' }}>
                      {getOtherPerson(selected)?.full_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#999999', textTransform: 'capitalize' }}>
                      {getOtherPerson(selected)?.role?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {messages.length === 0
                    ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ color: '#999999', fontSize: '14px' }}>No messages yet. Say hello!</p>
                      </div>
                    )
                    : messages.map(msg => {
                        const isMe = msg.sender_id === profile.id
                        return (
                          <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                              maxWidth: '70%',
                              background: isMe ? '#1A1A1A' : '#F5EFE6',
                              color: isMe ? '#FFFFFF' : '#1A1A1A',
                              padding: '12px 16px',
                              borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              fontSize: '14px',
                              lineHeight: '1.5'
                            }}>
                              <p style={{ margin: '0 0 4px' }}>{msg.body}</p>
                              <p style={{ margin: 0, fontSize: '11px', opacity: 0.6, textAlign: isMe ? 'right' : 'left' }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                  }
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #EEE6DA', display: 'flex', gap: '12px', flexShrink: 0 }}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    style={{ flex: 1, padding: '12px 16px', border: '1.5px solid #EEE6DA', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    style={{ background: sending || !newMessage.trim() ? '#EEE6DA' : '#1A1A1A', color: sending || !newMessage.trim() ? '#999999' : '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </>
            )
          }
        </div>
      </div>
    </div>
  )
}