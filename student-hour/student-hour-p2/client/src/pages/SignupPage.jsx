// SignupPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function SignupPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } }
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    navigate('/onboarding')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brown-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--yellow-500)', fontSize: 16, fontWeight: 700 }}>S</span>
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--brown-900)' }}>The Student Hour</span>
          </Link>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, color: 'var(--brown-900)', marginBottom: 8 }}>Create your account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Join thousands of students on their way back up</p>
        </div>
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            { label: 'Full name', key: 'fullName', type: 'text', placeholder: 'Your full name' },
            { label: 'Email address', key: 'email', type: 'email', placeholder: 'you@university.edu' },
            { label: 'Password', key: 'password', type: 'password', placeholder: 'At least 8 characters' }
          ].map(field => (
            <div key={field.key}>
              <label className="label">{field.label}</label>
              <input className="input-field" type={field.type} placeholder={field.placeholder}
                value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} required />
            </div>
          ))}
          {error && <p style={{ fontSize: 13, color: 'var(--color-text-danger, #c0392b)' }}>{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 15 }} disabled={loading}>
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
