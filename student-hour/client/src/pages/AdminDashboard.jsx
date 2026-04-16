import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'

const API = () => import.meta.env.VITE_API_URL || ''

async function apiFetch(path, method='GET', body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API()}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error(`Server error: ${res.status}. Check your VITE_API_URL env variable.`) }
}

function AdminSidebar({ active, setActive, firstName, signOut, onClose }) {
  const items = [
    { id:'overview',  label:'Overview',          icon:'📊' },
    { id:'tutors',    label:'Manage Tutors',      icon:'👥' },
    { id:'groups',    label:'Groups & Tutors',    icon:'🗂️' },
    { id:'grouping',  label:'Run AI Grouping',    icon:'✦'  },
    { id:'students',  label:'All Students',       icon:'🎓' },
  ]
  return (
    <>
      <div style={{ padding:'24px 20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--yellow-500)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--brown-900)', fontFamily:'var(--font-serif)' }}>S</span>
          </div>
          <span style={{ fontFamily:'var(--font-serif)', fontWeight:600, fontSize:13, color:'#fff' }}>Student Hour</span>
        </div>
        <div style={{ fontSize:10, color:'var(--yellow-400)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.07em' }}>Admin</div>
        <div style={{ fontSize:15, fontWeight:600, color:'#fff' }}>{firstName}</div>
      </div>
      <nav style={{ flex:1, padding:'0 10px' }}>
        {items.map(item => (
          <button key={item.id} onClick={() => { setActive(item.id); onClose?.() }} style={{
            display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left',
            padding:'11px 12px', borderRadius:'var(--radius-md)', fontSize:14, cursor:'pointer',
            border:'none', marginBottom:2, fontFamily:'var(--font-sans)',
            background: active===item.id ? 'rgba(245,200,66,0.15)' : 'transparent',
            color: active===item.id ? 'var(--yellow-400)' : 'rgba(255,255,255,0.55)',
            transition:'all 0.15s'
          }}>
            <span style={{ fontSize:15 }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding:'10px 10px 24px' }}>
        <button onClick={signOut} style={{ width:'100%', padding:'10px', fontSize:13, background:'rgba(255,255,255,0.05)', border:'none', borderRadius:'var(--radius-md)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'var(--font-sans)', textAlign:'left' }}>Sign out</button>
      </div>
    </>
  )
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [active, setActive] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState({})
  const [statsError, setStatsError] = useState('')
  const firstName = profile?.full_name?.split(' ')[0] || 'Admin'

  useEffect(() => {
    apiFetch('/api/admin/overview')
      .then(d => setStats(d))
      .catch(e => setStatsError(e.message))
  }, [])

  const titles = { overview:'Overview', tutors:'Manage Tutors', groups:'Groups & Tutor Assignment', grouping:'AI Grouping Engine', students:'All Students' }

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ background:'var(--brown-900)' }}>
        <AdminSidebar active={active} setActive={setActive} firstName={firstName} signOut={signOut} onClose={() => setSidebarOpen(false)} />
      </aside>

      <main className="app-main">
        <div style={{ padding:'13px 18px', borderBottom:'1px solid var(--border-soft)', display:'flex', alignItems:'center', gap:10, background:'#fff', flexShrink:0 }}>
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu"><span /><span /><span /></button>
          <span style={{ fontWeight:600, fontSize:15, color:'var(--brown-900)' }}>{titles[active]}</span>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 18px' }}>
          {statsError && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#c0392b', marginBottom:16 }}>
              API error: {statsError}. Make sure VITE_API_URL is set in Netlify environment variables.
            </div>
          )}
          {active==='overview' && <OverviewPanel stats={stats} />}
          {active==='tutors'   && <TutorManager />}
          {active==='groups'   && <GroupManager />}
          {active==='grouping' && <AIGroupingPanel />}
          {active==='students' && <StudentsList />}
        </div>
      </main>
    </div>
  )
}

function OverviewPanel({ stats }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
        {[['Total Students', stats.studentCount, '🎓'],['Active Groups', stats.groupCount, '🗂️'],['Tutors', stats.tutorCount, '👥']].map(([l,v,icon]) => (
          <div key={l} className="card" style={{ textAlign:'center', padding:'20px 12px' }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(28px,6vw,42px)', fontWeight:700, color:'var(--yellow-500)', lineHeight:1 }}>{v ?? '—'}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ background:'var(--brown-50)', marginBottom:16 }}>
        <div style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)', marginBottom:8 }}>Quick guide</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            ['1','Students sign up and fill in their weak courses'],
            ['2','Run AI Grouping to group them automatically'],
            ['3','Create tutor logins and assign tutors to groups'],
            ['4','Tutors upload resources and Professor Nova teaches'],
          ].map(([n,t]) => (
            <div key={n} style={{ display:'flex', gap:10, alignItems:'flex-start', fontSize:13, color:'var(--text-secondary)' }}>
              <span style={{ background:'var(--yellow-500)', color:'var(--brown-900)', width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{n}</span>
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TutorManager() {
  const [form, setForm] = useState({ fullName:'', email:'' })
  const [status, setStatus] = useState(null)
  const [tutors, setTutors] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiFetch('/api/admin/tutors')
      .then(d => setTutors(d.tutors || []))
      .catch(() => {})
  }, [])

  async function createTutor(e) {
    e.preventDefault()
    setLoading(true); setStatus(null)
    try {
      const data = await apiFetch('/api/admin/create-tutor', 'POST', form)
      if (data.tutor) {
        setStatus({ type:'success', tutor: data.tutor })
        setForm({ fullName:'', email:'' })
        setTutors(p => [...p, data.tutor])
      } else {
        setStatus({ type:'error', message: data.error || 'Unknown error' })
      }
    } catch(e) {
      setStatus({ type:'error', message: e.message })
    }
    setLoading(false)
  }

  function copyCredentials() {
    if (!status?.tutor) return
    const text = `The Student Hour — Tutor Login\nURL: ${window.location.origin}/login\nEmail: ${status.tutor.email}\nPassword: ${status.tutor.tempPassword}`
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div style={{ maxWidth:680 }}>
      {/* How tutors sign in - explainer */}
      <div style={{ background:'var(--yellow-50)', border:'1px solid var(--yellow-300)', borderRadius:'var(--radius-lg)', padding:'16px 18px', marginBottom:24 }}>
        <div style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)', marginBottom:6 }}>How tutor login works</div>
        <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7 }}>
          Tutors do not sign up themselves. You create their account here, then share the email + password with them directly (WhatsApp, email, etc.).<br />
          They log in at <strong>{window.location.origin}/login</strong> using those credentials and land on their Tutor Dashboard.
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={createTutor} className="card" style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:24 }}>
        <h3 style={{ fontWeight:600, fontSize:15, color:'var(--brown-900)' }}>Generate new tutor login</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:12 }}>
          <div>
            <label className="label">Tutor's full name</label>
            <input className="input-field" placeholder="e.g. Dr. Amara Osei" value={form.fullName}
              onChange={e => setForm({...form, fullName:e.target.value})} required />
          </div>
          <div>
            <label className="label">Email address</label>
            <input className="input-field" type="email" placeholder="tutor@example.com" value={form.email}
              onChange={e => setForm({...form, email:e.target.value})} required />
          </div>
        </div>
        <button type="submit" className="btn-primary" style={{ width:'100%', padding:12 }} disabled={loading}>
          {loading ? 'Creating account...' : 'Generate tutor login'}
        </button>

        {/* Success — show credentials clearly */}
        {status?.type === 'success' && (
          <div style={{ background:'#f0fdf4', border:'2px solid #86efac', borderRadius:'var(--radius-lg)', padding:'18px 16px' }}>
            <div style={{ fontWeight:700, fontSize:15, color:'#166534', marginBottom:14 }}>
              ✓ Tutor account created!
            </div>
            <div style={{ background:'#fff', border:'1px solid #86efac', borderRadius:8, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#166534', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Login URL</div>
                <div style={{ fontSize:14, color:'#1a1a1a', fontFamily:'monospace', background:'#f0fdf4', padding:'6px 10px', borderRadius:6 }}>{window.location.origin}/login</div>
              </div>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#166534', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Email</div>
                <div style={{ fontSize:14, color:'#1a1a1a', fontFamily:'monospace', background:'#f0fdf4', padding:'6px 10px', borderRadius:6 }}>{status.tutor.email}</div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'#166534', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Password</div>
                <div style={{ fontSize:18, fontWeight:700, color:'#1a1a1a', fontFamily:'monospace', background:'#f0fdf4', padding:'8px 10px', borderRadius:6, letterSpacing:'0.1em' }}>{status.tutor.tempPassword}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <button type="button" onClick={copyCredentials} className="btn-accent" style={{ padding:'9px 18px', fontSize:13 }}>
                {copied ? '✓ Copied!' : '📋 Copy all credentials'}
              </button>
              <span style={{ fontSize:12, color:'#166534' }}>Send these to the tutor directly. They should change their password after first login.</span>
            </div>
          </div>
        )}

        {status?.type === 'error' && (
          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#c0392b' }}>
            {status.message}
          </div>
        )}
      </form>

      {/* Existing tutors list */}
      <h3 style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)', marginBottom:12 }}>All tutors ({tutors.length})</h3>
      {tutors.length === 0
        ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>No tutors created yet.</p>
        : tutors.map(t => (
          <div key={t.id} className="card" style={{ marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)' }}>{t.full_name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{t.email}</div>
            </div>
            <span className="badge badge-brown">Tutor</span>
          </div>
        ))
      }
    </div>
  )
}

function GroupManager() {
  const [groups, setGroups] = useState([])
  const [tutors, setTutors] = useState([])
  const [assigning, setAssigning] = useState({})
  const [status, setStatus] = useState({})

  useEffect(() => {
    apiFetch('/api/admin/groups').then(d => setGroups(d.groups || [])).catch(()=>{})
    apiFetch('/api/admin/tutors').then(d => setTutors(d.tutors || [])).catch(()=>{})
  }, [])

  async function assign(groupId, tutorId) {
    if (!tutorId) return
    setStatus(p => ({...p, [groupId]:'Assigning...'}))
    try {
      const data = await apiFetch('/api/admin/assign-tutor', 'POST', { groupId, tutorId })
      setStatus(p => ({...p, [groupId]: data.success ? '✓ Assigned!' : 'Error: ' + data.error}))
      // Refresh groups
      apiFetch('/api/admin/groups').then(d => setGroups(d.groups || []))
    } catch(e) {
      setStatus(p => ({...p, [groupId]: 'Error: ' + e.message}))
    }
  }

  return (
    <div style={{ maxWidth:760 }}>
      {groups.length === 0
        ? <div style={{ padding:'20px 0', color:'var(--text-muted)', fontSize:14 }}>No groups yet. Go to "Run AI Grouping" first.</div>
        : groups.map(g => {
          const assignedTutor = g.tutor_assignments?.[0]?.profiles?.full_name
          return (
            <div key={g.id} className="card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:15, color:'var(--brown-900)' }}>{g.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{g.focus}</div>
                </div>
                {assignedTutor
                  ? <span className="badge badge-yellow" style={{ flexShrink:0, fontSize:11 }}>📌 {assignedTutor}</span>
                  : <span className="badge badge-brown" style={{ flexShrink:0, fontSize:11 }}>No tutor yet</span>
                }
              </div>
              {g.shared_courses?.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                  {g.shared_courses.map(c => <span key={c} className="badge badge-brown" style={{ fontSize:10 }}>{c}</span>)}
                </div>
              )}
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <select defaultValue="" onChange={e => setAssigning(p => ({...p, [g.id]:e.target.value}))}
                  style={{ flex:1, minWidth:140, padding:'9px 12px', borderRadius:'var(--radius-md)', border:'1.5px solid var(--border)', fontSize:13, fontFamily:'var(--font-sans)', color:'var(--text-primary)', background:'#fff' }}>
                  <option value="" disabled>Select tutor to assign...</option>
                  {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <button className="btn-primary" style={{ padding:'9px 16px', fontSize:13 }}
                  onClick={() => assign(g.id, assigning[g.id])} disabled={!assigning[g.id]}>
                  Assign
                </button>
                {status[g.id] && (
                  <span style={{ fontSize:12, color: status[g.id].startsWith('✓') ? 'var(--brown-600)' : '#c0392b' }}>
                    {status[g.id]}
                  </span>
                )}
              </div>
            </div>
          )
        })
      }
    </div>
  )
}

function AIGroupingPanel() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true); setResult(null)
    try {
      const data = await apiFetch('/api/grouping/run', 'POST')
      setResult(data)
    } catch(e) {
      setResult({ error: e.message })
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth:580 }}>
      <div className="card" style={{ background:'var(--brown-50)', marginBottom:20 }}>
        <div style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)', marginBottom:8 }}>What this does</div>
        <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.75 }}>
          This takes all students who have completed onboarding but haven't been placed in a group yet, and uses AI to match them into cohorts of 3–5 based on shared course codes and similar weaknesses. Run this whenever new students sign up.
        </p>
      </div>
      <button className="btn-accent" style={{ padding:'14px 28px', fontSize:15, width:'100%' }}
        onClick={run} disabled={loading}>
        {loading ? 'Running AI grouping...' : '✦ Run AI grouping now'}
      </button>
      {result && (
        <div style={{ marginTop:18, background: result.error ? '#fef2f2' : 'var(--yellow-50)', border:`1px solid ${result.error ? '#fca5a5' : 'var(--yellow-300)'}`, borderRadius:'var(--radius-lg)', padding:18 }}>
          {result.error
            ? <p style={{ color:'#c0392b', fontSize:14 }}>{result.error}</p>
            : result.studentsGrouped === 0
            ? <p style={{ fontSize:14, color:'var(--text-secondary)' }}>{result.message || 'No ungrouped students found. All onboarded students already have a group.'}</p>
            : <>
                <div style={{ fontWeight:600, color:'var(--brown-900)', marginBottom:8 }}>✓ Grouping complete!</div>
                <div style={{ fontSize:14, color:'var(--text-secondary)' }}>Groups created: <strong>{result.groupsCreated}</strong></div>
                <div style={{ fontSize:14, color:'var(--text-secondary)' }}>Students grouped: <strong>{result.studentsGrouped}</strong></div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:8 }}>Now go to Groups & Tutors to assign a tutor to each group.</div>
              </>
          }
        </div>
      )}
    </div>
  )
}

function StudentsList() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email, university, department, onboarding_complete, session_count, group_id, created_at')
      .eq('role', 'student').order('created_at', { ascending:false })
      .then(({ data }) => { setStudents(data || []); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color:'var(--text-muted)', fontSize:14 }}>Loading students...</div>

  return (
    <div>
      <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14 }}>{students.length} students total</div>
      {students.length === 0
        ? <p style={{ color:'var(--text-muted)', fontSize:14 }}>No students yet.</p>
        : students.map(s => (
          <div key={s.id} className="card" style={{ marginBottom:10, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:'var(--brown-900)' }}>{s.full_name || 'No name'}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.university} · {s.department}</div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                {s.onboarding_complete
                  ? <span className="badge badge-yellow" style={{ fontSize:10 }}>Onboarded</span>
                  : <span className="badge badge-brown" style={{ fontSize:10 }}>Pending</span>
                }
                {s.group_id
                  ? <span className="badge badge-yellow" style={{ fontSize:10 }}>Grouped</span>
                  : <span className="badge badge-brown" style={{ fontSize:10 }}>No group</span>
                }
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
              {s.session_count || 0} Nova sessions · Joined {new Date(s.created_at).toLocaleDateString()}
            </div>
          </div>
        ))
      }
    </div>
  )
}
