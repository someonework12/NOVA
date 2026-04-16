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

// Allow all origins in development, specific origins in production
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return cb(null, true)
    const allowed = [
      'http://localhost:5173',
      'http://localhost:4173',
      process.env.CLIENT_URL,
    ].filter(Boolean)
    // Allow any netlify.app domain and the specific client URL
    if (allowed.some(u => origin.startsWith(u)) || origin.endsWith('.netlify.app') || origin.endsWith('.onrender.com')) {
      return cb(null, true)
    }
    console.warn('CORS blocked:', origin)
    return cb(null, true) // Temporarily allow all — tighten after confirming Render URL
  },
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'The Student Hour API', timestamp: new Date().toISOString() }))

app.use('/api/grouping', authMiddleware, groupingRoutes)
app.use('/api/nova',     authMiddleware, novaRoutes)
app.use('/api/tutor',   authMiddleware, tutorRoutes)
app.use('/api/admin',   authMiddleware, adminRoutes)
app.use('/api/schedule', authMiddleware, scheduleRoutes)

app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, '0.0.0.0', () => console.log(`Student Hour API on port ${PORT}`))
