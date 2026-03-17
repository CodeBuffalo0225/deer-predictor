import { Router } from 'express'
import { prisma } from '../index.js'
import { embed, signToText } from '../services/embeddingService.js'
import { storeEmbedding } from '../services/vectorStore.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { propertyId, type, status, season } = req.query
    const where = {}
    if (propertyId) where.propertyId = propertyId
    if (type) where.type = type
    if (status) where.status = status
    if (season) where.season = parseInt(season)
    const signs = await prisma.signObservation.findMany({ where, include: { marker: true }, orderBy: { observedAt: 'desc' } })
    res.json(signs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.associatedDeerIds && Array.isArray(data.associatedDeerIds)) {
      data.associatedDeerIds = JSON.stringify(data.associatedDeerIds)
    }
    if (data.observedAt) data.observedAt = new Date(data.observedAt)
    const sign = await prisma.signObservation.create({ data })

    const embeddingText = signToText(sign)
    const vec = await embed(embeddingText)
    await prisma.signObservation.update({ where: { id: sign.id }, data: { embedding: JSON.stringify(vec) } })
    await storeEmbedding(sign.propertyId, 'sign', sign.id, vec, { season: sign.season, type: sign.type })

    res.status(201).json(sign)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.associatedDeerIds && Array.isArray(data.associatedDeerIds)) {
      data.associatedDeerIds = JSON.stringify(data.associatedDeerIds)
    }
    const sign = await prisma.signObservation.update({ where: { id: req.params.id }, data })
    res.json(sign)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.signObservation.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
