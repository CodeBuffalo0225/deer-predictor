const API_BASE = '/api'

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Properties
  getProperties: () => request('/properties'),
  getProperty: (id) => request(`/properties/${id}`),
  createProperty: (data) => request('/properties', { method: 'POST', body: JSON.stringify(data) }),
  updateProperty: (id, data) => request(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProperty: (id) => request(`/properties/${id}`, { method: 'DELETE' }),
  updateSanctuaryZones: (id, zones) => request(`/properties/${id}/sanctuary-zones`, { method: 'PUT', body: JSON.stringify({ zones }) }),
  uploadMap: async (id, file) => {
    const formData = new FormData()
    formData.append('map', file)
    const res = await fetch(`${API_BASE}/properties/${id}/map`, { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },

  // Markers
  getMarkers: (propertyId) => request(`/markers?propertyId=${propertyId}`),
  createMarker: (data) => request('/markers', { method: 'POST', body: JSON.stringify(data) }),
  updateMarker: (id, data) => request(`/markers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMarker: (id) => request(`/markers/${id}`, { method: 'DELETE' }),

  // Photos
  getPhotos: (params) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/photos?${qs}`)
  },
  getPhoto: (id) => request(`/photos/${id}`),
  uploadPhotos: async (files, metadata) => {
    const formData = new FormData()
    for (const file of files) formData.append('photos', file)
    Object.entries(metadata).forEach(([k, v]) => { if (v) formData.append(k, v) })
    const res = await fetch(`${API_BASE}/photos/upload`, { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },
  analyzePhoto: (id) => request(`/photos/${id}/analyze`, { method: 'POST' }),
  analyzeBatch: (propertyId, limit) => request('/photos/analyze-batch', { method: 'POST', body: JSON.stringify({ propertyId, limit }) }),
  getQueueStatus: (propertyId) => request(`/photos/queue/status?propertyId=${propertyId || ''}`),
  importHistorical: (data) => request('/photos/import-historical', { method: 'POST', body: JSON.stringify(data) }),
  updatePhoto: (id, data) => request(`/photos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePhoto: (id) => request(`/photos/${id}`, { method: 'DELETE' }),

  // Deer
  getDeer: (propertyId) => request(`/deer?propertyId=${propertyId || ''}`),
  getDeerById: (id) => request(`/deer/${id}`),
  createDeer: (data) => request('/deer', { method: 'POST', body: JSON.stringify(data) }),
  updateDeer: (id, data) => request(`/deer/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Sightings
  getSightings: (propertyId) => request(`/sightings?propertyId=${propertyId || ''}`),
  createSighting: (data) => request('/sightings', { method: 'POST', body: JSON.stringify(data) }),

  // Sign
  getSign: (propertyId) => request(`/sign?propertyId=${propertyId || ''}`),
  createSign: (data) => request('/sign', { method: 'POST', body: JSON.stringify(data) }),

  // Stands
  getStandLogs: (propertyId) => request(`/stands?propertyId=${propertyId || ''}`),
  createStandLog: (data) => request('/stands', { method: 'POST', body: JSON.stringify(data) }),

  // Doe Groups
  getDoeGroups: (propertyId) => request(`/doe-groups?propertyId=${propertyId || ''}`),

  // Seasons
  getSeasons: (propertyId) => request(`/seasonal/seasons?propertyId=${propertyId || ''}`),
  createSeason: (propertyId, data) => request(`/properties/${propertyId}/seasons`, { method: 'POST', body: JSON.stringify(data) }),

  // Semantic search
  semanticSearch: (query, propertyId) => request('/seasonal/search', { method: 'POST', body: JSON.stringify({ query, propertyId }) }),
}
