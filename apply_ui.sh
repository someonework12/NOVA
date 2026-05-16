#!/usr/bin/env bash
set -e
ROOT="/workspaces/NOVA/student-hour"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
stamp=$(date +%Y%m%d_%H%M%S)

echo "Applying Nova UI update..."

cp "$ROOT/client/src/pages/ProfessorNovaPage.jsx" "$ROOT/client/src/pages/ProfessorNovaPage.jsx.bak_$stamp"
cp "$SCRIPT_DIR/NovaHumanoid.jsx" "$ROOT/client/src/components/NovaHumanoid.jsx"
cp "$SCRIPT_DIR/ProfessorNovaPage.jsx" "$ROOT/client/src/pages/ProfessorNovaPage.jsx"

echo "✅ NovaHumanoid.jsx → components/"
echo "✅ ProfessorNovaPage.jsx → pages/"
echo ""
echo "Now run:"
echo "  cd $ROOT/client && npm run dev"
echo ""
echo "Then commit:"
echo "  cd /workspaces/NOVA && git add -A && git commit -m 'feat: futuristic UI, humanoid Nova, blackboard, note display' && git push"
