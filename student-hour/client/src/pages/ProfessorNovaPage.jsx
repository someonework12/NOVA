import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

// ═══════════════════════════════════════════════════════════════════
// SPEECH ENGINE v5 — Bulletproof mobile + desktop listener
//
// ROOT CAUSE of mobile deafness:
//   1. continuous:true is silently ignored on Android Chrome/iOS
//   2. After onresult fires and block() is called, onend fires
//      while blocked=true, so the "restart" branch is skipped.
//      unblock() then tries to restart but the timing is wrong.
//   3. isMobile detection can fail if Chrome is in "desktop mode"
//
// FIXES:
//   - Always use continuous:false on ALL platforms (safer)
//   - Use a pending restart flag instead of checking blocked in onend
//   - Restart is always scheduled from unblock(), never from onend
//     when a result was received
//   - 2s silence buffer for desktop via repeated restarts
// ═══════════════════════════════════════════════════════════════════

// Detect if browser supports continuous mode reliably
// Android Chrome and iOS Safari both have issues with continuous:true
function supportsContinuous() {
  const ua = navigator.userAgent || ''
  const isAndroid = /Android/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  return !isAndroid && !isIOS && !isSafari
}

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
    this.desktopBuffer = ''
    this.pendingRestart = false  // set when we got result and are waiting for unblock
    this.continuous = supportsContinuous()
    this.SILENCE_MS = 1600
  }

  start() {
    this.active = true
    this.desktopBuffer = ''
    this.pendingRestart = false
    this._boot()
  }

  stop() {
    this.active = false
    this.desktopBuffer = ''
    this.pendingRestart = false
    this._kill()
    this.onState('idle')
  }

  // Called by sendMessage before API call — stops listening while Nova responds
  block() {
    this.blocked = true
    clearTimeout(this.silenceTimer)
    clearTimeout(this.restartTimer)
    this.desktopBuffer = ''
    this._kill()
  }

  // Called after Nova finishes speaking — restarts listening
  unblock() {
    this.blocked = false
    this.pendingRestart = false
    if (this.active) {
      this.restartTimer = setTimeout(() => this._boot(), 600)
    }
  }

  _kill() {
    clearTimeout(this.restartTimer)
    clearTimeout(this.silenceTimer)
    if (this.rec) {
      try { this.rec.abort() } catch (_) {}
      try { this.rec.stop() } catch (_) {}
      this.rec = null
    }
  }

  _boot() {
    if (!this.active || this.blocked) return
    this._kill()
    this.pendingRestart = false

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      this.onState('unsupported')
      return
    }

    const rec = new SR()
    rec.lang = 'en-US'
    rec.maxAlternatives = 3      // more alternatives = better accent handling

    if (this.continuous) {
      // ── DESKTOP: continuous mode, silence buffer ──────────────
      rec.continuous = true
      rec.interimResults = true

      rec.onstart = () => {
        if (!this.blocked) this.onState('listening')
      }

      rec.onresult = (e) => {
        let newFinal = '', interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            // Pick best alternative
            let best = '', bestConf = -1
            for (let j = 0; j < e.results[i].length; j++) {
              if ((e.results[i][j].confidence || 0.5) > bestConf) {
                bestConf = e.results[i][j].confidence || 0.5
                best = e.results[i][j].transcript
              }
            }
            newFinal += best
          } else {
            interim += e.results[i][0].transcript
          }
        }
        if (newFinal) {
          this.desktopBuffer += ' ' + newFinal
          this.desktopBuffer = this.desktopBuffer.trim()
        }
        this.onInterim(interim)
        clearTimeout(this.silenceTimer)
        if (this.desktopBuffer.split(' ').length >= 2) {
          this.silenceTimer = setTimeout(() => {
            const text = this.desktopBuffer.trim()
            this.desktopBuffer = ''
            this.onInterim('')
            if (text.length > 3) {
              this.pendingRestart = true
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
        if (this.active && !this.blocked && !this.pendingRestart) {
          this.restartTimer = setTimeout(() => this._boot(), 250)
        }
      }

    } else {
      // ── MOBILE: single-shot mode — Android Chrome + iOS Safari ──
      rec.continuous = false
      rec.interimResults = false

      rec.onstart = () => {
        if (!this.blocked) this.onState('listening')
      }

      rec.onresult = (e) => {
        // Pick highest-confidence result across all alternatives
        let best = '', bestConf = -1
        for (let i = 0; i < e.results.length; i++) {
          for (let j = 0; j < e.results[i].length; j++) {
            const conf = e.results[i][j].confidence || 0.5
            if (conf > bestConf) {
              bestConf = conf
              best = e.results[i][j].transcript
            }
          }
        }
        const text = best.trim()
        if (text.length > 1) {
          this.pendingRestart = true
          this.onInterim('')
          this.onSpeech(text)
          // DO NOT restart here — block() will be called by sendMessage
          // unblock() will restart after Nova responds
        }
      }

      rec.onerror = (e) => {
        this.onInterim('')
        if (e.error === 'not-allowed') {
          this.active = false
          this.onState('denied')
          return
        }
        // On no-speech or network error, restart after short delay
        if (this.active && !this.blocked) {
          this.restartTimer = setTimeout(() => this._boot(), 600)
        }
      }

      rec.onend = () => {
        this.onInterim('')
        // Key fix: if pendingRestart=true, a result was received.
        // Don't restart — block()+unblock() from sendMessage handles it.
        // If pendingRestart=false, no result — restart ourselves.
        if (!this.pendingRestart && this.active && !this.blocked) {
          this.restartTimer = setTimeout(() => this._boot(), 400)
        } else if (this.pendingRestart && this.blocked) {
          // Waiting for sendMessage to call unblock() — do nothing
        } else if (!this.active) {
          this.onState('idle')
        }
      }
    }

    this.rec = rec
    try {
      rec.start()
    } catch (err) {
      // InvalidStateError means already started — retry after delay
      this.restartTimer = setTimeout(() => this._boot(), 1000)
    }
  }
}


// TTS — deep professor voice
// ═══════════════════════════════════════════════════
function getVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const priority = ['Google UK English Male','Microsoft David Desktop','Daniel','Alex','Fred','Microsoft Mark']
  for (const name of priority) {
    const v = voices.find(v => v.name.includes(name))
    if (v) return v
  }
  return voices.find(v => v.lang?.startsWith('en') && !v.name.toLowerCase().includes('female') && !v.name.toLowerCase().includes('zira') && !v.name.toLowerCase().includes('hazel')) || voices.find(v => v.lang?.startsWith('en')) || null
}

function speakNova(text, onDone) {
  if (!window.speechSynthesis) { onDone?.(); return }
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.85; utt.pitch = 0.72; utt.volume = 1
  const voice = getVoice()
  if (voice) utt.voice = voice
  utt.onend = onDone; utt.onerror = onDone
  // Chrome bug: speech stops after ~15s. Split long text.
  if (text.length > 200) {
    const parts = text.match(/[^.!?]+[.!?]*/g) || [text]
    let i = 0
    function speakNext() {
      if (i >= parts.length) { onDone?.(); return }
      const u = new SpeechSynthesisUtterance(parts[i++])
      u.rate = 0.85; u.pitch = 0.72; u.volume = 1
      if (voice) u.voice = voice
      u.onend = speakNext; u.onerror = speakNext
      window.speechSynthesis.speak(u)
    }
    speakNext()
    return
  }
  window.speechSynthesis.speak(utt)
}

// ═══════════════════════════════════════════════════
// FACE RECOGNITION (Phase 9)
// Uses face-api.js for visual student recognition
// ═══════════════════════════════════════════════════
async function loadFaceAPI() {
  if (window.faceapi) return window.faceapi
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
    s.onload = async () => {
      try {
        await window.faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
        await window.faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
        await window.faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
      } catch(e) { /* models may not load in all environments */ }
      resolve(window.faceapi)
    }
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  const { group } = useGroup()
  const [mode, setMode] = useState('personal')
  const [messages, setMessages] = useState([])
  const [novaState, setNovaState] = useState('idle')
  const [boardText, setBoardText] = useState('')
  const [boardVisible, setBoardVisible] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [micOn, setMicOn] = useState(false)
  const [error, setError] = useState('')
  // Face recognition
  const [faceActive, setFaceActive] = useState(false)
  const [faceStatus, setFaceStatus] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const faceTimerRef = useRef(null)

  const engineRef = useRef(null)
  const loadingRef = useRef(false)
  const messagesRef = useRef([])
  const voiceOnRef = useRef(true)
  const bottomRef = useRef(null)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { voiceOnRef.current = voiceOn }, [voiceOn])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Init speech engine on mount
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }

    const engine = new SpeechEngine(
      (text) => sendMessage(text),
      (state) => {
        if (state === 'listening') setNovaState('listening')
        else if (!loadingRef.current) setNovaState('idle')
      }
    )
    engineRef.current = engine

    // Auto-start listening when page opens
    setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.start()
        setMicOn(true)
        // Nova greets the student
        const name = profile?.full_name?.split(' ')[0] || 'there'
        setTimeout(() => {
          if (voiceOnRef.current) {
            setNovaState('speaking')
            engineRef.current?.block()
            speakNova(
              "Hello " + name + ", I'm Professor Nova. I'm listening — just speak to me anytime.",
              () => {
                setNovaState('idle')
                engineRef.current?.unblock()
              }
            )
          }
        }, 800)
      }
    }, 1200)

    return () => {
      engineRef.current?.stop()
      window.speechSynthesis?.cancel()
      stopFaceRecognition()
    }
  }, [])

  // ── SEND MESSAGE ──────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const clean = text?.trim()
    if (!clean || loadingRef.current) return

    engineRef.current?.block()
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
      const body = mode === 'classroom' ? { messages: history, groupId: group?.id } : { messages: history }

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

  function toggleMic() {
    if (micOn) {
      engineRef.current?.stop()
      setMicOn(false)
      setNovaState('idle')
    } else {
      engineRef.current?.start()
      setMicOn(true)
    }
  }

  // ── FACE RECOGNITION ─────────────────────────────────────────
  async function startFaceRecognition() {
    setFaceStatus('Loading face models...')
    const faceapi = await loadFaceAPI()
    if (!faceapi) { setFaceStatus('Face API unavailable'); return }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setFaceActive(true)
      setFaceStatus('Camera active — looking for your face...')

      faceTimerRef.current = setInterval(async () => {
        if (!videoRef.current || !faceapi) return
        try {
          const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks()
          if (detections.length > 0) {
            setFaceStatus('Face detected! Nova recognizes you.')
            const name = profile?.full_name?.split(' ')[0] || 'there'
            if (voiceOnRef.current && novaState === 'idle') {
              engineRef.current?.block()
              setNovaState('speaking')
              speakNova('I can see you, ' + name + '. Good to have you in class.', () => {
                setNovaState('idle')
                engineRef.current?.unblock()
              })
              clearInterval(faceTimerRef.current)
            }
          }
        } catch(_) {}
      }, 2000)
    } catch (e) {
      setFaceStatus('Camera permission denied')
    }
  }

  function stopFaceRecognition() {
    clearInterval(faceTimerRef.current)
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setFaceActive(false)
    setFaceStatus('')
  }

  function toggleFace() {
    if (faceActive) stopFaceRecognition()
    else startFaceRecognition()
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const sessionCount = (profile?.session_count || 0) + 1

  return (
    <div style={{ height:'100vh', background:'#080604', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'sans-serif', position:'relative' }}>
      <style>{`
        @keyframes nb{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-5px);opacity:1}}
        @keyframes board-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes chat-in{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}
        .nova-btn { border:none; cursor:pointer; font-family:sans-serif; transition:all 0.2s; }
        .nova-btn:active { transform:scale(0.95); }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}
      `}</style>

      {/* ═══ TOP BAR ═══ */}
      <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,0,0,0.8)', backdropFilter:'blur(20px)', flexShrink:0, borderBottom:'1px solid rgba(255,255,255,0.04)', zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'#f5c842', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#3B1F0E', fontFamily:'serif' }}>N</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff', letterSpacing:'-0.01em' }}>Professor Nova</div>
            <div style={{ fontSize:9, color: novaState==='speaking'?'#22c55e':novaState==='listening'?'#64c8ff':novaState==='thinking'?'#f5c842':'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              {novaState==='speaking'?'● speaking':novaState==='listening'?'● listening':novaState==='thinking'?'● thinking': micOn?'◉ mic active · session '+sessionCount:'● session '+sessionCount}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {/* Mic toggle */}
          <button className="nova-btn" onClick={toggleMic} style={{ background: micOn?'rgba(100,200,255,0.15)':'rgba(255,255,255,0.05)', border:`1px solid ${micOn?'rgba(100,200,255,0.35)':'rgba(255,255,255,0.08)'}`, borderRadius:99, padding:'5px 10px', fontSize:10, color: micOn?'#64c8ff':'rgba(255,255,255,0.35)' }}>
            {micOn ? 'Mic On' : 'Mic Off'}
          </button>

          {/* Voice toggle */}
          <button className="nova-btn" onClick={() => { setVoiceOn(v=>!v); if(novaState==='speaking'){window.speechSynthesis?.cancel();setNovaState('idle');engineRef.current?.unblock()} }} style={{ background: voiceOn?'rgba(245,200,66,0.1)':'rgba(255,255,255,0.05)', border:`1px solid ${voiceOn?'rgba(245,200,66,0.25)':'rgba(255,255,255,0.08)'}`, borderRadius:99, padding:'5px 10px', fontSize:10, color: voiceOn?'#f5c842':'rgba(255,255,255,0.3)' }}>
            {voiceOn ? 'On' : 'Off'}
          </button>

          {/* Face recognition */}
          <button className="nova-btn" onClick={toggleFace} style={{ background: faceActive?'rgba(167,139,250,0.15)':'rgba(255,255,255,0.05)', border:`1px solid ${faceActive?'rgba(167,139,250,0.35)':'rgba(255,255,255,0.08)'}`, borderRadius:99, padding:'5px 10px', fontSize:10, color: faceActive?'#a78bfa':'rgba(255,255,255,0.3)' }} title="Face recognition">
            Cam
          </button>

          {group && (
            <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:99, padding:2, gap:1 }}>
              {['personal','classroom'].map(m=>(
                <button key={m} className="nova-btn" onClick={()=>setMode(m)} style={{ padding:'4px 8px', borderRadius:99, fontSize:9, border:'none', background:mode===m?'#f5c842':'transparent', color:mode===m?'#3B1F0E':'rgba(255,255,255,0.35)', fontWeight:mode===m?600:400 }}>
                  {m==='personal'?'Personal':'Class'}
                </button>
              ))}
            </div>
          )}

          <Link to="/dashboard" style={{ fontSize:10, color:'rgba(255,255,255,0.2)', textDecoration:'none', padding:'5px 6px' }}>←</Link>
        </div>
      </div>

      {/* ═══ MAIN: FULL SCREEN NOVA ═══ */}
      <div style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>

        {/* Background atmosphere */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 40%, rgba(245,200,66,0.04) 0%, transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }} />

        {/* Face video (small, top right when active) */}
        {faceActive && (
          <div style={{ position:'absolute', top:10, right:10, zIndex:30, borderRadius:12, overflow:'hidden', border:'1px solid rgba(167,139,250,0.3)', background:'#000' }}>
            <video ref={videoRef} style={{ width:100, height:75, objectFit:'cover', display:'block' }} muted playsInline />
            <div style={{ fontSize:9, color:'#a78bfa', textAlign:'center', padding:'2px 6px', background:'rgba(0,0,0,0.8)' }}>{faceStatus || 'Scanning...'}</div>
          </div>
        )}

        {/* Nova avatar — center stage */}
        <div style={{ position:'relative', zIndex:10, marginBottom: boardVisible ? 16 : 0, transition:'margin 0.4s' }}>
          <NovaAvatar state={novaState} size={Math.min(window.innerWidth * 0.45, 200)} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'8px 14px', fontSize:12, color:'#fca5a5', display:'flex', gap:8, alignItems:'center', zIndex:40, maxWidth:'90%' }}>
            <span>{error}</span>
            <button onClick={()=>setError('')} style={{ background:'none', border:'none', color:'#fca5a5', cursor:'pointer', fontSize:16 }}>×</button>
          </div>
        )}

        {/* ═══ BLACKBOARD — Nova's response ═══ */}
        {boardVisible && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(180deg,rgba(8,6,4,0) 0%,rgba(8,6,4,0.95) 20%,rgba(14,28,18,0.98) 100%)', padding:'20px 24px 80px', animation:'board-in 0.4s ease-out', zIndex:20, maxHeight:'55vh', overflow:'hidden' }}>
            {/* Board header */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:novaState==='speaking'?'nb 1s ease-in-out infinite':undefined }} />
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Professor Nova</span>
            </div>
            {/* Chalk text with typewriter */}
            <TypewriterText text={boardText} style={{ fontSize:'clamp(13px,2.2vw,16px)', color:'rgba(255,255,235,0.9)', lineHeight:1.75, fontFamily:"'Courier New',monospace", textShadow:'0 0 12px rgba(255,255,200,0.2)', letterSpacing:'0.02em', maxHeight:'calc(55vh - 80px)', overflowY:'auto' }} />
          </div>
        )}

        {/* ═══ IDLE: greeting text ═══ */}
        {!boardVisible && messages.length === 0 && novaState === 'idle' && (
          <div style={{ textAlign:'center', padding:'0 32px', zIndex:10 }}>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', lineHeight:1.8 }}>
              {micOn ? 'Just speak — I\'m listening' : 'Tap Mic to start talking to me'}
            </div>
            {micOn && <div style={{ marginTop:8, fontSize:11, color:'rgba(100,200,255,0.35)' }}>◉ microphone active</div>}
          </div>
        )}

        {/* Loading dots */}
        {loading && (
          <div style={{ position:'absolute', bottom:90, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, zIndex:30 }}>
            {[0,1,2].map(i=><div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#f5c842', animation:'nb 1.2s ease-in-out infinite', animationDelay:i*0.2+'s', opacity:0.7 }} />)}
          </div>
        )}
      </div>

      {/* ═══ BOTTOM CONTROLS ═══ */}
      <div style={{ position:'absolute', bottom:16, left:0, right:0, display:'flex', justifyContent:'center', gap:12, zIndex:50, padding:'0 20px' }}>

        {/* Chat history icon */}
        <button className="nova-btn" onClick={()=>setChatOpen(v=>!v)} style={{ width:48, height:48, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)' }} title="Chat history">
          
          {messages.length > 0 && <span style={{ position:'absolute', top:8, right:8, width:8, height:8, borderRadius:'50%', background:'#f5c842' }} />}
        </button>

        {/* Big mic button */}
        <button className="nova-btn" onClick={toggleMic} style={{ width:64, height:64, borderRadius:'50%', background: micOn?'rgba(100,200,255,0.2)':'rgba(255,255,255,0.08)', border:`2px solid ${micOn?'#64c8ff':'rgba(255,255,255,0.15)'}`, fontSize:24, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)', position:'relative' }}>
          {micOn && <div style={{ position:'absolute', inset:-6, borderRadius:'50%', border:'2px solid rgba(100,200,255,0.4)', animation:'nv-ring1 2s ease-out infinite' }} />}
          Mic
        </button>

        {/* Stop speaking */}
        {novaState === 'speaking' && (
          <button className="nova-btn" onClick={()=>{ window.speechSynthesis?.cancel(); setNovaState('idle'); setBoardVisible(false); engineRef.current?.unblock() }} style={{ width:48, height:48, borderRadius:'50%', background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)' }}>
            ■
          </button>
        )}
      </div>

      {/* ═══ CHAT DRAWER ═══ */}
      {chatOpen && (
        <div style={{ position:'absolute', inset:0, zIndex:100, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', animation:'chat-in 0.25s ease-out' }}>
          {/* Drawer header */}
          <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Conversation</span>
            <button className="nova-btn" onClick={()=>setChatOpen(false)} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:99, width:28, height:28, fontSize:14, color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
            {messages.length===0 && <p style={{ fontSize:13, color:'rgba(255,255,255,0.3)', textAlign:'center', marginTop:40 }}>No messages yet — start talking to Nova</p>}
            {messages.map((msg,i)=>(
              <div key={i} style={{ display:'flex', flexDirection:msg.role==='user'?'row-reverse':'row', gap:7, alignItems:'flex-start' }}>
                {msg.role==='assistant' && <div style={{ width:24, height:24, borderRadius:'50%', background:'#f5c842', fontSize:10, fontWeight:700, color:'#3B1F0E', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'serif', flexShrink:0, marginTop:2 }}>N</div>}
                <div style={{ maxWidth:'80%', padding:'9px 12px', fontSize:13, lineHeight:1.65, whiteSpace:'pre-wrap', background:msg.role==='user'?'#7A3D14':'rgba(255,255,255,0.06)', color:msg.role==='user'?'#fff':'rgba(255,255,255,0.82)', borderRadius:msg.role==='user'?'12px 12px 3px 12px':'3px 12px 12px 12px', border:'1px solid rgba(255,255,255,0.06)' }}>
                  {msg.content}
                  {msg.role==='assistant' && voiceOn && (
                    <button onClick={()=>{ setChatOpen(false); setNovaState('speaking'); setBoardText(msg.content); setBoardVisible(true); speakNova(msg.content,()=>{setNovaState('idle');setBoardVisible(false);engineRef.current?.unblock()}) }} style={{ display:'block', marginTop:4, background:'none', border:'none', fontSize:10, color:'rgba(255,255,255,0.2)', cursor:'pointer', padding:0, fontFamily:'sans-serif' }}>Replay</button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Type input */}
          <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0, display:'flex', gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&input.trim()){sendMessage(input);setChatOpen(false)} }} placeholder="Type to Professor Nova..." style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'10px 13px', fontSize:13, color:'#fff', fontFamily:'sans-serif', outline:'none' }} onFocus={e=>e.target.style.borderColor='#f5c842'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'} />
            <button className="nova-btn" onClick={()=>{sendMessage(input);setChatOpen(false)}} disabled={!input.trim()||loading} style={{ height:42, padding:'0 16px', borderRadius:12, background:'#f5c842', color:'#3B1F0E', fontWeight:700, fontSize:13, border:'none', opacity:input.trim()&&!loading?1:0.3 }}>Send</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Typewriter text component
function TypewriterText({ text, style }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const speed = 16
    function tick() {
      if (i < text.length) {
        setDisplayed(text.slice(0, ++i))
        setTimeout(tick, speed)
      }
    }
    tick()
  }, [text])
  return (
    <div style={style}>
      {displayed}
      {displayed.length < text.length && <span style={{ animation:'cursor-blink 0.7s ease-in-out infinite', display:'inline-block', width:2, height:'1em', background:'rgba(255,255,235,0.7)', marginLeft:2, verticalAlign:'middle' }} />}
    </div>
  )
}
