/**
 * Universal Import Pipeline
 * Handles: folder watching, email (IMAP), manual drag-drop upload
 * All input methods funnel into the same normalizer queue
 */
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { EventEmitter } from 'events'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic'])

class UniversalImport extends EventEmitter {
  constructor(options = {}) {
    super()
    this.watchDir = options.watchDir || process.env.IMPORT_WATCH_DIR || path.join(process.env.HOME || '~', 'DeerPredictor', 'import')
    this.uploadDir = options.uploadDir || path.join(__dirname, '..', 'data', 'trailcam')
    this.imapConfig = {
      host: options.imapHost || process.env.IMAP_HOST,
      port: parseInt(options.imapPort || process.env.IMAP_PORT || '993'),
      user: options.imapUser || process.env.IMAP_USER,
      password: options.imapPassword || process.env.IMAP_PASSWORD,
      camSenders: (options.camSenders || process.env.IMAP_CAM_SENDERS || '').split(',').filter(Boolean),
    }
    this.running = false
    this.watcher = null
    this.emailTimer = null
    this.seenFiles = new Set()
  }

  /**
   * Start folder watcher using polling (no chokidar dependency needed)
   */
  async startFolderWatch() {
    // Ensure watch directory exists
    try {
      await fs.mkdir(this.watchDir, { recursive: true })
    } catch {
      // May already exist
    }

    console.log(`[UniversalImport] Watching folder: ${this.watchDir}`)

    // Initial scan
    await this.scanFolder()

    // Poll for new files every 30 seconds
    this.watcher = setInterval(async () => {
      try {
        await this.scanFolder()
      } catch (err) {
        console.error('[UniversalImport] Folder scan error:', err.message)
      }
    }, 30000)
  }

  /**
   * Scan the watch directory for new image files
   */
  async scanFolder() {
    try {
      const entries = await fs.readdir(this.watchDir, { withFileTypes: true, recursive: true })

      for (const entry of entries) {
        if (!entry.isFile()) continue

        const ext = path.extname(entry.name).toLowerCase()
        if (!SUPPORTED_EXTENSIONS.has(ext)) continue

        const fullPath = path.join(entry.parentPath || entry.path || this.watchDir, entry.name)

        if (this.seenFiles.has(fullPath)) continue
        this.seenFiles.add(fullPath)

        // Derive camera ID from parent folder name
        const parentDir = path.basename(path.dirname(fullPath))
        const cameraId = parentDir !== path.basename(this.watchDir) ? parentDir : 'import'

        // Copy to upload dir
        const destDir = path.join(this.uploadDir, cameraId)
        await fs.mkdir(destDir, { recursive: true })
        const destPath = path.join(destDir, entry.name)

        try {
          await fs.copyFile(fullPath, destPath)
        } catch (err) {
          console.error(`[UniversalImport] Copy failed: ${err.message}`)
          continue
        }

        // Try to parse timestamp from filename
        const timestamp = this.parseTimestampFromFilename(entry.name) || new Date().toISOString()

        const photoData = {
          source: 'universal',
          vendorCameraId: cameraId,
          vendorPhotoId: `import_${Date.now()}_${entry.name}`,
          rawTimestamp: timestamp,
          gpsLat: null,
          gpsLng: null,
          localFilePath: destPath,
          rawMetadata: {
            originalPath: fullPath,
            importMethod: 'folder_watch',
          },
        }

        this.emit('photo', photoData)
        console.log(`[UniversalImport] New photo from folder: ${entry.name}`)
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('[UniversalImport] Scan error:', err.message)
      }
    }
  }

  /**
   * Start IMAP email watcher (if configured)
   */
  async startEmailWatch() {
    if (!this.imapConfig.host || !this.imapConfig.user || !this.imapConfig.password) {
      console.log('[UniversalImport] IMAP not configured — email import disabled')
      return
    }

    console.log(`[UniversalImport] Email import configured for ${this.imapConfig.host}`)
    console.log('[UniversalImport] Note: IMAP import requires the "imapflow" package. Install with: npm install imapflow')

    // Check if imapflow is available
    try {
      const { ImapFlow } = await import('imapflow')
      this.emailTimer = setInterval(async () => {
        try {
          await this.checkEmail(ImapFlow)
        } catch (err) {
          console.error('[UniversalImport] Email check error:', err.message)
        }
      }, 300000) // Check every 5 minutes

      // Initial check
      await this.checkEmail(ImapFlow)
    } catch {
      console.log('[UniversalImport] imapflow not installed — email import disabled')
    }
  }

  /**
   * Check email for photo attachments
   */
  async checkEmail(ImapFlow) {
    const client = new ImapFlow({
      host: this.imapConfig.host,
      port: this.imapConfig.port,
      secure: true,
      auth: {
        user: this.imapConfig.user,
        pass: this.imapConfig.password,
      },
    })

    try {
      await client.connect()
      const lock = await client.getMailboxLock('INBOX')

      try {
        const since = new Date()
        since.setDate(since.getDate() - 1) // Last 24 hours

        for await (const message of client.fetch(
          { since, seen: false },
          { bodyStructure: true, envelope: true }
        )) {
          const from = message.envelope?.from?.[0]?.address || ''

          // Filter by known cam senders if configured
          if (this.imapConfig.camSenders.length > 0) {
            if (!this.imapConfig.camSenders.some((s) => from.includes(s))) continue
          }

          // Check for image attachments in body structure
          if (message.bodyStructure?.childNodes) {
            for (const part of message.bodyStructure.childNodes) {
              if (part.type?.startsWith('image/')) {
                const ext = part.type === 'image/png' ? '.png' : '.jpg'
                const filename = part.dispositionParameters?.filename || `email_${Date.now()}${ext}`

                const destDir = path.join(this.uploadDir, 'email')
                await fs.mkdir(destDir, { recursive: true })
                const destPath = path.join(destDir, filename)

                // Download attachment
                const { content } = await client.download(message.seq.toString(), part.part)
                const chunks = []
                for await (const chunk of content) chunks.push(chunk)
                await fs.writeFile(destPath, Buffer.concat(chunks))

                this.emit('photo', {
                  source: 'universal',
                  vendorCameraId: `email_${from}`,
                  vendorPhotoId: `email_${message.uid}_${part.part}`,
                  rawTimestamp: message.envelope?.date?.toISOString() || new Date().toISOString(),
                  gpsLat: null,
                  gpsLng: null,
                  localFilePath: destPath,
                  rawMetadata: {
                    importMethod: 'email',
                    from,
                    subject: message.envelope?.subject,
                  },
                })

                console.log(`[UniversalImport] New photo from email: ${filename}`)
              }
            }
          }
        }
      } finally {
        lock.release()
      }
      await client.logout()
    } catch (err) {
      console.error('[UniversalImport] IMAP error:', err.message)
    }
  }

  /**
   * Handle manual drag-drop upload (called from route handler)
   */
  async processUpload(cameraId, files) {
    const results = []

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue

      const destDir = path.join(this.uploadDir, cameraId || 'manual')
      await fs.mkdir(destDir, { recursive: true })
      const destPath = path.join(destDir, file.originalname)

      await fs.rename(file.path, destPath)

      const photoData = {
        source: 'universal',
        vendorCameraId: cameraId || 'manual',
        vendorPhotoId: `upload_${Date.now()}_${file.originalname}`,
        rawTimestamp: new Date().toISOString(),
        gpsLat: null,
        gpsLng: null,
        localFilePath: destPath,
        rawMetadata: {
          importMethod: 'manual_upload',
          originalName: file.originalname,
          size: file.size,
        },
      }

      this.emit('photo', photoData)
      results.push(photoData)
      console.log(`[UniversalImport] Manual upload: ${file.originalname}`)
    }

    return results
  }

  /**
   * Parse timestamp from common trail cam filename patterns
   */
  parseTimestampFromFilename(filename) {
    // Reconyx: RCNX0001_20231015_063045.jpg
    const reconyx = filename.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/)
    if (reconyx) {
      return new Date(`${reconyx[1]}-${reconyx[2]}-${reconyx[3]}T${reconyx[4]}:${reconyx[5]}:${reconyx[6]}`).toISOString()
    }

    // Browning: BTC_0001_20231015_0630.jpg
    const browning = filename.match(/(\d{4})(\d{2})(\d{2})_(\d{4})/)
    if (browning) {
      const hour = browning[4].substring(0, 2)
      const min = browning[4].substring(2, 4)
      return new Date(`${browning[1]}-${browning[2]}-${browning[3]}T${hour}:${min}:00`).toISOString()
    }

    // ISO-ish: 2023-10-15T06-30-45
    const iso = filename.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/)
    if (iso) {
      return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}:${iso[5]}:${iso[6]}`).toISOString()
    }

    return null
  }

  /**
   * Start all import methods
   */
  async start() {
    if (this.running) return
    this.running = true
    console.log('[UniversalImport] Starting universal import pipeline')

    await this.startFolderWatch()
    await this.startEmailWatch()
  }

  /**
   * Stop all import methods
   */
  stop() {
    if (this.watcher) {
      clearInterval(this.watcher)
      this.watcher = null
    }
    if (this.emailTimer) {
      clearInterval(this.emailTimer)
      this.emailTimer = null
    }
    this.running = false
    console.log('[UniversalImport] Import pipeline stopped')
  }
}

export default UniversalImport
