import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [novaState, setNovaState] = useState('idle')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendToNova(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setNovaState('thinking')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/nova/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: newMessages })
      })
      const data = await res.json()
      if (data.reply) {
        setNovaState('speaking')
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        setTimeout(() => setNovaState('idle'), 4000)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue — please try again.' }])
      setNovaState('idle')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToNova(e) }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="nova-page-grid" style={{
      minHeight: '100vh', background: 'var(--brown-900)',
      display: 'grid', gridTemplateColumns: '1fr 420px'
    }}>
      {/* Left: Avatar */}
      <div className="nova-avatar-panel" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 'clamp(20px,4vw,40px)'
      }}>
        <NovaAvatar state={novaState} />
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: '#fff', marginBottom: 4 }}>Professor Nova</h2>
          <p style={{ fontSize: 12, color: 'var(--brown-400)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {novaState === 'thinking' ? 'Thinking...' : novaState === 'speaking' ? 'Speaking...' : 'Ready to teach'}
          </p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
            {['idle', 'thinking', 'speaking'].map(s => (
              <div key={s} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: novaState === s ? 'var(--yellow-500)' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.4s'
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right: Chat */}
      <div className="nova-chat-panel" style={{
        background: 'var(--surface)', display: 'flex', flexDirection: 'column',
        height: '100vh', borderLeft: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>Personal session</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Just you and Professor Nova</div>
          </div>
          <a href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Back</a>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 && (
            <div style={{ background: 'var(--yellow-50)', border: '1px solid var(--yellow-300)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)', marginBottom: 6 }}>Hello, {firstName}!</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                I am Professor Nova. I know your courses and I remember where we left off. What shall we work on today?
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)' }}>N</div>
              )}
              <div style={{
                maxWidth: '85%', padding: '11px 14px', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap',
                background: msg.role === 'user' ? 'var(--brown-700)' : '#fff',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-soft)',
                boxShadow: 'var(--shadow-sm)'
              }}>{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)' }}>N</div>
              <div style={{ background: '#fff', border: '1px solid var(--border-soft)', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brown-400)', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i*0.2}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className="nova-chat-form" onSubmit={sendToNova} style={{ padding: '12px 14px', borderTop: '1px solid var(--border-soft)', display: 'flex', gap: 8 }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Ask Professor Nova anything..." rows={1} disabled={loading}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', fontSize: 16, resize: 'none', fontFamily: 'var(--font-sans)', lineHeight: 1.5, background: '#fff', color: 'var(--text-primary)' }}
            onFocus={e => e.target.style.borderColor = 'var(--brown-500)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <button type="submit" disabled={!input.trim() || loading} className="btn-accent"
            style={{ padding: '10px 16px', fontSize: 14, borderRadius: 'var(--radius-md)', flexShrink: 0 }}>Ask</button>
        </form>
        <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-6px);opacity:1} }`}</style>
      </div>
    </div>
  )
}
