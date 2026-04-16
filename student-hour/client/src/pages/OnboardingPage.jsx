import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function OnboardingPage() {
  const { user, profile, refetchProfile } = useAuth()
  const navigate = useNavigate()
  const [department, setDepartment] = useState('')
  const [university, setUniversity] = useState('')
  const [courses, setCourses] = useState([{ code: '', title: '', weakness: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Already onboarded? go to dashboard
  if (profile?.onboarding_complete) return <Navigate to="/dashboard" replace />

  function addCourse() { if (courses.length < 6) setCourses([...courses, { code: '', title: '', weakness: '' }]) }
  function removeCourse(i) { setCourses(courses.filter((_,idx) => idx !== i)) }
  function updateCourse(i, f, v) { const u = [...courses]; u[i][f] = v; setCourses(u) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const valid = courses.filter(c => c.code && c.title)
    if (!valid.length) { setError('Add at least one course with a code and title.'); setLoading(false); return }

    const { error: pe } = await supabase.from('profiles').upsert({
      id: user.id, department, university, role: 'student', onboarding_complete: true,
      full_name: profile?.full_name || user.user_metadata?.full_name || ''
    })
    if (pe) { setError(pe.message); setLoading(false); return }

    const { error: ce } = await supabase.from('student_courses').insert(
      valid.map(c => ({ student_id: user.id, course_code: c.code.trim().toUpperCase(), course_title: c.title.trim(), weakness_description: c.weakness.trim() }))
    )
    if (ce) { setError(ce.message); setLoading(false); return }

    await refetchProfile()
    navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', padding: '40px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <span className="badge badge-yellow" style={{ marginBottom: 14 }}>One-time setup</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px,5vw,30px)', fontWeight: 700, color: 'var(--brown-900)', marginBottom: 10 }}>
            Tell us where you need help
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>
            This is how we group you with the right students and how Professor Nova learns about you. You only do this once.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* About you */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--brown-900)' }}>About you</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label className="label">University / Institution</label>
                <input className="input-field" placeholder="e.g. University of Lagos" value={university}
                  onChange={e => setUniversity(e.target.value)} required />
              </div>
              <div>
                <label className="label">Department / Faculty</label>
                <input className="input-field" placeholder="e.g. Computer Science" value={department}
                  onChange={e => setDepartment(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Courses */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--brown-900)' }}>
                Courses you need help with
              </h2>
              {courses.length < 6 && (
                <button type="button" onClick={addCourse} className="btn-outline" style={{ padding: '7px 14px', fontSize: 13 }}>
                  + Add course
                </button>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -6 }}>
              Add the course code and title for each subject you struggle with. The more specific you are, the better Professor Nova can help.
            </p>

            {courses.map((course, i) => (
              <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '16px', position: 'relative', border: '1px solid var(--border-soft)' }}>
                {courses.length > 1 && (
                  <button type="button" onClick={() => removeCourse(i)}
                    style={{ position: 'absolute', top: 10, right: 12, background: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1, border: 'none' }}>×</button>
                )}
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brown-600)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Course {i + 1}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label className="label">Course code</label>
                    <input className="input-field" placeholder="e.g. MTH301" value={course.code}
                      onChange={e => updateCourse(i, 'code', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Course title</label>
                    <input className="input-field" placeholder="e.g. Real Analysis" value={course.title}
                      onChange={e => updateCourse(i, 'title', e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="label">What specifically are you struggling with?</label>
                  <input className="input-field" placeholder="e.g. Integration techniques, epsilon-delta proofs, word problems..."
                    value={course.weakness} onChange={e => updateCourse(i, 'weakness', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 13, color: '#c0392b' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-accent" style={{ padding: 14, fontSize: 15, width: '100%' }} disabled={loading}>
            {loading ? 'Setting up your profile...' : 'Complete setup and meet Professor Nova →'}
          </button>
        </form>
      </div>
    </div>
  )
}
