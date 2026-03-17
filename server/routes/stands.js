import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { propertyId, standMarkerId } = req.query
    const where = {}
    if (propertyId) where.propertyId = propertyId
    if (standMarkerId) where.standMarkerId = standMarkerId
    const logs = await prisma.standIntrusionLog.findMany({ where, include: { standMarker: true }, orderBy: { huntedAt: 'desc' } })
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.entryRoute && Array.isArray(data.entryRoute)) data.entryRoute = JSON.stringify(data.entryRoute)
    if (data.exitRoute && Array.isArray(data.exitRoute)) data.exitRoute = JSON.stringify(data.exitRoute)
    if (data.huntedAt) data.huntedAt = new Date(data.huntedAt)
    const log = await prisma.standIntrusionLog.create({ data })
    res.status(201).json(log)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.entryRoute && Array.isArray(data.entryRoute)) data.entryRoute = JSON.stringify(data.entryRoute)
    if (data.exitRoute && Array.isArray(data.exitRoute)) data.exitRoute = JSON.stringify(data.exitRoute)
    const log = await prisma.standIntrusionLog.update({ where: { id: req.params.id }, data })
    res.json(log)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.standIntrusionLog.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
