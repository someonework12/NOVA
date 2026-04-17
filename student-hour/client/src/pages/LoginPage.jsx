import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword(form)
    if (err) { setError(err.message); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role === 'admin') navigate('/admin')
    else if (profile?.role === 'tutor') navigate('/tutor')
    else navigate('/dashboard')
  }

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
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--brown-900)', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Professor Nova has been waiting</p>
        </div>
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[{l:'Email',k:'email',t:'email',p:'you@university.edu'},{l:'Password',k:'password',t:'password',p:'Your password'}].map(f=>(
            <div key={f.k}>
              <label className="label">{f.l}</label>
              <input className="input-field" type={f.t} placeholder={f.p} value={form[f.k]}
                onChange={e=>setForm({...form,[f.k]:e.target.value})} required />
            </div>
          ))}
          {error && <p style={{ fontSize: 13, color: '#c0392b' }}>{error}</p>}
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
