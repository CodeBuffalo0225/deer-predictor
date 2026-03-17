import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const BEHAVIORS = ['feeding', 'traveling', 'bedded', 'chasing', 'tending', 'scraping', 'rubbing', 'alert', 'sparring', 'unknown']
const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'unknown']
const RUT_PHASES = ['pre_rut', 'seeking', 'chasing', 'peak_rut', 'lockdown', 'post_rut', 'recovery']
const PRESSURE_LEVELS = ['none', 'low', 'moderate', 'high']

export default function SightingLog({ property }) {
  const [sightings, setSightings] = useState([])
  const [markers, setMarkers] = useState([])
  const [deer, setDeer] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'in_person', observedAt: new Date().toISOString().slice(0, 16),
    deerIds: [], locationMarkerId: '', behavior: 'unknown', travelDirection: 'unknown',
    windDirection: '', rutPhase: '', huntingPressure: 'none', notes: '',
  })

  useEffect(() => {
    if (!property) return
    Promise.all([
      api.getSightings(property.id),
      api.getMarkers(property.id),
      api.getDeer(property.id),
    ]).then(([s, m, d]) => {
      setSightings(s)
      setMarkers(m)
      setDeer(d)
    }).catch(console.error)
  }, [property])

  const handleSubmit = async () => {
    try {
      const data = {
        ...form,
        propertyId: property.id,
        observedAt: new Date(form.observedAt).toISOString(),
        deerIds: form.deerIds,
        season: new Date(form.observedAt).getFullYear(),
      }
      const sighting = await api.createSighting(data)
      setSightings(prev => [sighting, ...prev])
      setShowForm(false)
      setForm({
        type: 'in_person', observedAt: new Date().toISOString().slice(0, 16),
        deerIds: [], locationMarkerId: '', behavior: 'unknown', travelDirection: 'unknown',
        windDirection: '', rutPhase: '', huntingPressure: 'none', notes: '',
      })
    } catch (err) {
      console.error('Failed to create sighting:', err)
    }
  }

  if (!property) return <div className="text-gray-500 text-center py-20">Select a property</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Sighting Log</h2>
        <button className="btn-primary text-sm py-2" onClick={() => setShowForm(!showForm)}>
          + Log Sighting
        </button>
      </div>

      {/* Quick Entry Form */}
      {showForm && (
        <div className="card border-amber/50">
          <h3 className="font-heading text-lg text-amber mb-3">NEW SIGHTING</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="in_person">In Person</option>
                <option value="trail_cam">Trail Cam</option>
                <option value="sign_only">Sign Only</option>
              </select>
            </div>
            <div>
              <label className="label">Date/Time</label>
              <input type="datetime-local" className="input-field" value={form.observedAt} onChange={e => setForm(f => ({ ...f, observedAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Location</label>
              <select className="input-field" value={form.locationMarkerId} onChange={e => setForm(f => ({ ...f, locationMarkerId: e.target.value }))}>
                <option value="">Select...</option>
                {markers.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Deer</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {deer.map(d => (
                  <button
                    key={d.id}
                    className={`px-2 py-1 rounded text-xs font-mono border ${
                      form.deerIds.includes(d.id)
                        ? 'bg-amber/20 border-amber text-amber'
                        : 'border-bark/50 text-gray-500'
                    }`}
                    onClick={() => setForm(f => ({
                      ...f,
                      deerIds: f.deerIds.includes(d.id) ? f.deerIds.filter(x => x !== d.id) : [...f.deerIds, d.id],
                    }))}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Behavior</label>
              <select className="input-field" value={form.behavior} onChange={e => setForm(f => ({ ...f, behavior: e.target.value }))}>
                {BEHAVIORS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Travel Direction</label>
              <select className="input-field" value={form.travelDirection} onChange={e => setForm(f => ({ ...f, travelDirection: e.target.value }))}>
                {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Wind Direction</label>
              <select className="input-field" value={form.windDirection} onChange={e => setForm(f => ({ ...f, windDirection: e.target.value }))}>
                <option value="">Auto-detect</option>
                {DIRECTIONS.filter(d => d !== 'unknown').map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rut Phase</label>
              <select className="input-field" value={form.rutPhase} onChange={e => setForm(f => ({ ...f, rutPhase: e.target.value }))}>
                <option value="">Select...</option>
                {RUT_PHASES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Hunting Pressure</label>
              <select className="input-field" value={form.huntingPressure} onChange={e => setForm(f => ({ ...f, huntingPressure: e.target.value }))}>
                {PRESSURE_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What did you see?" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary text-sm py-2" onClick={handleSubmit}>Save Sighting</button>
            <button className="btn-secondary text-sm py-2" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
          <p className="text-gray-600 text-xs mt-2">Weather, moon phase, and barometric pressure auto-filled from Open-Meteo</p>
        </div>
      )}

      {/* Sighting List */}
      <div className="space-y-2">
        {sightings.map(s => {
          let deerNames = ''
          try {
            const ids = JSON.parse(s.deerIds || '[]')
            deerNames = ids.map(id => deer.find(d => d.id === id)?.name || id).join(', ')
          } catch {}

          return (
            <div key={s.id} className="card flex items-center gap-4 py-3">
              <div className="w-32 shrink-0">
                <div className="font-mono text-xs text-gray-400">
                  {new Date(s.observedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="font-mono text-xs text-gray-500">
                  {new Date(s.observedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>

              <span className={`text-xs px-2 py-0.5 rounded uppercase font-mono shrink-0 ${
                s.type === 'trail_cam' ? 'bg-blue-900/30 text-blue-400' :
                s.type === 'in_person' ? 'bg-green-900/30 text-green-400' :
                'bg-yellow-900/30 text-yellow-400'
              }`}>
                {s.type.replace('_', ' ')}
              </span>

              <div className="flex-1 min-w-0">
                {deerNames && <span className="text-amber font-mono text-sm">{deerNames}</span>}
                <span className="text-gray-400 text-sm ml-2">{s.behavior}</span>
                {s.travelDirection && s.travelDirection !== 'unknown' && (
                  <span className="text-gray-500 text-xs ml-2">heading {s.travelDirection}</span>
                )}
                {s.notes && <p className="text-gray-500 text-xs mt-0.5 truncate">{s.notes}</p>}
              </div>

              <div className="text-right shrink-0 font-mono text-xs">
                {s.locationMarker && <div className="text-gray-500">{s.locationMarker.label}</div>}
                {s.barometricPressure && (
                  <div className="text-gray-600">
                    {s.barometricPressure}" {s.pressureTrend === 'falling' ? '\u2193' : s.pressureTrend === 'rising' ? '\u2191' : '\u2192'}
                  </div>
                )}
                {s.rutPhase && (
                  <div className="text-gray-600">{s.rutPhase.replace(/_/g, ' ')}</div>
                )}
              </div>
            </div>
          )
        })}

        {sightings.length === 0 && (
          <div className="text-gray-500 text-center py-10 font-mono">No sightings recorded yet</div>
        )}
      </div>
    </div>
  )
}
