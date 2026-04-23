import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import GroupChat from '../components/GroupChat.jsx'

const API = () => import.meta.env.VITE_API_URL || ''
async function apiFetch(path, method = 'GET', body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API()}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Request failed')
  return data
}

const NAV = [
  { id: 'chat',      label: 'Group Chat' },
  { id: 'courses',   label: 'My Courses' },
  { id: 'tasks',     label: 'Tasks' },
  { id: 'resources', label: 'Resources' },
  { id: 'schedule',  label: 'Schedule' },
]

function Sidebar({ active, setActive, firstName, signOut, group, onClose }) {
  return (
    <>
      <div style={{ padding: '24px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)' }}>S</span>
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: '#fff' }}>Student Hour</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--brown-400)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Welcome back</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{firstName}</div>
        {group && <div style={{ fontSize: 11, color: 'var(--brown-400)', marginTop: 4 }}>{group.name}</div>}
      </div>

      <nav style={{ flex: 1, padding: '0 10px' }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => { setActive(item.id); onClose?.() }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: 'var(--radius-md)', fontSize: 14, cursor: 'pointer', border: 'none', marginBottom: 2, fontFamily: 'var(--font-sans)', background: active === item.id ? 'rgba(245,200,66,0.15)' : 'transparent', color: active === item.id ? 'var(--yellow-400)' : 'rgba(255,255,255,0.55)' }}>
            {item.label}
          </button>
        ))}
        <div style={{ margin: '10px 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
          <Link to="/dashboard/nova" onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', padding: '11px 12px', borderRadius: 'var(--radius-md)', fontSize: 14, background: 'rgba(245,200,66,0.1)', color: 'var(--yellow-300)', border: '1px solid rgba(245,200,66,0.2)', textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>
            Professor Nova
          </Link>
        </div>
      </nav>

      <div style={{ padding: '10px 10px 24px' }}>
        <button onClick={signOut}
          style={{ width: '100%', padding: '10px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 'var(--radius-md)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}>
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
  const titles = { chat: group?.name || 'Group Chat', courses: 'My Courses', tasks: 'Tasks', resources: 'Resources', schedule: 'Schedule' }

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ background: 'var(--brown-900)' }}>
        <Sidebar active={active} setActive={setActive} firstName={firstName} signOut={signOut} group={group} onClose={() => setSidebarOpen(false)} />
      </aside>
      <main className="app-main">
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu"><span /><span /><span /></button>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--brown-900)' }}>{titles[active]}</span>
            {active === 'chat' && group && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{members.length} members</span>}
          </div>
          {group?.focus && <span className="badge badge-yellow" style={{ fontSize: 11 }}>{group.focus}</span>}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {active === 'chat'      && <GroupChat groupId={profile?.group_id} groupName={group?.name} />}
          {active === 'courses'   && <CoursesView studentId={profile?.id} />}
          {active === 'tasks'     && <TasksView groupId={profile?.group_id} />}
          {active === 'resources' && <ResourcesView groupId={profile?.group_id} />}
          {active === 'schedule'  && <ScheduleView />}
        </div>
      </main>
    </div>
  )
}

// ── COURSES + PDF UPLOAD ────────────────────────────────────────
function CoursesView({ studentId }) {
  const [courses, setCourses] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ code: '', title: '', weakness: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (!studentId) return
    Promise.all([
      supabase.from('student_courses').select('*').eq('student_id', studentId).order('created_at'),
      supabase.from('nova_materials').select('id, file_name, created_at').eq('student_id', studentId).order('created_at', { ascending: false })
    ]).then(([c, m]) => {
      setCourses(c.data || [])
      setMaterials(m.data || [])
      setLoading(false)
    })
  }, [studentId])

  async function addCourse(e) {
    e.preventDefault()
    setSaving(true); setMsg('')
    const { data, error } = await supabase.from('student_courses').insert({
      student_id: studentId,
      course_code: form.code.trim().toUpperCase(),
      course_title: form.title.trim(),
      weakness_description: form.weakness.trim()
    }).select().single()
    if (error) setMsg('Error: ' + error.message)
    else { setCourses(p => [...p, data]); setForm({ code: '', title: '', weakness: '' }); setShowAdd(false); setMsg('Course added.') }
    setSaving(false)
  }

  async function removeCourse(id) {
    if (!confirm('Remove this course?')) return
    await supabase.from('student_courses').delete().eq('id', id)
    setCourses(p => p.filter(c => c.id !== id))
  }

  async function uploadFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/nova/upload-material', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMaterials(p => [{ id: Date.now(), file_name: data.file_name, created_at: new Date().toISOString() }, ...p])
      setMsg('Material uploaded. Professor Nova will use it when teaching you.')
    } catch (err) {
      setMsg('Upload failed: ' + err.message)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function deleteMaterial(id) {
    if (!confirm('Remove this material?')) return
    await supabase.from('nova_materials').delete().eq('id', id)
    setMaterials(p => p.filter(m => m.id !== id))
  }

  if (loading) return <Empty text="Loading..." />

  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>

      {/* COURSES SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--brown-900)', marginBottom: 3 }}>Courses</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Professor Nova uses these when teaching you.</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} className="btn-accent" style={{ padding: '7px 14px', fontSize: 12 }}>
          {showAdd ? 'Cancel' : 'Add course'}
        </button>
      </div>

      {msg && (
        <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 12, background: msg.startsWith('Error') || msg.startsWith('Upload failed') ? '#fef2f2' : 'var(--yellow-50)', color: msg.startsWith('Error') || msg.startsWith('Upload failed') ? '#c0392b' : 'var(--brown-700)', border: `1px solid ${msg.startsWith('Error') || msg.startsWith('Upload failed') ? '#fca5a5' : 'var(--yellow-300)'}` }}>
          {msg}
        </div>
      )}

      {showAdd && (
        <form onSubmit={addCourse} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10 }}>
            <div>
              <label className="label">Course code</label>
              <input className="input-field" placeholder="e.g. MTH301" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div>
              <label className="label">Course title</label>
              <input className="input-field" placeholder="e.g. Real Analysis" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">What are you struggling with?</label>
            <input className="input-field" placeholder="e.g. integration, proofs..." value={form.weakness} onChange={e => setForm({ ...form, weakness: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: 11 }} disabled={saving}>{saving ? 'Adding...' : 'Add course'}</button>
        </form>
      )}

      {courses.length === 0 ? (
        <div style={{ background: 'var(--yellow-50)', border: '1px solid var(--yellow-300)', borderRadius: 'var(--radius-lg)', padding: '18px', textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>No courses yet. Add the courses you need help with.</p>
          <button onClick={() => setShowAdd(true)} className="btn-accent" style={{ padding: '8px 16px', fontSize: 12 }}>Add your first course</button>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {courses.map(c => (
            <div key={c.id} className="card" style={{ marginBottom: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 3 }}>
                    <span className="badge badge-yellow" style={{ fontSize: 10 }}>{c.course_code}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--brown-900)' }}>{c.course_title}</span>
                  </div>
                  {c.weakness_description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.weakness_description}</div>}
                </div>
                <button onClick={() => removeCourse(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STUDY MATERIALS SECTION */}
      <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--brown-900)', marginBottom: 3 }}>Study Materials</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Upload PDF, DOCX, or TXT files. Nova will read and teach from them.</p>
          </div>
          <button onClick={() => fileRef.current?.click()} className="btn-accent" style={{ padding: '7px 14px', fontSize: 12 }} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload file'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={uploadFile} />
        </div>

        {materials.length === 0 ? (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No materials uploaded yet. Upload your lecture notes, past questions, or textbook excerpts.</p>
          </div>
        ) : (
          materials.map(m => (
            <div key={m.id} className="card" style={{ marginBottom: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--brown-900)' }}>{m.file_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(m.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => deleteMaterial(m.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function TasksView({ groupId }) {
  const [tasks, setTasks] = useState([])
  useEffect(() => {
    if (!groupId) return
    supabase.from('tasks').select('*').eq('group_id', groupId).order('due_date').then(({ data }) => setTasks(data || []))
  }, [groupId])
  if (!groupId) return <Empty text="You have not been assigned to a group yet." />
  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      {tasks.length === 0 ? <Empty text="No tasks yet. Your tutor will assign them here." /> : tasks.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)', marginBottom: 5 }}>{t.title}</div>
          {t.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 7 }}>{t.description}</p>}
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
  if (!groupId) return <Empty text="You have not been assigned to a group yet." />
  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      {resources.length === 0 ? <Empty text="No resources yet. Your tutor will upload materials here." /> : resources.map(r => (
        <div key={r.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--brown-900)' }}>{r.title}</div>
            {r.for_nova && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Fed to Nova</span>}
          </div>
          {r.content_text && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{r.content_text.slice(0, 280)}{r.content_text.length > 280 ? '...' : ''}</p>}
          {r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--brown-600)', fontWeight: 500, display: 'inline-block', marginTop: 7 }}>View / Download</a>}
        </div>
      ))}
    </div>
  )
}

function ScheduleView() {
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    apiFetch('/api/schedule/my-schedule').then(d => { setSchedule(d.schedule); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  async function generate() {
    setGenerating(true); setError('')
    try { const d = await apiFetch('/api/schedule/generate', 'POST', { weeksAhead: 1 }); setSchedule(d.schedule) }
    catch (e) { setError(e.message) }
    setGenerating(false)
  }
  if (loading) return <Empty text="Loading schedule..." />
  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Your personalised 7-day study plan.</p>
        <button onClick={generate} className="btn-accent" style={{ padding: '8px 14px', fontSize: 12 }} disabled={generating}>
          {generating ? 'Generating...' : schedule ? 'Regenerate' : 'Generate'}
        </button>
      </div>
      {error && <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#c0392b', marginBottom: 12 }}>{error}</div>}
      {!schedule ? (
        <Empty text="No schedule yet. Click Generate to build your study plan." />
      ) : schedule.map((day, i) => (
        <div key={i} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--brown-900)' }}>{day.date}</div>
            {day.total_hours && <span className="badge badge-yellow">{day.total_hours}h</span>}
          </div>
          {day.sessions?.map((s, j) => (
            <div key={j} style={{ borderLeft: '3px solid var(--yellow-500)', paddingLeft: 10, marginBottom: j < day.sessions.length - 1 ? 10 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontWeight: 500, fontSize: 12, color: 'var(--brown-800)' }}>{s.course_code} — {s.topic}</div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{s.duration_hours}h</span>
              </div>
              {s.resources && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.resources}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ padding: '32px 20px', color: 'var(--text-muted)', fontSize: 13 }}>{text}</div>
}
