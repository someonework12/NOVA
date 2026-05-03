#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# apply-upload-patch.sh
# Run this from the ROOT of your NOVA / student-hour repo in Codespace:
#   bash apply-upload-patch.sh
# ─────────────────────────────────────────────────────────────────

set -e   # stop on any error

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📦 NOVA Upload Patch — applying..."
echo "   Patch source : $PATCH_DIR"

# ── 1. Detect your server directory ──────────────────────────────
# Tries common locations — edit SERVER_DIR if yours is different
if   [ -d "server/src/routes" ];                         then SERVER_DIR="server"
elif [ -d "student-hour/server/src/routes" ];            then SERVER_DIR="student-hour/server"
elif [ -d "nova-patch/student-hour/server/src/routes" ]; then SERVER_DIR="nova-patch/student-hour/server"
else
  echo "❌  Could not find server/src/routes — set SERVER_DIR manually in this script"
  exit 1
fi

echo "   Server dir   : $SERVER_DIR"

# ── 2. Back up originals ─────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

backup() {
  local file="$1"
  if [ -f "$file" ]; then
    cp "$file" "${file}.bak_${TIMESTAMP}"
    echo "   ✔ backed up $file"
  fi
}

backup "$SERVER_DIR/src/routes/nova.js"
backup "$SERVER_DIR/src/index.js"

# ── 3. Copy patched files ─────────────────────────────────────────
# nova.js — only copy the upload-material section changes.
# Strategy: we replace the entire nova.js so all fixes are included.
echo ""
echo "⚠️  The patched nova.js in this archive contains ONLY the upload-material"
echo "   route changes. Your existing chat/memory routes are preserved via the"
echo "   'export default router' at the bottom."
echo ""
echo "   If your nova.js has routes BELOW upload-material that are NOT in the"
echo "   patch file, copy them manually from the .bak file."
echo ""

cp "$PATCH_DIR/server/src/routes/nova.js" "$SERVER_DIR/src/routes/nova.js"
echo "   ✔ applied server/src/routes/nova.js"

cp "$PATCH_DIR/server/src/index.js"       "$SERVER_DIR/src/index.js"
echo "   ✔ applied server/src/index.js"

# ── 4. Remind about SQL migration ────────────────────────────────
echo ""
echo "─────────────────────────────────────────────────────────────"
echo "✅  Files patched. Two more steps:"
echo ""
echo "  1. Run the SQL migration in Supabase:"
echo "     Open migration_004_upload_patch.sql and paste it into"
echo "     your Supabase SQL editor, then click Run."
echo ""
echo "  2. Restart your server:"
echo "     npm run dev   (or your usual start command)"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "What the patch fixes:"
echo "  • File size limit  : 10–15 MB  →  40 MB"
echo "  • Content cap      : 15,000 chars → 500,000 chars (1000+ pages)"
echo "  • PDF page limit   : removed (now reads ALL pages)"
echo "  • 504 timeout      : extended to 120 seconds on large PDF parse"
echo "  • Large PDFs       : auto-split into 100k-char chunks in DB"
echo "  • 413 error msg    : clear 'file too large' message to frontend"
echo ""
