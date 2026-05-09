// ─────────────────────────────────────────────────────────────────
// TRAINING DATA COLLECTION
// Add these routes to your nova.js
// Every conversation automatically builds your training dataset
// ─────────────────────────────────────────────────────────────────

// ── Auto-save function — call this after every chat response ─────
async function saveTrainingData(studentId, messages, reply, emotionalState, courses) {
  try {
    const lastMessage = messages.at(-1)
    if (!lastMessage || reply.length < 80) return  // too short to be useful

    // Build context from previous 2 messages
    const context = messages.slice(-3, -1)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')
      .slice(0, 600)

    await adminSupabase.from('nova_training_data').insert({
      student_id:      studentId,
      instruction:     lastMessage.content.slice(0, 600),
      context:         context || null,
      ideal_response:  reply.slice(0, 3000),
      course_code:     courses?.[0]?.course_code || null,
      topic:           detectTopic(lastMessage.content),
      emotional_state: emotionalState,
      quality_score:   scoreResponse(reply)
    })
  } catch (err) {
    // Silent fail — never block the main response for this
    console.error('Training data save error:', err.message)
  }
}

// ── Detect topic from message ────────────────────────────────────
function detectTopic(text) {
  const t = text.toLowerCase()
  if (/integrat|derivat|calculus|differentiat/.test(t)) return 'calculus'
  if (/algebra|equation|quadratic|factor/.test(t)) return 'algebra'
  if (/probability|statistic|mean|variance/.test(t)) return 'statistics'
  if (/physic|force|motion|energy|wave/.test(t)) return 'physics'
  if (/chemi|molecule|atom|reaction|bond/.test(t)) return 'chemistry'
  if (/biology|cell|gene|evolution|organ/.test(t)) return 'biology'
  if (/programming|code|algorithm|function|loop/.test(t)) return 'programming'
  if (/english|grammar|essay|literature/.test(t)) return 'english'
  if (/economics|supply|demand|market/.test(t)) return 'economics'
  return 'general'
}

// ── Score response quality (1-5) ─────────────────────────────────
function scoreResponse(reply) {
  let score = 3
  // Longer thoughtful responses score higher
  if (reply.length > 400) score++
  // Responses with questions score higher (Socratic)
  if (reply.includes('?')) score++
  // Responses that are too short score lower
  if (reply.length < 120) score--
  return Math.min(5, Math.max(1, score))
}

// ─────────────────────────────────────────────────────────────────
// ADD THIS to your /chat route, right after you get the reply:
//
//   const { text: reply, provider } = await smartComplete({...})
//
//   // ADD THIS LINE:
//   saveTrainingData(sid, messages, reply, emotionalState, courses)
//
// ─────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────
// POST /save-voice — saves student voice recording + transcript
// Called from the frontend after each voice interaction
// This captures Nigerian intonation, accent, code-switching
// ─────────────────────────────────────────────────────────────────
const voiceUpload = multer({
  dest: '/tmp/nova-voice/',
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB per voice clip
})

router.post('/save-voice', voiceUpload.single('audio'), async (req, res) => {
  const tmpPath = req.file?.path
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio received' })

    const sid = req.user.id
    const { transcript, novaResponse, emotionalState, courseCode } = req.body

    // Detect language mixing (Nigerian students often code-switch)
    const languageMix = detectLanguageMix(transcript || '')

    // Upload audio to Supabase Storage
    const audioBuffer = fs.readFileSync(tmpPath)
    const fileName = `${sid}/${Date.now()}.webm`
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('voice-training')
      .upload(fileName, audioBuffer, { contentType: 'audio/webm' })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = adminSupabase.storage
      .from('voice-training')
      .getPublicUrl(fileName)

    // Save voice data record
    await adminSupabase.from('nova_voice_data').insert({
      student_id:      sid,
      audio_url:       publicUrl,
      transcript:      transcript?.slice(0, 500) || null,
      detected_emotion: emotionalState || 'neutral',
      language_mix:    languageMix,
      course_code:     courseCode || null,
      nova_response:   novaResponse?.slice(0, 500) || null
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Voice save error:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    if (tmpPath) { try { fs.unlinkSync(tmpPath) } catch (_) {} }
  }
})

// ── Detect language mixing patterns ─────────────────────────────
function detectLanguageMix(text) {
  const t = text.toLowerCase()
  const mixes = []

  // Pidgin English markers
  if (/\b(na|wetin|abeg|abi|shey|dey|wahala|no be|e don|make i|una|dem|go come)\b/.test(t)) {
    mixes.push('pidgin')
  }
  // Yoruba markers
  if (/\b(omo|ehn|sha|o|biko|jare|kini|bawo|ehen|toh)\b/.test(t)) {
    mixes.push('yoruba')
  }
  // Igbo markers
  if (/\b(biko|nna|nne|chai|chineke|gini|kedu)\b/.test(t)) {
    mixes.push('igbo')
  }
  // Hausa markers
  if (/\b(kai|wallahi|haba|yauwa|sannu|nagode)\b/.test(t)) {
    mixes.push('hausa')
  }

  if (mixes.length === 0) return 'english-only'
  return `english-${mixes.join('-')}`
}

// ─────────────────────────────────────────────────────────────────
// GET /training-stats — see how much data you've collected
// ─────────────────────────────────────────────────────────────────
router.get('/training-stats', async (req, res) => {
  try {
    const [textCount, voiceCount] = await Promise.all([
      adminSupabase.from('nova_training_data').select('id', { count: 'exact', head: true }),
      adminSupabase.from('nova_voice_data').select('id', { count: 'exact', head: true })
    ])

    const byTopic = await adminSupabase
      .from('nova_training_data')
      .select('topic')

    const topicCounts = {}
    byTopic.data?.forEach(r => {
      topicCounts[r.topic] = (topicCounts[r.topic] || 0) + 1
    })

    const byLanguage = await adminSupabase
      .from('nova_voice_data')
      .select('language_mix')

    const languageCounts = {}
    byLanguage.data?.forEach(r => {
      languageCounts[r.language_mix] = (languageCounts[r.language_mix] || 0) + 1
    })

    res.json({
      text_conversations: textCount.count || 0,
      voice_recordings:   voiceCount.count || 0,
      readiness: {
        fine_tuning_ready: (textCount.count || 0) >= 500,
        conversations_needed: Math.max(0, 500 - (textCount.count || 0)),
        voice_samples_needed: Math.max(0, 1000 - (voiceCount.count || 0))
      },
      topics:    topicCounts,
      languages: languageCounts
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
