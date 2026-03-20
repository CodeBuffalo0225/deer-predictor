import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const OUTCOMES = [
  { value: 'no_deer_seen', label: 'No Deer Seen' },
  { value: 'deer_seen_not_target', label: 'Deer Seen (Not Target)' },
  { value: 'target_seen', label: 'Target Buck Seen' },
  { value: 'target_harvested', label: 'Target Harvested' },
  { value: 'deer_spooked', label: 'Deer Spooked' },
  { value: 'unknown', label: 'Unknown' },
]

const WIND_DIRS = ['N','NE','E','SE','S','SW','W','NW']

function getStandHealth(logs) {
  if (logs.length === 0) return { score: 10, status: 'green', label: 'Ready' }
  const recent = logs.filter(l => {
    const d = new Date(l.huntedAt)
    const now = new Date()
    return (now - d) / (1000 * 60 * 60 * 24) <= 14
  })
  const bumps = recent.filter(l => l.bumped).length
  const hunts = recent.length

  if (bumps >= 2 || hunts >= 4) return { score: 2, status: 'red', label: 'Rest Needed' }
  if (bumps >= 1 || hunts >= 3) return { score: 5, status: 'yellow', label: 'Caution' }
  if (hunts >= 2) return { score: 7, status: 'yellow', label: 'Moderate' }
  return { score: 10, status: 'green', label: 'Ready' }
}

export default function StandTracker({ property }) {
  const [logs, setLogs] = useState([])
  const [markers, setMarkers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    standMarkerId: '', huntedAt: new Date().toISOString().slice(0, 16),
    windDirection: '', windSpeed: '', outcome: 'unknown', bumped: false, notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!property) return
    api.getStandLogs(property.id).then(setLogs).catch(console.error)
    api.getMarkers(property.id).then(m => setMarkers(m.filter(mk => mk.type === 'STAND' || mk.type === 'BLIND'))).catch(console.error)
  }, [property])

  const handleCreate = async () => {
    if (!form.standMarkerId) return
    setSaving(true)
    try {
      await api.createStandLog({
        propertyId: property.id,
        standMarkerId: form.standMarkerId,
        huntedAt: new Date(form.huntedAt).toISOString(),
        windDirection: form.windDirection || null,
        windSpeed: form.windSpeed || null,
        outcome: form.outcome,
        bumped: form.bumped,
        notes: form.notes,
      })
      setShowForm(false)
      const updated = await api.getStandLogs(property.id)
      setLogs(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Group logs by stand
  const standGroups = markers.reduce((acc, m) => {
    const standLogs = logs.filter(l => l.standMarkerId === m.id)
    acc[m.id] = { marker: m, logs: standLogs, health: getStandHealth(standLogs) }
    return acc
  }, {})

  if (!property) {
    return <div className="flex items-center justify-center h-96"><p className="text-gray-500">Select a property first</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Stand Tracker</h2>
        <button className="btn-primary text-sm py-2" onClick={() => setShowForm(true)}>+ Log Hunt</button>
      </div>

      {/* Stand Health Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {markers.map(m => {
          const g = standGroups[m.id] || { logs: [], health: getStandHealth([]) }
          const statusColor = g.health.status === 'red' ? 'border-red-600/50 bg-red-900/10' :
            g.health.status === 'yellow' ? 'border-yellow-600/50 bg-yellow-900/10' :
            'border-green-600/50 bg-green-900/10'
          const dotColor = g.health.status === 'red' ? 'bg-red-500' :
            g.health.status === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
          return (
            <div key={m.id} className={`card border ${statusColor}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                <span className="font-heading text-sm text-gray-200 uppercase">{m.label}</span>
              </div>
              <div className="font-mono text-xs text-gray-500">
                {g.logs.length} hunts | Score: {g.health.score}/10
              </div>
              <div className="font-mono text-xs text-gray-500">{g.health.label}</div>
            </div>
          )
        })}
        {markers.length === 0 && (
          <p className="text-gray-500 text-sm col-span-4">No stands or blinds on your map yet. Add them on the Property Map page.</p>
        )}
      </div>

      {/* Log Hunt Form */}
      {showForm && (
        <div className="card border-amber/50 space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase">Log a Hunt</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Stand *</label>
              <select className="input-field" value={form.standMarkerId}
                onChange={e => setForm(f => ({ ...f, standMarkerId: e.target.value }))}>
                <option value="">Select stand...</option>
                {markers.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date/Time</label>
              <input type="datetime-local" className="input-field" value={form.huntedAt}
                onChange={e => setForm(f => ({ ...f, huntedAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Wind Direction</label>
              <select className="input-field" value={form.windDirection}
                onChange={e => setForm(f => ({ ...f, windDirection: e.target.value }))}>
                <option value="">Select...</option>
                {WIND_DIRS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Outcome</label>
              <select className="input-field" value={form.outcome}
                onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}>
                {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-amber"
                  checked={form.bumped}
                  onChange={e => setForm(f => ({ ...f, bumped: e.target.checked }))} />
                <span className="text-sm text-gray-200">Bumped deer?</span>
              </label>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Entry/exit notes, what you saw..." />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary text-sm py-2" onClick={handleCreate} disabled={saving || !form.standMarkerId}>
              {saving ? 'Saving...' : 'Log Hunt'}
            </button>
            <button className="btn-secondary text-sm py-2" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Hunt Log */}
      <div className="card">
        <h3 className="font-heading text-lg text-amber mb-3 uppercase tracking-wider">Hunt History ({logs.length})</h3>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">No hunts logged yet. Log your sits to track stand pressure.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(l => (
              <div key={l.id} className="flex items-center gap-3 py-2 border-b border-bark/20 last:border-0">
                <span className="font-mono text-xs text-gray-500 w-28 shrink-0">
                  {new Date(l.huntedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="font-heading text-sm text-gray-200">{l.standMarker?.label || 'Unknown'}</span>
                {l.windDirection && <span className="font-mono text-xs text-gray-500">{l.windDirection}</span>}
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  l.outcome === 'target_harvested' ? 'bg-green-900/30 text-green-400' :
                  l.outcome === 'target_seen' ? 'bg-amber/20 text-amber' :
                  l.outcome === 'deer_spooked' ? 'bg-red-900/30 text-red-400' :
                  'bg-gray-700/30 text-gray-400'
                }`}>
                  {OUTCOMES.find(o => o.value === l.outcome)?.label || l.outcome}
                </span>
                {l.bumped && <span className="text-xs text-red-400 font-mono">BUMPED</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
