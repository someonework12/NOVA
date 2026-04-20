import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'
import ClassroomBoard from '../components/ClassroomBoard.jsx'

// ── TTS ───────────────────────────────────────────────────────────
function speak(text, onStart, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.9; utt.pitch = 1.0; utt.volume = 1
  const voices = window.speechSynthesis.getVoices()
  const v = voices.find(v =>
    v.name.includes('Google UK English Male') ||
    v.name.includes('Daniel') || v.name.includes('Alex')
  ) || voices.find(v => v.lang?.startsWith('en')) || voices[0]
  if (v) utt.voice = v
  utt.onstart = onStart
  utt.onend = onEnd
  utt.onerror = onEnd
  window.speechSynthesis.speak(utt)
}

// Wake words that activate Nova
const WAKE_WORDS = ['professor', 'nova', 'professor nova', 'hey nova', 'hey professor', 'good morning professor', 'good evening professor', 'good afternoon professor', 'hello professor']

function isWakeWord(text) {
  const lower = text.toLowerCase().trim()
  return WAKE_WORDS.some(w => lower.includes(w))
}

export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  const { group } = useGroup()
  const [mode, setMode] = useState('personal')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [novaState, setNovaState] = useState('idle') // idle | thinking | speaking | listening | awake
  const [voiceOn, setVoiceOn] = useState(true)
  const [alwaysListening, setAlwaysListening] = useState(false)
  const [manualListening, setManualListening] = useState(false)
  const [boardText, setBoardText] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const messagesRef = useRef(messages)
  const alwaysRecRef = useRef(null)
  const manualRecRef = useRef(null)
  const loadingRef = useRef(false)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { setMessages([]); setError('') }, [mode])
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }
    return () => {
      window.speechSynthesis?.cancel()
      alwaysRecRef.current?.stop()
      manualRecRef.current?.stop()
    }
  }, [])

  // ── Send to Nova API ─────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loadingRef.current) return
    const userMsg = { role: 'user', content: text.trim() }
    const history = [...messagesRef.current, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    loadingRef.current = true
    setNovaState('thinking')
    setError('')
    setBoardText('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const endpoint = mode === 'classroom' ? '/api/nova/classroom' : '/api/nova/chat'
      const body = mode === 'classroom'
        ? { messages: history, groupId: group?.id }
        : { messages: history }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)

      const reply = data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setBoardText(reply)

      if (voiceOn) {
        setNovaState('speaking')
        speak(reply, null, () => {
          setNovaState('idle')
          // Resume always-on listening after Nova finishes speaking
          if (alwaysListening) startAlwaysListening()
        })
      } else {
        setNovaState('idle')
      }
    } catch (err) {
      setError(err.message)
      setNovaState('idle')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [mode, group, voiceOn, alwaysListening])

  // ── Always-on wake word listener ─────────────────────────────────
  function startAlwaysListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ')
        .toLowerCase()
        .trim()

      if (isWakeWord(transcript) && novaState === 'idle') {
        // Wake word detected — greet and wait for question
        setNovaState('awake')
        window.speechSynthesis.cancel()
        speak("I'm here. What do you want to work on?", null, () => {
          setNovaState('idle')
          startManualListen(true) // auto-start listening for their question
        })
        return
      }

      // If Nova is awake and they said something real — send it
      if (transcript.length > 3 && !loadingRef.current && novaState !== 'speaking') {
        sendMessage(transcript)
      }
    }

    rec.onend = () => {
      // Restart if still in always-listening mode
      if (alwaysListening) {
        setTimeout(() => {
          try { rec.start() } catch (_) {}
        }, 300)
      }
    }

    rec.onerror = () => {}

    try { rec.start() } catch (_) {}
    alwaysRecRef.current = rec
  }

  function stopAlwaysListening() {
    try { alwaysRecRef.current?.stop() } catch (_) {}
    alwaysRecRef.current = null
  }

  function toggleAlwaysListening() {
    if (alwaysListening) {
      stopAlwaysListening()
      setAlwaysListening(false)
      setNovaState('idle')
    } else {
      setAlwaysListening(true)
      startAlwaysListening()
    }
  }

  // ── Manual mic button ─────────────────────────────────────────────
  function startManualListen(autoSend = false) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Voice input requires Chrome or Edge.'); return }
    window.speechSynthesis?.cancel()

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onresult = (e) => {
      const t = e.results[0][0].transcript
      setInput(t)
      setManualListening(false)
      if (autoSend) setTimeout(() => sendMessage(t), 400)
    }
    rec.onend = () => setManualListening(false)
    rec.onerror = () => setManualListening(false)

    manualRecRef.current = rec
    rec.start()
    setManualListening(true)
  }

  function toggleManualMic() {
    if (manualListening) {
      manualRecRef.current?.stop()
      setManualListening(false)
    } else {
      startManualListen(true)
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const canMic = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  const isActive = novaState !== 'idle'

  return (
    <div style={{ height: '100vh', background: '#1a0f08', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @keyframes nbounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-6px);opacity:1}}
        @keyframes nring{from{transform:scale(0.8);opacity:0.9}to{transform:scale(2.8);opacity:0}}
        @keyframes npulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes nwake{0%{box-shadow:0 0 0 0 rgba(245,200,66,0.4)}100%{box-shadow:0 0 0 24px rgba(245,200,66,0)}}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.4)', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#3B1F0E', fontFamily: 'serif' }}>N</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', fontFamily: 'serif' }}>Professor Nova</div>
            <div style={{ fontSize: 10, color: novaState === 'speaking' ? '#22c55e' : novaState === 'thinking' ? '#f5c842' : novaState === 'awake' ? '#a78bfa' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {novaState === 'speaking' ? '● speaking' : novaState === 'thinking' ? '● thinking' : novaState === 'awake' ? '● listening for you' : alwaysListening ? '◉ always listening' : '● ready'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Always-on toggle */}
          {canMic && (
            <button onClick={toggleAlwaysListening} style={{
              background: alwaysListening ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${alwaysListening ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 99, padding: '5px 12px', fontSize: 11, cursor: 'pointer',
              color: alwaysListening ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif',
              animation: alwaysListening ? 'nwake 2s ease-out infinite' : 'none'
            }}>
              {alwaysListening ? '◉ Wake word ON' : '◯ Wake word'}
            </button>
          )}

          <button onClick={() => { setVoiceOn(v => !v); window.speechSynthesis?.cancel(); setNovaState('idle') }} style={{
            background: voiceOn ? 'rgba(245,200,66,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${voiceOn ? 'rgba(245,200,66,0.35)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 99, padding: '5px 12px', fontSize: 11,
            color: voiceOn ? '#f5c842' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'sans-serif'
          }}>
            {voiceOn ? '🔊 Voice on' : '🔇 Muted'}
          </button>

          {group && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: 3, gap: 2 }}>
              {['personal', 'classroom'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '4px 10px', borderRadius: 99, fontSize: 11, border: 'none', cursor: 'pointer',
                  fontFamily: 'sans-serif', transition: 'all 0.2s',
                  background: mode === m ? '#f5c842' : 'transparent',
                  color: mode === m ? '#3B1F0E' : 'rgba(255,255,255,0.5)'
                }}>{m === 'personal' ? 'Personal' : 'Classroom'}</button>
              ))}
            </div>
          )}

          <Link to="/dashboard" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '5px 8px', textDecoration: 'none' }}>← Back</Link>
        </div>
      </div>

      {/* ── CLASSROOM MAIN AREA ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT: Sticky Avatar Panel */}
        <div style={{
          width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-start', paddingTop: 24,
          background: 'rgba(0,0,0,0.3)', borderRight: '1px solid rgba(255,255,255,0.04)',
          position: 'sticky', top: 0, height: '100%', overflowY: 'auto'
        }}>
          <NovaAvatar state={novaState} />

          {novaState === 'speaking' && (
            <button onClick={() => { window.speechSynthesis?.cancel(); setNovaState('idle') }}
              style={{ marginTop: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 99, padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              ■ Stop
            </button>
          )}

          {/* Session info */}
          <div style={{ marginTop: 16, padding: '0 12px', width: '100%' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Session #{(profile?.session_count || 0) + 1}
            </div>
          </div>
        </div>

        {/* CENTER + RIGHT: Board + Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* BLACKBOARD — shows Nova's current response being "written" */}
          {boardText && (
            <ClassroomBoard text={boardText} state={novaState} onDone={() => {}} />
          )}

          {/* Chat transcript */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {messages.length === 0 && (
              <div style={{ background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: 16, padding: '20px', maxWidth: 560 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#f5c842', marginBottom: 8, fontFamily: 'serif' }}>
                  Hello, {firstName}!
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75 }}>
                  {mode === 'classroom'
                    ? "Welcome everyone. I'm Professor Nova. What topic shall we tackle today?"
                    : "I'm Professor Nova. I know your courses and remember everything we've covered. What shall we work on today?"}
                </p>
                {canMic && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
                    {alwaysListening
                      ? '◉ Wake word is ON — just say "Professor" or "Nova" to get my attention'
                      : '🎤 Tap the mic or enable wake word to speak to me directly'}
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#3B1F0E', fontFamily: 'serif', marginTop: 2 }}>N</div>
                )}
                <div style={{
                  maxWidth: '78%', padding: '10px 14px', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap',
                  background: msg.role === 'user' ? 'var(--brown-700)' : 'rgba(255,255,255,0.07)',
                  color: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.88)',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {msg.content}
                  {msg.role === 'assistant' && voiceOn && (
                    <button onClick={() => { setNovaState('speaking'); speak(msg.content, null, () => setNovaState('idle')) }}
                      style={{ display: 'block', marginTop: 5, background: 'none', border: 'none', fontSize: 11, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'sans-serif', padding: 0 }}>
                      🔊 Replay
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#3B1F0E', fontFamily: 'serif' }}>N</div>
                <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 14px 14px 14px', padding: '10px 16px', display: 'flex', gap: 5 }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#f5c842', animation: 'nbounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s`, opacity: 0.7 }} />)}
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{error}</span>
                <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── INPUT BAR ── */}
          <div style={{ background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', flexShrink: 0 }}>
            {/* Suggestion chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {['Explain this topic', 'Quiz me', "I don't understand", 'Give me a practice problem'].map(s => (
                <button key={s} onClick={() => sendMessage(s)} disabled={loading}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                placeholder="Type your question or tap the mic to speak..."
                rows={1}
                disabled={loading || manualListening}
                style={{ flex: 1, padding: '10px 13px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 14, resize: 'none', fontFamily: 'sans-serif', lineHeight: 1.5, background: 'rgba(255,255,255,0.07)', color: '#fff', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#f5c842'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />

              {canMic && (
                <button onClick={toggleManualMic} style={{
                  width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: manualListening ? '#ef4444' : 'rgba(255,255,255,0.1)', transition: 'all 0.2s'
                }}>
                  {manualListening && <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #ef4444', animation: 'nring 1s ease-out infinite' }} />}
                  <span style={{ fontSize: 17 }}>{manualListening ? '⏹' : '🎤'}</span>
                </button>
              )}

              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                style={{ height: 42, padding: '0 18px', borderRadius: 12, background: '#f5c842', color: '#3B1F0E', fontWeight: 700, fontSize: 14, border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', opacity: input.trim() && !loading ? 1 : 0.4, fontFamily: 'sans-serif', transition: 'opacity 0.2s', flexShrink: 0 }}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
