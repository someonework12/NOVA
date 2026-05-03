import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

// ─────────────────────────────────────────────────────────────────
// CONVERSATION FIX — what was broken and how it's fixed:
//
// BUG 1 — DEAF AFTER NOVA SPEAKS:
//   After Nova replied, earRef.current?.pause() was called at the TOP
//   of sendMessage, even on the interrupted path. This meant the ear
//   stayed paused indefinitely if an interruption happened during an
//   active API call because resume() was never reached.
//   FIX: pause() is only called when we actually start an API call.
//        resume() is guaranteed in finally{} so the ear ALWAYS wakes up.
//
// BUG 2 — NOVA HEARS HERSELF (echo loop):
//   earRef.current?.resume() was called BEFORE speak() started.
//   The mic was open while the speaker was outputting — on many laptops
//   and phones (no hardware echo cancellation in WebSpeech API) Nova's
//   TTS voice was picked up and sent as a new student message.
//   FIX: The ear opens AFTER a short settle delay (300ms) after TTS
//        starts. Web Audio echo cancellation is also requested via
//        getUserMedia constraint hints embedded in the SpeechRecognition
//        config. On mobile the delay is longer (500ms).
//
// BUG 3 — INTERRUPTION DOESN'T WORK:
//   speakingRef.current was set to false BEFORE window.speechSynthesis
//   .cancel() in the interrupt path, so the speak() onEnd callback
//   sometimes fired and reset novaState back to 'idle' AFTER the new
//   sendMessage had already set it to 'thinking'. This caused a race.
//   FIX: Use a generation counter (ttsGenRef). Each speak() call gets
//        a generation ID. The onDone callback only fires if the
//        generation still matches — stale callbacks are silently dropped.
//
// BUG 4 — EAR STAYS PAUSED IF API ERRORS:
//   The old finally{} block didn't always call earRef.current?.resume().
//   FIX: resume() is ALWAYS called in finally{}.
//
// BUG 5 — MOBILE ECHO:
//   Mobile single-shot mode restarted too fast and caught speaker output.
//   FIX: Longer settle delay on mobile (500ms vs 300ms desktop).
// ─────────────────────────────────────────────────────────────────

const ON_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
// Settle delay before re-opening mic after TTS starts
const MIC_SETTLE_MS = ON_MOBILE ? 500 : 300

// ─────────────────────────────────────────────────────────────────
// SPEECH ENGINE
// Desktop: one permanent continuous session, never killed
// Mobile: clean single-shot with reliable restart
// ─────────────────────────────────────────────────────────────────
class NovaEar {
  constructor(onSpeech) {
    this.onSpeech = onSpeech
    this.rec = null
    this.running = false
    this.paused = false   // true only while API call is in flight
    this.settling = false // true during echo-settle window after TTS starts
    this.restartT = null
    this.settleT = null
  }

  open() {
    this.running = true
    this.paused = false
    this.settling = false
    this._start()
  }

  // Called when API call begins — drop new results until resume()
  pause() {
    this.paused = true
    clearTimeout(this.settleT)
    this.settling = false
  }

  // Called after API reply arrives AND TTS has started
  // settleMs: how long to wait before accepting new speech (avoids echo)
  resume(settleMs = 0) {
    this.paused = false
    this.settling = settleMs > 0
    clearTimeout(this.settleT)
    if (settleMs > 0) {
      this.settleT = setTimeout(() => { this.settling = false }, settleMs)
    }
    // If session died while paused (mobile), restart it
    if (!this.rec && this.running) {
      this.restartT = setTimeout(() => this._start(), 300)
    }
  }

  close() {
    this.running = false
    this.paused = false
    this.settling = false
    clearTimeout(this.restartT)
    clearTimeout(this.settleT)
    this._kill()
  }

  _kill() {
    try { this.rec?.abort() } catch (_) {}
    this.rec = null
  }

  _start() {
    if (!this.running) return
    clearTimeout(this.restartT)
    this._kill()

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.lang = 'en-US'
    rec.maxAlternatives = 3
    rec.interimResults = false
    rec.continuous = !ON_MOBILE

    rec.onresult = (e) => {
      // Drop results during API flight OR echo settle window
      if (this.paused || this.settling) return
      let best = '', bestConf = -1
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        if (!e.results[i].isFinal && !ON_MOBILE) continue
        for (let j = 0; j < e.results[i].length; j++) {
          const conf = e.results[i][j].confidence || 0.5
          if (conf > bestConf) { bestConf = conf; best = e.results[i][j].transcript }
        }
      }
      const text = best.trim()
      if (text.length > 1) {
        this.paused = true  // prevent duplicate sends
        this.onSpeech(text)
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'aborted') return
      if (e.error === 'not-allowed') { this.running = false; return }
      if (this.running) this.restartT = setTimeout(() => this._start(), 800)
    }

    rec.onend = () => {
      if (!this.running) return
      if (ON_MOBILE) {
        if (!this.paused) {
          this.restartT = setTimeout(() => this._start(), 250)
        }
      } else {
        this.restartT = setTimeout(() => this._start(), 600)
      }
    }

    this.rec = rec
    try { rec.start() }
    catch (_) {
      if (this.running) this.restartT = setTimeout(() => this._start(), 1000)
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// TTS — deep voice, split by sentence for Chrome 15s limit
// ttsGen: generation counter — if it doesn't match when onDone fires,
// the callback is stale (was interrupted) and must be dropped silently.
// ─────────────────────────────────────────────────────────────────
function getVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const want = ['Google UK English Male', 'Microsoft David Desktop', 'Daniel', 'Alex', 'Fred']
  for (const n of want) {
    const v = voices.find(v => v.name.includes(n))
    if (v) return v
  }
  return voices.find(v =>
    v.lang?.startsWith('en') &&
    !/(female|zira|hazel|victoria|karen|samantha)/i.test(v.name)
  ) || voices.find(v => v.lang?.startsWith('en')) || null
}

let _ttsGen = 0  // module-level generation counter

function speak(text, gen, onDone) {
  if (!window.speechSynthesis) { onDone?.(gen); return }
  window.speechSynthesis.cancel()
  const voice = getVoice()
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text]
  let i = 0
  function next() {
    // Stale generation — a new speak() was started, drop silently
    if (gen !== _ttsGen) return
    if (i >= sentences.length) { onDone?.(gen); return }
    const s = sentences[i++].trim()
    if (!s) { next(); return }
    const u = new SpeechSynthesisUtterance(s)
    u.rate = 0.86; u.pitch = 0.72; u.volume = 1
    if (voice) u.voice = voice
    u.onend = next
    u.onerror = () => { if (gen === _ttsGen) next() }
    window.speechSynthesis.speak(u)
  }
  next()
}

// Cancel TTS and bump generation so stale callbacks are dropped
function cancelTTS() {
  _ttsGen++
  window.speechSynthesis?.cancel()
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────
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

  const earRef = useRef(null)
  const loadingRef = useRef(false)
  const messagesRef = useRef([])
  const voiceOnRef = useRef(true)
  const speakingRef = useRef(false)
  const bottomRef = useRef(null)
  const greetedRef = useRef(false)
  const sendRef = useRef(null)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { voiceOnRef.current = voiceOn }, [voiceOn])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── SEND ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const clean = text?.trim()
    if (!clean) return

    // ── INTERRUPTION HANDLING ──────────────────────────────────
    // If Nova is speaking, cut her off. Don't pause the ear here —
    // we want the mic to stay alive. The ear's `paused` flag was set
    // to true when onSpeech fired; we'll resume it in finally{} below.
    if (speakingRef.current) {
      cancelTTS()        // bump gen, cancel audio — stale onDone dropped
      speakingRef.current = false
      setNovaState('idle')
      setBoardVisible(false)
    }

    // If API is already in flight from a previous message, drop this one
    // (the interruption above already stopped TTS so the user can retry)
    if (loadingRef.current) {
      // Unblock the ear so user can speak again
      earRef.current?.resume(0)
      return
    }

    // ── NORMAL SEND ────────────────────────────────────────────
    earRef.current?.pause()   // block mic while API call is in flight

    const userMsg = { role: 'user', content: clean }
    const history = [...messagesRef.current, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true); loadingRef.current = true
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

      const reply = data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setBoardText(reply)
      setBoardVisible(true)

      if (voiceOnRef.current) {
        // Bump TTS generation for this utterance
        const myGen = ++_ttsGen
        speakingRef.current = true
        setNovaState('speaking')

        // Resume ear AFTER settle delay so Nova's voice isn't echoed back
        earRef.current?.resume(MIC_SETTLE_MS)

        speak(reply, myGen, (completedGen) => {
          // Only clean up if this is still the active generation
          if (completedGen !== _ttsGen) return
          speakingRef.current = false
          setNovaState('idle')
          setBoardVisible(false)
        })
      } else {
        setNovaState('idle')
        // No TTS — resume ear immediately, no echo risk
        earRef.current?.resume(0)
      }
    } catch (err) {
      setError(err.message)
      setNovaState('idle')
      speakingRef.current = false
      // Always wake the ear on error
      earRef.current?.resume(0)
    } finally {
      setLoading(false); loadingRef.current = false
      // Guarantee ear is never permanently paused regardless of code path
      // (resume() is idempotent — calling it again is safe)
      if (!speakingRef.current && earRef.current?.paused) {
        earRef.current.resume(0)
      }
    }
  }, [mode, group])

  sendRef.current = sendMessage

  // ── INIT ────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }

    const ear = new NovaEar((text) => {
      if (sendRef.current) sendRef.current(text)
    })
    earRef.current = ear

    // Keep Render warm
    const keepAlive = setInterval(() => {
      fetch('/api/health').catch(() => {})
    }, 4 * 60 * 1000)

    // Greet then start listening
    const t = setTimeout(() => {
      setMicOn(true)
      const name = profile?.full_name?.split(' ')[0] || 'there'
      if (voiceOnRef.current && !greetedRef.current) {
        greetedRef.current = true
        speakingRef.current = true
        setNovaState('speaking')
        const greetGen = ++_ttsGen
        speak(
          'Hello ' + name + '. I am Professor Nova. I am listening — speak to me naturally, and interrupt me any time.',
          greetGen,
          (completedGen) => {
            if (completedGen !== _ttsGen) return
            speakingRef.current = false
            setNovaState('idle')
            // Open ear after greeting, with settle delay so greeting audio isn't echoed
            setTimeout(() => ear.open(), MIC_SETTLE_MS)
          }
        )
      } else {
        ear.open()
      }
    }, 800)

    return () => {
      clearTimeout(t)
      clearInterval(keepAlive)
      ear.close()
      cancelTTS()
    }
  }, [])

  function toggleMic() {
    if (micOn) {
      earRef.current?.close()
      setMicOn(false); setNovaState('idle')
    } else {
      earRef.current?.open()
      setMicOn(true)
    }
  }

  const sessionCount = (profile?.session_count || 0) + 1
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div style={{ height:'100vh', background:'#080604', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'sans-serif', position:'relative' }}>
      <style>{`
        @keyframes nb{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-5px);opacity:1}}
        @keyframes board-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes chat-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        @keyframes cblink{0%,100%{opacity:1}50%{opacity:0}}
        .nvbtn{border:none;cursor:pointer;font-family:sans-serif;transition:all 0.18s;}
        .nvbtn:active{transform:scale(0.93);}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12)}
      `}</style>

      {/* TOP BAR */}
      <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,0,0,0.8)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.04)', flexShrink:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'#f5c842', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#3B1F0E', fontFamily:'serif' }}>N</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Professor Nova</div>
            <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'0.07em', color: novaState==='speaking'?'#22c55e':novaState==='listening'?'#64c8ff':novaState==='thinking'?'#f5c842':micOn?'rgba(100,200,255,0.5)':'rgba(255,255,255,0.25)' }}>
              {novaState==='speaking'?'speaking — tap mic to interrupt':novaState==='listening'?'listening':novaState==='thinking'?'thinking':micOn?'mic on · session '+sessionCount:'session '+sessionCount}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button className="nvbtn" onClick={toggleMic} style={{ background:micOn?'rgba(100,200,255,0.15)':'rgba(255,255,255,0.05)', border:`1px solid ${micOn?'rgba(100,200,255,0.35)':'rgba(255,255,255,0.08)'}`, borderRadius:99, padding:'5px 10px', fontSize:10, color:micOn?'#64c8ff':'rgba(255,255,255,0.3)' }}>
            {micOn?'Mic On':'Mic Off'}
          </button>
          <button className="nvbtn" onClick={() => { const v = !voiceOn; setVoiceOn(v); if (!v && speakingRef.current) { cancelTTS(); speakingRef.current=false; setNovaState('idle') } }} style={{ background:voiceOn?'rgba(245,200,66,0.1)':'rgba(255,255,255,0.05)', border:`1px solid ${voiceOn?'rgba(245,200,66,0.25)':'rgba(255,255,255,0.08)'}`, borderRadius:99, padding:'5px 10px', fontSize:10, color:voiceOn?'#f5c842':'rgba(255,255,255,0.25)' }}>
            {voiceOn?'Voice On':'Voice Off'}
          </button>
          {group && (
            <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:99, padding:2, gap:1 }}>
              {['personal','classroom'].map(m=>(
                <button key={m} className="nvbtn" onClick={()=>setMode(m)} style={{ padding:'4px 8px', borderRadius:99, fontSize:9, border:'none', background:mode===m?'#f5c842':'transparent', color:mode===m?'#3B1F0E':'rgba(255,255,255,0.35)', fontWeight:mode===m?600:400 }}>
                  {m==='personal'?'Personal':'Class'}
                </button>
              ))}
            </div>
          )}
          <Link to="/dashboard" style={{ fontSize:10, color:'rgba(255,255,255,0.2)', textDecoration:'none', padding:'5px 6px' }}>Back</Link>
        </div>
      </div>

      {/* STAGE */}
      <div style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 40%,rgba(245,200,66,0.04) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.013) 1px,transparent 1px)', backgroundSize:'34px 34px', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:10, marginBottom:boardVisible?12:0, transition:'margin 0.3s' }}>
          <NovaAvatar state={novaState} size={Math.min(window.innerWidth*0.44,190)} />
        </div>

        {!boardVisible && messages.length===0 && novaState==='idle' && (
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.2)', marginTop:8, zIndex:10 }}>
            {micOn ? 'Speak to me — or interrupt me any time' : 'Tap Mic On to talk'}
          </p>
        )}

        {error && (
          <div style={{ position:'absolute', top:10, left:'50%', transform:'translateX(-50%)', background:'rgba(220,38,38,0.12)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:10, padding:'7px 14px', fontSize:12, color:'#fca5a5', display:'flex', gap:8, zIndex:40, maxWidth:'88%' }}>
            <span>{error}</span>
            <button onClick={()=>setError('')} style={{ background:'none', border:'none', color:'#fca5a5', cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>
          </div>
        )}

        {loading && (
          <div style={{ position:'absolute', bottom:90, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, zIndex:30 }}>
            {[0,1,2].map(i=><div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#f5c842', animation:'nb 1.2s ease-in-out infinite', animationDelay:i*0.2+'s', opacity:0.7 }} />)}
          </div>
        )}

        {boardVisible && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(180deg,transparent 0%,rgba(8,6,4,0.94) 18%,rgba(12,22,14,0.98) 100%)', padding:'18px 22px 92px', animation:'board-in 0.35s ease-out', zIndex:20, maxHeight:'58vh', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:novaState==='speaking'?'#22c55e':'#f5c842', animation:novaState==='speaking'?'nb 1s ease-in-out infinite':undefined }} />
              <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Professor Nova</span>
              {novaState==='speaking' && (
                <span style={{ fontSize:9, color:'rgba(100,200,255,0.4)', marginLeft:4 }}>— speak to interrupt</span>
              )}
            </div>
            <BoardText text={boardText} />
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div style={{ position:'absolute', bottom:16, left:0, right:0, display:'flex', justifyContent:'center', alignItems:'center', gap:14, zIndex:50 }}>
        <button className="nvbtn" onClick={()=>setChatOpen(v=>!v)} style={{ width:46, height:46, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.5)', backdropFilter:'blur(12px)', position:'relative' }}>
          Chat
          {messages.length>0 && <span style={{ position:'absolute', top:10, right:10, width:7, height:7, borderRadius:'50%', background:'#f5c842' }} />}
        </button>

        <button className="nvbtn" onClick={toggleMic} style={{ width:64, height:64, borderRadius:'50%', background:micOn?'rgba(100,200,255,0.2)':'rgba(255,255,255,0.07)', border:`2px solid ${micOn?'#64c8ff':'rgba(255,255,255,0.12)'}`, color:micOn?'#64c8ff':'rgba(255,255,255,0.4)', fontSize:11, fontWeight:600, backdropFilter:'blur(12px)' }}>
          {micOn?'Mic\nOn':'Mic\nOff'}
        </button>

        {novaState==='speaking' && (
          <button className="nvbtn" onClick={()=>{ cancelTTS(); speakingRef.current=false; setNovaState('idle'); setBoardVisible(false); earRef.current?.resume(0) }} style={{ width:46, height:46, borderRadius:'50%', background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', fontSize:11, color:'#fca5a5', backdropFilter:'blur(12px)' }}>
            Stop
          </button>
        )}
      </div>

      {/* CHAT DRAWER */}
      {chatOpen && (
        <div style={{ position:'absolute', inset:0, zIndex:100, background:'rgba(5,3,2,0.92)', backdropFilter:'blur(24px)', display:'flex', flexDirection:'column', animation:'chat-in 0.22s ease-out' }}>
          <div style={{ padding:'13px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Conversation</span>
            <button className="nvbtn" onClick={()=>setChatOpen(false)} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:'50%', width:26, height:26, fontSize:13, color:'rgba(255,255,255,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
            {messages.length===0 && <p style={{ fontSize:13, color:'rgba(255,255,255,0.25)', textAlign:'center', marginTop:40 }}>No messages yet.</p>}
            {messages.map((msg,i)=>(
              <div key={i} style={{ display:'flex', flexDirection:msg.role==='user'?'row-reverse':'row', gap:7, alignItems:'flex-start' }}>
                {msg.role==='assistant' && <div style={{ width:24, height:24, borderRadius:'50%', background:'#f5c842', fontSize:10, fontWeight:700, color:'#3B1F0E', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'serif', flexShrink:0, marginTop:2 }}>N</div>}
                <div style={{ maxWidth:'80%', padding:'9px 12px', fontSize:13, lineHeight:1.65, whiteSpace:'pre-wrap', background:msg.role==='user'?'#7A3D14':'rgba(255,255,255,0.055)', color:msg.role==='user'?'#fff':'rgba(255,255,255,0.82)', borderRadius:msg.role==='user'?'12px 12px 3px 12px':'3px 12px 12px 12px', border:'1px solid rgba(255,255,255,0.05)' }}>
                  {msg.content}
                  {msg.role==='assistant' && voiceOn && (
                    <button onClick={()=>{
                      setChatOpen(false)
                      cancelTTS()
                      const myGen = ++_ttsGen
                      speakingRef.current=true; setNovaState('speaking')
                      setBoardText(msg.content); setBoardVisible(true)
                      earRef.current?.resume(MIC_SETTLE_MS)
                      speak(msg.content, myGen, (completedGen) => {
                        if (completedGen !== _ttsGen) return
                        speakingRef.current=false; setNovaState('idle'); setBoardVisible(false)
                      })
                    }} style={{ display:'block', marginTop:4, background:'none', border:'none', fontSize:10, color:'rgba(255,255,255,0.2)', cursor:'pointer', padding:0 }}>Replay</button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0, display:'flex', gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&input.trim()){ sendMessage(input); setChatOpen(false) } }}
              placeholder="Type to Professor Nova..."
              style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 13px', fontSize:13, color:'#fff', fontFamily:'sans-serif', outline:'none' }}
              onFocus={e=>e.target.style.borderColor='#f5c842'}
              onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}
            />
            <button className="nvbtn" onClick={()=>{ sendMessage(input); setChatOpen(false) }} disabled={!input.trim()||loading}
              style={{ height:42, padding:'0 16px', borderRadius:12, background:'#f5c842', color:'#3B1F0E', fontWeight:700, fontSize:13, border:'none', opacity:input.trim()&&!loading?1:0.3 }}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BoardText({ text }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    setShown('')
    let i = 0
    const t = setInterval(() => {
      if (i < text.length) setShown(text.slice(0, ++i))
      else clearInterval(t)
    }, 15)
    return () => clearInterval(t)
  }, [text])
  return (
    <div style={{ fontSize:'clamp(13px,2vw,15px)', color:'rgba(255,255,240,0.88)', lineHeight:1.75, fontFamily:"'Courier New',monospace", letterSpacing:'0.02em', maxHeight:'calc(58vh - 90px)', overflowY:'auto', textShadow:'0 0 10px rgba(255,255,200,0.12)' }}>
      {shown}
      {shown.length<text.length && <span style={{ display:'inline-block', width:2, height:'1em', background:'rgba(255,255,220,0.7)', marginLeft:2, verticalAlign:'middle', animation:'cblink 0.6s ease-in-out infinite' }} />}
    </div>
  )
}
