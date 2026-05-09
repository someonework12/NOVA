// ─────────────────────────────────────────────────────────────────
// COMPLETE ADDITION FOR ProfessorNovaPage.jsx
// Captures raw audio while student speaks for training data
// ─────────────────────────────────────────────────────────────────

// ── STEP 1: Add these refs alongside your existing refs ──────────
/*
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const lastTranscriptRef = useRef('')
  const lastReplyRef      = useRef('')
*/

// ── STEP 2: Add these functions inside your component ────────────

function startVoiceCapture(stream) {
  if (!stream || mediaRecorderRef.current) return
  try {
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    audioChunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }
    recorder.start(100)
    mediaRecorderRef.current = recorder
  } catch (_) {}
}

function stopVoiceCapture() {
  if (!mediaRecorderRef.current) return Promise.resolve(null)
  return new Promise(resolve => {
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      audioChunksRef.current = []
      mediaRecorderRef.current = null
      resolve(blob.size > 2000 ? blob : null) // ignore tiny/empty clips
    }
    try { mediaRecorderRef.current.stop() }
    catch (_) { mediaRecorderRef.current = null; resolve(null) }
  })
}

async function saveVoiceToServer(audioBlob, transcript, novaResponse, emotionalState, courseCode) {
  if (!audioBlob) return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const fd = new FormData()
    fd.append('audio',          audioBlob, 'recording.webm')
    fd.append('transcript',     transcript    || '')
    fd.append('novaResponse',   novaResponse  || '')
    fd.append('emotionalState', emotionalState || 'neutral')
    fd.append('courseCode',     courseCode    || '')

    // Fire and forget — never block the UI for this
    fetch('/api/nova/save-voice', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: fd
    }).catch(() => {})
  } catch (_) {}
}

// ── STEP 3: Update your NovaEar to expose the stream ─────────────
// In your NovaEar class, the VAD already has a stream from getUserMedia.
// Expose it so we can pass it to MediaRecorder.
// Add this method to your VAD class:
/*
  getStream() { return this.stream }
*/

// ── STEP 4: Update toggleMic ─────────────────────────────────────
// Replace your existing toggleMic with this version:

function toggleMic() {
  if (micOn) {
    // Stop recording before closing mic
    stopVoiceCapture().then(blob => {
      if (blob && lastTranscriptRef.current) {
        saveVoiceToServer(
          blob,
          lastTranscriptRef.current,
          lastReplyRef.current,
          'neutral',
          null
        )
      }
    })
    earRef.current?.close()
    setMicOn(false)
    setNovaState('idle')
  } else {
    earRef.current?.open()
    setMicOn(true)

    if (!vadInitedRef.current) {
      vadInitedRef.current = true
      vadRef.current?.init().then(() => {
        // Start capturing audio once VAD has the stream
        const stream = vadRef.current?.getStream()
        if (stream) startVoiceCapture(stream)
      })
    } else {
      const stream = vadRef.current?.getStream()
      if (stream) startVoiceCapture(stream)
    }

    if (ON_MOBILE && !greetedRef.current && voiceOnRef.current) {
      greetedRef.current = true
      speakingRef.current = true
      const name = profile?.full_name?.split(' ')[0] || 'there'
      speak(
        'Hello ' + name + '. I am Professor Nova. Speak to me, and tap Stop to interrupt.',
        {
          onStart: () => { if (speakingRef.current) setNovaState('speaking') },
          onDone:  () => { speakingRef.current = false; setNovaState('idle') },
          cancelRef: speakingRef
        }
      )
    }
  }
}

// ── STEP 5: Update sendMessage to save voice after each turn ─────
// Inside sendMessage, after you get the reply from the API,
// add these lines right before the TTS block:

/*
  const reply = data.reply

  // Save the voice clip for this turn as training data
  stopVoiceCapture().then(blob => {
    if (blob) {
      saveVoiceToServer(
        blob,
        clean,                          // what the student said
        reply,                          // what Nova replied
        data.emotionalState || 'neutral',
        courses?.[0]?.course_code || null
      )
    }
    // Restart capture for next turn
    const stream = vadRef.current?.getStream()
    if (stream && micOn) startVoiceCapture(stream)
  })

  // Store refs for use if mic is toggled off mid-session
  lastTranscriptRef.current = clean
  lastReplyRef.current = reply
*/

// ── STEP 6: Update VAD class to expose stream ────────────────────
// Add this one method to your VAD class:
/*
  getStream() { return this.stream }
*/

// ─────────────────────────────────────────────────────────────────
// SQL — run in Supabase SQL Editor before deploying
// ─────────────────────────────────────────────────────────────────
/*
CREATE TABLE IF NOT EXISTS nova_training_data (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  instruction     text NOT NULL,
  context         text,
  ideal_response  text NOT NULL,
  course_code     text,
  topic           text,
  emotional_state text,
  quality_score   int DEFAULT 3,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nova_voice_data (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  audio_url        text,
  transcript       text,
  detected_emotion text,
  language_mix     text,
  course_code      text,
  nova_response    text,
  created_at       timestamptz DEFAULT now()
);

-- Storage bucket for voice files
-- Run in Supabase Dashboard → Storage → New Bucket
-- Name: voice-training
-- Public: false (private, only your server can access)
*/

// ─────────────────────────────────────────────────────────────────
// WHAT THIS COLLECTS AND WHY IT'S VALUABLE
// ─────────────────────────────────────────────────────────────────
/*
Every student session now collects:

TEXT LAYER:
  - Exact question the student asked
  - 2 messages of prior context
  - Nova's ideal pedagogical response
  - Topic detected (calculus, physics, etc.)
  - Emotional state (frustrated, confident, neutral)
  - Quality score (1-5) based on response characteristics

VOICE LAYER:
  - Raw .webm audio of the student speaking
  - Transcript of what they said
  - Nigerian language mixing detected automatically:
      "english-pidgin", "english-yoruba", "english-igbo" etc.
  - The emotional state at time of speaking
  - Nova's response to that speech

WHY THE VOICE DATA IS UNIQUELY VALUABLE:
  No existing speech dataset captures:
  - Nigerian English with WAEC/JAMB vocabulary
  - Yoruba/Igbo/Hausa/Pidgin code-switching mid-sentence
  - The specific intonation of confusion vs understanding
  - Academic vocabulary spoken with West African accent
  - The way Nigerian students ask questions (rising tone, 
    compressed sentences, dropped articles)

  When you have 5,000+ voice samples you can:
  1. Fine-tune Whisper for Nigerian-accent transcription
     (currently Whisper struggles with Nigerian English)
  2. Train a speech emotion model specific to Nigerian students
  3. Build a speech-to-text model that understands Pidgin
  4. License this dataset to other African edtech companies

TRAINING READINESS MILESTONES:
  500  text conversations  → enough to fine-tune Llama 3.2 3B
  1000 text conversations  → enough to fine-tune Llama 3.1 8B  
  5000 text conversations  → enough to train a genuinely 
                             specialised Nigerian education model
  1000 voice recordings    → enough to fine-tune Whisper for 
                             Nigerian English accent
  5000 voice recordings    → enough to train speech emotion 
                             detection for Nigerian students

Check your progress anytime:
  GET /api/nova/training-stats
*/
