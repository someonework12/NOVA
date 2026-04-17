import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

// ─── Voice utilities ──────────────────────────────────────────────
// Text-to-speech: speak Nova's reply out loud
function speakText(text, onStart, onEnd) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.92
  utt.pitch = 1.0
  utt.volume = 1

  // Pick a good voice — prefer a male English voice for Nova
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    v.name.includes('Google UK English Male') ||
    v.name.includes('Daniel') ||
    v.name.includes('Alex') ||
    (v.lang.startsWith('en') && v.name.toLowerCase().includes('male'))
  ) || voices.find(v => v.lang.startsWith('en')) || voices[0]
  if (preferred) utt.voice = preferred

  utt.onstart = onStart
  utt.onend = onEnd
  utt.onerror = onEnd
  window.speechSynthesis.speak(utt)
}

// Speech-to-text: listen for student voice input
function createSpeechRecognition(onResult, onEnd) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const rec = new SR()
  rec.continuous = false
  rec.interimResults = false
  rec.lang = 'en-US'
  rec.onresult = e => {
    const text = e.results[0][0].transcript
    onResult(text)
  }
  rec.onend = onEnd
  rec.onerror = onEnd
  return rec
}
// ─────────────────────────────────────────────────────────────────

const API = () => import.meta.env.VITE_API_URL || ''

async function novaFetch(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
  return data
}

export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  const { group } = useGroup()
  const [mode, setMode] = useState('personal')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [novaState, setNovaState] = useState('idle') // idle | thinking | speaking
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const recRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])
  useEffect(() => { setMessages([]); setError('') }, [mode])

  // Load voices on mount (Chrome requires this)
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  // ── Send message to Nova ──────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return
    const userMsg = { role:'user', content: text.trim() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    setNovaState('thinking')
    setError('')

    try {
      const endpoint = mode === 'classroom' ? '/api/nova/classroom' : '/api/nova/chat'
      const body = mode === 'classroom' ? { messages: history, groupId: group?.id } : { messages: history }
      const data = await novaFetch(endpoint, body)
      const reply = data.reply

      setMessages(prev => [...prev, { role:'assistant', content: reply }])

      if (voiceEnabled) {
        setNovaState('speaking')
        speakText(reply,
          () => setNovaState('speaking'),
          () => setNovaState('idle')
        )
      } else {
        setNovaState('idle')
      }
    } catch(err) {
      setError(err.message)
      setNovaState('idle')
    } finally {
      setLoading(false)
    }
  }, [messages, mode, group, loading, voiceEnabled])

  // ── Voice input ───────────────────────────────────────────────
  function toggleListening() {
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    window.speechSynthesis?.cancel()
    const rec = createSpeechRecognition(
      (text) => {
        setInput(text)
        setListening(false)
        // Auto-send after voice input
        setTimeout(() => sendMessage(text), 300)
      },
      () => setListening(false)
    )
    if (!rec) { setError('Voice input not supported in this browser. Use Chrome.'); return }
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel()
    setNovaState('idle')
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const hasVoiceSupport = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  return (
    <div style={{ minHeight:'100vh', background:'var(--brown-900)', display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes nbounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
        @keyframes nripple{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2.4);opacity:0}}
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--yellow-500)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, color:'var(--brown-900)', fontFamily:'var(--font-serif)', flexShrink:0 }}>N</div>
          <div>
            <div style={{ fontWeight:600, fontSize:15, color:'#fff', fontFamily:'var(--font-serif)' }}>Professor Nova</div>
            <div style={{ fontSize:11, color: novaState==='thinking' ? 'var(--yellow-400)' : novaState==='speaking' ? '#22c55e' : 'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              {novaState==='thinking' ? '● thinking...' : novaState==='speaking' ? '● speaking' : '● ready'}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Voice toggle */}
          <button onClick={() => { setVoiceEnabled(v=>!v); window.speechSynthesis?.cancel(); setNovaState('idle') }}
            title={voiceEnabled ? 'Mute Nova' : 'Unmute Nova'}
            style={{ background: voiceEnabled ? 'rgba(245,200,66,0.2)' : 'rgba(255,255,255,0.08)', border:`1px solid ${voiceEnabled ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.15)'}`, borderRadius:'var(--radius-full)', padding:'6px 12px', fontSize:12, color: voiceEnabled ? 'var(--yellow-400)' : 'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'var(--font-sans)', display:'flex', alignItems:'center', gap:5 }}>
            {voiceEnabled ? '🔊 Voice on' : '🔇 Voice off'}
          </button>

          {/* Mode toggle */}
          {group && (
            <div style={{ display:'flex', background:'rgba(255,255,255,0.08)', borderRadius:'var(--radius-full)', padding:3, gap:2 }}>
              {['personal','classroom'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ padding:'6px 12px', borderRadius:'var(--radius-full)', fontSize:12, fontWeight:500, border:'none', cursor:'pointer', fontFamily:'var(--font-sans)', background: mode===m ? 'var(--yellow-500)' : 'transparent', color: mode===m ? 'var(--brown-900)' : 'rgba(255,255,255,0.55)', transition:'all 0.2s' }}>
                  {m==='personal' ? 'Personal' : 'Classroom'}
                </button>
              ))}
            </div>
          )}

          <Link to="/dashboard" style={{ fontSize:13, color:'rgba(255,255,255,0.4)', padding:'6px 10px' }}>← Back</Link>
        </div>
      </div>

      {/* ── Avatar + Chat split layout ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Avatar panel — hidden on mobile */}
        <div className="nova-avatar-panel" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 32px', borderRight:'1px solid rgba(255,255,255,0.06)', flexShrink:0, minWidth:280 }}>
          <NovaAvatar state={novaState} speaking={novaState==='speaking'} />

          {/* Stop speaking button */}
          {novaState === 'speaking' && (
            <button onClick={stopSpeaking} style={{ marginTop:16, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'var(--radius-full)', padding:'8px 18px', fontSize:12, color:'rgba(255,255,255,0.7)', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
              ■ Stop speaking
            </button>
          )}
        </div>

        {/* Chat panel */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--surface)' }}>

          {mode==='classroom' && (
            <div style={{ background:'rgba(245,200,66,0.1)', borderBottom:'1px solid rgba(245,200,66,0.2)', padding:'8px 18px', fontSize:13, color:'var(--yellow-700)', flexShrink:0 }}>
              Classroom mode — {group?.name}. Nova teaches the whole group.
            </div>
          )}

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px', display:'flex', flexDirection:'column', gap:14 }}>
            {messages.length===0 && (
              <div style={{ background:'var(--yellow-50)', border:'1px solid var(--yellow-300)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
                <div style={{ fontWeight:600, fontSize:15, color:'var(--brown-900)', marginBottom:8 }}>
                  {mode==='classroom' ? `Welcome everyone!` : `Hello, ${firstName}!`}
                </div>
                <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.75 }}>
                  {mode==='classroom'
                    ? `I'm Professor Nova. Let's get started — what topic shall we tackle today?`
                    : `I'm Professor Nova. I know your courses and I'll remember everything we cover. What shall we work on today?`
                  }
                </p>
                {hasVoiceSupport && voiceEnabled && (
                  <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:10 }}>
                    🎤 Tap the microphone to speak to me directly — I'll respond out loud.
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display:'flex', flexDirection: msg.role==='user'?'row-reverse':'row', gap:8, alignItems:'flex-start' }}>
                {msg.role==='assistant' && (
                  <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:'var(--yellow-500)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'var(--brown-900)', fontFamily:'var(--font-serif)', marginTop:2 }}>N</div>
                )}
                <div style={{ maxWidth:'82%', padding:'11px 14px', fontSize:14, lineHeight:1.75, whiteSpace:'pre-wrap', background: msg.role==='user'?'var(--brown-700)':'#fff', color: msg.role==='user'?'#fff':'var(--text-primary)', borderRadius: msg.role==='user'?'16px 16px 4px 16px':'4px 16px 16px 16px', border: msg.role==='user'?'none':'1px solid var(--border-soft)', boxShadow:'var(--shadow-sm)' }}>
                  {msg.content}
                  {/* Re-speak button */}
                  {msg.role==='assistant' && voiceEnabled && (
                    <button onClick={() => speakText(msg.content, ()=>setNovaState('speaking'), ()=>setNovaState('idle'))}
                      style={{ display:'block', marginTop:6, background:'none', border:'none', fontSize:11, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font-sans)', padding:0 }}>
                      🔊 Replay
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--yellow-500)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'var(--brown-900)', fontFamily:'var(--font-serif)' }}>N</div>
                <div style={{ background:'#fff', border:'1px solid var(--border-soft)', borderRadius:'4px 16px 16px 16px', padding:'12px 16px', display:'flex', gap:5 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--brown-400)', animation:'nbounce 1.2s ease-in-out infinite', animationDelay:`${i*0.2}s` }} />)}
                </div>
              </div>
            )}

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#c0392b', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>{error}</span>
                <button onClick={()=>setError('')} style={{ background:'none', border:'none', color:'#c0392b', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input area ── */}
          <div style={{ borderTop:'1px solid var(--border-soft)', background:'#fff', padding:'12px 16px', flexShrink:0 }}>
            {/* Suggestion chips */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {['Explain this to me','Quiz me','I don\'t understand','Give me practice problems'].map(s => (
                <button key={s} onClick={() => sendMessage(s)} disabled={loading}
                  style={{ fontSize:11, padding:'4px 10px', borderRadius:'var(--radius-full)', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border-soft)', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'all 0.15s' }}>
                  {s}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Type your question, or tap the mic to speak..."
                rows={1} disabled={loading || listening}
                style={{ flex:1, padding:'11px 14px', borderRadius:'var(--radius-md)', border:'1.5px solid var(--border)', fontSize:14, resize:'none', fontFamily:'var(--font-sans)', lineHeight:1.5, background:'#fff', color:'var(--text-primary)', transition:'border-color 0.2s' }}
                onFocus={e=>e.target.style.borderColor='var(--brown-500)'}
                onBlur={e=>e.target.style.borderColor='var(--border)'} />

              {/* Mic button */}
              {hasVoiceSupport && (
                <button type="button" onClick={toggleListening}
                  style={{ width:44, height:44, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background: listening ? '#ef4444' : 'var(--brown-100)', transition:'all 0.2s' }}>
                  {listening && <div style={{ position:'absolute', inset:-4, borderRadius:'50%', border:'2px solid #ef4444', animation:'nripple 1s ease-out infinite' }} />}
                  <span style={{ fontSize:18 }}>{listening ? '⏹' : '🎤'}</span>
                </button>
              )}

              {/* Send button */}
              <button type="submit" disabled={!input.trim() || loading}
                style={{ height:44, padding:'0 18px', borderRadius:'var(--radius-md)', background:'var(--brown-700)', color:'#fff', fontWeight:600, fontSize:14, border:'none', cursor: input.trim()&&!loading?'pointer':'not-allowed', opacity: input.trim()&&!loading?1:0.5, fontFamily:'var(--font-sans)', transition:'opacity 0.2s', flexShrink:0 }}>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
