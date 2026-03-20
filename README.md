# Deer Predictor

AI-powered hunting intelligence for serious whitetail hunters. Import your trail cam photos,
log sightings, map your property, and get precise AI-generated predictions on where your
target buck will be — down to the stand, wind direction, and time window.

## Features

- **Multi-season trail cam RAG** — compare deer and property health year over year
- **Individual deer dossiers** with antler progression tracking
- **Barometric pressure engine** with cold front movement alerts
- **HITL report builder** — you control every prediction input
- **Stand intrusion tracker** — know when a stand is burned
- **Sign network** — dynamic scrape/rub layer with freshness tracking
- **Doe group intelligence** — track doe families for rut predictions
- **Ghost Buck mode** for nocturnal deer
- **Weekly auto-intelligence briefings**
- **Offline-first** — works in the field without internet
- **Fully local** — your data never leaves your machine

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/deer-predictor.git
cd deer-predictor
chmod +x scripts/setup.sh
./scripts/setup.sh
npm run dev
```

Open http://localhost:5173 — the setup wizard handles the rest.

## Requirements

- Node.js 18+
- Anthropic API key (optional) — get one at [console.anthropic.com](https://console.anthropic.com)
  - Estimated cost: ~$14 per hunting season
  - Without it, everything works except AI photo analysis and prediction reports
- 500MB+ disk space for photo storage

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, TailwindCSS |
| Backend | Node.js + Express |
| Database | SQLite via Prisma ORM |
| AI | Anthropic Claude (Opus 4.6 + Sonnet 4.6) |
| Maps | Leaflet.js with custom marker overlays |
| Weather | Open-Meteo (free, no API key) |
| Images | Sharp for thumbnails, exifr for EXIF |
| Vector Store | Local 384-dim embeddings with cosine similarity |

## Customization

All preferences live in `server/data/settings.json`. Edit via the Settings UI or directly.
See [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for the full reference.

Key customization areas:
- **Rut dates** — override regional defaults with your own observations
- **Food source calendar** — monthly food availability injected into AI predictions
- **Marker styling** — custom colors, sizes, visibility per marker type
- **Scoring system** — Boone & Crockett, Pope & Young, custom, or off
- **Report branding** — accent color, header/footer text, logo
- **AI model selection** — Opus (premium) or Sonnet (faster/cheaper)

## Trail Cam Support

Auto-parses filename patterns from: Reconyx, Browning, Stealth Cam, Moultrie, Spypoint.
See [docs/TRAIL_CAM_FORMATS.md](docs/TRAIL_CAM_FORMATS.md) for details.

## Project Structure

```
deer-predictor/
├── client/           # React + Vite frontend
│   └── src/
│       ├── pages/    # Dashboard, Map, TrailCams, Deer, Sightings, Sign, Stands, etc.
│       └── lib/      # API client, utilities
├── server/           # Express backend
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic (Claude, weather, embeddings, etc.)
│   └── prisma/       # Schema + seed data
├── scripts/          # Setup and utility scripts
└── docs/             # Documentation
```

## How the AI Works

**Two-tier model routing:**
- **Claude Opus 4.6** — premium reports, deep multi-season analysis, prediction calibration
- **Claude Sonnet 4.6** — high-volume: photo analysis, HITL matching, weekly briefings

**RAG prediction engine:**
1. Builds a condition fingerprint (rut phase, pressure, temp, moon, wind)
2. Retrieves top-15 similar historical sightings via cosine similarity
3. Claude generates narrative + structured JSON prediction zones
4. Structured output renders directly onto the property map

The system gets smarter the more data you feed it — without token costs blowing up.

## License

MIT
