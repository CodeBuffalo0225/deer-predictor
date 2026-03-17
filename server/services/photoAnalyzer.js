import { prisma } from '../index.js'
import { claudeVision } from './claudeClient.js'
import { imageToBase64 } from './imageProcessor.js'
import { embed, photoAnalysisToText } from './embeddingService.js'
import { storeEmbedding } from './vectorStore.js'
import { getHistoricalWeather, getTimeOfDay } from './weatherBackfill.js'
import { getMoonPhase } from './moonCalc.js'

const PHOTO_ANALYSIS_PROMPT = `Analyze this trail camera photo. Return ONLY a valid JSON object with no other text:
{
  "deerPresent": boolean,
  "deerCount": int,
  "individuals": [{
    "sex": "buck|doe|fawn|unknown",
    "antlerPoints": int or null,
    "ageClass": "fawn|yearling|2.5|3.5|4.5+",
    "bodyCondition": "poor|fair|good|excellent",
    "estimatedWeight": "string",
    "distinguishingFeatures": "string",
    "behavior": "feeding|traveling|bedded|chasing|tending|scraping|rubbing|alert|sparring|unknown",
    "travelDirection": "N|NE|E|SE|S|SW|W|NW|unknown",
    "bodyLanguage": "relaxed|alert|aggressive|submissive|breeding",
    "antlerDescription": "string"
  }],
  "timeOfDayCues": "string",
  "vegetationState": "green|early_color|peak_color|post_drop|bare|snow",
  "weatherCues": "string",
  "otherWildlife": "string"
}`

/**
 * Analyze a single photo with Claude Vision
 */
export async function analyzePhoto(photoId) {
  const photo = await prisma.trailCamPhoto.findUnique({
    where: { id: photoId },
    include: { property: true },
  })

  if (!photo) throw new Error(`Photo ${photoId} not found`)

  // Mark as processing
  await prisma.trailCamPhoto.update({
    where: { id: photoId },
    data: { analysisStatus: 'processing' },
  })

  try {
    // Convert to base64
    const base64 = await imageToBase64(photo.filePath)

    // Run Claude Vision
    const rawResult = await claudeVision(base64, PHOTO_ANALYSIS_PROMPT)

    // Parse JSON from response
    let analysis
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = rawResult.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { deerPresent: false, deerCount: 0, individuals: [] }
    } catch {
      console.error('Failed to parse photo analysis JSON:', rawResult)
      analysis = { deerPresent: false, deerCount: 0, individuals: [] }
    }

    // Weather backfill if we have location and time
    let weatherData = {}
    if (photo.capturedAt && photo.property?.lat && photo.property?.lng) {
      const weather = await getHistoricalWeather(
        photo.property.lat,
        photo.property.lng,
        new Date(photo.capturedAt)
      )
      if (weather) {
        weatherData = weather
      }
    }

    // Moon phase
    let moonData = {}
    if (photo.capturedAt) {
      moonData = getMoonPhase(new Date(photo.capturedAt))
    }

    // Time of day
    const timeOfDay = photo.capturedAt ? getTimeOfDay(new Date(photo.capturedAt)) : null

    // Update photo record
    const updatedPhoto = await prisma.trailCamPhoto.update({
      where: { id: photoId },
      data: {
        deerAnalysis: JSON.stringify(analysis),
        detectedDeer: analysis.deerPresent || false,
        deerCount: analysis.deerCount || 0,
        temperature: weatherData.temperature ?? photo.temperature,
        barometricPressure: weatherData.barometricPressure ?? photo.barometricPressure,
        pressureTrend: weatherData.pressureTrend ?? photo.pressureTrend,
        moonPhase: moonData.phase ?? photo.moonPhase,
        moonIllumination: moonData.illumination ?? photo.moonIllumination,
        timeOfDay: timeOfDay ?? photo.timeOfDay,
        analysisStatus: 'complete',
      },
    })

    // Generate and store embedding
    const embeddingText = photoAnalysisToText(updatedPhoto)
    const embeddingVector = await embed(embeddingText)

    await prisma.trailCamPhoto.update({
      where: { id: photoId },
      data: { embedding: JSON.stringify(embeddingVector) },
    })

    await storeEmbedding(photo.propertyId, 'photo', photoId, embeddingVector, {
      season: photo.season,
      cameraMarkerId: photo.cameraMarkerId,
      deerCount: analysis.deerCount,
      capturedAt: photo.capturedAt?.toISOString(),
    })

    return updatedPhoto
  } catch (err) {
    console.error(`Photo analysis failed for ${photoId}:`, err.message)
    await prisma.trailCamPhoto.update({
      where: { id: photoId },
      data: { analysisStatus: 'failed' },
    })
    throw err
  }
}

/**
 * Process a batch of photos (queue-style)
 */
export async function processPhotoBatch(photoIds, onProgress) {
  const results = { processed: 0, failed: 0, total: photoIds.length }

  for (const photoId of photoIds) {
    try {
      await analyzePhoto(photoId)
      results.processed++
    } catch {
      results.failed++
    }
    onProgress?.(results)
  }

  return results
}

/**
 * Get pending photos for analysis
 */
export async function getPendingPhotos(propertyId, limit = 50) {
  return prisma.trailCamPhoto.findMany({
    where: {
      propertyId,
      analysisStatus: 'pending',
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  })
}
