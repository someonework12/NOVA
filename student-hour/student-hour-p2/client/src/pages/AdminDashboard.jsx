import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview',          icon: '⬡' },
  { id: 'tutors',   label: 'Manage Tutors',      icon: '👤' },
  { id: 'groups',   label: 'Groups',             icon: '◈' },
  { id: 'grouping', label: 'AI Grouping',        icon: '✦' },
]

function Sidebar({ active, setActive, name, signOut, collapsed, setCollapsed }) {
  return (
    <>
      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="sidebar-overlay"
          onClick={() => setCollapsed(true)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 149, display: 'none' }}
        />
      )}

      <div style={{
        width: collapsed ? 0 : 260,
        minWidth: collapsed ? 0 : 260,
        background: 'linear-gradient(180deg, #1a0f08 0%, #2d1a0e 100%)',
        display: 'flex', flexDirection: 'column',
        height: '100vh', flexShrink: 0,
        transition: 'width 0.3s, min-width 0.3s',
        overflow: 'hidden', position: 'relative', zIndex: 150,
        boxShadow: '4px 0 32px rgba(0,0,0,0.3)'
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,var(--yellow-500),#e8a800)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--brown-900)' }}>S</span>
              </div>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap' }}>Student Hour</span>
            </Link>
            <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}>✕</button>
          </div>
          <div style={{
            background: 'rgba(245,200,66,0.08)', borderRadius: 12, padding: '10px 14px',
            border: '1px solid rgba(245,200,66,0.15)'
          }}>
            <div style={{ fontSize: 10, color: 'var(--yellow-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Admin Panel</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{name}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActive(item.id); setCollapsed(true) }} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '11px 14px', borderRadius: 12, fontSize: 14, cursor: 'pointer', border: 'none',
              background: active === item.id
                ? 'linear-gradient(135deg,rgba(245,200,66,0.2),rgba(245,200,66,0.08))'
                : 'transparent',
              color: active === item.id ? 'var(--yellow-400)' : 'rgba(255,255,255,0.55)',
              marginBottom: 3, fontFamily: 'var(--font-sans)',
              borderLeft: active === item.id ? '2px solid var(--yellow-500)' : '2px solid transparent',
              transition: 'all 0.15s', textAlign: 'left'
            }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '12px 12px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none', marginBottom: 4, transition: 'color 0.15s'
          }}>
            <span>←</span> <span>Back to home</span>
          </Link>
          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
            fontSize: 13, background: 'rgba(255,255,255,0.04)', border: 'none',
            borderRadius: 10, color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', textAlign: 'left'
          }}>
            <span>⏏</span> <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [active, setActive] = useState('overview')
  const [stats, setStats] = useState({})
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    apiCall('/api/admin/overview').then(data => setStats(data))
    // Auto-open sidebar on desktop
    if (window.innerWidth >= 768) setCollapsed(false)
  }, [])

  const name = profile?.full_name?.split(' ')[0] || 'Admin'
  const activeLabel = NAV_ITEMS.find(i => i.id === active)?.label || ''

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f0ebe4' }}>
      <Sidebar active={active} setActive={setActive} name={name} signOut={signOut} collapsed={collapsed} setCollapsed={setCollapsed} />

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          padding: '0 clamp(16px,3vw,32px)', height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'rgba(253,250,247,0.9)',
          backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-soft)',
          position: 'sticky', top: 0, zIndex: 50, flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setCollapsed(!collapsed)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              display: 'flex', flexDirection: 'column', gap: 4
            }}>
              <span style={{ display: 'block', width: 20, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 20, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 14, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)' }}>{activeLabel}</span>
          </div>
          <Link to="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Home</Link>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 'clamp(16px,3vw,32px)' }}>
          {active === 'overview' && <OverviewPanel stats={stats} />}
          {active === 'tutors'   && <TutorManager />}
          {active === 'groups'   && <GroupManager />}
          {active === 'grouping' && <AIGroupingPanel />}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </div>
  )
}

function GlassCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 4px 24px rgba(58,31,14,0.08)',
      ...style
    }}>
      {children}
    </div>
  )
}

function OverviewPanel({ stats }) {
  const cards = [
    { label: 'Total students', value: stats.studentCount ?? '—', icon: '🎓', grad: 'linear-gradient(135deg,#7A3D14,#3B1F0E)' },
    { label: 'Active groups',  value: stats.groupCount  ?? '—', icon: '◈',  grad: 'linear-gradient(135deg,#F5C842,#e8a800)' },
    { label: 'Tutors',         value: stats.tutorCount  ?? '—', icon: '👤', grad: 'linear-gradient(135deg,#5C2E10,#2d1a0e)' },
  ]
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px,3vw,28px)', color: 'var(--brown-900)', marginBottom: 24, fontWeight: 700 }}>Platform Overview</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: c.grad, borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 42, fontWeight: 800, color: c.label === 'Active groups' ? 'var(--brown-900)' : 'var(--yellow-400)', lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: c.label === 'Active groups' ? 'rgba(58,31,14,0.7)' : 'rgba(255,255,255,0.6)', marginTop: 6, fontWeight: 500 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <GlassCard style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          Welcome to the admin panel. Use the sidebar to manage tutors, assign groups, and run the AI grouping engine. All data is live from Supabase.
        </div>
      </GlassCard>
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
    if (data.tutor) { setStatus({ success: true, tutor: data.tutor }); setForm({ fullName: '', email: '' }); setTutors(prev => [...prev, data.tutor]) }
    else setStatus({ error: data.error })
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--brown-900)', marginBottom: 20, fontWeight: 700 }}>Manage Tutors</h2>

      <GlassCard style={{ padding: '24px', marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--brown-900)', marginBottom: 6 }}>Generate Tutor Login</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 18 }}>Tutors don't sign up themselves — you create their credentials here and share directly.</p>
        <form onSubmit={createTutor} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <div>
              <label className="label">Full name</label>
              <input className="input-field" placeholder="Tutor's full name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field" type="email" placeholder="tutor@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <button type="submit" style={{
            padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg,var(--brown-700),var(--brown-900))',
            color: '#fff', border: 'none', cursor: 'pointer'
          }} disabled={status?.loading}>
            {status?.loading ? 'Creating...' : '+ Generate tutor login'}
          </button>
          {status?.success && (
            <div style={{ background: 'linear-gradient(135deg,rgba(245,200,66,0.15),rgba(245,200,66,0.05))', border: '1px solid var(--yellow-300)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--brown-900)', marginBottom: 8 }}>✓ Tutor created!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Email: <strong>{status.tutor.email}</strong></div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Temp password: <code style={{ background: 'var(--brown-100)', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{status.tutor.tempPassword}</code></div>
            </div>
          )}
          {status?.error && <p style={{ fontSize: 13, color: '#c0392b' }}>{status.error}</p>}
        </form>
      </GlassCard>

      <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--brown-700)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>All tutors ({tutors.length})</h3>
      {tutors.map(t => (
        <GlassCard key={t.id} style={{ marginBottom: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{t.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.email}</div>
          </div>
          <span style={{ background: 'var(--brown-100)', color: 'var(--brown-800)', padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Tutor</span>
        </GlassCard>
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
    setStatus(prev => ({ ...prev, [groupId]: data.success ? '✓ Assigned' : 'Error' }))
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--brown-900)', marginBottom: 20, fontWeight: 700 }}>Groups & Tutor Assignment</h2>
      {groups.length === 0
        ? <GlassCard style={{ padding: 24 }}><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No groups yet. Run the AI grouping first.</p></GlassCard>
        : groups.map(g => {
          const assignedTutor = g.tutor_assignments?.[0]?.profiles?.full_name
          return (
            <GlassCard key={g.id} style={{ marginBottom: 16, padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--brown-900)' }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{g.focus}</div>
                </div>
                <span style={{
                  background: assignedTutor ? 'linear-gradient(135deg,rgba(245,200,66,0.25),rgba(245,200,66,0.1))' : 'var(--brown-100)',
                  color: assignedTutor ? 'var(--brown-800)' : 'var(--text-muted)',
                  padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  border: assignedTutor ? '1px solid var(--yellow-300)' : '1px solid var(--border)'
                }}>
                  {assignedTutor ? `✓ ${assignedTutor}` : 'No tutor yet'}
                </span>
              </div>
              {g.shared_courses?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {g.shared_courses.map(c => (
                    <span key={c} style={{ background: 'var(--brown-100)', color: 'var(--brown-800)', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>{c}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <select onChange={e => setAssigning(prev => ({ ...prev, [g.id]: e.target.value }))}
                  style={{ flex: 1, minWidth: 160, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.8)' }}>
                  <option value="">Select tutor...</option>
                  {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <button style={{
                  padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: assigning[g.id] ? 'linear-gradient(135deg,var(--brown-700),var(--brown-900))' : 'var(--border)',
                  color: assigning[g.id] ? '#fff' : 'var(--text-muted)', border: 'none', cursor: assigning[g.id] ? 'pointer' : 'default'
                }} onClick={() => assign(g.id, assigning[g.id])} disabled={!assigning[g.id]}>
                  Assign
                </button>
                {status[g.id] && <span style={{ fontSize: 12, color: 'var(--brown-600)', fontWeight: 500 }}>{status[g.id]}</span>}
              </div>
            </GlassCard>
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
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--brown-900)', marginBottom: 12, fontWeight: 700 }}>AI Grouping Engine</h2>
      <GlassCard style={{ padding: '24px', marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
          Runs the Groq AI grouping engine on all students who completed onboarding but have not been assigned a group yet. Groups students by shared courses and similar weaknesses into cohorts of 3–5.
        </p>
        <button onClick={runGrouping} disabled={loading} style={{
          padding: '14px 32px', borderRadius: 14, fontSize: 15, fontWeight: 700,
          background: loading ? 'var(--border)' : 'linear-gradient(135deg,#F5C842,#e8a800)',
          color: loading ? 'var(--text-muted)' : 'var(--brown-900)',
          border: 'none', cursor: loading ? 'default' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 20px rgba(245,200,66,0.4)'
        }}>
          {loading ? '⏳ Running AI grouping...' : '✦ Run AI grouping now'}
        </button>
      </GlassCard>
      {result && (
        <GlassCard style={{ padding: '20px 24px' }}>
          {result.error
            ? <p style={{ color: '#c0392b', fontSize: 14 }}>{result.error}</p>
            : <>
              <div style={{ fontWeight: 700, color: 'var(--brown-900)', marginBottom: 10, fontSize: 15 }}>✓ Grouping complete</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--yellow-100)', borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 800, color: 'var(--brown-900)' }}>{result.groupsCreated}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Groups created</div>
                </div>
                <div style={{ background: 'var(--brown-100)', borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 800, color: 'var(--brown-900)' }}>{result.studentsGrouped}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Students grouped</div>
                </div>
              </div>
            </>}
        </GlassCard>
      )}
    </div>
  )
}
