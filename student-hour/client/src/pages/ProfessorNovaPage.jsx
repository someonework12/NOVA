import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'

const API = () => import.meta.env.VITE_API_URL || ''

async function novaFetch(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }
  return res.json()
}

function NovaStateDot({ state }) {
  const colors = { idle: 'rgba(255,255,255,0.3)', thinking: '#f5c842', speaking: '#22c55e' }
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[state], transition: 'background 0.4s', animation: state !== 'idle' ? 'npulse 1.4s ease-in-out infinite' : 'none' }} />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {state === 'thinking' ? 'Thinking' : state === 'speaking' ? 'Speaking' : 'Nova'}
      </span>
    </div>
  )
}

function Message({ msg, isOwn }) {
  return (
    <div style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
      {!isOwn && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)', marginTop: 2 }}>N</div>
      )}
      <div style={{
        maxWidth: '82%', padding: '11px 14px', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap',
        background: isOwn ? 'var(--brown-700)' : '#fff',
        color: isOwn ? '#fff' : 'var(--text-primary)',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        border: isOwn ? 'none' : '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-sm)'
      }}>{msg.content}</div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)' }}>N</div>
      <div style={{ background: '#fff', border: '1px solid var(--border-soft)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', display: 'flex', gap: 5 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brown-300)', animation: 'nbounce 1.2s ease-in-out infinite', animationDelay: `${i*0.2}s` }} />)}
      </div>
    </div>
  )
}

export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  const { group } = useGroup()
  const [mode, setMode] = useState('personal') // personal | classroom
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [novaState, setNovaState] = useState('idle')
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Reset messages when switching mode
  useEffect(() => { setMessages([]); setError('') }, [mode])

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const history = [...messages, userMsg]
    setMessages(history); setInput(''); setLoading(true); setNovaState('thinking'); setError('')

    try {
      const endpoint = mode === 'classroom' ? '/api/nova/classroom' : '/api/nova/chat'
      const body = mode === 'classroom'
        ? { messages: history, groupId: group?.id }
        : { messages: history }

      const data = await novaFetch(endpoint, body)
      setNovaState('speaking')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      setTimeout(() => setNovaState('idle'), 3500)
    } catch (err) {
      setError(err.message)
      setNovaState('idle')
    } finally { setLoading(false) }
  }

  function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--brown-900)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes nbounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
        @keyframes npulse{0%,100%{opacity:1}50%{opacity:.25}}
      `}</style>

      {/* Header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)', flexShrink: 0 }}>N</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#fff', fontFamily: 'var(--font-serif)' }}>Professor Nova</div>
            <NovaStateDot state={novaState} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mode toggle */}
          {group && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-full)', padding: 3, gap: 2 }}>
              {['personal','classroom'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 500,
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  background: mode === m ? 'var(--yellow-500)' : 'transparent',
                  color: mode === m ? 'var(--brown-900)' : 'rgba(255,255,255,0.55)',
                  transition: 'all 0.2s'
                }}>{m === 'personal' ? 'Personal' : 'Classroom'}</button>
              ))}
            </div>
          )}
          <Link to="/dashboard" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', padding: '6px 10px' }}>← Back</Link>
        </div>
      </div>

      {/* Mode banner */}
      {mode === 'classroom' && (
        <div style={{ background: 'rgba(245,200,66,0.12)', borderBottom: '1px solid rgba(245,200,66,0.2)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--yellow-300)' }}>
            Classroom mode — {group?.name || 'your group'}. Nova will teach everyone, not just you.
          </span>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760, width: '100%', margin: '0 auto', alignSelf: 'stretch' }}>
        {messages.length === 0 && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', padding: '22px 20px', maxWidth: 560 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#fff', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
              {mode === 'classroom' ? `Welcome everyone!` : `Hello, ${firstName}!`}
            </div>
            <p style={{ fontSize: 14, color: 'var(--brown-300)', lineHeight: 1.75 }}>
              {mode === 'classroom'
                ? `I'm Professor Nova. I'm here to teach ${group?.name || 'your group'} today. What topic shall we tackle?`
                : `I'm Professor Nova. I know your courses and I remember where we left off. What shall we work on today?`
              }
            </p>
            {profile?.session_count > 0 && mode === 'personal' && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--brown-400)' }}>
                Session #{(profile.session_count || 0) + 1} together
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} isOwn={msg.role === 'user'} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', padding: '12px 18px' }}>
        <form onSubmit={send} style={{ display: 'flex', gap: 8, maxWidth: 760, margin: '0 auto' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder={mode === 'classroom' ? 'Ask Professor Nova to teach the group...' : 'Ask Professor Nova anything...'}
            rows={1} disabled={loading}
            style={{ flex: 1, padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1.5px solid rgba(255,255,255,0.15)', fontSize: 14, resize: 'none', fontFamily: 'var(--font-sans)', lineHeight: 1.5, background: 'rgba(255,255,255,0.08)', color: '#fff', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = 'var(--yellow-500)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
          />
          <button type="submit" disabled={!input.trim() || loading}
            style={{ padding: '10px 18px', fontSize: 14, borderRadius: 'var(--radius-md)', flexShrink: 0, background: 'var(--yellow-500)', color: 'var(--brown-900)', fontWeight: 600, border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', opacity: input.trim() && !loading ? 1 : 0.5, transition: 'opacity 0.2s', fontFamily: 'var(--font-sans)' }}>
            Ask
          </button>
        </form>
        <div style={{ maxWidth: 760, margin: '8px auto 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(mode === 'personal'
            ? ['Explain this topic simply', 'Quiz me on what I know', 'Help me understand a concept', 'Give me practice problems']
            : ['Start a lesson on our shared topic', 'Ask the group a question', 'Explain this concept step by step', 'Give us an exam-style question']
          ).map(s => (
            <button key={s} onClick={() => setInput(s)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = 'rgba(255,255,255,0.7)' }}
              onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.color = 'rgba(255,255,255,0.45)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
