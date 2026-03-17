import { Router } from 'express'
import { prisma } from '../index.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'
import { parseExif, parseDateFromFilename } from '../services/exifParser.js'
import { generateThumbnail } from '../services/imageProcessor.js'
import { getHistoricalWeather, getTimeOfDay } from '../services/weatherBackfill.js'
import { getMoonPhase } from '../services/moonCalc.js'
import { analyzePhoto, processPhotoBatch, getPendingPhotos } from '../services/photoAnalyzer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const router = Router()

// Multer for bulk photo upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const propertyId = req.body.propertyId || req.query.propertyId || 'temp'
      const season = req.body.season || req.query.season || 'unsorted'
      const cameraId = req.body.cameraMarkerId || req.query.cameraMarkerId || 'unknown'
      const dir = path.join(__dirname, '..', 'data', 'properties', propertyId, 'seasons', String(season), 'photos', cameraId)
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `${uuid()}${ext}`)
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()))
  },
  limits: { fileSize: 30 * 1024 * 1024 },
})

// GET photos for a property
router.get('/', async (req, res) => {
  try {
    const { propertyId, seasonId, cameraMarkerId, analysisStatus, detectedDeer, page = 1, limit = 50 } = req.query
    const where = {}
    if (propertyId) where.propertyId = propertyId
    if (seasonId) where.seasonId = seasonId
    if (cameraMarkerId) where.cameraMarkerId = cameraMarkerId
    if (analysisStatus) where.analysisStatus = analysisStatus
    if (detectedDeer !== undefined) where.detectedDeer = detectedDeer === 'true'

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [photos, total] = await Promise.all([
      prisma.trailCamPhoto.findMany({
        where,
        take: parseInt(limit),
        skip,
        orderBy: { capturedAt: 'desc' },
        include: { cameraMarker: true },
      }),
      prisma.trailCamPhoto.count({ where }),
    ])

    res.json({ photos, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single photo
router.get('/:id', async (req, res) => {
  try {
    const photo = await prisma.trailCamPhoto.findUnique({
      where: { id: req.params.id },
      include: { cameraMarker: true, property: true },
    })
    if (!photo) return res.status(404).json({ error: 'Photo not found' })
    res.json(photo)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST bulk upload photos
router.post('/upload', upload.array('photos', 500), async (req, res) => {
  try {
    const { propertyId, seasonId, season, cameraMarkerId } = req.body

    if (!propertyId) return res.status(400).json({ error: 'propertyId required' })
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' })

    const property = await prisma.property.findUnique({ where: { id: propertyId } })
    if (!property) return res.status(404).json({ error: 'Property not found' })

    const results = []

    for (const file of req.files) {
      try {
        // Parse EXIF
        const exif = await parseExif(file.path)

        // Try filename date as fallback
        let capturedAt = exif.capturedAt
        if (!capturedAt) {
          capturedAt = parseDateFromFilename(file.originalname)
        }

        // Generate thumbnail
        const thumbDir = path.dirname(file.path)
        const thumbPath = await generateThumbnail(file.path, thumbDir)

        // Get relative paths
        const relativeFilePath = path.relative(path.join(__dirname, '..'), file.path)
        const relativeThumbPath = path.relative(path.join(__dirname, '..'), thumbPath)

        // Weather backfill
        let weatherData = {}
        if (capturedAt && property.lat && property.lng) {
          const weather = await getHistoricalWeather(property.lat, property.lng, capturedAt)
          if (weather) weatherData = weather
        }

        // Moon phase
        let moonData = {}
        if (capturedAt) {
          moonData = getMoonPhase(capturedAt)
        }

        // Time of day
        const timeOfDay = capturedAt ? getTimeOfDay(capturedAt) : null

        // Create photo record
        const photo = await prisma.trailCamPhoto.create({
          data: {
            propertyId,
            seasonId: seasonId || null,
            cameraMarkerId: cameraMarkerId || null,
            filePath: relativeFilePath,
            thumbPath: relativeThumbPath,
            capturedAt,
            season: season ? parseInt(season) : null,
            temperature: weatherData.temperature ?? null,
            barometricPressure: weatherData.barometricPressure ?? null,
            pressureTrend: weatherData.pressureTrend ?? null,
            moonPhase: moonData.phase ?? null,
            moonIllumination: moonData.illumination ?? null,
            timeOfDay,
            rawExif: JSON.stringify(exif.rawExif || {}),
            analysisStatus: 'pending',
          },
        })

        results.push({ id: photo.id, filename: file.originalname, status: 'uploaded' })
      } catch (err) {
        results.push({ filename: file.originalname, status: 'failed', error: err.message })
      }
    }

    res.status(201).json({
      uploaded: results.filter(r => r.status === 'uploaded').length,
      failed: results.filter(r => r.status === 'failed').length,
      total: req.files.length,
      results,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST analyze a single photo
router.post('/:id/analyze', async (req, res) => {
  try {
    const result = await analyzePhoto(req.params.id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST analyze all pending photos for a property
router.post('/analyze-batch', async (req, res) => {
  try {
    const { propertyId, limit = 50 } = req.body
    if (!propertyId) return res.status(400).json({ error: 'propertyId required' })

    const pending = await getPendingPhotos(propertyId, parseInt(limit))
    if (pending.length === 0) return res.json({ message: 'No pending photos', processed: 0 })

    // Start processing in background
    const photoIds = pending.map(p => p.id)

    // Return immediately with queue info
    res.json({
      message: 'Analysis started',
      queued: photoIds.length,
      photoIds,
    })

    // Process in background (fire and forget)
    processPhotoBatch(photoIds, (progress) => {
      console.log(`Photo analysis progress: ${progress.processed}/${progress.total} (${progress.failed} failed)`)
    }).catch(err => {
      console.error('Batch analysis error:', err)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET analysis queue status
router.get('/queue/status', async (req, res) => {
  try {
    const { propertyId } = req.query
    const where = propertyId ? { propertyId } : {}

    const [pending, processing, complete, failed] = await Promise.all([
      prisma.trailCamPhoto.count({ where: { ...where, analysisStatus: 'pending' } }),
      prisma.trailCamPhoto.count({ where: { ...where, analysisStatus: 'processing' } }),
      prisma.trailCamPhoto.count({ where: { ...where, analysisStatus: 'complete' } }),
      prisma.trailCamPhoto.count({ where: { ...where, analysisStatus: 'failed' } }),
    ])

    res.json({ pending, processing, complete, failed, total: pending + processing + complete + failed })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST historical bulk import (folder-by-year)
router.post('/import-historical', async (req, res) => {
  try {
    const { propertyId, basePath, cameraMarkerId } = req.body
    if (!propertyId || !basePath) {
      return res.status(400).json({ error: 'propertyId and basePath required' })
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } })
    if (!property) return res.status(404).json({ error: 'Property not found' })

    // Read year folders
    const absoluteBase = path.resolve(basePath)
    if (!fs.existsSync(absoluteBase)) {
      return res.status(400).json({ error: `Path not found: ${absoluteBase}` })
    }

    const entries = fs.readdirSync(absoluteBase, { withFileTypes: true })
    const yearFolders = entries
      .filter(e => e.isDirectory() && /^\d{4}$/.test(e.name))
      .map(e => ({ year: parseInt(e.name), path: path.join(absoluteBase, e.name) }))
      .sort((a, b) => a.year - b.year)

    if (yearFolders.length === 0) {
      return res.status(400).json({ error: 'No year folders found (expected folders named like 2021, 2022, etc.)' })
    }

    const importResults = []
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']

    for (const yearFolder of yearFolders) {
      // Ensure season exists
      let season = await prisma.season.findFirst({
        where: { propertyId, year: yearFolder.year },
      })
      if (!season) {
        season = await prisma.season.create({
          data: { propertyId, year: yearFolder.year, label: `${yearFolder.year} Season` },
        })
      }

      // Find all image files recursively
      const imageFiles = findImagesRecursive(yearFolder.path, imageExtensions)

      let imported = 0
      let failed = 0

      for (const imgPath of imageFiles) {
        try {
          // Copy to app data directory
          const destDir = path.join(__dirname, '..', 'data', 'properties', propertyId, 'seasons', String(yearFolder.year), 'photos', cameraMarkerId || 'imported')
          fs.mkdirSync(destDir, { recursive: true })

          const destFilename = `${uuid()}${path.extname(imgPath)}`
          const destPath = path.join(destDir, destFilename)
          fs.copyFileSync(imgPath, destPath)

          // Parse EXIF
          const exif = await parseExif(destPath)
          let capturedAt = exif.capturedAt || parseDateFromFilename(path.basename(imgPath))

          // Generate thumbnail
          const thumbPath = await generateThumbnail(destPath, destDir)

          // Relative paths
          const relFilePath = path.relative(path.join(__dirname, '..'), destPath)
          const relThumbPath = path.relative(path.join(__dirname, '..'), thumbPath)

          // Weather backfill
          let weatherData = {}
          if (capturedAt && property.lat && property.lng) {
            const weather = await getHistoricalWeather(property.lat, property.lng, capturedAt)
            if (weather) weatherData = weather
          }

          // Moon + time of day
          const moonData = capturedAt ? getMoonPhase(capturedAt) : {}
          const timeOfDay = capturedAt ? getTimeOfDay(capturedAt) : null

          await prisma.trailCamPhoto.create({
            data: {
              propertyId,
              seasonId: season.id,
              cameraMarkerId: cameraMarkerId || null,
              filePath: relFilePath,
              thumbPath: relThumbPath,
              capturedAt,
              season: yearFolder.year,
              temperature: weatherData.temperature ?? null,
              barometricPressure: weatherData.barometricPressure ?? null,
              pressureTrend: weatherData.pressureTrend ?? null,
              moonPhase: moonData.phase ?? null,
              moonIllumination: moonData.illumination ?? null,
              timeOfDay,
              rawExif: JSON.stringify(exif.rawExif || {}),
              analysisStatus: 'pending',
            },
          })

          imported++
        } catch (err) {
          console.error(`Failed to import ${imgPath}:`, err.message)
          failed++
        }
      }

      importResults.push({
        year: yearFolder.year,
        seasonId: season.id,
        totalFiles: imageFiles.length,
        imported,
        failed,
      })
    }

    res.json({
      message: 'Historical import complete',
      seasons: importResults,
      totalImported: importResults.reduce((s, r) => s + r.imported, 0),
      totalFailed: importResults.reduce((s, r) => s + r.failed, 0),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update photo tags/notes
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.taggedDeerIds && Array.isArray(data.taggedDeerIds)) {
      data.taggedDeerIds = JSON.stringify(data.taggedDeerIds)
    }
    const photo = await prisma.trailCamPhoto.update({
      where: { id: req.params.id },
      data,
    })
    res.json(photo)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE photo
router.delete('/:id', async (req, res) => {
  try {
    const photo = await prisma.trailCamPhoto.findUnique({ where: { id: req.params.id } })
    if (photo) {
      // Clean up files
      const baseDir = path.join(__dirname, '..')
      if (photo.filePath && fs.existsSync(path.join(baseDir, photo.filePath))) {
        fs.unlinkSync(path.join(baseDir, photo.filePath))
      }
      if (photo.thumbPath && fs.existsSync(path.join(baseDir, photo.thumbPath))) {
        fs.unlinkSync(path.join(baseDir, photo.thumbPath))
      }
    }
    await prisma.trailCamPhoto.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Recursively find image files in a directory
 */
function findImagesRecursive(dir, extensions) {
  const results = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findImagesRecursive(fullPath, extensions))
      } else if (extensions.includes(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath)
      }
    }
  } catch {}
  return results
}

export default router
