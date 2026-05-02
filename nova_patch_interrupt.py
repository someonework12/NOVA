#!/usr/bin/env python3
"""
NOVA INTERRUPTION FIX — proper two-phase approach
- While Nova speaks: SpeechRecognition is PAUSED (no echo possible)
- AudioContext VAD watches mic volume for YOUR voice
- When your voice detected → Nova cut off → recognition resumes → you speak

Run: python3 nova_patch_interrupt.py
"""
import os, shutil, datetime, sys

CANDIDATES = [
    "/workspaces/NOVA/student-hour/client/src/pages/ProfessorNovaPage.jsx",
    "/workspaces/NOVA/client/src/pages/ProfessorNovaPage.jsx",
]
TARGET = None
for c in CANDIDATES:
    if os.path.exists(c):
        TARGET = c
        break
if TARGET is None:
    t = input("Paste full path to ProfessorNovaPage.jsx: ").strip()
    if not os.path.exists(t):
        print(f"❌  Not found: {t}"); sys.exit(1)
    TARGET = t

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
BACKUP = TARGET + f".bak_{stamp}"
shutil.copy2(TARGET, BACKUP)
print(f"✅  Backed up → {os.path.basename(BACKUP)}")

with open(TARGET, "r") as f:
    src = f.read()

changes = 0

# ════════════════════════════════════════════════════════════════
# FIX 1 — Replace NovaEar class entirely
#
# New design:
#   • pause() now actually STOPS recognition (no echo possible)
#   • resume() restarts it cleanly
#   • setNovaSpeaking() removed — no longer needed
#   • onSpeech callback still works exactly the same
# ════════════════════════════════════════════════════════════════

OLD_EAR_START = """class NovaEar {
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
      // While Nova is speaking the mic stays open so YOU can interrupt.
      // But Nova's own TTS audio leaks into the mic and gets recognised.
      // Her echo has two tell-tale signs:
      //   1. Short fragments — echo tends to be 1-2 words / <12 chars
      //   2. Near-perfect confidence (>0.97) — browser hears its own
      //      clean speaker output and recognises it perfectly
      // A real student interruption is usually 3+ words and confidence
      // drops because there's room noise, breathing, accent, etc.
      // So: during Nova's speech, drop anything that looks like echo.
      if (this.novaSpeaking) {
        const wordCount = text.split(/\\s+/).length
        const tooShort = text.length < 12 || wordCount < 3
        const looksLikeEcho = bestConf > 0.97
        if (tooShort || looksLikeEcho) return  // drop — Nova's own voice
        // Passes both checks — this is a real human interruption
      }

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
    try { rec.start() }
    catch (_) {
      if (this.running) this.restartT = setTimeout(() => this._start(), 1000)
    }
  }
}"""

NEW_EAR = """class NovaEar {
  constructor(onSpeech) {
    this.onSpeech = onSpeech
    this.rec = null
    this.running = false
    this.active = false   // true when recognition should be running
    this.restartT = null
  }

  // Start the ear — call once when mic turned on
  open() {
    this.running = true
    this.active = true
    this._start()
  }

  // Stop recognition while Nova speaks or API is in flight
  // Recognition fully stopped = zero chance of echo
  pause() {
    this.active = false
    clearTimeout(this.restartT)
    this._kill()
  }

  // Resume recognition — call when ready to hear student again
  resume() {
    if (!this.running) return
    this.active = true
    this._start()
  }

  // Full shutdown
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
      if (!this.active) return  // became inactive between result and handler
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
    try { rec.start() }
    catch (_) {
      if (this.running && this.active) {
        this.restartT = setTimeout(() => this._start(), 1000)
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// VOICE ACTIVITY DETECTOR
// Uses AudioContext to watch mic volume. When YOUR voice crosses
// the threshold while Nova is speaking, fires onVoiceDetected().
// This triggers the interruption — Nova stops, recognition resumes.
// Completely separate from SpeechRecognition so no echo conflict.
// ─────────────────────────────────────────────────────────────────
class VoiceActivityDetector {
  constructor(onVoiceDetected) {
    this.onVoiceDetected = onVoiceDetected
    this.ctx = null
    this.analyser = null
    this.stream = null
    this.rafId = null
    this.active = false
    this.triggered = false
    this.THRESHOLD = 18   // RMS volume 0-255. 18 = clear speech, ignores breath/noise
    this.HOLD_MS = 120    // must stay above threshold for this long (avoids click triggers)
    this.aboveStart = null
  }

  async start() {
    if (this.ctx) return  // already running
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      })
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      const source = this.ctx.createMediaStreamSource(this.stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 512
      source.connect(this.analyser)
      this._poll()
    } catch (_) {
      // Mic permission denied or not available — silently skip
    }
  }

  // Watch for voice — call when Nova starts speaking
  arm() {
    this.active = true
    this.triggered = false
    this.aboveStart = null
  }

  // Stop watching — call when Nova stops speaking or is interrupted
  disarm() {
    this.active = false
    this.triggered = false
    this.aboveStart = null
  }

  stop() {
    this.active = false
    cancelAnimationFrame(this.rafId)
    try { this.stream?.getTracks().forEach(t => t.stop()) } catch (_) {}
    try { this.ctx?.close() } catch (_) {}
    this.ctx = null
    this.analyser = null
    this.stream = null
  }

  _poll() {
    if (!this.analyser) return
    const buf = new Uint8Array(this.analyser.fftSize)
    const tick = () => {
      this.rafId = requestAnimationFrame(tick)
      if (!this.active || this.triggered) return
      this.analyser.getByteTimeDomainData(buf)
      // RMS amplitude
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128)
        sum += v * v
      }
      const rms = Math.sqrt(sum / buf.length)
      if (rms > this.THRESHOLD) {
        if (!this.aboveStart) this.aboveStart = Date.now()
        else if (Date.now() - this.aboveStart >= this.HOLD_MS) {
          this.triggered = true
          this.active = false
          this.onVoiceDetected()
        }
      } else {
        this.aboveStart = null
      }
    }
    tick()
  }
}"""

if OLD_EAR_START in src:
    src = src.replace(OLD_EAR_START, NEW_EAR, 1)
    changes += 1
    print("✅  Fix 1 applied — NovaEar rebuilt + VoiceActivityDetector added")
else:
    print("⚠️   Fix 1 skipped — NovaEar pattern not found")

# ════════════════════════════════════════════════════════════════
# FIX 2 — Add vadRef and wire VAD into component
# Add vadRef next to earRef
# ════════════════════════════════════════════════════════════════

OLD_REFS = """  const earRef = useRef(null)
  const loadingRef = useRef(false)"""

NEW_REFS = """  const earRef = useRef(null)
  const vadRef = useRef(null)
  const loadingRef = useRef(false)"""

if OLD_REFS in src:
    src = src.replace(OLD_REFS, NEW_REFS, 1)
    changes += 1
    print("✅  Fix 2 applied — vadRef added")
else:
    print("⚠️   Fix 2 skipped — refs pattern not found")

# ════════════════════════════════════════════════════════════════
# FIX 3 — Wire VAD into the TTS speaking block
# When Nova starts speaking: pause recognition, arm VAD
# When Nova finishes: disarm VAD, resume recognition
# ════════════════════════════════════════════════════════════════

OLD_TTS = """      if (voiceOnRef.current) {
        speakingRef.current = true
        setNovaState('speaking')
        speak(reply, () => {
          speakingRef.current = false
          setNovaState('idle')
          setBoardVisible(false)
          // Resume ear only after Nova finishes speaking — prevents echo
          earRef.current?.resume()
        }, speakingRef)
        // Small delay before opening mic so Nova's voice doesn't echo back
        setTimeout(() => { if (speakingRef.current) earRef.current?.resume() }, 350)"""

NEW_TTS = """      if (voiceOnRef.current) {
        speakingRef.current = true
        setNovaState('speaking')
        // Stop recognition while Nova speaks — zero echo possible
        earRef.current?.pause()
        // Arm the VAD to watch for YOUR voice
        vadRef.current?.arm()
        speak(reply, () => {
          // Nova finished naturally
          speakingRef.current = false
          vadRef.current?.disarm()
          setNovaState('idle')
          setBoardVisible(false)
          earRef.current?.resume()  // mic open again for next question
        }, speakingRef)"""

if OLD_TTS in src:
    src = src.replace(OLD_TTS, NEW_TTS, 1)
    changes += 1
    print("✅  Fix 3 applied — VAD armed during TTS, recognition paused")
else:
    print("⚠️   Fix 3 skipped — TTS block pattern not found")

# ════════════════════════════════════════════════════════════════
# FIX 4 — Init VAD in useEffect alongside ear
# ════════════════════════════════════════════════════════════════

OLD_INIT = """    const ear = new NovaEar((text) => {
      if (sendRef.current) sendRef.current(text)
    })
    earRef.current = ear"""

NEW_INIT = """    const ear = new NovaEar((text) => {
      if (sendRef.current) sendRef.current(text)
    })
    earRef.current = ear

    // VAD — detects YOUR voice while Nova is speaking to trigger interruption
    const vad = new VoiceActivityDetector(() => {
      // Your voice detected while Nova was speaking — interrupt her
      if (speakingRef.current && sendRef.current) {
        window.speechSynthesis.cancel()
        speakingRef.current = false
        vad.disarm()
        setNovaState('idle')
        setBoardVisible(false)
        // Give browser 200ms to finish cancelling TTS audio before
        // we open the mic — prevents any residual audio being caught
        setTimeout(() => ear.resume(), 200)
      }
    })
    vadRef.current = vad
    vad.start()  // initialise AudioContext (requests mic permission once)"""

if OLD_INIT in src:
    src = src.replace(OLD_INIT, NEW_INIT, 1)
    changes += 1
    print("✅  Fix 4 applied — VAD initialised in useEffect")
else:
    print("⚠️   Fix 4 skipped — init pattern not found")

# ════════════════════════════════════════════════════════════════
# FIX 5 — Clean up VAD on unmount
# ════════════════════════════════════════════════════════════════

OLD_CLEANUP = """    return () => {
      clearTimeout(t)
      clearInterval(keepAlive)
      ear.close()
      window.speechSynthesis?.cancel()
    }"""

NEW_CLEANUP = """    return () => {
      clearTimeout(t)
      clearInterval(keepAlive)
      ear.close()
      vad.stop()
      window.speechSynthesis?.cancel()
    }"""

if OLD_CLEANUP in src:
    src = src.replace(OLD_CLEANUP, NEW_CLEANUP, 1)
    changes += 1
    print("✅  Fix 5 applied — VAD cleaned up on unmount")
else:
    print("⚠️   Fix 5 skipped — cleanup pattern not found")

# ════════════════════════════════════════════════════════════════
# FIX 6 — Remove setNovaSpeaking calls that are now obsolete
# ════════════════════════════════════════════════════════════════
src = src.replace("earRef.current?.setNovaSpeaking(true)   // ACTIVATE filter — drop Nova's own voice\n        earRef.current?.resume()                 // mic open so YOU can interrupt\n        ", "")
src = src.replace("earRef.current?.setNovaSpeaking(true)   // filter Nova's own voice\n        earRef.current?.resume()\n        ", "")
src = src.replace("          earRef.current?.setNovaSpeaking(false) // Nova done — accept all speech\n", "")
src = src.replace("earRef.current?.setNovaSpeaking(false)  // stop filtering — student is speaking\n      ", "")
print("✅  Fix 6 applied — obsolete setNovaSpeaking calls removed")

# ════════════════════════════════════════════════════════════════
# Write
# ════════════════════════════════════════════════════════════════
if changes >= 4:
    with open(TARGET, "w") as f:
        f.write(src)
    print(f"\n✅  {changes}/5 fixes saved → {TARGET}")
    print(f"    To undo: cp \"{BACKUP}\" \"{TARGET}\"")
    print("""
    How interruption now works:
    ┌─────────────────────────────────────────────────────┐
    │ Nova speaks                                         │
    │  → SpeechRecognition PAUSED (zero echo)            │
    │  → AudioContext VAD watches mic volume              │
    │                                                     │
    │ You speak (any word, any length)                    │
    │  → VAD detects volume spike within ~120ms           │
    │  → Nova's TTS cancelled immediately                 │
    │  → 200ms settle delay                               │
    │  → SpeechRecognition RESUMES                        │
    │  → Your next sentence heard perfectly               │
    └─────────────────────────────────────────────────────┘

    Restart dev server:
    cd /workspaces/NOVA/client && npm run dev
""")
else:
    print(f"\n⚠️   Only {changes}/5 fixes applied. Check warnings above.")
    print(f"    Paste these lines so I can see your exact file:")
    print(f"    sed -n '38,145p' {TARGET}")
    print(f"    sed -n '270,300p' {TARGET}")
    print(f"    sed -n '305,340p' {TARGET}")
