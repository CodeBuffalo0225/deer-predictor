import { useState } from 'react'
import { api } from '../lib/api'

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', acreage: '', state: '', county: '', lat: '', lng: '',
  })
  const [apiKey, setApiKey] = useState('')
  const [firstSeason, setFirstSeason] = useState(new Date().getFullYear())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [loadDemo, setLoadDemo] = useState(false)

  const handleLoadDemo = async () => {
    setLoadDemo(true)
    try {
      // Run seed via API
      const res = await fetch('/api/settings/seed-demo', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        onComplete?.()
      } else {
        setError(data.error || 'Failed to load demo')
        setLoadDemo(false)
      }
    } catch (err) {
      setError(err.message)
      setLoadDemo(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name) { setError('Property name is required'); return }
    setSaving(true)
    setError(null)

    try {
      // Save API key if provided
      if (apiKey) {
        await fetch('/api/settings/api-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey }),
        })
        localStorage.setItem('dp_api_key_configured', 'true')
      }

      // Create property
      const propData = {
        name: form.name,
        acreage: form.acreage ? parseFloat(form.acreage) : null,
        state: form.state || null,
        county: form.county || null,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
      }
      const property = await api.createProperty(propData)

      // Create first season
      await api.createSeason(property.id, {
        year: parseInt(firstSeason),
        label: `${firstSeason} Season`,
      })

      onComplete?.()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl text-amber uppercase tracking-[0.3em] mb-2">
            Deer Predictor
          </h1>
          <p className="text-gray-500 font-mono text-sm">
            Multi-Season Whitetail Intelligence Platform
          </p>
        </div>

        {step === 0 && (
          <div className="card border-bark/50 space-y-6">
            <div className="text-center">
              <h2 className="font-heading text-xl text-amber uppercase tracking-wider mb-2">Welcome</h2>
              <p className="text-gray-400 text-sm">
                Track deer patterns, analyze trail cam photos with AI, build multi-season profiles,
                and generate data-driven hunting predictions.
              </p>
            </div>

            <div className="space-y-3">
              <button
                className="btn-primary w-full text-lg py-4"
                onClick={() => setStep(1)}
              >
                Set Up My Property
              </button>

              <button
                className="btn-secondary w-full py-3"
                onClick={handleLoadDemo}
                disabled={loadDemo}
              >
                {loadDemo ? 'Loading Demo...' : 'Load Demo Data (Hollow Creek Farm)'}
              </button>
              <p className="text-gray-600 text-xs text-center">
                Demo includes 3 seasons, 4 deer profiles, 60 sightings, and 14 map markers.
                You can clear it later in Settings.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="card border-bark/50 space-y-4">
            <h2 className="font-heading text-xl text-amber uppercase tracking-wider">Your Property</h2>

            <div>
              <label className="label">Property Name *</label>
              <input
                className="input-field text-lg"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Grandpa's 80, Lease #3, Home Farm"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Acreage</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.acreage}
                  onChange={e => setForm(f => ({ ...f, acreage: e.target.value }))}
                  placeholder="160"
                />
              </div>
              <div>
                <label className="label">State</label>
                <select className="input-field" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                  <option value="">Select...</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">County</label>
                <input
                  className="input-field"
                  value={form.county}
                  onChange={e => setForm(f => ({ ...f, county: e.target.value }))}
                  placeholder="Pike County"
                />
              </div>
              <div>
                <label className="label">Current Season Year</label>
                <input
                  type="number"
                  className="input-field"
                  value={firstSeason}
                  onChange={e => setFirstSeason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary flex-1 py-2" onClick={() => setStep(0)}>Back</button>
              <button
                className="btn-primary flex-1 py-2"
                onClick={() => setStep(2)}
                disabled={!form.name}
              >
                Next: Location
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card border-bark/50 space-y-4">
            <h2 className="font-heading text-xl text-amber uppercase tracking-wider">GPS Location</h2>
            <p className="text-gray-500 text-sm">
              GPS coordinates power automatic weather backfill for every sighting and photo.
              Right-click on Google Maps and copy the coordinates.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={form.lat}
                  onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                  placeholder="39.03"
                />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={form.lng}
                  onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                  placeholder="-82.60"
                />
              </div>
            </div>

            <p className="text-gray-600 text-xs">
              Optional but recommended. Without GPS, weather data won't auto-populate.
            </p>

            <div className="flex gap-3">
              <button className="btn-secondary flex-1 py-2" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary flex-1 py-2" onClick={() => setStep(3)}>
                Next: AI Setup
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card border-bark/50 space-y-4">
            <h2 className="font-heading text-xl text-amber uppercase tracking-wider">Claude AI (Optional)</h2>
            <p className="text-gray-500 text-sm">
              An Anthropic API key enables AI photo analysis (deer detection, age/score estimation)
              and prediction reports. Everything else works without it.
            </p>

            <div>
              <label className="label">Anthropic API Key</label>
              <input
                type="password"
                className="input-field"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-... (optional)"
              />
            </div>

            <p className="text-gray-600 text-xs">
              Get your key at console.anthropic.com. Stored locally on this machine only.
            </p>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-600/30 rounded text-red-400 text-sm font-mono">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button className="btn-secondary flex-1 py-2" onClick={() => setStep(2)}>Back</button>
              <button
                className="btn-primary flex-1 py-2"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Launch Deer Predictor'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
