# The Student Hour — Phase 1 Setup

## Unzip & Install

```bash
unzip student-hour-phase1.zip -d student-hour && cd student-hour && npm run install:all
```

## Supabase Setup

1. Go to https://supabase.com and create a new project
2. Open the SQL Editor and paste the entire contents of `supabase/migrations/001_initial_schema.sql` — run it
3. Go to Project Settings → API and copy:
   - Project URL
   - anon/public key
   - service_role key (keep this secret)

## Environment Variables

```bash
# Create client env
cp .env.example client/.env
# Edit client/.env — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Create server env
cp .env.example server/.env
# Edit server/.env — add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
```

## Create Your Admin Account

1. Start the dev server (see below)
2. Sign up at http://localhost:5173/signup with your own email
3. In Supabase SQL Editor, run:
   ```sql
   update profiles set role = 'admin' where email = 'your@email.com';
   ```
4. Now log in — you will be redirected to /admin

## Run Dev Server

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api/health

## Project Structure

```
student-hour/
├── client/          # React + Vite frontend
│   └── src/
│       ├── pages/   # All page components
│       ├── hooks/   # useAuth and others
│       ├── lib/     # Supabase client
│       └── styles/  # Design tokens + globals
├── server/          # Node.js + Express backend
│   └── src/
│       ├── routes/  # grouping, nova, tutor, admin
│       └── middleware/ # auth + role checks
└── supabase/
    └── migrations/  # Database schema
```

## What's Built in Phase 1

- Full design system (brown + yellow, curved, minimal)
- Landing page with Professor Nova preview
- Student sign up + login
- Course weakness onboarding form
- Auth with role-based routing (student / tutor / admin)
- All database tables with RLS policies
- Express API with auth middleware
- Professor Nova consciousness layer (AI backend)
- AI grouping engine
- Tutor + Admin route scaffolds
- Real-time messages table (ready for Phase 3)

## Next: Phase 2

Group chat, tutor workspace, resource uploads, task assignment.
