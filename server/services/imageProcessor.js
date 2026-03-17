import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const THUMB_WIDTH = 400
const THUMB_HEIGHT = 300

/**
 * Generate a thumbnail for a photo
 */
export async function generateThumbnail(inputPath, outputDir) {
  const ext = path.extname(inputPath)
  const basename = path.basename(inputPath, ext)
  const thumbFilename = `${basename}_thumb.jpg`
  const thumbPath = path.join(outputDir, thumbFilename)

  fs.mkdirSync(outputDir, { recursive: true })

  await sharp(inputPath)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(thumbPath)

  return thumbPath
}

/**
 * Convert an image file to base64 for Claude Vision
 */
export async function imageToBase64(filePath) {
  const buffer = await sharp(filePath)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  return buffer.toString('base64')
}

/**
 * Get image metadata (dimensions, format)
 */
export async function getImageMetadata(filePath) {
  try {
    const metadata = await sharp(filePath).metadata()
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    }
  } catch {
    return null
  }
}
