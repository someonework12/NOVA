import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.jsx'

export function useChat(groupId) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!groupId) return

    async function fetchMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages(data || [])
      setLoading(false)
    }

    fetchMessages()

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${groupId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(content) {
    if (!content.trim() || !groupId) return
    await supabase.from('messages').insert({
      group_id: groupId,
      sender_id: user.id,
      sender_name: profile?.full_name || 'Student',
      sender_role: profile?.role || 'student',
      content: content.trim()
    })
  }

  return { messages, loading, sendMessage, bottomRef }
}
