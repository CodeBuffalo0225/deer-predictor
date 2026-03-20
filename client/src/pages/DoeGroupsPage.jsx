import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function DoeGroupsPage({ property }) {
  const [groups, setGroups] = useState([])
  const [markers, setMarkers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', estimatedSize: '', primaryFeedingMarkerId: '',
    primaryBeddingMarkerId: '', homeRangeDescription: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!property) return
    api.getDoeGroups(property.id).then(setGroups).catch(console.error)
    api.getMarkers(property.id).then(setMarkers).catch(console.error)
  }, [property])

  const handleCreate = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      await api.createDoeGroup({
        propertyId: property.id,
        name: form.name,
        estimatedSize: form.estimatedSize ? parseInt(form.estimatedSize) : null,
        primaryFeedingMarkerId: form.primaryFeedingMarkerId || null,
        primaryBeddingMarkerId: form.primaryBeddingMarkerId || null,
        homeRangeDescription: form.homeRangeDescription || null,
        notes: form.notes || null,
      })
      setShowForm(false)
      setForm({ name: '', estimatedSize: '', primaryFeedingMarkerId: '', primaryBeddingMarkerId: '', homeRangeDescription: '', notes: '' })
      const updated = await api.getDoeGroups(property.id)
      setGroups(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!property) {
    return <div className="flex items-center justify-center h-96"><p className="text-gray-500">Select a property first</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Doe Groups</h2>
        <button className="btn-primary text-sm py-2" onClick={() => setShowForm(true)}>+ New Group</button>
      </div>

      <p className="text-gray-500 text-sm">
        During seeking and chasing phase, does ARE the prediction. Track doe groups to predict where bucks will be checking during the rut.
      </p>

      {/* New Group Form */}
      {showForm && (
        <div className="card border-amber/50 space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase">New Doe Group</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Group Name *</label>
              <input className="input-field" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. South Field Group" />
            </div>
            <div>
              <label className="label">Estimated Size</label>
              <input type="number" className="input-field" value={form.estimatedSize}
                onChange={e => setForm(f => ({ ...f, estimatedSize: e.target.value }))}
                placeholder="e.g. 6" />
            </div>
            <div>
              <label className="label">Primary Feeding Area</label>
              <select className="input-field" value={form.primaryFeedingMarkerId}
                onChange={e => setForm(f => ({ ...f, primaryFeedingMarkerId: e.target.value }))}>
                <option value="">Select marker...</option>
                {markers.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Primary Bedding Area</label>
              <select className="input-field" value={form.primaryBeddingMarkerId}
                onChange={e => setForm(f => ({ ...f, primaryBeddingMarkerId: e.target.value }))}>
                <option value="">Select marker...</option>
                {markers.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Home Range Description</label>
            <textarea className="input-field" rows={2} value={form.homeRangeDescription}
              onChange={e => setForm(f => ({ ...f, homeRangeDescription: e.target.value }))}
              placeholder="Where does this group typically range?" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary text-sm py-2" onClick={handleCreate} disabled={saving || !form.name}>
              {saving ? 'Saving...' : 'Create Group'}
            </button>
            <button className="btn-secondary text-sm py-2" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="card">
          <p className="text-gray-500 text-sm">No doe groups defined yet. Create groups to track doe family units across your property.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map(g => (
            <div key={g.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-lg text-gray-200">{g.name}</h3>
                {g.estimatedSize && (
                  <span className="font-mono text-sm text-amber">{g.estimatedSize} deer</span>
                )}
              </div>
              {g.homeRangeDescription && (
                <p className="text-gray-400 text-sm mb-2">{g.homeRangeDescription}</p>
              )}
              <div className="flex gap-4 text-xs font-mono text-gray-500">
                {g.primaryFeedingMarker && <span>Feeds: {g.primaryFeedingMarker.label}</span>}
                {g.primaryBeddingMarker && <span>Beds: {g.primaryBeddingMarker.label}</span>}
              </div>
              {g.notes && <p className="text-gray-500 text-xs mt-2">{g.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
