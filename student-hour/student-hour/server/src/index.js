import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { authMiddleware } from './middleware/auth.js'
import groupingRoutes from './routes/grouping.js'
import novaRoutes from './routes/nova.js'
import tutorRoutes from './routes/tutor.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'The Student Hour API' }))

app.use('/api/grouping', authMiddleware, groupingRoutes)
app.use('/api/nova',     authMiddleware, novaRoutes)
app.use('/api/tutor',   authMiddleware, tutorRoutes)
app.use('/api/admin',   authMiddleware, adminRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`Student Hour API running on port ${PORT}`))
