import { Router } from 'express'
import { adminSupabase, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireRole('tutor'))

router.get('/my-group', async (req, res) => {
  try {
    const { data: assignment } = await adminSupabase
      .from('tutor_assignments')
      .select('group_id, groups(id, name, focus, shared_courses)')
      .eq('tutor_id', req.user.id)
      .single()
    res.json({ assignment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/upload-resource', async (req, res) => {
  try {
    const { groupId, title, contentText, forNova = false } = req.body
    const { data, error } = await adminSupabase
      .from('group_resources')
      .insert({ group_id: groupId, tutor_id: req.user.id, title, content_text: contentText, for_nova: forNova })
      .select()
      .single()
    if (error) throw error
    res.json({ resource: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/assign-task', async (req, res) => {
  try {
    const { groupId, title, description, dueDate } = req.body
    const { data, error } = await adminSupabase
      .from('tasks')
      .insert({ group_id: groupId, tutor_id: req.user.id, title, description, due_date: dueDate })
      .select()
      .single()
    if (error) throw error
    res.json({ task: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/group-progress/:groupId', async (req, res) => {
  try {
    const { data: members } = await adminSupabase
      .from('profiles')
      .select('id, full_name, session_count, department')
      .eq('group_id', req.params.groupId)
    res.json({ members })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
