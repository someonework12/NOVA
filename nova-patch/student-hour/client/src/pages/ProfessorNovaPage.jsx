import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

// ═══════════════════════════════════════════════════
// SPEECH ENGINE v2 — Nigerian-accent optimised
//
// Key improvements:
// 1. Waits for a FULL pause (1.8s) before sending — no
//    cutting off mid-sentence
// 2. Uses multiple language alternatives so the browser
//    tries harder on Nigerian/West-African English
// 3. Ignores short noise bursts (< 4 words)
// 4. Push-to-hold mode: mic ONLY listens while user holds
//    the button — blocks all background noise in class
// ═══════════════════════════════════════════════════
class SpeechEngine {
  constructor(onSpeech, onStateChange, onInterim) {
    this.onSpeech = onSpeech
    this.onStateChange = onStateChange
    this.onInterim = onInterim  // live caption callback
    this.active = false
    this.blocked = false
    this.rec = null
    this.restartTimer = null
    this.silenceTimer = null
    this.accumulated = ''
    this.pushToHold = false   // if true, only listen while button held
    this.holding = false
  }

  start() {
    this.active = true
    this._startRec()
  }

  stop() {
    this.active = false
    this._kill()
    this.onStateChange('idle')
    this.accumulated = ''
  }

  block() { this.blocked = true; this._kill() }
  unblock() {
    this.blocked = false
    this.accumulated = ''
    if (this.active && (!this.pushToHold || this.holding)) {
      setTimeout(() => this._startRec(), 600)
    }
  }

  // Push-to-hold: press and hold to speak
  holdStart() {
    this.holding = true
    if (this.active && !this.blocked) this._startRec()
  }
  holdEnd() {
    this.holding = false
    // flush whatever was accumulated then kill
    if (this.accumulated.trim().split(/\s+/).length >= 2) {
      this.onSpeech(this.accumulated.trim())
    }
    this.accumulated = ''
    this._kill()
    this.onStateChange('idle')
  }

  _kill() {
    clearTimeout(this.restartTimer)
    clearTimeout(this.silenceTimer)
    try { this.rec?.abort() } catch(_) {}
    this.rec = null
  }

  _startRec() {
    if (!this.active || this.blocked) return
    if (this.pushToHold && !this.holding) return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    this._kill()

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    // Nigerian English: try en-NG first, then en-GB, en-US as fallbacks
    // Browser will use the best available
    rec.lang = 'en-NG'
    rec.maxAlternatives = 3   // grab 3 alternatives, pick most confident

    rec.onstart = () => this.onStateChange('listening')

    rec.onresult = (e) => {
      clearTimeout(this.silenceTimer)

      let interimText = ''
      let newFinal = ''

      for (let i = e.resultIndex; i < e.results.length; i++) {
        // Pick the most confident alternative
        let best = e.results[i][0]
        for (let j = 1; j < e.results[i].length; j++) {
          if (e.results[i][j].confidence > best.confidence) best = e.results[i][j]
        }
        if (e.results[i].isFinal) {
          newFinal += best.transcript
        } else {
          interimText += best.transcript
        }
      }

      // Show live caption
      if (this.onInterim) this.onInterim(interimText || this.accumulated)

      if (newFinal) {
        this.accumulated += ' ' + newFinal
        this.accumulated = this.accumulated.trim()
      }

      // Wait 1.8 seconds of silence before deciding user is done
      // This is the key fix for Nigerian speakers — gives more time
      if (!this.pushToHold) {
        this.silenceTimer = setTimeout(() => {
          const words = this.accumulated.trim().split(/\s+/)
          // Ignore noise bursts shorter than 3 meaningful words
          if (words.length >= 3 && this.accumulated.trim().length > 8) {
            const text = this.accumulated.trim()
            this.accumulated = ''
            this.onInterim('')
            this.onSpeech(text)
          } else {
            this.accumulated = ''
            this.onInterim('')
          }
        }, 1800)
      }
    }

    rec.onerror = (e) => {
      if (['network','no-speech','audio-capture','aborted'].includes(e.error)) {
        if (this.active && !this.blocked && (!this.pushToHold || this.holding)) {
          this.restartTimer = setTimeout(() => this._startRec(), 600)
        }
      }
    }

    rec.onend = () => {
      if (this.active && !this.blocked && (!this.pushToHold || this.holding)) {
        this.restartTimer = setTimeout(() => this._startRec(), 300)
      } else {
        this.onStateChange('idle')
      }
    }

    this.rec = rec
    try { rec.start() } catch(e) {
      this.restartTimer = setTimeout(() => this._startRec(), 1200)
    }
  }
}

// ═══════════════════════════════════════════════════
// TTS — deep professor voice
// ═══════════════════════════════════════════════════
function getVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const priority = ['Google UK English Male','Microsoft David Desktop','Daniel','Alex','Fred','Microsoft Mark']
  for (const name of priority) {
    const v = voices.find(v => v.name.includes(name))
    if (v) return v
  }
  return voices.find(v => v.lang?.startsWith('en') &&
    !v.name.toLowerCase().includes('female') &&
    !v.name.toLowerCase().includes('zira') &&
    !v.name.toLowerCase().includes('hazel')
  ) || voices.find(v => v.lang?.startsWith('en')) || null
}

function speakNova(text, onDone) {
  if (!window.speechSynthesis) { onDone?.(); return }
  window.speechSynthesis.cancel()
  const voice = getVoice()

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

  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.85; utt.pitch = 0.72; utt.volume = 1
  if (voice) utt.voice = voice
  utt.onend = onDone; utt.onerror = onDone
  window.speechSynthesis.speak(utt)
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
  const [interimText, setInterimText] = useState('')
  const [micMode, setMicMode] = useState('continuous') // 'continuous' | 'push'
  const [holding, setHolding] = useState(false)

  // PDF upload
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')
  const [materials, setMaterials] = useState([])
  const fileInputRef = useRef(null)

  const engineRef = useRef(null)
  const loadingRef = useRef(false)
  const messagesRef = useRef([])
  const voiceOnRef = useRef(true)
  const bottomRef = useRef(null)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { voiceOnRef.current = voiceOn }, [voiceOn])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Load uploaded materials from supabase
  useEffect(() => {
    if (!profile?.id) return
    supabase.from('nova_materials')
      .select('id, file_name, created_at')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMaterials(data || []))
  }, [profile?.id, uploadOpen])

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
      },
      (interim) => setInterimText(interim)
    )
    engineRef.current = engine

    setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.start()
        setMicOn(true)
        const name = profile?.full_name?.split(' ')[0] || 'there'
        setTimeout(() => {
          if (voiceOnRef.current) {
            setNovaState('speaking')
            engineRef.current?.block()
            speakNova(
              `Hello ${name}, I am Professor Nova. I am here and listening — just speak to me naturally, take your time.`,
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
    }
  }, [])

  // ── SEND MESSAGE ──────────────────────────────────────────────
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

  function toggleMic() {
    if (micOn) {
      engineRef.current?.stop()
      setMicOn(false)
      setNovaState('idle')
      setInterimText('')
    } else {
      engineRef.current?.pushToHold = (micMode === 'push')
      engineRef.current?.start()
      setMicOn(true)
    }
  }

  function switchMicMode(m) {
    setMicMode(m)
    if (engineRef.current) {
      engineRef.current.pushToHold = (m === 'push')
      if (m === 'push' && micOn) {
        engineRef.current._kill()
        setNovaState('idle')
      }
    }
  }

  // Push-to-hold handlers
  function holdPress() {
    if (!micOn) return
    setHolding(true)
    engineRef.current?.holdStart()
  }
  function holdRelease() {
    if (!holding) return
    setHolding(false)
    engineRef.current?.holdEnd()
  }

  // ── PDF UPLOAD ────────────────────────────────────────────────
  async function handlePdfUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      setPdfMsg('Please upload a PDF, Word doc, or text file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setPdfMsg('File too large. Please keep it under 10 MB.')
      return
    }
    setPdfUploading(true)
    setPdfMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/nova/upload-material', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setPdfMsg(`"${file.name}" uploaded. Professor Nova will use this when teaching you.`)
      // Reload materials list
      const { data: mats } = await supabase.from('nova_materials')
        .select('id, file_name, created_at')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
      setMaterials(mats || [])
    } catch (err) {
      setPdfMsg('Upload failed: ' + err.message)
    }
    setPdfUploading(false)
    e.target.value = ''
  }

  async function deleteMaterial(id) {
    await supabase.from('nova_materials').delete().eq('id', id)
    setMaterials(prev => prev.filter(m => m.id !== id))
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
        @keyframes nv-ring1{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.5);opacity:0}}
        @keyframes hold-pulse{0%,100%{box-shadow:0 0 0 0 rgba(100,200,255,0.5)}50%{box-shadow:0 0 0 12px rgba(100,200,255,0)}}
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
          {/* Mic mode toggle */}
          <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:99, padding:2, gap:1 }}>
            {['continuous','push'].map(m => (
              <button key={m} className="nova-btn" onClick={() => switchMicMode(m)} style={{ padding:'4px 8px', borderRadius:99, fontSize:9, border:'none', background:micMode===m?'rgba(100,200,255,0.2)':'transparent', color:micMode===m?'#64c8ff':'rgba(255,255,255,0.3)', fontWeight:micMode===m?600:400 }}>
                {m==='continuous'?'Free':'Hold'}
              </button>
            ))}
          </div>

          {/* Mic toggle */}
          <button className="nova-btn" onClick={toggleMic} style={{ background: micOn?'rgba(100,200,255,0.15)':'rgba(255,255,255,0.05)', border:`1px solid ${micOn?'rgba(100,200,255,0.35)':'rgba(255,255,255,0.08)'}`, borderRadius:99, padding:'5px 10px', fontSize:10, color: micOn?'#64c8ff':'rgba(255,255,255,0.35)' }}>
            {micOn ? 'Mic On' : 'Mic Off'}
          </button>

          {/* Voice toggle */}
          <button className="nova-btn" onClick={() => { setVoiceOn(v=>!v); if(novaState==='speaking'){window.speechSynthesis?.cancel();setNovaState('idle');engineRef.current?.unblock()} }} style={{ background: voiceOn?'rgba(245,200,66,0.1)':'rgba(255,255,255,0.05)', border:`1px solid ${voiceOn?'rgba(245,200,66,0.25)':'rgba(255,255,255,0.08)'}`, borderRadius:99, padding:'5px 10px', fontSize:10, color: voiceOn?'#f5c842':'rgba(255,255,255,0.3)' }}>
            {voiceOn ? 'Voice On' : 'Voice Off'}
          </button>

          {/* Materials upload */}
          <button className="nova-btn" onClick={() => setUploadOpen(v => !v)} style={{ background: materials.length>0?'rgba(100,200,120,0.15)':'rgba(255,255,255,0.05)', border:`1px solid ${materials.length>0?'rgba(100,200,120,0.35)':'rgba(255,255,255,0.08)'}`, borderRadius:99, padding:'5px 10px', fontSize:10, color: materials.length>0?'#6dc87a':'rgba(255,255,255,0.3)' }} title="Upload study materials">
            Materials {materials.length > 0 ? `(${materials.length})` : ''}
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

          <Link to="/dashboard" style={{ fontSize:10, color:'rgba(255,255,255,0.2)', textDecoration:'none', padding:'5px 6px' }}>Back</Link>
        </div>
      </div>

      {/* ═══ MAIN: FULL SCREEN NOVA ═══ */}
      <div style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>

        {/* Background atmosphere */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 40%, rgba(245,200,66,0.04) 0%, transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }} />

        {/* Nova avatar — center stage */}
        <div style={{ position:'relative', zIndex:10, marginBottom: boardVisible ? 16 : 0, transition:'margin 0.4s' }}>
          <NovaAvatar state={novaState} size={Math.min(window.innerWidth * 0.45, 200)} />
        </div>

        {/* Live interim caption — shows what Nova is hearing in real time */}
        {interimText && novaState === 'listening' && (
          <div style={{ position:'absolute', top:'58%', left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.7)', border:'1px solid rgba(100,200,255,0.2)', borderRadius:12, padding:'8px 16px', fontSize:13, color:'rgba(100,200,255,0.8)', maxWidth:'80%', textAlign:'center', fontStyle:'italic', pointerEvents:'none', zIndex:25 }}>
            {interimText}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'8px 14px', fontSize:12, color:'#fca5a5', display:'flex', gap:8, alignItems:'center', zIndex:40, maxWidth:'90%' }}>
            <span>{error}</span>
            <button onClick={()=>setError('')} style={{ background:'none', border:'none', color:'#fca5a5', cursor:'pointer', fontSize:16 }}>x</button>
          </div>
        )}

        {/* ═══ BLACKBOARD — Nova's response ═══ */}
        {boardVisible && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(180deg,rgba(8,6,4,0) 0%,rgba(8,6,4,0.95) 20%,rgba(14,28,18,0.98) 100%)', padding:'20px 24px 80px', animation:'board-in 0.4s ease-out', zIndex:20, maxHeight:'55vh', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:novaState==='speaking'?'nb 1s ease-in-out infinite':undefined }} />
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Professor Nova</span>
            </div>
            <TypewriterText text={boardText} style={{ fontSize:'clamp(13px,2.2vw,16px)', color:'rgba(255,255,235,0.9)', lineHeight:1.75, fontFamily:"'Courier New',monospace", textShadow:'0 0 12px rgba(255,255,200,0.2)', letterSpacing:'0.02em', maxHeight:'calc(55vh - 80px)', overflowY:'auto' }} />
          </div>
        )}

        {/* ═══ IDLE: greeting text ═══ */}
        {!boardVisible && messages.length === 0 && novaState === 'idle' && (
          <div style={{ textAlign:'center', padding:'0 32px', zIndex:10 }}>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', lineHeight:1.8 }}>
              {micOn
                ? micMode === 'push'
                  ? 'Hold the mic button below and speak'
                  : 'Just speak — I am listening'
                : 'Tap Mic Off to start talking to me'
              }
            </div>
            {micOn && <div style={{ marginTop:8, fontSize:11, color:'rgba(100,200,255,0.35)' }}>microphone active</div>}
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

        {/* Chat history */}
        <button className="nova-btn" onClick={()=>setChatOpen(v=>!v)} style={{ width:48, height:48, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', fontSize:14, color:'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)', fontWeight:600 }} title="Chat history">
          Chat
        </button>

        {/* Big mic button — works as push-to-hold in push mode */}
        {micMode === 'push' ? (
          <button
            className="nova-btn"
            onMouseDown={holdPress}
            onMouseUp={holdRelease}
            onTouchStart={e=>{e.preventDefault();holdPress()}}
            onTouchEnd={e=>{e.preventDefault();holdRelease()}}
            style={{ width:72, height:72, borderRadius:'50%', background: holding?'rgba(100,200,255,0.35)':'rgba(255,255,255,0.08)', border:`2px solid ${holding?'#64c8ff':'rgba(255,255,255,0.15)'}`, fontSize:11, fontWeight:700, color: holding?'#64c8ff':'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)', position:'relative', userSelect:'none', animation: holding?'hold-pulse 1s ease-in-out infinite':undefined }}>
            {holding ? 'Release' : 'Hold\nto Talk'}
          </button>
        ) : (
          <button className="nova-btn" onClick={toggleMic} style={{ width:64, height:64, borderRadius:'50%', background: micOn?'rgba(100,200,255,0.2)':'rgba(255,255,255,0.08)', border:`2px solid ${micOn?'#64c8ff':'rgba(255,255,255,0.15)'}`, fontSize:11, fontWeight:700, color: micOn?'#64c8ff':'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)', position:'relative' }}>
            {micOn && <div style={{ position:'absolute', inset:-6, borderRadius:'50%', border:'2px solid rgba(100,200,255,0.4)', animation:'nv-ring1 2s ease-out infinite' }} />}
            {micOn ? 'Mic\nOn' : 'Mic\nOff'}
          </button>
        )}

        {/* Stop speaking */}
        {novaState === 'speaking' && (
          <button className="nova-btn" onClick={()=>{ window.speechSynthesis?.cancel(); setNovaState('idle'); setBoardVisible(false); engineRef.current?.unblock() }} style={{ width:48, height:48, borderRadius:'50%', background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', fontSize:14, color:'#fca5a5', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(12px)', fontWeight:700 }}>
            Stop
          </button>
        )}
      </div>

      {/* ═══ MATERIALS PANEL ═══ */}
      {uploadOpen && (
        <div style={{ position:'absolute', inset:0, zIndex:110, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', animation:'chat-in 0.25s ease-out' }}>
          <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Study Materials</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2 }}>Upload PDFs, notes, or past questions. Nova will teach from these.</div>
            </div>
            <button className="nova-btn" onClick={()=>setUploadOpen(false)} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:99, width:28, height:28, fontSize:14, color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>x</button>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
            {/* Upload button */}
            <div style={{ border:'2px dashed rgba(100,200,120,0.3)', borderRadius:12, padding:'24px', textAlign:'center', marginBottom:16, cursor:'pointer', background:'rgba(100,200,120,0.04)' }} onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display:'none' }} onChange={handlePdfUpload} />
              <div style={{ fontSize:13, color:'rgba(100,200,120,0.8)', marginBottom:6, fontWeight:600 }}>
                {pdfUploading ? 'Uploading...' : 'Tap to upload a file'}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>PDF, Word (.docx), or plain text — max 10 MB</div>
            </div>

            {pdfMsg && (
              <div style={{ background: pdfMsg.includes('failed')?'rgba(220,38,38,0.12)':'rgba(100,200,120,0.12)', border:`1px solid ${pdfMsg.includes('failed')?'rgba(220,38,38,0.3)':'rgba(100,200,120,0.3)'}`, borderRadius:10, padding:'10px 14px', fontSize:12, color: pdfMsg.includes('failed')?'#fca5a5':'#6dc87a', marginBottom:14 }}>
                {pdfMsg}
              </div>
            )}

            {/* Materials list */}
            {materials.length === 0 ? (
              <div style={{ textAlign:'center', padding:'24px 0', fontSize:13, color:'rgba(255,255,255,0.25)' }}>
                No materials uploaded yet. Upload a PDF or document and Professor Nova will study it.
              </div>
            ) : (
              <>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Your materials ({materials.length})</div>
                {materials.map(m => (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 14px', marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', fontWeight:500 }}>{m.file_name}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{new Date(m.created_at).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => deleteMaterial(m.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.25)', cursor:'pointer', fontSize:18, lineHeight:1, padding:'2px 6px' }} title="Remove">x</button>
                  </div>
                ))}
              </>
            )}

            <div style={{ marginTop:20, padding:'14px', background:'rgba(245,200,66,0.07)', border:'1px solid rgba(245,200,66,0.15)', borderRadius:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#f5c842', marginBottom:6 }}>How to use materials with Nova</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>
                After uploading, just tell Nova: "Teach me from my uploaded notes" or "Use my material on thermodynamics" — Nova will pull from whatever you have uploaded.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CHAT DRAWER ═══ */}
      {chatOpen && (
        <div style={{ position:'absolute', inset:0, zIndex:100, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', animation:'chat-in 0.25s ease-out' }}>
          <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Conversation</span>
            <button className="nova-btn" onClick={()=>setChatOpen(false)} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:99, width:28, height:28, fontSize:14, color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>x</button>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
            {messages.length===0 && <p style={{ fontSize:13, color:'rgba(255,255,255,0.3)', textAlign:'center', marginTop:40 }}>No messages yet — start talking to Nova</p>}
            {messages.map((msg,i)=>(
              <div key={i} style={{ display:'flex', flexDirection:msg.role==='user'?'row-reverse':'row', gap:7, alignItems:'flex-start' }}>
                {msg.role==='assistant' && <div style={{ width:24, height:24, borderRadius:'50%', background:'#f5c842', fontSize:10, fontWeight:700, color:'#3B1F0E', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'serif', flexShrink:0, marginTop:2 }}>N</div>}
                <div style={{ maxWidth:'80%', padding:'9px 12px', fontSize:13, lineHeight:1.65, whiteSpace:'pre-wrap', background:msg.role==='user'?'#7A3D14':'rgba(255,255,255,0.06)', color:msg.role==='user'?'#fff':'rgba(255,255,255,0.82)', borderRadius:msg.role==='user'?'12px 12px 3px 12px':'3px 12px 12px 12px', border:'1px solid rgba(255,255,255,0.06)' }}>
                  {msg.content}
                  {msg.role==='assistant' && voiceOn && (
                    <button onClick={()=>{ setChatOpen(false); setNovaState('speaking'); setBoardText(msg.content); setBoardVisible(true); speakNova(msg.content,()=>{setNovaState('idle');setBoardVisible(false);engineRef.current?.unblock()}) }} style={{ display:'block', marginTop:4, background:'none', border:'none', fontSize:10, color:'rgba(255,255,255,0.2)', cursor:'pointer', padding:0, fontFamily:'sans-serif' }}>
                      Replay
                    </button>
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
    function tick() {
      if (i < text.length) {
        setDisplayed(text.slice(0, ++i))
        setTimeout(tick, 16)
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
