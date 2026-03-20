import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'rut', label: 'Rut Dates' },
  { id: 'food', label: 'Food Calendar' },
  { id: 'markers', label: 'Markers' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'reports', label: 'Reports' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'branding', label: 'Branding' },
  { id: 'data', label: 'Data' },
]

const MARKER_TYPES = [
  'TRAIL_CAM', 'STAND', 'BLIND', 'SCRAPE', 'RUB', 'FOOD_PLOT', 'WATER_SOURCE',
  'BED', 'TRAVEL_CORRIDOR', 'PINCH_POINT', 'FENCE_CROSSING', 'RIDGE', 'SADDLE',
  'CREEK', 'MINERAL_LICK', 'ENTRY_ROUTE', 'EXIT_ROUTE', 'SANCTUARY', 'NEIGHBOR_BOUNDARY', 'OTHER',
]

const MONTH_NAMES = { '09': 'September', '10': 'October', '11': 'November', '12': 'December' }
const OAK_OPTIONS = ['none', 'early', 'good', 'cold']
const CROP_OPTIONS = ['none', 'standing', 'harvested']

export default function Settings({ property, properties, onPropertyChange, onRefresh }) {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState(null)
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

  const loadSettings = useCallback(() => {
    api.getSettings().then(setSettings).catch(console.error)
  }, [])

  useEffect(() => {
    loadSettings()
    const stored = localStorage.getItem('dp_api_key_configured')
    if (stored === 'true') setApiKeyStatus('configured')
    if (property) {
      api.getSeasons(property.id).then(setSeasons).catch(console.error)
    }
  }, [property, loadSettings])

  const flash = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const updateSetting = async (section, data) => {
    try {
      const updated = await api.updateSettings({ [section]: data })
      setSettings(updated)
      flash('success', 'Settings saved')
    } catch (err) {
      flash('error', err.message)
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.startsWith('sk-ant-')) {
      flash('error', 'Invalid API key format. Should start with sk-ant-')
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
        flash('success', 'API key saved. Claude Vision analysis is now enabled.')
      } else {
        flash('error', data.error || 'Failed to save')
      }
    } catch (err) {
      flash('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateProperty = async () => {
    if (!newProp.name) return
    setSaving(true)
    try {
      await api.createProperty({
        name: newProp.name,
        acreage: newProp.acreage ? parseFloat(newProp.acreage) : null,
        state: newProp.state || null, county: newProp.county || null,
        lat: newProp.lat ? parseFloat(newProp.lat) : null,
        lng: newProp.lng ? parseFloat(newProp.lng) : null,
      })
      setShowNewProperty(false)
      setNewProp({ name: '', acreage: '', state: '', county: '', lat: '', lng: '' })
      flash('success', `Property "${newProp.name}" created!`)
      onRefresh?.()
    } catch (err) { flash('error', err.message) }
    finally { setSaving(false) }
  }

  const handleUpdateProperty = async () => {
    if (!editingProp) return
    setSaving(true)
    try {
      await api.updateProperty(editingProp.id, {
        name: editingProp.name,
        acreage: editingProp.acreage ? parseFloat(editingProp.acreage) : null,
        state: editingProp.state || null, county: editingProp.county || null,
        lat: editingProp.lat ? parseFloat(editingProp.lat) : null,
        lng: editingProp.lng ? parseFloat(editingProp.lng) : null,
      })
      setEditingProp(null)
      flash('success', 'Property updated.')
      onRefresh?.()
    } catch (err) { flash('error', err.message) }
    finally { setSaving(false) }
  }

  const handleDeleteProperty = async (id) => {
    setSaving(true)
    try {
      await api.deleteProperty(id)
      setShowDeleteConfirm(null)
      flash('success', 'Property deleted.')
      onRefresh?.()
    } catch (err) { flash('error', err.message) }
    finally { setSaving(false) }
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
      flash('success', `${newSeason.year} season created.`)
    } catch (err) { flash('error', err.message) }
    finally { setSaving(false) }
  }

  const handleClearData = async () => {
    if (!window.confirm('This will DELETE ALL DATA. Are you absolutely sure?')) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        flash('success', 'All data cleared. Start fresh!')
        onRefresh?.()
      }
    } catch (err) { flash('error', err.message) }
    finally { setSaving(false) }
  }

  const handleLoadDemo = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/seed-demo', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        flash('success', 'Demo data loaded!')
        onRefresh?.()
      }
    } catch (err) { flash('error', err.message) }
    finally { setSaving(false) }
  }

  if (!settings) return <div className="text-gray-500 text-center py-12">Loading settings...</div>

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Settings</h2>

      {/* Toast */}
      {message && (
        <div className={`p-3 rounded font-mono text-sm transition-opacity ${
          message.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-600/30' :
          'bg-green-900/20 text-green-400 border border-green-600/30'
        }`}>
          {message.text}
          <button className="ml-3 text-xs opacity-60 hover:opacity-100" onClick={() => setMessage(null)}>dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-bark/30 pb-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 font-heading uppercase text-xs tracking-wider whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-amber border-amber'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === GENERAL TAB === */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* App Settings */}
          <div className="card">
            <h3 className="font-heading text-lg text-amber mb-3 uppercase tracking-wider">App Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">App Name</label>
                <input className="input-field" value={settings.app?.name || ''}
                  onChange={e => updateSetting('app', { ...settings.app, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Owner Name</label>
                <input className="input-field" value={settings.app?.ownerName || ''}
                  onChange={e => updateSetting('app', { ...settings.app, ownerName: e.target.value })}
                  placeholder="Your name (shown on reports)" />
              </div>
              <div>
                <label className="label">Units</label>
                <select className="input-field" value={settings.app?.units || 'imperial'}
                  onChange={e => updateSetting('app', { ...settings.app, units: e.target.value })}>
                  <option value="imperial">Imperial (F, inHg, mph)</option>
                  <option value="metric">Metric (C, hPa, km/h)</option>
                </select>
              </div>
              <div>
                <label className="label">Theme</label>
                <select className="input-field" value={settings.app?.theme || 'dark-tactical'}
                  onChange={e => updateSetting('app', { ...settings.app, theme: e.target.value })}>
                  <option value="dark-tactical">Dark Tactical</option>
                  <option value="dark-natural">Dark Natural</option>
                  <option value="light-field">Light Field</option>
                </select>
              </div>
              <div>
                <label className="label">PIN (optional lock)</label>
                <input type="password" className="input-field" value={settings.app?.pin || ''}
                  onChange={e => updateSetting('app', { ...settings.app, pin: e.target.value })}
                  placeholder="4-digit PIN" maxLength={6} />
              </div>
            </div>
          </div>

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
                <button className="text-gray-500 hover:text-gray-300 text-xs font-mono" onClick={() => setApiKeyStatus(null)}>UPDATE</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="password" className="input-field flex-1" value={apiKey}
                  onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-..." />
                <button className="btn-primary text-sm py-2" onClick={handleSaveApiKey} disabled={saving || !apiKey}>Save Key</button>
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
              <button className="btn-primary text-sm py-2" onClick={() => setShowNewProperty(true)}>+ New Property</button>
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
                  <button className="text-gray-500 hover:text-amber text-xs font-mono" onClick={() => { onPropertyChange?.(p); flash('success', `Switched to ${p.name}`) }}>SELECT</button>
                  <button className="text-gray-500 hover:text-amber text-xs font-mono" onClick={() => setEditingProp({ ...p })}>EDIT</button>
                  <button className="text-gray-500 hover:text-red-400 text-xs font-mono" onClick={() => setShowDeleteConfirm(p.id)}>DELETE</button>
                </div>
              </div>
            ))}
            {(!properties || properties.length === 0) && (
              <p className="text-gray-500 text-sm">No properties yet. Create your first one above.</p>
            )}
            {showDeleteConfirm && (
              <div className="mt-3 p-3 bg-red-900/20 border border-red-600/30 rounded">
                <p className="text-red-400 text-sm mb-2 font-mono">DELETE THIS PROPERTY AND ALL ITS DATA?</p>
                <div className="flex gap-2">
                  <button className="bg-red-600 text-white px-3 py-1 rounded text-sm font-heading uppercase" onClick={() => handleDeleteProperty(showDeleteConfirm)}>Yes, Delete</button>
                  <button className="btn-secondary text-sm py-1" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {showNewProperty && (
            <div className="card border-amber/50">
              <h3 className="font-heading text-lg text-amber mb-3">NEW PROPERTY</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="label">Property Name *</label>
                  <input className="input-field" value={newProp.name} onChange={e => setNewProp(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Hollow Creek Farm" /></div>
                <div><label className="label">Acreage</label><input type="number" className="input-field" value={newProp.acreage} onChange={e => setNewProp(p => ({ ...p, acreage: e.target.value }))} placeholder="340" /></div>
                <div><label className="label">State</label><input className="input-field" value={newProp.state} onChange={e => setNewProp(p => ({ ...p, state: e.target.value }))} placeholder="Ohio" /></div>
                <div><label className="label">County</label><input className="input-field" value={newProp.county} onChange={e => setNewProp(p => ({ ...p, county: e.target.value }))} placeholder="Pike County" /></div>
                <div><label className="label">Latitude</label><input type="number" step="any" className="input-field" value={newProp.lat} onChange={e => setNewProp(p => ({ ...p, lat: e.target.value }))} placeholder="39.03" /></div>
                <div><label className="label">Longitude</label><input type="number" step="any" className="input-field" value={newProp.lng} onChange={e => setNewProp(p => ({ ...p, lng: e.target.value }))} placeholder="-82.60" /></div>
              </div>
              <div className="flex gap-3 mt-4">
                <button className="btn-primary text-sm py-2" onClick={handleCreateProperty} disabled={saving || !newProp.name}>Create Property</button>
                <button className="btn-secondary text-sm py-2" onClick={() => setShowNewProperty(false)}>Cancel</button>
              </div>
            </div>
          )}

          {editingProp && (
            <div className="card border-amber/50">
              <h3 className="font-heading text-lg text-amber mb-3">EDIT PROPERTY</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="label">Name</label><input className="input-field" value={editingProp.name} onChange={e => setEditingProp(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label className="label">Acreage</label><input type="number" className="input-field" value={editingProp.acreage || ''} onChange={e => setEditingProp(p => ({ ...p, acreage: e.target.value }))} /></div>
                <div><label className="label">State</label><input className="input-field" value={editingProp.state || ''} onChange={e => setEditingProp(p => ({ ...p, state: e.target.value }))} /></div>
                <div><label className="label">County</label><input className="input-field" value={editingProp.county || ''} onChange={e => setEditingProp(p => ({ ...p, county: e.target.value }))} /></div>
                <div><label className="label">Latitude</label><input type="number" step="any" className="input-field" value={editingProp.lat || ''} onChange={e => setEditingProp(p => ({ ...p, lat: e.target.value }))} /></div>
                <div><label className="label">Longitude</label><input type="number" step="any" className="input-field" value={editingProp.lng || ''} onChange={e => setEditingProp(p => ({ ...p, lng: e.target.value }))} /></div>
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
                  <span className="font-mono text-xs text-gray-500">{s.mastCropRating && `Mast: ${s.mastCropRating}`}</span>
                </div>
              ))}
              {showNewSeason && (
                <div className="mt-3 p-3 bg-forest-dark rounded border border-bark/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Year</label><input type="number" className="input-field" value={newSeason.year} onChange={e => setNewSeason(s => ({ ...s, year: e.target.value }))} /></div>
                    <div><label className="label">Label</label><input className="input-field" value={newSeason.label} onChange={e => setNewSeason(s => ({ ...s, label: e.target.value }))} placeholder="2024 Archery + Gun" /></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="btn-primary text-sm py-1" onClick={handleCreateSeason} disabled={saving}>Add Season</button>
                    <button className="btn-secondary text-sm py-1" onClick={() => setShowNewSeason(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === RUT DATES TAB === */}
      {activeTab === 'rut' && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase tracking-wider">Rut Date Configuration</h3>
          <p className="text-gray-500 text-sm">
            Override regional rut dates with your own observations. These dates are used across all prediction reports, briefings, and sighting auto-fills.
          </p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-amber"
              checked={settings.rut?.overrideRegionalDates || false}
              onChange={e => updateSetting('rut', { ...settings.rut, overrideRegionalDates: e.target.checked })} />
            <span className="text-gray-200 text-sm font-heading uppercase tracking-wider">Use my custom rut dates</span>
          </label>

          {settings.rut?.overrideRegionalDates && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              {[
                { key: 'seekingStart', label: 'Seeking Starts' },
                { key: 'chasingStart', label: 'Chasing Starts' },
                { key: 'peakRutDate', label: 'Peak Rut' },
                { key: 'lockdownStart', label: 'Lockdown Starts' },
                { key: 'postRutStart', label: 'Post-Rut Starts' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="text" className="input-field" placeholder="MM-DD"
                    value={settings.rut?.[key] || ''}
                    onChange={e => updateSetting('rut', { ...settings.rut, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          )}

          {!settings.rut?.overrideRegionalDates && (
            <div className="p-3 bg-forest-dark rounded border border-bark/20">
              <p className="text-gray-400 text-sm font-mono">
                Using regional lookup for {property?.state || 'your state'}{property?.county ? `, ${property.county}` : ''}.
                Toggle override above to set custom dates.
              </p>
            </div>
          )}
        </div>
      )}

      {/* === FOOD CALENDAR TAB === */}
      {activeTab === 'food' && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase tracking-wider">Food Source Calendar</h3>
          <p className="text-gray-500 text-sm">
            Track food source availability by month. This data is injected into every prediction report and weekly briefing for context-aware recommendations.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="label pb-2">Month</th>
                  <th className="label pb-2">White Oak</th>
                  <th className="label pb-2">Red Oak</th>
                  <th className="label pb-2">Corn</th>
                  <th className="label pb-2">Beans</th>
                  <th className="label pb-2">Food Plot</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(MONTH_NAMES).map(([month, name]) => {
                  const cal = settings.foodSources?.calendar?.[month] || {}
                  return (
                    <tr key={month} className="border-t border-bark/20">
                      <td className="py-2 font-heading text-gray-200">{name}</td>
                      <td className="py-2">
                        <select className="input-field text-xs py-1" value={cal.whiteOak || 'none'}
                          onChange={e => {
                            const c = { ...settings.foodSources?.calendar }
                            c[month] = { ...c[month], whiteOak: e.target.value }
                            updateSetting('foodSources', { calendar: c })
                          }}>
                          {OAK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="py-2">
                        <select className="input-field text-xs py-1" value={cal.redOak || 'none'}
                          onChange={e => {
                            const c = { ...settings.foodSources?.calendar }
                            c[month] = { ...c[month], redOak: e.target.value }
                            updateSetting('foodSources', { calendar: c })
                          }}>
                          {OAK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="py-2">
                        <select className="input-field text-xs py-1" value={cal.corn || 'none'}
                          onChange={e => {
                            const c = { ...settings.foodSources?.calendar }
                            c[month] = { ...c[month], corn: e.target.value }
                            updateSetting('foodSources', { calendar: c })
                          }}>
                          {CROP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="py-2">
                        <select className="input-field text-xs py-1" value={cal.beans || 'none'}
                          onChange={e => {
                            const c = { ...settings.foodSources?.calendar }
                            c[month] = { ...c[month], beans: e.target.value }
                            updateSetting('foodSources', { calendar: c })
                          }}>
                          {CROP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="py-2">
                        <label className="flex items-center justify-center">
                          <input type="checkbox" className="w-4 h-4 accent-amber"
                            checked={cal.foodPlot !== false}
                            onChange={e => {
                              const c = { ...settings.foodSources?.calendar }
                              c[month] = { ...c[month], foodPlot: e.target.checked }
                              updateSetting('foodSources', { calendar: c })
                            }} />
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === MARKERS TAB === */}
      {activeTab === 'markers' && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase tracking-wider">Marker Customization</h3>
          <p className="text-gray-500 text-sm">
            Customize colors, sizes, and visibility for each marker type on your property map.
          </p>

          <div className="space-y-2">
            {MARKER_TYPES.map(type => {
              const m = settings.markers?.[type] || { color: '#9CA3AF', size: 1.0, visible: true }
              return (
                <div key={type} className="flex items-center gap-3 py-2 border-b border-bark/20 last:border-0">
                  <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    value={m.color}
                    onChange={e => {
                      const markers = { ...settings.markers }
                      markers[type] = { ...m, color: e.target.value }
                      updateSetting('markers', markers)
                    }} />
                  <span className="font-heading text-sm text-gray-200 w-44 uppercase tracking-wider">{type.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <label className="label mb-0 text-[10px]">Size</label>
                    <input type="range" min="0.5" max="2" step="0.1" className="flex-1 accent-amber"
                      value={m.size}
                      onChange={e => {
                        const markers = { ...settings.markers }
                        markers[type] = { ...m, size: parseFloat(e.target.value) }
                        updateSetting('markers', markers)
                      }} />
                    <span className="font-mono text-xs text-gray-500 w-8">{m.size}x</span>
                  </div>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-amber"
                      checked={m.visible !== false}
                      onChange={e => {
                        const markers = { ...settings.markers }
                        markers[type] = { ...m, visible: e.target.checked }
                        updateSetting('markers', markers)
                      }} />
                    <span className="text-xs text-gray-500">Show</span>
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* === SCORING TAB === */}
      {activeTab === 'scoring' && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase tracking-wider">Scoring System</h3>

          <div className="space-y-3">
            {[
              { value: 'boone-crockett', label: 'Boone & Crockett', desc: 'Gross typical score' },
              { value: 'pope-young', label: 'Pope & Young', desc: 'Bowhunter scoring' },
              { value: 'custom', label: 'Custom', desc: 'Define your own label' },
              { value: 'off', label: 'Off', desc: 'Hide scoring throughout the app' },
            ].map(opt => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-forest-dark">
                <input type="radio" name="scoring" className="mt-1 accent-amber"
                  checked={settings.scoring?.system === opt.value}
                  onChange={() => updateSetting('scoring', { ...settings.scoring, system: opt.value })} />
                <div>
                  <span className="text-gray-200 font-heading uppercase text-sm">{opt.label}</span>
                  <p className="text-gray-500 text-xs">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {settings.scoring?.system === 'custom' && (
            <div>
              <label className="label">Custom Score Label</label>
              <input className="input-field" value={settings.scoring?.customScoreLabel || ''}
                onChange={e => updateSetting('scoring', { ...settings.scoring, customScoreLabel: e.target.value })}
                placeholder="e.g. Gross Net Score" />
            </div>
          )}

          <div>
            <label className="label">Minimum Score to Display</label>
            <input type="number" className="input-field w-32" value={settings.scoring?.minimumToLog || 0}
              onChange={e => updateSetting('scoring', { ...settings.scoring, minimumToLog: parseInt(e.target.value) || 0 })} />
            <p className="text-gray-600 text-xs mt-1">Deer below this score won't show score estimates</p>
          </div>
        </div>
      )}

      {/* === REPORTS TAB === */}
      {activeTab === 'reports' && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase tracking-wider">Report Defaults</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Default Prediction Window</label>
              <select className="input-field" value={settings.reporting?.defaultPredictionDays || 7}
                onChange={e => updateSetting('reporting', { ...settings.reporting, defaultPredictionDays: parseInt(e.target.value) })}>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>
            <div>
              <label className="label">Default AI Model</label>
              <select className="input-field" value={settings.reporting?.defaultModel || 'opus'}
                onChange={e => updateSetting('reporting', { ...settings.reporting, defaultModel: e.target.value })}>
                <option value="opus">Claude Opus 4.6 (Premium - deeper analysis)</option>
                <option value="sonnet">Claude Sonnet 4.6 (Faster - lower cost)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-amber"
              checked={settings.reporting?.streamingEnabled !== false}
              onChange={e => updateSetting('reporting', { ...settings.reporting, streamingEnabled: e.target.checked })} />
            <span className="text-gray-200 text-sm">Stream report text in real time</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-amber"
              checked={settings.reporting?.autoSaveReports !== false}
              onChange={e => updateSetting('reporting', { ...settings.reporting, autoSaveReports: e.target.checked })} />
            <span className="text-gray-200 text-sm">Auto-save generated reports</span>
          </label>
        </div>
      )}

      {/* === NOTIFICATIONS TAB === */}
      {activeTab === 'notifications' && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase tracking-wider">Notifications</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-amber"
              checked={settings.notifications?.frontAlerts !== false}
              onChange={e => updateSetting('notifications', { ...settings.notifications, frontAlerts: e.target.checked })} />
            <div>
              <span className="text-gray-200 text-sm">Cold Front Alerts</span>
              <p className="text-gray-500 text-xs">Notify when a pressure drop signals high deer movement</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-amber"
              checked={settings.notifications?.weeklyBriefing !== false}
              onChange={e => updateSetting('notifications', { ...settings.notifications, weeklyBriefing: e.target.checked })} />
            <div>
              <span className="text-gray-200 text-sm">Weekly Intelligence Briefing</span>
              <p className="text-gray-500 text-xs">Auto-generated briefing with activity summary and forecast</p>
            </div>
          </label>

          {settings.notifications?.weeklyBriefing && (
            <div className="grid grid-cols-2 gap-4 ml-7">
              <div>
                <label className="label">Day</label>
                <select className="input-field" value={settings.notifications?.briefingDay || 'monday'}
                  onChange={e => updateSetting('notifications', { ...settings.notifications, briefingDay: e.target.value })}>
                  {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(d => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Time</label>
                <input type="time" className="input-field" value={settings.notifications?.briefingTime || '06:00'}
                  onChange={e => updateSetting('notifications', { ...settings.notifications, briefingTime: e.target.value })} />
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-amber"
              checked={settings.notifications?.newCamHitAlert || false}
              onChange={e => updateSetting('notifications', { ...settings.notifications, newCamHitAlert: e.target.checked })} />
            <div>
              <span className="text-gray-200 text-sm">New Camera Hit Alerts</span>
              <p className="text-gray-500 text-xs">Alert when AI detects a deer in newly uploaded photos</p>
            </div>
          </label>
        </div>
      )}

      {/* === BRANDING TAB === */}
      {activeTab === 'branding' && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase tracking-wider">Report Branding</h3>
          <p className="text-gray-500 text-sm">
            Customize the appearance of exported PDF reports. Outfitters and lease clubs can create a professional branded look.
          </p>

          <div>
            <label className="label">Report Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                value={settings.reporting?.pdfColorAccent || '#FF6B00'}
                onChange={e => updateSetting('reporting', { ...settings.reporting, pdfColorAccent: e.target.value })} />
              <span className="font-mono text-sm text-gray-400">{settings.reporting?.pdfColorAccent || '#FF6B00'}</span>
            </div>
          </div>

          <div>
            <label className="label">Report Header Text</label>
            <input className="input-field" value={settings.reporting?.headerText || ''}
              onChange={e => updateSetting('reporting', { ...settings.reporting, headerText: e.target.value })}
              placeholder="e.g. Hollow Creek Farm Intelligence Report" />
          </div>

          <div>
            <label className="label">Report Footer Text</label>
            <input className="input-field" value={settings.reporting?.footerText || ''}
              onChange={e => updateSetting('reporting', { ...settings.reporting, footerText: e.target.value })}
              placeholder="e.g. Confidential — Do Not Distribute" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-amber"
              checked={settings.reporting?.pdfShowPoweredBy !== false}
              onChange={e => updateSetting('reporting', { ...settings.reporting, pdfShowPoweredBy: e.target.checked })} />
            <div>
              <span className="text-gray-200 text-sm">Show "Powered by Deer Predictor" in footer</span>
              <p className="text-gray-500 text-xs">Turn off for white-label reports</p>
            </div>
          </label>
        </div>
      )}

      {/* === DATA TAB === */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-heading text-lg text-amber mb-3 uppercase tracking-wider">Demo Data</h3>
            <p className="text-gray-500 text-sm mb-3">
              Load the Hollow Creek Farm demo with 3 seasons, 4 deer profiles, 60 sightings, and 14 map markers.
            </p>
            <button className="btn-secondary text-sm py-2" onClick={handleLoadDemo} disabled={saving}>
              {saving ? 'Loading...' : 'Load Demo Data (Hollow Creek Farm)'}
            </button>
          </div>

          <div className="card border-red-900/30">
            <h3 className="font-heading text-lg text-red-400 mb-1 uppercase tracking-wider">Danger Zone</h3>
            <p className="text-gray-500 text-sm mb-3">
              Permanently delete all data including properties, deer, sightings, photos, and reports.
              This cannot be undone.
            </p>
            <button
              className="bg-red-900/30 border border-red-600/30 text-red-400 hover:bg-red-900/50 px-4 py-2 rounded text-sm font-heading uppercase"
              onClick={handleClearData}
              disabled={saving}
            >
              Clear All Data & Start Fresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
