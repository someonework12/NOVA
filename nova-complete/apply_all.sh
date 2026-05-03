#!/usr/bin/env bash
# Run from /workspaces/NOVA:  bash apply_all.sh

set -e
ROOT="/workspaces/NOVA/student-hour"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
stamp=$(date +%Y%m%d_%H%M%S)

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         NOVA COMPLETE UPDATE — applying...           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Backup and apply each file ───────────────────────────────
apply() {
  local src="$1" dst="$2"
  if [ ! -f "$dst" ]; then echo "⚠️  Target not found: $dst (skipping)"; return; fi
  cp "$dst" "${dst}.bak_${stamp}"
  cp "$src" "$dst"
  echo "✅  $(basename $dst)"
}

apply "$SCRIPT_DIR/client/src/pages/ProfessorNovaPage.jsx" \
      "$ROOT/client/src/pages/ProfessorNovaPage.jsx"

apply "$SCRIPT_DIR/client/src/pages/StudentDashboard.jsx" \
      "$ROOT/client/src/pages/StudentDashboard.jsx"

apply "$SCRIPT_DIR/server/src/routes/nova.js" \
      "$ROOT/server/src/routes/nova.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ⚠️  IMPORTANT: Run the SQL migration in Supabase first!"
echo "     Open migration.sql and paste it into:"
echo "     Supabase Dashboard → SQL Editor → New Query → Run"
echo ""
echo "  Then restart your dev server:"
echo "  cd $ROOT/client && npm run dev"
echo ""
echo "  And in another terminal:"
echo "  cd $ROOT/server && npm run dev"
echo ""
echo "  To undo everything:"
echo "  for f in \$(find $ROOT -name '*.bak_${stamp}'); do"
echo "    cp \"\$f\" \"\${f%.bak_${stamp}}\"; done"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
