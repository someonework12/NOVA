#!/usr/bin/env python3
"""
NOVA VOICE TIMING FIX
Fixes: mouth moves but no sound / text shows but no speech
Root cause: voices not loaded yet when speak() fires
Run: python3 nova_voice_timing.py
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

# ════════════════════════════════════════════════════════════════
# FIX — Replace getVoice + speak functions with voice-ready versions
# ════════════════════════════════════════════════════════════════
OLD = """function getVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const want = ['Google UK English Male','Microsoft David Desktop','Daniel','Alex','Fred']
  for (const n of want) {
    const v = voices.find(v => v.name.includes(n))
    if (v) return v
  }
  return voices.find(v =>
    v.lang?.startsWith('en') &&
    !/(female|zira|hazel|victoria|karen|samantha)/i.test(v.name)
  ) || voices.find(v => v.lang?.startsWith('en')) || null
}

function speak(text, onDone, cancelRef) {
  if (!window.speechSynthesis) { onDone?.(); return }
  window.speechSynthesis.cancel()
  const voice = getVoice()
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text]
  let i = 0
  function next() {
    if (cancelRef && !cancelRef.current) { onDone?.(); return }
    if (i >= sentences.length) { onDone?.(); return }
    const s = sentences[i++].trim()
    if (!s) { next(); return }
    const u = new SpeechSynthesisUtterance(s)
    u.rate = 0.86; u.pitch = 0.72; u.volume = 1
    if (voice) u.voice = voice
    u.onend = next; u.onerror = next
    window.speechSynthesis.speak(u)
  }
  next()
}"""

NEW = """function getVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const want = ['Google UK English Male','Microsoft David Desktop','Daniel','Alex','Fred']
  for (const n of want) {
    const v = voices.find(v => v.name.includes(n))
    if (v) return v
  }
  return voices.find(v =>
    v.lang?.startsWith('en') &&
    !/(female|zira|hazel|victoria|karen|samantha)/i.test(v.name)
  ) || voices.find(v => v.lang?.startsWith('en')) || null
}

// Waits until voices are loaded then resolves — max 3s wait
function waitForVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis?.getVoices() || []
    if (voices.length > 0) { resolve(voices); return }
    // Voices not ready yet — wait for the event
    let resolved = false
    const handler = () => {
      if (resolved) return
      resolved = true
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.onvoiceschanged = handler
    // Safety timeout — if event never fires, proceed anyway after 3s
    setTimeout(() => { if (!resolved) { resolved = true; resolve([]) } }, 3000)
  })
}

function speak(text, onDone, cancelRef) {
  if (!window.speechSynthesis) { onDone?.(); return }
  window.speechSynthesis.cancel()

  // Wait for voices to be ready before speaking — fixes silent mouth bug
  waitForVoices().then(() => {
    // Check if cancelled while waiting for voices
    if (cancelRef && !cancelRef.current) { onDone?.(); return }

    const voice = getVoice()
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text]
    let i = 0
    function next() {
      if (cancelRef && !cancelRef.current) { onDone?.(); return }
      if (i >= sentences.length) { onDone?.(); return }
      const s = sentences[i++].trim()
      if (!s) { next(); return }
      const u = new SpeechSynthesisUtterance(s)
      u.rate = 0.86; u.pitch = 0.72; u.volume = 1
      if (voice) u.voice = voice
      u.onend = next
      u.onerror = (e) => {
        // On error, try next sentence rather than stopping entirely
        console.warn('TTS error on sentence:', s, e)
        next()
      }
      window.speechSynthesis.speak(u)
    }
    next()
  })
}"""

if OLD in src:
    src = src.replace(OLD, NEW, 1)
    with open(TARGET, "w") as f:
        f.write(src)
    print("✅  Fix applied — speak() now waits for voices to load before firing")
    print(f"\n✅  Saved → {TARGET}")
    print(f"    To undo: cp \"{BACKUP}\" \"{TARGET}\"")
    print("""
    What was wrong:
    • Browser loads voices ASYNC after page load
    • speak() fired before voices were ready
    • getVoice() returned null → browser queued
      utterance with no voice → silent / wrong voice
    • Avatar state already set to 'speaking' so
      mouth moved but nothing came out

    What's fixed:
    • speak() calls waitForVoices() first
    • Waits up to 3s for onvoiceschanged to fire
    • Only then creates utterances and speaks
    • If cancelled while waiting, aborts cleanly
    • TTS errors on individual sentences are logged
      but don't stop the rest of the response

    Restart dev server:
    cd /workspaces/NOVA/client && npm run dev
""")
else:
    print("❌  Pattern not found — paste this output:")
    print(f"    sed -n '158,192p' {TARGET}")
