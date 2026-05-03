#!/usr/bin/env bash
set -e
ROOT="/workspaces/NOVA/student-hour"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
stamp=$(date +%Y%m%d_%H%M%S)

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         NOVA UPDATE — applying...                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

TARGET="$ROOT/client/src/pages/ProfessorNovaPage.jsx"
cp "$TARGET" "${TARGET}.bak_${stamp}"
cp "$SCRIPT_DIR/ProfessorNovaPage.jsx" "$TARGET"
echo "✅  ProfessorNovaPage.jsx"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  WHAT'S FIXED:"
echo "  1. Mobile deaf — mic now only opens on mic button tap"
echo "     (iOS requires direct user gesture, not setTimeout)"
echo "  2. VAD init deferred to mic tap — no more iOS chime"  
echo "  3. Persona selector — tap ⚙ Settings top right"
echo "  4. Voice training upload — only visible to your account"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Restart dev server:"
echo "  cd $ROOT/client && npm run dev"
echo ""
echo "  Then commit:"
echo "  cd /workspaces/NOVA && git add -A && git commit -m 'fix: mobile mic, persona selector, owner voice training' && git push"
echo ""
