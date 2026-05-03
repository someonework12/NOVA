import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import GroupChat from '../components/GroupChat.jsx'

const API = () => import.meta.env.VITE_API_URL || ''
async function apiFetch(path, method='GET', body) {
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

function Sidebar({ active, setActive, firstName, signOut, group, onClose }) {
  const items = [
    { id:'chat',     label:'Group Chat' },
    { id:'courses',  label:'My Courses' },
    { id:'tasks',    label:'My Tasks' },
    { id:'resources',label:'Resources' },
    { id:'schedule', label:'Study Schedule' },
  ]
  return (
    <>
      <div style={{ padding:'24px 20px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--yellow-500)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--brown-900)', fontFamily:'var(--font-serif)' }}>S</span>
          </div>
          <span style={{ fontFamily:'var(--font-serif)', fontWeight:600, fontSize:14, color:'#fff' }}>Student Hour</span>
        </div>
        <div style={{ fontSize:10, color:'var(--brown-400)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.06em' }}>Welcome back</div>
        <div style={{ fontSize:15, fontWeight:600, color:'#fff' }}>{firstName}</div>
        {group && <div style={{ fontSize:11, color:'var(--brown-400)', marginTop:4 }}>{group.name}</div>}
      </div>
      <nav style={{ flex:1, padding:'0 10px' }}>
        {items.map(item=>(
          <button key={item.id} onClick={()=>{ setActive(item.id); onClose?.() }}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left', padding:'11px 12px', borderRadius:'var(--radius-md)', fontSize:14, cursor:'pointer', border:'none', marginBottom:2, fontFamily:'var(--font-sans)', background:active===item.id?'rgba(245,200,66,0.15)':'transparent', color:active===item.id?'var(--yellow-400)':'rgba(255,255,255,0.55)' }}>
            {item.label}
          </button>
        ))}
        <div style={{ margin:'10px 0', borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:10 }}>
          <Link to="/dashboard/nova" onClick={onClose}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderRadius:'var(--radius-md)', fontSize:14, background:'rgba(245,200,66,0.1)', color:'var(--yellow-300)', border:'1px solid rgba(245,200,66,0.2)', textDecoration:'none' }}>
            Professor Nova
          </Link>
        </div>
      </nav>
      <div style={{ padding:'10px 10px 24px' }}>
        <button onClick={signOut} style={{ width:'100%', padding:'10px', fontSize:13, background:'rgba(255,255,255,0.05)', border:'none', borderRadius:'var(--radius-md)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'var(--font-sans)', textAlign:'left' }}>Sign out</button>
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
  const titles = { chat: group?.name||'Group Chat', courses:'My Courses', tasks:'My Tasks', resources:'Resources', schedule:'Study Schedule' }

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen?'open':''}`} onClick={()=>setSidebarOpen(false)} />
      <aside className={`app-sidebar ${sidebarOpen?'open':''}`} style={{ background:'var(--brown-900)' }}>
        <Sidebar active={active} setActive={setActive} firstName={firstName} signOut={signOut} group={group} onClose={()=>setSidebarOpen(false)} />
      </aside>
      <main className="app-main">
        <div style={{ padding:'13px 18px', borderBottom:'1px solid var(--border-soft)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="hamburger" onClick={()=>setSidebarOpen(true)} aria-label="Menu"><span/><span/><span/></button>
            <span style={{ fontWeight:600, fontSize:15, color:'var(--brown-900)' }}>{titles[active]}</span>
            {active==='chat' && group && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{members.length} members</span>}
          </div>
          {group?.focus && <span className="badge badge-yellow" style={{ fontSize:11, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{group.focus}</span>}
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>
          {active==='chat'      && <GroupChat groupId={profile?.group_id} groupName={group?.name}/>}
          {active==='courses'   && <CoursesView studentId={profile?.id}/>}
          {active==='tasks'     && <TasksView groupId={profile?.group_id}/>}
          {active==='resources' && <ResourcesView groupId={profile?.group_id}/>}
          {active==='schedule'  && <ScheduleView/>}
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// COURSES VIEW — with multi-PDF upload per course
// ─────────────────────────────────────────────────────────────────
function CoursesView({ studentId }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ code:'', title:'', weakness:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [expandedCourse, setExpandedCourse] = useState(null)

  useEffect(() => {
    if (!studentId) return
    supabase.from('student_courses').select('*').eq('student_id', studentId).order('created_at')
      .then(({ data }) => { setCourses(data || []); setLoading(false) })
  }, [studentId])

  async function addCourse(e) {
    e.preventDefault(); setSaving(true); setMsg('')
    const { data, error } = await supabase.from('student_courses').insert({
      student_id: studentId,
      course_code: form.code.trim().toUpperCase(),
      course_title: form.title.trim(),
      weakness_description: form.weakness.trim()
    }).select().single()
    if (error) { setMsg('Error: ' + error.message) }
    else { setCourses(p => [...p, data]); setForm({ code:'', title:'', weakness:'' }); setShowAdd(false); setMsg('Course added! Nova can now teach from this course.') }
    setSaving(false)
  }

  async function removeCourse(id) {
    if (!confirm('Remove this course and all its uploaded materials?')) return
    // Delete course PDFs from nova_materials
    await supabase.from('nova_materials').delete().eq('course_id', id)
    await supabase.from('student_courses').delete().eq('id', id)
    setCourses(p => p.filter(c => c.id !== id))
    if (expandedCourse === id) setExpandedCourse(null)
  }

  if (loading) return <Empty text="Loading your courses..."/>

  return (
    <div style={{ padding:'20px 18px', overflowY:'auto', height:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <p style={{ fontSize:13, color:'var(--text-secondary)', maxWidth:440 }}>
          Add your courses and upload PDF materials. Nova will teach you from them — exam-focused, calculation-aware, step by step.
        </p>
        <button onClick={()=>setShowAdd(v=>!v)} className="btn-accent" style={{ padding:'8px 16px', fontSize:13, flexShrink:0 }}>
          {showAdd ? '× Cancel' : '+ Add course'}
        </button>
      </div>

      {msg && (
        <div style={{ fontSize:13, color:msg.startsWith('Error')?'#c0392b':'var(--brown-600)', marginBottom:14, padding:'10px 14px', background:msg.startsWith('Error')?'#fef2f2':'var(--yellow-50)', borderRadius:8, border:`1px solid ${msg.startsWith('Error')?'#fca5a5':'var(--yellow-300)'}` }}>
          {msg}
        </div>
      )}

      {showAdd && (
        <form onSubmit={addCourse} style={{ background:'var(--surface-2)', border:'1px solid var(--border-soft)', borderRadius:'var(--radius-lg)', padding:'16px', marginBottom:16, display:'flex', flexDirection:'column', gap:12 }}>
          <h3 style={{ fontSize:14, fontWeight:600, color:'var(--brown-900)' }}>Add a course</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
            <div>
              <label className="label">Course code</label>
              <input className="input-field" placeholder="e.g. MTH301" value={form.code} onChange={e=>setForm({...form,code:e.target.value})} required/>
            </div>
            <div>
              <label className="label">Course title</label>
              <input className="input-field" placeholder="e.g. Real Analysis" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/>
            </div>
          </div>
          <div>
            <label className="label">What are you struggling with? (optional)</label>
            <input className="input-field" placeholder="e.g. Integration techniques, epsilon-delta proofs..." value={form.weakness} onChange={e=>setForm({...form,weakness:e.target.value})}/>
          </div>
          <button type="submit" className="btn-primary" style={{ width:'100%', padding:11 }} disabled={saving}>
            {saving ? 'Adding...' : 'Add course'}
          </button>
        </form>
      )}

      {courses.length === 0 ? (
        <div style={{ background:'var(--yellow-50)', border:'1px solid var(--yellow-300)', borderRadius:'var(--radius-lg)', padding:'20px', textAlign:'center' }}>
          <div style={{ fontWeight:600, fontSize:15, color:'var(--brown-900)', marginBottom:8 }}>No courses yet</div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:16 }}>Add your courses and upload your lecture PDFs — Nova will teach you from them like a real professor.</p>
          <button onClick={()=>setShowAdd(true)} className="btn-accent" style={{ padding:'9px 18px', fontSize:13 }}>+ Add your first course</button>
        </div>
      ) : courses.map(c => (
        <CourseCard
          key={c.id}
          course={c}
          studentId={studentId}
          expanded={expandedCourse === c.id}
          onToggle={() => setExpandedCourse(expandedCourse === c.id ? null : c.id)}
          onRemove={() => removeCourse(c.id)}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// COURSE CARD — expandable, shows PDFs, upload button
// ─────────────────────────────────────────────────────────────────
function CourseCard({ course, studentId, expanded, onToggle, onRemove }) {
  const [materials, setMaterials] = useState([])
  const [loadingMats, setLoadingMats] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (!expanded) return
    setLoadingMats(true)
    supabase.from('nova_materials')
      .select('id, file_name, chars, created_at')
      .eq('student_id', studentId)
      .eq('course_id', course.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setMaterials(data || []); setLoadingMats(false) })
  }, [expanded, course.id, studentId])

  async function uploadPDF(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 40 * 1024 * 1024) { setUploadMsg('File too large. Max 40MB.'); return }

    setUploading(true); setUploadMsg('⏳ Uploading and extracting text — large files may take up to 60 seconds...')
    const { data: { session } } = await supabase.auth.getSession()
    const fd = new FormData()
    fd.append('file', file)
    fd.append('courseId', course.id)
    fd.append('courseCode', course.course_code)
    fd.append('courseTitle', course.course_title)

    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 120000)
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/nova/upload-material`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
        signal: controller.signal
      })
      clearTimeout(tid)
      // Safe JSON parse — server may return HTML on timeout/crash
      let data = {}
      try { data = await res.json() } catch (_) {}
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status}) — try a smaller file or check your connection`)
      setUploadMsg(`✅ "${data.file_name}" uploaded — Nova can now teach from it.`)
      // Refresh materials list
      const { data: mats } = await supabase.from('nova_materials')
        .select('id, file_name, chars, created_at')
        .eq('student_id', studentId)
        .eq('course_id', course.id)
        .order('created_at', { ascending: false })
      setMaterials(mats || [])
    } catch (err) {
      setUploadMsg('Error: ' + err.message)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function deleteMaterial(id, name) {
    if (!confirm(`Remove "${name}"?`)) return
    await supabase.from('nova_materials').delete().eq('id', id)
    setMaterials(p => p.filter(m => m.id !== id))
  }

  return (
    <div className="card" style={{ marginBottom:10 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1, cursor:'pointer' }} onClick={onToggle}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
            <span className="badge badge-yellow" style={{ fontSize:11 }}>{course.course_code}</span>
            <span style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)' }}>{course.course_title}</span>
            {materials.length > 0 && (
              <span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--surface-2)', padding:'2px 7px', borderRadius:99 }}>
                {materials.length} PDF{materials.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {course.weakness_description && (
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>Struggling with: {course.weakness_description}</div>
          )}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
          <button onClick={onToggle} style={{ background:'var(--yellow-50)', border:'1px solid var(--yellow-300)', borderRadius:8, padding:'4px 10px', fontSize:12, color:'var(--brown-700)', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
            {expanded ? '▲ Hide' : '▼ Materials'}
          </button>
          <button onClick={onRemove} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, lineHeight:1, padding:'0 2px' }} title="Remove course">×</button>
        </div>
      </div>

      {/* Expanded: materials + upload */}
      {expanded && (
        <div style={{ marginTop:14, borderTop:'1px solid var(--border-soft)', paddingTop:14 }}>
          {/* Tell Nova to teach this course */}
          <div style={{ background:'var(--yellow-50)', border:'1px solid var(--yellow-300)', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13, color:'var(--brown-800)' }}>
            💡 <strong>To have Nova teach from this course:</strong> go to Professor Nova and say
            <em style={{ color:'var(--brown-900)', fontStyle:'normal', fontWeight:600 }}> "Teach me {course.course_code} from my uploaded materials"</em> or
            <em style={{ color:'var(--brown-900)', fontStyle:'normal', fontWeight:600 }}> "Start teaching {course.course_title} from the beginning"</em>
          </div>

          {/* Upload */}
          <div style={{ marginBottom:12 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={uploadPDF}
              style={{ display:'none' }}
              id={`pdf-upload-${course.id}`}
            />
            <label htmlFor={`pdf-upload-${course.id}`}
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 16px', background:'var(--brown-900)', color:'#fff', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'var(--font-sans)', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? '⏳ Uploading...' : '+ Upload PDF / DOCX'}
            </label>
            <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:10 }}>Max 40MB · PDF, DOCX, TXT</span>
          </div>

          {uploadMsg && (
            <div style={{ fontSize:13, color: uploadMsg.startsWith('Error') ? '#c0392b' : 'var(--brown-600)', marginBottom:10, padding:'8px 12px', background: uploadMsg.startsWith('Error') ? '#fef2f2' : 'var(--yellow-50)', borderRadius:6, border:`1px solid ${uploadMsg.startsWith('Error')?'#fca5a5':'var(--yellow-300)'}` }}>
              {uploadMsg}
            </div>
          )}

          {/* Materials list */}
          {loadingMats ? (
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>Loading materials...</div>
          ) : materials.length === 0 ? (
            <div style={{ fontSize:13, color:'var(--text-muted)', fontStyle:'italic' }}>No materials uploaded yet. Upload a PDF and Nova will teach from it.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {materials.map(m => (
                <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--surface-2)', borderRadius:8, border:'1px solid var(--border-soft)' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--brown-900)' }}>📄 {m.file_name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{m.chars ? (m.chars/1000).toFixed(1)+'k chars extracted' : ''} · {new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={()=>deleteMaterial(m.id, m.file_name)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, padding:'0 4px' }} title="Remove">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TasksView({ groupId }) {
  const [tasks, setTasks] = useState([])
  useEffect(() => {
    if (!groupId) return
    supabase.from('tasks').select('*').eq('group_id', groupId).order('due_date')
      .then(({ data }) => setTasks(data || []))
  }, [groupId])
  if (!groupId) return <Empty text="You haven't been assigned to a group yet."/>
  return (
    <div style={{ padding:'20px 18px', overflowY:'auto', height:'100%' }}>
      {tasks.length === 0 ? <Empty text="No tasks yet. Your tutor will assign them here."/>
      : tasks.map(t => (
        <div key={t.id} className="card" style={{ marginBottom:12 }}>
          <div style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)', marginBottom:6 }}>{t.title}</div>
          {t.description && <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:8 }}>{t.description}</p>}
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
    supabase.from('group_resources').select('*').eq('group_id', groupId).order('created_at', { ascending:false })
      .then(({ data }) => setResources(data || []))
  }, [groupId])
  if (!groupId) return <Empty text="You haven't been assigned to a group yet."/>
  return (
    <div style={{ padding:'20px 18px', overflowY:'auto', height:'100%' }}>
      {resources.length === 0 ? <Empty text="No resources yet. Your tutor will upload study materials here."/>
      : resources.map(r => (
        <div key={r.id} className="card" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
            <div style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)' }}>{r.title}</div>
            {r.for_nova && <span className="badge badge-yellow" style={{ fontSize:10, flexShrink:0 }}>Fed to Nova</span>}
          </div>
          {r.content_text && <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7 }}>{r.content_text.slice(0,300)}{r.content_text.length>300?'...':''}</p>}
          {r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:'var(--brown-600)', fontWeight:500, display:'inline-block', marginTop:8 }}>View / Download →</a>}
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
    apiFetch('/api/schedule/my-schedule')
      .then(d => { setSchedule(d.schedule); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  async function generate() {
    setGenerating(true); setError('')
    try { const d = await apiFetch('/api/schedule/generate', 'POST', { weeksAhead:1 }); setSchedule(d.schedule) }
    catch (e) { setError(e.message) }
    setGenerating(false)
  }
  if (loading) return <Empty text="Loading your schedule..."/>
  return (
    <div style={{ padding:'20px 18px', overflowY:'auto', height:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <p style={{ fontSize:13, color:'var(--text-secondary)' }}>Your personalised 7-day study plan.</p>
        <button onClick={generate} className="btn-accent" style={{ padding:'9px 16px', fontSize:13 }} disabled={generating}>
          {generating ? 'Generating...' : schedule ? '↻ Regenerate' : 'Generate schedule'}
        </button>
      </div>
      {error && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#c0392b', marginBottom:14 }}>{error}</div>}
      {!schedule ? (
        <div style={{ background:'var(--yellow-50)', border:'1px solid var(--yellow-300)', borderRadius:'var(--radius-lg)', padding:'20px', textAlign:'center' }}>
          <div style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)', marginBottom:8 }}>No schedule yet</div>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>Click Generate — Nova will build your personal study plan from your courses.</p>
        </div>
      ) : schedule.map((day,i) => (
        <div key={i} className="card" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)' }}>{day.date}</div>
            {day.total_hours && <span className="badge badge-yellow">{day.total_hours}h</span>}
          </div>
          {day.sessions?.map((s,j) => (
            <div key={j} style={{ borderLeft:'3px solid var(--yellow-500)', paddingLeft:12, marginBottom: j<day.sessions.length-1?12:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:3 }}>
                <div style={{ fontWeight:500, fontSize:13, color:'var(--brown-800)' }}>{s.course_code} — {s.topic}</div>
                <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{s.duration_hours}h</span>
              </div>
              {s.resources && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.resources}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ padding:'32px 20px', color:'var(--text-muted)', fontSize:14 }}>{text}</div>
}
