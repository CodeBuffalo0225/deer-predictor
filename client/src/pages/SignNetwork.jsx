import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const SIGN_TYPES = ['scrape', 'rub', 'bed', 'track', 'hair', 'blood']
const STATUS_OPTIONS = ['fresh', 'active', 'cold', 'abandoned']
const RUB_SIZES = ['wrist', 'arm', 'thigh', 'telephone_pole']
const SCRAPE_SIZES = ['small', 'medium', 'large', 'community']

const STATUS_COLORS = {
  fresh: 'bg-green-900/30 text-green-400',
  active: 'bg-amber/20 text-amber',
  cold: 'bg-gray-700/30 text-gray-400',
  abandoned: 'bg-red-900/20 text-red-400',
}

export default function SignNetwork({ property }) {
  const [signs, setSigns] = useState([])
  const [markers, setMarkers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'scrape', status: 'fresh', markerId: '', notes: '',
    rubSize: '', scrapeSize: '', observedAt: new Date().toISOString().slice(0, 16),
  })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!property) return
    api.getSign(property.id).then(setSigns).catch(console.error)
    api.getMarkers(property.id).then(setMarkers).catch(console.error)
  }, [property])

  const handleCreate = async () => {
    if (!property) return
    setSaving(true)
    try {
      await api.createSign({
        propertyId: property.id,
        type: form.type,
        status: form.status,
        markerId: form.markerId || null,
        notes: form.notes,
        rubSize: form.type === 'rub' ? form.rubSize : null,
        scrapeSize: form.type === 'scrape' ? form.scrapeSize : null,
        observedAt: form.observedAt ? new Date(form.observedAt).toISOString() : new Date().toISOString(),
      })
      setShowForm(false)
      setForm({ type: 'scrape', status: 'fresh', markerId: '', notes: '', rubSize: '', scrapeSize: '', observedAt: new Date().toISOString().slice(0, 16) })
      const updated = await api.getSign(property.id)
      setSigns(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const filtered = filter === 'all' ? signs : signs.filter(s => s.type === filter)

  // Count active signs by type
  const activeCounts = SIGN_TYPES.reduce((acc, t) => {
    acc[t] = signs.filter(s => s.type === t && (s.status === 'fresh' || s.status === 'active')).length
    return acc
  }, {})

  if (!property) {
    return <div className="flex items-center justify-center h-96"><p className="text-gray-500">Select a property first</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Sign Network</h2>
        <button className="btn-primary text-sm py-2" onClick={() => setShowForm(true)}>+ Log Sign</button>
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {SIGN_TYPES.map(t => (
          <div key={t} className="card text-center cursor-pointer hover:border-amber/50 transition-colors"
            onClick={() => setFilter(filter === t ? 'all' : t)}>
            <div className={`stat-value text-lg ${filter === t ? 'text-blaze' : ''}`}>{activeCounts[t]}</div>
            <div className="stat-label">{t}s</div>
            <div className="text-[10px] text-gray-600 font-mono">active</div>
          </div>
        ))}
      </div>

      {/* New Sign Form */}
      {showForm && (
        <div className="card border-amber/50 space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase">Log New Sign</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {SIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Location (Marker)</label>
              <select className="input-field" value={form.markerId} onChange={e => setForm(f => ({ ...f, markerId: e.target.value }))}>
                <option value="">No marker</option>
                {markers.map(m => <option key={m.id} value={m.id}>{m.label} ({m.type})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date/Time</label>
              <input type="datetime-local" className="input-field" value={form.observedAt}
                onChange={e => setForm(f => ({ ...f, observedAt: e.target.value }))} />
            </div>
            {form.type === 'rub' && (
              <div>
                <label className="label">Rub Size</label>
                <select className="input-field" value={form.rubSize} onChange={e => setForm(f => ({ ...f, rubSize: e.target.value }))}>
                  <option value="">Select...</option>
                  {RUB_SIZES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            )}
            {form.type === 'scrape' && (
              <div>
                <label className="label">Scrape Size</label>
                <select className="input-field" value={form.scrapeSize} onChange={e => setForm(f => ({ ...f, scrapeSize: e.target.value }))}>
                  <option value="">Select...</option>
                  {SCRAPE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Details about this sign..." />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary text-sm py-2" onClick={handleCreate} disabled={saving}>
              {saving ? 'Saving...' : 'Log Sign'}
            </button>
            <button className="btn-secondary text-sm py-2" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Sign List */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg text-amber uppercase tracking-wider">
            {filter === 'all' ? 'All Sign' : `${filter}s`} ({filtered.length})
          </h3>
          {filter !== 'all' && (
            <button className="text-xs text-gray-500 hover:text-gray-300 font-mono" onClick={() => setFilter('all')}>
              SHOW ALL
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">No sign observations recorded yet. Start logging scrapes, rubs, and beds.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-bark/20 last:border-0">
                <span className="font-mono text-xs text-gray-500 w-28 shrink-0">
                  {new Date(s.observedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="font-heading text-sm uppercase text-gray-200 w-16">{s.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded uppercase font-mono ${STATUS_COLORS[s.status] || ''}`}>
                  {s.status}
                </span>
                {s.rubSize && <span className="text-xs text-gray-500 font-mono">{s.rubSize.replace('_', ' ')}</span>}
                {s.scrapeSize && <span className="text-xs text-gray-500 font-mono">{s.scrapeSize}</span>}
                {s.marker && <span className="text-xs text-gray-500">@ {s.marker?.label}</span>}
                {s.notes && <span className="text-xs text-gray-500 truncate ml-auto max-w-[200px]">{s.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
