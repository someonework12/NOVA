import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import GroupChat from '../components/GroupChat.jsx'

const API = () => import.meta.env.VITE_API_URL || ''
async function apiFetch(path, method='GET', body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API()}${path}`, { method, headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`}, body:body?JSON.stringify(body):undefined })
  const data = await res.json(); if(!res.ok) throw new Error(data?.error||'Request failed'); return data
}

function Sidebar({ active, setActive, firstName, signOut, group, onClose }) {
  const items = [
    {id:'chat',label:'Group Chat',icon:''},
    {id:'courses',label:'My Courses',icon:''},
    {id:'tasks',label:'My Tasks',icon:''},
    {id:'resources',label:'Resources',icon:''},
    {id:'schedule',label:'Study Schedule',icon:''},
  ]
  return (
    <>
      <div style={{padding:'24px 20px 18px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
          <div style={{width:30,height:30,borderRadius:'50%',background:'var(--yellow-500)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:13,fontWeight:700,color:'var(--brown-900)',fontFamily:'var(--font-serif)'}}>S</span>
          </div>
          <span style={{fontFamily:'var(--font-serif)',fontWeight:600,fontSize:14,color:'#fff'}}>Student Hour</span>
        </div>
        <div style={{fontSize:10,color:'var(--brown-400)',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.06em'}}>Welcome back</div>
        <div style={{fontSize:15,fontWeight:600,color:'#fff'}}>{firstName}</div>
        {group && <div style={{fontSize:11,color:'var(--brown-400)',marginTop:4}}>{group.name}</div>}
      </div>
      <nav style={{flex:1,padding:'0 10px'}}>
        {items.map(item=>(
          <button key={item.id} onClick={()=>{setActive(item.id);onClose?.()}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',textAlign:'left',padding:'11px 12px',borderRadius:'var(--radius-md)',fontSize:14,cursor:'pointer',border:'none',marginBottom:2,fontFamily:'var(--font-sans)',background:active===item.id?'rgba(245,200,66,0.15)':'transparent',color:active===item.id?'var(--yellow-400)':'rgba(255,255,255,0.55)'}}>
            {item.label}
          </button>
        ))}
        <div style={{margin:'10px 0',borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:10}}>
          <Link to="/dashboard/nova" onClick={onClose} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 12px',borderRadius:'var(--radius-md)',fontSize:14,background:'rgba(245,200,66,0.1)',color:'var(--yellow-300)',border:'1px solid rgba(245,200,66,0.2)',textDecoration:'none'}}>
            <span style={{fontSize:15}}></span> Professor Nova
          </Link>
        </div>
      </nav>
      <div style={{padding:'10px 10px 24px'}}>
        <button onClick={signOut} style={{width:'100%',padding:'10px',fontSize:13,background:'rgba(255,255,255,0.05)',border:'none',borderRadius:'var(--radius-md)',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:'var(--font-sans)',textAlign:'left'}}>Sign out</button>
      </div>
    </>
  )
}

export default function StudentDashboard() {
  const {profile,signOut} = useAuth()
  const {group,members} = useGroup()
  const [active,setActive] = useState('chat')
  const [sidebarOpen,setSidebarOpen] = useState(false)
  const firstName = profile?.full_name?.split(' ')[0]||'Student'
  const titles = {chat:group?.name||'Group Chat',courses:'My Courses',tasks:'My Tasks',resources:'Resources',schedule:'Study Schedule'}
  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen?'open':''}`} onClick={()=>setSidebarOpen(false)} />
      <aside className={`app-sidebar ${sidebarOpen?'open':''}`} style={{background:'var(--brown-900)'}}>
        <Sidebar active={active} setActive={setActive} firstName={firstName} signOut={signOut} group={group} onClose={()=>setSidebarOpen(false)} />
      </aside>
      <main className="app-main">
        <div style={{padding:'13px 18px',borderBottom:'1px solid var(--border-soft)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="hamburger" onClick={()=>setSidebarOpen(true)} aria-label="Menu"><span/><span/><span/></button>
            <span style={{fontWeight:600,fontSize:15,color:'var(--brown-900)'}}>{titles[active]}</span>
            {active==='chat'&&group&&<span style={{fontSize:11,color:'var(--text-muted)'}}>{members.length} members</span>}
          </div>
          {group?.focus&&<span className="badge badge-yellow" style={{fontSize:11,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{group.focus}</span>}
        </div>
        <div style={{flex:1,overflow:'hidden'}}>
          {active==='chat'     &&<GroupChat groupId={profile?.group_id} groupName={group?.name}/>}
          {active==='courses'  &&<CoursesView studentId={profile?.id}/>}
          {active==='tasks'    &&<TasksView groupId={profile?.group_id}/>}
          {active==='resources'&&<ResourcesView groupId={profile?.group_id}/>}
          {active==='schedule' &&<ScheduleView/>}
        </div>
      </main>
    </div>
  )
}

function CoursesView({studentId}) {
  const [courses,setCourses] = useState([])
  const [loading,setLoading] = useState(true)
  const [showAdd,setShowAdd] = useState(false)
  const [form,setForm] = useState({code:'',title:'',weakness:''})
  const [saving,setSaving] = useState(false)
  const [msg,setMsg] = useState('')

  useEffect(()=>{
    if(!studentId) return
    supabase.from('student_courses').select('*').eq('student_id',studentId).order('created_at')
      .then(({data})=>{setCourses(data||[]);setLoading(false)})
  },[studentId])

  async function addCourse(e) {
    e.preventDefault(); setSaving(true); setMsg('')
    const {data,error} = await supabase.from('student_courses').insert({
      student_id:studentId, course_code:form.code.trim().toUpperCase(),
      course_title:form.title.trim(), weakness_description:form.weakness.trim()
    }).select().single()
    if(error){setMsg('Error: '+error.message)}
    else{setCourses(p=>[...p,data]);setForm({code:'',title:'',weakness:''});setShowAdd(false);setMsg('Course added! Professor Nova now knows about this.')}
    setSaving(false)
  }

  async function removeCourse(id) {
    if(!confirm('Remove this course?')) return
    await supabase.from('student_courses').delete().eq('id',id)
    setCourses(p=>p.filter(c=>c.id!==id))
  }

  if(loading) return <Empty text="Loading your courses..."/>

  return (
    <div style={{padding:'20px 18px',overflowY:'auto',height:'100%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <p style={{fontSize:13,color:'var(--text-secondary)',maxWidth:400}}>
          These courses are what Professor Nova uses to teach you. Keep them updated — the more specific your struggles, the better Nova can help.
        </p>
        <button onClick={()=>setShowAdd(v=>!v)} className="btn-accent" style={{padding:'8px 16px',fontSize:13,flexShrink:0}}>
          {showAdd?'Cancel':'Add course'}
        </button>
      </div>

      {msg&&<div style={{fontSize:13,color:msg.startsWith('Error')?'#c0392b':'var(--brown-600)',marginBottom:14,padding:'10px 14px',background:msg.startsWith('Error')?'#fef2f2':'var(--yellow-50)',borderRadius:8,border:`1px solid ${msg.startsWith('Error')?'#fca5a5':'var(--yellow-300)'}`}}>{msg}</div>}

      {showAdd&&(
        <form onSubmit={addCourse} style={{background:'var(--surface-2)',border:'1px solid var(--border-soft)',borderRadius:'var(--radius-lg)',padding:'16px',marginBottom:16,display:'flex',flexDirection:'column',gap:12}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'var(--brown-900)'}}>Add a course</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
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
            <label className="label">What are you struggling with?</label>
            <input className="input-field" placeholder="e.g. Integration techniques, epsilon-delta proofs..." value={form.weakness} onChange={e=>setForm({...form,weakness:e.target.value})}/>
          </div>
          <button type="submit" className="btn-primary" style={{width:'100%',padding:11}} disabled={saving}>
            {saving?'Adding...':'Add course'}
          </button>
        </form>
      )}

      {courses.length===0?(
        <div style={{background:'var(--yellow-50)',border:'1px solid var(--yellow-300)',borderRadius:'var(--radius-lg)',padding:'20px',textAlign:'center'}}>
          <div style={{fontWeight:600,fontSize:15,color:'var(--brown-900)',marginBottom:8}}>No courses yet</div>
          <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>Add the courses you're struggling with — Professor Nova will use them when teaching you.</p>
          <button onClick={()=>setShowAdd(true)} className="btn-accent" style={{padding:'9px 18px',fontSize:13}}>+ Add your first course</button>
        </div>
      ):courses.map(c=>(
        <div key={c.id} className="card" style={{marginBottom:10,padding:'14px 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4,flexWrap:'wrap'}}>
                <span className="badge badge-yellow" style={{fontSize:11}}>{c.course_code}</span>
                <span style={{fontWeight:600,fontSize:14,color:'var(--brown-900)'}}>{c.course_title}</span>
              </div>
              {c.weakness_description&&<div style={{fontSize:12,color:'var(--text-muted)'}}>Struggling with: {c.weakness_description}</div>}
            </div>
            <button onClick={()=>removeCourse(c.id)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:20,lineHeight:1,padding:'0 2px',flexShrink:0}} title="Remove">×</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function TasksView({groupId}) {
  const [tasks,setTasks] = useState([])
  useEffect(()=>{ if(!groupId) return; supabase.from('tasks').select('*').eq('group_id',groupId).order('due_date').then(({data})=>setTasks(data||[])) },[groupId])
  if(!groupId) return <Empty text="You haven't been assigned to a group yet."/>
  return (
    <div style={{padding:'20px 18px',overflowY:'auto',height:'100%'}}>
      {tasks.length===0?<Empty text="No tasks yet. Your tutor will assign them here."/>
      :tasks.map(t=>(
        <div key={t.id} className="card" style={{marginBottom:12}}>
          <div style={{fontWeight:600,fontSize:14,color:'var(--brown-900)',marginBottom:6}}>{t.title}</div>
          {t.description&&<p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.7,marginBottom:8}}>{t.description}</p>}
          {t.due_date&&<span className="badge badge-yellow">Due: {new Date(t.due_date).toLocaleDateString()}</span>}
        </div>
      ))}
    </div>
  )
}

function ResourcesView({groupId}) {
  const [resources,setResources] = useState([])
  useEffect(()=>{ if(!groupId) return; supabase.from('group_resources').select('*').eq('group_id',groupId).order('created_at',{ascending:false}).then(({data})=>setResources(data||[])) },[groupId])
  if(!groupId) return <Empty text="You haven't been assigned to a group yet."/>
  return (
    <div style={{padding:'20px 18px',overflowY:'auto',height:'100%'}}>
      {resources.length===0?<Empty text="No resources yet. Your tutor will upload study materials here."/>
      :resources.map(r=>(
        <div key={r.id} className="card" style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:8}}>
            <div style={{fontWeight:600,fontSize:14,color:'var(--brown-900)'}}>{r.title}</div>
            {r.for_nova&&<span className="badge badge-yellow" style={{fontSize:10,flexShrink:0}}>Fed to Nova</span>}
          </div>
          {r.content_text&&<p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.7}}>{r.content_text.slice(0,300)}{r.content_text.length>300?'...':''}</p>}
          {r.file_url&&<a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:'var(--brown-600)',fontWeight:500,display:'inline-block',marginTop:8}}>View / Download →</a>}
        </div>
      ))}
    </div>
  )
}

function ScheduleView() {
  const [schedule,setSchedule] = useState(null)
  const [loading,setLoading] = useState(true)
  const [generating,setGenerating] = useState(false)
  const [error,setError] = useState('')
  useEffect(()=>{ apiFetch('/api/schedule/my-schedule').then(d=>{setSchedule(d.schedule);setLoading(false)}).catch(()=>setLoading(false)) },[])
  async function generate() {
    setGenerating(true); setError('')
    try{const d=await apiFetch('/api/schedule/generate','POST',{weeksAhead:1});setSchedule(d.schedule)}
    catch(e){setError(e.message)}
    setGenerating(false)
  }
  if(loading) return <Empty text="Loading your schedule..."/>
  return (
    <div style={{padding:'20px 18px',overflowY:'auto',height:'100%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <p style={{fontSize:13,color:'var(--text-secondary)'}}>Your personalised 7-day study plan.</p>
        <button onClick={generate} className="btn-accent" style={{padding:'9px 16px',fontSize:13}} disabled={generating}>
          {generating?'Generating...':schedule?'Regenerate':'Generate schedule'}
        </button>
      </div>
      {error&&<div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#c0392b',marginBottom:14}}>{error}</div>}
      {!schedule?(
        <div style={{background:'var(--yellow-50)',border:'1px solid var(--yellow-300)',borderRadius:'var(--radius-lg)',padding:'20px',textAlign:'center'}}>
          <div style={{fontWeight:600,fontSize:14,color:'var(--brown-900)',marginBottom:8}}>No schedule yet</div>
          <p style={{fontSize:13,color:'var(--text-secondary)'}}>Click Generate — Nova will build your personal study plan from your courses.</p>
        </div>
      ):schedule.map((day,i)=>(
        <div key={i} className="card" style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:14,color:'var(--brown-900)'}}>{day.date}</div>
            {day.total_hours&&<span className="badge badge-yellow">{day.total_hours}h</span>}
          </div>
          {day.sessions?.map((s,j)=>(
            <div key={j} style={{borderLeft:'3px solid var(--yellow-500)',paddingLeft:12,marginBottom:j<day.sessions.length-1?12:0}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:3}}>
                <div style={{fontWeight:500,fontSize:13,color:'var(--brown-800)'}}>{s.course_code} — {s.topic}</div>
                <span style={{fontSize:11,color:'var(--text-muted)',flexShrink:0}}>{s.duration_hours}h</span>
              </div>
              {s.resources&&<div style={{fontSize:12,color:'var(--text-muted)'}}>{s.resources}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Empty({text}) { return <div style={{padding:'32px 20px',color:'var(--text-muted)',fontSize:14}}>{text}</div> }
