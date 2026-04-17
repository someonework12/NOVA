import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

function speakText(text, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.92; utt.pitch = 1.0; utt.volume = 1
  const voices = window.speechSynthesis.getVoices()
  const voice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel') || v.name.includes('Alex')) || voices.find(v => v.lang?.startsWith('en')) || voices[0]
  if (voice) utt.voice = voice
  utt.onend = onEnd; utt.onerror = onEnd
  window.speechSynthesis.speak(utt)
}

const API = () => import.meta.env.VITE_API_URL || ''

export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  const { group } = useGroup()
  const [mode, setMode] = useState('personal')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [novaState, setNovaState] = useState('idle')
  const [voiceOn, setVoiceOn] = useState(true)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const recRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])
  useEffect(() => { setMessages([]); setError('') }, [mode])
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }
    return () => window.speechSynthesis?.cancel()
  }, [])

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return
    const userMsg = { role:'user', content: text.trim() }
    const history = [...messages, userMsg]
    setMessages(history); setInput(''); setLoading(true); setNovaState('thinking'); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const endpoint = mode === 'classroom' ? '/api/nova/classroom' : '/api/nova/chat'
      const body = mode === 'classroom' ? { messages: history, groupId: group?.id } : { messages: history }
      const res = await fetch(`${API()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
      setMessages(prev => [...prev, { role:'assistant', content: data.reply }])
      if (voiceOn) {
        setNovaState('speaking')
        speakText(data.reply, () => setNovaState('idle'))
      } else {
        setNovaState('idle')
      }
    } catch(err) {
      setError(err.message)
      setNovaState('idle')
    } finally { setLoading(false) }
  }, [messages, mode, group, loading, voiceOn])

  function toggleMic() {
    if (listening) { recRef.current?.stop(); setListening(false); return }
    window.speechSynthesis?.cancel()
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Voice input needs Chrome or Edge browser.'); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false
    rec.onresult = e => { const t = e.results[0][0].transcript; setInput(t); setListening(false); setTimeout(()=>sendMessage(t),300) }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec; rec.start(); setListening(true)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const canMic = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  return (
    <div style={{ minHeight:'100vh', background:'var(--brown-900)', display:'flex', flexDirection:'column' }}>
      <style>{`@keyframes nbounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}} @keyframes nring{from{transform:scale(0.8);opacity:1}to{transform:scale(2.5);opacity:0}}`}</style>

      {/* Header */}
      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--yellow-500)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, color:'var(--brown-900)', fontFamily:'var(--font-serif)' }}>N</div>
          <div>
            <div style={{ fontWeight:600, fontSize:15, color:'#fff', fontFamily:'var(--font-serif)' }}>Professor Nova</div>
            <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em', color: novaState==='speaking'?'#22c55e':novaState==='thinking'?'var(--yellow-400)':'rgba(255,255,255,0.4)' }}>
              {novaState==='speaking'?'● speaking':novaState==='thinking'?'● thinking':'● ready'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <button onClick={()=>{ setVoiceOn(v=>!v); window.speechSynthesis?.cancel(); setNovaState('idle') }}
            style={{ background: voiceOn?'rgba(245,200,66,0.2)':'rgba(255,255,255,0.08)', border:`1px solid ${voiceOn?'rgba(245,200,66,0.4)':'rgba(255,255,255,0.15)'}`, borderRadius:99, padding:'5px 12px', fontSize:11, color: voiceOn?'var(--yellow-400)':'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
            {voiceOn ? '🔊 Voice on' : '🔇 Muted'}
          </button>
          {group && (
            <div style={{ display:'flex', background:'rgba(255,255,255,0.08)', borderRadius:99, padding:3, gap:2 }}>
              {['personal','classroom'].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{ padding:'5px 11px', borderRadius:99, fontSize:11, fontWeight:500, border:'none', cursor:'pointer', fontFamily:'var(--font-sans)', background:mode===m?'var(--yellow-500)':'transparent', color:mode===m?'var(--brown-900)':'rgba(255,255,255,0.55)', transition:'all 0.2s' }}>
                  {m==='personal'?'Personal':'Classroom'}
                </button>
              ))}
            </div>
          )}
          <Link to="/dashboard" style={{ fontSize:12, color:'rgba(255,255,255,0.4)', padding:'5px 8px' }}>← Back</Link>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Avatar panel */}
        <div className="nova-avatar-panel" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', borderRight:'1px solid rgba(255,255,255,0.06)', flexShrink:0, minWidth:240 }}>
          <NovaAvatar state={novaState} />
          {novaState==='speaking' && (
            <button onClick={()=>{ window.speechSynthesis?.cancel(); setNovaState('idle') }}
              style={{ marginTop:14, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:99, padding:'7px 16px', fontSize:12, color:'rgba(255,255,255,0.7)', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
              ■ Stop
            </button>
          )}
        </div>

        {/* Chat */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--surface)' }}>
          {mode==='classroom' && group && (
            <div style={{ background:'rgba(245,200,66,0.1)', borderBottom:'1px solid rgba(245,200,66,0.2)', padding:'8px 18px', fontSize:13, color:'var(--brown-700)', flexShrink:0 }}>
              Classroom mode — {group.name}. Nova teaches the whole group.
            </div>
          )}

          <div style={{ flex:1, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>
            {messages.length===0 && (
              <div style={{ background:'var(--yellow-50)', border:'1px solid var(--yellow-300)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
                <div style={{ fontWeight:600, fontSize:15, color:'var(--brown-900)', marginBottom:8 }}>Hello, {firstName}!</div>
                <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.75 }}>
                  {mode==='classroom' ? "I'm Professor Nova. Let's get started — what topic shall we tackle today?" : "I'm Professor Nova. I know your courses and I remember everything we cover. What shall we work on today?"}
                </p>
                {canMic && voiceOn && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:10 }}>🎤 Tap the mic to speak to me — I'll respond out loud.</p>}
              </div>
            )}

            {messages.map((msg,i)=>(
              <div key={i} style={{ display:'flex', flexDirection:msg.role==='user'?'row-reverse':'row', gap:8, alignItems:'flex-start' }}>
                {msg.role==='assistant' && <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:'var(--yellow-500)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'var(--brown-900)', fontFamily:'var(--font-serif)', marginTop:2 }}>N</div>}
                <div style={{ maxWidth:'82%', padding:'11px 14px', fontSize:14, lineHeight:1.75, whiteSpace:'pre-wrap', background:msg.role==='user'?'var(--brown-700)':'#fff', color:msg.role==='user'?'#fff':'var(--text-primary)', borderRadius:msg.role==='user'?'16px 16px 4px 16px':'4px 16px 16px 16px', border:msg.role==='user'?'none':'1px solid var(--border-soft)', boxShadow:'var(--shadow-sm)' }}>
                  {msg.content}
                  {msg.role==='assistant' && voiceOn && (
                    <button onClick={()=>{ setNovaState('speaking'); speakText(msg.content, ()=>setNovaState('idle')) }} style={{ display:'block', marginTop:6, background:'none', border:'none', fontSize:11, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font-sans)', padding:0 }}>🔊 Replay</button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--yellow-500)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'var(--brown-900)', fontFamily:'var(--font-serif)' }}>N</div>
                <div style={{ background:'#fff', border:'1px solid var(--border-soft)', borderRadius:'4px 16px 16px 16px', padding:'11px 16px', display:'flex', gap:5 }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--brown-400)', animation:'nbounce 1.2s ease-in-out infinite', animationDelay:`${i*0.2}s` }} />)}
                </div>
              </div>
            )}

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#c0392b', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <span style={{ lineHeight:1.5 }}>{error}</span>
                <button onClick={()=>setError('')} style={{ background:'none', border:'none', color:'#c0392b', cursor:'pointer', fontSize:18, lineHeight:1, flexShrink:0 }}>×</button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop:'1px solid var(--border-soft)', background:'#fff', padding:'10px 16px', flexShrink:0 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
              {['Explain this topic','Quiz me','I don\'t understand','Give me a practice problem'].map(s=>(
                <button key={s} onClick={()=>sendMessage(s)} disabled={loading} style={{ fontSize:11, padding:'4px 10px', borderRadius:99, background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border-soft)', cursor:'pointer', fontFamily:'var(--font-sans)' }}>{s}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(input)} }}
                placeholder="Type your question or tap the mic..." rows={1} disabled={loading||listening}
                style={{ flex:1, padding:'10px 13px', borderRadius:'var(--radius-md)', border:'1.5px solid var(--border)', fontSize:14, resize:'none', fontFamily:'var(--font-sans)', lineHeight:1.5, background:'#fff', color:'var(--text-primary)', transition:'border-color 0.2s' }}
                onFocus={e=>e.target.style.borderColor='var(--brown-500)'}
                onBlur={e=>e.target.style.borderColor='var(--border)'} />
              {canMic && (
                <button type="button" onClick={toggleMic} style={{ width:42, height:42, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background:listening?'#ef4444':'var(--brown-100)', transition:'all 0.2s' }}>
                  {listening && <div style={{ position:'absolute', inset:-4, borderRadius:'50%', border:'2px solid #ef4444', animation:'nring 1s ease-out infinite' }} />}
                  <span style={{ fontSize:17 }}>{listening?'⏹':'🎤'}</span>
                </button>
              )}
              <button type="button" onClick={()=>sendMessage(input)} disabled={!input.trim()||loading} style={{ height:42, padding:'0 16px', borderRadius:'var(--radius-md)', background:'var(--brown-700)', color:'#fff', fontWeight:600, fontSize:14, border:'none', cursor:input.trim()&&!loading?'pointer':'not-allowed', opacity:input.trim()&&!loading?1:0.5, fontFamily:'var(--font-sans)', transition:'opacity 0.2s', flexShrink:0 }}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
