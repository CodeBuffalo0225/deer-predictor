import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { propertyId } = req.query
    const where = propertyId ? { propertyId } : {}
    const briefings = await prisma.weeklyBriefing.findMany({ where, orderBy: { generatedAt: 'desc' } })
    res.json(briefings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const briefing = await prisma.weeklyBriefing.findUnique({ where: { id: req.params.id } })
    if (!briefing) return res.status(404).json({ error: 'Briefing not found' })
    res.json(briefing)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
