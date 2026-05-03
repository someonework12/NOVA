// ─────────────────────────────────────────────────────────────────
// NOVA ROUTES — UPLOAD-MATERIAL PATCH
// Fixes:
//   1. fileSize raised from 15 MB → 40 MB
//   2. PDF content cap raised from 15,000 chars → 500,000 chars (covers 1000+ pages)
//   3. pdfParse gets max: 0 (no page cap — reads ALL pages)
//   4. Chunked storage: content > 100k chars is split into nova_materials rows
//   5. Request timeout extended to 120s to prevent 504 on large PDFs
//   6. Better 400/413 error messages so frontend shows meaningful text
// ─────────────────────────────────────────────────────────────────

import { Router } from 'express'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import fs from 'fs'
import path from 'path'
import { adminSupabase } from '../middleware/auth.js'
import Groq from 'groq-sdk'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'

// ─── PATCH: raised file size limit from 15 MB → 40 MB ───────────
const upload = multer({
  dest: '/tmp/nova-uploads/',
  limits: { fileSize: 40 * 1024 * 1024 }   // 40 MB
})

// ─── PATCH: chunk size for splitting large PDFs in DB ───────────
const CHUNK_SIZE = 100_000          // 100k chars per DB row
const MAX_TOTAL_CHARS = 500_000     // 500k total = ~1000+ pages comfortable

// ─────────────────────────────────────────────────────────────────
// Keep all your existing helper functions and routes EXACTLY as-is.
// Only the upload-material section below changes.
// ─────────────────────────────────────────────────────────────────

// POST /upload-material
// ─────────────────────────────────────────────────────────────────
router.post('/upload-material', upload.single('file'), async (req, res) => {

  // ── PATCH: extend response timeout to 120s (prevents 504 on Render) ──
  req.socket.setTimeout(120_000)
  res.setTimeout(120_000)

  const tmpPath = req.file?.path
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received. Please attach a PDF, DOCX, or TXT file.' })

    const sid = req.user.id
    const originalName = req.file.originalname
    const ext = path.extname(originalName).toLowerCase()
    const courseId    = req.body.courseId    || null
    const courseCode  = req.body.courseCode  || null
    const courseTitle = req.body.courseTitle || null

    let textContent = ''

    // ── PDF ───────────────────────────────────────────────────────
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(tmpPath)

      // PATCH: max: 0 means NO page limit — reads every single page
      const parsed = await pdfParse(buffer, { max: 0 })
      textContent = parsed.text

    // ── DOCX ──────────────────────────────────────────────────────
    } else if (ext === '.docx') {
      const buffer = fs.readFileSync(tmpPath)
      const result = await mammoth.extractRawText({ buffer })
      textContent = result.value

    // ── TXT ───────────────────────────────────────────────────────
    } else if (ext === '.txt') {
      textContent = fs.readFileSync(tmpPath, 'utf-8')

    // ── AUDIO ─────────────────────────────────────────────────────
    } else if (['.mp3', '.mp4', '.wav', '.m4a', '.ogg', '.webm'].includes(ext)) {
      const audioBuffer = fs.readFileSync(tmpPath)
      const transcription = await groq.audio.transcriptions.create({
        file: new File([audioBuffer], originalName, { type: 'audio/mpeg' }),
        model: 'whisper-large-v3',
        response_format: 'text'
      })
      textContent = `[VOICE RECORDING TRANSCRIPT — Teaching Style Reference]\n\n${transcription}`

    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload PDF, DOCX, TXT, or audio (MP3, M4A, WAV).' })
    }

    // ── Normalise whitespace ──────────────────────────────────────
    const cleaned = textContent.replace(/\s+/g, ' ').trim()

    if (cleaned.length < 50) {
      return res.status(400).json({
        error: 'Could not extract readable text from this file. Make sure the PDF is text-based (not a scanned image) and try again.'
      })
    }

    // ── PATCH: cap at 500k chars instead of 15k ──────────────────
    const fullContent = cleaned.slice(0, MAX_TOTAL_CHARS)
    const totalChars  = fullContent.length

    // ── PATCH: split into chunks so very large docs don't exceed DB column limits ──
    const chunks = []
    for (let i = 0; i < fullContent.length; i += CHUNK_SIZE) {
      chunks.push(fullContent.slice(i, i + CHUNK_SIZE))
    }

    // Insert each chunk as its own row (chunk_index tells Nova how to reassemble)
    for (let idx = 0; idx < chunks.length; idx++) {
      const insertData = {
        student_id:   sid,
        file_name:    chunks.length > 1 ? `${originalName} [part ${idx + 1}/${chunks.length}]` : originalName,
        content:      chunks[idx],
        chars:        chunks[idx].length,
        chunk_index:  idx,
        chunk_total:  chunks.length,
      }
      if (courseId)    insertData.course_id    = courseId
      if (courseCode)  insertData.course_code  = courseCode
      if (courseTitle) insertData.course_title = courseTitle

      const { error } = await adminSupabase.from('nova_materials').insert(insertData)
      if (error) throw new Error(error.message)
    }

    res.json({
      success:      true,
      file_name:    originalName,
      chars:        totalChars,
      chunks:       chunks.length,
      course_code:  courseCode || null,
      message:      chunks.length > 1
        ? `Uploaded successfully — ${totalChars.toLocaleString()} characters across ${chunks.length} parts`
        : `Uploaded successfully — ${totalChars.toLocaleString()} characters`
    })

  } catch (err) {
    console.error('Nova /upload-material error:', err.message)

    // Give the frontend a useful message for the most common failure
    if (err.message?.includes('File too large')) {
      return res.status(413).json({ error: 'File exceeds the 40 MB limit. Try compressing the PDF first.' })
    }
    res.status(500).json({ error: err.message })

  } finally {
    if (tmpPath) { try { fs.unlinkSync(tmpPath) } catch (_) {} }
  }
})

export default router
