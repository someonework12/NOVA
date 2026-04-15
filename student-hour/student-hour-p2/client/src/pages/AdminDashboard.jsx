import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'

async function apiCall(path, method = 'GET', body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: body ? JSON.stringify(body) : undefined
  })
  return res.json()
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [active, setActive] = useState('overview')
  const [stats, setStats] = useState({})

  useEffect(() => {
    apiCall('/api/admin/overview').then(data => setStats(data))
  }, [])

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'tutors', label: 'Manage Tutors' },
    { id: 'groups', label: 'Groups & Assignment' },
    { id: 'grouping', label: 'Run AI Grouping' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: 240, background: 'var(--brown-900)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
        <div style={{ padding: '28px 24px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--yellow-400)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{profile?.full_name?.split(' ')[0] || 'Admin'}</div>
        </div>
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActive(item.id)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px',
              borderRadius: 'var(--radius-md)', fontSize: 14, cursor: 'pointer', border: 'none',
              background: active === item.id ? 'rgba(245,200,66,0.15)' : 'transparent',
              color: active === item.id ? 'var(--yellow-400)' : 'rgba(255,255,255,0.55)',
              marginBottom: 2, fontFamily: 'var(--font-sans)'
            }}>{item.label}</button>
          ))}
        </nav>
        <div style={{ padding: '12px 12px 24px' }}>
          <button onClick={signOut} style={{ width: '100%', padding: '10px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 'var(--radius-md)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}>Sign out</button>
        </div>
      </div>

      <main style={{ flex: 1, overflow: 'auto', background: 'var(--surface)', padding: '28px 36px' }}>
        {active === 'overview' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--brown-900)', marginBottom: 28 }}>Platform Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
              {[
                { label: 'Total students', value: stats.studentCount ?? '—' },
                { label: 'Active groups', value: stats.groupCount ?? '—' },
                { label: 'Tutors', value: stats.tutorCount ?? '—' },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 700, color: 'var(--yellow-500)', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {active === 'tutors' && <TutorManager />}
        {active === 'groups' && <GroupManager />}
        {active === 'grouping' && <AIGroupingPanel />}
      </main>
    </div>
  )
}

function TutorManager() {
  const [form, setForm] = useState({ fullName: '', email: '' })
  const [status, setStatus] = useState(null)
  const [tutors, setTutors] = useState([])

  useEffect(() => { apiCall('/api/admin/tutors').then(d => setTutors(d.tutors || [])) }, [])

  async function createTutor(e) {
    e.preventDefault()
    setStatus({ loading: true })
    const data = await apiCall('/api/admin/create-tutor', 'POST', form)
    if (data.tutor) {
      setStatus({ success: true, tutor: data.tutor })
      setForm({ fullName: '', email: '' })
      setTutors(prev => [...prev, data.tutor])
    } else {
      setStatus({ error: data.error })
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--brown-900)', marginBottom: 24 }}>Generate Tutor Login</h2>
      <form onSubmit={createTutor} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>Tutors do not sign up themselves. You generate their credentials here and share them directly.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">Full name</label>
            <input className="input-field" placeholder="Tutor's full name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input-field" type="email" placeholder="tutor@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
        </div>
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={status?.loading}>
          {status?.loading ? 'Creating...' : 'Generate tutor login'}
        </button>
        {status?.success && (
          <div style={{ background: 'var(--yellow-50)', border: '1px solid var(--yellow-300)', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)', marginBottom: 8 }}>Tutor created!</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Email: <strong>{status.tutor.email}</strong></div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Temp password: <strong style={{ fontFamily: 'monospace', background: 'var(--brown-100)', padding: '2px 6px', borderRadius: 4 }}>{status.tutor.tempPassword}</strong></div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Share these credentials directly. The tutor should change their password on first login.</div>
          </div>
        )}
        {status?.error && <p style={{ fontSize: 13, color: '#c0392b' }}>{status.error}</p>}
      </form>

      <h3 style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)', marginBottom: 14 }}>All tutors ({tutors.length})</h3>
      {tutors.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{t.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.email}</div>
          </div>
          <span className="badge badge-brown">Tutor</span>
        </div>
      ))}
    </div>
  )
}

function GroupManager() {
  const [groups, setGroups] = useState([])
  const [tutors, setTutors] = useState([])
  const [assigning, setAssigning] = useState({})
  const [status, setStatus] = useState({})

  useEffect(() => {
    apiCall('/api/admin/groups').then(d => setGroups(d.groups || []))
    apiCall('/api/admin/tutors').then(d => setTutors(d.tutors || []))
  }, [])

  async function assign(groupId, tutorId) {
    setStatus(prev => ({ ...prev, [groupId]: 'Assigning...' }))
    const data = await apiCall('/api/admin/assign-tutor', 'POST', { groupId, tutorId })
    setStatus(prev => ({ ...prev, [groupId]: data.success ? 'Assigned!' : 'Error' }))
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--brown-900)', marginBottom: 24 }}>Groups & Tutor Assignment</h2>
      {groups.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No groups yet. Run the AI grouping first.</p>
        : groups.map(g => {
          const assignedTutor = g.tutor_assignments?.[0]?.profiles?.full_name
          return (
            <div key={g.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)' }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{g.focus}</div>
                </div>
                {assignedTutor
                  ? <span className="badge badge-yellow">Tutor: {assignedTutor}</span>
                  : <span className="badge badge-brown">No tutor</span>}
              </div>
              {g.shared_courses?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {g.shared_courses.map(c => <span key={c} className="badge badge-brown" style={{ fontSize: 11 }}>{c}</span>)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select onChange={e => setAssigning(prev => ({ ...prev, [g.id]: e.target.value }))}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', background: '#fff' }}>
                  <option value="">Select tutor...</option>
                  {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <button className="btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}
                  onClick={() => assign(g.id, assigning[g.id])} disabled={!assigning[g.id]}>
                  Assign
                </button>
                {status[g.id] && <span style={{ fontSize: 12, color: 'var(--brown-600)' }}>{status[g.id]}</span>}
              </div>
            </div>
          )
        })}
    </div>
  )
}

function AIGroupingPanel() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function runGrouping() {
    setLoading(true)
    const data = await apiCall('/api/grouping/run', 'POST')
    setResult(data)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--brown-900)', marginBottom: 12 }}>AI Grouping Engine</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 28 }}>
        This runs the Groq AI grouping engine on all students who have completed onboarding but have not yet been assigned to a group. Students are grouped by shared course codes and similar weaknesses into cohorts of 3–5.
      </p>
      <button className="btn-accent" style={{ padding: '14px 32px', fontSize: 15 }} onClick={runGrouping} disabled={loading}>
        {loading ? 'Running AI grouping...' : 'Run AI grouping now'}
      </button>
      {result && (
        <div style={{ marginTop: 24, background: result.error ? 'var(--brown-100)' : 'var(--yellow-50)', border: `1px solid ${result.error ? 'var(--border)' : 'var(--yellow-300)'}`, borderRadius: 'var(--radius-lg)', padding: 20 }}>
          {result.error
            ? <p style={{ color: '#c0392b', fontSize: 14 }}>{result.error}</p>
            : <>
              <div style={{ fontWeight: 600, color: 'var(--brown-900)', marginBottom: 8 }}>Grouping complete</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Groups created: {result.groupsCreated}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Students grouped: {result.studentsGrouped}</div>
            </>}
        </div>
      )}
    </div>
  )
}
