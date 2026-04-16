import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function LoginPage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Already logged in — send to right place
  if (user && profile) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />
    if (profile.role === 'tutor') return <Navigate to="/tutor" replace />
    if (!profile.onboarding_complete) return <Navigate to="/onboarding" replace />
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword(form)
    if (err) { setError(err.message); setLoading(false); return }
    // Navigation handled by the redirect above once auth state updates
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brown-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--yellow-500)', fontSize: 16, fontWeight: 700 }}>S</span>
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--brown-900)' }}>The Student Hour</span>
          </Link>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--brown-900)', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Professor Nova has been waiting</p>
        </div>
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { l: 'Email address', k: 'email', t: 'email', p: 'you@university.edu' },
            { l: 'Password', k: 'password', t: 'password', p: 'Your password' }
          ].map(f => (
            <div key={f.k}>
              <label className="label">{f.l}</label>
              <input className="input-field" type={f.t} placeholder={f.p}
                value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} required />
            </div>
          ))}
          {error && <p style={{ fontSize: 13, color: '#c0392b', background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: 13 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
            New here? <Link to="/signup" style={{ color: 'var(--brown-600)', fontWeight: 500 }}>Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
