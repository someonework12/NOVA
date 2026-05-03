#!/usr/bin/env python3
"""
NOVA UPLOAD FIX
- Raises file size limit to 40MB (client + server)
- Fixes JSON crash on upload error responses
- Increases text extraction limit
- Adds upload timeout feedback

Run: python3 nova_upload_fix.py
"""
import os, shutil, datetime, sys

BASE = "/workspaces/NOVA/student-hour"
DASHBOARD = f"{BASE}/client/src/pages/StudentDashboard.jsx"
NOVA_JS   = f"{BASE}/server/src/routes/nova.js"
INDEX_JS  = f"{BASE}/server/src/index.js"

for f in [DASHBOARD, NOVA_JS, INDEX_JS]:
    if not os.path.exists(f):
        print(f"❌ Not found: {f}"); sys.exit(1)

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
for f in [DASHBOARD, NOVA_JS, INDEX_JS]:
    shutil.copy2(f, f + f".bak_{stamp}")
print(f"✅ Backed up all files")

changes = 0

# ════════════════════════════════════════════════════════════════
# FIX 1 — Client: raise size check to 40MB + safe JSON parse
# ════════════════════════════════════════════════════════════════
with open(DASHBOARD) as f: src = f.read()

OLD1 = """  async function uploadPDF(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) { setUploadMsg('File too large. Max 15MB.'); return }

    setUploading(true); setUploadMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const fd = new FormData()
    fd.append('file', file)
    fd.append('courseId', course.id)
    fd.append('courseCode', course.course_code)
    fd.append('courseTitle', course.course_title)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/nova/upload-material`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')"""

NEW1 = """  async function uploadPDF(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 40 * 1024 * 1024) { setUploadMsg('File too large. Max 40MB.'); return }

    setUploading(true); setUploadMsg('⏳ Uploading and extracting text — large files may take up to 60 seconds...')
    const { data: { session } } = await supabase.auth.getSession()
    const fd = new FormData()
    fd.append('file', file)
    fd.append('courseId', course.id)
    fd.append('courseCode', course.course_code)
    fd.append('courseTitle', course.course_title)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/nova/upload-material`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd
      })
      // Safe JSON parse — server may return HTML on timeout/crash
      let data = {}
      try { data = await res.json() } catch (_) {}
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status}) — try a smaller file or check your connection`)"""

if OLD1 in src:
    src = src.replace(OLD1, NEW1, 1)
    with open(DASHBOARD, 'w') as f: f.write(src)
    changes += 1
    print("✅ Fix 1 — client 40MB limit + safe JSON parse + progress message")
else:
    print("⚠️  Fix 1 skipped — pattern not found in StudentDashboard.jsx")

# ════════════════════════════════════════════════════════════════
# FIX 2 — Server: raise multer to 40MB + increase text extraction
# ════════════════════════════════════════════════════════════════
with open(NOVA_JS) as f: src = f.read()

# Raise multer limit
if "fileSize: 15 * 1024 * 1024" in src:
    src = src.replace("fileSize: 15 * 1024 * 1024", "fileSize: 40 * 1024 * 1024", 1)
    changes += 1
    print("✅ Fix 2a — server multer limit raised to 40MB")
else:
    print("⚠️  Fix 2a skipped — multer limit pattern not found")

# Raise text extraction limit from 15000 to 40000 chars
if ".slice(0, 15000)" in src:
    src = src.replace(".slice(0, 15000)", ".slice(0, 40000)", 1)
    changes += 1
    print("✅ Fix 2b — text extraction raised from 15k to 40k chars")
else:
    print("⚠️  Fix 2b skipped — text slice pattern not found")

# Raise the old client-side check if still in server code
if "15 * 1024 * 1024" in src:
    src = src.replace("15 * 1024 * 1024", "40 * 1024 * 1024")
    print("✅ Fix 2c — remaining 15MB references updated")

with open(NOVA_JS, 'w') as f: f.write(src)

# ════════════════════════════════════════════════════════════════
# FIX 3 — Server index: raise express body limit + request timeout
# ════════════════════════════════════════════════════════════════
with open(INDEX_JS) as f: src = f.read()

if "express.json({ limit: '10mb' })" in src:
    src = src.replace("express.json({ limit: '10mb' })", "express.json({ limit: '50mb' })", 1)
    changes += 1
    print("✅ Fix 3 — express JSON body limit raised to 50MB")
else:
    print("⚠️  Fix 3 skipped — express limit pattern not found")

with open(INDEX_JS, 'w') as f: f.write(src)

print(f"""
✅ Done — {changes} fixes applied.

⚠️  IMPORTANT — also run this SQL in Supabase to increase the content column size:
   ALTER TABLE nova_materials ALTER COLUMN content TYPE text;
   (It may already be text — if so this is a no-op, safe to run)

Restart your server:
   cd /workspaces/NOVA/student-hour/server && npm run dev

Restart your client:
   cd /workspaces/NOVA/student-hour/client && npm run dev

Then commit:
   cd /workspaces/NOVA && git add -A && git commit -m "fix: raise upload limit to 40MB, safe JSON parse, 40k text extraction" && git push
""")
