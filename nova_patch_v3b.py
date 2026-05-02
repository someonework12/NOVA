#!/usr/bin/env python3
"""
NOVA PATCH — TTS block fix (the one patch that was skipped)
Run: python3 nova_patch_v3b.py
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

OLD = """      if (voiceOnRef.current) {
        speakingRef.current = true
        setNovaState('speaking')
        // Resume ear BEFORE speaking — so student can interrupt
        earRef.current?.resume()
        speak(reply, () => {
          speakingRef.current = false
          setNovaState('idle')
          setBoardVisible(false)
        }, speakingRef)"""

NEW = """      if (voiceOnRef.current) {
        speakingRef.current = true
        setNovaState('speaking')
        earRef.current?.setNovaSpeaking(true)   // filter Nova's own voice from mic
        earRef.current?.resume()
        speak(reply, () => {
          speakingRef.current = false
          setNovaState('idle')
          setBoardVisible(false)
          earRef.current?.setNovaSpeaking(false) // Nova done — accept all speech again
        }, speakingRef)"""

if OLD in src:
    src = src.replace(OLD, NEW, 1)
    with open(TARGET, "w") as f:
        f.write(src)
    print("✅  Patch applied — setNovaSpeaking wired to TTS lifecycle")
    print(f"\n✅  Saved → {TARGET}")
    print(f"    To undo: cp \"{BACKUP}\" \"{TARGET}\"")
    print("\n    Restart your dev server:")
    print("    cd /workspaces/NOVA/client && npm run dev\n")
else:
    print("⚠️   Pattern not found — already patched or file differs.")
    print(f"    Backup at: {BACKUP}")
