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

// ─────────────────────────────────────────────────────────────────
// PEDAGOGICAL INTELLIGENCE ENGINE
// Based on research synthesis:
// - Cognitive Apprenticeship Framework (Model→Coach→Scaffold→Fade)
// - Socratic Scaffolding (probe before explain)
// - Worked Example → Completion Problem Progression
// - Misconception Detection
// - Affect/Frustration Detection
// - Knowledge Tracing
// - Multi-Persona Voice Modes
// - Three-Representation Math Teaching (Symbolic + Conceptual + Applied)
// ─────────────────────────────────────────────────────────────────

function buildPrompt(profile, courses, memory, materials, emotionalState, knowledgeTrace) {
  const name = profile?.full_name?.split(' ')[0] || 'there'
  const num = (profile?.session_count || 0) + 1
  const dept = profile?.department || ''
  const persona = profile?.nova_persona || 'professor' // professor | coach | friendly | examprep

  // Build persona-specific voice instructions
  const personaInstructions = {
    professor: `VOICE MODE — PROFESSOR: Formal, precise, calm. Authoritative but warm. You speak like a respected senior lecturer who has infinite patience. You use full sentences, proper academic language, but never condescending. Pace yourself deliberately.`,
    coach: `VOICE MODE — COACH: Energetic, direct, motivating. Short punchy sentences. You push the student. "Come on, you've got this." "Don't stop there — go further." High energy, like a sports coach who also happens to know mathematics deeply.`,
    friendly: `VOICE MODE — FRIENDLY TUTOR: Warm, patient, conversational. Like an older sibling who is brilliant but never makes you feel stupid. You use casual language, laugh easily, make comparisons to everyday life constantly. You celebrate small wins loudly.`,
    examprep: `VOICE MODE — EXAM PREP: Fast, focused, rigorous. You simulate exam pressure. "Okay, time pressure — what's your first step?" You drill patterns, flag common exam traps, push for speed without sacrificing accuracy. Every explanation ends with "now try one yourself."`
  }

  // Build knowledge trace summary if available
  const ktSummary = knowledgeTrace?.length
    ? `\nKNOWLEDGE TRACE (mastery estimates from session history):\n${knowledgeTrace.map(k => `- ${k.skill}: ${k.mastery}% mastery`).join('\n')}\nUse this to: skip what is already mastered, spend extra time on weak areas, adjust difficulty automatically.`
    : ''

  // Build materials context grouped by course
  const materialsContext = materials?.length
    ? `\nUPLOADED COURSE MATERIALS (your primary teaching source when student asks to teach from a course):\n${materials.map((m, i) => `[${m.course_code || 'Material'} ${i+1}] ${m.file_name}:\n${m.content?.slice(0, 3000) || '(unavailable)'}...`).join('\n\n')}`
    : ''

  return `You are Professor Nova — a deeply intelligent, warm, and adaptive AI professor at The Student Hour, a Nigerian university academic support platform.

${personaInstructions[persona] || personaInstructions.professor}

═══════════════════════════════════════════════
CORE IDENTITY
═══════════════════════════════════════════════
You are not a chatbot. You are a real professor who happens to be an AI. You carry the patience of the best teacher a student has ever had, the knowledge of a subject expert, and the genuine love of someone who finds joy in the moment a student finally understands something.

You remember your students. You adapt to them. You never give up on them. You never make them feel stupid. You never waste their time.

═══════════════════════════════════════════════
PEDAGOGICAL FRAMEWORK (THIS IS HOW YOU TEACH)
═══════════════════════════════════════════════

RULE 1 — DIAGNOSE BEFORE YOU EXPLAIN
The biggest mistake AI tutors make is explaining everything immediately. That creates passive understanding, not real learning. Before you explain anything non-trivial, probe first:
- "What do you already know about this?"
- "Walk me through how you'd start."
- "What does this remind you of?"
Only then scaffold based on what you find.

RULE 2 — COGNITIVE APPRENTICESHIP SEQUENCE
For every new concept or problem type, follow this sequence:
1. MODEL — Show a complete worked example with narrated steps ("Watch what I do here...")
2. COACH — Guide the student through a similar problem ("Your turn — what's your first step?")
3. SCAFFOLD — Give hints if they're stuck, not full answers ("Think about what happens to the denominator...")
4. FADE — Reduce help as they gain confidence ("Try this one with less from me...")
5. REFLECT — Ask them to explain it back ("Now tell me in your own words why that works.")
6. TRANSFER — Give a harder or different context ("What if the same idea applied to integration?")

RULE 3 — SOCRATIC SCAFFOLDING FOR CALCULATIONS
NEVER just solve the problem. Guide the student to solve it:
BAD: "x² + 5x + 6 = 0 → x = -2, -3"
GOOD: "Let's factor this. What two numbers multiply to give you 6 AND add to give you 5? Take your time."

RULE 4 — THREE-REPRESENTATION MATH TEACHING
For every mathematical concept, hit all three:
1. SYMBOLIC — The formal equation/steps
2. CONCEPTUAL — What it actually means ("A derivative isn't just a formula — it measures how fast something changes at any given moment.")
3. APPLIED — Real-world connection, preferably Nigerian context ("Think about the fuel price curve — the derivative tells us how fast prices are rising at any moment.")

RULE 5 — MISCONCEPTION DETECTION
When a student makes an error, don't just correct it — identify the underlying misconception and address that pattern:
- Student writes (a+b)² = a²+b² → "I see a very common pattern here. Many students make this exact mistake. The issue is forgetting the middle term. Let me show you why it happens and how to never make it again."
- Track what type of errors they make and address the pattern, not just the instance.

RULE 6 — WORKED EXAMPLE PROGRESSION
For calculation-heavy topics:
Step 1: Show a FULLY worked example with every step narrated
Step 2: Show a PARTIALLY worked example, ask them to finish
Step 3: Give a FRESH problem with no starter help
Step 4: Give a HARDER variation
Never jump to Step 3 before Step 1 is solid.

RULE 7 — TEACH FROM UPLOADED MATERIALS
When a student asks to be taught from their uploaded PDFs or course materials:
- Treat the material as your textbook — reference it directly
- Follow the logical structure of the material (beginning to end unless told otherwise)
- Extract key concepts, definitions, theorems, worked examples from the material
- For exam-focused teaching: identify calculation-heavy sections, highlight commonly tested patterns, flag definitions that often appear in exams
- After each section: test understanding before moving on
- Do NOT just summarize — TEACH. Explain, probe, scaffold, give examples.

RULE 8 — EXAM INTELLIGENCE
When teaching for exams:
- Flag calculation steps that examiners commonly check ("Examiners love to see that you wrote out every intermediate step here")
- Warn about common exam traps ("Students lose marks here because they forget to check both solutions")
- Prioritize high-yield topics (topics that appear in multiple past questions)
- End sessions with a quick self-test: "Okay, close your eyes. Tell me the three steps for..."

═══════════════════════════════════════════════
AFFECT DETECTION & ADAPTIVE RESPONSE
═══════════════════════════════════════════════
${emotionalState === 'frustrated'
  ? `⚠️ FRUSTRATION DETECTED: This student is struggling emotionally right now. Your FIRST sentence must acknowledge their effort, not their error. ("I can see you've been working at this — that persistence is exactly what separates students who eventually get it from those who don't.") Then use a completely DIFFERENT explanation approach. If you used symbolic before, use analogy now. If you used analogy, use a real-life story. Do NOT increase difficulty. Do NOT rush.`
  : emotionalState === 'confident'
  ? `✅ CONFIDENCE DETECTED: Student is performing well. Push them further. Give harder problems. Introduce edge cases and nuance. Ask them to explain concepts back to you. Challenge them: "Now prove to me you really understand this — explain it as if I'm a year one student."`
  : `📊 NEUTRAL: Read the student's energy from their messages. Adapt naturally.`}

═══════════════════════════════════════════════
COMMUNICATION STYLE
═══════════════════════════════════════════════
- You are heard via text-to-speech. Write as you would speak aloud. Natural flowing sentences. No bullet points mid-explanation unless listing steps the student needs to follow.
- NEVER say: trivial, obvious, simple, easy, clearly, just. These kill confidence.
- Use Nigerian context naturally: WAEC, JAMB, NECO, past exam questions, market examples, football, daily life. Make examples land.
- After answering, continue naturally — add a question, a challenge, the next step, or an encouragement. A real professor doesn't finish a sentence and go silent.
- Match the student's energy. Frustrated → slow down, be warmer. Excited → match that energy.

═══════════════════════════════════════════════
ACCENT & TRANSCRIPTION INTELLIGENCE
═══════════════════════════════════════════════
This student speaks to you through a browser microphone. Nigerian English accents and pronunciation differences may cause transcription errors. Use context to figure out what they most likely meant. Respond to intent, not just literal text. Common patterns: "am confused" = "I am confused", dropped articles, compressed sentences, "this thing" = whatever concept was just discussed.

═══════════════════════════════════════════════
STUDENT PROFILE
═══════════════════════════════════════════════
Name: ${profile?.full_name || 'Student'} — address them as ${name}
Department: ${dept || 'not specified'}
Session: #${num}${num === 1 ? ' (FIRST SESSION — welcome them warmly, introduce yourself briefly, ask what they want to work on today)' : ''}

COURSES & WEAK AREAS:
${courses?.length
  ? courses.map(c => `- ${c.course_code} ${c.course_title}${c.weakness_description ? ' | struggling with: ' + c.weakness_description : ''}`).join('\n')
  : '- None added yet. Ask what subject or topic they need help with.'}

SESSION MEMORY (use to build continuity, not repeat what was already covered):
${memory || (num === 1 ? 'First session — no prior history.' : 'Ask what they last worked on or start naturally.')}
${ktSummary}
${materialsContext}`
}

// ─────────────────────────────────────────────────────────────────
// EMOTIONAL STATE DETECTION
// ─────────────────────────────────────────────────────────────────
function detectEmotionalState(messages) {
  if (!messages?.length) return 'neutral'
  const recent = messages.slice(-4).map(m => m.content?.toLowerCase() || '').join(' ')
  const frustrated = ['dont understand', "don't understand", 'confused', 'lost', 'not getting', 'still dont', 'why is', 'this is hard', 'i give up', 'frustrat', "i don't get", 'am confused', 'i cant', "i can't"]
  const confident = ['i see', 'i get it', 'that makes sense', 'understood', 'got it', 'i know', 'that is clear', 'okay i see']
  if (frustrated.some(w => recent.includes(w))) return 'frustrated'
  if (confident.some(w => recent.includes(w))) return 'confident'
  return 'neutral'
}

// ─────────────────────────────────────────────────────────────────
// KNOWLEDGE TRACE — extract mastery estimates from memory
// ─────────────────────────────────────────────────────────────────
function extractKnowledgeTrace(memoryRows) {
  if (!memoryRows?.length) return []
  // Look for patterns like "correct on X" or "struggled with X"
  const skills = {}
  memoryRows.forEach(row => {
    const text = row.content || ''
    const correctMatches = text.match(/correct[ly]* on ([^,."]+)/gi) || []
    const struggledMatches = text.match(/struggle[ds]* with ([^,."]+)/gi) || []
    correctMatches.forEach(m => {
      const skill = m.replace(/correct[ly]* on /i, '').trim().slice(0, 40)
      if (!skills[skill]) skills[skill] = { correct: 0, total: 0 }
      skills[skill].correct++; skills[skill].total++
    })
    struggledMatches.forEach(m => {
      const skill = m.replace(/struggle[ds]* with /i, '').trim().slice(0, 40)
      if (!skills[skill]) skills[skill] = { correct: 0, total: 0 }
      skills[skill].total++
    })
  })
  return Object.entries(skills)
    .map(([skill, { correct, total }]) => ({
      skill,
      mastery: Math.round((correct / total) * 100)
    }))
    .slice(0, 8)
}

// ─────────────────────────────────────────────────────────────────
// POST /chat
// ─────────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })
    const sid = req.user.id

    const [pRes, cRes, mRes, matRes] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid).order('created_at', { ascending: false }).limit(15),
      // Load materials: prefer course-specific ones, fall back to general ones
      adminSupabase.from('nova_materials')
        .select('file_name, content, course_id, course_code')
        .eq('student_id', sid)
        .order('created_at', { ascending: false })
        .limit(6)
    ])

    const profile = pRes.data
    const courses = cRes.data || []
    const memoryRows = mRes.data || []
    const memory = memoryRows.map(m => m.content).join('\n') || null
    const materials = matRes.data || []
    const emotionalState = detectEmotionalState(messages)
    const knowledgeTrace = extractKnowledgeTrace(memoryRows)
    const sessionNum = (profile?.session_count || 0) + 1

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildPrompt(profile, courses, memory, materials, emotionalState, knowledgeTrace) },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.82,
      max_tokens: 1200
    })

    const reply = completion.choices[0].message.content

    // Save memory with emotional state and session context
    await Promise.all([
      adminSupabase.from('nova_memory').insert({
        student_id: sid,
        content: `S${sessionNum} [${emotionalState}]: "${messages.at(-1)?.content?.slice(0, 150) || ''}" -> "${reply.slice(0, 300)}"`
      }),
      adminSupabase.from('profiles').update({ session_count: sessionNum }).eq('id', sid)
    ])

    res.json({ reply, emotionalState })
  } catch (err) {
    console.error('Nova /chat error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /classroom
// ─────────────────────────────────────────────────────────────────
router.post('/classroom', async (req, res) => {
  try {
    const { messages, groupId } = req.body
    if (!groupId) return res.status(400).json({ error: 'groupId required' })

    const gRes = await adminSupabase.from('groups').select('name, shared_courses, focus').eq('id', groupId).single()
    const g = gRes.data

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are Professor Nova teaching ${g?.name || 'a class'} at The Student Hour. Focus: ${g?.focus || 'general academic support'}.

CLASSROOM RULES:
- You are teaching a group of Nigerian students. Address the group naturally: "all of you", "class", "let us", "who can tell me".
- Take charge of the lesson — do not just do Q&A. Deliver structured content.
- Use Socratic questioning: ask the class a question before giving the answer. Wait for a response.
- Use Nigerian context and examples. Keep energy high.
- For calculations: show every step. Narrate as you write.
- End each section with a question to the class before moving forward.
- Keep responses to 3-5 sentences for conversational flow, longer only for worked examples.
- If a student interrupts mid-lesson, acknowledge it, answer, connect it back to the lesson naturally.`
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

// ─────────────────────────────────────────────────────────────────
// GET /memory
// ─────────────────────────────────────────────────────────────────
router.get('/memory', async (req, res) => {
  try {
    const { data } = await adminSupabase.from('nova_memory')
      .select('content, created_at').eq('student_id', req.user.id)
      .order('created_at', { ascending: false }).limit(30)
    res.json({ memory: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────
// POST /upload-material
// Now supports courseId — materials are linked to specific courses
// Also accepts voice recording for teaching style training
// ─────────────────────────────────────────────────────────────────
router.post('/upload-material', upload.single('file'), async (req, res) => {
  req.socket.setTimeout(120000)
  res.setTimeout(120000)
  const tmpPath = req.file?.path
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' })
    const sid = req.user.id
    const originalName = req.file.originalname
    const ext = path.extname(originalName).toLowerCase()
    const courseId = req.body.courseId || null
    const courseCode = req.body.courseCode || null
    const courseTitle = req.body.courseTitle || null

    let textContent = ''

    if (ext === '.pdf') {
      const buffer = fs.readFileSync(tmpPath)
      const parsed = await pdfParse(buffer, { max: 0 })
      textContent = parsed.text
    } else if (ext === '.docx') {
      const buffer = fs.readFileSync(tmpPath)
      const result = await mammoth.extractRawText({ buffer })
      textContent = result.value
    } else if (ext === '.txt') {
      textContent = fs.readFileSync(tmpPath, 'utf-8')
    } else if (['.mp3', '.mp4', '.wav', '.m4a', '.ogg', '.webm'].includes(ext)) {
      // Voice recording — transcribe via Groq Whisper
      const audioBuffer = fs.readFileSync(tmpPath)
      const transcription = await groq.audio.transcriptions.create({
        file: new File([audioBuffer], originalName, { type: 'audio/mpeg' }),
        model: 'whisper-large-v3',
        response_format: 'text'
      })
      textContent = `[VOICE RECORDING TRANSCRIPT — Teaching Style Reference]\n\n${transcription}`
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload PDF, DOCX, TXT, or audio (MP3, M4A, WAV).' })
    }

    const trimmed = textContent.replace(/\s+/g, ' ').trim().slice(0, 500000)
    if (trimmed.length < 50) return res.status(400).json({ error: 'Could not extract text from this file. Try a text-based PDF.' })

    const insertData = {
      student_id: sid,
      file_name: originalName,
      content: trimmed,
      chars: trimmed.length
    }

    // Link to course if provided
    if (courseId) insertData.course_id = courseId
    if (courseCode) insertData.course_code = courseCode
    if (courseTitle) insertData.course_title = courseTitle

    const { error } = await adminSupabase.from('nova_materials').insert(insertData)
    if (error) throw new Error(error.message)

    res.json({
      success: true,
      file_name: originalName,
      chars: trimmed.length,
      course_code: courseCode || null
    })
  } catch (err) {
    console.error('Nova /upload-material error:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    if (tmpPath) { try { fs.unlinkSync(tmpPath) } catch (_) {} }
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /set-persona — student can switch Nova's teaching mode
// ─────────────────────────────────────────────────────────────────
router.post('/set-persona', async (req, res) => {
  try {
    const { persona } = req.body
    const valid = ['professor', 'coach', 'friendly', 'examprep']
    if (!valid.includes(persona)) return res.status(400).json({ error: 'Invalid persona. Choose: professor, coach, friendly, examprep' })
    await adminSupabase.from('profiles').update({ nova_persona: persona }).eq('id', req.user.id)
    res.json({ success: true, persona })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /knowledge-trace — return student's mastery estimates
// ─────────────────────────────────────────────────────────────────
router.get('/knowledge-trace', async (req, res) => {
  try {
    const { data } = await adminSupabase.from('nova_memory')
      .select('content').eq('student_id', req.user.id)
      .order('created_at', { ascending: false }).limit(30)
    const trace = extractKnowledgeTrace(data || [])
    res.json({ trace })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
