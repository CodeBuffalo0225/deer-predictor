/**
 * Camera Mapping API
 * CRUD for vendor camera → stand ID mappings
 */
import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

// GET /api/cameras/mappings — list all cam→stand mappings
router.get('/', async (req, res) => {
  try {
    const mappings = await prisma.cameraStandMap.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(mappings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/cameras/mappings/all — include inactive
router.get('/all', async (req, res) => {
  try {
    const mappings = await prisma.cameraStandMap.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json(mappings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/cameras/mappings — create mapping
router.post('/', async (req, res) => {
  try {
    const { vendorCameraId, source, standId, label } = req.body

    if (!vendorCameraId || !source || !standId) {
      return res.status(400).json({ error: 'vendorCameraId, source, and standId are required' })
    }

    const mapping = await prisma.cameraStandMap.create({
      data: { vendorCameraId, source, standId, label },
    })

    res.status(201).json(mapping)
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A mapping for this vendorCameraId already exists' })
    }
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/cameras/mappings/:id — update mapping
router.put('/:id', async (req, res) => {
  try {
    const { standId, label, source, active } = req.body

    const data = {}
    if (standId !== undefined) data.standId = standId
    if (label !== undefined) data.label = label
    if (source !== undefined) data.source = source
    if (active !== undefined) data.active = active

    const mapping = await prisma.cameraStandMap.update({
      where: { id: req.params.id },
      data,
    })

    res.json(mapping)
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Mapping not found' })
    }
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/cameras/mappings/:id — soft delete (set active: false)
router.delete('/:id', async (req, res) => {
  try {
    const mapping = await prisma.cameraStandMap.update({
      where: { id: req.params.id },
      data: { active: false },
    })

    res.json({ success: true, mapping })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Mapping not found' })
    }
    res.status(500).json({ error: err.message })
  }
})

export default router
