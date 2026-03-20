/**
 * Photo Normalizer + Queue
 * The critical seam between all connectors and existing Deer Predictor modules.
 * Normalizes raw photo objects from any connector into Deer Predictor domain objects.
 */
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { prisma } from '../index.js'

class PhotoNormalizer extends EventEmitter {
  constructor(options = {}) {
    super()
    this.queueBackend = options.queueBackend || process.env.QUEUE_BACKEND || 'memory'
    this.queue = []
    this.processing = false
    this.concurrency = options.concurrency || 3
    this.activeJobs = 0
  }

  /**
   * Look up vendor camera ID → internal stand ID from CameraStandMap
   */
  async resolveStandId(vendorCameraId, source) {
    try {
      const mapping = await prisma.cameraStandMap.findUnique({
        where: { vendorCameraId },
      })

      if (mapping && mapping.active) {
        return mapping.standId
      }
    } catch (err) {
      console.error(`[Normalizer] Stand lookup failed for ${vendorCameraId}:`, err.message)
    }

    return null
  }

  /**
   * Normalize a raw photo object from any connector
   */
  async normalize(rawPhoto) {
    const {
      source,
      vendorCameraId,
      vendorPhotoId,
      rawTimestamp,
      gpsLat,
      gpsLng,
      localFilePath,
      rawMetadata,
    } = rawPhoto

    // Look up stand mapping
    const standId = await this.resolveStandId(vendorCameraId, source)

    // Parse timestamp
    let timestamp
    try {
      timestamp = new Date(rawTimestamp).toISOString()
    } catch {
      timestamp = new Date().toISOString()
    }

    const normalized = {
      cameraId: vendorCameraId,
      standId,
      photoId: uuidv4(),
      timestamp,
      gps: gpsLat && gpsLng ? { lat: gpsLat, lng: gpsLng } : null,
      filePath: localFilePath,
      source,
      metadata: {
        vendorPhotoId,
        ...rawMetadata,
      },
    }

    return normalized
  }

  /**
   * Enqueue a raw photo for normalization
   */
  async enqueue(rawPhoto) {
    this.queue.push(rawPhoto)
    this.emit('queued', { queueLength: this.queue.length })

    // Process if not already running
    if (!this.processing) {
      this.processQueue()
    }
  }

  /**
   * Process the queue
   */
  async processQueue() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      // Respect concurrency limit
      if (this.activeJobs >= this.concurrency) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        continue
      }

      const rawPhoto = this.queue.shift()
      this.activeJobs++

      // Process without blocking the loop
      this.processOne(rawPhoto)
        .catch((err) => {
          console.error('[Normalizer] Process error:', err.message)
        })
        .finally(() => {
          this.activeJobs--
        })
    }

    // Wait for all active jobs to finish
    while (this.activeJobs > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    this.processing = false
  }

  /**
   * Process a single photo through normalization
   */
  async processOne(rawPhoto) {
    try {
      const normalized = await this.normalize(rawPhoto)

      // Emit the ingested event — this is the critical integration point
      // with existing property map and photo analyzer modules
      this.emit('photo:ingested', normalized)

      console.log(`[Normalizer] Photo ingested: ${normalized.photoId} from ${normalized.source} (stand: ${normalized.standId || 'unmapped'})`)
      return normalized
    } catch (err) {
      console.error(`[Normalizer] Normalization failed:`, err.message)

      // Log to trailcam_errors table
      try {
        await prisma.trailCamSyncError.create({
          data: {
            source: rawPhoto.source || 'unknown',
            vendorCameraId: rawPhoto.vendorCameraId || null,
            vendorPhotoId: rawPhoto.vendorPhotoId || null,
            rawPayload: JSON.stringify(rawPhoto),
            errorMessage: err.message,
          },
        })
      } catch (dbErr) {
        console.error('[Normalizer] Failed to log error to DB:', dbErr.message)
      }

      this.emit('error', { rawPhoto, error: err })
      throw err
    }
  }

  /**
   * Get queue status
   */
  status() {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs,
      processing: this.processing,
    }
  }
}

export default PhotoNormalizer
