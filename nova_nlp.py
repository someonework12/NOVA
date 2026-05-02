#!/usr/bin/env python3
"""
NOVA NLP INTERRUPTION PATCH
Uses intent classification to detect interruptions while Nova speaks.
Run: python3 nova_nlp.py
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
# FIX 1 — Replace the broken self-voice filter in onresult
#          with NLP intent classification
# ════════════════════════════════════════════════════════════════
OLD1 = """      const text = best.trim()
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
      this.onSpeech(text)"""

NEW1 = """      const text = best.trim()
      if (!text || text.length < 2) return

      // ── NLP INTERRUPT INTENT CLASSIFIER ───────────────────────────
      // While Nova speaks, the mic stays open. We need to tell apart:
      //   A) Nova's own voice echoing through the mic (ignore)
      //   B) The student genuinely interrupting (act on it)
      //
      // We use a lightweight NLP approach — no API call needed:
      //
      // 1. INTERRUPT SIGNALS: explicit words/phrases that only a human
      //    would say to break into a conversation. Nova never says these
      //    about herself in mid-sentence.
      //
      // 2. QUESTION DETECTION: a question mid-Nova-speech = interruption.
      //    Nova's echo is always declarative (she's answering, not asking).
      //
      // 3. NAME CALL: student saying "Nova", "Professor", "hey" = interrupt.
      //
      // 4. CONFIDENCE FLOOR: echo from a laptop speaker scores very high
      //    (0.95+) because the browser hears clean audio. Real student
      //    speech through a mic with room noise typically scores lower.
      //    We flip the old logic: HIGH confidence during Nova's speech
      //    is suspicious, not trustworthy.
      //
      // If ANY signal fires → treat as interruption, pass through.
      // If NO signal fires → treat as echo, drop silently.

      if (this.novaSpeaking) {
        const t = text.toLowerCase()
        const words = t.split(/\\s+/)

        // Signal 1 — explicit interrupt words/phrases
        const INTERRUPT_WORDS = [
          'stop','wait','hold on','excuse me','sorry','pause',
          'actually','but','no','yes','okay','ok','what','why',
          'how','when','where','who','really','seriously','wow',
          'i','can','could','would','should','is','are','do',
          'hey','nova','professor','prof','listen','wait wait',
          'one second','hang on','just a moment','let me','tell me',
          'explain','help','understand','confused','question','ask'
        ]
        const hasInterruptWord = INTERRUPT_WORDS.some(w =>
          t === w || t.startsWith(w + ' ') || t.includes(' ' + w + ' ') || t.endsWith(' ' + w)
        )

        // Signal 2 — ends with question mark or starts with question word
        const QUESTION_STARTERS = ['what','why','how','when','where','who','is','are','do','does','can','could','would','should','will','did','has','have']
        const isQuestion = text.endsWith('?') || QUESTION_STARTERS.includes(words[0])

        // Signal 3 — student calls Nova's name or says hey
        const callsNova = /\\b(nova|professor|prof|hey|hello|excuse)\\b/.test(t)

        // Signal 4 — confidence floor (echo tends to be suspiciously perfect)
        const believableHuman = bestConf < 0.95

        // Pass through if ANY interrupt signal fires
        const isInterruption = hasInterruptWord || isQuestion || callsNova || believableHuman
        if (!isInterruption) return  // looks like echo — drop
      }

      this.paused = true  // prevent duplicate sends
      this.onSpeech(text)"""

if OLD1 in src:
    src = src.replace(OLD1, NEW1, 1)
    changes += 1
    print("✅  Fix 1 applied — NLP interrupt intent classifier installed")
else:
    print("❌  Fix 1 failed — onresult filter block not matched")
    print("    Run: sed -n '96,132p' " + TARGET)

# ════════════════════════════════════════════════════════════════
# Write
# ════════════════════════════════════════════════════════════════
if changes > 0:
    with open(TARGET, "w") as f:
        f.write(src)
    print(f"\n✅  Saved → {TARGET}")
    print(f"    To undo: cp \"{BACKUP}\" \"{TARGET}\"")
    print("""
    How NLP interruption now works:
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    While Nova speaks, mic stays open.
    Every recognition result goes through 4 checks:

    1. Interrupt words — "stop", "wait", "but",
       "actually", "what", "why", "no", "yes" etc.
    2. Questions — anything ending in ? or starting
       with what/why/how/when/where/who/can etc.
    3. Name call — "Nova", "Professor", "hey"
    4. Human confidence — echo scores 0.95+,
       real mic speech usually scores lower

    ANY check passes → Nova stops, listens to you
    ALL checks fail  → treated as echo, dropped

    Say ANY of these to interrupt:
      "stop"  "wait"  "but..."  "actually"
      "what about..."  "can you..."  "hey Nova"
      or just ask a question mid-sentence
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Restart dev server:
    cd /workspaces/NOVA/client && npm run dev
""")
else:
    print("\n❌  No changes made.")
    print(f"    Run this and paste output:")
    print(f"    sed -n '96,132p' {TARGET}")
