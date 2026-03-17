import { Router } from 'express'
import { prisma } from '../index.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()

// POST save API key (writes to .env file)
router.post('/api-key', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(400).json({ error: 'apiKey required' })

    const envPath = path.join(__dirname, '..', '.env')
    let envContent = ''

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8')
    }

    // Update or add ANTHROPIC_API_KEY
    if (envContent.includes('ANTHROPIC_API_KEY=')) {
      envContent = envContent.replace(/ANTHROPIC_API_KEY=.*/, `ANTHROPIC_API_KEY=${apiKey}`)
    } else {
      envContent += `\nANTHROPIC_API_KEY=${apiKey}\n`
    }

    fs.writeFileSync(envPath, envContent)

    // Also set in current process
    process.env.ANTHROPIC_API_KEY = apiKey

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET check if API key is configured
router.get('/api-key/status', async (req, res) => {
  const configured = !!process.env.ANTHROPIC_API_KEY
  res.json({ configured })
})

// POST reset all data
router.post('/reset', async (req, res) => {
  try {
    await prisma.vectorEntry.deleteMany()
    await prisma.weeklyBriefing.deleteMany()
    await prisma.predictionReport.deleteMany()
    await prisma.standIntrusionLog.deleteMany()
    await prisma.signObservation.deleteMany()
    await prisma.sighting.deleteMany()
    await prisma.doeGroup.deleteMany()
    await prisma.trailCamPhoto.deleteMany()
    await prisma.deerSeasonSnapshot.deleteMany()
    await prisma.deer.deleteMany()
    await prisma.propertyMarker.deleteMany()
    await prisma.season.deleteMany()
    await prisma.property.deleteMany()

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST load demo data
router.post('/seed-demo', async (req, res) => {
  try {
    // Dynamically import and run seed
    const { execSync } = await import('child_process')
    execSync('node prisma/seed.js', { cwd: path.join(__dirname, '..'), timeout: 30000 })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
