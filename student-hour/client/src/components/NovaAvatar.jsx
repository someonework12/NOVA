export default function NovaAvatar({ state = 'idle' }) {
  const isThinking = state === 'thinking'
  const isSpeaking = state === 'speaking'

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 280, aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes npulse { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes nspin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes nbob   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes nmouth { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.6)} }
        @keyframes nring  { 0%{transform:rotate(0deg) scale(1)} 50%{transform:rotate(180deg) scale(1.05)} 100%{transform:rotate(360deg) scale(1)} }
      `}</style>

      {/* Outer glow */}
      <div style={{
        position: 'absolute', width: '90%', height: '90%', borderRadius: '50%',
        background: isSpeaking
          ? 'radial-gradient(circle,rgba(245,200,66,0.25) 0%,transparent 70%)'
          : isThinking
          ? 'radial-gradient(circle,rgba(139,94,60,0.3) 0%,transparent 70%)'
          : 'radial-gradient(circle,rgba(245,200,66,0.1) 0%,transparent 70%)',
        transition: 'background 1s',
        animation: state !== 'idle' ? 'npulse 2s ease-in-out infinite' : 'none'
      }} />

      {/* Spinning ring — thinking only */}
      {isThinking && (
        <div style={{
          position: 'absolute', width: '85%', height: '85%', borderRadius: '50%',
          border: '2px dashed rgba(245,200,66,0.4)',
          animation: 'nspin 3s linear infinite'
        }} />
      )}

      {/* Main avatar body */}
      <div style={{
        width: '68%', height: '68%',
        animation: 'nbob 3s ease-in-out infinite',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative'
      }}>
        {/* Head circle */}
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: 'linear-gradient(135deg, #F5C842 0%, #e8a800 100%)',
          boxShadow: isSpeaking
            ? '0 0 32px rgba(245,200,66,0.6), 0 8px 24px rgba(0,0,0,0.3)'
            : '0 8px 24px rgba(0,0,0,0.3)',
          transition: 'box-shadow 0.5s',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Letter N */}
          <div style={{
            fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 800,
            color: '#3B1F0E', lineHeight: 1, userSelect: 'none',
            textShadow: '0 2px 4px rgba(0,0,0,0.15)'
          }}>N</div>

          {/* Mouth — animates when speaking */}
          <div style={{
            width: 28, height: 6, borderRadius: 3,
            background: 'rgba(58,31,14,0.5)',
            animation: isSpeaking ? 'nmouth 0.4s ease-in-out infinite' : 'none',
            transition: 'all 0.3s',
            transformOrigin: 'center'
          }} />
        </div>

        {/* Orbiting dot — speaking indicator */}
        {isSpeaking && (
          <div style={{
            position: 'absolute', width: 12, height: 12, borderRadius: '50%',
            background: '#22c55e', top: '5%', right: '5%',
            animation: 'npulse 0.8s ease-in-out infinite'
          }} />
        )}
      </div>

      {/* State pill */}
      <div style={{
        position: 'absolute', bottom: '2%', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        borderRadius: 999, padding: '5px 14px',
        display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap'
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: isSpeaking ? '#22c55e' : isThinking ? '#F5C842' : 'rgba(255,255,255,0.3)',
          transition: 'background 0.3s',
          animation: state !== 'idle' ? 'npulse 1.5s ease-in-out infinite' : 'none'
        }} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {isSpeaking ? 'Speaking' : isThinking ? 'Thinking' : 'Nova'}
        </span>
      </div>
    </div>
  )
}
