#!/usr/bin/env bash
set -e

WORK_DIR="/workspaces/NOVA/student-hour"
cd "$WORK_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " NOVA — Applying all missing patches"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── FIX 1: netlify.toml — hardcode Render URL ──
cat > "$WORK_DIR/netlify.toml" << 'EOF'
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
EOF
echo "✅ netlify.toml fixed"

# ── FIX 2: main.jsx — remove AuthProvider (it moves to App.jsx) ──
cat > "$WORK_DIR/client/src/main.jsx" << 'EOF'
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
EOF
echo "✅ main.jsx fixed"

# ── FIX 3: App.jsx — AuthProvider + HomeRoute + smart role redirects ──
cat > "$WORK_DIR/client/src/App.jsx" << 'EOF'
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
    }}>Loading...</div>
  )
}

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
EOF
echo "✅ App.jsx fixed"

# ── FIX 4: NovaAvatar.jsx — clean version ──
cat > "$WORK_DIR/client/src/components/NovaAvatar.jsx" << 'EOF'
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
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          border:`3px solid ${speaking?'#f5c842':thinking?'#8b5e3c':'#333'}`,
          animation: thinking ? 'nspin 2s linear infinite' : 'none',
          transition:'border-color .4s'
        }}/>
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
          <div style={{ display:'flex', gap:14 }}>
            {[0,1].map(i=>(
              <div key={i} style={{
                width:10, height:10, borderRadius:'50%',
                background: speaking||thinking ? '#fff' : '#aaa',
                animation: thinking ? `npulse 1s ${i*0.2}s ease-in-out infinite` : 'none'
              }}/>
            ))}
          </div>
          <div style={{
            width: speaking ? 22 : 16, height: speaking ? 8 : 5,
            borderRadius: speaking ? '0 0 12px 12px' : '0 0 6px 6px',
            background: speaking||thinking ? '#fff' : '#666',
            animation: speaking ? 'nmouth .35s ease-in-out infinite alternate' : 'none',
            transition:'all .3s'
          }}/>
        </div>
      </div>
      <p style={{
        textAlign:'center', marginTop:12,
        color: speaking ? '#f5c842' : thinking ? '#c8845a' : '#666',
        fontSize:13, letterSpacing:'0.08em', fontWeight:600, transition:'color .4s'
      }}>
        {speaking ? 'SPEAKING' : thinking ? 'THINKING' : 'NOVA'}
      </p>
    </div>
  )
}
EOF
echo "✅ NovaAvatar.jsx fixed"

# ── FIX 5: grouping.js — robust JSON parse ──
python3 - << 'PYEOF'
path = "/workspaces/NOVA/student-hour/server/src/routes/grouping.js"
with open(path) as f:
    c = f.read()

old = "    const raw = completion.choices[0].message.content.replace(/```json|```/g, '').trim()\n    const { groups } = JSON.parse(raw)"
new = """    let raw = completion.choices[0].message.content.trim()
    raw = raw.replace(/^```json\\s*/i,'').replace(/^```\\s*/i,'').replace(/\\s*```$/i,'').trim()
    const jsonMatch = raw.match(/\\{[\\s\\S]*\\}/)
    if (!jsonMatch) throw new Error('AI did not return valid JSON for grouping')
    const { groups } = JSON.parse(jsonMatch[0])"""

if old in c:
    with open(path, "w") as f:
        f.write(c.replace(old, new))
    print("✅ grouping.js JSON parse fixed")
else:
    print("ℹ️  grouping.js already patched or different — skipping")
PYEOF

# ── FIX 6: Ensure 002 migration exists ──
mkdir -p "$WORK_DIR/supabase/migrations"
if [ ! -f "$WORK_DIR/supabase/migrations/002_phase5_patch.sql" ]; then
cat > "$WORK_DIR/supabase/migrations/002_phase5_patch.sql" << 'EOF'
create table if not exists reading_schedules (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references profiles(id) on delete cascade,
  schedule_data jsonb not null,
  weeks_ahead   int default 1,
  generated_at  timestamptz default now(),
  unique(student_id)
);
alter table reading_schedules enable row level security;
drop policy if exists "Students manage own schedule" on reading_schedules;
create policy "Students manage own schedule"
  on reading_schedules for all using (auth.uid() = student_id);
alter table profiles add column if not exists session_count int default 0;
alter table profiles add column if not exists onboarding_complete boolean default false;
alter table profiles add column if not exists group_id uuid;
EOF
echo "✅ 002_phase5_patch.sql created"
else
echo "✅ 002_phase5_patch.sql already exists"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -q "AuthProvider" "$WORK_DIR/client/src/App.jsx"       && echo "✅ App.jsx has AuthProvider"       || echo "❌ App.jsx missing AuthProvider"
grep -q "HomeRoute"    "$WORK_DIR/client/src/App.jsx"       && echo "✅ App.jsx has HomeRoute"           || echo "❌ App.jsx missing HomeRoute"
grep -q "AuthProvider" "$WORK_DIR/client/src/main.jsx"      && echo "❌ main.jsx still has AuthProvider (duplicate!)" || echo "✅ main.jsx clean"
grep -q "onrender.com" "$WORK_DIR/netlify.toml"             && echo "✅ netlify.toml has Render URL"    || echo "❌ netlify.toml missing Render URL"
grep -q "jsonMatch"    "$WORK_DIR/server/src/routes/grouping.js" && echo "✅ grouping.js robust JSON" || echo "❌ grouping.js still fragile"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " COMMITTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git add -A
git commit -m "Apply NOVA-final-fix + NOVA-bugfix patches correctly" && git push
echo ""
echo "🎉 All patches applied and pushed!"
