import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'settings.json')

const DEFAULT_SETTINGS = {
  app: {
    name: 'Deer Predictor',
    ownerName: '',
    pin: '',
    theme: 'dark-tactical',
    units: 'imperial',
  },
  scoring: {
    system: 'boone-crockett',
    minimumToLog: 100,
    customScoreLabel: 'Gross B&C',
  },
  rut: {
    overrideRegionalDates: false,
    peakRutDate: '11-08',
    seekingStart: '10-28',
    chasingStart: '11-03',
    lockdownStart: '11-12',
    postRutStart: '11-20',
  },
  notifications: {
    frontAlerts: true,
    weeklyBriefing: true,
    briefingDay: 'monday',
    briefingTime: '06:00',
    newCamHitAlert: false,
  },
  reporting: {
    defaultPredictionDays: 7,
    defaultModel: 'opus',
    streamingEnabled: true,
    autoSaveReports: true,
    pdfLogoPath: '',
    pdfColorAccent: '#FF6B00',
    pdfShowPoweredBy: true,
    headerText: '',
    footerText: '',
  },
  map: {
    defaultZoom: 16,
    showSanctuaryZones: true,
    markerScale: 1.0,
    heatmapOpacity: 0.65,
  },
  foodSources: {
    calendar: {
      '09': { whiteOak: 'none', redOak: 'none', corn: 'standing', beans: 'standing', foodPlot: true },
      '10': { whiteOak: 'good', redOak: 'early', corn: 'standing', beans: 'standing', foodPlot: true },
      '11': { whiteOak: 'cold', redOak: 'good', corn: 'harvested', beans: 'harvested', foodPlot: true },
      '12': { whiteOak: 'none', redOak: 'cold', corn: 'harvested', beans: 'harvested', foodPlot: true },
    },
  },
  markers: {
    TRAIL_CAM:       { color: '#F59E0B', icon: 'camera',       size: 1.0, visible: true },
    STAND:           { color: '#10B981', icon: 'tree',          size: 1.0, visible: true },
    BLIND:           { color: '#059669', icon: 'eye',           size: 1.0, visible: true },
    SCRAPE:          { color: '#EF4444', icon: 'paw-print',     size: 1.0, visible: true },
    RUB:             { color: '#F97316', icon: 'lightning',      size: 1.0, visible: true },
    FOOD_PLOT:       { color: '#84CC16', icon: 'leaf',          size: 1.0, visible: true },
    WATER_SOURCE:    { color: '#38BDF8', icon: 'drop',          size: 1.0, visible: true },
    BED:             { color: '#A78BFA', icon: 'moon',          size: 1.0, visible: true },
    TRAVEL_CORRIDOR: { color: '#94A3B8', icon: 'arrow-right',   size: 1.0, visible: true },
    PINCH_POINT:     { color: '#FB923C', icon: 'funnel',        size: 1.0, visible: true },
    FENCE_CROSSING:  { color: '#D97706', icon: 'minus',         size: 1.0, visible: true },
    RIDGE:           { color: '#78716C', icon: 'mountain',       size: 1.0, visible: true },
    SADDLE:          { color: '#A8A29E', icon: 'arrow-down',     size: 1.0, visible: true },
    CREEK:           { color: '#0EA5E9', icon: 'waves',          size: 1.0, visible: true },
    MINERAL_LICK:    { color: '#FBBF24', icon: 'diamond',        size: 1.0, visible: true },
    ENTRY_ROUTE:     { color: '#22C55E', icon: 'sign-in',        size: 1.0, visible: true },
    EXIT_ROUTE:      { color: '#EF4444', icon: 'sign-out',       size: 1.0, visible: true },
    SANCTUARY:       { color: '#6B7280', icon: 'shield',         size: 1.0, visible: true },
    NEIGHBOR_BOUNDARY: { color: '#DC2626', icon: 'warning',      size: 1.0, visible: true },
    OTHER:           { color: '#9CA3AF', icon: 'map-pin',        size: 1.0, visible: true },
  },
  privacy: {
    buddySystemEnabled: false,
    sharedPropertyCode: '',
  },
  firstRunComplete: false,
}

class SettingsService {
  constructor() {
    this._settings = null
  }

  _ensureDir() {
    const dir = path.dirname(SETTINGS_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  load() {
    if (this._settings) return this._settings

    this._ensureDir()

    if (fs.existsSync(SETTINGS_PATH)) {
      try {
        const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
        const parsed = JSON.parse(raw)
        // Deep merge with defaults to fill any missing keys
        this._settings = this._deepMerge(DEFAULT_SETTINGS, parsed)
      } catch {
        this._settings = { ...DEFAULT_SETTINGS }
      }
    } else {
      this._settings = { ...DEFAULT_SETTINGS }
      this._save()
    }

    return this._settings
  }

  get(key) {
    const settings = this.load()
    if (!key) return settings
    return key.split('.').reduce((obj, k) => obj?.[k], settings)
  }

  set(key, value) {
    const settings = this.load()
    const keys = key.split('.')
    let current = settings
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
    this._settings = settings
    this._save()
    return settings
  }

  update(partial) {
    const settings = this.load()
    this._settings = this._deepMerge(settings, partial)
    this._save()
    return this._settings
  }

  getAll() {
    return this.load()
  }

  reset() {
    this._settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
    this._save()
    return this._settings
  }

  _save() {
    this._ensureDir()
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(this._settings, null, 2))
  }

  _deepMerge(target, source) {
    const result = { ...target }
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    return result
  }
}

// Singleton
const settingsService = new SettingsService()
export default settingsService
