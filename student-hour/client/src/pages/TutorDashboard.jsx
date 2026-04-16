import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'
import GroupChat from '../components/GroupChat.jsx'

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

function TutorSidebar({ active, setActive, firstName, signOut, group, onClose }) {
  const items = [
    { id: 'chat', label: 'Group Chat', icon: '💬' },
    { id: 'upload', label: 'Upload Resource', icon: '📤' },
    { id: 'task', label: 'Assign Task', icon: '📋' },
    { id: 'progress', label: 'Group Progress', icon: '📊' },
  ]
  return (
    <>
      <div style={{ padding: '24px 20px 16px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tutor Dashboard</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{firstName}</div>
        {group && <div style={{ fontSize: 12, color: 'var(--brown-400)' }}>{group.name}</div>}
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

export default function TutorDashboard() {
  const { profile, signOut } = useAuth()
  const [active, setActive] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [group, setGroup] = useState(null)
  const firstName = profile?.full_name?.split(' ')[0] || 'Tutor'

  useEffect(() => {
    apiFetch('/api/tutor/my-group').then(d => setGroup(d.assignment?.groups || null))
  }, [])

  const titles = { chat: 'Group Chat', upload: 'Upload Resource', task: 'Assign Task', progress: 'Group Progress' }

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ background: 'var(--brown-800)' }}>
        <TutorSidebar active={active} setActive={setActive} firstName={firstName} signOut={signOut} group={group} onClose={() => setSidebarOpen(false)} />
      </aside>

      <main className="app-main">
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', flexShrink: 0 }}>
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)' }}>{titles[active]}</span>
        </div>
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
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setUploading(true); setStatus('')
    let fileUrl = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `group-${groupId}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadErr } = await supabase.storage.from('resources').upload(path, file)
      if (uploadErr) { setStatus('File upload failed: ' + uploadErr.message); setUploading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(path)
      fileUrl = publicUrl
    }

    const body = { groupId, title: form.title, contentText: form.contentText, forNova: form.forNova, fileUrl }
    const data = await apiFetch('/api/tutor/upload-resource', 'POST', body)

    if (data.resource) {
      setStatus('Uploaded successfully!')
      setForm({ title: '', contentText: '', forNova: false }); setFile(null)
    } else setStatus('Error: ' + (data.error || 'Unknown error'))
    setUploading(false)
  }

  if (!groupId) return <div style={{ padding: '28px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No group assigned yet.</div>

  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
        Upload notes, past questions, or reading materials. Toggle "Feed to Nova" so Professor Nova teaches directly from this content.
      </p>
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="label">Resource title</label>
          <input className="input-field" placeholder="e.g. Week 3 Integration Notes" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Paste text content (optional)</label>
          <textarea className="input-field" placeholder="Paste notes, explanations, or past questions here..." rows={6}
            value={form.contentText} onChange={e => setForm({ ...form, contentText: e.target.value })}
            style={{ resize: 'vertical' }} />
        </div>
        <div>
          <label className="label">Upload file (PDF, DOC, etc.) — optional</label>
          <input type="file" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
            onChange={e => setFile(e.target.files[0])}
            style={{ fontSize: 13, color: 'var(--text-secondary)', width: '100%' }} />
          {file && <p style={{ fontSize: 12, color: 'var(--brown-600)', marginTop: 4 }}>Selected: {file.name}</p>}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.forNova} onChange={e => setForm({ ...form, forNova: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: 'var(--brown-700)' }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Feed to Professor Nova (Nova will teach from this)</span>
        </label>
        {status && <p style={{ fontSize: 13, color: status.includes('Error') || status.includes('failed') ? '#c0392b' : 'var(--brown-600)' }}>{status}</p>}
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: 12 }} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Resource'}
        </button>
      </form>
    </div>
  )
}

function AssignTask({ groupId }) {
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setStatus('')
    const data = await apiFetch('/api/tutor/assign-task', 'POST', { groupId, ...form })
    if (data.task) { setStatus('Task assigned!'); setForm({ title: '', description: '', dueDate: '' }) }
    else setStatus('Error: ' + (data.error || 'Unknown'))
    setLoading(false)
  }

  if (!groupId) return <div style={{ padding: '28px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No group assigned yet.</div>

  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="label">Task title</label>
          <input className="input-field" placeholder="e.g. Complete 10 integration exercises"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input-field" placeholder="Instructions or details..." rows={4}
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ resize: 'vertical' }} />
        </div>
        <div>
          <label className="label">Due date (optional)</label>
          <input className="input-field" type="date" value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        {status && <p style={{ fontSize: 13, color: status.includes('Error') ? '#c0392b' : 'var(--brown-600)' }}>{status}</p>}
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: 12 }} disabled={loading}>
          {loading ? 'Assigning...' : 'Assign Task'}
        </button>
      </form>
    </div>
  )
}

function GroupProgress({ groupId }) {
  const [members, setMembers] = useState([])
  useEffect(() => {
    if (!groupId) return
    apiFetch(`/api/tutor/group-progress/${groupId}`).then(d => setMembers(d.members || []))
  }, [groupId])

  if (!groupId) return <div style={{ padding: '28px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No group assigned yet.</div>

  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      {members.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No members yet.</p>
      : members.map(m => (
        <div key={m.id} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{m.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.department}</div>
          </div>
          <span className="badge badge-brown" style={{ flexShrink: 0 }}>{m.session_count || 0} sessions</span>
        </div>
      ))}
    </div>
  )
}
