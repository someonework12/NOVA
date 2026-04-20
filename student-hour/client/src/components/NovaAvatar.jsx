// Next-gen Professor Nova avatar — premium 3D-style CSS design
export default function NovaAvatar({ state = 'idle', size = 'md' }) {
  const thinking = state === 'thinking'
  const speaking = state === 'speaking'
  const awake = state === 'awake'
  const active = speaking || thinking || awake

  const dim = size === 'sm' ? 80 : size === 'lg' ? 160 : 120

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, userSelect: 'none' }}>
      <style>{`
        @keyframes nova-float { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-10px) rotate(1deg)} }
        @keyframes nova-think { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-4px) rotate(2deg)} }
        @keyframes nova-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.92)} }
        @keyframes nova-speak-mouth { 0%,100%{height:6px;border-radius:0 0 20px 20px} 50%{height:16px;border-radius:0 0 30px 30px} }
        @keyframes nova-ring-expand { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(1.8);opacity:0} }
        @keyframes nova-orbit { from{transform:rotate(0deg) translateX(${dim * 0.55}px) rotate(0deg)} to{transform:rotate(360deg) translateX(${dim * 0.55}px) rotate(-360deg)} }
        @keyframes nova-orbit-rev { from{transform:rotate(0deg) translateX(${dim * 0.62}px) rotate(0deg)} to{transform:rotate(-360deg) translateX(${dim * 0.62}px) rotate(360deg)} }
        @keyframes nova-glow-pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.9;transform:scale(1.1)} }
        @keyframes nova-wave { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        @keyframes nova-scanline { 0%{top:0} 100%{top:100%} }
      `}</style>

      <div style={{ position: 'relative', width: dim, height: dim }}>

        {/* Outer glow halo */}
        <div style={{
          position: 'absolute', inset: -dim * 0.15, borderRadius: '50%',
          background: speaking
            ? `radial-gradient(circle, rgba(245,200,66,0.25) 0%, transparent 70%)`
            : awake
            ? `radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)`
            : thinking
            ? `radial-gradient(circle, rgba(139,94,60,0.2) 0%, transparent 70%)`
            : `radial-gradient(circle, rgba(245,200,66,0.06) 0%, transparent 70%)`,
          animation: active ? 'nova-glow-pulse 1.6s ease-in-out infinite' : 'none',
          transition: 'background 0.8s', pointerEvents: 'none'
        }} />

        {/* Expanding ring when speaking/awake */}
        {(speaking || awake) && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `2px solid ${speaking ? 'rgba(245,200,66,0.6)' : 'rgba(167,139,250,0.6)'}`,
            animation: 'nova-ring-expand 1.5s ease-out infinite'
          }} />
        )}

        {/* Orbit dot 1 */}
        {active && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: speaking ? '#f5c842' : '#a78bfa',
              animation: 'nova-orbit 3s linear infinite',
              boxShadow: `0 0 8px ${speaking ? '#f5c842' : '#a78bfa'}`
            }} />
          </div>
        )}

        {/* Orbit dot 2 */}
        {active && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>
            <div style={{
              width: 4, height: 4, borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              animation: 'nova-orbit-rev 4.5s linear infinite',
            }} />
          </div>
        )}

        {/* Main sphere — the face */}
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: speaking
            ? 'radial-gradient(circle at 35% 35%, #ffe87a, #f5c842 45%, #c8941a 80%, #8b5e00)'
            : awake
            ? 'radial-gradient(circle at 35% 35%, #d4b8ff, #a78bfa 45%, #7c3aed 80%, #4c1d95)'
            : thinking
            ? 'radial-gradient(circle at 35% 35%, #d4956a, #8b5e3c 45%, #5a3a20 80%, #2a1a0a)'
            : 'radial-gradient(circle at 35% 35%, #888, #444 45%, #222 80%, #111)',
          boxShadow: speaking
            ? '0 8px 32px rgba(245,200,66,0.5), inset 0 -4px 12px rgba(0,0,0,0.3)'
            : awake
            ? '0 8px 32px rgba(167,139,250,0.5), inset 0 -4px 12px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(0,0,0,0.5), inset 0 -4px 12px rgba(0,0,0,0.4)',
          animation: thinking
            ? 'nova-think 0.8s ease-in-out infinite'
            : 'nova-float 4s ease-in-out infinite',
          transition: 'background 0.6s, box-shadow 0.6s',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: dim * 0.07,
          position: 'relative', overflow: 'hidden'
        }}>

          {/* Scanline overlay for tech feel */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)',
            pointerEvents: 'none'
          }} />

          {/* Shine highlight */}
          <div style={{
            position: 'absolute', top: '12%', left: '20%',
            width: '35%', height: '25%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none'
          }} />

          {/* Eyes */}
          <div style={{ display: 'flex', gap: dim * 0.15, marginTop: dim * 0.06, position: 'relative', zIndex: 1 }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                width: dim * 0.1, height: thinking ? dim * 0.05 : dim * 0.1,
                borderRadius: '50%',
                background: speaking || awake ? '#fff' : 'rgba(255,255,255,0.85)',
                boxShadow: (speaking || awake) ? `0 0 ${dim * 0.08}px rgba(255,255,255,0.8)` : 'none',
                animation: thinking ? `nova-pulse 1s ${i * 0.15}s ease-in-out infinite` : 'none',
                transition: 'height 0.3s, box-shadow 0.3s'
              }} />
            ))}
          </div>

          {/* Mouth */}
          <div style={{
            width: dim * (speaking ? 0.22 : 0.14),
            height: dim * (speaking ? 0.1 : 0.05),
            borderRadius: speaking ? '0 0 30px 30px' : '0 0 8px 8px',
            background: speaking || awake ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
            animation: speaking ? 'nova-speak-mouth 0.35s ease-in-out infinite' : 'none',
            transition: 'all 0.3s', position: 'relative', zIndex: 1,
            marginBottom: dim * 0.06
          }} />
        </div>

        {/* "N" badge */}
        <div style={{
          position: 'absolute', bottom: dim * 0.02, right: dim * 0.02,
          width: dim * 0.25, height: dim * 0.25, borderRadius: '50%',
          background: speaking ? '#3B1F0E' : awake ? '#4c1d95' : '#1a1a1a',
          border: `2px solid ${speaking ? '#f5c842' : awake ? '#a78bfa' : 'rgba(255,255,255,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.4s'
        }}>
          <span style={{
            fontSize: dim * 0.12, fontWeight: 700, fontFamily: 'serif',
            color: speaking ? '#f5c842' : awake ? '#a78bfa' : 'rgba(255,255,255,0.6)'
          }}>N</span>
        </div>
      </div>

      {/* Sound wave bars — only when speaking */}
      {speaking && (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 20 }}>
          {[2, 4, 7, 10, 14, 10, 7, 4, 2].map((h, i) => (
            <div key={i} style={{
              width: 3, borderRadius: 2, background: '#f5c842',
              height: h, opacity: 0.85,
              animation: 'nova-wave 0.5s ease-in-out infinite',
              animationDelay: i * 0.06 + 's'
            }} />
          ))}
        </div>
      )}

      {/* Status label */}
      <div style={{
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        borderRadius: 99, padding: '4px 12px',
        border: `1px solid ${speaking ? 'rgba(245,200,66,0.3)' : awake ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
        display: 'flex', alignItems: 'center', gap: 6, transition: 'border-color 0.4s'
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: speaking ? '#22c55e' : awake ? '#a78bfa' : thinking ? '#f5c842' : 'rgba(255,255,255,0.25)',
          transition: 'background 0.3s',
          animation: active ? 'nova-pulse 1.4s ease-in-out infinite' : 'none'
        }} />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'sans-serif' }}>
          {speaking ? 'Speaking' : awake ? 'Listening' : thinking ? 'Thinking' : 'Nova'}
        </span>
      </div>
    </div>
  )
}
