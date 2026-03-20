/**
 * Sync Manager — Orchestrator
 * Starts/stops all trail cam connectors from a single manager.
 * Called from server.js on app boot when SYNC_ENABLED=true.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from './index.js'
import SpypointConnector from './connectors/spypoint.js'
import MoultrieAdapter from './connectors/moultrie.js'
import UniversalImport from './connectors/universalImport.js'
import PhotoNormalizer from './normalizer/photoNormalizer.js'
import { analyzePhoto } from './services/photoAnalyzer.js'
import { parseExif } from './services/exifParser.js'
import { generateThumbnail } from './services/imageProcessor.js'
import { getHistoricalWeather, getTimeOfDay } from './services/weatherBackfill.js'
import { getMoonPhase } from './services/moonCalc.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class SyncManager {
  constructor() {
    this.spypoint = new SpypointConnector()
    this.moultrie = new MoultrieAdapter()
    this.universalImport = new UniversalImport()
    this.normalizer = new PhotoNormalizer()
    this.running = false
  }

  /**
   * Wire up all connectors → normalizer → existing modules
   */
  wireEvents() {
    // All connectors emit 'photo' → normalizer queue
    this.spypoint.on('photo', (raw) => this.normalizer.enqueue(raw))
    this.moultrie.on('photo', (raw) => this.normalizer.enqueue(raw))
    this.universalImport.on('photo', (raw) => this.normalizer.enqueue(raw))

    // Moultrie circuit breaker events
    this.moultrie.on('moultrie:unavailable', (info) => {
      console.warn(`[SyncManager] Moultrie unavailable — will retry at ${info.resetAt}`)
    })

    // Normalizer emits photo:ingested → create TrailCamPhoto + queue for analysis
    this.normalizer.on('photo:ingested', async (normalized) => {
      try {
        await this.ingestPhoto(normalized)
      } catch (err) {
        console.error(`[SyncManager] Ingest failed for ${normalized.photoId}:`, err.message)
      }
    })

    // Error logging
    for (const connector of [this.spypoint, this.moultrie, this.universalImport]) {
      connector.on('error', (err) => {
        console.error(`[SyncManager] Connector error:`, err)
      })
    }
  }

  /**
   * Ingest a normalized photo into the Deer Predictor pipeline
   * This creates the TrailCamPhoto record and triggers the existing analysis flow
   */
  async ingestPhoto(normalized) {
    const { standId, timestamp, gps, filePath, source, metadata } = normalized

    // Find property from stand marker if mapped
    let propertyId = null
    let cameraMarkerId = null

    if (standId) {
      try {
        const marker = await prisma.propertyMarker.findUnique({
          where: { id: standId },
          select: { id: true, propertyId: true },
        })
        if (marker) {
          propertyId = marker.propertyId
          cameraMarkerId = marker.id
        }
      } catch {
        // Stand not found
      }
    }

    // If no property found from stand, use the first property
    if (!propertyId) {
      const firstProp = await prisma.property.findFirst({ select: { id: true } })
      propertyId = firstProp?.id
    }

    if (!propertyId) {
      console.warn('[SyncManager] No property found — cannot ingest photo')
      return
    }

    // Find matching season
    const capturedAt = new Date(timestamp)
    const year = capturedAt.getFullYear()
    const season = await prisma.season.findFirst({
      where: { propertyId, year },
    })

    // Parse EXIF if available
    let exifData = {}
    try {
      exifData = await parseExif(filePath)
    } catch {
      // EXIF parsing optional
    }

    // Create thumbnail
    let thumbPath = null
    try {
      thumbPath = await generateThumbnail(filePath, path.dirname(filePath))
    } catch {
      // Thumbnail optional
    }

    // Weather backfill
    let weatherData = {}
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { lat: true, lng: true },
    })
    if (property?.lat && property?.lng) {
      try {
        weatherData = await getHistoricalWeather(property.lat, property.lng, capturedAt) || {}
      } catch {
        // Weather optional
      }
    }

    // Moon phase
    const moonData = getMoonPhase(capturedAt)
    const timeOfDay = getTimeOfDay(capturedAt)

    // Create TrailCamPhoto record
    const photo = await prisma.trailCamPhoto.create({
      data: {
        propertyId,
        seasonId: season?.id,
        cameraMarkerId,
        filePath,
        thumbPath,
        capturedAt,
        season: year,
        temperature: weatherData.temperature || null,
        barometricPressure: weatherData.barometricPressure || null,
        pressureTrend: weatherData.pressureTrend || null,
        moonPhase: moonData.phase || null,
        moonIllumination: moonData.illumination || null,
        timeOfDay,
        rawExif: Object.keys(exifData).length > 0 ? JSON.stringify(exifData) : null,
        analysisStatus: 'pending',
        notes: `Auto-imported from ${source}`,
      },
    })

    console.log(`[SyncManager] Photo created: ${photo.id} (source: ${source}, stand: ${standId || 'unmapped'})`)

    // Queue for AI analysis if API key is configured
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      try {
        // Don't await — let it process asynchronously
        analyzePhoto(photo.id).catch((err) => {
          console.error(`[SyncManager] Analysis failed for ${photo.id}:`, err.message)
        })
      } catch {
        // Analysis is optional
      }
    }

    return photo
  }

  /**
   * Start all connectors
   */
  async start() {
    const syncEnabled = process.env.SYNC_ENABLED !== 'false'

    if (!syncEnabled) {
      console.log('[SyncManager] Sync disabled (SYNC_ENABLED=false)')
      return
    }

    if (this.running) return
    this.running = true

    console.log(`[SyncManager] Starting trail cam sync — ${new Date().toISOString()}`)

    this.wireEvents()

    // Start all connectors (they'll self-disable if not configured)
    await Promise.allSettled([
      this.spypoint.start(),
      this.moultrie.start(),
      this.universalImport.start(),
    ])

    console.log('[SyncManager] All connectors initialized')
  }

  /**
   * Stop all connectors
   */
  stop() {
    this.spypoint.stop()
    this.moultrie.stop()
    this.universalImport.stop()
    this.running = false
    console.log('[SyncManager] All connectors stopped')
  }

  /**
   * Get status of all connectors
   */
  status() {
    return {
      running: this.running,
      spypoint: { running: this.spypoint.running, configured: !!this.spypoint.apiKey },
      moultrie: { running: this.moultrie.running, status: this.moultrie.status(), configured: !!(process.env.MOULTRIE_EMAIL) },
      universalImport: { running: this.universalImport.running },
      normalizer: this.normalizer.status(),
    }
  }

  /**
   * Get the universal import instance (for manual upload route)
   */
  getUniversalImport() {
    return this.universalImport
  }
}

// Singleton
const syncManager = new SyncManager()
export default syncManager
