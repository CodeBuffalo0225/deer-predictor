import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Settings({ property, properties, onPropertyChange, onRefresh }) {
  const [apiKey, setApiKey] = useState('')
  const [apiKeyStatus, setApiKeyStatus] = useState(null)
  const [showNewProperty, setShowNewProperty] = useState(false)
  const [newProp, setNewProp] = useState({ name: '', acreage: '', state: '', county: '', lat: '', lng: '' })
  const [editingProp, setEditingProp] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showNewSeason, setShowNewSeason] = useState(false)
  const [newSeason, setNewSeason] = useState({ year: new Date().getFullYear(), label: '' })
  const [seasons, setSeasons] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    // Check stored API key
    const stored = localStorage.getItem('dp_api_key_configured')
    if (stored === 'true') setApiKeyStatus('configured')

    // Load seasons
    if (property) {
      api.getSeasons(property.id).then(setSeasons).catch(console.error)
    }
  }, [property])

  const handleSaveApiKey = async () => {
    if (!apiKey.startsWith('sk-ant-')) {
      setMessage({ type: 'error', text: 'Invalid API key format. Should start with sk-ant-' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('dp_api_key_configured', 'true')
        setApiKeyStatus('configured')
        setApiKey('')
        setMessage({ type: 'success', text: 'API key saved. Claude Vision analysis is now enabled.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateProperty = async () => {
    if (!newProp.name) return
    setSaving(true)
    try {
      const data = {
        name: newProp.name,
        acreage: newProp.acreage ? parseFloat(newProp.acreage) : null,
        state: newProp.state || null,
        county: newProp.county || null,
        lat: newProp.lat ? parseFloat(newProp.lat) : null,
        lng: newProp.lng ? parseFloat(newProp.lng) : null,
      }
      await api.createProperty(data)
      setShowNewProperty(false)
      setNewProp({ name: '', acreage: '', state: '', county: '', lat: '', lng: '' })
      setMessage({ type: 'success', text: `Property "${data.name}" created!` })
      onRefresh?.()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProperty = async () => {
    if (!editingProp) return
    setSaving(true)
    try {
      const data = {
        name: editingProp.name,
        acreage: editingProp.acreage ? parseFloat(editingProp.acreage) : null,
        state: editingProp.state || null,
        county: editingProp.county || null,
        lat: editingProp.lat ? parseFloat(editingProp.lat) : null,
        lng: editingProp.lng ? parseFloat(editingProp.lng) : null,
      }
      await api.updateProperty(editingProp.id, data)
      setEditingProp(null)
      setMessage({ type: 'success', text: 'Property updated.' })
      onRefresh?.()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProperty = async (id) => {
    setSaving(true)
    try {
      await api.deleteProperty(id)
      setShowDeleteConfirm(null)
      setMessage({ type: 'success', text: 'Property deleted.' })
      onRefresh?.()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSeason = async () => {
    if (!property || !newSeason.year) return
    setSaving(true)
    try {
      await api.createSeason(property.id, {
        year: parseInt(newSeason.year),
        label: newSeason.label || `${newSeason.year} Season`,
      })
      setShowNewSeason(false)
      setNewSeason({ year: new Date().getFullYear(), label: '' })
      const updated = await api.getSeasons(property.id)
      setSeasons(updated)
      setMessage({ type: 'success', text: `${newSeason.year} season created.` })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleClearDemoData = async () => {
    if (!window.confirm('This will DELETE ALL DATA including demo data. Are you absolutely sure?')) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'All data cleared. Start fresh!' })
        onRefresh?.()
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Settings</h2>

      {/* Flash message */}
      {message && (
        <div className={`p-3 rounded font-mono text-sm ${
          message.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-600/30' :
          'bg-green-900/20 text-green-400 border border-green-600/30'
        }`}>
          {message.text}
          <button className="ml-3 text-xs opacity-60 hover:opacity-100" onClick={() => setMessage(null)}>dismiss</button>
        </div>
      )}

      {/* API Key */}
      <div className="card">
        <h3 className="font-heading text-lg text-amber mb-1 uppercase tracking-wider">Claude API Key</h3>
        <p className="text-gray-500 text-sm mb-3">
          Required for AI photo analysis and prediction reports. Get your key at{' '}
          <span className="text-amber">console.anthropic.com</span>
        </p>

        {apiKeyStatus === 'configured' ? (
          <div className="flex items-center gap-3">
            <span className="text-green-400 font-mono text-sm">API key configured</span>
            <button className="text-gray-500 hover:text-gray-300 text-xs font-mono" onClick={() => setApiKeyStatus(null)}>
              UPDATE
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="password"
              className="input-field flex-1"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
            />
            <button className="btn-primary text-sm py-2" onClick={handleSaveApiKey} disabled={saving || !apiKey}>
              Save Key
            </button>
          </div>
        )}
        <p className="text-gray-600 text-xs mt-2">
          Key is stored on this machine only. Without it, photo analysis and AI reports are disabled but everything else works.
        </p>
      </div>

      {/* Properties */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg text-amber uppercase tracking-wider">Properties</h3>
          <button className="btn-primary text-sm py-2" onClick={() => setShowNewProperty(true)}>
            + New Property
          </button>
        </div>

        {properties?.map(p => (
          <div key={p.id} className="flex items-center justify-between py-3 border-b border-bark/20 last:border-0">
            <div>
              <span className="font-heading text-gray-200">{p.name}</span>
              <span className="font-mono text-xs text-gray-500 ml-2">
                {[p.acreage && `${p.acreage}ac`, p.county, p.state].filter(Boolean).join(', ')}
              </span>
            </div>
            <div className="flex gap-2">
              <button className="text-gray-500 hover:text-amber text-xs font-mono" onClick={() => { onPropertyChange?.(p); setMessage({ type: 'success', text: `Switched to ${p.name}` }) }}>
                SELECT
              </button>
              <button className="text-gray-500 hover:text-amber text-xs font-mono" onClick={() => setEditingProp({ ...p })}>
                EDIT
              </button>
              <button className="text-gray-500 hover:text-red-400 text-xs font-mono" onClick={() => setShowDeleteConfirm(p.id)}>
                DELETE
              </button>
            </div>
          </div>
        ))}

        {(!properties || properties.length === 0) && (
          <p className="text-gray-500 text-sm">No properties yet. Create your first one above.</p>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-3 p-3 bg-red-900/20 border border-red-600/30 rounded">
            <p className="text-red-400 text-sm mb-2 font-mono">DELETE THIS PROPERTY AND ALL ITS DATA?</p>
            <div className="flex gap-2">
              <button className="bg-red-600 text-white px-3 py-1 rounded text-sm font-heading uppercase" onClick={() => handleDeleteProperty(showDeleteConfirm)}>
                Yes, Delete
              </button>
              <button className="btn-secondary text-sm py-1" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* New Property Form */}
      {showNewProperty && (
        <div className="card border-amber/50">
          <h3 className="font-heading text-lg text-amber mb-3">NEW PROPERTY</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Property Name *</label>
              <input className="input-field" value={newProp.name} onChange={e => setNewProp(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Hollow Creek Farm" />
            </div>
            <div>
              <label className="label">Acreage</label>
              <input type="number" className="input-field" value={newProp.acreage} onChange={e => setNewProp(p => ({ ...p, acreage: e.target.value }))} placeholder="340" />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input-field" value={newProp.state} onChange={e => setNewProp(p => ({ ...p, state: e.target.value }))} placeholder="Ohio" />
            </div>
            <div>
              <label className="label">County</label>
              <input className="input-field" value={newProp.county} onChange={e => setNewProp(p => ({ ...p, county: e.target.value }))} placeholder="Pike County" />
            </div>
            <div>
              <label className="label">GPS — Latitude</label>
              <input type="number" step="any" className="input-field" value={newProp.lat} onChange={e => setNewProp(p => ({ ...p, lat: e.target.value }))} placeholder="39.03" />
            </div>
            <div>
              <label className="label">GPS — Longitude</label>
              <input type="number" step="any" className="input-field" value={newProp.lng} onChange={e => setNewProp(p => ({ ...p, lng: e.target.value }))} placeholder="-82.60" />
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-2">GPS coordinates enable auto weather backfill from Open-Meteo. Tip: right-click Google Maps to copy coordinates.</p>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary text-sm py-2" onClick={handleCreateProperty} disabled={saving || !newProp.name}>Create Property</button>
            <button className="btn-secondary text-sm py-2" onClick={() => setShowNewProperty(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Property Form */}
      {editingProp && (
        <div className="card border-amber/50">
          <h3 className="font-heading text-lg text-amber mb-3">EDIT PROPERTY</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Property Name</label>
              <input className="input-field" value={editingProp.name} onChange={e => setEditingProp(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Acreage</label>
              <input type="number" className="input-field" value={editingProp.acreage || ''} onChange={e => setEditingProp(p => ({ ...p, acreage: e.target.value }))} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input-field" value={editingProp.state || ''} onChange={e => setEditingProp(p => ({ ...p, state: e.target.value }))} />
            </div>
            <div>
              <label className="label">County</label>
              <input className="input-field" value={editingProp.county || ''} onChange={e => setEditingProp(p => ({ ...p, county: e.target.value }))} />
            </div>
            <div>
              <label className="label">Latitude</label>
              <input type="number" step="any" className="input-field" value={editingProp.lat || ''} onChange={e => setEditingProp(p => ({ ...p, lat: e.target.value }))} />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input type="number" step="any" className="input-field" value={editingProp.lng || ''} onChange={e => setEditingProp(p => ({ ...p, lng: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary text-sm py-2" onClick={handleUpdateProperty} disabled={saving}>Save Changes</button>
            <button className="btn-secondary text-sm py-2" onClick={() => setEditingProp(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Seasons */}
      {property && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-lg text-amber uppercase tracking-wider">Seasons</h3>
            <button className="btn-secondary text-sm py-2" onClick={() => setShowNewSeason(true)}>+ Add Season</button>
          </div>

          {seasons.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-bark/20 last:border-0">
              <span className="font-heading text-gray-200">{s.label || s.year}</span>
              <span className="font-mono text-xs text-gray-500">
                {s.mastCropRating && `Mast: ${s.mastCropRating}`}
              </span>
            </div>
          ))}

          {showNewSeason && (
            <div className="mt-3 p-3 bg-forest-dark rounded border border-bark/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Year</label>
                  <input type="number" className="input-field" value={newSeason.year} onChange={e => setNewSeason(s => ({ ...s, year: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Label</label>
                  <input className="input-field" value={newSeason.label} onChange={e => setNewSeason(s => ({ ...s, label: e.target.value }))} placeholder="2024 Archery + Gun" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary text-sm py-1" onClick={handleCreateSeason} disabled={saving}>Add Season</button>
                <button className="btn-secondary text-sm py-1" onClick={() => setShowNewSeason(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Management */}
      <div className="card border-red-900/30">
        <h3 className="font-heading text-lg text-amber mb-1 uppercase tracking-wider">Data Management</h3>
        <p className="text-gray-500 text-sm mb-3">
          The demo data (Hollow Creek Farm) is great for exploring the app. Clear it when you're ready to add your own property.
        </p>
        <button
          className="bg-red-900/30 border border-red-600/30 text-red-400 hover:bg-red-900/50 px-4 py-2 rounded text-sm font-heading uppercase"
          onClick={handleClearDemoData}
          disabled={saving}
        >
          Clear All Data & Start Fresh
        </button>
      </div>
    </div>
  )
}
