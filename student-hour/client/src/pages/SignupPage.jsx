// SignupPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

function AuthShell({ children, title, subtitle }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brown-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--yellow-500)', fontSize: 16, fontWeight: 700 }}>S</span>
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--brown-900)' }}>The Student Hour</span>
          </Link>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--brown-900)', marginBottom: 6 }}>{title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function SignupPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.fullName } }
    })
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/onboarding')
  }

  return (
    <AuthShell title="Create your account" subtitle="Join students on their way back up">
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {[{l:'Full name',k:'fullName',t:'text',p:'Your full name'},{l:'Email address',k:'email',t:'email',p:'you@university.edu'},{l:'Password',k:'password',t:'password',p:'At least 8 characters'}].map(f=>(
          <div key={f.k}>
            <label className="label">{f.l}</label>
            <input className="input-field" type={f.t} placeholder={f.p} value={form[f.k]}
              onChange={e=>setForm({...form,[f.k]:e.target.value})} required />
          </div>
        ))}
        {error && <p style={{ fontSize: 13, color: '#c0392b' }}>{error}</p>}
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: 13 }} disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--brown-600)', fontWeight: 500 }}>Log in</Link>
        </p>
      </form>
    </AuthShell>
  )
}
