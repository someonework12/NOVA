#!/usr/bin/env bash
set -e
PATCH="$(cd "$(dirname "$0")" && pwd)"

# Detect paths
if   [ -d "student-hour/client/src/pages" ]; then C="student-hour/client"; S="student-hour/server"
elif [ -d "client/src/pages" ];              then C="client";               S="server"
else echo "❌ Cannot find client/src/pages"; exit 1; fi

TS=$(date +%Y%m%d_%H%M%S)
echo "📦 NOVA Upload Patch v3"
echo "   Client: $C  |  Server: $S"

for f in "$C/src/pages/StudentDashboard.jsx" "$S/src/routes/nova.js" "$S/src/index.js"; do
  [ -f "$f" ] && cp "$f" "${f}.bak_${TS}" && echo "   ✔ backed up $f"
done

cp "$PATCH/client/src/pages/StudentDashboard.jsx" "$C/src/pages/StudentDashboard.jsx"
cp "$PATCH/server/src/routes/nova.js"             "$S/src/routes/nova.js"
cp "$PATCH/server/src/index.js"                   "$S/src/index.js"

echo ""
echo "✅ Done! Restart your server: npm run dev"
echo ""
echo "What changed:"
echo "  StudentDashboard.jsx  → Max 40MB UI text, 40MB frontend check, 120s fetch timeout"
echo "  server/routes/nova.js → 40MB multer, reads ALL PDF pages, 500k char cap, 120s socket timeout"
echo "  server/index.js       → Global 120s timeout, 413 error handler for oversized files"
