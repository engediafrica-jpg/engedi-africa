'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/AppNav'
import useAccessGate from '@/hooks/useAccessGate'
import LockedNotice from '@/components/LockedNotice'

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
  const channelRef = useRef(null)
  const profileRef = useRef(null)

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
      profileRef.current = profileData
      const { data: convData } = await supabase
        .from('conversations')
        .select('*, participant_one:profiles!conversations_participant_one_fkey(id, full_name, role, avatar_url), participant_two:profiles!conversations_participant_two_fkey(id, full_name, role, avatar_url)')
        .or(`participant_one.eq.${profileData.id},participant_two.eq.${profileData.id}`)
        .order('updated_at', { ascending: false })
      setConversations(convData || [])
      setLoading(false)
    }
    getData()

    // Clean up any open realtime subscription when the page unmounts
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Keep conversations list ordered by most recent activity, and bump the
  // conversation to the top when a new message arrives anywhere.
  const bumpConversation = (conversationId) => {
    setConversations(prev => {
      const updated = prev.map(c => c.id === conversationId ? { ...c, updated_at: new Date().toISOString() } : c)
      return [...updated].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    })
  }

  const openConversation = async (conv) => {
    setSelected(conv)

    // Tear down any previous subscription before opening a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    // Subscribe to new messages in this conversation in real time
    const channel = supabase
      .channel(`messages-${conv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        async (payload) => {
          const incoming = payload.new

          // Skip if we already have this message (e.g. our own optimistic insert)
          setMessages(prev => {
            if (prev.some(m => m.id === incoming.id)) return prev
            return [...prev, incoming]
          })

          // If the incoming message doesn't have sender info yet (realtime
          // payloads don't include joins), fetch it so the avatar/name show correctly
          if (!incoming.sender_id || incoming.sender_id === profileRef.current?.id) return
          const { data: senderData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', incoming.sender_id)
            .single()

          if (senderData) {
            setMessages(prev => prev.map(m => m.id === incoming.id ? { ...m, sender: senderData } : m))
          }

          bumpConversation(conv.id)
        }
      )
      .subscribe()

    channelRef.current = channel
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
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
      setNewMessage('')

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selected.id)

      bumpConversation(selected.id)

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

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <AppNav right={<Link href="/dashboard" className="text-[13px] text-ink-muted no-underline hover:text-ink-text">← Dashboard</Link>} />

      <div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-0 p-0 sm:gap-5 sm:p-6 md:flex-row">

        {/* Conversations list */}
        <div className={`w-full shrink-0 flex-col overflow-hidden border-line bg-surface-raised sm:border md:flex md:w-[280px] ${selected ? 'hidden' : 'flex'} md:flex`}>
          <div className="border-b border-line p-4 sm:p-5">
            <h2 className="m-0 text-[16px] font-bold text-text">Messages</h2>
            <p className="m-0 mt-1 text-[12px] text-text-muted">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0
              ? (
                <div className="p-6 text-center">
                  <p className="m-0 mb-2 text-[13px] text-text-muted">No conversations yet</p>
                  <p className="m-0 text-[12px] text-text-muted">Visit an artisan or supplier profile to start a conversation</p>
                </div>
              )
              : conversations.map(conv => {
                  const other = getOtherPerson(conv)
                  const isSelected = selected?.id === conv.id
                  return (
                    <div
                      key={conv.id}
                      onClick={() => openConversation(conv)}
                      className={`cursor-pointer border-b border-l-[3px] border-line px-4 py-4 sm:px-5 ${isSelected ? 'border-l-clay bg-surface-sunk' : 'border-l-transparent bg-surface-raised'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-clay bg-surface-sunk font-display text-[16px] font-bold text-clay">
                          {other?.avatar_url
                            ? <img src={other.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                            : other?.full_name?.charAt(0)?.toUpperCase() || '?'
                          }
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="m-0 mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-bold text-text">
                            {other?.full_name || 'Unknown'}
                          </p>
                          <p className="m-0 text-[11px] capitalize text-text-muted">
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
        <div className={`min-h-[500px] w-full flex-1 flex-col overflow-hidden border-line bg-surface-raised sm:border md:flex ${selected ? 'flex' : 'hidden'} md:flex`}>
          {!selected
            ? (
              <div className="flex flex-1 flex-col items-center justify-center p-10">
                <p className="m-0 mb-3 text-[15px] font-semibold text-text-muted">Select a conversation</p>
                <p className="m-0 text-center text-[13px] text-text-muted">Choose a conversation from the left to start chatting</p>
              </div>
            )
            : (
              <>
                {/* Chat header */}
                <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
                  <button
                    onClick={() => setSelected(null)}
                    className="shrink-0 text-[13px] font-bold text-clay md:hidden"
                    aria-label="Back to conversations"
                  >
                    ←
                  </button>
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-clay bg-surface-sunk font-bold text-clay">
                    {getOtherPerson(selected)?.avatar_url
                      ? <img src={getOtherPerson(selected).avatar_url} alt="avatar" className="h-full w-full object-cover" />
                      : getOtherPerson(selected)?.full_name?.charAt(0)?.toUpperCase()
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold text-text">
                      {getOtherPerson(selected)?.full_name}
                    </p>
                    <p className="m-0 text-[12px] capitalize text-text-muted">
                      {getOtherPerson(selected)?.role?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-6">
                  {messages.length === 0
                    ? (
                      <div className="flex flex-1 items-center justify-center">
                        <p className="text-[14px] text-text-muted">No messages yet. Say hello!</p>
                      </div>
                    )
                    : messages.map(msg => {
                        const isMe = msg.sender_id === profile.id
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-4 py-3 text-[14px] leading-relaxed sm:max-w-[70%] ${isMe ? 'rounded-sm bg-text text-surface' : 'border border-line bg-surface-sunk text-text'}`}>
                              <p className="m-0 mb-1 break-words">{msg.body}</p>
                              <p className={`m-0 text-[11px] opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
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
                <div className="flex shrink-0 gap-2 border-t border-line px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    className="min-w-0 flex-1 border border-line bg-surface-raised px-3 py-3 text-[14px] text-text outline-none focus:border-clay sm:px-4"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className={`shrink-0 px-4 py-3 font-display text-[14px] font-bold sm:px-6 ${sending || !newMessage.trim() ? 'cursor-not-allowed bg-surface-sunk text-text-muted' : 'bg-text text-surface hover:bg-clay-deep'}`}
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