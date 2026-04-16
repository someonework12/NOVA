import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import GroupChat from '../components/GroupChat.jsx'

const NAV_ITEMS = [
  { id: 'chat',      label: 'Group Chat',    icon: '💬' },
  { id: 'tasks',     label: 'My Tasks',      icon: '✅' },
  { id: 'resources', label: 'Resources',     icon: '📚' },
  { id: 'schedule',  label: 'Schedule',      icon: '📅' },
]

function Sidebar({ active, setActive, firstName, signOut, collapsed, setCollapsed }) {
  return (
    <>
      {!collapsed && (
        <div onClick={() => setCollapsed(true)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 149, display: 'none'
        }} className="sidebar-overlay" />
      )}
      <div style={{
        width: collapsed ? 0 : 256,
        minWidth: collapsed ? 0 : 256,
        background: 'linear-gradient(180deg,#1a0f08 0%,#2d1a0e 100%)',
        display: 'flex', flexDirection: 'column', height: '100vh',
        flexShrink: 0, overflow: 'hidden',
        transition: 'width 0.3s, min-width 0.3s',
        boxShadow: collapsed ? 'none' : '4px 0 32px rgba(0,0,0,0.25)',
        zIndex: 150, position: 'relative'
      }}>
        <div style={{ padding: '22px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,var(--yellow-500),#e8a800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--brown-900)' }}>S</span>
              </div>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap' }}>Student Hour</span>
            </Link>
            <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, padding: 2 }}>✕</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--brown-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Welcome back</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{firstName}</div>
        </div>

        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActive(item.id); setCollapsed(true) }} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '11px 14px', borderRadius: 12, fontSize: 14, cursor: 'pointer', border: 'none',
              background: active === item.id ? 'linear-gradient(135deg,rgba(245,200,66,0.2),rgba(245,200,66,0.06))' : 'transparent',
              color: active === item.id ? 'var(--yellow-400)' : 'rgba(255,255,255,0.55)',
              marginBottom: 3, fontFamily: 'var(--font-sans)',
              borderLeft: active === item.id ? '2px solid var(--yellow-500)' : '2px solid transparent',
              transition: 'all 0.15s', textAlign: 'left', whiteSpace: 'nowrap'
            }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <Link to="/dashboard/nova" onClick={() => setCollapsed(true)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
              borderRadius: 12, fontSize: 14,
              background: 'rgba(245,200,66,0.08)', color: 'var(--yellow-300)', textDecoration: 'none',
              border: '1px solid rgba(245,200,66,0.18)', whiteSpace: 'nowrap'
            }}>
              <span style={{ fontSize: 16 }}>✦</span>
              <span>Professor Nova</span>
            </Link>
          </div>
        </nav>

        <div style={{ padding: '10px 10px 22px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
            fontSize: 13, background: 'rgba(255,255,255,0.04)', border: 'none',
            borderRadius: 10, color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', textAlign: 'left', whiteSpace: 'nowrap'
          }}>⏏ Sign out</button>
        </div>
      </div>
    </>
  )
}

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const { group, members } = useGroup()
  const [active, setActive] = useState('chat')
  const [collapsed, setCollapsed] = useState(true)
  const firstName = profile?.full_name?.split(' ')[0] || 'Student'

  useEffect(() => {
    if (window.innerWidth >= 768) setCollapsed(false)
  }, [])

  const activeLabel = NAV_ITEMS.find(i => i.id === active)?.label || active

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface)' }}>
      <Sidebar active={active} setActive={setActive} firstName={firstName} signOut={signOut} collapsed={collapsed} setCollapsed={setCollapsed} />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{
          padding: '0 clamp(14px,3vw,24px)', height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: '#fff',
          borderBottom: '1px solid var(--border-soft)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setCollapsed(!collapsed)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 4, padding: 4
            }}>
              <span style={{ display: 'block', width: 18, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 12, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>
              {active === 'chat' ? group?.name || 'Group Chat' : activeLabel}
            </span>
            {active === 'chat' && group && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{members.length} members</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {group?.focus && <span style={{ background: 'var(--yellow-100)', color: 'var(--brown-800)', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, border: '1px solid var(--yellow-300)' }}>{group.focus}</span>}
            <Link to="/" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>← Home</Link>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {active === 'chat'      && <GroupChat groupId={profile?.group_id} groupName={group?.name} />}
          {active === 'tasks'     && <TasksView groupId={profile?.group_id} />}
          {active === 'resources' && <ResourcesView groupId={profile?.group_id} />}
          {active === 'schedule'  && <PlaceholderView text="Your personalised study schedule will appear here once your tutor configures it." />}
        </div>
      </main>

      <style>{`@media(max-width:768px){.sidebar-overlay{display:block!important;}}`}</style>
    </div>
  )
}

function TasksView({ groupId }) {
  const [tasks, setTasks] = useState([])
  useEffect(() => {
    if (!groupId) return
    supabase.from('tasks').select('*').eq('group_id', groupId).order('due_date').then(({ data }) => setTasks(data || []))
  }, [groupId])
  if (!groupId) return <PlaceholderView text="You haven't been assigned to a group yet." />
  return (
    <div style={{ padding: 'clamp(16px,3vw,28px)', overflowY: 'auto', height: '100%' }}>
      {tasks.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tasks yet. Your tutor will assign them here.</p>
        : tasks.map(t => (
          <div key={t.id} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginBottom: 12, border: '1px solid var(--border-soft)', boxShadow: '0 2px 8px rgba(58,31,14,0.05)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)', marginBottom: 6 }}>{t.title}</div>
            {t.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>{t.description}</p>}
            {t.due_date && <span style={{ background: 'var(--yellow-100)', color: 'var(--brown-800)', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Due: {new Date(t.due_date).toLocaleDateString()}</span>}
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
  if (!groupId) return <PlaceholderView text="You haven't been assigned to a group yet." />
  return (
    <div style={{ padding: 'clamp(16px,3vw,28px)', overflowY: 'auto', height: '100%' }}>
      {resources.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No resources yet. Your tutor will upload study materials here.</p>
        : resources.map(r => (
          <div key={r.id} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginBottom: 12, border: '1px solid var(--border-soft)', boxShadow: '0 2px 8px rgba(58,31,14,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{r.title}</div>
              {r.for_nova && <span style={{ background: 'var(--yellow-100)', color: 'var(--brown-800)', padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>Fed to Nova ✦</span>}
            </div>
            {r.content_text && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{r.content_text.slice(0, 300)}{r.content_text.length > 300 ? '...' : ''}</p>}
            {r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--brown-600)', fontWeight: 500, display: 'inline-block', marginTop: 8 }}>View / Download →</a>}
          </div>
        ))}
    </div>
  )
}

function PlaceholderView({ text }) {
  return <div style={{ padding: 'clamp(24px,4vw,40px)', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>{text}</div>
}
