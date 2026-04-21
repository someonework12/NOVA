export default function NovaAvatar({ state = 'idle', size = 200 }) {
  const speaking = state === 'speaking'
  const thinking = state === 'thinking'
  const listening = state === 'listening'
  const active = speaking || thinking || listening

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <style>{`
        @keyframes nv-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-${size*0.04}px)} }
        @keyframes nv-think { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
        @keyframes nv-ring1 { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(1.9);opacity:0} }
        @keyframes nv-ring2 { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2.4);opacity:0} }
        @keyframes nv-orbit { from{transform:rotate(0deg) translateX(${size*0.52}px) rotate(0deg)} to{transform:rotate(360deg) translateX(${size*0.52}px) rotate(-360deg)} }
        @keyframes nv-orbit2 { from{transform:rotate(180deg) translateX(${size*0.44}px) rotate(-180deg)} to{transform:rotate(540deg) translateX(${size*0.44}px) rotate(-540deg)} }
        @keyframes nv-mouth { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(2.5)} }
        @keyframes nv-blink { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.05)} }
        @keyframes nv-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes nv-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes nv-listen { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
      `}</style>

      {/* Outer ambient glow */}
      <div style={{
        position: 'absolute', inset: -size*0.2, borderRadius: '50%', pointerEvents: 'none',
        background: speaking ? `radial-gradient(circle,rgba(245,200,66,0.22) 0%,transparent 65%)`
          : listening ? `radial-gradient(circle,rgba(100,200,255,0.2) 0%,transparent 65%)`
          : thinking ? `radial-gradient(circle,rgba(167,139,250,0.18) 0%,transparent 65%)`
          : `radial-gradient(circle,rgba(245,200,66,0.06) 0%,transparent 65%)`,
        animation: active ? 'nv-glow 2s ease-in-out infinite' : 'none',
        transition: 'background 1s'
      }} />

      {/* Pulse rings when speaking/listening */}
      {(speaking || listening) && <>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid ${speaking?'rgba(245,200,66,0.5)':'rgba(100,200,255,0.5)'}`, animation:'nv-ring1 2s ease-out infinite' }} />
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`1px solid ${speaking?'rgba(245,200,66,0.3)':'rgba(100,200,255,0.3)'}`, animation:'nv-ring2 2s ease-out infinite 0.6s' }} />
      </>}

      {/* Orbit particles */}
      {active && <>
        <div style={{ position:'absolute', top:'50%', left:'50%', width:0, height:0 }}>
          <div style={{ width: size*0.07, height: size*0.07, borderRadius:'50%', background: speaking?'#f5c842':listening?'#64c8ff':'#a78bfa', marginLeft: -size*0.035, marginTop: -size*0.035, animation: `nv-orbit ${speaking?'2.5s':'3.5s'} linear infinite`, boxShadow:`0 0 ${size*0.06}px currentColor` }} />
        </div>
        <div style={{ position:'absolute', top:'50%', left:'50%', width:0, height:0 }}>
          <div style={{ width: size*0.045, height: size*0.045, borderRadius:'50%', background: 'rgba(255,255,255,0.4)', marginLeft: -size*0.0225, marginTop: -size*0.0225, animation: 'nv-orbit2 4s linear infinite' }} />
        </div>
      </>}

      {/* Main sphere */}
      <div style={{
        position: 'absolute', inset: size*0.05,
        borderRadius: '50%',
        background: speaking
          ? `radial-gradient(circle at 32% 28%, #fff7cc, #f5c842 35%, #c8941a 65%, #7a5500)`
          : listening
          ? `radial-gradient(circle at 32% 28%, #c8f0ff, #64c8ff 35%, #0080c8 65%, #003c64)`
          : thinking
          ? `radial-gradient(circle at 32% 28%, #e8d8ff, #a78bfa 35%, #6d28d9 65%, #2e1065)`
          : `radial-gradient(circle at 32% 28%, #5a5a5a, #2a2a2a 45%, #111 70%, #000)`,
        boxShadow: speaking
          ? `0 ${size*0.06}px ${size*0.18}px rgba(245,200,66,0.55), inset 0 -${size*0.04}px ${size*0.1}px rgba(0,0,0,0.4)`
          : listening
          ? `0 ${size*0.06}px ${size*0.18}px rgba(100,200,255,0.45), inset 0 -${size*0.04}px ${size*0.1}px rgba(0,0,0,0.4)`
          : `0 ${size*0.04}px ${size*0.12}px rgba(0,0,0,0.6), inset 0 -${size*0.03}px ${size*0.08}px rgba(0,0,0,0.5)`,
        animation: thinking ? 'nv-think 0.7s ease-in-out infinite' : 'nv-float 4s ease-in-out infinite',
        transition: 'background 0.7s, box-shadow 0.7s',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: size*0.04, overflow: 'hidden'
      }}>
        {/* Specular highlight */}
        <div style={{ position:'absolute', top:'10%', left:'18%', width:'38%', height:'28%', borderRadius:'50%', background:'radial-gradient(ellipse,rgba(255,255,255,0.4) 0%,transparent 70%)', pointerEvents:'none' }} />

        {/* Scanlines */}
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 4px)', pointerEvents:'none' }} />

        {/* Eyes */}
        <div style={{ display:'flex', gap: size*0.13, marginTop: size*0.06, position:'relative', zIndex:1 }}>
          {[0,1].map(i => (
            <div key={i} style={{
              width: size*0.09, height: size*0.09, borderRadius:'50%',
              background: active ? '#fff' : 'rgba(255,255,255,0.7)',
              boxShadow: active ? `0 0 ${size*0.05}px rgba(255,255,255,0.9)` : 'none',
              animation: `nv-blink 4s ${i*1.5}s ease-in-out infinite`,
              transition: 'box-shadow 0.3s'
            }}>
              {/* Pupil */}
              <div style={{ width:'45%', height:'45%', borderRadius:'50%', background:'#000', margin:'27% auto 0', opacity: active ? 0.8 : 0.5 }} />
            </div>
          ))}
        </div>

        {/* Mouth */}
        <div style={{
          width: speaking ? size*0.2 : size*0.12,
          height: speaking ? size*0.09 : size*0.04,
          borderRadius: `0 0 ${size*0.1}px ${size*0.1}px`,
          background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
          animation: speaking ? 'nv-mouth 0.3s ease-in-out infinite' : 'none',
          transition: 'all 0.3s', position:'relative', zIndex:1,
          marginBottom: size*0.05
        }} />
      </div>

      {/* N badge */}
      <div style={{
        position:'absolute', bottom: size*0.04, right: size*0.04,
        width: size*0.22, height: size*0.22, borderRadius:'50%',
        background: speaking ? '#3B1F0E' : listening ? '#003c64' : '#111',
        border: `2px solid ${speaking?'#f5c842':listening?'#64c8ff':'rgba(255,255,255,0.15)'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition: 'all 0.4s', zIndex:5
      }}>
        <span style={{ fontSize: size*0.1, fontWeight:700, fontFamily:'serif', color: speaking?'#f5c842':listening?'#64c8ff':'rgba(255,255,255,0.5)' }}>N</span>
      </div>

      {/* Listening sound bars */}
      {listening && (
        <div style={{ position:'absolute', bottom: -size*0.1, left:'50%', transform:'translateX(-50%)', display:'flex', gap:3, alignItems:'center', height: size*0.08 }}>
          {[3,6,10,14,18,14,10,6,3].map((h,i) => (
            <div key={i} style={{ width:3, borderRadius:2, background:'#64c8ff', height:h, animation:'nv-listen 0.5s ease-in-out infinite', animationDelay: i*0.06+'s', opacity:0.8 }} />
          ))}
        </div>
      )}

      {/* Speaking sound bars */}
      {speaking && (
        <div style={{ position:'absolute', bottom: -size*0.1, left:'50%', transform:'translateX(-50%)', display:'flex', gap:3, alignItems:'center', height: size*0.08 }}>
          {[4,8,12,16,20,16,12,8,4].map((h,i) => (
            <div key={i} style={{ width:3, borderRadius:2, background:'#f5c842', height:h, animation:'nv-listen 0.4s ease-in-out infinite', animationDelay: i*0.05+'s', opacity:0.85 }} />
          ))}
        </div>
      )}
    </div>
  )
}
