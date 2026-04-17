export default function NovaAvatar({ state = 'idle' }) {
  const thinking = state === 'thinking'
  const speaking = state === 'speaking'
  return (
    <div style={{ fontFamily:'sans-serif', userSelect:'none' }}>
      <style>{`
        @keyframes npulse{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes nspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes nbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes nmouth{0%,100%{height:5px}50%{height:14px}}
      `}</style>
      <div style={{
        position:'relative', width:'100%', maxWidth:260, aspectRatio:'1/1',
        display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto'
      }}>
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          border:`3px solid ${speaking?'#f5c842':thinking?'#8b5e3c':'#333'}`,
          animation: thinking ? 'nspin 2s linear infinite' : 'none',
          transition:'border-color .4s'
        }}/>
        <div style={{
          width:'72%', height:'72%', borderRadius:'50%',
          background: speaking
            ? 'radial-gradient(circle at 40% 35%,#ffe680,#f5c842 60%,#c8941a)'
            : thinking
            ? 'radial-gradient(circle at 40% 35%,#d4956a,#8b5e3c 60%,#5a3a20)'
            : 'radial-gradient(circle at 40% 35%,#555,#222 60%,#111)',
          animation:'nbob 3s ease-in-out infinite',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          transition:'background .6s', gap:8
        }}>
          <div style={{ display:'flex', gap:14 }}>
            {[0,1].map(i=>(
              <div key={i} style={{
                width:10, height:10, borderRadius:'50%',
                background: speaking||thinking ? '#fff' : '#aaa',
                animation: thinking ? `npulse 1s ${i*0.2}s ease-in-out infinite` : 'none'
              }}/>
            ))}
          </div>
          <div style={{
            width: speaking ? 22 : 16, height: speaking ? 8 : 5,
            borderRadius: speaking ? '0 0 12px 12px' : '0 0 6px 6px',
            background: speaking||thinking ? '#fff' : '#666',
            animation: speaking ? 'nmouth .35s ease-in-out infinite alternate' : 'none',
            transition:'all .3s'
          }}/>
        </div>
      </div>
      <p style={{
        textAlign:'center', marginTop:12,
        color: speaking ? '#f5c842' : thinking ? '#c8845a' : '#666',
        fontSize:13, letterSpacing:'0.08em', fontWeight:600, transition:'color .4s'
      }}>
        {speaking ? 'SPEAKING' : thinking ? 'THINKING' : 'NOVA'}
      </p>
    </div>
  )
}
