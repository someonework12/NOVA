import { Router } from 'express'
import Groq from 'groq-sdk'
import { adminSupabase } from '../middleware/auth.js'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'

function buildPrompt(profile, courses, memory, resources) {
  const name = profile?.full_name?.split(' ')[0] || 'there'
  const num = (profile?.session_count || 0) + 1
  return `You are Professor Nova, the AI teaching intelligence of The Student Hour.
You are warm, sharp, witty. You speak out loud so use natural flowing sentences.
Use Socratic method, analogies, humor. Never say trivial/obvious/simple/easy/clearly.
End every reply with a question or clear next step.
${num === 1 ? 'This is your FIRST meeting — introduce yourself warmly by name.' : ''}

Student: ${profile?.full_name || 'Student'} (call them ${name})
University: ${profile?.university || 'unknown'} | Department: ${profile?.department || 'unknown'}
Session number: ${num}

Their courses and struggles:
${courses?.length ? courses.map(c => '- ' + c.course_code + ' ' + c.course_title + ': ' + (c.weakness_description || 'general difficulty')).join('\n') : 'No courses yet — ask what they want to work on.'}

${resources?.length ? 'Mentor resources: ' + resources.map(r => r.title).join(', ') : ''}

Memory from past sessions:
${memory || (num === 1 ? 'First session.' : 'No detailed memory — ask what they last worked on.')}`
}

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })
    const sid = req.user.id

    const [pRes, cRes, mRes, rRes] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid)
        .order('created_at', { ascending: false }).limit(10),
      adminSupabase.from('group_resources').select('title, content_text')
        .eq('for_nova', true).limit(4)
    ])

    const profile = pRes.data
    const courses = cRes.data || []
    const memory = mRes.data?.map(m => m.content).join('\n') || null
    const resources = rRes.data || []
    const sessionNum = (profile?.session_count || 0) + 1

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildPrompt(profile, courses, memory, resources) },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.78,
      max_tokens: 1024
    })

    const reply = completion.choices[0].message.content

    await Promise.all([
      adminSupabase.from('nova_memory').insert({
        student_id: sid,
        content: 'Session ' + sessionNum + ' | Student: "' + (messages.at(-1)?.content?.slice(0, 200) || '') + '" | Nova: "' + reply.slice(0, 400) + '"'
      }),
      adminSupabase.from('profiles')
        .update({ session_count: sessionNum })
        .eq('id', sid)
    ])

    res.json({ reply })
  } catch (err) {
    console.error('Nova /chat error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.post('/classroom', async (req, res) => {
  try {
    const { messages, groupId } = req.body
    if (!groupId) return res.status(400).json({ error: 'groupId required' })

    const [gRes, rRes] = await Promise.all([
      adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single(),
      adminSupabase.from('group_resources').select('title, content_text')
        .eq('group_id', groupId).eq('for_nova', true).limit(5)
    ])

    const g = gRes.data
    const resources = rRes.data || []

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are Professor Nova teaching ' + (g?.name || 'a study group') + ' in CLASSROOM MODE. ' +
            'Group focus: ' + (g?.focus || 'general academic support') + '. ' +
            'Courses: ' + (g?.shared_courses?.join(', ') || 'various') + '. ' +
            (resources.length ? 'Resources: ' + resources.map(r => r.title).join(', ') + '. ' : '') +
            'Teach the whole group. Never expose individual student data. Use humor, analogies, Socratic questions. End with a question for the whole group.'
        },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.78,
      max_tokens: 1024
    })

    res.json({ reply: completion.choices[0].message.content })
  } catch (err) {
    console.error('Nova /classroom error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/memory', async (req, res) => {
  try {
    const { data } = await adminSupabase.from('nova_memory')
      .select('content, created_at')
      .eq('student_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    res.json({ memory: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
