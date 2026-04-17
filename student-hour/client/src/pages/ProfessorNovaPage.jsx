import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

const RENDER_URL = 'https://nova-vzcm.onrender.com'

async function novaFetch(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not logged in')
  const res = await fetch(`${RENDER_URL}${path}`, {
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

// ── Web Speech API helpers ──
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const synth = window.speechSynthesis

function speakText(text, onEnd) {
  if (!synth) return
  synth.cancel()
  // Strip markdown for cleaner speech
  const clean = text.replace(/[*_#`~>]/g, '').replace(/\n+/g, ' ').trim()
  const utt = new SpeechSynthesisUtterance(clean)
  utt.rate = 0.92
  utt.pitch = 0.95
  utt.volume = 1
  // Pick a good voice
  const voices = synth.getVoices()
  const preferred = voices.find(v => v.name.includes('Daniel') || v.name.includes('Google UK') || v.name.includes('Alex')) || voices[0]
  if (preferred) utt.voice = preferred
  utt.onend = onEnd || null
  synth.speak(utt)
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap:9, alignItems:'flex-start' }}>
      {!isUser && (
        <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:'#F5C842', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'#3B1F0E', fontFamily:'Georgia,serif', marginTop:2 }}>N</div>
      )}
      <div style={{ maxWidth:'84%', padding:'11px 15px', fontSize:14, lineHeight:1.8, whiteSpace:'pre-wrap',
        background: isUser ? '#5C2E10' : 'rgba(255,255,255,0.95)',
        color: isUser ? '#fff' : '#2d1a0e',
        borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        boxShadow:'0 2px 12px rgba(0,0,0,0.2)'
      }}>{msg.content}</div>
    </div>
  )
}

function Dots() {
  return (
    <div style={{ display:'flex', gap:9, alignItems:'center' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', background:'#F5C842', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'#3B1F0E', fontFamily:'Georgia,serif' }}>N</div>
      <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:'4px 18px 18px 18px', padding:'13px 18px', display:'flex', gap:5 }}>
        {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'rgba(255,255,255,0.5)', animation:'ndot 1.2s ease-in-out infinite', animationDelay:`${i*0.2}s` }}/>)}
      </div>
    </div>
  )
}

export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  const { group } = useGroup()
  const [mode, setMode] = useState('personal')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [novaState, setNovaState] = useState('idle')
  const [error, setError] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceSupported] = useState(!!SpeechRecognition)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const bottomRef = useRef(null)
  const recogRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])
  useEffect(() => { setMessages([]); setError(''); synth?.cancel() }, [mode])
  useEffect(() => () => { synth?.cancel(); recogRef.current?.stop() }, [])

  function startListening() {
    if (!SpeechRecognition || listening) return
    const r = new SpeechRecognition()
    r.continuous = false
    r.interimResults = false
    r.lang = 'en-US'
    recogRef.current = r
    r.onstart = () => setListening(true)
    r.onresult = e => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setListening(false)
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    r.start()
  }

  function stopListening() {
    recogRef.current?.stop()
    setListening(false)
  }

  async function send(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    const userMsg = { role:'user', content:text }
    const history = [...messages, userMsg]
    setMessages(history); setInput(''); setLoading(true); setNovaState('thinking'); setError('')
    synth?.cancel()

    try {
      const endpoint = mode === 'classroom' ? '/api/nova/classroom' : '/api/nova/chat'
      const body = mode === 'classroom' ? { messages:history, groupId:group?.id } : { messages:history }
      const data = await novaFetch(endpoint, body)

      setNovaState('speaking')
      setMessages(prev => [...prev, { role:'assistant', content:data.reply }])

      if (ttsEnabled && synth) {
        speakText(data.reply, () => setNovaState('idle'))
      } else {
        setTimeout(() => setNovaState('idle'), 3000)
      }
    } catch(err) {
      setError(err.message)
      setNovaState('idle')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }

  // Voice mode: listen → send automatically
  async function handleVoiceSend() {
    if (listening) { stopListening(); return }
    if (!SpeechRecognition) return
    const r = new SpeechRecognition()
    r.continuous = false; r.interimResults = false; r.lang = 'en-US'
    recogRef.current = r
    r.onstart = () => setListening(true)
    r.onresult = async e => {
      setListening(false)
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      // Auto-send after voice
      const userMsg = { role:'user', content:transcript }
      const history = [...messages, userMsg]
      setMessages(history); setInput(''); setLoading(true); setNovaState('thinking'); setError('')
      synth?.cancel()
      try {
        const endpoint = mode==='classroom' ? '/api/nova/classroom' : '/api/nova/chat'
        const body = mode==='classroom' ? { messages:history, groupId:group?.id } : { messages:history }
        const data = await novaFetch(endpoint, body)
        setNovaState('speaking')
        setMessages(prev => [...prev, { role:'assistant', content:data.reply }])
        if (ttsEnabled && synth) {
          speakText(data.reply, () => setNovaState('idle'))
        } else {
          setTimeout(() => setNovaState('idle'), 3000)
        }
      } catch(err) {
        setError(err.message); setNovaState('idle')
      } finally { setLoading(false) }
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    r.start()
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#1a0f08 0%,#2d1a0e 60%,#1a0f08 100%)', display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes ndot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
        @keyframes npulse{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes nlistenpulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)}70%{box-shadow:0 0 0 14px rgba(239,68,68,0)}}
      `}</style>

      {/* Header */}
      <div style={{ padding:'14px clamp(14px,3vw,24px)', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#F5C842,#c88a00)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:17, color:'#3B1F0E', fontFamily:'Georgia,serif', flexShrink:0 }}>N</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#fff', fontFamily:'Georgia,serif' }}>Professor Nova</div>
            <div style={{ fontSize:11, color: novaState==='thinking' ? '#F5C842' : novaState==='speaking' ? '#22c55e' : 'rgba(255,255,255,0.4)', transition:'color 0.3s', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              {novaState==='thinking' ? '● Thinking...' : novaState==='speaking' ? '● Speaking' : '○ Ready to teach'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* TTS toggle */}
          <button onClick={()=>{ setTtsEnabled(!ttsEnabled); synth?.cancel() }} title={ttsEnabled ? 'Mute Nova voice' : 'Unmute Nova voice'} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:16, color: ttsEnabled ? '#F5C842' : 'rgba(255,255,255,0.35)', transition:'all 0.2s' }}>
            {ttsEnabled ? '🔊' : '🔇'}
          </button>
          {/* Mode toggle */}
          {group && (
            <div style={{ display:'flex', background:'rgba(255,255,255,0.07)', borderRadius:999, padding:3, gap:2 }}>
              {['personal','classroom'].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{ padding:'5px 12px', borderRadius:999, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', fontFamily:'var(--font-sans)', background: mode===m ? '#F5C842' : 'transparent', color: mode===m ? '#3B1F0E' : 'rgba(255,255,255,0.5)', transition:'all 0.2s' }}>
                  {m==='personal' ? 'Personal' : 'Class'}
                </button>
              ))}
            </div>
          )}
          <Link to="/dashboard" style={{ fontSize:12, color:'rgba(255,255,255,0.35)', padding:'6px 8px', textDecoration:'none' }}>← Back</Link>
        </div>
      </div>

      {/* Avatar — shown above chat, compact */}
      <div style={{ padding:'20px clamp(14px,3vw,24px) 8px', display:'flex', justifyContent:'center' }}>
        <div style={{ maxWidth:160, width:'100%' }}>
          <NovaAvatar state={novaState} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:14, maxWidth:760, width:'100%', margin:'0 auto', alignSelf:'stretch' }}>
        {messages.length===0 && (
          <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:'20px 18px', maxWidth:520 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'#fff', marginBottom:8, fontFamily:'Georgia,serif' }}>
              Hello, {firstName}! 👋
            </div>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.8, marginBottom:12 }}>
              {mode==='classroom'
                ? `I'm ready to teach ${group?.name || 'your group'}. What topic shall we dive into?`
                : `I'm Professor Nova. I know your courses and I'm ready to help. What shall we work on today?`}
            </p>
            {voiceSupported && (
              <div style={{ fontSize:12, color:'rgba(245,200,66,0.7)', display:'flex', alignItems:'center', gap:6 }}>
                <span>🎙</span> Tap the mic button below to talk to me directly
              </div>
            )}
          </div>
        )}
        {messages.map((msg,i) => <Message key={i} msg={msg} />)}
        {loading && <Dots />}
        {error && (
          <div style={{ background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:12, padding:'10px 14px', fontSize:13, color:'#fca5a5', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
            <span>⚠ {error}</span>
            <button onClick={()=>setError('')} style={{ background:'none', border:'none', color:'#fca5a5', cursor:'pointer', fontSize:18, flexShrink:0 }}>×</button>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input area */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.25)', padding:'12px clamp(14px,3vw,24px)', flexShrink:0 }}>
        <form onSubmit={send} style={{ display:'flex', gap:8, maxWidth:760, margin:'0 auto', alignItems:'flex-end' }}>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={listening ? '🎙 Listening...' : 'Ask Professor Nova anything...'}
            rows={1} disabled={loading||listening}
            style={{ flex:1, padding:'11px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,0.12)', fontSize:16, resize:'none', fontFamily:'var(--font-sans)', lineHeight:1.5, background:'rgba(255,255,255,0.08)', color:'#fff', outline:'none', transition:'border-color 0.2s' }}
            onFocus={e=>e.target.style.borderColor='rgba(245,200,66,0.6)'}
            onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.12)'}
          />
          {/* Mic button */}
          {voiceSupported && (
            <button type="button" onClick={handleVoiceSend} disabled={loading}
              style={{ width:44, height:44, borderRadius:'50%', border:'none', cursor: loading ? 'not-allowed' : 'pointer', flexShrink:0, fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s',
                background: listening ? '#ef4444' : 'rgba(255,255,255,0.1)',
                animation: listening ? 'nlistenpulse 1.2s ease-in-out infinite' : 'none',
                opacity: loading ? 0.4 : 1
              }} title={listening ? 'Stop listening' : 'Speak to Nova'}>
              {listening ? '⏹' : '🎙'}
            </button>
          )}
          {/* Send button */}
          <button type="submit" disabled={!input.trim()||loading}
            style={{ padding:'11px 18px', fontSize:14, borderRadius:12, flexShrink:0, fontWeight:700, border:'none', cursor: input.trim()&&!loading ? 'pointer' : 'not-allowed', transition:'all 0.2s', fontFamily:'var(--font-sans)',
              background: input.trim()&&!loading ? 'linear-gradient(135deg,#F5C842,#c88a00)' : 'rgba(255,255,255,0.08)',
              color: input.trim()&&!loading ? '#3B1F0E' : 'rgba(255,255,255,0.3)',
              boxShadow: input.trim()&&!loading ? '0 4px 16px rgba(245,200,66,0.3)' : 'none'
            }}>Ask</button>
        </form>

        {/* Quick prompts */}
        <div style={{ maxWidth:760, margin:'10px auto 0', display:'flex', gap:6, flexWrap:'wrap' }}>
          {['Explain this topic simply','Quiz me','Give me practice problems','I don\'t understand this'].map(s=>(
            <button key={s} onClick={()=>setInput(s)} style={{ fontSize:11, padding:'5px 11px', borderRadius:999, background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.09)', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
