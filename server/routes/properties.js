import { Router } from 'express'
import { prisma } from '../index.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'data', 'properties', req.params.id || 'temp')
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      cb(null, 'map' + path.extname(file.originalname))
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.tiff']
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()))
  },
  limits: { fileSize: 50 * 1024 * 1024 },
})

// GET all properties
router.get('/', async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      include: { seasons: true, _count: { select: { markers: true, deer: true, sightings: true, photos: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(properties)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single property
router.get('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        seasons: { orderBy: { year: 'desc' } },
        markers: true,
        _count: { select: { deer: true, sightings: true, photos: true } },
      },
    })
    if (!property) return res.status(404).json({ error: 'Property not found' })
    res.json(property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create property
router.post('/', async (req, res) => {
  try {
    const property = await prisma.property.create({ data: req.body })
    // Create data directory
    const dir = path.join(__dirname, '..', 'data', 'properties', property.id)
    fs.mkdirSync(dir, { recursive: true })
    res.status(201).json(property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update property
router.put('/:id', async (req, res) => {
  try {
    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST upload base map image
router.post('/:id/map', upload.single('map'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    // Move file to proper directory
    const propertyDir = path.join(__dirname, '..', 'data', 'properties', req.params.id)
    fs.mkdirSync(propertyDir, { recursive: true })
    const destPath = path.join(propertyDir, req.file.filename)

    if (req.file.path !== destPath) {
      fs.copyFileSync(req.file.path, destPath)
      fs.unlinkSync(req.file.path)
    }

    const relativePath = `data/properties/${req.params.id}/${req.file.filename}`

    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: { baseMapImage: relativePath },
    })

    res.json(property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update sanctuary zones
router.put('/:id/sanctuary-zones', async (req, res) => {
  try {
    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: { sanctuaryZones: JSON.stringify(req.body.zones) },
    })
    res.json(property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create season
router.post('/:id/seasons', async (req, res) => {
  try {
    const season = await prisma.season.create({
      data: { ...req.body, propertyId: req.params.id },
    })
    res.status(201).json(season)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE property
router.delete('/:id', async (req, res) => {
  try {
    await prisma.property.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
