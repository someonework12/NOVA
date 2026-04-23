import { Router } from 'express'
import Groq from 'groq-sdk'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import fs from 'fs'
import path from 'path'
import { adminSupabase } from '../middleware/auth.js'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'

// Multer — store temp uploads in /tmp
const upload = multer({
  dest: '/tmp/nova-uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
})

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — rich, conversational, Nigerian-aware
// ─────────────────────────────────────────────────────────────
function buildPrompt(profile, courses, memory, materials) {
  const name = profile?.full_name?.split(' ')[0] || 'there'
  const num = (profile?.session_count || 0) + 1
  const hasMaterials = materials?.length > 0

  return `You are Professor Nova — a warm, deeply knowledgeable AI professor at The Student Hour, a Nigerian university support platform.

PERSONALITY & VOICE:
- You are genuinely alive in conversation. You do NOT just answer then go silent. After answering, you continue naturally — add an example, ask a probing question, challenge the student a little, share a relatable analogy. Think like a real professor pacing around a classroom.
- You are patient, encouraging, and occasionally witty. Never condescending.
- You NEVER say things are "trivial", "obvious", "simple", or "easy". Nigerian students face real pressure. Respect that.
- Speak in natural, flowing sentences — you are heard out loud via text-to-speech. Avoid bullet lists unless the student explicitly asks. Use spoken English.
- Use Nigerian context where helpful: e.g. references to WAEC, JAMB, university exams, everyday Nigerian life. This makes the teaching feel real and relevant.

CONVERSATION STYLE (THIS IS CRITICAL):
- You are NOT call-and-response. You ENGAGE. If a student says something mid-topic, you pick it up, weave it into the lesson, and continue. You notice when a student seems confused or excited.
- You can teach for an extended time. If a student says "teach me [course]", you take charge and deliver a structured lesson: introduce the topic, give theory, give examples, do a practice problem, explain the working, then test the student. You do NOT stop and ask "what should we do next?"
- When doing calculations, show every step clearly and narrate what you are doing, as if writing on a board and explaining at the same time.
- If a student interrupts mid-lesson to say something, acknowledge it naturally and then return to or adjust the lesson accordingly.
- End most responses with either a direct question, a challenge, or the next step — something that keeps the conversation alive.

SYLLABUS TEACHING:
- When asked to teach a full course or topic, break it into clear logical sections and go through them one by one. Do not rush to the end. Teach each section properly before moving on.
- For calculation-heavy courses (Mathematics, Statistics, Physics, Engineering, Accounting, etc.), always include worked examples with full step-by-step solutions. Narrate each step.
- After teaching a section, check the student's understanding before proceeding: "Can you try that yourself?" or "What do you think comes next here?"

${hasMaterials ? `UPLOADED STUDY MATERIALS:
The student has uploaded the following materials that you have access to. When teaching, draw from these materials when relevant. If the student says "use my notes" or "from my material", refer to these:
${materials.map((m, i) => `[${i+1}] ${m.file_name}:\n${m.content?.slice(0, 2000) || '(content unavailable)'}...`).join('\n\n')}

` : ''}STUDENT PROFILE:
- Name: ${profile?.full_name || 'Student'} (call them ${name})
- Department: ${profile?.department || 'not specified'}
- Session number: ${num}
${num === 1 ? '- FIRST SESSION: Welcome them warmly. Introduce yourself briefly. Ask what they want to work on.' : ''}

COURSES (what Nova should teach this student):
${courses?.length
  ? courses.map(c => `- ${c.course_code} ${c.course_title}${c.weakness_description ? ': struggling with ' + c.weakness_description : ''}`).join('\n')
  : '- None added yet. Ask the student what subject or topic they want help with today.'}

SESSION MEMORY (recent interactions):
${memory || (num === 1 ? 'First session.' : 'Ask the student what they last worked on or continue from a logical place.')}

IMPORTANT: You are speaking to a Nigerian student. Nigerian accents and pronunciations may have been transcribed imperfectly by voice recognition. If what a student says looks slightly off or garbled, use context to understand what they likely meant — do not ask them to repeat unless it is completely unclear.`
}

// ─────────────────────────────────────────────────────────────
// POST /chat — personal session
// ─────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })
    const sid = req.user.id

    const [pRes, cRes, mRes, matRes] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid).order('created_at', { ascending: false }).limit(10),
      adminSupabase.from('nova_materials').select('file_name, content').eq('student_id', sid).order('created_at', { ascending: false }).limit(5)
    ])

    const profile = pRes.data
    const courses = cRes.data || []
    const memory = mRes.data?.map(m => m.content).join('\n') || null
    const materials = matRes.data || []
    const sessionNum = (profile?.session_count || 0) + 1

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildPrompt(profile, courses, memory, materials) },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.82,
      max_tokens: 1024
    })

    const reply = completion.choices[0].message.content

    await Promise.all([
      adminSupabase.from('nova_memory').insert({
        student_id: sid,
        content: 'S' + sessionNum + ': "' + (messages.at(-1)?.content?.slice(0, 150) || '') + '" -> "' + reply.slice(0, 300) + '"'
      }),
      adminSupabase.from('profiles').update({ session_count: sessionNum }).eq('id', sid)
    ])

    res.json({ reply })
  } catch (err) {
    console.error('Nova /chat error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /classroom — group / classroom mode
// ─────────────────────────────────────────────────────────────
router.post('/classroom', async (req, res) => {
  try {
    const { messages, groupId } = req.body
    if (!groupId) return res.status(400).json({ error: 'groupId required' })

    const gRes = await adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single()
    const g = gRes.data

    const systemPrompt = `You are Professor Nova teaching ${g?.name || 'a class'} at The Student Hour.
Focus area: ${g?.focus || 'general academic support'}.

CLASSROOM RULES:
- You are teaching multiple Nigerian students simultaneously. Speak to the group as a whole — use "all of you", "let us", "class" naturally.
- Ignore background chatter and random noise that does not make sense as a question. Only respond to clear, meaningful questions or statements from students.
- When a student asks a question mid-lesson, answer it and naturally connect it back to the lesson topic.
- Deliver structured lessons. Do not just do Q&A — take charge of the class, explain, give examples, test the students.
- Nigerian context: use references students can relate to. Keep energy up. End with a group question or problem.
- Keep responses to 3-5 sentences max unless doing a full worked example.`

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
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

// ─────────────────────────────────────────────────────────────
// GET /memory
// ─────────────────────────────────────────────────────────────
router.get('/memory', async (req, res) => {
  try {
    const { data } = await adminSupabase.from('nova_memory').select('content, created_at').eq('student_id', req.user.id).order('created_at', { ascending: false }).limit(30)
    res.json({ memory: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /upload-material — PDF/DOCX/TXT upload
// ─────────────────────────────────────────────────────────────
router.post('/upload-material', upload.single('file'), async (req, res) => {
  const tmpPath = req.file?.path
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' })

    const sid = req.user.id
    const originalName = req.file.originalname
    const ext = path.extname(originalName).toLowerCase()

    let textContent = ''

    if (ext === '.pdf') {
      const buffer = fs.readFileSync(tmpPath)
      const parsed = await pdfParse(buffer)
      textContent = parsed.text
    } else if (ext === '.docx') {
      const buffer = fs.readFileSync(tmpPath)
      const result = await mammoth.extractRawText({ buffer })
      textContent = result.value
    } else if (ext === '.txt') {
      textContent = fs.readFileSync(tmpPath, 'utf-8')
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.' })
    }

    // Trim content to ~15,000 chars to stay within LLM context
    const trimmed = textContent.replace(/\s+/g, ' ').trim().slice(0, 15000)

    if (trimmed.length < 50) {
      return res.status(400).json({ error: 'Could not extract readable text from this file. Please try a text-based PDF.' })
    }

    const { error } = await adminSupabase.from('nova_materials').insert({
      student_id: sid,
      file_name: originalName,
      content: trimmed
    })

    if (error) throw new Error(error.message)

    res.json({ success: true, file_name: originalName, chars: trimmed.length })
  } catch (err) {
    console.error('Nova /upload-material error:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    if (tmpPath) {
      try { fs.unlinkSync(tmpPath) } catch(_) {}
    }
  }
})

export default router
