// StudentDashboard.jsx
import { useAuth } from '../hooks/useAuth.jsx'
import { Link } from 'react-router-dom'

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', padding: 40 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--brown-900)' }}>
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <button onClick={signOut} className="btn-outline" style={{ padding: '8px 20px', fontSize: 14 }}>Sign out</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { title: 'My group chat', desc: 'Chat with your study group and mentor', link: '/dashboard', color: 'var(--brown-100)' },
            { title: 'Professor Nova', desc: 'Your personal AI tutor is ready', link: '/dashboard/nova', color: 'var(--yellow-100)' },
            { title: 'Reading schedule', desc: 'Your study plan for this week', link: '/dashboard', color: 'var(--brown-50)' },
          ].map(item => (
            <Link to={item.link} key={item.title} className="card" style={{ background: item.color, textDecoration: 'none', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <h3 style={{ fontWeight: 600, fontSize: 16, color: 'var(--brown-900)', marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{item.desc}</p>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 32, padding: 24, background: 'var(--brown-900)', borderRadius: 'var(--radius-lg)', color: '#fff' }}>
          <p style={{ fontSize: 14, color: 'var(--brown-300)', marginBottom: 8 }}>Student dashboard is being built — Phase 3 is next.</p>
          <p style={{ fontSize: 13, color: 'var(--brown-400)' }}>Group chat, tasks, resources and full Professor Nova integration coming in the next phases.</p>
        </div>
      </div>
    </div>
  )
}
