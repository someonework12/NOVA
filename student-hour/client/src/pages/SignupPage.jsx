import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function SignupPage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Already logged in
  if (user && profile?.onboarding_complete) return <Navigate to="/dashboard" replace />
  if (user && !profile?.onboarding_complete) return <Navigate to="/onboarding" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); setLoading(false); return }

    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } }
    })
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/onboarding')
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
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--brown-900)', marginBottom: 6 }}>Create your account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Join students on their way back up</p>
        </div>
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { l: 'Full name', k: 'fullName', t: 'text', p: 'Your full name' },
            { l: 'Email address', k: 'email', t: 'email', p: 'you@university.edu' },
            { l: 'Password', k: 'password', t: 'password', p: 'At least 8 characters' }
          ].map(f => (
            <div key={f.k}>
              <label className="label">{f.l}</label>
              <input className="input-field" type={f.t} placeholder={f.p}
                value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} required />
            </div>
          ))}
          {error && <p style={{ fontSize: 13, color: '#c0392b', background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: 13 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--brown-600)', fontWeight: 500 }}>Log in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
