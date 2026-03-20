import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import propertiesRouter from './routes/properties.js'
import markersRouter from './routes/markers.js'
import photosRouter from './routes/photos.js'
import deerRouter from './routes/deer.js'
import sightingsRouter from './routes/sightings.js'
import signRouter from './routes/sign.js'
import standsRouter from './routes/stands.js'
import doeGroupsRouter from './routes/doeGroups.js'
import reportsRouter from './routes/reports.js'
import seasonalRouter from './routes/seasonal.js'
import briefingsRouter from './routes/briefings.js'
import settingsRouter from './routes/settings.js'
import cameraMappingsRouter from './routes/cameraMappings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const prisma = new PrismaClient()
const app = express()
const PORT = process.env.SERVER_PORT || 3001
const UPLOAD_DIR = process.env.UPLOAD_DIR || './data'

// Ensure data directories exist
fs.mkdirSync(path.join(__dirname, UPLOAD_DIR, 'properties'), { recursive: true })

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Serve uploaded files
app.use('/data', express.static(path.join(__dirname, UPLOAD_DIR)))

// API Routes
app.use('/api/properties', propertiesRouter)
app.use('/api/markers', markersRouter)
app.use('/api/photos', photosRouter)
app.use('/api/deer', deerRouter)
app.use('/api/sightings', sightingsRouter)
app.use('/api/sign', signRouter)
app.use('/api/stands', standsRouter)
app.use('/api/doe-groups', doeGroupsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/seasonal', seasonalRouter)
app.use('/api/briefings', briefingsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/cameras/mappings', cameraMappingsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, async () => {
  console.log(`Deer Predictor server running on port ${PORT}`)

  // Start trail cam sync if enabled
  try {
    const { default: syncManager } = await import('./syncManager.js')
    await syncManager.start()

    // Expose sync status endpoint
    app.get('/api/sync/status', (req, res) => {
      res.json(syncManager.status())
    })

    // Manual upload endpoint via universal import
    const multer = (await import('multer')).default
    const upload = multer({ dest: path.join(__dirname, 'data', 'tmp') })
    app.post('/api/import/upload', upload.array('photos', 50), async (req, res) => {
      try {
        const universalImport = syncManager.getUniversalImport()
        const results = await universalImport.processUpload(req.body.cameraId, req.files || [])
        res.json({ success: true, imported: results.length })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })
  } catch (err) {
    console.error('Sync manager initialization error:', err.message)
  }
})
