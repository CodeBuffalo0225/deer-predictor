import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { propertyId } = req.query
    const where = propertyId ? { propertyId } : {}
    const groups = await prisma.doeGroup.findMany({ where, orderBy: { name: 'asc' } })
    res.json(groups)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.matriarchDeerIds && Array.isArray(data.matriarchDeerIds)) {
      data.matriarchDeerIds = JSON.stringify(data.matriarchDeerIds)
    }
    const group = await prisma.doeGroup.create({ data })
    res.status(201).json(group)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.matriarchDeerIds && Array.isArray(data.matriarchDeerIds)) {
      data.matriarchDeerIds = JSON.stringify(data.matriarchDeerIds)
    }
    const group = await prisma.doeGroup.update({ where: { id: req.params.id }, data })
    res.json(group)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.doeGroup.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
