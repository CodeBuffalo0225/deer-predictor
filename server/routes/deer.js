import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { propertyId, sex, status } = req.query
    const where = {}
    if (propertyId) where.propertyId = propertyId
    if (sex) where.sex = sex
    if (status) where.status = status

    const deer = await prisma.deer.findMany({
      where,
      include: { snapshots: { orderBy: { season: 'desc' } } },
      orderBy: { name: 'asc' },
    })
    res.json(deer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const deer = await prisma.deer.findUnique({
      where: { id: req.params.id },
      include: { snapshots: { orderBy: { season: 'desc' } } },
    })
    if (!deer) return res.status(404).json({ error: 'Deer not found' })
    res.json(deer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const deer = await prisma.deer.create({ data: req.body })
    res.status(201).json(deer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const deer = await prisma.deer.update({ where: { id: req.params.id }, data: req.body })
    res.json(deer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.deer.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
