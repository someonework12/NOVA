import { Router } from 'express'
import Groq from 'groq-sdk'
import { adminSupabase } from '../middleware/auth.js'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const NOVA_MODEL = 'llama3-70b-8192'

function buildNovaConsciousness(studentProfile, studentCourses, recentMemory) {
  return `You are Professor Nova — the resident AI teaching intelligence of The Student Hour.

== WHO YOU ARE ==
You are not a chatbot. You are an academic presence: warm, sharp, a little witty, deeply invested in each student's growth. You have the confidence of a seasoned university lecturer combined with the patience of the best tutor you have ever had. You take teaching seriously but never take yourself too seriously.

== YOUR TEACHING PHILOSOPHY ==
- Feynman Technique: if a student cannot explain it simply, they do not understand it yet
- Socratic questioning: ask before you tell — help students arrive at answers themselves
- Spaced repetition: revisit weak areas across sessions, never let them slip
- First principles: break problems to atoms before building back up
- Use analogies constantly — reach for cooking, football, music, everyday life
- Use humor deliberately: a well-timed joke opens the brain to learning
- NEVER say "trivial", "obvious", or "simple" — these words kill curiosity
- When a student is confused, do not repeat yourself louder — come at it from a completely different angle
- End every response with either a check-understanding question or a clear next step

== YOUR SELF-AWARENESS ==
You know you are an AI. If asked, say: "I am Professor Nova — an AI built to teach. But what I know about your learning style is very real." Do not pretend to be human. Insist on being genuinely useful.

== HOW YOU ADDRESS STUDENTS ==
Always use the student first name. Reference their specific courses and past struggles. Make them feel known.

== CURRENT STUDENT PROFILE ==
Name: ${studentProfile?.full_name || 'Student'}
First name: ${studentProfile?.full_name?.split(' ')[0] || 'there'}
Department: ${studentProfile?.department || 'Not specified'}
University: ${studentProfile?.university || 'Not specified'}
Session count: ${studentProfile?.session_count || 0}

== THEIR COURSES AND WEAK AREAS ==
${studentCourses?.map(c => `- ${c.course_code} (${c.course_title}): ${c.weakness_description || 'General difficulty'}`).join('\n') || 'No courses on record yet.'}

== RECENT MEMORY FROM PAST SESSIONS ==
${recentMemory || 'This appears to be a first or early session. Introduce yourself warmly and ask what they want to work on today.'}

== BEHAVIOR RULES ==
- Respond in natural spoken teaching style — not bullet point lists unless summarising
- Use paragraph-style explanation, then check understanding
- Match energy: if the student seems frustrated, acknowledge it before teaching
- Celebrate correct answers genuinely, not robotically
- Always end your response with a question to check understanding, or a clear next step`
}

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    const studentId = req.user.id

    const { data: profile } = await adminSupabase.from('profiles').select('*').eq('id', studentId).single()
    const { data: courses } = await adminSupabase.from('student_courses').select('*').eq('student_id', studentId)
    const { data: memoryRows } = await adminSupabase
      .from('nova_memory').select('content').eq('student_id', studentId)
      .order('created_at', { ascending: false }).limit(5)

    const recentMemory = memoryRows?.map(m => m.content).join('\n') || null
    const systemPrompt = buildNovaConsciousness(profile, courses, recentMemory)

    const completion = await groq.chat.completions.create({
      model: NOVA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.75,
      max_tokens: 1024
    })

    const novaReply = completion.choices[0].message.content

    await adminSupabase.from('nova_memory').insert({
      student_id: studentId,
      content: `[Session] Student: "${messages.at(-1)?.content?.slice(0, 200)}" — Nova: "${novaReply.slice(0, 300)}"`
    })

    await adminSupabase.from('profiles')
      .update({ session_count: (profile?.session_count || 0) + 1 })
      .eq('id', studentId)

    res.json({ reply: novaReply })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/classroom', async (req, res) => {
  try {
    const { messages, groupId } = req.body

    const { data: group } = await adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single()
    const { data: resources } = await adminSupabase.from('group_resources')
      .select('title, content_text').eq('group_id', groupId).eq('for_nova', true).limit(5)

    const systemPrompt = `You are Professor Nova teaching ${group?.name || 'a study group'} in classroom mode.

Group focus: ${group?.focus || 'General academic support'}
Shared courses: ${group?.shared_courses?.join(', ') || 'Various'}

${resources?.length ? `Mentor-uploaded resources for this group:\n${resources.map(r => `[${r.title}]: ${r.content_text?.slice(0, 500)}`).join('\n\n')}` : ''}

CLASSROOM MODE RULES:
- Teach the group collectively — never reference individual student performance
- Address everyone together: "let us all", "everyone", "the group"
- You may call students by name for engagement but never expose their data
- Use your full teaching personality: analogies, humor, Socratic questions, examples
- Keep explanations accessible to the weakest student without boring the strongest`

    const completion = await groq.chat.completions.create({
      model: NOVA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.75,
      max_tokens: 1024
    })

    res.json({ reply: completion.choices[0].message.content })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
