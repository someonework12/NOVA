import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import GroupChat from '../components/GroupChat.jsx'
import { useEffect } from 'react'

const NAV_ITEMS = [
  { id: 'chat',     label: 'Chat',     icon: '💬' },
  { id: 'tasks',    label: 'Tasks',    icon: '✅' },
  { id: 'resources',label: 'Resources',icon: '📚' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
]

function Sidebar({ active, setActive, firstName, signOut }) {
  return (
    <div className="nova-sidebar" style={{ width: 240, background: 'var(--brown-900)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
      <div className="nova-sidebar-header" style={{ padding: '28px 24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)' }}>S</span>
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: '#fff' }}>Student Hour</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--brown-400)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Welcome back</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{firstName}</div>
      </div>
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
            padding: '11px 14px', borderRadius: 'var(--radius-md)', fontSize: 14,
            cursor: 'pointer', border: 'none',
            background: active === item.id ? 'rgba(245,200,66,0.15)' : 'transparent',
            color: active === item.id ? 'var(--yellow-400)' : 'rgba(255,255,255,0.55)',
            marginBottom: 2, fontFamily: 'var(--font-sans)', transition: 'all 0.15s'
          }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
          <Link to="/dashboard/nova" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px',
            borderRadius: 'var(--radius-md)', fontSize: 14,
            background: 'rgba(245,200,66,0.08)', color: 'var(--yellow-300)', textDecoration: 'none',
            border: '1px solid rgba(245,200,66,0.2)'
          }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <span>Professor Nova</span>
          </Link>
        </div>
      </nav>
      <div className="nova-sidebar-signout" style={{ padding: '12px 12px 24px' }}>
        <button onClick={signOut} style={{ width: '100%', padding: '10px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 'var(--radius-md)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const { group, members } = useGroup()
  const [active, setActive] = useState('chat')
  const firstName = profile?.full_name?.split(' ')[0] || 'Student'

  const activeLabel = NAV_ITEMS.find(i => i.id === active)?.label || active

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface)' }}>
      <Sidebar active={active} setActive={setActive} firstName={firstName} signOut={signOut} />
      <main className="nova-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', minHeight: 52 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)' }}>
              {active === 'chat' ? group?.name || 'Group Chat' : activeLabel}
            </span>
            {active === 'chat' && group && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{members.length} members</span>}
          </div>
          {group?.focus && <span className="badge badge-yellow" style={{ fontSize: 11 }}>{group.focus}</span>}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {active === 'chat'     && <GroupChat groupId={profile?.group_id} groupName={group?.name} />}
          {active === 'tasks'    && <TasksView groupId={profile?.group_id} />}
          {active === 'resources'&& <ResourcesView groupId={profile?.group_id} />}
          {active === 'schedule' && <PlaceholderView text="Your personalised day-by-day study schedule will appear here once your tutor configures it." />}
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
  if (!groupId) return <PlaceholderView text="You have not been assigned to a group yet." />
  return (
    <div style={{ padding: '20px 16px', maxWidth: 700, overflowY: 'auto', height: '100%' }}>
      {tasks.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tasks yet. Your tutor will assign them here.</p>
        : tasks.map(t => (
          <div key={t.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)', marginBottom: 6 }}>{t.title}</div>
            {t.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>{t.description}</p>}
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
  if (!groupId) return <PlaceholderView text="You have not been assigned to a group yet." />
  return (
    <div style={{ padding: '20px 16px', maxWidth: 700, overflowY: 'auto', height: '100%' }}>
      {resources.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No resources yet. Your tutor will upload study materials here.</p>
        : resources.map(r => (
          <div key={r.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{r.title}</div>
              {r.for_nova && <span className="badge badge-yellow" style={{ fontSize: 10, flexShrink: 0 }}>Fed to Nova</span>}
            </div>
            {r.content_text && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{r.content_text.slice(0, 300)}{r.content_text.length > 300 ? '...' : ''}</p>}
            {r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--brown-600)', fontWeight: 500, display: 'inline-block', marginTop: 8 }}>View / Download →</a>}
          </div>
        ))}
    </div>
  )
}

function PlaceholderView({ text }) {
  return <div style={{ padding: '32px 16px', color: 'var(--text-muted)', fontSize: 14 }}>{text}</div>
}
