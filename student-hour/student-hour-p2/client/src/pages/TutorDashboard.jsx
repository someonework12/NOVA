import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import GroupChat from '../components/GroupChat.jsx'

export default function TutorDashboard() {
  const { profile, signOut } = useAuth()
  const [active, setActive] = useState('chat')
  const [collapsed, setCollapsed] = useState(typeof window !== 'undefined' && window.innerWidth >= 768 ? false : true)
  const [assignment, setAssignment] = useState(null)

  useEffect(() => {
    async function fetchAssignment() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/tutor/my-group', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      setAssignment(data.assignment)
    }
    fetchAssignment()
  }, [])

  const group = assignment?.groups
  const firstName = profile?.full_name?.split(' ')[0] || 'Tutor'

  const navItems = [
    { id: 'chat', label: 'Group Chat' },
    { id: 'upload', label: 'Upload Resource' },
    { id: 'task', label: 'Assign Task' },
    { id: 'progress', label: 'Group Progress' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div className="nova-sidebar" style={{ width: 240, background: 'var(--brown-800)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
        <div className="nova-sidebar-header" style={{ padding: '28px 24px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--brown-400)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tutor Dashboard</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{firstName}</div>
          {group && <div style={{ fontSize: 12, color: 'var(--brown-400)', marginTop: 6 }}>Group: {group.name}</div>}
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

      <main className="nova-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ padding: '0 20px', height: 56, borderBottom: '1px solid var(--border-soft)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, padding: 4 }}><span style={{ display: 'block', width: 18, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} /><span style={{ display: 'block', width: 18, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} /><span style={{ display: 'block', width: 12, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} /></button><span style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{navItems.find(i => i.id === active)?.label}</span></div><Link to='/' style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>← Home</Link></div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {active === 'chat' && <GroupChat groupId={group?.id} groupName={group?.name} />}
          {active === 'upload' && <UploadResource groupId={group?.id} />}
          {active === 'task' && <AssignTask groupId={group?.id} />}
          {active === 'progress' && <GroupProgress groupId={group?.id} />}
        </div>
      </main>
    </div>
  )
}

function UploadResource({ groupId }) {
  const [form, setForm] = useState({ title: '', contentText: '', forNova: false })
  const [status, setStatus] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('Uploading...')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/tutor/upload-resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ groupId, ...form })
    })
    const data = await res.json()
    if (data.resource) { setStatus('Uploaded successfully!'); setForm({ title: '', contentText: '', forNova: false }) }
    else setStatus('Error: ' + data.error)
  }

  if (!groupId) return <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>No group assigned yet.</div>

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640 }}>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
        Upload notes, past questions, or reading material for your group. Toggle "Feed to Nova" to make Professor Nova teach from this document.
      </p>
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="label">Resource title</label>
          <input className="input-field" placeholder="e.g. Week 3 Integration Notes" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Content (paste text / notes)</label>
          <textarea className="input-field" placeholder="Paste your notes, explanations, or past questions here..." rows={8}
            value={form.contentText} onChange={e => setForm({ ...form, contentText: e.target.value })}
            style={{ resize: 'vertical' }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.forNova} onChange={e => setForm({ ...form, forNova: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: 'var(--brown-700)' }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Feed to Professor Nova (Nova will teach from this material)</span>
        </label>
        {status && <p style={{ fontSize: 13, color: status.includes('Error') ? '#c0392b' : 'var(--brown-600)' }}>{status}</p>}
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }}>Upload Resource</button>
      </form>
    </div>
  )
}

function AssignTask({ groupId }) {
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' })
  const [status, setStatus] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('Assigning...')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/tutor/assign-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ groupId, ...form })
    })
    const data = await res.json()
    if (data.task) { setStatus('Task assigned!'); setForm({ title: '', description: '', dueDate: '' }) }
    else setStatus('Error: ' + data.error)
  }

  if (!groupId) return <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>No group assigned yet.</div>

  return (
    <div style={{ padding: '28px 32px', maxWidth: 600 }}>
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="label">Task title</label>
          <input className="input-field" placeholder="e.g. Complete 10 integration exercises" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input-field" placeholder="Instructions or details about this task..." rows={4}
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
        </div>
        <div>
          <label className="label">Due date (optional)</label>
          <input className="input-field" type="date" value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        {status && <p style={{ fontSize: 13, color: status.includes('Error') ? '#c0392b' : 'var(--brown-600)' }}>{status}</p>}
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }}>Assign Task</button>
      </form>
    </div>
  )
}

function GroupProgress({ groupId }) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    if (!groupId) return
    async function fetch() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await window.fetch(`/api/tutor/group-progress/${groupId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      setMembers(data.members || [])
    }
    fetch()
  }, [groupId])

  if (!groupId) return <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>No group assigned yet.</div>

  return (
    <div style={{ padding: '28px 32px', maxWidth: 700 }}>
      {members.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No members yet.</p>
        : members.map(m => (
          <div key={m.id} className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{m.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.department}</div>
            </div>
            <span className="badge badge-brown">{m.session_count || 0} Nova sessions</span>
          </div>
        ))}
    </div>
  )
}
