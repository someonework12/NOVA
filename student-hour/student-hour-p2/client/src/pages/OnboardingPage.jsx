import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [department, setDepartment] = useState('')
  const [university, setUniversity] = useState('')
  const [courses, setCourses] = useState([{ code: '', title: '', weakness: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addCourse() {
    if (courses.length < 6) setCourses([...courses, { code: '', title: '', weakness: '' }])
  }

  function removeCourse(i) {
    setCourses(courses.filter((_, idx) => idx !== i))
  }

  function updateCourse(i, field, val) {
    const updated = [...courses]
    updated[i][field] = val
    setCourses(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const validCourses = courses.filter(c => c.code && c.title)
    if (!validCourses.length) { setError('Add at least one course.'); setLoading(false); return }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id, department, university, role: 'student', onboarding_complete: true
    })
    if (profileError) { setError(profileError.message); setLoading(false); return }

    const courseRows = validCourses.map(c => ({ student_id: user.id, course_code: c.code, course_title: c.title, weakness_description: c.weakness }))
    const { error: courseError } = await supabase.from('student_courses').insert(courseRows)
    if (courseError) { setError(courseError.message); setLoading(false); return }

    navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <span className="badge badge-yellow" style={{ marginBottom: 16 }}>Step 1 of 1</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 700, color: 'var(--brown-900)', marginBottom: 12 }}>
            Tell us where you need help
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7 }}>
            This helps us group you with students facing the same challenges and build your Professor Nova profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--brown-900)' }}>About you</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">University</label>
                <input className="input-field" placeholder="e.g. University of Lagos" value={university} onChange={e => setUniversity(e.target.value)} required />
              </div>
              <div>
                <label className="label">Department / Faculty</label>
                <input className="input-field" placeholder="e.g. Computer Science" value={department} onChange={e => setDepartment(e.target.value)} required />
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--brown-900)' }}>Courses you need help with</h2>
              {courses.length < 6 && (
                <button type="button" onClick={addCourse} className="btn-outline" style={{ padding: '7px 16px', fontSize: 13 }}>+ Add course</button>
              )}
            </div>

            {courses.map((course, i) => (
              <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: 20, position: 'relative' }}>
                {courses.length > 1 && (
                  <button type="button" onClick={() => removeCourse(i)} style={{ position: 'absolute', top: 14, right: 16, background: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
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
                  <label className="label">What specifically are you struggling with? (optional)</label>
                  <input className="input-field" placeholder="e.g. Integration techniques, proofs, word problems..."
                    value={course.weakness} onChange={e => updateCourse(i, 'weakness', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {error && <p style={{ fontSize: 14, color: '#c0392b' }}>{error}</p>}

          <button type="submit" className="btn-accent" style={{ padding: '14px', fontSize: 16, width: '100%' }} disabled={loading}>
            {loading ? 'Setting up your profile...' : 'Complete setup — meet Professor Nova'}
          </button>
        </form>
      </div>
    </div>
  )
}
