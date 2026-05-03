// ─────────────────────────────────────────────────────────────────
// server/src/index.js — UPLOAD PATCH
// Changes from original:
//   1. express.json body limit raised from 50mb → 50mb (unchanged — already fine)
//   2. Added global request timeout of 120s to prevent Render/Netlify 504s
//   3. Added multer-specific 413 error handler so frontend gets clear message
// ─────────────────────────────────────────────────────────────────

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { authMiddleware } from './middleware/auth.js'
import groupingRoutes from './routes/grouping.js'
import novaRoutes from './routes/nova.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o.replace(/\/$/, '')))) cb(null, true)
    else cb(new Error('Not allowed by CORS'))
  },
  credentials: true
}))

// ── PATCH: 120-second global timeout so Render doesn't 504 on large PDF parse ──
app.use((req, res, next) => {
  res.setTimeout(120_000, () => {
    res.status(504).json({ error: 'Request timed out. Try uploading a smaller file or splitting the PDF into parts.' })
  })
  next()
})

app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'The Student Hour API' }))

app.use('/api/grouping', authMiddleware, groupingRoutes)
app.use('/api/nova',     authMiddleware, novaRoutes)

// ── PATCH: catch multer file-too-large errors before the generic handler ──
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large. Maximum allowed size is 40 MB.' })
  }
  next(err)
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`Student Hour API running on port ${PORT}`))
