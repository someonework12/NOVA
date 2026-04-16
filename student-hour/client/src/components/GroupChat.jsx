import { useState } from 'react'
import { useChat } from '../hooks/useChat.js'
import { useAuth } from '../hooks/useAuth.jsx'

function Avatar({ name, role }) {
  const bg = role === 'tutor' ? 'var(--yellow-500)' : 'var(--brown-200)'
  const color = role === 'tutor' ? 'var(--brown-900)' : 'var(--brown-800)'
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

export default function GroupChat({ groupId, groupName }) {
  const { user } = useAuth()
  const { messages, loading, sendMessage, bottomRef } = useChat(groupId)
  const [input, setInput] = useState('')

  function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input); setInput('')
  }
  function handleKey(e) { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend(e)} }
  function fmt(ts) { return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }

  if (!groupId) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)', fontSize:14, padding:24, textAlign:'center' }}>
      You have not been assigned to a group yet. Complete onboarding and wait for the admin to run grouping.
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border-soft)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e' }} />
        <span style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)' }}>{groupName||'Group Chat'}</span>
        <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:'auto' }}>Live</span>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>
        {loading ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>Loading...</div>
        : messages.length===0 ? <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13, marginTop:32 }}>No messages yet. Say hello!</div>
        : messages.map(msg => {
          const own = msg.sender_id===user?.id
          return (
            <div key={msg.id} style={{ display:'flex', gap:8, flexDirection:own?'row-reverse':'row', alignItems:'flex-end' }}>
              {!own && <Avatar name={msg.sender_name} role={msg.sender_role} />}
              <div style={{ maxWidth:'75%' }}>
                {!own && (
                  <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--brown-700)' }}>{msg.sender_name}</span>
                    {msg.sender_role==='tutor' && <span style={{ fontSize:10, background:'var(--yellow-100)', color:'var(--brown-800)', padding:'1px 6px', borderRadius:20, fontWeight:500 }}>Tutor</span>}
                  </div>
                )}
                <div style={{ background:own?'var(--brown-700)':'#fff', color:own?'#fff':'var(--text-primary)', padding:'10px 13px', borderRadius:own?'16px 16px 4px 16px':'16px 16px 16px 4px', fontSize:14, lineHeight:1.6, border:own?'none':'1px solid var(--border-soft)', boxShadow:'var(--shadow-sm)' }}>
                  {msg.content}
                </div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3, textAlign:own?'right':'left' }}>{fmt(msg.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ padding:'12px 18px', borderTop:'1px solid var(--border-soft)', display:'flex', gap:8 }}>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Message your group..." rows={1}
          style={{ flex:1, padding:'10px 13px', borderRadius:'var(--radius-md)', border:'1.5px solid var(--border)', fontSize:14, resize:'none', fontFamily:'var(--font-sans)', lineHeight:1.5, background:'#fff', color:'var(--text-primary)', transition:'border-color 0.2s' }}
          onFocus={e=>e.target.style.borderColor='var(--brown-500)'}
          onBlur={e=>e.target.style.borderColor='var(--border)'} />
        <button type="submit" className="btn-primary" style={{ padding:'10px 16px', fontSize:14, borderRadius:'var(--radius-md)', flexShrink:0 }} disabled={!input.trim()}>Send</button>
      </form>
    </div>
  )
}
