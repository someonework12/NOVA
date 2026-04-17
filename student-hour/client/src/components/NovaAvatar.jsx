export default function NovaAvatar({ state = 'idle' }) {
  const thinking = state === 'thinking'
  const speaking = state === 'speaking'
  return (
    <div style={{ position:'relative', width:'100%', maxWidth:260, aspectRatio:'1/1', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>
      <style>{`
        @keyframes npulse{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes nspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes nbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes nmouth{0%,100%{height:5px}50%{height:14px}}
      `}</style>
      {/* Glow */}
      <div style={{ position:'absolute', width:'100%', height:'100%', borderRadius:'50%',
        background: speaking ? 'radial-gradient(circle,rgba(245,200,66,0.3) 0%,transparent 70%)'
          : thinking ? 'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%)'
          : 'radial-gradient(circle,rgba(245,200,66,0.08) 0%,transparent 70%)',
        transition:'background 1s', animation: state!=='idle' ? 'npulse 2s ease-in-out infinite' : 'none'
      }}/>
      {/* Spinning orbit ring when thinking */}
      {thinking && <div style={{ position:'absolute', width:'90%', height:'90%', borderRadius:'50%', border:'2px dashed rgba(245,200,66,0.5)', animation:'nspin 2.5s linear infinite' }}/>}
      {/* Head */}
      <div style={{ width:'65%', height:'65%', animation:'nbob 3.5s ease-in-out infinite', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:'100%', height:'100%', borderRadius:'50%',
          background:'linear-gradient(135deg,#F5C842,#c88a00)',
          boxShadow: speaking ? '0 0 40px rgba(245,200,66,0.7),0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.35)',
          transition:'box-shadow 0.6s',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10
        }}>
          <div style={{ fontFamily:'Georgia,serif', fontWeight:800, fontSize:56, color:'#3B1F0E', lineHeight:1, userSelect:'none', letterSpacing:'-2px' }}>N</div>
          {/* Animated mouth */}
          <div style={{ width:24, borderRadius:4, background:'rgba(58,31,14,0.55)',
            height: speaking ? 14 : 5,
            animation: speaking ? 'nmouth 0.35s ease-in-out infinite' : 'none',
            transition:'height 0.3s'
          }}/>
        </div>
        {/* Live dot */}
        {speaking && <div style={{ position:'absolute', top:'8%', right:'8%', width:13, height:13, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 8px #22c55e', animation:'npulse 0.9s ease-in-out infinite' }}/>}
      </div>
      {/* Status pill */}
      <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)', borderRadius:999, padding:'5px 14px', display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap' }}>
        <div style={{ width:7, height:7, borderRadius:'50%', transition:'background 0.3s',
          background: speaking ? '#22c55e' : thinking ? '#F5C842' : 'rgba(255,255,255,0.25)',
          animation: state!=='idle' ? 'npulse 1.5s ease-in-out infinite' : 'none'
        }}/>
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
          {speaking ? 'Speaking' : thinking ? 'Thinking' : 'Professor Nova'}
        </span>
      </div>
    </div>
  )
}
