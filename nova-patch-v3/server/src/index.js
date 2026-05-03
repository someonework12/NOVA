import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { authMiddleware } from './middleware/auth.js'
import groupingRoutes from './routes/grouping.js'
import novaRoutes from './routes/nova.js'
import tutorRoutes from './routes/tutor.js'
import adminRoutes from './routes/admin.js'
import scheduleRoutes from './routes/schedule.js'

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

// 120s timeout prevents 504 on large PDF uploads
app.use((req, res, next) => {
  res.setTimeout(120000, () => {
    if (!res.headersSent) res.status(504).json({ error: 'Request timed out. Try a smaller file.' })
  })
  next()
})

app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'The Student Hour API' }))

app.use('/api/grouping', authMiddleware, groupingRoutes)
app.use('/api/nova',     authMiddleware, novaRoutes)
app.use('/api/tutor',   authMiddleware, tutorRoutes)
app.use('/api/admin',   authMiddleware, adminRoutes)
app.use('/api/schedule', authMiddleware, scheduleRoutes)

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large. Maximum is 40 MB.' })
  next(err)
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`Student Hour API running on port ${PORT}`))
