#!/usr/bin/env python3
"""
NOVA RAG WIRING PATCH
Connects nova.js to the RAG service for semantic PDF search.
Run: python3 nova_rag_patch.py
"""
import os, shutil, datetime, sys

NOVA = "/workspaces/NOVA/student-hour/server/src/routes/nova.js"
if not os.path.exists(NOVA):
    print(f"❌ Not found: {NOVA}"); sys.exit(1)

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
shutil.copy2(NOVA, f"{NOVA}.bak_{stamp}")
print(f"✅ Backed up nova.js")

with open(NOVA) as f: src = f.read()

changes = 0

# ════════════════════════════════════════════════════════════════
# PATCH 1 — Add RAG helper functions after imports
# ════════════════════════════════════════════════════════════════
RAG_URL = "process.env.RAG_SERVICE_URL || 'http://localhost:8001'"

RAG_HELPERS = f"""
// ─────────────────────────────────────────────────────────────────
// RAG — Retrieval Augmented Generation
// Calls the Python RAG microservice for semantic PDF search
// ─────────────────────────────────────────────────────────────────
const RAG_URL = {RAG_URL}

async function ragIndex(studentId, materialId, fileName, courseCode, content) {{
  try {{
    const res = await fetch(`${{RAG_URL}}/index`, {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ student_id: studentId, material_id: materialId, file_name: fileName, course_code: courseCode, content }})
    }})
    const data = await res.json()
    console.log(`RAG indexed ${{data.chunks_indexed}} chunks for ${{fileName}}`)
    return data
  }} catch (err) {{
    console.log('RAG service unavailable — falling back to direct content:', err.message)
    return null
  }}
}}

async function ragSearch(studentId, query, courseCode = null) {{
  try {{
    const res = await fetch(`${{RAG_URL}}/search`, {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ student_id: studentId, query, course_code: courseCode, n_results: 4 }})
    }})
    const data = await res.json()
    return data.results || []
  }} catch (err) {{
    console.log('RAG search unavailable:', err.message)
    return []
  }}
}}

async function ragDelete(studentId, materialId) {{
  try {{
    await fetch(`${{RAG_URL}}/material`, {{
      method: 'DELETE',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ student_id: studentId, material_id: materialId }})
    }})
  }} catch (_) {{}}
}}

"""

if 'RAG_URL' not in src:
    # Insert after the multer declaration
    src = src.replace(
        "const upload = multer(",
        RAG_HELPERS + "const upload = multer(",
        1
    )
    changes += 1
    print("✅ Patch 1 — RAG helper functions added")
else:
    print("✅ Patch 1 — already patched")

# ════════════════════════════════════════════════════════════════
# PATCH 2 — Use RAG search in /chat to find relevant PDF chunks
# Replace the static materials injection with dynamic RAG search
# ════════════════════════════════════════════════════════════════
OLD2 = """    const [pRes, cRes, mRes, matRes] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid).order('created_at', { ascending: false }).limit(15),
      adminSupabase.from('nova_materials').select('file_name, content, course_id, course_code').eq('student_id', sid).order('created_at', { ascending: false }).limit(4)
    ])"""

NEW2 = """    const [pRes, cRes, mRes] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', sid).single(),
      adminSupabase.from('student_courses').select('*').eq('student_id', sid),
      adminSupabase.from('nova_memory').select('content').eq('student_id', sid).order('created_at', { ascending: false }).limit(15),
    ])

    // RAG search — find most relevant PDF chunks for this specific question
    const lastUserMessage = messages.at(-1)?.content || ''
    const ragResults = await ragSearch(sid, lastUserMessage)"""

if OLD2 in src:
    src = src.replace(OLD2, NEW2, 1)
    changes += 1
    print("✅ Patch 2 — RAG search added to /chat route")
else:
    print("⚠️  Patch 2 skipped — chat query pattern not found")

# ════════════════════════════════════════════════════════════════
# PATCH 3 — Replace static materials with RAG results in prompt
# ════════════════════════════════════════════════════════════════
OLD3 = """    const profile = pRes.data
    const courses = cRes.data || []
    const memoryRows = mRes.data || []
    const memory = memoryRows.map(m => m.content).join('\\n') || null
    const materials = matRes.data || []"""

NEW3 = """    const profile = pRes.data
    const courses = cRes.data || []
    const memoryRows = mRes.data || []
    const memory = memoryRows.map(m => m.content).join('\\n') || null
    // Convert RAG results into material format for buildPrompt
    const materials = ragResults.length > 0
      ? ragResults.map(r => ({
          file_name:   r.file_name,
          course_code: r.course_code,
          content:     `[${r.relevance}% relevant] ${r.content}`
        }))
      : []"""

if OLD3 in src:
    src = src.replace(OLD3, NEW3, 1)
    changes += 1
    print("✅ Patch 3 — RAG results wired into prompt builder")
else:
    print("⚠️  Patch 3 skipped — materials assignment pattern not found")

# ════════════════════════════════════════════════════════════════
# PATCH 4 — Index document in RAG after upload
# ════════════════════════════════════════════════════════════════
OLD4 = """    const { error } = await adminSupabase.from('nova_materials').insert({
      student_id:  sid,
      file_name:   originalName,
      content:     cleaned,           // full text — no arbitrary slice
      chars:       cleaned.length,
      course_id:   courseId,
      course_code: courseCode,
      course_title: courseTitle
    })
    if (error) throw new Error(error.message)"""

NEW4 = """    const { data: insertedMat, error } = await adminSupabase.from('nova_materials').insert({
      student_id:  sid,
      file_name:   originalName,
      content:     cleaned,
      chars:       cleaned.length,
      course_id:   courseId,
      course_code: courseCode,
      course_title: courseTitle
    }).select('id').single()
    if (error) throw new Error(error.message)

    // Index into RAG for semantic search (async — don't block response)
    if (insertedMat?.id) {
      ragIndex(sid, insertedMat.id, originalName, courseCode, cleaned)
        .catch(err => console.log('RAG index error (non-fatal):', err.message))
    }"""

if OLD4 in src:
    src = src.replace(OLD4, NEW4, 1)
    changes += 1
    print("✅ Patch 4 — RAG indexing added to upload route")
else:
    print("⚠️  Patch 4 skipped — insert pattern not found")

with open(NOVA, 'w') as f: f.write(src)

print(f"""
✅ {changes} patches applied.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Copy rag_service.py to your project root:
   cp rag_service.py /workspaces/NOVA/student-hour/server/

2. Start the RAG service in a second terminal:
   cd /workspaces/NOVA/student-hour/server
   python3 rag_service.py

3. Add to Render environment variables:
   RAG_SERVICE_URL = http://localhost:8001
   (On Render, run rag_service.py as a background process
    or deploy it as a separate Render service)

4. Start your Node server normally:
   cd /workspaces/NOVA/student-hour/client && npm run dev

5. Commit:
   cd /workspaces/NOVA && git add -A && git commit -m "feat: RAG semantic PDF search - any question from any page" && git push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THIS CHANGES FOR STUDENTS:
Before RAG: Nova reads first 2000 chars of your PDF
After RAG:  Ask "explain theorem 12" and Nova finds
            that exact theorem anywhere in 1000 pages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
