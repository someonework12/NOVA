#!/usr/bin/env bash
set -e
TARGET="/workspaces/NOVA/student-hour/server/src/routes/nova.js"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
stamp=$(date +%Y%m%d_%H%M%S)
cp "$TARGET" "${TARGET}.bak_${stamp}"
cp "$SCRIPT_DIR/nova.js" "$TARGET"
echo "✅ nova.js updated"
echo ""
echo "Now add GEMINI_API_KEY to Render:"
echo "  1. Go to render.com → your service → Environment"
echo "  2. Add: GEMINI_API_KEY = (your key from aistudio.google.com/apikey)"
echo "  3. Get it free at: https://aistudio.google.com/apikey"
echo ""
echo "Then commit:"
echo "  cd /workspaces/NOVA && git add -A && git commit -m 'fix: Gemini fallback, 40MB upload, full PDF storage' && git push"
