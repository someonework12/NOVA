export default function NovaAvatar({ state = 'idle' }) {
  const thinking = state === 'thinking'
  const speaking = state === 'speaking'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <style>{`
        @keyframes nfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes nthink{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
        @keyframes ntalk{0%,100%{transform:scaleY(1)}40%{transform:scaleY(0.2)}}
        @keyframes nspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes nglow{0%,100%{opacity:.3}50%{opacity:.8}}
        @keyframes nwave{0%,100%{transform:scaleY(0.4)}50%{transform:scaleY(1)}}
      `}</style>

      <div style={{ position:'relative', width:160, height:200 }}>
        {/* Glow */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ width:140, height:140, borderRadius:'50%', background: speaking ? 'radial-gradient(circle,rgba(245,200,66,0.4) 0%,transparent 70%)' : thinking ? 'radial-gradient(circle,rgba(139,94,60,0.35) 0%,transparent 70%)' : 'radial-gradient(circle,rgba(245,200,66,0.1) 0%,transparent 70%)', animation: state!=='idle' ? 'nglow 1.5s ease-in-out infinite' : 'none', transition:'background 0.8s' }} />
        </div>
        {/* Orbit ring when active */}
        {state !== 'idle' && (
          <div style={{ position:'absolute', top:16, left:'50%', marginLeft:-72, width:144, height:144, borderRadius:'50%', border:`2px solid ${speaking?'rgba(245,200,66,0.5)':'rgba(139,94,60,0.4)'}`, borderTopColor:'transparent', animation:'nspin 2s linear infinite' }} />
        )}
        {/* Body */}
        <div style={{ position:'relative', zIndex:2, animation: thinking ? 'nthink 0.5s ease-in-out infinite' : 'nfloat 3s ease-in-out infinite', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:16 }}>
          {/* Head */}
          <div style={{ width:90, height:90, borderRadius:'50%', background:'linear-gradient(135deg,#f5c842,#e8a020)', boxShadow:'0 4px 20px rgba(245,200,66,0.45)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            {/* Eyes */}
            <div style={{ display:'flex', gap:16, marginTop:6 }}>
              {[0,1].map(i=>(
                <div key={i} style={{ width:10, height: thinking?5:10, borderRadius:'50%', background:'#3B1F0E', transition:'height 0.3s', animation: speaking ? `nglow 0.6s ease-in-out infinite ${i*0.15}s` : 'none' }} />
              ))}
            </div>
            {/* Mouth */}
            <div style={{ width: speaking?22:14, height: speaking?8:4, borderRadius: speaking?'0 0 11px 11px':6, background:'#3B1F0E', transition:'all 0.25s', animation: speaking ? 'ntalk 0.35s ease-in-out infinite' : 'none', marginBottom:6 }} />
          </div>
          {/* Neck */}
          <div style={{ width:22, height:14, background:'linear-gradient(180deg,#e8a020,#7a3d14)' }} />
          {/* Body */}
          <div style={{ width:80, height:64, borderRadius:'40% 40% 10px 10px', background:'linear-gradient(180deg,#7A3D14,#3B1F0E)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:8, position:'relative' }}>
            <div style={{ width:28, height:10, borderRadius:'0 0 14px 14px', background:'#F5C842' }} />
            <div style={{ position:'absolute', bottom:10, width:20, height:20, borderRadius:'50%', background:'#F5C842', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.4)' }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#3B1F0E', fontFamily:'serif' }}>N</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sound waves when speaking */}
      {speaking && (
        <div style={{ display:'flex', gap:3, alignItems:'center', height:20 }}>
          {[0.5,1,1.5,2,1.5,1,0.5].map((h,i)=>(
            <div key={i} style={{ width:3, borderRadius:2, background:'var(--yellow-400)', animation:`nwave 0.5s ease-in-out infinite`, animationDelay:`${i*0.07}s`, height:h*8, opacity:0.8 }} />
          ))}
        </div>
      )}

      {/* Status */}
      <div style={{ background:'rgba(0,0,0,0.5)', borderRadius:99, padding:'5px 14px', display:'flex', alignItems:'center', gap:7 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background: speaking?'#22c55e':thinking?'var(--yellow-400)':'rgba(255,255,255,0.3)', transition:'background 0.3s' }} />
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
          {speaking?'Speaking':thinking?'Thinking':'Prof. Nova'}
        </span>
      </div>
    </div>
  )
}
