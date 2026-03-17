import { useState, useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import { api } from '../lib/api'

const MARKER_TYPES = [
  'TRAIL_CAM', 'STAND', 'BLIND', 'FOOD_PLOT', 'WATER_SOURCE',
  'SCRAPE', 'RUB', 'BED', 'TRAVEL_CORRIDOR', 'PINCH_POINT',
  'FENCE_CROSSING', 'RIDGE', 'SADDLE', 'CREEK', 'WIND_INDICATOR',
  'MINERAL_LICK', 'BAIT_SITE', 'ENTRY_ROUTE', 'EXIT_ROUTE',
  'SANCTUARY', 'NEIGHBOR_BOUNDARY', 'OTHER',
]

const MARKER_COLORS = {
  TRAIL_CAM: '#3B82F6', STAND: '#F59E0B', BLIND: '#F59E0B',
  FOOD_PLOT: '#10B981', WATER_SOURCE: '#06B6D4', SCRAPE: '#EF4444',
  RUB: '#EF4444', BED: '#8B5CF6', TRAVEL_CORRIDOR: '#6B7280',
  PINCH_POINT: '#F97316', FENCE_CROSSING: '#6B7280', RIDGE: '#78716C',
  SADDLE: '#78716C', CREEK: '#06B6D4', SANCTUARY: '#22C55E',
  ENTRY_ROUTE: '#3B82F6', EXIT_ROUTE: '#EC4899', OTHER: '#9CA3AF',
}

const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function createMarkerIcon(type) {
  const color = MARKER_COLORS[type] || '#9CA3AF'
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

export default function PropertyMap({ property, onUpdate }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const sanctuaryLayerRef = useRef(null)

  const [markers, setMarkers] = useState([])
  const [placingMarker, setPlacingMarker] = useState(false)
  const [newMarkerType, setNewMarkerType] = useState('STAND')
  const [showForm, setShowForm] = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState(null)
  const [formData, setFormData] = useState({ label: '', notes: '', windViableDirections: [], restDaysRecommended: 7 })
  const [selectedMarker, setSelectedMarker] = useState(null)
  const [drawingSanctuary, setDrawingSanctuary] = useState(false)
  const [sanctuaryPoints, setSanctuaryPoints] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [filterType, setFilterType] = useState('ALL')

  // Load markers
  useEffect(() => {
    if (!property) return
    api.getMarkers(property.id).then(setMarkers).catch(console.error)
  }, [property])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const center = property?.lat && property?.lng
      ? [property.lat, property.lng]
      : [39.03, -82.60]

    const map = L.map(mapRef.current, {
      center,
      zoom: 15,
      zoomControl: true,
    })

    // Dark CartoDB tiles as base
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map)

    // If property has a base map image, add as overlay
    if (property?.baseMapImage) {
      const bounds = property.bounds
        ? JSON.parse(property.bounds)
        : [[center[0] - 0.01, center[1] - 0.015], [center[0] + 0.01, center[1] + 0.015]]
      L.imageOverlay(`/${property.baseMapImage}`, bounds, { opacity: 0.7 }).addTo(map)
    }

    markersLayerRef.current = L.layerGroup().addTo(map)
    sanctuaryLayerRef.current = L.layerGroup().addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [property?.id])

  // Handle map click for placing markers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const onClick = (e) => {
      if (placingMarker) {
        setPendingLatLng(e.latlng)
        setShowForm(true)
        setPlacingMarker(false)
      } else if (drawingSanctuary) {
        setSanctuaryPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]])
      }
    }

    map.on('click', onClick)
    return () => map.off('click', onClick)
  }, [placingMarker, drawingSanctuary])

  // Render markers on map
  useEffect(() => {
    if (!markersLayerRef.current) return
    markersLayerRef.current.clearLayers()

    const filtered = filterType === 'ALL' ? markers : markers.filter(m => m.type === filterType)

    filtered.forEach(marker => {
      const icon = createMarkerIcon(marker.type)
      const m = L.marker([marker.lat, marker.lng], { icon })
        .bindPopup(`
          <div class="font-mono text-xs">
            <div class="font-bold text-amber-400 mb-1">${marker.label}</div>
            <div class="text-gray-400">${marker.type}</div>
            ${marker.notes ? `<div class="mt-1">${marker.notes}</div>` : ''}
            ${marker.windViableDirections ? `<div class="mt-1 text-blue-300">Wind: ${JSON.parse(marker.windViableDirections).join(', ')}</div>` : ''}
          </div>
        `)
        .on('click', () => setSelectedMarker(marker))
      markersLayerRef.current.addLayer(m)
    })
  }, [markers, filterType])

  // Render sanctuary zones
  useEffect(() => {
    if (!sanctuaryLayerRef.current || !property?.sanctuaryZones) return
    sanctuaryLayerRef.current.clearLayers()

    try {
      const zones = JSON.parse(property.sanctuaryZones)
      zones.forEach(zone => {
        if (zone?.geometry?.coordinates) {
          const coords = zone.geometry.coordinates[0].map(c => [c[1], c[0]])
          L.polygon(coords, {
            color: '#22C55E',
            fillColor: '#22C55E',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5',
          }).bindPopup('<div class="font-mono text-xs text-green-400">SANCTUARY ZONE<br>No hunting recommended</div>')
            .addTo(sanctuaryLayerRef.current)
        }
      })
    } catch {}
  }, [property?.sanctuaryZones])

  // Render in-progress sanctuary drawing
  useEffect(() => {
    if (!mapInstanceRef.current || sanctuaryPoints.length < 2) return
    // Draw a temporary polygon showing the sanctuary being drawn
    const tempLayer = L.polygon(sanctuaryPoints, {
      color: '#22C55E',
      fillColor: '#22C55E',
      fillOpacity: 0.2,
      weight: 2,
      dashArray: '3, 3',
    }).addTo(mapInstanceRef.current)

    return () => tempLayer.remove()
  }, [sanctuaryPoints])

  // Save new marker
  const handleSaveMarker = async () => {
    if (!pendingLatLng || !formData.label) return
    try {
      const data = {
        propertyId: property.id,
        type: newMarkerType,
        label: formData.label,
        lat: pendingLatLng.lat,
        lng: pendingLatLng.lng,
        notes: formData.notes || null,
        windViableDirections: formData.windViableDirections.length > 0 ? formData.windViableDirections : null,
        restDaysRecommended: ['STAND', 'BLIND'].includes(newMarkerType) ? formData.restDaysRecommended : null,
      }
      const marker = await api.createMarker(data)
      setMarkers(prev => [...prev, marker])
      setShowForm(false)
      setPendingLatLng(null)
      setFormData({ label: '', notes: '', windViableDirections: [], restDaysRecommended: 7 })
    } catch (err) {
      console.error('Failed to save marker:', err)
    }
  }

  // Save sanctuary zone
  const handleSaveSanctuary = async () => {
    if (sanctuaryPoints.length < 3) return
    const coords = sanctuaryPoints.map(p => [p[1], p[0]])
    coords.push(coords[0]) // Close the polygon

    const zone = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coords] },
    }

    const existingZones = property.sanctuaryZones ? JSON.parse(property.sanctuaryZones) : []
    existingZones.push(zone)

    try {
      await api.updateSanctuaryZones(property.id, existingZones)
      onUpdate?.({ ...property, sanctuaryZones: JSON.stringify(existingZones) })
      setSanctuaryPoints([])
      setDrawingSanctuary(false)
    } catch (err) {
      console.error('Failed to save sanctuary:', err)
    }
  }

  // Delete marker
  const handleDeleteMarker = async (id) => {
    try {
      await api.deleteMarker(id)
      setMarkers(prev => prev.filter(m => m.id !== id))
      setSelectedMarker(null)
    } catch (err) {
      console.error('Failed to delete marker:', err)
    }
  }

  // Map upload
  const handleMapUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const updated = await api.uploadMap(property.id, file)
      onUpdate?.(updated)
      setShowUpload(false)
      // Reload to show overlay
      window.location.reload()
    } catch (err) {
      console.error('Failed to upload map:', err)
    }
  }

  if (!property) {
    return <div className="text-gray-500 text-center py-20">Select a property to view map</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Property Map</h2>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter */}
          <select className="input-field w-auto text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="ALL">All Markers</option>
            {MARKER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>

          {/* Upload map */}
          <button className="btn-secondary text-sm py-2" onClick={() => setShowUpload(!showUpload)}>
            Upload Map
          </button>

          {/* Place marker */}
          {!placingMarker ? (
            <button className="btn-primary text-sm py-2" onClick={() => setPlacingMarker(true)}>
              + Place Marker
            </button>
          ) : (
            <button className="bg-red-600 text-white px-4 py-2 rounded text-sm font-heading uppercase" onClick={() => setPlacingMarker(false)}>
              Cancel
            </button>
          )}

          {/* Sanctuary zone */}
          {!drawingSanctuary ? (
            <button className="btn-secondary text-sm py-2 border-green-600 text-green-400" onClick={() => setDrawingSanctuary(true)}>
              Draw Sanctuary
            </button>
          ) : (
            <div className="flex gap-2">
              <button className="bg-green-600 text-white px-3 py-2 rounded text-sm font-heading uppercase" onClick={handleSaveSanctuary} disabled={sanctuaryPoints.length < 3}>
                Save ({sanctuaryPoints.length} pts)
              </button>
              <button className="bg-red-600 text-white px-3 py-2 rounded text-sm font-heading uppercase" onClick={() => { setDrawingSanctuary(false); setSanctuaryPoints([]) }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {placingMarker && (
        <div className="bg-amber/10 border border-amber/30 rounded px-4 py-2 flex items-center gap-3">
          <span className="text-amber font-mono text-sm">CLICK MAP TO PLACE MARKER</span>
          <select className="input-field w-auto text-sm" value={newMarkerType} onChange={e => setNewMarkerType(e.target.value)}>
            {MARKER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      )}

      {drawingSanctuary && (
        <div className="bg-green-900/20 border border-green-600/30 rounded px-4 py-2 font-mono text-sm text-green-400">
          DRAWING SANCTUARY ZONE — Click map to add points (min 3). These zones tell the AI to never recommend hunting here.
        </div>
      )}

      {/* Upload overlay */}
      {showUpload && (
        <div className="card border-amber/30">
          <label className="label">Upload Satellite/Topo Map Image</label>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,.tiff" onChange={handleMapUpload} className="input-field" />
          <p className="text-gray-500 text-xs mt-1">JPG, PNG, or PDF. Will overlay on base map.</p>
        </div>
      )}

      {/* Map */}
      <div className="relative">
        <div ref={mapRef} className="w-full h-[600px] rounded-lg border border-bark/30" />

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-forest-dark/90 border border-bark/30 rounded p-3 z-[1000] max-h-48 overflow-y-auto">
          <div className="font-mono text-xs text-gray-500 mb-2 uppercase">Legend</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(MARKER_COLORS).slice(0, 10).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="font-mono text-[10px] text-gray-400">{type.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Marker Form */}
      {showForm && pendingLatLng && (
        <div className="card border-amber/50">
          <h3 className="font-heading text-lg text-amber mb-3">NEW {newMarkerType.replace(/_/g, ' ')}</h3>
          <div className="font-mono text-xs text-gray-500 mb-3">
            Lat: {pendingLatLng.lat.toFixed(6)} | Lng: {pendingLatLng.lng.toFixed(6)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Label *</label>
              <input className="input-field" value={formData.label} onChange={e => setFormData(d => ({ ...d, label: e.target.value }))} placeholder="e.g. East Ridge Stand" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input-field" value={formData.notes} onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))} placeholder="Optional notes" />
            </div>

            {['STAND', 'BLIND'].includes(newMarkerType) && (
              <>
                <div>
                  <label className="label">Viable Wind Directions</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {COMPASS_DIRS.map(dir => (
                      <button
                        key={dir}
                        className={`px-3 py-1 rounded text-xs font-mono border ${
                          formData.windViableDirections.includes(dir)
                            ? 'bg-amber/20 border-amber text-amber'
                            : 'border-bark/50 text-gray-500'
                        }`}
                        onClick={() => {
                          setFormData(d => ({
                            ...d,
                            windViableDirections: d.windViableDirections.includes(dir)
                              ? d.windViableDirections.filter(x => x !== dir)
                              : [...d.windViableDirections, dir],
                          }))
                        }}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Rest Days Recommended</label>
                  <input type="number" className="input-field" value={formData.restDaysRecommended} onChange={e => setFormData(d => ({ ...d, restDaysRecommended: parseInt(e.target.value) || 7 }))} />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button className="btn-primary text-sm py-2" onClick={handleSaveMarker}>Save Marker</button>
            <button className="btn-secondary text-sm py-2" onClick={() => { setShowForm(false); setPendingLatLng(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Selected Marker Detail */}
      {selectedMarker && (
        <div className="card border-bark/50">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-heading text-lg text-amber">{selectedMarker.label}</h3>
              <span className="font-mono text-xs text-gray-500">{selectedMarker.type.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex gap-2">
              <button className="text-red-400 hover:text-red-300 text-sm font-mono" onClick={() => handleDeleteMarker(selectedMarker.id)}>DELETE</button>
              <button className="text-gray-500 hover:text-gray-300 text-sm font-mono" onClick={() => setSelectedMarker(null)}>CLOSE</button>
            </div>
          </div>
          {selectedMarker.notes && <p className="text-sm text-gray-400 mt-2">{selectedMarker.notes}</p>}
          <div className="font-mono text-xs text-gray-500 mt-2">
            {selectedMarker.lat.toFixed(6)}, {selectedMarker.lng.toFixed(6)}
          </div>
          {selectedMarker.windViableDirections && (
            <div className="mt-2">
              <span className="label">Wind Viable</span>
              <span className="font-mono text-sm text-blue-400">
                {JSON.parse(selectedMarker.windViableDirections).join(', ')}
              </span>
            </div>
          )}
          {selectedMarker.restDaysRecommended && (
            <div className="mt-1">
              <span className="label">Rest Days</span>
              <span className="font-mono text-sm">{selectedMarker.restDaysRecommended} days</span>
            </div>
          )}
        </div>
      )}

      {/* Marker List */}
      <div className="card">
        <h3 className="font-heading text-lg text-amber mb-3 uppercase tracking-wider">
          All Markers ({markers.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {markers.map(m => (
            <div
              key={m.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-bark/20 cursor-pointer"
              onClick={() => {
                setSelectedMarker(m)
                mapInstanceRef.current?.setView([m.lat, m.lng], 17)
              }}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: MARKER_COLORS[m.type] || '#9CA3AF' }} />
              <span className="text-sm truncate">{m.label}</span>
              <span className="font-mono text-[10px] text-gray-500 ml-auto">{m.type.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
