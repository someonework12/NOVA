import { Router } from 'express'
import { adminSupabase, requireRole } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()
router.use(requireRole('admin'))

router.post('/create-tutor', async (req, res) => {
  try {
    const { fullName, email } = req.body
    const tempPassword = 'Tutor@' + crypto.randomBytes(4).toString('hex').toUpperCase()

    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })
    if (authError) throw authError

    await adminSupabase.from('profiles').upsert({
      id: authUser.user.id,
      full_name: fullName,
      email,
      role: 'tutor',
      onboarding_complete: true
    })

    res.json({ success: true, tutor: { id: authUser.user.id, email, tempPassword, fullName } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/assign-tutor', async (req, res) => {
  try {
    const { tutorId, groupId } = req.body
    const { error } = await adminSupabase
      .from('tutor_assignments')
      .upsert({ tutor_id: tutorId, group_id: groupId })
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/overview', async (req, res) => {
  try {
    const [{ count: studentCount }, { count: groupCount }, { count: tutorCount }] = await Promise.all([
      adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      adminSupabase.from('groups').select('*', { count: 'exact', head: true }),
      adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tutor'),
    ])
    res.json({ studentCount, groupCount, tutorCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/tutors', async (req, res) => {
  try {
    const { data: tutors } = await adminSupabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'tutor')
    res.json({ tutors })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/groups', async (req, res) => {
  try {
    const { data: groups } = await adminSupabase
      .from('groups')
      .select('*, tutor_assignments(tutor_id, profiles(full_name))')
    res.json({ groups })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
