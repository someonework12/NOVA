#!/usr/bin/env python3
"""
NOVA SELF-VOICE FILTER PATCH
Fixes: Nova hearing her own voice while speaking
Run from anywhere:  python3 nova_patch_v3.py
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
    t = input("Paste the full path to ProfessorNovaPage.jsx: ").strip()
    if not os.path.exists(t):
        print(f"❌  File not found: {t}"); sys.exit(1)
    TARGET = t

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
BACKUP = TARGET + f".bak_{stamp}"
shutil.copy2(TARGET, BACKUP)
print(f"✅  Backed up → {os.path.basename(BACKUP)}")

with open(TARGET, "r") as f:
    src = f.read()

original = src

# ════════════════════════════════════════════════════════════════
# PATCH 1 — Replace NovaEar class with self-voice filtering version
# ════════════════════════════════════════════════════════════════
OLD1 = """class NovaEar {
  constructor(onSpeech) {
    this.onSpeech = onSpeech
    this.rec = null
    this.running = false
    this.paused = false   // true only while API call in flight
    this.restartT = null
  }

  // Start listening — call once
  open() {
    this.running = true
    this.paused = false
    this._start()
  }

  // Pause during API call — results ignored even if picked up
  pause() { this.paused = true }

  // Resume after API call — keep session alive, just unpause
  resume() {
    this.paused = false
    // If session died while paused (mobile), restart it
    if (!this.rec && this.running) {
      this.restartT = setTimeout(() => this._start(), 300)
    }
  }

  // Full stop
  close() {
    this.running = false
    this.paused = false
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

    if (ON_MOBILE) {
      rec.continuous = false
    } else {
      rec.continuous = true
    }

    rec.onresult = (e) => {
      if (this.paused) return  // API in flight — ignore
      let best = '', bestConf = -1
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        if (!e.results[i].isFinal && !ON_MOBILE) continue
        for (let j = 0; j < e.results[i].length; j++) {
          const conf = e.results[i][j].confidence || 0.5
          if (conf > bestConf) { bestConf = conf; best = e.results[i][j].transcript }
        }
      }
      const text = best.trim()
      if (text.length > 1) {
        this.paused = true  // pause synchronously to prevent duplicate sends
        this.onSpeech(text)
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'aborted') return
      if (e.error === 'not-allowed') { this.running = false; return }
      // Any error: restart after delay
      if (this.running) this.restartT = setTimeout(() => this._start(), 800)
    }

    rec.onend = () => {
      if (!this.running) return
      if (ON_MOBILE) {
        // Mobile: restart after each phrase (normal single-shot behavior)
        if (!this.paused) {
          this.restartT = setTimeout(() => this._start(), 250)
        }
        // If paused: resume() will restart
      } else {
        // Desktop continuous: should never end. If it does, restart.
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

NEW1 = """class NovaEar {
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

if OLD1 in src:
    src = src.replace(OLD1, NEW1, 1)
    print("✅  Patch 1 applied — NovaEar self-voice filter")
else:
    print("⚠️   Patch 1 skipped — NovaEar pattern not found (may already be patched)")

# ════════════════════════════════════════════════════════════════
# PATCH 2 — Set novaSpeaking=true when TTS starts, false when done
# ════════════════════════════════════════════════════════════════
OLD2 = """      if (voiceOnRef.current) {
        speakingRef.current = true
        setNovaState('speaking')
        // Resume ear BEFORE speaking — so student can interrupt
        earRef.current?.resume()
        speak(reply, () => {
          speakingRef.current = false
          setNovaState('idle')
          setBoardVisible(false)
        }, speakingRef)"""

NEW2 = """      if (voiceOnRef.current) {
        speakingRef.current = true
        setNovaState('speaking')
        earRef.current?.setNovaSpeaking(true)   // filter Nova's own voice
        earRef.current?.resume()
        speak(reply, () => {
          speakingRef.current = false
          setNovaState('idle')
          setBoardVisible(false)
          earRef.current?.setNovaSpeaking(false) // Nova done — accept all speech
        }, speakingRef)"""

if OLD2 in src:
    src = src.replace(OLD2, NEW2, 1)
    print("✅  Patch 2 applied — setNovaSpeaking wired to TTS lifecycle")
else:
    print("⚠️   Patch 2 skipped — TTS block pattern not found (may already be patched)")

# ════════════════════════════════════════════════════════════════
# PATCH 3 — Clear novaSpeaking flag when student interrupts
# ════════════════════════════════════════════════════════════════
OLD3 = """    // If Nova is speaking, cut her off immediately (interruption)
    if (speakingRef.current) {
      window.speechSynthesis.cancel()
      speakingRef.current = false
      setNovaState('idle')
      setBoardVisible(false)
    }"""

NEW3 = """    // If Nova is speaking, cut her off immediately (interruption)
    if (speakingRef.current) {
      window.speechSynthesis.cancel()
      speakingRef.current = false
      earRef.current?.setNovaSpeaking(false)  // stop filtering — student is speaking
      setNovaState('idle')
      setBoardVisible(false)
    }"""

if OLD3 in src:
    src = src.replace(OLD3, NEW3, 1)
    print("✅  Patch 3 applied — filter cleared on interruption")
else:
    print("⚠️   Patch 3 skipped — interruption pattern not found (may already be patched)")

# ── Write ─────────────────────────────────────────────────────────
if src == original:
    print("\n⚠️   No changes made — patterns may have already been patched.")
    print(f"    Backup is safe at: {BACKUP}")
else:
    with open(TARGET, "w") as f:
        f.write(src)
    print(f"\n✅  Saved → {TARGET}")
    print(f"    To undo: cp \"{BACKUP}\" \"{TARGET}\"")
    print("\n    Restart your dev server:")
    print("    cd /workspaces/NOVA/client && npm run dev\n")
