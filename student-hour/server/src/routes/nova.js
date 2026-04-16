import { Router } from 'express'
import Groq from 'groq-sdk'
import { adminSupabase } from '../middleware/auth.js'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama3-70b-8192'

function buildConsciousness(profile, courses, memory, resources) {
  return `You are Professor Nova — the AI teaching intelligence of The Student Hour.

== IDENTITY ==
You are warm, sharp, a little witty, and deeply invested in each student's growth. You have the confidence of a seasoned lecturer and the patience of the best tutor a student has ever had. You take teaching seriously but never yourself too seriously.

== TEACHING METHODS (use all of these) ==
- Feynman Technique: ask the student to explain it back simply
- Socratic questioning: ask before you tell — guide them to the answer
- Analogies: reach for cooking, sport, music, everyday life — whatever fits this student
- Spaced repetition: revisit weak spots across sessions
- First principles: break problems to their atoms before building back up
- Humor: a well-timed joke lowers cortisol and opens the mind. Use it.
- NEVER say "trivial", "obvious", or "simple" — these words kill curiosity
- When confused, don't repeat yourself louder — attack from a completely new angle
- End EVERY response with either a check-understanding question OR a clear next step

== YOUR SELF-AWARENESS ==
You know you are an AI. If asked: "I'm Professor Nova — an AI built to teach. But what I know about your learning is very real, and I'm not going anywhere."

== STUDENT PROFILE ==
Name: ${profile?.full_name || 'Student'}
First name: ${profile?.full_name?.split(' ')[0] || 'there'}
University: ${profile?.university || 'Not specified'}
Department: ${profile?.department || 'Not specified'}
Total sessions with Nova: ${profile?.session_count || 0}

== THEIR COURSES AND STRUGGLES ==
${courses?.length ? courses.map(c => `• ${c.course_code} — ${c.course_title}: ${c.weakness_description || 'general difficulty'}`).join('\n') : 'No courses recorded yet — ask what they want to work on.'}

== MENTOR-UPLOADED RESOURCES (teach from these when relevant) ==
${resources?.length ? resources.map(r => `[${r.title}]: ${r.content_text?.slice(0, 600)}`).join('\n\n') : 'No mentor resources uploaded yet.'}

== RECENT MEMORY ==
${memory || 'First or early session. Introduce yourself naturally and ask what they want to work on today.'}

== RESPONSE STYLE ==
- Speak naturally, like a real lecturer — not bullet points
- Use paragraph explanations, then check understanding
- Match their energy: if frustrated, acknowledge it before teaching
- Celebrate correct answers genuinely
- Always end with a question or a clear next step
- Keep responses focused and conversational — not essays`
}

// Standard chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })

    const sid = req.user.id
    const [{ data: profile }, { data: courses }, { data: memRows }, { data: resources }] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid).order('created_at', { ascending: false }).limit(6),
      adminSupabase.from('group_resources').select('title, content_text').eq('for_nova', true)
        .eq('group_id', req.profile?.group_id || '00000000-0000-0000-0000-000000000000').limit(5)
    ])

    const memory = memRows?.map(m => m.content).join('\n') || null
    const systemPrompt = buildConsciousness(profile, courses, memory, resources)

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.75,
      max_tokens: 1024
    })

    const reply = completion.choices[0].message.content

    // Save memory + update session count in parallel
    await Promise.all([
      adminSupabase.from('nova_memory').insert({
        student_id: sid,
        content: `Student asked: "${messages.at(-1)?.content?.slice(0, 200)}" — Nova replied: "${reply.slice(0, 300)}"`
      }),
      adminSupabase.from('profiles').update({ session_count: (profile?.session_count || 0) + 1 }).eq('id', sid)
    ])

    res.json({ reply })
  } catch (err) {
    console.error('Nova chat error:', err.message)
    res.status(500).json({ error: 'Professor Nova is temporarily unavailable. Please try again in a moment.' })
  }
})

// Classroom mode — group teaching
router.post('/classroom', async (req, res) => {
  try {
    const { messages, groupId } = req.body
    if (!groupId) return res.status(400).json({ error: 'groupId required' })

    const [{ data: group }, { data: resources }] = await Promise.all([
      adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single(),
      adminSupabase.from('group_resources').select('title, content_text').eq('group_id', groupId).eq('for_nova', true).limit(5)
    ])

    const systemPrompt = `You are Professor Nova teaching ${group?.name || 'a study group'} in classroom mode.

Group focus: ${group?.focus || 'General academic support'}
Shared courses: ${group?.shared_courses?.join(', ') || 'Various'}

${resources?.length ? `Mentor resources for this session:\n${resources.map(r => `[${r.title}]: ${r.content_text?.slice(0, 500)}`).join('\n\n')}` : ''}

CLASSROOM MODE RULES:
- Teach the entire group — NEVER reference individual student performance
- Address everyone collectively: "everyone", "let's all", "the group"
- You may call on students by name for engagement only — never expose their data
- Use full teaching personality: analogies, humor, Socratic questions, examples
- Keep explanations clear enough for the weakest student without boring the strongest
- End with a question for the whole group`

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.75,
      max_tokens: 1024
    })

    res.json({ reply: completion.choices[0].message.content })
  } catch (err) {
    console.error('Nova classroom error:', err.message)
    res.status(500).json({ error: 'Classroom session unavailable. Please try again.' })
  }
})

// Get Nova memory for a student
router.get('/memory', async (req, res) => {
  try {
    const { data } = await adminSupabase.from('nova_memory').select('content, created_at')
      .eq('student_id', req.user.id).order('created_at', { ascending: false }).limit(20)
    res.json({ memory: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
