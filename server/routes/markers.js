import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

// GET markers for a property
router.get('/', async (req, res) => {
  try {
    const { propertyId, type } = req.query
    const where = {}
    if (propertyId) where.propertyId = propertyId
    if (type) where.type = type

    const markers = await prisma.propertyMarker.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    res.json(markers)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single marker
router.get('/:id', async (req, res) => {
  try {
    const marker = await prisma.propertyMarker.findUnique({
      where: { id: req.params.id },
    })
    if (!marker) return res.status(404).json({ error: 'Marker not found' })
    res.json(marker)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create marker
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.windViableDirections && Array.isArray(data.windViableDirections)) {
      data.windViableDirections = JSON.stringify(data.windViableDirections)
    }
    if (data.thermalBehavior && typeof data.thermalBehavior === 'object') {
      data.thermalBehavior = JSON.stringify(data.thermalBehavior)
    }
    if (data.entryRoutes && Array.isArray(data.entryRoutes)) {
      data.entryRoutes = JSON.stringify(data.entryRoutes)
    }
    if (data.exitRoutes && Array.isArray(data.exitRoutes)) {
      data.exitRoutes = JSON.stringify(data.exitRoutes)
    }
    const marker = await prisma.propertyMarker.create({ data })
    res.status(201).json(marker)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update marker
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.windViableDirections && Array.isArray(data.windViableDirections)) {
      data.windViableDirections = JSON.stringify(data.windViableDirections)
    }
    if (data.thermalBehavior && typeof data.thermalBehavior === 'object') {
      data.thermalBehavior = JSON.stringify(data.thermalBehavior)
    }
    if (data.entryRoutes && Array.isArray(data.entryRoutes)) {
      data.entryRoutes = JSON.stringify(data.entryRoutes)
    }
    if (data.exitRoutes && Array.isArray(data.exitRoutes)) {
      data.exitRoutes = JSON.stringify(data.exitRoutes)
    }
    const marker = await prisma.propertyMarker.update({
      where: { id: req.params.id },
      data,
    })
    res.json(marker)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE marker
router.delete('/:id', async (req, res) => {
  try {
    await prisma.propertyMarker.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
