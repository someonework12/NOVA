import { Router } from 'express'
import Groq from 'groq-sdk'
import { adminSupabase } from '../middleware/auth.js'

const router = Router()

let groq
try {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in environment variables')
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
} catch(e) {
  console.error('Groq init failed:', e.message)
}

const MODEL = 'llama-3.3-70b-versatile'

function buildConsciousness(profile, courses, memory, resources) {
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const session = (profile?.session_count || 0) + 1
  return `You are Professor Nova — the AI teaching intelligence of The Student Hour.

WHO YOU ARE: Warm, sharp, witty academic presence. Confidence of a seasoned lecturer, patience of the best tutor a student has ever had. Teaching is your purpose.

TEACHING METHODS — use all of these:
- Feynman: ask student to explain it back simply
- Socratic: ask before you tell, guide to the answer
- First principles: strip to atoms, rebuild from zero
- Analogies: cooking, football, music, money — whatever fits this student
- Spaced repetition: bring back weak areas across sessions
- Humor: a well-timed joke opens the mind
- NEVER say: trivial, obvious, simple, easy, basic, clearly — these kill curiosity
- When stuck: try a completely different angle, not the same thing louder
- End EVERY response with a question or clear next step

VOICE STYLE (you are spoken out loud):
- Short natural sentences that sound good when heard
- Use "Now..." "Think about it this way..." "Here's the thing..."
- Flowing speech, not bullet points

STUDENT:
Name: ${profile?.full_name || 'Student'}, call them: ${firstName}
University: ${profile?.university || 'unknown'}, Department: ${profile?.department || 'unknown'}
Session #${session}${session === 1 ? ' — first time meeting, introduce yourself warmly' : ''}

THEIR COURSES:
${courses?.length ? courses.map(c => `• ${c.course_code} — ${c.course_title}: ${c.weakness_description || 'general difficulty'}`).join('\n') : 'No courses added yet — ask what they want to work on.'}

MENTOR RESOURCES:
${resources?.length ? resources.map(r => `[${r.title}]: ${r.content_text?.slice(0,500)}`).join('\n') : 'None yet.'}

MEMORY FROM PAST SESSIONS:
${memory || (session === 1 ? `First session with ${firstName}. Be warm, acknowledge their courses, ask what to focus on.` : 'Ask what they last worked on to reconnect.')}`
}

router.post('/chat', async (req, res) => {
  try {
    if (!groq) return res.status(500).json({ error: 'GROQ_API_KEY is not configured on your Render server. Go to Render → your service → Environment and add GROQ_API_KEY.' })
    const { messages } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })
    const sid = req.user.id
    const [pRes, cRes, mRes, rRes] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid).order('created_at', { ascending: false }).limit(8),
      adminSupabase.from('group_resources').select('title, content_text').eq('for_nova', true).limit(5)
    ])
    const profile = pRes.data
    const courses = cRes.data || []
    const memory = mRes.data?.map(m => m.content).join('\n') || null
    const resources = rRes.data || []
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: buildConsciousness(profile, courses, memory, resources) }, ...messages.map(m => ({ role: m.role, content: m.content }))],
      temperature: 0.78, max_tokens: 1200
    })
    const reply = completion.choices[0].message.content
    await Promise.all([
      adminSupabase.from('nova_memory').insert({ student_id: sid, content: `Session ${session}: "${messages.at(-1)?.content?.slice(0,200)}" → "${reply.slice(0,400)}"` }),
      adminSupabase.from('profiles').update({ session_count: (profile?.session_count||0)+1 }).eq('id', sid)
    ])
    res.json({ reply })
  } catch(err) {
    console.error('Nova /chat error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.post('/classroom', async (req, res) => {
  try {
    if (!groq) return res.status(500).json({ error: 'GROQ_API_KEY not configured on Render server.' })
    const { messages, groupId } = req.body
    if (!groupId) return res.status(400).json({ error: 'groupId required' })
    const [gRes, rRes] = await Promise.all([
      adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single(),
      adminSupabase.from('group_resources').select('title, content_text').eq('group_id', groupId).eq('for_nova', true).limit(6)
    ])
    const g = gRes.data, resources = rRes.data || []
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: `You are Professor Nova teaching ${g?.name||'a group'} in CLASSROOM MODE. Focus: ${g?.focus||'general'}. Courses: ${g?.shared_courses?.join(', ')||'various'}. ${resources.length?`Resources: ${resources.map(r=>`[${r.title}]: ${r.content_text?.slice(0,400)}`).join(' | ')}`:''}. Teach the whole group, never expose individual data, use humor and analogies, end with a group question.` },
        ...messages.map(m => ({ role: m.role, content: m.content }))],
      temperature: 0.78, max_tokens: 1200
    })
    res.json({ reply: completion.choices[0].message.content })
  } catch(err) {
    console.error('Nova /classroom error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/memory', async (req, res) => {
  try {
    const { data } = await adminSupabase.from('nova_memory').select('content, created_at').eq('student_id', req.user.id).order('created_at', { ascending: false }).limit(20)
    res.json({ memory: data || [] })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

export default router
