# The Student Hour — Phase 4

## THE MOST IMPORTANT THING — WHY YOUR API WAS 404ing

Your API calls were hitting Netlify (which has no backend) instead of Render.
The `_redirects` file is now generated at BUILD TIME from your `VITE_API_URL` env variable.

**You MUST set this in Netlify:**
1. Netlify dashboard → your site → Site configuration → Environment variables
2. Add: `VITE_API_URL` = `https://your-render-app.onrender.com`  (no trailing slash)
3. Trigger a new Netlify deploy

---

## Netlify Environment Variables (set all of these)

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your anon key |
| `VITE_API_URL` | `https://your-app.onrender.com` |

## Render Environment Variables (set all of these)

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `GROQ_API_KEY` | from console.groq.com |
| `CLIENT_URL` | `https://your-site.netlify.app` |
| `PORT` | `3001` |

---

## How tutor login works

1. Admin dashboard → Manage Tutors → fill in name + email → Generate
2. A temp password is shown (e.g. `Tutor@A1B2C3D4`)
3. Share the email + temp password with the tutor directly (WhatsApp, email, etc.)
4. Tutor goes to your site → Log in → uses that email + temp password
5. They land on the Tutor Dashboard

---

## Apply Phase 4 to your repo

```bash
cd /workspaces/NOVA/student-hour
unzip -o ~/Downloads/student-hour-phase4.zip
npm install
```

Then commit and push — Netlify auto-deploys.

---

## Supabase: run this if you haven't yet

```sql
-- In Supabase SQL Editor:

create table if not exists reading_schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  schedule_data jsonb not null,
  weeks_ahead int default 1,
  generated_at timestamptz default now(),
  unique(student_id)
);

alter table reading_schedules enable row level security;

create policy "Students manage own schedule"
  on reading_schedules for all using (auth.uid() = student_id);
```

---

## What changed in Phase 4

### Bug fixes
- API calls now reach Render correctly (root cause of ALL 404 errors fixed)
- Logged-in users auto-redirected to their dashboard from landing/login/signup
- OnboardingPage now redirects if already completed
- CORS fixed to work with Netlify + Render
- Error messages shown properly when API fails

### New features
- Professor Nova: classroom mode toggle (if you're in a group)
- Professor Nova: suggestion buttons so you can start fast
- Professor Nova: proper error display with retry
- Professor Nova: session counter shows how many sessions together
- Study schedule: fully working generate + display
- All API calls now use `VITE_API_URL` correctly
