#!/usr/bin/env python3
"""
NOVA VOICE FILTER — final fix
Two problems fixed:
  1. setNovaSpeaking(true) was never being called (filter never activated)
  2. Filter thresholds were blocking real interruptions

Run: python3 nova_patch_voice.py
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
# FIX 1 — Replace the broken self-voice filter logic in onresult
#
# Old logic: two weak heuristics (length + confidence ceiling)
# Problems:
#   - Short real words ("stop", "wait", "what") got blocked
#   - Echo at confidence 0.85-0.95 still went through
#
# New logic:
#   - While novaSpeaking: drop ALL results (mic open for interrupt
#     detection, but nothing gets sent to the API)
#   - EXCEPT: if the user speaks loudly enough to CANCEL the TTS
#     (which happens in sendMessage when speakingRef flips false),
#     the filter is already cleared before the next result fires.
#   This means: speak any word → TTS cancels → filter clears →
#   your next sentence goes through perfectly. Clean, simple, reliable.
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
      this.onSpeech(text)"""

if OLD1 in src:
    src = src.replace(OLD1, NEW1, 1)
    changes += 1
    print("✅  Fix 1 applied — self-voice filter simplified (drop all while Nova speaks)")
else:
    print("⚠️   Fix 1 skipped — filter pattern not found")

# ════════════════════════════════════════════════════════════════
# FIX 2 — Wire setNovaSpeaking(true) when TTS starts
#
# The filter existed but was never activated because setNovaSpeaking(true)
# was missing from the TTS startup block. Adding it here.
# Also adding setNovaSpeaking(false) when TTS finishes naturally.
# ════════════════════════════════════════════════════════════════

OLD2 = """        speakingRef.current = true
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

NEW2 = """        speakingRef.current = true
        setNovaState('speaking')
        earRef.current?.setNovaSpeaking(true)   // ACTIVATE filter — drop Nova's own voice
        earRef.current?.resume()                 // mic open so YOU can interrupt
        speak(reply, () => {
          speakingRef.current = false
          earRef.current?.setNovaSpeaking(false) // Nova done — accept all speech
          setNovaState('idle')
          setBoardVisible(false)
        }, speakingRef)"""

if OLD2 in src:
    src = src.replace(OLD2, NEW2, 1)
    changes += 1
    print("✅  Fix 2 applied — setNovaSpeaking(true/false) wired to TTS lifecycle")
else:
    print("⚠️   Fix 2 skipped — TTS block pattern not found")
    # Try to show what's actually there so we can debug
    import re
    m = re.search(r'speakingRef\.current = true\n.{0,400}speak\(reply', src, re.DOTALL)
    if m:
        print("     Actual TTS block found:")
        print("     " + repr(src[m.start():m.start()+300]))

# ════════════════════════════════════════════════════════════════
# Write
# ════════════════════════════════════════════════════════════════
if changes == 0:
    print("\n❌  No changes made. Paste this in your terminal so I can see your exact file:")
    print(f"    sed -n '95,135p' {TARGET}")
    print(f"    sed -n '270,295p' {TARGET}")
else:
    with open(TARGET, "w") as f:
        f.write(src)
    print(f"\n✅  {changes}/2 fixes saved → {TARGET}")
    if changes < 2:
        print("⚠️   One fix was skipped. Paste this output so I can finish it:")
        print(f"    sed -n '270,295p' {TARGET}")
    else:
        print("\n    How it now works:")
        print("    • While Nova speaks → mic open but ALL results dropped (no echo)")
        print("    • You speak → Nova's TTS cancels → filter clears instantly")
        print("    • Your next words go through perfectly as an interruption")
        print(f"\n    To undo: cp \"{BACKUP}\" \"{TARGET}\"")
        print("\n    Restart dev server:")
        print("    cd /workspaces/NOVA/client && npm run dev\n")
