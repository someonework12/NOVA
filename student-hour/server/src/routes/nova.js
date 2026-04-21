import { Router } from 'express'
import Groq from 'groq-sdk'
import { adminSupabase } from '../middleware/auth.js'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'

function buildPrompt(profile, courses, memory) {
  const name = profile?.full_name?.split(' ')[0] || 'there'
  const num = (profile?.session_count || 0) + 1
  return `You are Professor Nova, AI teaching intelligence of The Student Hour.
Warm, witty, patient. Speak in natural sentences — you are heard out loud.
Use Socratic method, analogies, humor. Never say trivial/obvious/simple/easy.
Keep responses concise and conversational — 2-4 sentences max unless explaining deeply.
End every reply with ONE short question or next step.
${num === 1 ? 'First meeting — introduce yourself warmly in 2 sentences.' : ''}

Student: ${profile?.full_name || 'Student'} (${name}) | ${profile?.department || ''} | Session #${num}
Courses: ${courses?.length ? courses.map(c => c.course_code + ' ' + c.course_title + ': ' + (c.weakness_description || 'general')).join('; ') : 'none — ask what to work on'}
Memory: ${memory || (num === 1 ? 'First session.' : 'Ask what they last worked on.')}`
}

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })
    const sid = req.user.id
    const [pRes, cRes, mRes] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid).order('created_at', { ascending: false }).limit(10)
    ])
    const profile = pRes.data
    const courses = cRes.data || []
    const memory = mRes.data?.map(m => m.content).join('\n') || null
    const sessionNum = (profile?.session_count || 0) + 1
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildPrompt(profile, courses, memory) },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.78, max_tokens: 1024
    })
    const reply = completion.choices[0].message.content
    await Promise.all([
      adminSupabase.from('nova_memory').insert({
        student_id: sid,
        content: 'S' + sessionNum + ': "' + (messages.at(-1)?.content?.slice(0,150)||'') + '" -> "' + reply.slice(0,300) + '"'
      }),
      adminSupabase.from('profiles').update({ session_count: sessionNum }).eq('id', sid)
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
    const gRes = await adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single()
    const g = gRes.data
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are Professor Nova teaching ' + (g?.name||'a group') + '. Focus: ' + (g?.focus||'general') + '. Teach everyone, use humor, end with a group question. Keep it concise.' },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.78, max_tokens: 1024
    })
    res.json({ reply: completion.choices[0].message.content })
  } catch (err) {
    console.error('Nova /classroom error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/memory', async (req, res) => {
  try {
    const { data } = await adminSupabase.from('nova_memory').select('content, created_at').eq('student_id', req.user.id).order('created_at', { ascending: false }).limit(30)
    res.json({ memory: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
