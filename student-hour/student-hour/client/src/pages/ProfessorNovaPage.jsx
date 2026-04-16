import { useAuth } from '../hooks/useAuth.jsx'
import { Link } from 'react-router-dom'

export default function ProfessorNovaPage() {
  const { profile } = useAuth()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--brown-900)', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 36, fontWeight: 700, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)' }}>N</span>
      </div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: '#fff', marginBottom: 12 }}>Professor Nova</h1>
      <p style={{ color: 'var(--brown-300)', fontSize: 16, marginBottom: 8 }}>
        {profile?.full_name ? `Hello, ${profile.full_name.split(' ')[0]}. I'm almost ready.` : 'Almost ready.'}
      </p>
      <p style={{ color: 'var(--brown-400)', fontSize: 14, marginBottom: 32, textAlign: 'center', maxWidth: 400 }}>
        Professor Nova's full interface — animated presence, classroom mode, personal tutoring — is coming in Phase 4. The foundation is being laid right now.
      </p>
      <Link to="/dashboard" className="btn-accent">Back to dashboard</Link>
    </div>
  )
}
