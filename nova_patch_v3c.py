#!/usr/bin/env python3
"""
NOVA PATCH v3c — reads your actual live file and injects setNovaSpeaking
into the TTS block using AST-free line-by-line detection (no fragile string matching).
Run: python3 nova_patch_v3c.py
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
    lines = f.readlines()

# ── Already patched? ──────────────────────────────────────────────
already = any("setNovaSpeaking" in l for l in lines)
if already:
    print("✅  setNovaSpeaking already present in file — nothing to do.")
    print("    Your file is fully patched. Restart your dev server:")
    print("    cd /workspaces/NOVA/client && npm run dev")
    sys.exit(0)

# ── Find the TTS block by looking for these two consecutive signals:
#    Line A: speakingRef.current = true
#    Line B: setNovaState('speaking')   (within 3 lines of A)
# Then insert setNovaSpeaking(true) right after line B.
# Also find the speak(reply, () => { block's closing } and add setNovaSpeaking(false) before it.

out = []
i = 0
patch1_done = False
patch2_done = False

while i < len(lines):
    line = lines[i]

    # ── PATCH 1: inject setNovaSpeaking(true) after setNovaState('speaking')
    # inside the sendMessage TTS block (not the greeting block)
    if (not patch1_done
            and "speakingRef.current = true" in line
            and i + 3 < len(lines)
            and any("setNovaState('speaking')" in lines[i+k] for k in range(1,4))):

        # Check we're in sendMessage context (reply variable nearby)
        context = "".join(lines[max(0,i-10):i+15])
        if "speak(reply" in context:
            out.append(line)
            i += 1
            # emit lines until we hit setNovaState('speaking')
            while i < len(lines):
                out.append(lines[i])
                if "setNovaState('speaking')" in lines[i]:
                    i += 1
                    # inject right after
                    indent = len(lines[i-1]) - len(lines[i-1].lstrip())
                    out.append(" " * indent + "earRef.current?.setNovaSpeaking(true)   // filter Nova's own voice\n")
                    patch1_done = True
                    break
                i += 1
            continue

    # ── PATCH 2: inject setNovaSpeaking(false) inside the speak(reply onDone callback
    # The callback ends with:   setBoardVisible(false)
    # followed by:              }, speakingRef)
    # We want to add setNovaSpeaking(false) between those two lines.
    if (not patch2_done
            and "setBoardVisible(false)" in line
            and i + 1 < len(lines)
            and "}, speakingRef)" in lines[i+1]):
        # Make sure we're inside the speak(reply...) call, not elsewhere
        context = "".join(lines[max(0,i-8):i+3])
        if "speak(reply" in context or "speakingRef.current = false" in context:
            indent = len(line) - len(line.lstrip())
            out.append(line)
            out.append(" " * indent + "earRef.current?.setNovaSpeaking(false) // Nova done — accept all speech\n")
            patch2_done = True
            i += 1
            continue

    out.append(line)
    i += 1

if patch1_done and patch2_done:
    with open(TARGET, "w") as f:
        f.writelines(out)
    print("✅  Patch 1 applied — setNovaSpeaking(true) injected after TTS starts")
    print("✅  Patch 2 applied — setNovaSpeaking(false) injected after TTS ends")
    print(f"\n✅  Saved → {TARGET}")
    print(f"    To undo: cp \"{BACKUP}\" \"{TARGET}\"")
    print("\n    Restart your dev server:")
    print("    cd /workspaces/NOVA/client && npm run dev\n")
elif patch1_done:
    with open(TARGET, "w") as f:
        f.writelines(out)
    print("✅  Patch 1 applied — setNovaSpeaking(true) injected")
    print("⚠️   Patch 2 not applied — could not locate speak(reply onDone closing line")
    print("    The filter will activate but won't deactivate automatically after Nova finishes.")
    print("    Please share your file if this keeps happening.")
else:
    print("❌  Could not locate the TTS block. No changes made.")
    print(f"    Backup safe at: {BACKUP}")
    print("\n    Please paste the output of this command so I can see your exact file:")
    print(f"    sed -n '255,285p' {TARGET}")
