import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { propertyId } = req.query
    const where = propertyId ? { propertyId } : {}
    const reports = await prisma.predictionReport.findMany({ where, orderBy: { generatedAt: 'desc' } })
    res.json(reports)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const report = await prisma.predictionReport.findUnique({ where: { id: req.params.id } })
    if (!report) return res.status(404).json({ error: 'Report not found' })
    res.json(report)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.deerIds && Array.isArray(data.deerIds)) data.deerIds = JSON.stringify(data.deerIds)
    if (data.ragSightingsUsed && Array.isArray(data.ragSightingsUsed)) data.ragSightingsUsed = JSON.stringify(data.ragSightingsUsed)
    if (data.structuredOutput && typeof data.structuredOutput === 'object') data.structuredOutput = JSON.stringify(data.structuredOutput)
    if (data.hitlConditions && typeof data.hitlConditions === 'object') data.hitlConditions = JSON.stringify(data.hitlConditions)
    const report = await prisma.predictionReport.create({ data })
    res.status(201).json(report)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const report = await prisma.predictionReport.update({ where: { id: req.params.id }, data: req.body })
    res.json(report)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
