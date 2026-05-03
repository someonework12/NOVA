#!/usr/bin/env bash
set -e
PATCH="$(cd "$(dirname "$0")" && pwd)"

# Auto-detect server root
if   [ -d "server/src/routes" ];              then S="server"
elif [ -d "student-hour/server/src/routes" ]; then S="student-hour/server"
else echo "❌ Can't find server/src/routes — set S manually"; exit 1; fi

# Auto-detect client root
if   [ -d "client/src/pages" ];              then C="client"
elif [ -d "student-hour/client/src/pages" ]; then C="student-hour/client"
else echo "❌ Can't find client/src/pages — set C manually"; exit 1; fi

TS=$(date +%Y%m%d_%H%M%S)
echo "📦 NOVA Upload Patch v2"
echo "   Server: $S  |  Client: $C"

# Backup
for f in "$S/src/routes/nova.js" "$S/src/index.js" "$C/src/pages/ProfessorNovaPage.jsx"; do
  [ -f "$f" ] && cp "$f" "${f}.bak_${TS}" && echo "   ✔ backed up $f"
done

# Apply
cp "$PATCH/server/src/routes/nova.js" "$S/src/routes/nova.js"
cp "$PATCH/server/src/index.js"       "$S/src/index.js"
cp "$PATCH/client/src/pages/ProfessorNovaPage.jsx" "$C/src/pages/ProfessorNovaPage.jsx"

echo ""
echo "✅ Files patched. Now:"
echo "   1. Run migration_004_upload_patch.sql in your Supabase SQL editor"
echo "   2. npm run dev  (or restart your server)"
echo ""
echo "Changes applied:"
echo "  • Server multer limit   : 10 MB  → 40 MB"
echo "  • Frontend size check   : 10 MB  → 40 MB  (was BLOCKING uploads!)"
echo "  • Frontend UI text      : 'max 10 MB' → 'max 40 MB · 1000+ pages'"
echo "  • PDF page cap          : removed (reads all pages)"
echo "  • Content cap           : 15k chars → 500k chars"
echo "  • Large PDF chunking    : splits into 100k-char DB rows"
echo "  • 504 timeout           : extended to 120s server + 120s fetch"
echo "  • express.json limit    : 10mb → 50mb"
