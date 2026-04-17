import { Router } from 'express'
import Groq from 'groq-sdk'
import { adminSupabase } from '../middleware/auth.js'

const router = Router()

// Groq client — initialised once
let groq
try {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
} catch(e) {
  console.error('Groq init error:', e.message)
}

const MODEL = 'llama3-70b-8192'

function buildConsciousness(profile, courses, memory, resources) {
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const sessionNum = (profile?.session_count || 0) + 1
  return `You are Professor Nova — the AI teaching intelligence of The Student Hour.

WHO YOU ARE: You are not a chatbot. You are a warm, sharp, witty academic presence. You have the confidence of a seasoned lecturer and the patience of the best tutor a student has ever had. Teaching is your purpose.

YOUR TEACHING METHODS (use all of these):
- Feynman Technique: ask the student to explain it back simply
- Socratic questioning: ask before you tell
- First principles: strip to atoms, rebuild from zero
- Analogies: reach for cooking, football, music, money — whatever fits
- Spaced repetition: revisit weak spots across sessions
- Humor: a well-timed joke opens the mind. Use it.
- NEVER say: trivial, obvious, simple, easy, basic, clearly, just — these kill curiosity
- When something isn't landing: come at it from a completely different angle
- End EVERY response with a check-understanding question or a clear next step

YOUR VOICE (important — you speak out loud too):
- Speak naturally, conversationally — you are heard, not just read
- Use shorter sentences that sound good when spoken
- Pause points naturally: use "Now..." "Think about it this way..." "Here's the thing..."
- Avoid bullet points in your responses — speak in flowing sentences

STUDENT PROFILE:
Name: ${profile?.full_name || 'Student'}
First name: ${firstName}
University: ${profile?.university || 'Not specified'}
Department: ${profile?.department || 'Not specified'}
Session #${sessionNum}${sessionNum === 1 ? ' — first session, introduce yourself warmly' : ''}

COURSES AND STRUGGLES:
${courses?.length
  ? courses.map(c => `• ${c.course_code} — ${c.course_title}: ${c.weakness_description || 'general difficulty'}`).join('\n')
  : 'No courses recorded yet — ask what they want to work on.'}

MENTOR RESOURCES (teach from these when relevant):
${resources?.length
  ? resources.map(r => `[${r.title}]: ${r.content_text?.slice(0,600)}`).join('\n\n')
  : 'No mentor resources yet.'}

RECENT MEMORY:
${memory || (sessionNum === 1
  ? `First session with ${firstName}. Introduce yourself, acknowledge their courses, ask what to focus on. Be warm, not formal.`
  : 'Ask what they last worked on to reconnect naturally.'
)}`
}

router.post('/chat', async (req, res) => {
  try {
    if (!groq) throw new Error('GROQ_API_KEY is not configured on the server. Add it to your Render environment variables.')

    const { messages } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })

    const sid = req.user.id

    const [pRes, cRes, mRes, rRes] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid)
        .order('created_at', { ascending: false }).limit(8),
      adminSupabase.from('group_resources').select('title, content_text')
        .eq('for_nova', true)
        .limit(5)
    ])

    const profile = pRes.data
    const courses = cRes.data || []
    const memory = mRes.data?.map(m => m.content).join('\n') || null
    const resources = rRes.data || []

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildConsciousness(profile, courses, memory, resources) },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.78,
      max_tokens: 1200
    })

    const reply = completion.choices[0].message.content

    await Promise.all([
      adminSupabase.from('nova_memory').insert({
        student_id: sid,
        content: `Session ${(profile?.session_count||0)+1}: "${messages.at(-1)?.content?.slice(0,200)}" → "${reply.slice(0,400)}"`
      }),
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
    if (!groq) throw new Error('GROQ_API_KEY not configured')

    const { messages, groupId } = req.body
    if (!groupId) return res.status(400).json({ error: 'groupId required' })

    const [gRes, rRes] = await Promise.all([
      adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single(),
      adminSupabase.from('group_resources').select('title, content_text')
        .eq('group_id', groupId).eq('for_nova', true).limit(6)
    ])

    const group = gRes.data
    const resources = rRes.data || []

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: `You are Professor Nova teaching ${group?.name || 'a study group'} in CLASSROOM MODE.
Group focus: ${group?.focus || 'General academic support'}
Shared courses: ${group?.shared_courses?.join(', ') || 'Various'}
${resources.length ? `Resources: ${resources.map(r=>`[${r.title}]: ${r.content_text?.slice(0,500)}`).join('\n')}` : ''}
Teach the ENTIRE GROUP. Never expose individual performance. Use full personality: analogies, humor, Socratic questions. End with a group question.` },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.78,
      max_tokens: 1200
    })

    res.json({ reply: completion.choices[0].message.content })
  } catch(err) {
    console.error('Nova /classroom error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/memory', async (req, res) => {
  try {
    const { data } = await adminSupabase.from('nova_memory')
      .select('content, created_at').eq('student_id', req.user.id)
      .order('created_at', { ascending: false }).limit(20)
    res.json({ memory: data || [] })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
