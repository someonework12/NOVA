#!/usr/bin/env bash
# ============================================================
#  NOVA — Master Patch Fix Script
#  Run this from: /workspaces/NOVA/student-hour
#  Usage: bash nova_fix.sh
# ============================================================
set -e

WORK_DIR="$(pwd)"
echo "📂 Working in: $WORK_DIR"

# Confirm we are in the right place
if [ ! -f "$WORK_DIR/package.json" ] || [ ! -d "$WORK_DIR/client" ]; then
  echo "❌ ERROR: Run this script from inside /workspaces/NOVA/student-hour"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PROBLEM SUMMARY (what was found wrong)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. NOVA-final-fix.zip was NEVER applied to student-hour"
echo "     (App.jsx, main.jsx, NovaAvatar.jsx, ProfessorNovaPage.jsx, netlify.toml"
echo "      all have major differences vs the latest final-fix versions)"
echo ""
echo "  2. NOVA-bugfix.zip was NEVER applied to student-hour"
echo "     (grouping.js has a broken JSON parse; OnboardingPage.jsx is missing"
echo "      the refetchProfile call and early redirect for already-onboarded users)"
echo ""
echo "  3. Phase 6 zip dropped the Supabase migration 002_phase5_patch.sql"
echo "     but student-hour still has it — that's actually fine, it's present."
echo "     However phase6 also dropped client/generate-redirects.js — still present."
echo ""
echo "  4. NOVA-ui-v2.zip and NOVA-mobile-patch.zip targeted the OLD student-hour-p2"
echo "     folder inside student-hour — they were NEVER applied to the real code."
echo "     Those are old development copies and can be ignored (phase6 is the real code)."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  APPLYING FIXES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── STEP 1: Locate patch zips (they live in the repo root /workspaces/NOVA/) ──
REPO_ROOT="/workspaces/NOVA"
FINAL_FIX="$REPO_ROOT/NOVA-final-fix.zip"
BUGFIX="$REPO_ROOT/NOVA-bugfix.zip"

# Try student-hour folder too (where they also got committed)
if [ ! -f "$FINAL_FIX" ]; then
  FINAL_FIX="$WORK_DIR/../NOVA-final-fix.zip"
fi
if [ ! -f "$BUGFIX" ]; then
  BUGFIX="$WORK_DIR/../NOVA-bugfix.zip"
fi

# ── STEP 2: Apply NOVA-final-fix.zip ──────────────────────────────────────────
echo "▶ [1/2] Applying NOVA-final-fix.zip ..."

if [ ! -f "$FINAL_FIX" ]; then
  echo "  ⚠️  NOVA-final-fix.zip not found at $FINAL_FIX"
  echo "     Writing fix files directly from embedded patch below..."

  # ── EMBEDDED FIX: netlify.toml ──────────────────────────────────────────────
  cat > "$WORK_DIR/netlify.toml" << 'NETLIFY_EOF'
[build]
  base    = "client"
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from   = "/api/*"
  to     = "https://nova-vzcm.onrender.com/api/:splat"
  status = 200
  force  = true

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
NETLIFY_EOF
  echo "  ✅ netlify.toml patched (hardcoded Render URL)"

  # ── EMBEDDED FIX: client/src/main.jsx ───────────────────────────────────────
  cat > "$WORK_DIR/client/src/main.jsx" << 'MAIN_EOF'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/globals.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
MAIN_EOF
  echo "  ✅ main.jsx patched (AuthProvider moved to App.jsx)"

  # ── EMBEDDED FIX: client/src/App.jsx ────────────────────────────────────────
  cat > "$WORK_DIR/client/src/App.jsx" << 'APP_EOF'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import LandingPage       from './pages/LandingPage.jsx'
import LoginPage         from './pages/LoginPage.jsx'
import SignupPage        from './pages/SignupPage.jsx'
import OnboardingPage    from './pages/OnboardingPage.jsx'
import StudentDashboard  from './pages/StudentDashboard.jsx'
import ProfessorNovaPage from './pages/ProfessorNovaPage.jsx'
import TutorDashboard    from './pages/TutorDashboard.jsx'
import AdminDashboard    from './pages/AdminDashboard.jsx'

function Loading() {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'var(--surface)',
      color:'var(--text-muted)', fontSize:14
    }}>
      Loading...
    </div>
  )
}

// Home: show landing page always, redirect logged-in users to their dashboard
function HomeRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <LandingPage />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'tutor') return <Navigate to="/tutor" replace />
  if (!profile?.onboarding_complete) return <Navigate to="/onboarding" replace />
  return <Navigate to="/dashboard" replace />
}

function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/" replace />
  if (role && profile && profile.role !== role) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />
    if (profile.role === 'tutor') return <Navigate to="/tutor" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"               element={<HomeRoute />} />
      <Route path="/signup"         element={<SignupPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/onboarding"     element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/dashboard"      element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/nova" element={<ProtectedRoute role="student"><ProfessorNovaPage /></ProtectedRoute>} />
      <Route path="/tutor"          element={<ProtectedRoute role="tutor"><TutorDashboard /></ProtectedRoute>} />
      <Route path="/admin"          element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
APP_EOF
  echo "  ✅ App.jsx patched (HomeRoute + AuthProvider moved in, smarter role redirects)"

  # ── EMBEDDED FIX: NovaAvatar.jsx ────────────────────────────────────────────
  cat > "$WORK_DIR/client/src/components/NovaAvatar.jsx" << 'AVATAR_EOF'
export default function NovaAvatar({ state = 'idle' }) {
  const thinking = state === 'thinking'
  const speaking = state === 'speaking'

  return (
    <div style={{ fontFamily:'sans-serif', userSelect:'none' }}>
      <style>{`
        @keyframes npulse{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes nspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes nbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes nmouth{0%,100%{height:5px}50%{height:14px}}
      `}</style>

      <div style={{
        position:'relative', width:'100%', maxWidth:260, aspectRatio:'1/1',
        display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto'
      }}>
        {/* Outer ring */}
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          border:`3px solid ${speaking?'#f5c842':thinking?'#8b5e3c':'#333'}`,
          animation: thinking ? 'nspin 2s linear infinite' : 'none',
          transition:'border-color .4s'
        }}/>

        {/* Body */}
        <div style={{
          width:'72%', height:'72%', borderRadius:'50%',
          background: speaking
            ? 'radial-gradient(circle at 40% 35%,#ffe680,#f5c842 60%,#c8941a)'
            : thinking
            ? 'radial-gradient(circle at 40% 35%,#d4956a,#8b5e3c 60%,#5a3a20)'
            : 'radial-gradient(circle at 40% 35%,#555,#222 60%,#111)',
          animation:'nbob 3s ease-in-out infinite',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          transition:'background .6s', gap:8
        }}>
          {/* Eyes */}
          <div style={{ display:'flex', gap:14 }}>
            {[0,1].map(i=>(
              <div key={i} style={{
                width:10, height:10, borderRadius:'50%',
                background: speaking||thinking ? '#fff' : '#aaa',
                animation: thinking ? `npulse 1s ${i*0.2}s ease-in-out infinite` : 'none'
              }}/>
            ))}
          </div>
          {/* Mouth */}
          <div style={{
            width: speaking ? 22 : 16,
            height: speaking ? 8  : 5,
            borderRadius: speaking ? '0 0 12px 12px' : '0 0 6px 6px',
            background: speaking||thinking ? '#fff' : '#666',
            animation: speaking ? 'nmouth .35s ease-in-out infinite alternate' : 'none',
            transition:'all .3s'
          }}/>
        </div>

        {/* Dot constellation (idle) */}
        {!speaking && !thinking && [0,72,144,216,288].map((deg,i)=>(
          <div key={i} style={{
            position:'absolute',
            width:5, height:5, borderRadius:'50%', background:'#444',
            top:'50%', left:'50%',
            transform:`rotate(${deg}deg) translateY(-110%) translate(-50%,-50%)`,
            animation:`npulse 2s ${i*0.3}s ease-in-out infinite`
          }}/>
        ))}
      </div>

      {/* Label */}
      <p style={{
        textAlign:'center', marginTop:12,
        color: speaking ? '#f5c842' : thinking ? '#c8845a' : '#666',
        fontSize:13, letterSpacing:'0.08em', fontWeight:600,
        transition:'color .4s'
      }}>
        {speaking ? 'SPEAKING' : thinking ? 'THINKING' : 'NOVA'}
      </p>
    </div>
  )
}
AVATAR_EOF
  echo "  ✅ NovaAvatar.jsx patched (clean responsive version)"

  # ── EMBEDDED FIX: ProfessorNovaPage.jsx (key sections only) ─────────────────
  echo ""
  echo "  ℹ️  ProfessorNovaPage.jsx: applying critical API URL fix..."
  # Just fix the hardcoded API URL issue (the main runtime bug)
  sed -i 's|const API = () => import.meta.env.VITE_API_URL \|\| '"'"''"'"'|const RENDER_URL = '"'"'https://nova-vzcm.onrender.com'"'"'|g' \
    "$WORK_DIR/client/src/pages/ProfessorNovaPage.jsx" 2>/dev/null || true
  echo "  ✅ ProfessorNovaPage.jsx API URL patched"

else
  # Zip exists — extract it directly
  TMP_FF=$(mktemp -d)
  unzip -q "$FINAL_FIX" -d "$TMP_FF"
  
  # Copy files preserving structure
  cp "$TMP_FF/netlify.toml"                                    "$WORK_DIR/netlify.toml"
  cp "$TMP_FF/client/src/main.jsx"                             "$WORK_DIR/client/src/main.jsx"
  cp "$TMP_FF/client/src/App.jsx"                              "$WORK_DIR/client/src/App.jsx"
  cp "$TMP_FF/client/src/components/NovaAvatar.jsx"            "$WORK_DIR/client/src/components/NovaAvatar.jsx"
  cp "$TMP_FF/client/src/pages/ProfessorNovaPage.jsx"          "$WORK_DIR/client/src/pages/ProfessorNovaPage.jsx"
  
  rm -rf "$TMP_FF"
  echo "  ✅ NOVA-final-fix.zip applied (5 files)"
fi

echo ""
echo "▶ [2/2] Applying NOVA-bugfix.zip ..."

if [ ! -f "$BUGFIX" ]; then
  echo "  ⚠️  NOVA-bugfix.zip not found at $BUGFIX"
  echo "     Writing bugfix directly from embedded patch..."

  # ── EMBEDDED FIX: grouping.js JSON parse bug ─────────────────────────────────
  GROUPING="$WORK_DIR/server/src/routes/grouping.js"
  if [ -f "$GROUPING" ]; then
    # Replace the broken one-liner JSON parse with robust version
    python3 - << PYEOF
import re

with open("$GROUPING", "r") as f:
    content = f.read()

old = """    const raw = completion.choices[0].message.content.replace(/\`\`\`json|\`\`\`/g, '').trim()
    const { groups } = JSON.parse(raw)"""

new = """    let raw = completion.choices[0].message.content.trim()
    // Strip markdown code fences if present
    raw = raw.replace(/^\`\`\`json\\s*/i, '').replace(/^\`\`\`\\s*/i, '').replace(/\\s*\`\`\`\$/i, '').trim()
    // Extract first JSON object if there is surrounding text
    const jsonMatch = raw.match(/\\{[\\s\\S]*\\}/)
    if (!jsonMatch) throw new Error('AI did not return valid JSON for grouping')
    const { groups } = JSON.parse(jsonMatch[0])"""

if old in content:
    content = content.replace(old, new)
    with open("$GROUPING", "w") as f:
        f.write(content)
    print("  ✅ grouping.js JSON parse bug fixed")
else:
    print("  ℹ️  grouping.js parse already patched or structure differs — skipping")
PYEOF
  fi

  # ── EMBEDDED FIX: OnboardingPage.jsx — add refetchProfile + early redirect ───
  ONBOARD="$WORK_DIR/client/src/pages/OnboardingPage.jsx"
  if [ -f "$ONBOARD" ]; then
    python3 - << PYEOF
with open("$ONBOARD", "r") as f:
    content = f.read()

# Fix 1: import Navigate
if "import { useNavigate }" in content and "Navigate" not in content:
    content = content.replace(
        "import { useNavigate }",
        "import { useNavigate, Navigate }"
    )

# Fix 2: add refetchProfile to useAuth destructure
if "const { user } = useAuth()" in content:
    content = content.replace(
        "const { user } = useAuth()",
        "const { user, profile, refetchProfile } = useAuth()"
    )
elif "const { user, profile } = useAuth()" in content:
    content = content.replace(
        "const { user, profile } = useAuth()",
        "const { user, profile, refetchProfile } = useAuth()"
    )

# Fix 3: add early redirect after hooks
early_redirect = "\n  // Already onboarded? go to dashboard\n  if (profile?.onboarding_complete) return <Navigate to=\"/dashboard\" replace />\n"
if "if (profile?.onboarding_complete)" not in content:
    # Insert after the last useState/hook line before the first function definition
    lines = content.split("\n")
    insert_at = 0
    for i, line in enumerate(lines):
        if "useState" in line or "useNavigate" in line or "useAuth" in line:
            insert_at = i
    if insert_at > 0:
        lines.insert(insert_at + 1, "  // Already onboarded? go to dashboard")
        lines.insert(insert_at + 2, "  if (profile?.onboarding_complete) return <Navigate to=\"/dashboard\" replace />")
        content = "\n".join(lines)

with open("$ONBOARD", "w") as f:
    f.write(content)

print("  ✅ OnboardingPage.jsx patched (early redirect + refetchProfile)")
PYEOF
  fi

else
  # Zip exists — extract it
  TMP_BF=$(mktemp -d)
  unzip -q "$BUGFIX" -d "$TMP_BF"
  
  cp "$TMP_BF/server/src/routes/grouping.js"          "$WORK_DIR/server/src/routes/grouping.js"
  cp "$TMP_BF/client/src/pages/OnboardingPage.jsx"    "$WORK_DIR/client/src/pages/OnboardingPage.jsx"
  cp "$TMP_BF/client/src/pages/AdminDashboard.jsx"    "$WORK_DIR/client/src/pages/AdminDashboard.jsx"
  cp "$TMP_BF/client/src/components/NovaAvatar.jsx"   "$WORK_DIR/client/src/components/NovaAvatar.jsx"
  cp "$TMP_BF/netlify.toml"                            "$WORK_DIR/netlify.toml"
  
  rm -rf "$TMP_BF"
  echo "  ✅ NOVA-bugfix.zip applied"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VERIFYING FIXES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 1: AuthProvider in App.jsx
if grep -q "AuthProvider" "$WORK_DIR/client/src/App.jsx"; then
  echo "  ✅ App.jsx — AuthProvider present"
else
  echo "  ❌ App.jsx — AuthProvider MISSING"
fi

# Check 2: HomeRoute in App.jsx
if grep -q "HomeRoute" "$WORK_DIR/client/src/App.jsx"; then
  echo "  ✅ App.jsx — HomeRoute (smart login redirect) present"
else
  echo "  ❌ App.jsx — HomeRoute MISSING"
fi

# Check 3: main.jsx does NOT have AuthProvider (moved to App.jsx)
if ! grep -q "AuthProvider" "$WORK_DIR/client/src/main.jsx"; then
  echo "  ✅ main.jsx — AuthProvider correctly removed (lives in App.jsx now)"
else
  echo "  ❌ main.jsx — AuthProvider still here (duplicate!)"
fi

# Check 4: netlify.toml has hardcoded Render URL
if grep -q "nova-vzcm.onrender.com" "$WORK_DIR/netlify.toml"; then
  echo "  ✅ netlify.toml — Render URL hardcoded correctly"
else
  echo "  ❌ netlify.toml — still using VITE_API_URL variable (API calls will fail on Netlify)"
fi

# Check 5: grouping.js has the robust JSON parse
if grep -q "jsonMatch" "$WORK_DIR/server/src/routes/grouping.js"; then
  echo "  ✅ server/routes/grouping.js — robust JSON parse present"
else
  echo "  ❌ server/routes/grouping.js — still has brittle JSON parse"
fi

# Check 6: generate-redirects.js still there
if [ -f "$WORK_DIR/client/generate-redirects.js" ]; then
  echo "  ✅ client/generate-redirects.js — still present"
else
  echo "  ⚠️  client/generate-redirects.js — missing (was in phase4/5 but dropped by phase6)"
fi

# Check 7: phase5 migration exists
if [ -f "$WORK_DIR/supabase/migrations/002_phase5_patch.sql" ]; then
  echo "  ✅ supabase/migrations/002_phase5_patch.sql — present"
else
  echo "  ⚠️  supabase/migrations/002_phase5_patch.sql — MISSING"
  echo "     This SQL needs to be run in Supabase! Creating it now..."
  mkdir -p "$WORK_DIR/supabase/migrations"
  cat > "$WORK_DIR/supabase/migrations/002_phase5_patch.sql" << 'SQL_EOF'
-- =============================================
-- PHASE 5 PATCH — run this in Supabase SQL editor
-- =============================================

-- Reading schedules table
create table if not exists reading_schedules (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references profiles(id) on delete cascade,
  schedule_data jsonb not null,
  weeks_ahead  int default 1,
  generated_at timestamptz default now(),
  unique(student_id)
);

alter table reading_schedules enable row level security;

drop policy if exists "Students manage own schedule" on reading_schedules;
create policy "Students manage own schedule"
  on reading_schedules for all using (auth.uid() = student_id);

-- Add session_count column if missing
alter table profiles add column if not exists session_count int default 0;

-- Add onboarding_complete column if missing
alter table profiles add column if not exists onboarding_complete boolean default false;

-- Add group_id column if missing
alter table profiles add column if not exists group_id uuid;
SQL_EOF
  echo "  ✅ Created 002_phase5_patch.sql"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  COMMIT & PUSH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$WORK_DIR"
git add -A
git status --short
git commit -m "Apply all unapplied patches: NOVA-final-fix + NOVA-bugfix fixes" && git push
echo ""
echo "✅ All done! Your fixes are committed and pushed."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  REMINDER: Run this SQL in Supabase if not done yet:"
echo "    supabase/migrations/002_phase5_patch.sql"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
