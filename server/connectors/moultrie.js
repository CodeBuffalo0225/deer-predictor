/**
 * Moultrie Mobile Adapter
 *
 * ⚠ MOULTRIE_UNSTABLE ⚠
 * This connector uses unofficial/reverse-engineered Moultrie Mobile endpoints.
 * These endpoints are undocumented and subject to change or breakage without notice.
 * Moultrie Mobile does not provide a public API. Use at your own risk.
 * If this connector breaks, photos will automatically route to the manual import fallback.
 */
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { EventEmitter } from 'events'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Known Moultrie Mobile endpoints (unofficial, reverse-engineered)
const MOULTRIE_ENDPOINTS = {
  login: 'https://api.moultriemobile.com/v2/user/login',
  photos: 'https://api.moultriemobile.com/v2/photos',
  cameras: 'https://api.moultriemobile.com/v2/cameras',
}

class MoultrieAdapter extends EventEmitter {
  constructor(options = {}) {
    super()
    this.email = options.email || process.env.MOULTRIE_EMAIL
    this.password = options.password || process.env.MOULTRIE_PASSWORD
    this.pollInterval = options.pollInterval || parseInt(process.env.SYNC_POLL_INTERVAL_MS) || 900000
    this.uploadDir = options.uploadDir || path.join(__dirname, '..', 'data', 'trailcam')
    this.token = null
    this.timer = null
    this.running = false
    this.seenPhotoIds = new Set()
    this.lastPollTime = null

    // Circuit breaker state
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ||
      parseInt(process.env.MOULTRIE_CIRCUIT_BREAKER_THRESHOLD) || 3
    this.circuitBreakerResetMs = options.circuitBreakerResetMs ||
      parseInt(process.env.MOULTRIE_CIRCUIT_BREAKER_RESET_MS) || 1800000 // 30 min
    this.consecutiveFailures = 0
    this.circuitOpen = false
    this.circuitOpenedAt = null
    this._state = 'active' // active | tripped | fallback
  }

  /**
   * Get current connector status
   */
  status() {
    return this._state
  }

  /**
   * Check and potentially reset circuit breaker
   */
  _checkCircuitBreaker() {
    if (this.circuitOpen && this.circuitOpenedAt) {
      const elapsed = Date.now() - this.circuitOpenedAt
      if (elapsed >= this.circuitBreakerResetMs) {
        console.log('[Moultrie] Circuit breaker reset — retrying')
        this.circuitOpen = false
        this.consecutiveFailures = 0
        this._state = 'active'
        return true // Allow retry
      }
      return false // Still tripped
    }
    return true // Circuit is closed (normal)
  }

  /**
   * Record a failure and potentially trip the circuit breaker
   */
  _recordFailure(err) {
    this.consecutiveFailures++
    console.error(`[Moultrie] Failure ${this.consecutiveFailures}/${this.circuitBreakerThreshold}: ${err.message}`)

    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      this.circuitOpen = true
      this.circuitOpenedAt = Date.now()
      this._state = 'tripped'
      console.warn('[Moultrie] Circuit breaker OPEN — routing to manual import fallback')
      this.emit('moultrie:unavailable', {
        reason: 'circuit_breaker_tripped',
        failures: this.consecutiveFailures,
        resetAt: new Date(this.circuitOpenedAt + this.circuitBreakerResetMs).toISOString(),
      })
    }
  }

  /**
   * Record a success and reset failure count
   */
  _recordSuccess() {
    this.consecutiveFailures = 0
    if (this._state !== 'active') {
      this._state = 'active'
      console.log('[Moultrie] Connection restored — circuit breaker reset')
    }
  }

  /**
   * Authenticate with Moultrie Mobile
   */
  async authenticate() {
    if (!this.email || !this.password) {
      throw new Error('MOULTRIE_EMAIL and MOULTRIE_PASSWORD not configured')
    }

    try {
      const res = await fetch(MOULTRIE_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password }),
      })

      if (!res.ok) {
        throw new Error(`Moultrie auth failed: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      this.token = data.token || data.access_token
      this._recordSuccess()
      console.log('[Moultrie] Authenticated successfully')
      return true
    } catch (err) {
      this._recordFailure(err)
      return false
    }
  }

  /**
   * Fetch photos since a given timestamp
   */
  async fetchSince(since) {
    if (!this._checkCircuitBreaker()) {
      this._state = 'fallback'
      return []
    }

    if (!this.token) {
      const authed = await this.authenticate()
      if (!authed) return []
    }

    try {
      const params = new URLSearchParams()
      if (since) params.set('since', new Date(since).toISOString())

      const res = await fetch(`${MOULTRIE_ENDPOINTS.photos}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      })

      if (res.status === 401 || res.status === 403) {
        this.token = null
        this._recordFailure(new Error(`Auth rejected: ${res.status}`))
        return []
      }

      if (res.status >= 500) {
        this._recordFailure(new Error(`Server error: ${res.status}`))
        return []
      }

      if (!res.ok) {
        throw new Error(`Moultrie fetch failed: ${res.status}`)
      }

      const data = await res.json()
      this._recordSuccess()
      const photos = data.photos || data.results || data || []
      return Array.isArray(photos) ? photos : []
    } catch (err) {
      this._recordFailure(err)
      return []
    }
  }

  /**
   * Download a photo binary and store locally
   */
  async downloadPhoto(photo) {
    const cameraId = photo.camera_id || photo.cameraId || 'unknown'
    const photoId = photo.id || photo.photo_id
    const imageUrl = photo.url || photo.image_url

    if (!imageUrl || !photoId) return null

    if (this.seenPhotoIds.has(photoId)) return null
    this.seenPhotoIds.add(photoId)

    const cameraDir = path.join(this.uploadDir, cameraId)
    await fs.mkdir(cameraDir, { recursive: true })

    const ext = '.jpg'
    const filePath = path.join(cameraDir, `${photoId}${ext}`)

    try {
      await fs.access(filePath)
      return null
    } catch {
      // File doesn't exist, proceed
    }

    try {
      const res = await fetch(imageUrl, {
        headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
      })

      if (!res.ok) throw new Error(`Download failed: ${res.status}`)

      const buffer = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(filePath, buffer)

      return {
        source: 'moultrie',
        vendorCameraId: cameraId,
        vendorPhotoId: String(photoId),
        rawTimestamp: photo.date || photo.timestamp || new Date().toISOString(),
        gpsLat: photo.latitude || photo.gps?.lat || null,
        gpsLng: photo.longitude || photo.gps?.lng || null,
        localFilePath: filePath,
        rawMetadata: photo,
      }
    } catch (err) {
      console.error(`[Moultrie] Download failed for photo ${photoId}:`, err.message)
      this.emit('error', { type: 'download', photoId, error: err })
      return null
    }
  }

  /**
   * Poll for new photos
   */
  async poll() {
    if (!this._checkCircuitBreaker()) {
      console.log('[Moultrie] Circuit breaker open — skipping poll')
      return 0
    }

    console.log(`[Moultrie] Polling for new photos (since: ${this.lastPollTime || 'beginning'})`)
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
    console.log(`[Moultrie] Poll complete. ${ingested} new photos ingested.`)
    return ingested
  }

  /**
   * Start polling loop
   */
  async start() {
    if (this.running) return

    if (!this.email || !this.password) {
      console.log('[Moultrie] No credentials configured — adapter disabled')
      return
    }

    this.running = true
    console.log(`[Moultrie] Starting adapter (poll interval: ${this.pollInterval / 1000}s)`)

    try {
      await this.poll()
    } catch (err) {
      console.error('[Moultrie] Initial poll error:', err.message)
    }

    this.timer = setInterval(async () => {
      try {
        await this.poll()
      } catch (err) {
        console.error('[Moultrie] Poll error:', err.message)
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
    this._state = 'active'
    console.log('[Moultrie] Adapter stopped')
  }
}

export default MoultrieAdapter
