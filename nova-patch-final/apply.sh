#!/usr/bin/env bash
# Run from the root of your student-hour repo
set -e
PATCH="$(cd "$(dirname "$0")" && pwd)"
TS=$(date +%Y%m%d_%H%M%S)

cp client/src/pages/StudentDashboard.jsx "client/src/pages/StudentDashboard.jsx.bak_$TS"
cp server/src/routes/nova.js             "server/src/routes/nova.js.bak_$TS"

cp "$PATCH/client/src/pages/StudentDashboard.jsx" client/src/pages/StudentDashboard.jsx
cp "$PATCH/server/src/routes/nova.js"             server/src/routes/nova.js

echo "✅ Done. Restart: npm run dev"
echo "   4 changes made:"
echo "   1. UI label: Max 15MB → Max 40MB"
echo "   2. Fetch timeout: 120s AbortController added (stops 504 hanging)"
echo "   3. pdfParse: max:0 — reads ALL pages now"
echo "   4. Content cap: 40,000 → 500,000 chars"
