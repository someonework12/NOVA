#!/usr/bin/env bash
# Run from anywhere: bash apply.sh
TARGET="/workspaces/NOVA/student-hour/client/src/pages/ProfessorNovaPage.jsx"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$SCRIPT_DIR/ProfessorNovaPage.jsx"

cp "$TARGET" "${TARGET}.bak_$(date +%Y%m%d_%H%M%S)"
cp "$SOURCE" "$TARGET"
echo "✅ Applied. Now run:"
echo "   cd /workspaces/NOVA/student-hour/client && npm run dev"
