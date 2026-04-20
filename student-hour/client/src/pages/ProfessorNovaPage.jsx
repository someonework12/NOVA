import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

// ── VOICE SYNTHESIS ───────────────────────────────────────────────
function getDeepVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  // Prefer deep male voices in priority order
  const preferred = [
    'Google UK English Male', 'Microsoft David', 'Daniel',
    'Alex', 'Fred', 'Microsoft Mark', 'Google US English'
  ]
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name))
    if (v) return v
  }
  // Fallback: first English voice
  return voices.find(v => v.lang?.startsWith('en')) || voices[0]
}

function speakNova(text, onStart, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return null }
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.82    // slower = deeper feel
  utt.pitch = 0.75   // lower pitch = authoritative
  utt.volume = 1
  const voice = getDeepVoice()
  if (voice) utt.voice = voice
  utt.onstart = onStart
  utt.onend = onEnd
  utt.onerror = onEnd
  window.speechSynthesis.speak(utt)
  return utt
}

// ── SPEECH RECOGNITION ────────────────────────────────────────────
function createRecognizer({ onResult, onEnd, continuous = false, interimResults = false }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const rec = new SR()
  rec.continuous = continuous
  rec.interimResults = interimResults
  rec.lang = 'en-US'
  // Maximise recognition quality
  rec.maxAlternatives = 3
  rec.onresult = e => {
    // Pick the alternative with highest confidence
    const results = Array.from(e.results)
    const best = results
      .flatMap(r => Array.from(r))
      .sort((a, b) => b.confidence - a.confidence)[0]
    if (best) onResult(best.transcript.trim())
  }
  rec.onend = onEnd
  rec.onerror = (e) => { if (e.error !== 'no-speech') onEnd?.() }
  return rec
}

export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  const { group } = useGroup()
  const [mode, setMode] = useState('personal')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [novaState, setNovaState] = useState('idle')
  const [voiceOn, setVoiceOn] = useState(true)
  const [autoListen, setAutoListen] = useState(false)
  const [manualListening, setManualListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState('')
  const [showChat, setShowChat] = useState(true) // mobile: toggle between avatar and chat
  const bottomRef = useRef(null)
  const messagesRef = useRef([])
  const loadingRef = useRef(false)
  const autoRecRef = useRef(null)
  const manualRecRef = useRef(null)
  const autoListenRef = useRef(false)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { setMessages([]); setError('') }, [mode])

  useEffect(() => {
    // Load voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }
    return () => {
      window.speechSynthesis?.cancel()
      stopAutoListen()
      stopManualListen()
    }
  }, [])

  // ── SEND TO NOVA ─────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const clean = text?.trim()
    if (!clean || loadingRef.current) return

    const userMsg = { role: 'user', content: clean }
    const history = [...messagesRef.current, userMsg]
    setMessages(history)
    setInput('')
    setInterimText('')
    setLoading(true)
    loadingRef.current = true
    setNovaState('thinking')
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const endpoint = mode === 'classroom' ? '/api/nova/classroom' : '/api/nova/chat'
      const body = mode === 'classroom'
        ? { messages: history, groupId: group?.id }
        : { messages: history }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])

      if (voiceOn) {
        setNovaState('speaking')
        speakNova(data.reply, null, () => {
          setNovaState('idle')
          // Auto-restart listening after Nova finishes
          if (autoListenRef.current) {
            setTimeout(() => startAutoListen(), 600)
          }
        })
      } else {
        setNovaState('idle')
        if (autoListenRef.current) setTimeout(() => startAutoListen(), 300)
      }
    } catch (err) {
      setError(err.message)
      setNovaState('idle')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [mode, group, voiceOn])

  // ── AUTO-LISTEN (always on) ───────────────────────────────────────
  function startAutoListen() {
    if (!autoListenRef.current) return
    if (loadingRef.current || novaState === 'speaking') return

    stopAutoListen()
    const rec = createRecognizer({
      continuous: false,
      interimResults: true,
      onResult: (transcript) => {
        if (transcript.length > 2) {
          stopAutoListen()
          sendMessage(transcript)
        }
      },
      onEnd: () => {
        // Keep restarting while autoListen is on
        if (autoListenRef.current && !loadingRef.current) {
          setTimeout(() => startAutoListen(), 800)
        }
      }
    })
    if (!rec) return
    autoRecRef.current = rec
    setNovaState('awake')
    try { rec.start() } catch (_) {}
  }

  function stopAutoListen() {
    try { autoRecRef.current?.stop() } catch (_) {}
    autoRecRef.current = null
  }

  function toggleAutoListen() {
    if (autoListen) {
      autoListenRef.current = false
      setAutoListen(false)
      stopAutoListen()
      if (novaState === 'awake') setNovaState('idle')
    } else {
      autoListenRef.current = true
      setAutoListen(true)
      // Nova speaks a greeting then starts listening
      window.speechSynthesis?.cancel()
      const firstName = profile?.full_name?.split(' ')[0] || 'there'
      speakNova("I'm listening, " + firstName + ". Go ahead.", null, () => {
        if (autoListenRef.current) startAutoListen()
      })
    }
  }

  // ── MANUAL MIC ────────────────────────────────────────────────────
  function startManualListen() {
    stopAutoListen()
    window.speechSynthesis?.cancel()

    const rec = createRecognizer({
      continuous: false,
      interimResults: true,
      onResult: (transcript) => {
        setInput(transcript)
        setInterimText('')
        setManualListening(false)
        manualRecRef.current = null
        setTimeout(() => sendMessage(transcript), 300)
      },
      onEnd: () => { setManualListening(false); setInterimText('') }
    })
    if (!rec) { setError('Voice input needs Chrome or Edge.'); return }
    manualRecRef.current = rec
    setManualListening(true)
    try { rec.start() } catch (_) { setManualListening(false) }
  }

  function stopManualListen() {
    try { manualRecRef.current?.stop() } catch (_) {}
    manualRecRef.current = null
    setManualListening(false)
    setInterimText('')
  }

  function toggleManualMic() {
    if (manualListening) stopManualListen()
    else startManualListen()
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const canMic = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  const sessionCount = (profile?.session_count || 0) + 1

  return (
    <div style={{ height: '100vh', background: '#0d0a07', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes nb{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-5px);opacity:1}}
        @keyframes nr{from{transform:scale(0.8);opacity:1}to{transform:scale(2.6);opacity:0}}
        @keyframes np{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes ns{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
        .nova-page { display: grid; grid-template-columns: 220px 1fr; height: 100%; }
        .nova-avatar-col { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: rgba(0,0,0,0.5); border-right: 1px solid rgba(255,255,255,0.04); overflow: hidden; }
        .nova-chat-col { display: flex; flex-direction: column; overflow: hidden; }
        .nova-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
        .nova-input-bar { background: rgba(0,0,0,0.6); border-top: 1px solid rgba(255,255,255,0.06); padding: 10px 14px; flex-shrink: 0; }
        .nova-chip { font-size: 11px; padding: 4px 10px; border-radius: 99px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.09); cursor: pointer; font-family: sans-serif; transition: all 0.15s; white-space: nowrap; }
        .nova-chip:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
        .nova-textarea { flex: 1; padding: 10px 13px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.1); font-size: 14px; resize: none; font-family: sans-serif; line-height: 1.5; background: rgba(255,255,255,0.06); color: #fff; outline: none; transition: border-color 0.2s; }
        .nova-textarea:focus { border-color: #f5c842; }
        .nova-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .nova-send { height: 42px; padding: 0 18px; border-radius: 12px; background: #f5c842; color: #3B1F0E; font-weight: 700; font-size: 14px; border: none; cursor: pointer; font-family: sans-serif; flex-shrink: 0; transition: opacity 0.2s; }
        .nova-send:disabled { opacity: 0.3; cursor: not-allowed; }
        .nova-mic { width: 42px; height: 42px; border-radius: 50%; border: none; cursor: pointer; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center; font-size: 17px; transition: all 0.2s; }
        /* Mobile */
        @media (max-width: 700px) {
          .nova-page { grid-template-columns: 1fr; }
          .nova-avatar-col { display: none; }
          .nova-avatar-col.show-mobile { display: flex; height: 200px; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); justify-content: center; padding: 12px; flex-direction: row; gap: 20px; }
          .nova-mobile-toggle { display: flex !important; }
        }
        @media (min-width: 701px) {
          .nova-mobile-toggle { display: none !important; }
        }
        .nova-msg-assistant { max-width: 82%; padding: 11px 14px; font-size: 14px; line-height: 1.75; white-space: pre-wrap; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.88); border-radius: 4px 14px 14px 14px; border: 1px solid rgba(255,255,255,0.07); }
        .nova-msg-user { max-width: 78%; padding: 11px 14px; font-size: 14px; line-height: 1.75; background: #7A3D14; color: #fff; border-radius: 14px 14px 4px 14px; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.7)', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#3B1F0E', fontFamily: 'serif', flexShrink: 0 }}>N</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', fontFamily: 'serif', letterSpacing: '-0.01em' }}>Professor Nova</div>
            <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: novaState === 'speaking' ? '#22c55e' : novaState === 'thinking' ? '#f5c842' : novaState === 'awake' ? '#a78bfa' : autoListen ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.3)' }}>
              {novaState === 'speaking' ? '● speaking' : novaState === 'thinking' ? '● thinking' : novaState === 'awake' ? '● listening' : autoListen ? '◉ always on' : '● ready · session ' + sessionCount}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Mobile: toggle avatar/chat */}
          <button className="nova-mobile-toggle" onClick={() => setShowChat(v => !v)}
            style={{ display: 'none', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, padding: '5px 11px', fontSize: 11, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            {showChat ? '👁 Nova' : '💬 Chat'}
          </button>

          {/* Always-listen toggle */}
          {canMic && (
            <button onClick={toggleAutoListen} style={{
              background: autoListen ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoListen ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 99, padding: '5px 11px', fontSize: 11, cursor: 'pointer',
              color: autoListen ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif'
            }}>
              {autoListen ? '◉ Listening' : '◯ Auto-listen'}
            </button>
          )}

          <button onClick={() => { setVoiceOn(v => !v); window.speechSynthesis?.cancel(); setNovaState('idle') }} style={{
            background: voiceOn ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${voiceOn ? 'rgba(245,200,66,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 99, padding: '5px 11px', fontSize: 11,
            color: voiceOn ? '#f5c842' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'sans-serif'
          }}>
            {voiceOn ? '🔊' : '🔇'}
          </button>

          {group && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 99, padding: 3, gap: 2 }}>
              {['personal', 'classroom'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '4px 9px', borderRadius: 99, fontSize: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'sans-serif', background: mode === m ? '#f5c842' : 'transparent',
                  color: mode === m ? '#3B1F0E' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s', fontWeight: mode === m ? 600 : 400
                }}>{m === 'personal' ? 'Personal' : 'Class'}</button>
              ))}
            </div>
          )}

          <Link to="/dashboard" style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', padding: '5px 6px' }}>←</Link>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="nova-page" style={{ flex: 1, overflow: 'hidden' }}>

        {/* AVATAR COLUMN — sticky, never scrolls */}
        <div className={`nova-avatar-col${!showChat ? ' show-mobile' : ''}`}>
          <NovaAvatar state={novaState} size="lg" />

          {novaState === 'speaking' && (
            <button onClick={() => { window.speechSynthesis?.cancel(); setNovaState('idle') }}
              style={{ marginTop: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              ■ Stop
            </button>
          )}

          {/* Listening indicator */}
          {novaState === 'awake' && (
            <div style={{ marginTop: 10, display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'center' }}>
              {[1,2,3,4,3,2,1].map((h,i) => (
                <div key={i} style={{ width: 3, background: '#a78bfa', borderRadius: 2, height: h * 4, animation: 'ns 0.5s ease-in-out infinite', animationDelay: i * 0.07 + 's' }} />
              ))}
            </div>
          )}
        </div>

        {/* CHAT COLUMN */}
        <div className="nova-chat-col" style={{ display: !showChat && window.innerWidth <= 700 ? 'none' : 'flex' }}>

          {/* Messages */}
          <div className="nova-messages">
            {messages.length === 0 && (
              <div style={{ background: 'rgba(245,200,66,0.07)', border: '1px solid rgba(245,200,66,0.15)', borderRadius: 16, padding: '18px 20px', maxWidth: 520 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#f5c842', marginBottom: 8, fontFamily: 'serif' }}>
                  Hello, {firstName}!
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75 }}>
                  {mode === 'classroom'
                    ? "Welcome everyone. I'm Professor Nova. What shall we tackle today?"
                    : "I'm Professor Nova. I know your courses and remember what we've covered. What shall we work on today?"}
                </p>
                {canMic && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 10 }}>
                    {autoListen ? '◉ I\'m listening — just speak naturally' : '🎤 Tap mic or enable Auto-listen to speak to me'}
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#3B1F0E', fontFamily: 'serif', marginTop: 2 }}>N</div>
                )}
                <div className={msg.role === 'assistant' ? 'nova-msg-assistant' : 'nova-msg-user'}>
                  {msg.content}
                  {msg.role === 'assistant' && voiceOn && (
                    <button onClick={() => { setNovaState('speaking'); speakNova(msg.content, null, () => setNovaState('idle')) }}
                      style={{ display: 'block', marginTop: 5, background: 'none', border: 'none', fontSize: 10, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 0, fontFamily: 'sans-serif' }}>
                      🔊 Replay
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Interim speech text */}
            {(manualListening || novaState === 'awake') && interimText && (
              <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 8 }}>
                <div style={{ maxWidth: '78%', padding: '10px 13px', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '14px 14px 4px 14px', fontStyle: 'italic' }}>
                  {interimText}...
                </div>
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#3B1F0E', fontFamily: 'serif' }}>N</div>
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px 14px 14px 14px', padding: '10px 16px', display: 'flex', gap: 5 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#f5c842', animation: 'nb 1.2s ease-in-out infinite', animationDelay: i*0.2+'s', opacity: 0.6 }} />)}
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ lineHeight: 1.5 }}>{error}</span>
                <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── INPUT BAR ── */}
          <div className="nova-input-bar">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {['Explain this topic','Quiz me',"I don't understand",'Practice problem'].map(s => (
                <button key={s} className="nova-chip" onClick={() => sendMessage(s)} disabled={loading}>{s}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea className="nova-textarea"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                placeholder={autoListen ? 'Just speak — or type here...' : 'Type your question or tap 🎤'}
                rows={1}
                disabled={loading || manualListening}
              />
              {canMic && (
                <button className="nova-mic" onClick={toggleManualMic}
                  style={{ background: manualListening ? '#ef4444' : 'rgba(255,255,255,0.08)' }}>
                  {manualListening && <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #ef4444', animation: 'nr 1s ease-out infinite' }} />}
                  {manualListening ? '⏹' : '🎤'}
                </button>
              )}
              <button className="nova-send" onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                style={{ opacity: input.trim() && !loading ? 1 : 0.3 }}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
