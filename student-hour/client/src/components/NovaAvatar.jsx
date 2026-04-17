// Pure CSS animated Nova avatar — no Three.js, no external dependencies, no errors
export default function NovaAvatar({ state = 'idle', speaking = false }) {
  const isThinking = state === 'thinking'
  const isSpeaking = state === 'speaking' || speaking

  return (
    <div style={{ position:'relative', width:220, height:280, display:'flex', flexDirection:'column', alignItems:'center' }}>
      <style>{`
        @keyframes nova-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes nova-pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes nova-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes nova-talk  { 0%,100%{transform:scaleY(1)} 25%{transform:scaleY(0.3)} 75%{transform:scaleY(0.7)} }
        @keyframes nova-think { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
        @keyframes nova-glow  { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes nova-ring  { from{transform:rotate(0deg) scale(1)} to{transform:rotate(360deg) scale(1)} }
      `}</style>

      {/* Outer glow */}
      <div style={{
        position:'absolute', width:180, height:180, borderRadius:'50%', top:20,
        background: isSpeaking ? 'radial-gradient(circle,rgba(245,200,66,0.35) 0%,transparent 70%)'
          : isThinking ? 'radial-gradient(circle,rgba(139,94,60,0.3) 0%,transparent 70%)'
          : 'radial-gradient(circle,rgba(245,200,66,0.12) 0%,transparent 70%)',
        animation: state !== 'idle' ? 'nova-glow 1.5s ease-in-out infinite' : 'none',
        transition:'background 0.8s'
      }} />

      {/* Rotating ring — only when speaking or thinking */}
      {state !== 'idle' && (
        <div style={{
          position:'absolute', top:22, width:176, height:176, borderRadius:'50%',
          border: `2px solid ${isSpeaking ? 'rgba(245,200,66,0.4)' : 'rgba(139,94,60,0.3)'}`,
          borderTopColor:'transparent',
          animation:'nova-spin 2s linear infinite'
        }} />
      )}

      {/* Main avatar body */}
      <div style={{
        animation: isThinking ? 'nova-think 0.6s ease-in-out infinite' : 'nova-float 3s ease-in-out infinite',
        display:'flex', flexDirection:'column', alignItems:'center'
      }}>
        {/* Head */}
        <div style={{
          width:100, height:100, borderRadius:'50%',
          background:'linear-gradient(135deg, #f5c842 0%, #e8a020 100%)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 20px rgba(245,200,66,0.4)',
          position:'relative', zIndex:2
        }}>
          {/* Face */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            {/* Eyes */}
            <div style={{ display:'flex', gap:18, marginTop:8 }}>
              {[0,1].map(i => (
                <div key={i} style={{
                  width:10, height: isThinking ? 6 : 10,
                  borderRadius:'50%', background:'var(--brown-900)',
                  transition:'height 0.3s',
                  animation: isSpeaking ? `nova-pulse 0.8s ease-in-out infinite ${i*0.15}s` : 'none'
                }} />
              ))}
            </div>
            {/* Mouth */}
            <div style={{
              width: isSpeaking ? 24 : 16,
              height: isSpeaking ? 8 : 4,
              borderRadius: isSpeaking ? '0 0 12px 12px' : 8,
              background:'var(--brown-900)',
              transition:'all 0.2s',
              animation: isSpeaking ? 'nova-talk 0.4s ease-in-out infinite' : 'none',
              marginBottom:8
            }} />
          </div>
        </div>

        {/* Neck */}
        <div style={{ width:24, height:16, background:'linear-gradient(180deg,#e8a020,#7a3d14)', borderRadius:'0 0 4px 4px' }} />

        {/* Body / robe */}
        <div style={{
          width:88, height:70, borderRadius:'50% 50% 8px 8px',
          background:'linear-gradient(180deg, var(--brown-700) 0%, var(--brown-900) 100%)',
          display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:8,
          position:'relative', zIndex:1
        }}>
          {/* Collar */}
          <div style={{ width:32, height:12, borderRadius:'0 0 16px 16px', background:'var(--yellow-400)' }} />
          {/* Badge */}
          <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', width:22, height:22, borderRadius:'50%', background:'var(--yellow-500)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.3)' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--brown-900)', fontFamily:'serif' }}>N</span>
          </div>
        </div>
      </div>

      {/* Sound waves — only when speaking */}
      {isSpeaking && (
        <div style={{ display:'flex', gap:4, alignItems:'center', marginTop:12 }}>
          {[1,2,3,4,3,2,1].map((h,i) => (
            <div key={i} style={{
              width:3, borderRadius:2,
              background:'var(--yellow-400)',
              height: h * 4,
              animation:'nova-talk 0.4s ease-in-out infinite',
              animationDelay:`${i*0.07}s`,
              opacity:0.8
            }} />
          ))}
        </div>
      )}

      {/* Status pill */}
      <div style={{
        marginTop: isSpeaking ? 8 : 16,
        background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)',
        borderRadius:'var(--radius-full)', padding:'5px 14px',
        display:'flex', alignItems:'center', gap:7
      }}>
        <div style={{
          width:7, height:7, borderRadius:'50%',
          background: isSpeaking ? '#22c55e' : isThinking ? 'var(--yellow-400)' : 'rgba(255,255,255,0.3)',
          transition:'background 0.3s',
          animation: state !== 'idle' ? 'nova-pulse 1.4s ease-in-out infinite' : 'none'
        }} />
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
          {isSpeaking ? 'Speaking' : isThinking ? 'Thinking' : 'Prof. Nova'}
        </span>
      </div>
    </div>
  )
}
