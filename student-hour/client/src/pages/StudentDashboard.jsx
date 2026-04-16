import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import GroupChat from '../components/GroupChat.jsx'

function Sidebar({ active, setActive, firstName, signOut, onClose }) {
  const items = [
    { id: 'chat', label: 'Group Chat', icon: '💬' },
    { id: 'tasks', label: 'My Tasks', icon: '✅' },
    { id: 'resources', label: 'Resources', icon: '📚' },
    { id: 'schedule', label: 'Study Schedule', icon: '📅' },
  ]
  return (
    <>
      <div style={{ padding: '24px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)' }}>S</span>
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: '#fff' }}>Student Hour</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--brown-400)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Welcome back</div>
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
            transition: 'all 0.15s'
          }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span> {item.label}
          </button>
        ))}
        <div style={{ margin: '10px 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
          <Link to="/dashboard/nova" onClick={onClose} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
            borderRadius: 'var(--radius-md)', fontSize: 14, background: 'rgba(245,200,66,0.1)',
            color: 'var(--yellow-300)', border: '1px solid rgba(245,200,66,0.2)', textDecoration: 'none'
          }}>
            <span style={{ fontSize: 15 }}>✦</span> Professor Nova
          </Link>
        </div>
      </nav>
      <div style={{ padding: '10px 10px 24px' }}>
        <button onClick={signOut} style={{ width: '100%', padding: '10px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 'var(--radius-md)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}>
          Sign out
        </button>
      </div>
    </>
  )
}

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const { group, members } = useGroup()
  const [active, setActive] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const firstName = profile?.full_name?.split(' ')[0] || 'Student'

  const titles = { chat: group?.name || 'Group Chat', tasks: 'My Tasks', resources: 'Resources', schedule: 'Study Schedule' }

  return (
    <div className="app-shell">
      {/* Overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ background: 'var(--brown-900)' }}>
        <Sidebar active={active} setActive={setActive} firstName={firstName} signOut={signOut} onClose={() => setSidebarOpen(false)} />
      </aside>

      <main className="app-main">
        {/* Mobile topbar */}
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <span /><span /><span />
            </button>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)' }}>{titles[active]}</span>
            {active === 'chat' && group && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{members.length} members</span>}
          </div>
          {group?.focus && <span className="badge badge-yellow" style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.focus}</span>}
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {active === 'chat' && <GroupChat groupId={profile?.group_id} groupName={group?.name} />}
          {active === 'tasks' && <TasksView groupId={profile?.group_id} />}
          {active === 'resources' && <ResourcesView groupId={profile?.group_id} />}
          {active === 'schedule' && <StudySchedule />}
        </div>
      </main>
    </div>
  )
}

function TasksView({ groupId }) {
  const [tasks, setTasks] = useState([])
  useEffect(() => {
    if (!groupId) return
    supabase.from('tasks').select('*').eq('group_id', groupId).order('due_date').then(({ data }) => setTasks(data || []))
  }, [groupId])
  if (!groupId) return <div style={{ padding: '28px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No group assigned yet.</div>
  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      {tasks.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tasks yet. Your tutor will assign them here.</p>
      : tasks.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)', marginBottom: 6 }}>{t.title}</div>
          {t.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>{t.description}</p>}
          {t.due_date && <span className="badge badge-yellow">Due: {new Date(t.due_date).toLocaleDateString()}</span>}
        </div>
      ))}
    </div>
  )
}

function ResourcesView({ groupId }) {
  const [resources, setResources] = useState([])
  useEffect(() => {
    if (!groupId) return
    supabase.from('group_resources').select('*').eq('group_id', groupId).order('created_at', { ascending: false }).then(({ data }) => setResources(data || []))
  }, [groupId])
  if (!groupId) return <div style={{ padding: '28px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No group assigned yet.</div>
  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      {resources.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No resources yet. Your tutor will upload study materials here.</p>
      : resources.map(r => (
        <div key={r.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{r.title}</div>
            {r.for_nova && <span className="badge badge-yellow" style={{ fontSize: 10, flexShrink: 0 }}>Fed to Nova</span>}
          </div>
          {r.content_text && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{r.content_text.slice(0, 200)}{r.content_text.length > 200 ? '...' : ''}</p>}
          {r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--brown-600)', fontWeight: 500, display: 'inline-block', marginTop: 8 }}>View / Download →</a>}
        </div>
      ))}
    </div>
  )
}

// ScheduleView is appended separately — see StudySchedule component below
export function StudySchedule({ }) {
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { fetchSchedule() }, [])

  async function fetchSchedule() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const apiBase = import.meta.env.VITE_API_URL || ''
    const res = await fetch(`${apiBase}/api/schedule/my-schedule`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const data = await res.json()
    setSchedule(data.schedule)
    setLoading(false)
  }

  async function generate() {
    setGenerating(true)
    const { data: { session } } = await supabase.auth.getSession()
    const apiBase = import.meta.env.VITE_API_URL || ''
    const res = await fetch(`${apiBase}/api/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ weeksAhead: 1 })
    })
    const data = await res.json()
    if (data.schedule) setSchedule(data.schedule)
    setGenerating(false)
  }

  if (loading) return <div style={{ padding: '28px 20px', color: 'var(--text-muted)', fontSize: 14 }}>Loading schedule...</div>

  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Your personalised 7-day study schedule based on your courses and deadlines.</p>
        <button onClick={generate} className="btn-accent" style={{ padding: '9px 18px', fontSize: 13 }} disabled={generating}>
          {generating ? 'Generating...' : schedule ? 'Regenerate' : 'Generate schedule'}
        </button>
      </div>
      {!schedule ? (
        <div style={{ background: 'var(--yellow-50)', border: '1px solid var(--yellow-300)', borderRadius: 'var(--radius-lg)', padding: '20px 18px', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)', marginBottom: 8 }}>No schedule yet</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Click "Generate schedule" and Professor Nova's engine will build your personal study plan.</p>
        </div>
      ) : schedule.map((day, i) => (
        <div key={i} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{day.date}</div>
            <span className="badge badge-yellow">{day.total_hours}h total</span>
          </div>
          {day.sessions?.map((s, j) => (
            <div key={j} style={{ borderLeft: '3px solid var(--yellow-500)', paddingLeft: 12, marginBottom: j < day.sessions.length - 1 ? 12 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--brown-800)' }}>{s.course_code} — {s.topic}</div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{s.duration_hours}h</span>
              </div>
              {s.resources && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📚 {s.resources}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
