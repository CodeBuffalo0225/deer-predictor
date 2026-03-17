import { Router } from 'express'
import { prisma } from '../index.js'
import { embed, sightingToText } from '../services/embeddingService.js'
import { storeEmbedding } from '../services/vectorStore.js'
import { getHistoricalWeather, getTimeOfDay } from '../services/weatherBackfill.js'
import { getMoonPhase } from '../services/moonCalc.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { propertyId, seasonId, type } = req.query
    const where = {}
    if (propertyId) where.propertyId = propertyId
    if (seasonId) where.seasonId = seasonId
    if (type) where.type = type

    const sightings = await prisma.sighting.findMany({
      where,
      include: { locationMarker: true },
      orderBy: { observedAt: 'desc' },
    })
    res.json(sightings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.deerIds && Array.isArray(data.deerIds)) data.deerIds = JSON.stringify(data.deerIds)
    if (data.photoIds && Array.isArray(data.photoIds)) data.photoIds = JSON.stringify(data.photoIds)
    if (data.observedAt) data.observedAt = new Date(data.observedAt)

    // Auto-fill weather if not provided
    if (data.observedAt && !data.temperature) {
      const property = await prisma.property.findUnique({ where: { id: data.propertyId } })
      if (property?.lat && property?.lng) {
        const weather = await getHistoricalWeather(property.lat, property.lng, data.observedAt)
        if (weather) {
          data.temperature = data.temperature ?? weather.temperature
          data.barometricPressure = data.barometricPressure ?? weather.barometricPressure
          data.pressureTrend = data.pressureTrend ?? weather.pressureTrend
          data.windDirection = data.windDirection ?? weather.windDirection
          data.windSpeed = data.windSpeed ?? weather.windSpeed
        }
      }
    }

    // Auto-fill moon phase
    if (data.observedAt && !data.moonPhase) {
      const moon = getMoonPhase(data.observedAt)
      data.moonPhase = moon.phase
      data.moonIllumination = moon.illumination
    }

    // Auto-fill time of day
    if (data.observedAt && !data.timeOfDay) {
      data.timeOfDay = getTimeOfDay(data.observedAt)
    }

    const sighting = await prisma.sighting.create({ data })

    // Generate and store embedding
    const embeddingText = sightingToText(sighting)
    const embeddingVector = await embed(embeddingText)
    await prisma.sighting.update({
      where: { id: sighting.id },
      data: { embedding: JSON.stringify(embeddingVector) },
    })
    await storeEmbedding(sighting.propertyId, 'sighting', sighting.id, embeddingVector, {
      season: sighting.season,
      deerIds: sighting.deerIds,
      observedAt: sighting.observedAt?.toISOString(),
    })

    res.status(201).json(sighting)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.deerIds && Array.isArray(data.deerIds)) data.deerIds = JSON.stringify(data.deerIds)
    if (data.photoIds && Array.isArray(data.photoIds)) data.photoIds = JSON.stringify(data.photoIds)
    const sighting = await prisma.sighting.update({ where: { id: req.params.id }, data })
    res.json(sighting)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.sighting.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
