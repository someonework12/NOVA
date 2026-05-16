// NovaHumanoid.jsx — Futuristic humanoid Professor Nova avatar
export default function NovaHumanoid({ state = 'idle', size = 320 }) {
  const speaking  = state === 'speaking'
  const thinking  = state === 'thinking'
  const writing   = state === 'writing'
  const s = size
  const c = s / 320

  return (
    <div style={{ position:'relative', width:s, height:s*1.1, margin:'0 auto', userSelect:'none' }}>
      <style>{`
        @keyframes nh-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(${-6*c}px)} }
        @keyframes nh-breathe { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.03)} }
        @keyframes nh-blink   { 0%,85%,100%{transform:scaleY(1)} 90%,95%{transform:scaleY(0.05)} }
        @keyframes nh-mouth-s { 0%,100%{transform:scaleY(1) scaleX(1)} 25%{transform:scaleY(2.2) scaleX(1.1)} 75%{transform:scaleY(0.6) scaleX(0.9)} }
        @keyframes nh-mouth-t { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(0.7)} }
        @keyframes nh-think   { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
        @keyframes nh-write   { 0%{transform:rotate(-25deg) translate(0,0)} 50%{transform:rotate(-20deg) translate(${8*c}px,${4*c}px)} 100%{transform:rotate(-25deg) translate(0,0)} }
        @keyframes nh-glow    { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes nh-scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
        @keyframes nh-particle{ 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(${-40*c}px) scale(0);opacity:0} }
        @keyframes nh-ring    { 0%{transform:scale(0.8);opacity:0.8} 100%{transform:scale(2);opacity:0} }
        @keyframes nh-tie     { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position:'absolute', top:'10%', left:'10%', right:'10%', bottom:'10%',
        borderRadius:'50%', pointerEvents:'none',
        background: speaking ? `radial-gradient(ellipse,rgba(245,200,66,0.25) 0%,transparent 70%)`
                  : thinking ? `radial-gradient(ellipse,rgba(167,139,250,0.2) 0%,transparent 70%)`
                  : writing  ? `radial-gradient(ellipse,rgba(100,220,255,0.2) 0%,transparent 70%)`
                  : `radial-gradient(ellipse,rgba(245,200,66,0.06) 0%,transparent 70%)`,
        animation:'nh-glow 2.5s ease-in-out infinite', transition:'background 1s'
      }}/>

      {/* Pulse rings when speaking */}
      {speaking && [0,1].map(i=>(
        <div key={i} style={{
          position:'absolute', top:'15%', left:'20%', right:'20%', height:'50%',
          borderRadius:'50%', border:`${1.5*c}px solid rgba(245,200,66,${0.5-i*0.2})`,
          animation:`nh-ring 2s ease-out ${i*0.6}s infinite`, pointerEvents:'none'
        }}/>
      ))}

      {/* Full figure */}
      <div style={{
        position:'absolute', inset:0,
        animation: writing ? 'none' : 'nh-float 5s ease-in-out infinite',
        display:'flex', flexDirection:'column', alignItems:'center'
      }}>
        {/* HEAD */}
        <div style={{
          position:'relative', width:`${100*c}px`, height:`${108*c}px`,
          animation: thinking ? 'nh-think 0.8s ease-in-out infinite' : 'none'
        }}>
          {/* Head shape */}
          <div style={{
            position:'absolute', inset:0,
            background:`linear-gradient(160deg, #1a1210 0%, #2d1f18 40%, #1a1210 100%)`,
            borderRadius:`${50*c}px ${50*c}px ${44*c}px ${44*c}px`,
            boxShadow:`0 ${6*c}px ${20*c}px rgba(0,0,0,0.7), inset 0 ${2*c}px ${8*c}px rgba(245,200,66,0.08)`
          }}>
            {/* Forehead band */}
            <div style={{
              position:'absolute', top:'8%', left:'5%', right:'5%', height:`${3*c}px`,
              background:`linear-gradient(90deg,transparent,rgba(245,200,66,0.4),transparent)`,
              borderRadius:`${2*c}px`, animation:'nh-glow 2s ease-in-out infinite'
            }}/>
            {/* Eyebrows */}
            {[0,1].map(i=>(
              <div key={i} style={{
                position:'absolute', top:`${22*c}px`,
                left: i===0 ? `${18*c}px` : `${58*c}px`,
                width:`${22*c}px`, height:`${3*c}px`,
                background:'rgba(245,200,66,0.9)', borderRadius:`${2*c}px`,
                transform: thinking ? (i===0?'rotate(-8deg)':'rotate(8deg)') : (i===0?'rotate(-4deg)':'rotate(4deg)'),
                transition:'transform 0.3s'
              }}/>
            ))}
            {/* Eyes */}
            {[0,1].map(i=>(
              <div key={i} style={{
                position:'absolute', top:`${32*c}px`,
                left: i===0 ? `${16*c}px` : `${58*c}px`,
                width:`${26*c}px`, height:`${18*c}px`,
                borderRadius:`${9*c}px`, background:'#0a0806', overflow:'hidden',
                boxShadow:`0 0 ${6*c}px rgba(245,200,66,${speaking?0.8:0.3})`
              }}>
                <div style={{
                  position:'absolute', top:'10%', left:'15%', width:'70%', height:'80%',
                  borderRadius:'50%',
                  background:`radial-gradient(circle at 35% 35%,#d4a840 0%,#8b6914 40%,#2a1f08 70%,#000 100%)`,
                  animation:'nh-blink 5s ease-in-out infinite', animationDelay:`${i*1.8}s`
                }}>
                  <div style={{position:'absolute',top:'25%',left:'25%',width:'50%',height:'50%',borderRadius:'50%',background:'#000'}}/>
                  <div style={{position:'absolute',top:'12%',left:'55%',width:'20%',height:'20%',borderRadius:'50%',background:'rgba(255,255,255,0.8)'}}/>
                </div>
              </div>
            ))}
            {/* Nose */}
            <div style={{
              position:'absolute', top:`${54*c}px`, left:`${44*c}px`,
              width:`${12*c}px`, height:`${14*c}px`,
              borderLeft:`${2*c}px solid rgba(245,200,66,0.25)`,
              borderBottom:`${2*c}px solid rgba(245,200,66,0.25)`,
              borderRadius:`0 0 0 ${4*c}px`
            }}/>
            {/* Mouth */}
            <div style={{position:'absolute',top:`${72*c}px`,left:`${22*c}px`,right:`${22*c}px`,height:`${10*c}px`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{
                width: speaking?`${48*c}px`:thinking?`${28*c}px`:`${36*c}px`,
                height: speaking?`${10*c}px`:`${5*c}px`,
                borderRadius:`0 0 ${20*c}px ${20*c}px`,
                background: speaking?'rgba(245,200,66,0.9)':'rgba(245,200,66,0.4)',
                animation: speaking?'nh-mouth-s 0.25s ease-in-out infinite':thinking?'nh-mouth-t 1s ease-in-out infinite':'none',
                transition:'all 0.3s',
                boxShadow: speaking?`0 0 ${8*c}px rgba(245,200,66,0.6)`:'none'
              }}/>
            </div>
            {/* Ear pieces */}
            {[0,1].map(i=>(
              <div key={i} style={{
                position:'absolute', top:`${40*c}px`,
                [i===0?'left':'right']:`${-4*c}px`,
                width:`${8*c}px`, height:`${20*c}px`,
                borderRadius:`${4*c}px`,
                background:`linear-gradient(${i===0?'90deg':'270deg'},rgba(245,200,66,0.6),rgba(245,200,66,0.1))`,
                boxShadow:`0 0 ${6*c}px rgba(245,200,66,0.4)`
              }}/>
            ))}
          </div>
          {/* Academic cap */}
          <div style={{
            position:'absolute', top:`${-18*c}px`, left:`${-10*c}px`, right:`${-10*c}px`, height:`${22*c}px`,
            background:`linear-gradient(180deg,#0d0b0a 0%,#1a1511 100%)`,
            borderRadius:`${4*c}px ${4*c}px 0 0`,
            boxShadow:`0 ${-2*c}px ${8*c}px rgba(0,0,0,0.5)`
          }}>
            <div style={{position:'absolute',bottom:`${-4*c}px`,left:`${-14*c}px`,right:`${-14*c}px`,height:`${8*c}px`,background:'#1a1511',borderRadius:`${2*c}px`}}/>
            <div style={{position:'absolute',top:`${4*c}px`,left:'50%',transform:'translateX(-50%)',width:`${8*c}px`,height:`${8*c}px`,borderRadius:'50%',background:'#f5c842',boxShadow:`0 0 ${8*c}px rgba(245,200,66,0.8)`,animation:'nh-glow 2s ease-in-out infinite'}}/>
            <div style={{position:'absolute',top:`${4*c}px`,right:`${10*c}px`,width:`${2*c}px`,height:`${24*c}px`,background:'linear-gradient(180deg,#f5c842,rgba(245,200,66,0.3))'}}/>
          </div>
        </div>

        {/* Neck */}
        <div style={{width:`${24*c}px`,height:`${16*c}px`,background:'linear-gradient(180deg,#1a1210,#2d1f18)',position:'relative',zIndex:1}}/>

        {/* Body / Suit */}
        <div style={{position:'relative',width:`${160*c}px`,height:`${140*c}px`,animation:'nh-breathe 4s ease-in-out infinite'}}>
          <div style={{
            position:'absolute', inset:0,
            background:`linear-gradient(160deg,#0f0f0f 0%,#1a1a1a 50%,#0d0d0d 100%)`,
            borderRadius:`${16*c}px ${16*c}px ${8*c}px ${8*c}px`,
            boxShadow:`0 ${8*c}px ${24*c}px rgba(0,0,0,0.6),inset 0 ${1*c}px ${4*c}px rgba(255,255,255,0.05)`
          }}>
            {/* White shirt */}
            <div style={{position:'absolute',top:`${10*c}px`,left:`${54*c}px`,width:`${52*c}px`,height:`${90*c}px`,background:'linear-gradient(180deg,#e8e0d0,#d4c8b8)',borderRadius:`${4*c}px ${4*c}px 0 0`}}/>
            {/* Tie */}
            <div style={{
              position:'absolute',top:`${8*c}px`,left:`${74*c}px`,width:`${12*c}px`,height:`${70*c}px`,
              background:`linear-gradient(180deg,#8b1a1a,#c0392b,#8b1a1a)`,
              clipPath:'polygon(20% 0%,80% 0%,100% 60%,50% 100%,0% 60%)',
              animation:'nh-tie 3s ease-in-out infinite'
            }}/>
            {/* Pocket square */}
            <div style={{position:'absolute',top:`${18*c}px`,left:`${20*c}px`,width:`${18*c}px`,height:`${12*c}px`,background:`linear-gradient(135deg,rgba(245,200,66,0.8),rgba(245,200,66,0.4))`,borderRadius:`${2*c}px`,clipPath:'polygon(0 30%,50% 0%,100% 30%,100% 100%,0 100%)'}}/>
            {/* Left arm */}
            <div style={{position:'absolute',top:`${10*c}px`,left:`${-32*c}px`,width:`${36*c}px`,height:`${100*c}px`,background:'linear-gradient(180deg,#0f0f0f,#1a1a1a)',borderRadius:`${18*c}px`,transform:'rotate(8deg)',transformOrigin:'top center'}}>
              <div style={{position:'absolute',bottom:0,left:`${4*c}px`,right:`${4*c}px`,height:`${16*c}px`,background:'linear-gradient(180deg,#d4c8b8,#c0b4a0)',borderRadius:`${8*c}px`}}/>
            </div>
            {/* Right arm — writing arm */}
            <div style={{
              position:'absolute',top:`${10*c}px`,right:`${-32*c}px`,width:`${36*c}px`,height:`${100*c}px`,
              background:'linear-gradient(180deg,#0f0f0f,#1a1a1a)',
              borderRadius:`${18*c}px`,
              transform: writing?'rotate(-25deg)':'rotate(-8deg)',
              transformOrigin:'top center',
              animation: writing?'nh-write 0.8s ease-in-out infinite':'none',
              transition:'transform 0.5s'
            }}>
              <div style={{position:'absolute',bottom:0,left:`${4*c}px`,right:`${4*c}px`,height:`${16*c}px`,background:'linear-gradient(180deg,#d4c8b8,#c0b4a0)',borderRadius:`${8*c}px`}}/>
              {writing&&<div style={{position:'absolute',bottom:`${-12*c}px`,left:'50%',transform:'translateX(-50%) rotate(-15deg)',width:`${8*c}px`,height:`${20*c}px`,background:'linear-gradient(180deg,#f0f0e8,#e0e0d8)',borderRadius:`${2*c}px`,boxShadow:`0 0 ${4*c}px rgba(255,255,255,0.5)`}}/>}
            </div>
          </div>
        </div>

        {/* ID badge */}
        <div style={{marginTop:`${4*c}px`,padding:`${4*c}px ${10*c}px`,background:'rgba(245,200,66,0.08)',border:`1px solid rgba(245,200,66,0.3)`,borderRadius:`${20*c}px`,display:'flex',alignItems:'center',gap:`${6*c}px`}}>
          <div style={{width:`${6*c}px`,height:`${6*c}px`,borderRadius:'50%',background:'#f5c842',animation:'nh-glow 1.5s ease-in-out infinite'}}/>
          <span style={{fontSize:`${10*c}px`,color:'rgba(245,200,66,0.8)',fontFamily:'monospace',letterSpacing:'0.1em'}}>PROF. NOVA · AI</span>
        </div>

        {/* Speaking bars */}
        {speaking&&(
          <div style={{position:'absolute',bottom:`${-20*c}px`,left:'50%',transform:'translateX(-50%)',display:'flex',gap:`${3*c}px`,alignItems:'center',height:`${20*c}px`}}>
            {[4,8,14,20,26,20,14,8,4].map((h,i)=>(
              <div key={i} style={{width:`${3*c}px`,borderRadius:`${2*c}px`,background:'#f5c842',height:`${h*c}px`,animation:'nh-float 0.4s ease-in-out infinite',animationDelay:`${i*0.05}s`,opacity:0.8}}/>
            ))}
          </div>
        )}

        {/* Thinking particles */}
        {thinking&&[0,1,2].map(i=>(
          <div key={i} style={{
            position:'absolute',top:`${30*c}px`,left:`${(60+i*30)*c}px`,
            width:`${6*c}px`,height:`${6*c}px`,
            borderRadius:'50%',background:'rgba(167,139,250,0.8)',
            animation:`nh-particle 1.5s ease-out ${i*0.4}s infinite`,
            boxShadow:`0 0 ${6*c}px rgba(167,139,250,0.6)`
          }}/>
        ))}
      </div>
    </div>
  )
}
