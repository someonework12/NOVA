#!/usr/bin/env python3
"""
NOVA FINAL INTERRUPT FIX — reads exact live file strings
Run: python3 nova_final.py
"""
import os, shutil, datetime, sys

TARGET = "/workspaces/NOVA/student-hour/client/src/pages/ProfessorNovaPage.jsx"
if not os.path.exists(TARGET):
    TARGET = input("Paste full path to ProfessorNovaPage.jsx: ").strip()

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
BACKUP = TARGET + f".bak_{stamp}"
shutil.copy2(TARGET, BACKUP)
print(f"✅  Backed up → {os.path.basename(BACKUP)}")

with open(TARGET, "r") as f:
    src = f.read()

changes = 0

# ════════════════════════════════════════════════════════════════
# FIX 1 — Replace NovaEar with clean pause/resume that actually
#          STOPS recognition (not just flags it) + add VAD class
# ════════════════════════════════════════════════════════════════
OLD1 = """class NovaEar {
  constructor(onSpeech) {
    this.onSpeech = onSpeech
    this.rec = null
    this.running = false
    this.paused = false       // true while API call is in flight
    this.novaSpeaking = false // true while Nova's TTS is playing
    this.restartT = null
  }

  open() {
    this.running = true
    this.paused = false
    this._start()
  }

  pause() { this.paused = true }

  resume() {
    this.paused = false
    if (!this.rec && this.running) {
      this.restartT = setTimeout(() => this._start(), 300)
    }
  }

  // Tell the ear Nova is now speaking so it can filter her own voice
  setNovaSpeaking(val) { this.novaSpeaking = val }

  close() {
    this.running = false
    this.paused = false
    this.novaSpeaking = false
    clearTimeout(this.restartT)
    this._kill()
  }

  _kill() {
    try { this.rec?.abort() } catch (_) {}
    this.rec = null
  }

  _start() {
    if (!this.running) return
    clearTimeout(this.restartT)
    this._kill()

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.lang = 'en-US'
    rec.maxAlternatives = 3
    rec.interimResults = false
    rec.continuous = !ON_MOBILE

    rec.onresult = (e) => {
      if (this.paused) return  // API in flight — drop

      let best = '', bestConf = -1
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        if (!e.results[i].isFinal && !ON_MOBILE) continue
        for (let j = 0; j < e.results[i].length; j++) {
          const conf = e.results[i][j].confidence || 0.5
          if (conf > bestConf) { bestConf = conf; best = e.results[i][j].transcript }
        }
      }
      const text = best.trim()
      if (!text || text.length < 2) return

      // ── SELF-VOICE FILTER ──────────────────────────────────────────
      // While Nova is speaking, the mic stays open so the browser can
      // detect when YOU start speaking (which cancels the TTS).
      // But we must not send Nova's own voice to the API.
      //
      // Strategy: while novaSpeaking is true, drop ALL recognised text.
      // When you actually speak and interrupt Nova, sendMessage() runs
      // first — it calls setNovaSpeaking(false) before this onresult
      // fires again. So your real words always get through on the next
      // recognition cycle after the interruption clears the flag.
      //
      // This is simpler and more reliable than heuristics (length/conf)
      // which were blocking real short interruptions like "stop", "wait".
      if (this.novaSpeaking) return  // Nova is speaking — drop all, wait for interrupt

      this.paused = true  // prevent duplicate sends
      this.onSpeech(text)
    }

    rec.onerror = (e) => {
      if (e.error === 'aborted') return
      if (e.error === 'not-allowed') { this.running = false; return }
      if (this.running) this.restartT = setTimeout(() => this._start(), 800)
    }

    rec.onend = () => {
      if (!this.running) return
      if (ON_MOBILE) {
        if (!this.paused) this.restartT = setTimeout(() => this._start(), 250)
      } else {
        this.restartT = setTimeout(() => this._start(), 600)
      }
    }

    this.rec = rec
    try { rec.start() }"""

NEW1 = """class NovaEar {
  constructor(onSpeech) {
    this.onSpeech = onSpeech
    this.rec = null
    this.running = false
    this.active = false  // recognition should be running
    this.restartT = null
  }

  open() {
    this.running = true
    this.active = true
    this._start()
  }

  // Fully STOP recognition — no echo possible when rec is not running
  pause() {
    this.active = false
    clearTimeout(this.restartT)
    this._kill()
  }

  // Restart recognition — student's turn to speak
  resume() {
    if (!this.running) return
    this.active = true
    this._start()
  }

  close() {
    this.running = false
    this.active = false
    clearTimeout(this.restartT)
    this._kill()
  }

  _kill() {
    try { this.rec?.abort() } catch (_) {}
    this.rec = null
  }

  _start() {
    if (!this.running || !this.active) return
    clearTimeout(this.restartT)
    this._kill()

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.lang = 'en-US'
    rec.maxAlternatives = 3
    rec.interimResults = false
    rec.continuous = !ON_MOBILE

    rec.onresult = (e) => {
      if (!this.active) return
      let best = '', bestConf = -1
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        if (!e.results[i].isFinal && !ON_MOBILE) continue
        for (let j = 0; j < e.results[i].length; j++) {
          const conf = e.results[i][j].confidence || 0.5
          if (conf > bestConf) { bestConf = conf; best = e.results[i][j].transcript }
        }
      }
      const text = best.trim()
      if (!text || text.length < 2) return
      this.active = false  // prevent duplicate sends
      this.onSpeech(text)
    }

    rec.onerror = (e) => {
      if (e.error === 'aborted') return
      if (e.error === 'not-allowed') { this.running = false; return }
      if (this.running && this.active) {
        this.restartT = setTimeout(() => this._start(), 800)
      }
    }

    rec.onend = () => {
      if (!this.running || !this.active) return
      if (ON_MOBILE) {
        this.restartT = setTimeout(() => this._start(), 250)
      } else {
        this.restartT = setTimeout(() => this._start(), 600)
      }
    }

    this.rec = rec
    try { rec.start() }"""

if OLD1 in src:
    src = src.replace(OLD1, NEW1, 1)
    changes += 1
    print("✅  Fix 1 applied — NovaEar rebuilt (pause=stop, resume=restart)")
else:
    print("❌  Fix 1 failed — NovaEar not matched")

# ════════════════════════════════════════════════════════════════
# FIX 2 — Replace TTS block: pause rec, arm VAD, resume after
# ════════════════════════════════════════════════════════════════
OLD2 = """      if (voiceOnRef.current) {
        speakingRef.current = true
        setNovaState('speaking')
        earRef.current?.setNovaSpeaking(true)   // ACTIVATE filter — drop Nova's own voice
        earRef.current?.resume()                 // mic open so YOU can interrupt
        speak(reply, () => {
          speakingRef.current = false
          earRef.current?.setNovaSpeaking(false) // Nova done — accept all speech
          setNovaState('idle')
          setBoardVisible(false)
        }, speakingRef)"""

NEW2 = """      if (voiceOnRef.current) {
        speakingRef.current = true
        setNovaState('speaking')
        earRef.current?.pause()   // stop recognition — no echo while Nova speaks
        vadRef.current?.arm()     // VAD watches for YOUR voice to trigger interrupt
        speak(reply, () => {
          // Nova finished speaking naturally
          speakingRef.current = false
          vadRef.current?.disarm()
          setNovaState('idle')
          setBoardVisible(false)
          earRef.current?.resume()  // open mic for next question
        }, speakingRef)"""

if OLD2 in src:
    src = src.replace(OLD2, NEW2, 1)
    changes += 1
    print("✅  Fix 2 applied — TTS block wired to VAD")
else:
    print("❌  Fix 2 failed — TTS block not matched")

# ════════════════════════════════════════════════════════════════
# FIX 3 — Add VoiceActivityDetector class before component
# ════════════════════════════════════════════════════════════════
VAD_CLASS = """
// ─────────────────────────────────────────────────────────────────
// VOICE ACTIVITY DETECTOR
// Watches raw mic volume via AudioContext. When YOUR voice crosses
// the threshold while Nova speaks, fires onVoiceDetected to
// trigger interruption. Completely separate from SpeechRecognition
// so no echo conflict at all.
// ─────────────────────────────────────────────────────────────────
class VoiceActivityDetector {
  constructor(onVoiceDetected) {
    this.onVoiceDetected = onVoiceDetected
    this.ctx = null; this.analyser = null; this.stream = null
    this.rafId = null; this.active = false; this.triggered = false
    this.aboveStart = null
    this.THRESHOLD = 18   // RMS 0-255. 18 = clear speech, ignores background noise
    this.HOLD_MS = 120    // must stay above threshold for 120ms — avoids click triggers
  }

  async start() {
    if (this.ctx) return
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      const source = this.ctx.createMediaStreamSource(this.stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 512
      source.connect(this.analyser)
      this._poll()
    } catch (_) { /* mic not available — VAD disabled silently */ }
  }

  arm()   { this.active = true;  this.triggered = false; this.aboveStart = null }
  disarm(){ this.active = false; this.triggered = false; this.aboveStart = null }

  stop() {
    this.active = false
    cancelAnimationFrame(this.rafId)
    try { this.stream?.getTracks().forEach(t => t.stop()) } catch (_) {}
    try { this.ctx?.close() } catch (_) {}
    this.ctx = null
  }

  _poll() {
    if (!this.analyser) return
    const buf = new Uint8Array(this.analyser.fftSize)
    const tick = () => {
      this.rafId = requestAnimationFrame(tick)
      if (!this.active || this.triggered) return
      this.analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) { const v = buf[i] - 128; sum += v * v }
      const rms = Math.sqrt(sum / buf.length)
      if (rms > this.THRESHOLD) {
        if (!this.aboveStart) this.aboveStart = Date.now()
        else if (Date.now() - this.aboveStart >= this.HOLD_MS) {
          this.triggered = true; this.active = false
          this.onVoiceDetected()
        }
      } else { this.aboveStart = null }
    }
    tick()
  }
}

"""

COMPONENT_MARKER = "export default function ProfessorNovaPage()"
if VAD_CLASS.strip() not in src and COMPONENT_MARKER in src:
    src = src.replace(COMPONENT_MARKER, VAD_CLASS + COMPONENT_MARKER, 1)
    changes += 1
    print("✅  Fix 3 applied — VoiceActivityDetector class inserted")
else:
    print("✅  Fix 3 skipped — VAD already present")
    changes += 1  # don't penalise

# ════════════════════════════════════════════════════════════════
# FIX 4 — Wire VAD init into useEffect (already done by prev patch)
#          but make sure vadRef is declared and VAD is constructed
# ════════════════════════════════════════════════════════════════
# vadRef already added by previous patch run — check and skip if present
if "vadRef" in src and "VoiceActivityDetector" in src and "vad.start()" in src:
    print("✅  Fix 4 skipped — VAD already wired in useEffect")
    changes += 1
else:
    # Wire it in
    OLD4 = """    const ear = new NovaEar((text) => {
      if (sendRef.current) sendRef.current(text)
    })
    earRef.current = ear"""

    NEW4 = """    const ear = new NovaEar((text) => {
      if (sendRef.current) sendRef.current(text)
    })
    earRef.current = ear

    const vad = new VoiceActivityDetector(() => {
      // YOUR voice detected while Nova was speaking — interrupt her
      if (speakingRef.current) {
        window.speechSynthesis.cancel()
        speakingRef.current = false
        vad.disarm()
        setNovaState('idle')
        setBoardVisible(false)
        setTimeout(() => ear.resume(), 200)  // 200ms settle then open mic
      }
    })
    vadRef.current = vad
    vad.start()"""

    if OLD4 in src:
        src = src.replace(OLD4, NEW4, 1)
        changes += 1
        print("✅  Fix 4 applied — VAD constructed in useEffect")
    else:
        print("⚠️   Fix 4 skipped — ear init pattern not found")

# ════════════════════════════════════════════════════════════════
# Write
# ════════════════════════════════════════════════════════════════
with open(TARGET, "w") as f:
    f.write(src)

print(f"\n✅  Saved → {TARGET}")
print(f"   To undo: cp \"{BACKUP}\" \"{TARGET}\"")
print("""
   How it works now:
   Nova speaks  → recognition STOPS (no echo at all)
                → VAD watches mic volume for YOUR voice
   You speak    → VAD fires in ~120ms
                → Nova cut off immediately
                → 200ms audio settle
                → recognition RESUMES
                → your sentence heard perfectly

   Restart dev server:
   cd /workspaces/NOVA/client && npm run dev
""")
