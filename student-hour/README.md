# The Student Hour — Phase 6

## Unzip command
```bash
cd /workspaces/NOVA/student-hour && unzip -o ~/Downloads/student-hour-phase6.zip
```

Then push:
```bash
git add -A && git commit -m "Phase 6 - voice + course management" && git push
```

## What was fixed

### 1. Nova 500 error — FIXED
Groq SDK was on version 0.3.3 which is outdated. Upgraded to 0.9.0.
Also added a proper error message when GROQ_API_KEY is missing.

### 2. THREE is not defined — FIXED
Removed Three.js entirely. NovaAvatar is now pure CSS animation — 
no external deps, no errors, works on all browsers.

### 3. Nova voice — ADDED
Professor Nova now speaks out loud using the browser's built-in 
Web Speech API (free, no API key needed).
- Nova reads every response aloud automatically
- Students can speak to Nova using the microphone button
- Voice can be toggled on/off
- Each message has a "Replay" button to hear it again
- Works in Chrome, Edge, Safari (not Firefox)

### 4. My Courses tab — ADDED
Students now have a "My Courses" tab in their dashboard where they can:
- See all courses they added during onboarding
- Add new courses at any time (code + title + weakness description)
- Remove courses they no longer need help with
Nova automatically reads these when teaching

## Render — make sure GROQ_API_KEY is set
Go to Render → your service → Environment
GROQ_API_KEY = your key from console.groq.com

## Voice works in: Chrome, Edge, Safari
## Voice does NOT work in: Firefox (Firefox doesn't support Web Speech API)
