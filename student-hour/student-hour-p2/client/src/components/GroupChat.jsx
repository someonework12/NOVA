import { useState } from 'react'
import { useChat } from '../hooks/useChat.js'
import { useAuth } from '../hooks/useAuth.jsx'

function Avatar({ name, role }) {
  const colors = {
    tutor: { bg: 'var(--yellow-500)', text: 'var(--brown-900)' },
    student: { bg: 'var(--brown-200)', text: 'var(--brown-800)' },
    admin: { bg: 'var(--brown-700)', text: '#fff' }
  }
  const c = colors[role] || colors.student
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
      background: c.bg, color: c.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: 13
    }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

export default function GroupChat({ groupId, groupName }) {
  const { user } = useAuth()
  const { messages, loading, sendMessage, bottomRef } = useChat(groupId)
  const [input, setInput] = useState('')

  function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!groupId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 15 }}>
      You have not been assigned to a group yet.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Chat header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border-soft)',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)' }}>{groupName || 'Group Chat'}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>Real-time</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginTop: 40 }}>
            No messages yet. Say hello to your group!
          </div>
        ) : messages.map(msg => {
          const isOwn = msg.sender_id === user?.id
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 10, flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              {!isOwn && <Avatar name={msg.sender_name} role={msg.sender_role} />}
              <div style={{ maxWidth: '70%' }}>
                {!isOwn && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brown-700)' }}>{msg.sender_name}</span>
                    {msg.sender_role === 'tutor' && (
                      <span style={{ fontSize: 10, background: 'var(--yellow-100)', color: 'var(--brown-800)', padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>Tutor</span>
                    )}
                  </div>
                )}
                <div style={{
                  background: isOwn ? 'var(--brown-700)' : '#fff',
                  color: isOwn ? '#fff' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: 14, lineHeight: 1.6,
                  border: isOwn ? 'none' : '1px solid var(--border-soft)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: isOwn ? 'right' : 'left' }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: '16px 24px', borderTop: '1px solid var(--border-soft)',
        display: 'flex', gap: 10, alignItems: 'flex-end'
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message your group... (Enter to send)"
          rows={1}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border)', fontSize: 14, resize: 'none',
            fontFamily: 'var(--font-sans)', lineHeight: 1.5,
            background: '#fff', color: 'var(--text-primary)',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--brown-500)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: 14, borderRadius: 'var(--radius-md)', flexShrink: 0 }}
          disabled={!input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
