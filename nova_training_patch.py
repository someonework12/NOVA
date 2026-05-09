#!/usr/bin/env python3
"""
NOVA TRAINING DATA COLLECTION PATCH
Adds automatic conversation + voice collection to build your own LLM dataset.
Run: python3 nova_training_patch.py
"""
import os, shutil, datetime, sys

BASE   = "/workspaces/NOVA/student-hour"
NOVA   = f"{BASE}/server/src/routes/nova.js"
PAGE   = f"{BASE}/client/src/pages/ProfessorNovaPage.jsx"

for f in [NOVA, PAGE]:
    if not os.path.exists(f):
        print(f"❌ Not found: {f}"); sys.exit(1)

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
for f in [NOVA, PAGE]: shutil.copy2(f, f + f".bak_{stamp}")
print(f"✅ Backed up both files")

changes = 0

# ════════════════════════════════════════════════════════════════
# PATCH 1 — nova.js: add saveTrainingData + detectTopic + scoreResponse
#           + /save-voice route + /training-stats route
# ════════════════════════════════════════════════════════════════
with open(NOVA) as f: src = f.read()

# Only patch if not already patched
if 'saveTrainingData' not in src:
    TRAINING_FUNCTIONS = '''
// ─────────────────────────────────────────────────────────────────
// TRAINING DATA COLLECTION
// ─────────────────────────────────────────────────────────────────
async function saveTrainingData(studentId, messages, reply, emotionalState, courses) {
  try {
    const lastMessage = messages.at(-1)
    if (!lastMessage || reply.length < 80) return
    const context = messages.slice(-3, -1).map(m => `${m.role}: ${m.content}`).join('\\n').slice(0, 600)
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
  } catch (err) { console.error('Training data save error:', err.message) }
}

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

function scoreResponse(reply) {
  let score = 3
  if (reply.length > 400) score++
  if (reply.includes('?')) score++
  if (reply.length < 120) score--
  return Math.min(5, Math.max(1, score))
}

function detectLanguageMix(text) {
  const t = text.toLowerCase()
  const mixes = []
  if (/\\b(na|wetin|abeg|abi|shey|dey|wahala|no be|e don|make i|una|dem)\\b/.test(t)) mixes.push('pidgin')
  if (/\\b(omo|ehn|sha|biko|jare|kini|bawo|ehen|toh)\\b/.test(t)) mixes.push('yoruba')
  if (/\\b(biko|nna|nne|chai|chineke|gini|kedu)\\b/.test(t)) mixes.push('igbo')
  if (/\\b(kai|wallahi|haba|yauwa|sannu|nagode)\\b/.test(t)) mixes.push('hausa')
  return mixes.length === 0 ? 'english-only' : `english-${mixes.join('-')}`
}

'''
    # Insert before the first router.post
    src = src.replace('router.post(\'/chat\'', TRAINING_FUNCTIONS + "router.post('/chat'", 1)
    changes += 1
    print("✅ Patch 1a — training data functions added")
else:
    print("✅ Patch 1a — already patched")

# Add saveTrainingData call inside /chat route after reply is obtained
if 'saveTrainingData(sid' not in src:
    src = src.replace(
        'await Promise.all([\n      adminSupabase.from(\'nova_memory\').insert(',
        'saveTrainingData(sid, messages, reply, emotionalState, courses)\n\n    await Promise.all([\n      adminSupabase.from(\'nova_memory\').insert(',
        1
    )
    changes += 1
    print("✅ Patch 1b — saveTrainingData call wired into /chat route")
else:
    print("✅ Patch 1b — already patched")

# Add /save-voice and /training-stats routes before export default router
if '/save-voice' not in src:
    VOICE_ROUTES = '''
// ─────────────────────────────────────────────────────────────────
// POST /save-voice — saves student voice clip + transcript
// ─────────────────────────────────────────────────────────────────
const voiceUpload = multer({ dest: '/tmp/nova-voice/', limits: { fileSize: 5 * 1024 * 1024 } })

router.post('/save-voice', voiceUpload.single('audio'), async (req, res) => {
  const tmpPath = req.file?.path
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio received' })
    const sid = req.user.id
    const { transcript, novaResponse, emotionalState, courseCode } = req.body
    const languageMix = detectLanguageMix(transcript || '')
    const audioBuffer = fs.readFileSync(tmpPath)
    const fileName = `${sid}/${Date.now()}.webm`
    const { error: uploadError } = await adminSupabase.storage
      .from('voice-training').upload(fileName, audioBuffer, { contentType: 'audio/webm' })
    if (uploadError) throw new Error(uploadError.message)
    const { data: { publicUrl } } = adminSupabase.storage.from('voice-training').getPublicUrl(fileName)
    await adminSupabase.from('nova_voice_data').insert({
      student_id:       sid,
      audio_url:        publicUrl,
      transcript:       transcript?.slice(0, 500) || null,
      detected_emotion: emotionalState || 'neutral',
      language_mix:     languageMix,
      course_code:      courseCode || null,
      nova_response:    novaResponse?.slice(0, 500) || null
    })
    res.json({ success: true })
  } catch (err) {
    console.error('Voice save error:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    if (tmpPath) { try { fs.unlinkSync(tmpPath) } catch (_) {} }
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /training-stats — see your dataset progress
// ─────────────────────────────────────────────────────────────────
router.get('/training-stats', async (req, res) => {
  try {
    const [textRes, voiceRes, topicRes, langRes] = await Promise.all([
      adminSupabase.from('nova_training_data').select('id', { count: 'exact', head: true }),
      adminSupabase.from('nova_voice_data').select('id', { count: 'exact', head: true }),
      adminSupabase.from('nova_training_data').select('topic'),
      adminSupabase.from('nova_voice_data').select('language_mix')
    ])
    const topicCounts = {}
    topicRes.data?.forEach(r => { topicCounts[r.topic] = (topicCounts[r.topic] || 0) + 1 })
    const langCounts = {}
    langRes.data?.forEach(r => { langCounts[r.language_mix] = (langCounts[r.language_mix] || 0) + 1 })
    const textCount  = textRes.count  || 0
    const voiceCount = voiceRes.count || 0
    res.json({
      text_conversations: textCount,
      voice_recordings:   voiceCount,
      readiness: {
        fine_tuning_3b_ready:  textCount >= 500,
        fine_tuning_8b_ready:  textCount >= 1000,
        whisper_ready:         voiceCount >= 1000,
        text_needed:  Math.max(0, 500  - textCount),
        voice_needed: Math.max(0, 1000 - voiceCount)
      },
      topics:    topicCounts,
      languages: langCounts
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

'''
    src = src.replace('export default router', VOICE_ROUTES + 'export default router', 1)
    changes += 1
    print("✅ Patch 1c — /save-voice and /training-stats routes added")
else:
    print("✅ Patch 1c — already patched")

with open(NOVA, 'w') as f: f.write(src)

# ════════════════════════════════════════════════════════════════
# PATCH 2 — ProfessorNovaPage.jsx: add refs + voice capture + save
# ════════════════════════════════════════════════════════════════
with open(PAGE) as f: src = f.read()

# Add new refs
if 'mediaRecorderRef' not in src:
    src = src.replace(
        'const earRef=useRef(null); const vadRef=useRef(null); const vadInitedRef=useRef(false)',
        'const earRef=useRef(null); const vadRef=useRef(null); const vadInitedRef=useRef(false)\n  const mediaRecorderRef=useRef(null); const audioChunksRef=useRef([]); const lastTranscriptRef=useRef(\'\'); const lastReplyRef=useRef(\'\')',
        1
    )
    changes += 1
    print("✅ Patch 2a — voice capture refs added")
else:
    print("✅ Patch 2a — already patched")

# Add getStream() method to VAD class
if 'getStream()' not in src:
    src = src.replace(
        '  arm(){ this.armed=true; this.fired=false; this.holdStart=null }',
        '  getStream(){ return this.stream }\n  arm(){ this.armed=true; this.fired=false; this.holdStart=null }',
        1
    )
    changes += 1
    print("✅ Patch 2b — VAD.getStream() added")
else:
    print("✅ Patch 2b — already patched")

# Add voice capture functions before toggleMic
if 'startVoiceCapture' not in src:
    VOICE_CAPTURE = '''
  function startVoiceCapture(stream) {
    if(!stream||mediaRecorderRef.current) return
    try{
      const rec=new MediaRecorder(stream,{mimeType:'audio/webm'})
      audioChunksRef.current=[]
      rec.ondataavailable=(e)=>{if(e.data.size>0)audioChunksRef.current.push(e.data)}
      rec.start(100); mediaRecorderRef.current=rec
    }catch(_){}
  }

  function stopVoiceCapture(){
    if(!mediaRecorderRef.current) return Promise.resolve(null)
    return new Promise(resolve=>{
      mediaRecorderRef.current.onstop=()=>{
        const blob=new Blob(audioChunksRef.current,{type:'audio/webm'})
        audioChunksRef.current=[]; mediaRecorderRef.current=null
        resolve(blob.size>2000?blob:null)
      }
      try{mediaRecorderRef.current.stop()}catch(_){mediaRecorderRef.current=null;resolve(null)}
    })
  }

  async function saveVoiceToServer(audioBlob,transcript,novaResponse,emotionalState,courseCode){
    if(!audioBlob) return
    try{
      const {data:{session}}=await supabase.auth.getSession()
      const fd=new FormData()
      fd.append('audio',audioBlob,'recording.webm')
      fd.append('transcript',transcript||'')
      fd.append('novaResponse',novaResponse||'')
      fd.append('emotionalState',emotionalState||'neutral')
      fd.append('courseCode',courseCode||'')
      fetch('/api/nova/save-voice',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},body:fd}).catch(()=>{})
    }catch(_){}
  }

'''
    src = src.replace('  function toggleMic(){', VOICE_CAPTURE + '  function toggleMic(){', 1)
    changes += 1
    print("✅ Patch 2c — voice capture functions added")
else:
    print("✅ Patch 2c — already patched")

# Update toggleMic to start recording
if 'startVoiceCapture' in src and 'vadRef.current?.init()' in src and 'startVoiceCapture(stream)' not in src:
    src = src.replace(
        "      if(!vadInitedRef.current){vadInitedRef.current=true;vadRef.current?.init()}",
        """      if(!vadInitedRef.current){
        vadInitedRef.current=true
        vadRef.current?.init().then(()=>{
          const stream=vadRef.current?.getStream()
          if(stream) startVoiceCapture(stream)
        })
      } else {
        const stream=vadRef.current?.getStream()
        if(stream) startVoiceCapture(stream)
      }""",
        1
    )
    changes += 1
    print("✅ Patch 2d — toggleMic starts voice capture")
else:
    print("✅ Patch 2d — already patched or mic pattern not found")

# Wire voice saving into sendMessage after reply received
if 'lastTranscriptRef.current=clean' not in src:
    src = src.replace(
        "      const reply=data.reply\n      setMessages(prev=>[...prev,{role:'assistant',content:reply}])",
        """      const reply=data.reply
      lastTranscriptRef.current=clean
      lastReplyRef.current=reply
      // Save voice clip as training data (fire and forget)
      stopVoiceCapture().then(blob=>{
        if(blob) saveVoiceToServer(blob,clean,reply,data.emotionalState||'neutral',null)
        const stream=vadRef.current?.getStream()
        if(stream&&micOn) startVoiceCapture(stream)
      })
      setMessages(prev=>[...prev,{role:'assistant',content:reply}])""",
        1
    )
    changes += 1
    print("✅ Patch 2e — voice saving wired into sendMessage")
else:
    print("✅ Patch 2e — already patched")

with open(PAGE, 'w') as f: f.write(src)

print(f"""
✅ {changes} patches applied successfully.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEFORE DEPLOYING — run this SQL in Supabase:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

Also create a Storage bucket in Supabase Dashboard:
  Name: voice-training
  Public: OFF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check your data progress anytime:
  GET /api/nova/training-stats

Then commit:
  cd /workspaces/NOVA && git add -A && git commit -m "feat: training data collection - text + voice + Nigerian language detection" && git push
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
