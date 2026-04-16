// AdminDashboard.jsx
import { useAuth } from '../hooks/useAuth.jsx'
export default function AdminDashboard() {
  const { signOut } = useAuth()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', padding: 40 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--brown-900)' }}>Admin Dashboard</h1>
          <button onClick={signOut} className="btn-outline" style={{ padding: '8px 20px', fontSize: 14 }}>Sign out</button>
        </div>
        <div className="card" style={{ background: 'var(--brown-100)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Admin panel — Phase 5. Generate tutor logins, assign tutors to groups, monitor platform activity.</p>
        </div>
      </div>
    </div>
  )
}
