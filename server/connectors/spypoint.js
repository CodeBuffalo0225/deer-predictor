/**
 * Spypoint API Connector
 * Authenticates via Spypoint REST API and polls for new photos
 */
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { EventEmitter } from 'events'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class SpypointConnector extends EventEmitter {
  constructor(options = {}) {
    super()
    this.apiKey = options.apiKey || process.env.SPYPOINT_API_KEY
    this.apiBase = options.apiBase || process.env.SPYPOINT_API_BASE || 'https://restapi.spypoint.com'
    this.pollInterval = options.pollInterval || parseInt(process.env.SYNC_POLL_INTERVAL_MS) || 900000
    this.uploadDir = options.uploadDir || path.join(__dirname, '..', 'data', 'trailcam')
    this.token = null
    this.timer = null
    this.running = false
    this.seenPhotoIds = new Set()
    this.lastPollTime = null
  }

  /**
   * Authenticate with Spypoint API
   */
  async authenticate() {
    if (!this.apiKey) {
      throw new Error('SPYPOINT_API_KEY not configured')
    }

    try {
      const res = await fetch(`${this.apiBase}/api/v3/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: this.apiKey }),
      })

      if (!res.ok) {
        throw new Error(`Spypoint auth failed: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      this.token = data.token || data.access_token
      this.emit('authenticated')
      console.log('[Spypoint] Authenticated successfully')
      return true
    } catch (err) {
      console.error('[Spypoint] Authentication error:', err.message)
      this.emit('error', { type: 'auth', error: err })
      return false
    }
  }

  /**
   * Fetch photos since a given timestamp
   */
  async fetchSince(since) {
    if (!this.token) {
      const authed = await this.authenticate()
      if (!authed) return []
    }

    try {
      const params = new URLSearchParams()
      if (since) params.set('since', new Date(since).toISOString())

      const res = await fetch(`${this.apiBase}/api/v3/photos?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      })

      if (res.status === 401) {
        // Token expired, re-auth and retry once
        this.token = null
        const authed = await this.authenticate()
        if (!authed) return []
        return this.fetchSince(since)
      }

      if (!res.ok) {
        throw new Error(`Spypoint fetch failed: ${res.status}`)
      }

      const data = await res.json()
      const photos = data.photos || data.results || data || []
      return Array.isArray(photos) ? photos : []
    } catch (err) {
      console.error('[Spypoint] Fetch error:', err.message)
      this.emit('error', { type: 'fetch', error: err })
      return []
    }
  }

  /**
   * Download a photo binary and store locally
   */
  async downloadPhoto(photo) {
    const cameraId = photo.camera_id || photo.cameraId || 'unknown'
    const photoId = photo.id || photo.photo_id
    const imageUrl = photo.url || photo.image_url || photo.origin_url

    if (!imageUrl || !photoId) return null

    // Deduplicate
    if (this.seenPhotoIds.has(photoId)) return null
    this.seenPhotoIds.add(photoId)

    const cameraDir = path.join(this.uploadDir, cameraId)
    await fs.mkdir(cameraDir, { recursive: true })

    const ext = path.extname(new URL(imageUrl).pathname) || '.jpg'
    const filePath = path.join(cameraDir, `${photoId}${ext}`)

    // Skip if already downloaded
    try {
      await fs.access(filePath)
      return null // Already exists
    } catch {
      // File doesn't exist, proceed with download
    }

    try {
      const res = await fetch(imageUrl, {
        headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
      })

      if (!res.ok) throw new Error(`Download failed: ${res.status}`)

      const buffer = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(filePath, buffer)

      return {
        source: 'spypoint',
        vendorCameraId: cameraId,
        vendorPhotoId: String(photoId),
        rawTimestamp: photo.date || photo.timestamp || photo.created_at || new Date().toISOString(),
        gpsLat: photo.latitude || photo.gps?.lat || null,
        gpsLng: photo.longitude || photo.gps?.lng || null,
        localFilePath: filePath,
        rawMetadata: photo,
      }
    } catch (err) {
      console.error(`[Spypoint] Download failed for photo ${photoId}:`, err.message)
      this.emit('error', { type: 'download', photoId, error: err })
      return null
    }
  }

  /**
   * Poll for new photos
   */
  async poll() {
    console.log(`[Spypoint] Polling for new photos (since: ${this.lastPollTime || 'beginning'})`)
    const photos = await this.fetchSince(this.lastPollTime)

    let ingested = 0
    for (const photo of photos) {
      const normalized = await this.downloadPhoto(photo)
      if (normalized) {
        this.emit('photo', normalized)
        ingested++
      }
    }

    this.lastPollTime = new Date().toISOString()
    console.log(`[Spypoint] Poll complete. ${ingested} new photos ingested.`)
    return ingested
  }

  /**
   * Start polling loop
   */
  async start() {
    if (this.running) return

    if (!this.apiKey) {
      console.log('[Spypoint] No API key configured — connector disabled')
      return
    }

    this.running = true
    console.log(`[Spypoint] Starting connector (poll interval: ${this.pollInterval / 1000}s)`)

    // Initial poll
    try {
      await this.poll()
    } catch (err) {
      console.error('[Spypoint] Initial poll error:', err.message)
    }

    // Schedule recurring polls
    this.timer = setInterval(async () => {
      try {
        await this.poll()
      } catch (err) {
        console.error('[Spypoint] Poll error:', err.message)
        this.emit('error', { type: 'poll', error: err })
      }
    }, this.pollInterval)
  }

  /**
   * Stop polling
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.running = false
    console.log('[Spypoint] Connector stopped')
  }
}

export default SpypointConnector
