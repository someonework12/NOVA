import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

// ═══════════════════════════════════════════════════════════════
// SPEECH ENGINE v3 — Silence-buffered, never-stopping listener
//
// Key fixes over previous versions:
// 1. Accumulates speech across multiple result events
// 2. Only sends AFTER 1.8s of silence (student finished speaking)
// 3. Ignores noise bursts shorter than 3 words
// 4. Restarts itself instantly on any end/error
// 5. Never fires while Nova is speaking or thinking
// ═══════════════════════════════════════════════════════════════
class SpeechEngine {
  constructor({ onSpeech, onInterim, onState }) {
    this.onSpeech = onSpeech
    this.onInterim = onInterim
    this.onState = onState
    this.active = false
    this.blocked = false
    this.rec = null
    this.restartTimer = null
    this.silenceTimer = null
    this.buffer = ''         // accumulated final text
    this.SILENCE_MS = 1800   // wait this long after last word before sending
  }

  start() {
    this.active = true
    this.buffer = ''
    this._boot()
  }

  stop() {
    this.active = false
    this.buffer = ''
    this._kill()
    this.onState('idle')
  }

  block() {
    this.blocked = true
    clearTimeout(this.silenceTimer)
    this.buffer = ''
    this._kill()
  }

  unblock() {
    this.blocked = false
    if (this.active) {
      this.restartTimer = setTimeout(() => this._boot(), 600)
    }
  }

  _kill() {
    clearTimeout(this.restartTimer)
    clearTimeout(this.silenceTimer)
    try { this.rec?.abort() } catch (_) {}
    try { this.rec?.stop() } catch (_) {}
    this.rec = null
  }

  _boot() {
    if (!this.active || this.blocked) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    this._kill()

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.maxAlternatives = 1

    rec.onstart = () => this.onState('listening')

    rec.onresult = (e) => {
      let newFinal = ''
      let interim = ''

      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          newFinal += e.results[i][0].transcript
        } else {
          interim += e.results[i][0].transcript
        }
      }

      if (newFinal) {
        this.buffer += ' ' + newFinal
        this.buffer = this.buffer.trim()
      }

      // Show interim to user
      this.onInterim(interim || (newFinal ? '' : ''))

      // Reset silence timer every time we get speech
      clearTimeout(this.silenceTimer)

      if (this.buffer.split(' ').length >= 2) {
        // Start countdown — if no more speech for SILENCE_MS, send
        this.silenceTimer = setTimeout(() => {
          const text = this.buffer.trim()
          this.buffer = ''
          this.onInterim('')
          if (text.length > 3) {
            this.onSpeech(text)
          }
        }, this.SILENCE_MS)
      }
    }

    rec.onerror = (e) => {
      if (['no-speech', 'audio-capture', 'network'].includes(e.error)) {
        if (this.active && !this.blocked) {
          this.restartTimer = setTimeout(() => this._boot(), 400)
        }
      }
    }

    rec.onend = () => {
      if (this.active && !this.blocked) {
        this.restartTimer = setTimeout(() => this._boot(), 250)
      } else {
        this.onState('idle')
      }
    }

    this.rec = rec
    try { rec.start() } catch (_) {
      this.restartTimer = setTimeout(() => this._boot(), 800)
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TTS — deep male voice, split to avoid Chrome 15s bug
// ═══════════════════════════════════════════════════════════════
function getVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const names = ['Google UK English Male','Microsoft David Desktop','Daniel','Alex','Fred','Microsoft Mark']
  for (const n of names) {
    const v = voices.find(v => v.name.includes(n))
    if (v) return v
  }
  return voices.find(v =>
    v.lang?.startsWith('en') &&
    !/(female|zira|hazel|victoria|karen|samantha)/i.test(v.name)
  ) || voices.find(v => v.lang?.startsWith('en')) || null
}

function speakNova(text, onDone) {
  if (!window.speechSynthesis) { onDone?.(); return }
  window.speechSynthesis.cancel()
  const voice = getVoice()

  // Split into sentences to avoid Chrome 15s cut-off bug
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text]
  let idx = 0

  function next() {
    if (idx >= parts.length) { onDone?.(); return }
    const chunk = parts[idx++].trim()
    if (!chunk) { next(); return }
    const u = new SpeechSynthesisUtterance(chunk)
    u.rate = 0.86; u.pitch = 0.72; u.volume = 1
    if (voice) u.voice = voice
    u.onend = next
    u.onerror = next
    window.speechSynthesis.speak(u)
  }
  next()
}

// ═══════════════════════════════════════════════════════════════
// FACE RECOGNITION
// ═══════════════════════════════════════════════════════════════
async function loadFaceAPI() {
  if (window.faceapi) return window.faceapi
  return new Promise(resolve => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
    s.onload = async () => {
      try {
        const base = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(base),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(base),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(base)
        ])
      } catch (_) {}
      resolve(window.faceapi)
    }
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  const { group } = useGroup()
  const [mode, setMode] = useState('personal')
  const [messages, setMessages] = useState([])
  const [novaState, setNovaState] = useState('idle')
  const [boardText, setBoardText] = useState('')
  const [boardVisible, setBoardVisible] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [micOn, setMicOn] = useState(false)
  const [error, setError] = useState('')
  const [faceActive, setFaceActive] = useState(false)
  const [faceStatus, setFaceStatus] = useState('')

  const engineRef = useRef(null)
  const loadingRef = useRef(false)
  const messagesRef = useRef([])
  const voiceOnRef = useRef(true)
  const bottomRef = useRef(null)
  const videoRef = useRef(null)
  const faceTimerRef = useRef(null)
  const greetedRef = useRef(false)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { voiceOnRef.current = voiceOn }, [voiceOn])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── SEND TO NOVA ──────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const clean = text?.trim()
    if (!clean || loadingRef.current) return

    engineRef.current?.block()
    setInterimText('')
    const userMsg = { role: 'user', content: clean }
    const history = [...messagesRef.current, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    loadingRef.current = true
    setNovaState('thinking')
    setError('')
    setBoardVisible(false)

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

      const reply = data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setBoardText(reply)
      setBoardVisible(true)

      if (voiceOnRef.current) {
        setNovaState('speaking')
        speakNova(reply, () => {
          setNovaState('idle')
          setBoardVisible(false)
          engineRef.current?.unblock()
        })
      } else {
        setNovaState('idle')
        engineRef.current?.unblock()
      }
    } catch (err) {
      setError(err.message)
      setNovaState('idle')
      engineRef.current?.unblock()
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [mode, group])

  // ── INIT ENGINE ───────────────────────────────────────────────
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }

    const engine = new SpeechEngine({
      onSpeech: (text) => sendMessage(text),
      onInterim: (text) => setInterimText(text),
      onState: (state) => {
        if (state === 'listening' && !loadingRef.current) setNovaState('listening')
        else if (state === 'idle' && !loadingRef.current) setNovaState('idle')
      }
    })
    engineRef.current = engine

    // Auto-start mic + greeting
    const t1 = setTimeout(() => {
      engine.start()
      setMicOn(true)
    }, 800)

    const t2 = setTimeout(() => {
      if (!greetedRef.current && voiceOnRef.current) {
        greetedRef.current = true
        const name = profile?.full_name?.split(' ')[0] || 'there'
        engine.block()
        setNovaState('speaking')
        speakNova(
          'Hello ' + name + '. I am Professor Nova. I am listening — just speak whenever you are ready.',
          () => { setNovaState('idle'); engine.unblock() }
        )
      }
    }, 1400)

    return () => {
      clearTimeout(t1); clearTimeout(t2)
      engine.stop()
      window.speechSynthesis?.cancel()
      stopFace()
    }
  }, [])

  // ── MIC TOGGLE ────────────────────────────────────────────────
  function toggleMic() {
    if (micOn) {
      engineRef.current?.stop()
      setMicOn(false)
      setNovaState('idle')
      setInterimText('')
    } else {
      engineRef.current?.start()
      setMicOn(true)
    }
  }

  // ── FACE RECOGNITION ─────────────────────────────────────────
  async function startFace() {
    setFaceStatus('Loading visual models...')
    const faceapi = await loadFaceAPI()
    if (!faceapi) { setFaceStatus('Visual recognition unavailable in this browser'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      setFaceActive(true)
      setFaceStatus('Scanning...')
      let recognized = false
      faceTimerRef.current = setInterval(async () => {
        if (!videoRef.current || recognized) return
        try {
          const d = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks()
          if (d.length > 0) {
            recognized = true
            clearInterval(faceTimerRef.current)
            setFaceStatus('Face recognized')
            const name = profile?.full_name?.split(' ')[0] || 'there'
            engineRef.current?.block()
            setNovaState('speaking')
            speakNova('I can see you, ' + name + '. Welcome to class.', () => {
              setNovaState('idle')
              engineRef.current?.unblock()
            })
          }
        } catch (_) {}
      }, 1500)
    } catch (_) { setFaceStatus('Camera access denied') }
  }

  function stopFace() {
    clearInterval(faceTimerRef.current)
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setFaceActive(false)
    setFaceStatus('')
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const sessionCount = (profile?.session_count || 0) + 1

  return (
    <div style={{ height: '100vh', background: '#080604', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif', position: 'relative' }}>
      <style>{`
        @keyframes nb{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-5px);opacity:1}}
        @keyframes board-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes chat-slide{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
        @keyframes cblink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes ring-out{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.2);opacity:0}}
        .nbtn{border:none;cursor:pointer;font-family:sans-serif;transition:all 0.2s;}
        .nbtn:active{transform:scale(0.94);}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px}
      `}</style>

      {/* TOP BAR */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#3B1F0E', fontFamily: 'serif' }}>N</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Professor Nova</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', color: novaState === 'speaking' ? '#22c55e' : novaState === 'listening' ? '#64c8ff' : novaState === 'thinking' ? '#f5c842' : micOn ? 'rgba(100,200,255,0.5)' : 'rgba(255,255,255,0.25)' }}>
              {novaState === 'speaking' ? 'speaking' : novaState === 'listening' ? 'listening' : novaState === 'thinking' ? 'thinking' : micOn ? 'mic active — session ' + sessionCount : 'session ' + sessionCount}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Pill active={micOn} activeColor="rgba(100,200,255,0.15)" activeBorder="rgba(100,200,255,0.3)" activeText="#64c8ff" inactiveText="rgba(255,255,255,0.3)" onClick={toggleMic}>
            {micOn ? 'Mic On' : 'Mic Off'}
          </Pill>
          <Pill active={voiceOn} activeColor="rgba(245,200,66,0.1)" activeBorder="rgba(245,200,66,0.25)" activeText="#f5c842" inactiveText="rgba(255,255,255,0.25)" onClick={() => { setVoiceOn(v => !v); if (novaState === 'speaking') { window.speechSynthesis?.cancel(); setNovaState('idle'); engineRef.current?.unblock() } }}>
            {voiceOn ? 'Voice On' : 'Voice Off'}
          </Pill>
          <Pill active={faceActive} activeColor="rgba(167,139,250,0.12)" activeBorder="rgba(167,139,250,0.3)" activeText="#a78bfa" inactiveText="rgba(255,255,255,0.25)" onClick={() => faceActive ? stopFace() : startFace()}>
            {faceActive ? 'Camera On' : 'Camera'}
          </Pill>
          {group && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 99, padding: 2, gap: 1 }}>
              {['personal', 'classroom'].map(m => (
                <button key={m} className="nbtn" onClick={() => setMode(m)} style={{ padding: '4px 8px', borderRadius: 99, fontSize: 9, border: 'none', background: mode === m ? '#f5c842' : 'transparent', color: mode === m ? '#3B1F0E' : 'rgba(255,255,255,0.35)', fontWeight: mode === m ? 600 : 400 }}>
                  {m === 'personal' ? 'Personal' : 'Class'}
                </button>
              ))}
            </div>
          )}
          <Link to="/dashboard" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', padding: '5px 6px' }}>Back</Link>
        </div>
      </div>

      {/* MAIN STAGE */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

        {/* Atmosphere */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(245,200,66,0.035) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize: '36px 36px', pointerEvents: 'none' }} />

        {/* Face camera — top right */}
        {faceActive && (
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 30, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.25)', background: '#000' }}>
            <video ref={videoRef} style={{ width: 90, height: 68, objectFit: 'cover', display: 'block' }} muted playsInline />
            {faceStatus && <div style={{ fontSize: 8, color: '#a78bfa', textAlign: 'center', padding: '2px 5px', background: 'rgba(0,0,0,0.9)' }}>{faceStatus}</div>}
          </div>
        )}

        {/* Avatar */}
        <div style={{ position: 'relative', zIndex: 10, marginBottom: boardVisible ? 12 : 0, transition: 'margin 0.4s' }}>
          <NovaAvatar state={novaState} size={Math.min(window.innerWidth * 0.45, 200)} />
        </div>

        {/* Idle hint */}
        {!boardVisible && messages.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '0 28px', zIndex: 10, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.8 }}>
              {micOn ? 'Speak naturally — I will wait until you finish before responding' : 'Turn on the mic to talk to me, or open the chat to type'}
            </p>
          </div>
        )}

        {/* Interim speech — what you're saying right now */}
        {interimText && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(100,200,255,0.1)', border: '1px solid rgba(100,200,255,0.2)', borderRadius: 10, padding: '6px 14px', fontSize: 12, color: 'rgba(100,200,255,0.8)', maxWidth: '80%', textAlign: 'center', zIndex: 40, fontStyle: 'italic' }}>
            {interimText}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: '7px 14px', fontSize: 12, color: '#fca5a5', display: 'flex', gap: 8, zIndex: 40, maxWidth: '88%' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Thinking dots */}
        {loading && (
          <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 30 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5c842', animation: 'nb 1.2s ease-in-out infinite', animationDelay: i * 0.2 + 's', opacity: 0.7 }} />)}
          </div>
        )}

        {/* BOARD — Nova's response */}
        {boardVisible && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(8,6,4,0.94) 18%, rgba(12,22,14,0.98) 100%)', padding: '18px 22px 88px', animation: 'board-in 0.4s ease-out', zIndex: 20, maxHeight: '58vh', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: novaState === 'speaking' ? '#22c55e' : '#f5c842', animation: novaState === 'speaking' ? 'nb 1s ease-in-out infinite' : 'none' }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Professor Nova</span>
            </div>
            <BoardText text={boardText} />
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, zIndex: 50 }}>
        {/* Chat button */}
        <button className="nbtn" onClick={() => setChatOpen(v => !v)} style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)', position: 'relative' }}>
          {messages.length > 0 && <span style={{ position: 'absolute', top: 10, right: 10, width: 7, height: 7, borderRadius: '50%', background: '#f5c842' }} />}
          Chat
        </button>

        {/* Mic */}
        <button className="nbtn" onClick={toggleMic} style={{ width: 62, height: 62, borderRadius: '50%', background: micOn ? 'rgba(100,200,255,0.18)' : 'rgba(255,255,255,0.07)', border: `2px solid ${micOn ? '#64c8ff' : 'rgba(255,255,255,0.12)'}`, color: micOn ? '#64c8ff' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(12px)', position: 'relative' }}>
          {micOn && <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid rgba(100,200,255,0.3)', animation: 'ring-out 2s ease-out infinite' }} />}
          {micOn ? 'Mic\nOn' : 'Mic\nOff'}
        </button>

        {/* Stop */}
        {novaState === 'speaking' && (
          <button className="nbtn" onClick={() => { window.speechSynthesis?.cancel(); setNovaState('idle'); setBoardVisible(false); engineRef.current?.unblock() }} style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', fontSize: 11, color: '#fca5a5', backdropFilter: 'blur(12px)' }}>
            Stop
          </button>
        )}
      </div>

      {/* CHAT DRAWER */}
      {chatOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(5,3,2,0.92)', backdropFilter: 'blur(24px)', display: 'flex', flexDirection: 'column', animation: 'chat-slide 0.25s ease-out' }}>
          <div style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Conversation</span>
            <button className="nbtn" onClick={() => setChatOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 26, height: 26, fontSize: 13, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 40 }}>No messages yet. Speak or type below.</p>}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 7, alignItems: 'flex-start' }}>
                {msg.role === 'assistant' && <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f5c842', fontSize: 10, fontWeight: 700, color: '#3B1F0E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif', flexShrink: 0, marginTop: 2 }}>N</div>}
                <div style={{ maxWidth: '80%', padding: '9px 12px', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', background: msg.role === 'user' ? '#7A3D14' : 'rgba(255,255,255,0.055)', color: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.8)', borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '3px 12px 12px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {msg.content}
                  {msg.role === 'assistant' && voiceOn && (
                    <button onClick={() => { setChatOpen(false); setNovaState('speaking'); setBoardText(msg.content); setBoardVisible(true); speakNova(msg.content, () => { setNovaState('idle'); setBoardVisible(false); engineRef.current?.unblock() }) }} style={{ display: 'block', marginTop: 4, background: 'none', border: 'none', fontSize: 10, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}>
                      Replay
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { sendMessage(input); setChatOpen(false) } }}
              placeholder="Type to Professor Nova..."
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 13px', fontSize: 13, color: '#fff', fontFamily: 'sans-serif', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#f5c842'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button className="nbtn" onClick={() => { sendMessage(input); setChatOpen(false) }} disabled={!input.trim() || loading}
              style={{ height: 42, padding: '0 16px', borderRadius: 12, background: '#f5c842', color: '#3B1F0E', fontWeight: 700, fontSize: 13, border: 'none', opacity: input.trim() && !loading ? 1 : 0.3 }}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────
function Pill({ active, activeColor, activeBorder, activeText, inactiveText, onClick, children }) {
  return (
    <button className="nbtn" onClick={onClick} style={{ background: active ? activeColor : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? activeBorder : 'rgba(255,255,255,0.07)'}`, borderRadius: 99, padding: '5px 10px', fontSize: 10, color: active ? activeText : inactiveText }}>
      {children}
    </button>
  )
}

function BoardText({ text }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    setShown('')
    let i = 0
    function tick() {
      if (i < text.length) { setShown(text.slice(0, ++i)); setTimeout(tick, 14) }
    }
    tick()
  }, [text])
  return (
    <div style={{ fontSize: 'clamp(13px, 2vw, 15px)', color: 'rgba(255,255,240,0.88)', lineHeight: 1.75, fontFamily: "'Courier New', monospace", letterSpacing: '0.02em', maxHeight: 'calc(58vh - 90px)', overflowY: 'auto', textShadow: '0 0 10px rgba(255,255,200,0.15)' }}>
      {shown}
      {shown.length < text.length && <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'rgba(255,255,220,0.7)', marginLeft: 2, verticalAlign: 'middle', animation: 'cblink 0.6s ease-in-out infinite' }} />}
    </div>
  )
}
