import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { adminSupabase, requireRole } from '../middleware/auth.js'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

router.post('/run', requireRole('admin'), async (req, res) => {
  try {
    const { data: ungroupedStudents } = await adminSupabase
      .from('profiles')
      .select('id, full_name, department, university')
      .eq('role', 'student')
      .is('group_id', null)
      .eq('onboarding_complete', true)

    if (!ungroupedStudents?.length) return res.json({ message: 'No ungrouped students found', grouped: 0 })

    const studentIds = ungroupedStudents.map(s => s.id)
    const { data: courses } = await adminSupabase
      .from('student_courses')
      .select('*')
      .in('student_id', studentIds)

    const studentMap = ungroupedStudents.map(s => ({
      ...s,
      courses: courses.filter(c => c.student_id === s.id)
    }))

    const prompt = `You are an academic grouping engine. Group these students into cohorts of 3-5 based on shared course codes and similar weaknesses. Students in the same group should ideally share at least one course.

Students:
${JSON.stringify(studentMap, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "groups": [
    {
      "name": "Group name (e.g. MTH301 Study Circle)",
      "student_ids": ["uuid1", "uuid2"],
      "shared_courses": ["MTH301"],
      "focus": "Brief description of group focus"
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = message.content[0].text.replace(/```json|```/g, '').trim()
    const { groups } = JSON.parse(raw)

    let totalGrouped = 0
    for (const group of groups) {
      const { data: newGroup } = await adminSupabase
        .from('groups')
        .insert({ name: group.name, shared_courses: group.shared_courses, focus: group.focus })
        .select()
        .single()

      await adminSupabase
        .from('profiles')
        .update({ group_id: newGroup.id })
        .in('id', group.student_ids)

      totalGrouped += group.student_ids.length
    }

    res.json({ success: true, groupsCreated: groups.length, studentsGrouped: totalGrouped })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/my-group', async (req, res) => {
  try {
    if (!req.profile?.group_id) return res.json({ group: null })

    const { data: group } = await adminSupabase
      .from('groups')
      .select('*, profiles(id, full_name, department)')
      .eq('id', req.profile.group_id)
      .single()

    res.json({ group })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
