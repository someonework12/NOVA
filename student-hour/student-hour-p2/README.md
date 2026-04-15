# The Student Hour — Phase 2

## What changed from Phase 1
- Anthropic replaced with Groq (free, fast, Llama 3 70B)
- Real-time group chat (Supabase Realtime)
- Professor Nova full chat UI with Three.js avatar
- Student dashboard with sidebar navigation
- Tutor dashboard: resource uploads, task assignment, group progress
- Admin dashboard: generate tutor logins, assign tutors, run AI grouping
- AuthProvider properly wrapping whole app

---

## First time setup (fresh Codespace)

```bash
# 1. Unzip
unzip student-hour-phase2.zip -d student-hour && cd student-hour

# 2. Install all dependencies
npm run install:all

# 3. Set up environment variables
cp .env.example client/.env
cp .env.example server/.env
# Then edit both files with your real keys (see below)

# 4. Run
npm run dev
```

---

## Upgrading from Phase 1

If you already have Phase 1 running, run this patch instead:

```bash
# In your existing student-hour folder:
unzip student-hour-phase2.zip -o
npm run install:all
npm run dev
```

---

## Environment variables

### `client/.env`
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### `server/.env`
```
PORT=3001
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
```

**Get your free Groq key:** https://console.groq.com
(Sign up → API Keys → Create key. It's free.)

---

## Supabase setup (if not done in Phase 1)

1. Create project at https://supabase.com
2. SQL Editor → paste entire `supabase/migrations/001_initial_schema.sql` → Run
3. Copy Project URL + anon key + service_role key into your `.env` files

---

## Make yourself admin

After signing up on the site:
```sql
-- Run in Supabase SQL Editor
update profiles set role = 'admin' where email = 'your@email.com';
```

---

## URLs when running

| URL | What it is |
|-----|------------|
| http://localhost:5173 | Landing page |
| http://localhost:5173/signup | Student signup |
| http://localhost:5173/login | Login (all roles) |
| http://localhost:5173/dashboard | Student dashboard |
| http://localhost:5173/dashboard/nova | Professor Nova |
| http://localhost:5173/tutor | Tutor dashboard |
| http://localhost:5173/admin | Admin dashboard |
| http://localhost:3001/api/health | API health check |

---

## Project structure

```
student-hour/
├── client/src/
│   ├── pages/
│   │   ├── LandingPage.jsx        — Public landing
│   │   ├── SignupPage.jsx         — Student signup
│   │   ├── LoginPage.jsx          — Login all roles
│   │   ├── OnboardingPage.jsx     — Course weakness form
│   │   ├── StudentDashboard.jsx   — Chat, tasks, resources
│   │   ├── ProfessorNovaPage.jsx  — Nova chat + avatar
│   │   ├── TutorDashboard.jsx     — Upload, assign, progress
│   │   └── AdminDashboard.jsx     — Tutors, groups, AI grouping
│   ├── components/
│   │   ├── GroupChat.jsx          — Real-time chat component
│   │   └── NovaAvatar.jsx         — Three.js avatar
│   ├── hooks/
│   │   ├── useAuth.jsx            — Auth state + AuthProvider
│   │   ├── useGroup.js            — Group data fetching
│   │   └── useChat.js             — Real-time chat hook
│   └── lib/
│       └── supabase.js            — Supabase client
├── server/src/
│   ├── index.js                   — Express server
│   ├── middleware/auth.js         — JWT verification
│   └── routes/
│       ├── nova.js                — Prof Nova (Groq)
│       ├── grouping.js            — AI grouping (Groq)
│       ├── tutor.js               — Tutor actions
│       └── admin.js               — Admin actions
└── supabase/migrations/
    └── 001_initial_schema.sql     — Full DB schema
```

---

## Phase 3 — coming next
- Supabase Storage for file uploads
- Reading schedule generator
- Classroom mode (group Nova sessions)
- Student progress tracking charts
- Professor Nova personality document (full character brief)
