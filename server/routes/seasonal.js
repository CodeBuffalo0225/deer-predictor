import { Router } from 'express'
import { prisma } from '../index.js'
import { semanticSearch } from '../services/vectorStore.js'

const router = Router()

// Semantic search across all data
router.post('/search', async (req, res) => {
  try {
    const { query, propertyId, topK = 20 } = req.body
    if (!query) return res.status(400).json({ error: 'query required' })
    const results = await semanticSearch(query, propertyId, topK)
    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get seasons for a property
router.get('/seasons', async (req, res) => {
  try {
    const { propertyId } = req.query
    const where = propertyId ? { propertyId } : {}
    const seasons = await prisma.season.findMany({ where, orderBy: { year: 'desc' } })
    res.json(seasons)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
