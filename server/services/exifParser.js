import exifr from 'exifr'

/**
 * Extract EXIF data from a photo file
 */
export async function parseExif(filePath) {
  try {
    const exif = await exifr.parse(filePath, {
      gps: true,
      pick: [
        'DateTimeOriginal', 'CreateDate', 'ModifyDate',
        'Make', 'Model', 'ImageWidth', 'ImageHeight',
        'GPSLatitude', 'GPSLongitude',
        'ExposureTime', 'FNumber', 'ISO',
      ],
    })

    if (!exif) return { capturedAt: null, lat: null, lng: null, rawExif: {} }

    const capturedAt = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate || null

    return {
      capturedAt: capturedAt ? new Date(capturedAt) : null,
      lat: exif.latitude ?? null,
      lng: exif.longitude ?? null,
      cameraMake: exif.Make || null,
      cameraModel: exif.Model || null,
      rawExif: exif,
    }
  } catch (err) {
    console.error('EXIF parse error:', err.message)
    return { capturedAt: null, lat: null, lng: null, rawExif: {} }
  }
}

/**
 * Try to extract date from trail cam filename patterns
 * Supports: Reconyx, Browning, Stealth Cam, Moultrie, Spypoint formats
 */
export function parseDateFromFilename(filename) {
  // Reconyx: RCNX1234_2023-10-15_08-30-00.JPG
  let match = filename.match(/(\d{4})-(\d{2})-(\d{2})[_-](\d{2})-(\d{2})-(\d{2})/)
  if (match) {
    return new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6])
  }

  // Browning: BTC_2023_1015_083000.JPG
  match = filename.match(/(\d{4})[_-](\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/)
  if (match) {
    return new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6])
  }

  // Generic: IMG_20231015_083000.jpg
  match = filename.match(/(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/)
  if (match) {
    return new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6])
  }

  // Date only: 2023-10-15 or 20231015
  match = filename.match(/(\d{4})-?(\d{2})-?(\d{2})/)
  if (match) {
    return new Date(+match[1], +match[2] - 1, +match[3], 12, 0, 0)
  }

  return null
}
