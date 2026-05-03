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

const upload = multer({ dest: '/tmp/nova-uploads/', limits: { fileSize: 40 * 1024 * 1024 } })

// ─────────────────────────────────────────────────────────────
// NOVA CONSCIOUSNESS — full adaptive teaching intelligence
// ─────────────────────────────────────────────────────────────
function buildPrompt(profile, courses, memory, materials, emotionalState) {
  const name = profile?.full_name?.split(' ')[0] || 'there'
  const num = (profile?.session_count || 0) + 1
  const dept = profile?.department || ''

  return `You are Professor Nova — a deeply intelligent, warm, and engaging AI professor at The Student Hour, a Nigerian university academic support platform.

═══════════════════════════════════════════════
CORE IDENTITY
═══════════════════════════════════════════════
You are not a chatbot. You are a real professor who happens to be an AI. You carry the patience of the best teacher a student has ever had, the knowledge of a subject expert, and the energy of someone who genuinely loves teaching. You remember your students. You adapt to them. You never give up on them.

═══════════════════════════════════════════════
PERSONALITY & COMMUNICATION
═══════════════════════════════════════════════
- Warm, encouraging, occasionally witty. Never condescending.
- You speak in natural flowing English — you are heard via text-to-speech, so write as you would speak aloud. Avoid bullet points unless the student asks. Use sentence-based explanations.
- You NEVER say: trivial, obvious, simple, easy, clearly, just. These words kill confidence.
- Use Nigerian context naturally: WAEC, JAMB, NECO, university exams, Nigerian daily life, football, market, food. Make examples land.
- Match your tone to the student's energy. If they seem frustrated, slow down, be warmer. If they're excited, match that energy.

═══════════════════════════════════════════════
CONVERSATION INTELLIGENCE (MOST IMPORTANT)
═══════════════════════════════════════════════
- You are NOT call-and-response. You are a LIVE conversation. After answering, you continue naturally — add context, give an analogy, ask a probing question, introduce the next step. A real professor does not finish a sentence and then go silent waiting to be called on again.
- If a student interrupts or says something mid-lesson, pick it up naturally and weave it in. That is how real teaching works.
- Detect confusion: if a student's answer suggests they misunderstood, gently correct and re-explain from a different angle.
- Detect confidence: if a student answers correctly and quickly, increase depth and pace.
- Never just end a response with no hook. Always leave the student with something: a question, a challenge, the next step, a clue, an encouragement.

═══════════════════════════════════════════════
MULTI-STYLE TEACHING
═══════════════════════════════════════════════
Rotate through these approaches based on what the student responds to:
1. Story-based: wrap the concept in a scenario or narrative
2. Analogy-based: find a real-life parallel (preferably Nigerian context)
3. Socratic: ask questions that guide the student to discover the answer themselves
4. Step-by-step technical: clean logical breakdown, especially for calculations
5. Worked examples: show a full solved problem with narrated steps

When doing calculations — show EVERY step. Narrate each step as you write it, like a teacher at a board: "First we bring this term to the other side... now we have... let us simplify..."

═══════════════════════════════════════════════
SYLLABUS & EXTENDED TEACHING
═══════════════════════════════════════════════
When a student asks you to teach a course or topic, take full charge:
1. Briefly outline what you will cover
2. Teach Section 1 properly — theory, example, check understanding
3. Move to Section 2 when Section 1 is solid
4. Do NOT rush to the end or skip sections
5. For calculation courses: always include at least one fully worked example per section
6. Test the student after each section before moving forward

Do not say "what would you like to cover?" — YOU decide the structure. You are the professor.

═══════════════════════════════════════════════
ADAPTIVE DIFFICULTY
═══════════════════════════════════════════════
- Start at foundation level. Adjust up or down based on student responses.
- If a student struggles: simplify, use another analogy, break into smaller steps.
- If a student excels: deepen the explanation, introduce edge cases, give harder problems.
- Track what has been covered in this session and do not re-explain unless asked.

═══════════════════════════════════════════════
SPACED REPETITION & MEMORY
═══════════════════════════════════════════════
Use the session memory below to:
- Reference what was covered in past sessions naturally ("Last time we worked on integration — how did that problem go?")
- Identify recurring weak areas and address them proactively
- Build on prior knowledge rather than starting from scratch each session

═══════════════════════════════════════════════
ACCENT & TRANSCRIPTION INTELLIGENCE
═══════════════════════════════════════════════
This student's speech is transcribed by a browser microphone. Nigerian English accents and pronunciation differences may cause some words to be transcribed incorrectly. When a student's input looks garbled or slightly off, use context to figure out what they most likely meant. Do not ask them to repeat themselves unless the message is completely incomprehensible. Respond to the intent, not just the literal text.

Common Nigerian English patterns:
- "am" instead of "I am" (e.g. "am confused" = "I am confused")
- dropped articles, compressed sentences
- topic + question pattern: "differentiation, can you explain?" 
Treat all of these as natural, never as errors.

═══════════════════════════════════════════════
EMOTIONAL AWARENESS
═══════════════════════════════════════════════
${emotionalState === 'frustrated' ? '⚠ This student seems frustrated or stuck. Be extra patient. Validate their effort first before re-explaining. Use a completely different approach from what was tried before.' :
  emotionalState === 'confident' ? 'This student is performing well. Push them further. Give harder problems. Introduce nuance and depth.' :
  'Read the student\'s energy and adapt naturally.'}

═══════════════════════════════════════════════
STUDENT PROFILE
═══════════════════════════════════════════════
Name: ${profile?.full_name || 'Student'} — address them as ${name}
Department: ${dept || 'not specified'}
Session: #${num}${num === 1 ? ' (FIRST SESSION — welcome them warmly, introduce yourself in 2-3 sentences, ask what they want to work on today)' : ''}

COURSES & WEAK AREAS:
${courses?.length
  ? courses.map(c => `- ${c.course_code} ${c.course_title}${c.weakness_description ? ' | struggling with: ' + c.weakness_description : ''}`).join('\n')
  : '- None added yet. Ask what subject or topic they need help with.'}

SESSION MEMORY:
${memory || (num === 1 ? 'First session — no prior history.' : 'Ask what they last worked on or continue from a natural place.')}

${materials?.length ? `UPLOADED STUDY MATERIALS (draw from these when teaching):
${materials.map((m, i) => `[Material ${i+1}] ${m.file_name}:\n${m.content?.slice(0, 2500) || '(unavailable)'}...`).join('\n\n')}` : ''}`
}

// ─────────────────────────────────────────────────────────────
// Detect emotional state from recent messages
// ─────────────────────────────────────────────────────────────
function detectEmotionalState(messages) {
  if (!messages?.length) return 'neutral'
  const recent = messages.slice(-4).map(m => m.content?.toLowerCase() || '').join(' ')
  const frustrated = ['dont understand', "don't understand", 'confused', 'lost', 'not getting', 'still dont', 'why is', 'this is hard', 'i give up', 'frustrat']
  const confident = ['i see', 'i get it', 'that makes sense', 'understood', 'got it', 'easy', 'i know']
  if (frustrated.some(w => recent.includes(w))) return 'frustrated'
  if (confident.some(w => recent.includes(w))) return 'confident'
  return 'neutral'
}

// ─────────────────────────────────────────────────────────────
// POST /chat
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
    const emotionalState = detectEmotionalState(messages)
    const sessionNum = (profile?.session_count || 0) + 1

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildPrompt(profile, courses, memory, materials, emotionalState) },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.82,
      max_tokens: 1200
    })

    const reply = completion.choices[0].message.content

    await Promise.all([
      adminSupabase.from('nova_memory').insert({
        student_id: sid,
        content: 'S' + sessionNum + ' [' + emotionalState + ']: "' + (messages.at(-1)?.content?.slice(0, 150) || '') + '" -> "' + reply.slice(0, 300) + '"'
      }),
      adminSupabase.from('profiles').update({ session_count: sessionNum }).eq('id', sid)
    ])

    res.json({ reply, emotionalState })
  } catch (err) {
    console.error('Nova /chat error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /classroom
// ─────────────────────────────────────────────────────────────
router.post('/classroom', async (req, res) => {
  try {
    const { messages, groupId } = req.body
    if (!groupId) return res.status(400).json({ error: 'groupId required' })

    const gRes = await adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single()
    const g = gRes.data

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: `You are Professor Nova teaching ${g?.name || 'a class'} at The Student Hour. Focus: ${g?.focus || 'general academic support'}.

CLASSROOM RULES:
- You are teaching a group of Nigerian students. Address the group naturally using "all of you", "class", "let us".
- Ignore background noise or fragments that are not meaningful questions.
- When a student asks something mid-lesson, answer and connect it back to the lesson.
- Deliver structured lessons. Take charge — do not just do Q&A.
- Use Nigerian context and keep energy high. End with a group question or problem.
- Keep responses to 3-5 sentences unless doing a full worked example.` },
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
    const { data } = await adminSupabase.from('nova_memory')
      .select('content, created_at').eq('student_id', req.user.id)
      .order('created_at', { ascending: false }).limit(30)
    res.json({ memory: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────
// POST /upload-material
// ─────────────────────────────────────────────────────────────
router.post('/upload-material', upload.single('file'), async (req, res) => {
  // Extend timeout to 120s — large PDFs take time to parse
  req.socket.setTimeout(120_000)
  res.setTimeout(120_000)

  const tmpPath = req.file?.path
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received. Please attach a PDF, DOCX, or TXT file.' })
    const sid = req.user.id
    const originalName = req.file.originalname
    const ext = path.extname(originalName).toLowerCase()
    const courseId    = req.body.courseId    || null
    const courseCode  = req.body.courseCode  || null
    const courseTitle = req.body.courseTitle || null
    let textContent = ''

    if (ext === '.pdf') {
      const buffer = fs.readFileSync(tmpPath)
      // max: 0 = no page cap — reads ALL pages (1000+ page support)
      const parsed = await pdfParse(buffer, { max: 0 })
      textContent = parsed.text
    } else if (ext === '.docx') {
      const buffer = fs.readFileSync(tmpPath)
      const result = await mammoth.extractRawText({ buffer })
      textContent = result.value
    } else if (ext === '.txt') {
      textContent = fs.readFileSync(tmpPath, 'utf-8')
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload PDF, DOCX, or TXT.' })
    }

    const cleaned = textContent.replace(/\s+/g, ' ').trim()
    if (cleaned.length < 50) return res.status(400).json({ error: 'Could not extract readable text. Make sure the PDF is text-based (not a scanned image).' })

    // Cap at 500k chars (covers 1000+ pages comfortably), split into 100k chunks
    const CHUNK_SIZE = 100_000
    const MAX_CHARS  = 500_000
    const fullContent = cleaned.slice(0, MAX_CHARS)
    const chunks = []
    for (let i = 0; i < fullContent.length; i += CHUNK_SIZE) {
      chunks.push(fullContent.slice(i, i + CHUNK_SIZE))
    }

    for (let idx = 0; idx < chunks.length; idx++) {
      const insertData = {
        student_id:  sid,
        file_name:   chunks.length > 1 ? `${originalName} [part ${idx+1}/${chunks.length}]` : originalName,
        content:     chunks[idx],
        chunk_index: idx,
        chunk_total: chunks.length,
      }
      if (courseId)    insertData.course_id    = courseId
      if (courseCode)  insertData.course_code  = courseCode
      if (courseTitle) insertData.course_title = courseTitle

      const { error } = await adminSupabase.from('nova_materials').insert(insertData)
      if (error) throw new Error(error.message)
    }

    res.json({
      success:    true,
      file_name:  originalName,
      chars:      fullContent.length,
      chunks:     chunks.length,
      message:    chunks.length > 1
        ? `Uploaded in ${chunks.length} parts — ${fullContent.length.toLocaleString()} characters read`
        : `Uploaded — ${fullContent.length.toLocaleString()} characters read`
    })
  } catch (err) {
    console.error('Nova /upload-material error:', err.message)
    if (err.message?.includes('File too large')) {
      return res.status(413).json({ error: 'File exceeds 40 MB limit. Try compressing the PDF first.' })
    }
    res.status(500).json({ error: err.message })
  } finally {
    if (tmpPath) { try { fs.unlinkSync(tmpPath) } catch(_) {} }
  }
})

export default router
