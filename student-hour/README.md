# The Student Hour — Phase 5

## Unzip command (copy this exactly)

```bash
cd /workspaces/NOVA/student-hour && unzip -o ~/Downloads/student-hour-phase5.zip
```

That's it. The zip extracts directly into your repo. Then:

```bash
git add -A && git commit -m "Phase 5" && git push
```

Netlify auto-deploys. Done.

---

## Environment variables — set these ONCE in Netlify

Go to: Netlify → your site → Site configuration → Environment variables

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your anon key |
| `VITE_API_URL` | `https://your-render-app.onrender.com` (NO trailing slash) |

---

## Environment variables — set these in Render

Go to: Render → your service → Environment

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `GROQ_API_KEY` | from console.groq.com (free) |
| `CLIENT_URL` | `https://your-site.netlify.app` |

---

## Supabase — run this SQL patch if you haven't yet

Copy the contents of `supabase/migrations/002_phase5_patch.sql` and run in Supabase SQL Editor.

---

## How everything works now

### Tutor login flow
1. Admin dashboard → Manage Tutors → enter name + email → Generate
2. Credentials appear on screen with a "Copy" button — email + password clearly shown
3. Send them to the tutor (WhatsApp, email, etc.)
4. Tutor goes to `/login` on your site and signs in
5. They land directly on their Tutor Dashboard

### Student flow
1. Sign up → onboarding form (courses + weaknesses) → dashboard
2. Admin runs AI grouping → student gets a group
3. Student chats with group, uses Professor Nova personal + classroom mode
4. Nova remembers every session and builds on it

### Professor Nova
- Full personality consciousness document injected every session
- Personal mode: knows your name, courses, history
- Classroom mode: teaches the whole group without exposing individuals
- Suggestion buttons to get started fast
- Session counter so Nova knows how many times you've met

## What changed in Phase 5
- Landing page shows "Go to dashboard" for logged-in users
- Admin dashboard has clear credential display + copy button
- Students list panel in admin
- Nova has a complete personality + teaching principles document
- SQL patch file for easy Supabase setup
- .gitignore cleaned up — no more package-lock.json in git
