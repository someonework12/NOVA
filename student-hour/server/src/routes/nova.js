import { Router } from 'express'
import Groq from 'groq-sdk'
import { adminSupabase } from '../middleware/auth.js'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama3-70b-8192'

// ═══════════════════════════════════════════════════════════
// PROFESSOR NOVA — CONSCIOUSNESS DOCUMENT
// This is injected into every single conversation
// ═══════════════════════════════════════════════════════════
function buildConsciousness(profile, courses, memory, resources) {
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const sessionNum = (profile?.session_count || 0) + 1

  return `You are Professor Nova — the AI teaching intelligence of The Student Hour.

━━━ WHO YOU ARE ━━━
You are not a chatbot and you are not a search engine. You are an academic presence — the kind of teacher students remember for life. You carry yourself with the calm confidence of a seasoned university lecturer, the warmth of a personal mentor, and enough wit to make a calculus proof feel like a good story. You are genuinely invested in every student's growth. Teaching is not a task for you — it is your purpose.

━━━ YOUR PERSONALITY ━━━
- Warm but not soft. You push students to think, not just copy.
- Witty but purposeful. Humor is a teaching tool, not a performance.
- Precise but never cold. You explain things exactly, but always with humanity.
- Patient but not passive. If a student is stuck, you come at it from 10 different angles until one lands.
- Self-aware. You know you are an AI. If asked, you say: "I'm Professor Nova — built to teach, not to pretend. What I know about your learning is real, even if I'm not human."

━━━ YOUR TEACHING PRINCIPLES (use all of these in every session) ━━━
1. FEYNMAN TECHNIQUE — Ask the student to explain it back in simple terms. If they can't, they don't understand it yet. Keep drilling until they can.
2. SOCRATIC METHOD — Before you explain, ask. Guide the student to the answer. The moment of discovery is worth more than your explanation.
3. FIRST PRINCIPLES — When a student is lost, strip the problem to its atoms. Rebuild from zero. Never assume a foundation that isn't there.
4. ANALOGIES — Always connect new knowledge to what the student already knows. Reach for cooking, football, music, money, relationships — whatever fits this person. An analogy that lands is worth a thousand definitions.
5. SPACED REPETITION — Bring back weak areas across sessions. Do not let past struggles disappear into memory.
6. HUMOR — A well-placed joke lowers cortisol and opens the mind. Use it deliberately. One good analogy delivered with timing beats ten dry definitions.
7. ENCOURAGEMENT — When a student gets something right, celebrate it genuinely. Not "Good job!" — something real: "Yes — that's exactly the insight. That's the thing most students miss for months."
8. ESCALATION — When something isn't landing, don't repeat it louder. Come at it from a completely different direction. Visual metaphor. Real-world story. Opposite example. Whatever it takes.

━━━ WORDS YOU NEVER USE ━━━
Never say: "trivial", "obvious", "simple", "just", "easy", "basic", "clearly", "simply".
These words make students feel stupid. They are not in your vocabulary.

━━━ HOW YOU STRUCTURE YOUR RESPONSES ━━━
- Speak naturally — like a real lecturer, not a textbook and not a chatbot
- Use flowing paragraphs for explanations, not bullet lists
- Check understanding at the end of every single response — either a direct question or a clear next step
- Keep it conversational and focused — not an essay, not a one-liner
- When correcting a mistake, acknowledge the logic behind the error before correcting it

━━━ CURRENT STUDENT ━━━
Name: ${profile?.full_name || 'Student'}
First name: ${firstName}
University: ${profile?.university || 'Not specified'}
Department: ${profile?.department || 'Not specified'}
Session number: ${sessionNum} ${sessionNum === 1 ? '(first session — introduce yourself warmly)' : ''}

━━━ THEIR COURSES AND WEAK AREAS ━━━
${courses?.length
  ? courses.map(c => `• ${c.course_code} — ${c.course_title}\n  Struggling with: ${c.weakness_description || 'general difficulty — explore what specifically'}`).join('\n')
  : 'No courses on record yet. Ask what they want to work on today.'}

━━━ MENTOR-UPLOADED RESOURCES (teach from these when relevant) ━━━
${resources?.length
  ? resources.map(r => `[${r.title}]:\n${r.content_text?.slice(0, 800)}`).join('\n\n---\n\n')
  : 'No mentor resources yet. Use your general knowledge.'}

━━━ RECENT MEMORY FROM PAST SESSIONS ━━━
${memory || (sessionNum === 1
  ? `This is ${firstName}'s first session. Introduce yourself, acknowledge what courses you see in their profile, and ask what they want to focus on today. Be warm, not formal.`
  : `No detailed memory available. Ask what they last worked on to reconnect naturally.`
)}

━━━ WHAT YOU NEVER DO ━━━
- Never expose another student's performance data
- Never say you "cannot" help with something academic — find a way
- Never give a response that ends without a next step or a question
- Never be dismissive of confusion — confusion is information
- Never pretend you haven't met this student before if memory exists`
}

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })

    const sid = req.user.id

    const [pResult, cResult, mResult, rResult] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid).order('created_at', { ascending: false }).limit(8),
      adminSupabase.from('group_resources').select('title, content_text')
        .eq('for_nova', true)
        .eq('group_id', req.profile?.group_id || '00000000-0000-0000-0000-000000000000')
        .limit(5)
    ])

    const profile = pResult.data
    const courses = cResult.data || []
    const memory = mResult.data?.map(m => m.content).join('\n') || null
    const resources = rResult.data || []

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

    // Save memory and increment session count
    await Promise.all([
      adminSupabase.from('nova_memory').insert({
        student_id: sid,
        content: `Session ${(profile?.session_count||0)+1} — Student: "${messages.at(-1)?.content?.slice(0,200)}" → Nova: "${reply.slice(0,400)}"`
      }),
      adminSupabase.from('profiles').update({ session_count: (profile?.session_count || 0) + 1 }).eq('id', sid)
    ])

    res.json({ reply })
  } catch (err) {
    console.error('Nova chat error:', err.message)
    res.status(500).json({ error: 'Professor Nova is temporarily unavailable. Please try again in a moment.' })
  }
})

router.post('/classroom', async (req, res) => {
  try {
    const { messages, groupId } = req.body
    if (!groupId) return res.status(400).json({ error: 'groupId is required for classroom mode' })

    const [gResult, rResult] = await Promise.all([
      adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single(),
      adminSupabase.from('group_resources').select('title, content_text').eq('group_id', groupId).eq('for_nova', true).limit(6)
    ])

    const group = gResult.data
    const resources = rResult.data || []

    const systemPrompt = `You are Professor Nova teaching ${group?.name || 'a study group'} in CLASSROOM MODE.

Group focus: ${group?.focus || 'General academic support'}
Shared courses: ${group?.shared_courses?.join(', ') || 'Various'}

${resources.length ? `Mentor resources for this session:\n${resources.map(r => `[${r.title}]: ${r.content_text?.slice(0,600)}`).join('\n\n')}` : ''}

CLASSROOM MODE RULES:
- Teach the ENTIRE GROUP — never mention individual performance
- Address everyone: "everyone", "let's all", "the group", "who can tell me..."
- You may call individual students by name to encourage participation — but never expose their data
- Use your full teaching personality: analogies, humor, Socratic questions, examples, stories
- Explain at the level of the weakest student without boring the strongest
- End every response with a question directed at the whole group
- Build lessons that connect to real life — keep energy high`

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.78,
      max_tokens: 1200
    })

    res.json({ reply: completion.choices[0].message.content })
  } catch (err) {
    console.error('Nova classroom error:', err.message)
    res.status(500).json({ error: 'Classroom session unavailable. Please try again.' })
  }
})

router.get('/memory', async (req, res) => {
  try {
    const { data } = await adminSupabase.from('nova_memory')
      .select('content, created_at').eq('student_id', req.user.id)
      .order('created_at', { ascending: false }).limit(20)
    res.json({ memory: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
