#!/usr/bin/env bash
# NOVA CONVERSATION FIX — apply-patch.sh
# Run from your student-hour/ folder:   bash apply-patch.sh
# Or pass the path:                     bash apply-patch.sh /path/to/student-hour

set -e
PROJECT_ROOT="${1:-$(pwd)}"
TARGET="$PROJECT_ROOT/client/src/pages/ProfessorNovaPage.jsx"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$SCRIPT_DIR/nova-conversation-fix/client/src/pages/ProfessorNovaPage.jsx"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       NOVA CONVERSATION FIX — applying patch         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

[ ! -f "$SOURCE" ] && echo "❌  Patch file not found: $SOURCE" && exit 1
[ ! -f "$TARGET" ] && echo "❌  Target not found: $TARGET" && echo "    Run from your student-hour/ folder." && exit 1

BACKUP="${TARGET}.bak_$(date +%Y%m%d_%H%M%S)"
cp "$TARGET" "$BACKUP"
echo "✅  Backed up original → $(basename $BACKUP)"
cp "$SOURCE" "$TARGET"
echo "✅  Patch applied → $TARGET"
echo ""
echo "  WHAT WAS FIXED:"
echo "  1. 'Unexpected end of JSON input' — safe JSON parsing,"
echo "     handles Render 504 HTML body without crashing"
echo "  2. Mic flickering — ear.resume() now guaranteed in finally{}"
echo "     so the mic can never get permanently stuck/frozen"
echo "  3. Echo loop — mic opens 350ms after TTS starts, not before,"
echo "     so Nova's voice can't be picked up and sent as a message"
echo "  4. Render cold start — server pinged immediately on page load"
echo "     + every 13 min (was 4 min but in wrong direction)"
echo ""
echo "  TO UNDO:"
echo "    cp \"$BACKUP\" \"$TARGET\""
echo ""
echo "  NEXT:"
echo "    cd $PROJECT_ROOT/client && npm run dev"
echo ""
echo "✅  Done!"
