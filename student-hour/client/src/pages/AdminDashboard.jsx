import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'

const apiBase = import.meta.env.VITE_API_URL || ''

async function apiFetch(path, method = 'GET', body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: body ? JSON.stringify(body) : undefined
  })
  return res.json()
}

function AdminSidebar({ active, setActive, firstName, signOut, onClose }) {
  const items = [
    { id: 'overview', label: 'Overview', icon: '📈' },
    { id: 'tutors', label: 'Manage Tutors', icon: '👥' },
    { id: 'groups', label: 'Groups & Assignment', icon: '🗂️' },
    { id: 'grouping', label: 'Run AI Grouping', icon: '✦' },
  ]
  return (
    <>
      <div style={{ padding: '24px 20px 16px' }}>
        <div style={{ fontSize: 10, color: 'var(--yellow-400)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin Panel</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{firstName}</div>
      </div>
      <nav style={{ flex: 1, padding: '0 10px' }}>
        {items.map(item => (
          <button key={item.id} onClick={() => { setActive(item.id); onClose?.() }} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
            padding: '11px 12px', borderRadius: 'var(--radius-md)', fontSize: 14, cursor: 'pointer',
            border: 'none', marginBottom: 2, fontFamily: 'var(--font-sans)',
            background: active === item.id ? 'rgba(245,200,66,0.15)' : 'transparent',
            color: active === item.id ? 'var(--yellow-400)' : 'rgba(255,255,255,0.55)',
          }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: '10px 10px 24px' }}>
        <button onClick={signOut} style={{ width: '100%', padding: '10px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 'var(--radius-md)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}>Sign out</button>
      </div>
    </>
  )
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [active, setActive] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState({})
  const firstName = profile?.full_name?.split(' ')[0] || 'Admin'

  useEffect(() => { apiFetch('/api/admin/overview').then(d => setStats(d)) }, [])

  const titles = { overview: 'Overview', tutors: 'Manage Tutors', groups: 'Groups & Assignment', grouping: 'AI Grouping' }

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ background: 'var(--brown-900)' }}>
        <AdminSidebar active={active} setActive={setActive} firstName={firstName} signOut={signOut} onClose={() => setSidebarOpen(false)} />
      </aside>

      <main className="app-main">
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', flexShrink: 0 }}>
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)' }}>{titles[active]}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
          {active === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
                {[['Students', stats.studentCount],['Groups', stats.groupCount],['Tutors', stats.tutorCount]].map(([l,v]) => (
                  <div key={l} className="card" style={{ textAlign: 'center', padding: '20px 12px' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,6vw,44px)', fontWeight: 700, color: 'var(--yellow-500)', lineHeight: 1 }}>{v ?? '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ background: 'var(--brown-50)' }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  Use the sidebar to manage tutors, assign them to groups, and run the AI grouping engine on newly onboarded students.
                </p>
              </div>
            </div>
          )}
          {active === 'tutors' && <TutorManager />}
          {active === 'groups' && <GroupManager />}
          {active === 'grouping' && <AIGroupingPanel />}
        </div>
      </main>
    </div>
  )
}

function TutorManager() {
  const [form, setForm] = useState({ fullName: '', email: '' })
  const [status, setStatus] = useState(null)
  const [tutors, setTutors] = useState([])

  useEffect(() => { apiFetch('/api/admin/tutors').then(d => setTutors(d.tutors || [])) }, [])

  async function createTutor(e) {
    e.preventDefault(); setStatus({ loading: true })
    const data = await apiFetch('/api/admin/create-tutor', 'POST', form)
    if (data.tutor) { setStatus({ success: true, tutor: data.tutor }); setForm({ fullName: '', email: '' }); setTutors(p => [...p, data.tutor]) }
    else setStatus({ error: data.error })
  }

  return (
    <div>
      <form onSubmit={createTutor} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>Tutors don't sign up. You generate their credentials here and share them directly.</p>
        <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label">Full name</label>
            <input className="input-field" placeholder="Tutor's full name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input-field" type="email" placeholder="tutor@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
        </div>
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: 12 }} disabled={status?.loading}>
          {status?.loading ? 'Creating...' : 'Generate tutor login'}
        </button>
        {status?.success && (
          <div style={{ background: 'var(--yellow-50)', border: '1px solid var(--yellow-300)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)', marginBottom: 6 }}>Tutor created!</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Email: <strong>{status.tutor.email}</strong></div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Temp password: <code style={{ background: 'var(--brown-100)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>{status.tutor.tempPassword}</code></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Share these credentials directly. Tutor should change password on first login.</div>
          </div>
        )}
        {status?.error && <p style={{ fontSize: 13, color: '#c0392b' }}>{status.error}</p>}
      </form>
      <h3 style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)', marginBottom: 12 }}>All tutors ({tutors.length})</h3>
      {tutors.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
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
    apiFetch('/api/admin/groups').then(d => setGroups(d.groups || []))
    apiFetch('/api/admin/tutors').then(d => setTutors(d.tutors || []))
  }, [])

  async function assign(groupId, tutorId) {
    setStatus(p => ({ ...p, [groupId]: 'Assigning...' }))
    const data = await apiFetch('/api/admin/assign-tutor', 'POST', { groupId, tutorId })
    setStatus(p => ({ ...p, [groupId]: data.success ? 'Assigned!' : 'Error' }))
  }

  return (
    <div>
      {groups.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No groups yet. Run AI grouping first.</p>
        : groups.map(g => {
          const assignedTutor = g.tutor_assignments?.[0]?.profiles?.full_name
          return (
            <div key={g.id} className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{g.focus}</div>
                </div>
                {assignedTutor ? <span className="badge badge-yellow" style={{ flexShrink: 0, fontSize: 11 }}>{assignedTutor}</span>
                  : <span className="badge badge-brown" style={{ flexShrink: 0, fontSize: 11 }}>No tutor</span>}
              </div>
              {g.shared_courses?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {g.shared_courses.map(c => <span key={c} className="badge badge-brown" style={{ fontSize: 10 }}>{c}</span>)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select onChange={e => setAssigning(p => ({ ...p, [g.id]: e.target.value }))}
                  style={{ flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', background: '#fff' }}>
                  <option value="">Select tutor...</option>
                  {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}
                  onClick={() => assign(g.id, assigning[g.id])} disabled={!assigning[g.id]}>Assign</button>
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

  async function run() {
    setLoading(true)
    const data = await apiFetch('/api/grouping/run', 'POST')
    setResult(data); setLoading(false)
  }

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>
        Groups all students who have completed onboarding but haven't been assigned to a group yet. Students are matched by shared course codes and similar weaknesses into cohorts of 3–5.
      </p>
      <button className="btn-accent" style={{ padding: '14px 28px', fontSize: 15, width: '100%' }} onClick={run} disabled={loading}>
        {loading ? 'Running AI grouping...' : 'Run AI grouping now'}
      </button>
      {result && (
        <div style={{ marginTop: 20, background: result.error ? 'var(--brown-50)' : 'var(--yellow-50)', border: `1px solid ${result.error ? 'var(--border)' : 'var(--yellow-300)'}`, borderRadius: 'var(--radius-lg)', padding: 18 }}>
          {result.error ? <p style={{ color: '#c0392b', fontSize: 14 }}>{result.error}</p>
          : <>
            <div style={{ fontWeight: 600, color: 'var(--brown-900)', marginBottom: 8 }}>Grouping complete!</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Groups created: <strong>{result.groupsCreated}</strong></div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Students grouped: <strong>{result.studentsGrouped}</strong></div>
          </>}
        </div>
      )}
    </div>
  )
}
