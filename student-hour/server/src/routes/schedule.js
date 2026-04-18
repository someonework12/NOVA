import { Router } from 'express'
import Groq from 'groq-sdk'
import { adminSupabase } from '../middleware/auth.js'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Generate a weekly reading schedule for a student
router.post('/generate', async (req, res) => {
  try {
    const studentId = req.user.id
    const { weeksAhead = 1 } = req.body

    const { data: profile } = await adminSupabase.from('profiles').select('full_name, department').eq('id', studentId).single()
    const { data: courses } = await adminSupabase.from('student_courses').select('*').eq('student_id', studentId)
    const { data: tasks } = await adminSupabase.from('tasks')
      .select('title, description, due_date')
      .eq('group_id', req.profile?.group_id)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date')
      .limit(10)

    if (!courses?.length) return res.json({ error: 'No courses found for this student' })

    const today = new Date()
    const days = Array.from({ length: 7 * weeksAhead }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() + i)
      return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    })

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{
        role: 'user',
        content: `You are an academic study planner. Generate a realistic ${weeksAhead}-week daily reading schedule for this student.

Student: ${profile?.full_name}
Department: ${profile?.department}
Courses and weak areas:
${courses.map(c => `- ${c.course_code} (${c.course_title}): ${c.weakness_description || 'General difficulty'}`).join('\n')}

Upcoming tasks/deadlines:
${tasks?.length ? tasks.map(t => `- ${t.title} — due ${t.due_date}`).join('\n') : 'None assigned yet'}

Days to cover: ${days.join(', ')}

Rules:
- No studying on Sundays (rest day)
- Maximum 3 hours study per day
- Rotate between courses so no subject is neglected
- Prioritize weaker courses
- Include specific topics to study, not just course names
- Keep each day's plan concise and actionable

Respond ONLY with valid JSON, no markdown:
{
  "schedule": [
    {
      "date": "Monday, 17 Jun",
      "total_hours": 2.5,
      "sessions": [
        {
          "course_code": "MTH301",
          "course_title": "Real Analysis",
          "topic": "Epsilon-delta proofs — practice problems 1-10",
          "duration_hours": 1.5,
          "resources": "Textbook Chapter 3, past questions set A"
        }
      ]
    }
  ]
}`
      }],
      temperature: 0.4,
      max_tokens: 2048
    })

    const raw = completion.choices[0].message.content.replace(/```json|```/g, '').trim()
    const { schedule } = JSON.parse(raw)

    // Save schedule to DB
    await adminSupabase.from('reading_schedules').upsert({
      student_id: studentId,
      schedule_data: schedule,
      generated_at: new Date().toISOString(),
      weeks_ahead: weeksAhead
    })

    res.json({ schedule })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Get saved schedule
router.get('/my-schedule', async (req, res) => {
  try {
    const { data } = await adminSupabase
      .from('reading_schedules')
      .select('*')
      .eq('student_id', req.user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()
    res.json({ schedule: data?.schedule_data || null, generatedAt: data?.generated_at || null })
  } catch {
    res.json({ schedule: null })
  }
})

export default router
