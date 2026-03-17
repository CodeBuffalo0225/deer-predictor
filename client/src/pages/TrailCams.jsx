import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { api } from '../lib/api'

export default function TrailCams({ property }) {
  const [photos, setPhotos] = useState([])
  const [markers, setMarkers] = useState([])
  const [seasons, setSeasons] = useState([])
  const [totalPhotos, setTotalPhotos] = useState(0)
  const [page, setPage] = useState(1)
  const [queueStatus, setQueueStatus] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showHistorical, setShowHistorical] = useState(false)
  const [historicalPath, setHistoricalPath] = useState('')
  const [historicalResult, setHistoricalResult] = useState(null)
  const [importingHistorical, setImportingHistorical] = useState(false)

  // Upload metadata
  const [uploadSeason, setUploadSeason] = useState('')
  const [uploadCamera, setUploadCamera] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCamera, setFilterCamera] = useState('')

  // Load data
  useEffect(() => {
    if (!property) return
    const params = { propertyId: property.id, page, limit: 50 }
    if (filterStatus) params.analysisStatus = filterStatus
    if (filterCamera) params.cameraMarkerId = filterCamera

    Promise.all([
      api.getPhotos(params),
      api.getMarkers(property.id),
      api.getSeasons(property.id),
      api.getQueueStatus(property.id),
    ]).then(([photoData, markersData, seasonsData, queue]) => {
      setPhotos(photoData.photos)
      setTotalPhotos(photoData.total)
      setMarkers(markersData.filter(m => m.type === 'TRAIL_CAM'))
      setSeasons(seasonsData)
      setQueueStatus(queue)
    }).catch(console.error)
  }, [property, page, filterStatus, filterCamera])

  // Dropzone for bulk upload
  const onDrop = useCallback(async (acceptedFiles) => {
    if (!property || acceptedFiles.length === 0) return
    setUploading(true)
    setUploadResult(null)

    try {
      const result = await api.uploadPhotos(acceptedFiles, {
        propertyId: property.id,
        seasonId: uploadSeason || undefined,
        season: seasons.find(s => s.id === uploadSeason)?.year?.toString() || undefined,
        cameraMarkerId: uploadCamera || undefined,
      })
      setUploadResult(result)

      // Refresh photos
      const photoData = await api.getPhotos({ propertyId: property.id, page: 1, limit: 50 })
      setPhotos(photoData.photos)
      setTotalPhotos(photoData.total)
      setPage(1)

      // Refresh queue
      const queue = await api.getQueueStatus(property.id)
      setQueueStatus(queue)
    } catch (err) {
      setUploadResult({ error: err.message })
    } finally {
      setUploading(false)
    }
  }, [property, uploadSeason, uploadCamera, seasons])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'] },
    disabled: uploading,
  })

  // Analyze batch
  const handleAnalyzeBatch = async () => {
    if (!property) return
    setAnalyzing(true)
    try {
      await api.analyzeBatch(property.id, 50)
      // Poll queue status
      const poll = setInterval(async () => {
        const queue = await api.getQueueStatus(property.id)
        setQueueStatus(queue)
        if (queue.pending === 0 && queue.processing === 0) {
          clearInterval(poll)
          setAnalyzing(false)
          // Refresh photos
          const photoData = await api.getPhotos({ propertyId: property.id, page, limit: 50 })
          setPhotos(photoData.photos)
        }
      }, 3000)
    } catch (err) {
      console.error('Analyze batch error:', err)
      setAnalyzing(false)
    }
  }

  // Historical import
  const handleHistoricalImport = async () => {
    if (!property || !historicalPath) return
    setImportingHistorical(true)
    try {
      const result = await api.importHistorical({
        propertyId: property.id,
        basePath: historicalPath,
        cameraMarkerId: uploadCamera || undefined,
      })
      setHistoricalResult(result)

      // Refresh data
      const [photoData, queue, seasonsData] = await Promise.all([
        api.getPhotos({ propertyId: property.id, page: 1, limit: 50 }),
        api.getQueueStatus(property.id),
        api.getSeasons(property.id),
      ])
      setPhotos(photoData.photos)
      setTotalPhotos(photoData.total)
      setQueueStatus(queue)
      setSeasons(seasonsData)
    } catch (err) {
      setHistoricalResult({ error: err.message })
    } finally {
      setImportingHistorical(false)
    }
  }

  if (!property) {
    return <div className="text-gray-500 text-center py-20">Select a property to manage trail cams</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Trail Cam Photos</h2>
        <div className="flex gap-2">
          <button
            className="btn-secondary text-sm py-2"
            onClick={() => setShowHistorical(!showHistorical)}
          >
            Historical Import
          </button>
          {queueStatus?.pending > 0 && (
            <button
              className="btn-primary text-sm py-2"
              onClick={handleAnalyzeBatch}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : `Analyze ${queueStatus.pending} Photos`}
            </button>
          )}
        </div>
      </div>

      {/* Queue Status */}
      {queueStatus && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: queueStatus.total, color: 'text-gray-300' },
            { label: 'Pending', value: queueStatus.pending, color: 'text-yellow-400' },
            { label: 'Processing', value: queueStatus.processing, color: 'text-blue-400' },
            { label: 'Complete', value: queueStatus.complete, color: 'text-green-400' },
            { label: 'Failed', value: queueStatus.failed, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className={`font-mono text-xl font-semibold ${s.color}`}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Section */}
      <div className="card">
        <h3 className="font-heading text-lg text-amber mb-3 uppercase tracking-wider">Bulk Upload</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Season</label>
            <select className="input-field" value={uploadSeason} onChange={e => setUploadSeason(e.target.value)}>
              <option value="">Select season...</option>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.label || s.year}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Camera Location</label>
            <select className="input-field" value={uploadCamera} onChange={e => setUploadCamera(e.target.value)}>
              <option value="">Select camera...</option>
              {markers.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-amber bg-amber/5' : 'border-bark/50 hover:border-amber/50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div>
              <div className="text-amber font-heading text-lg mb-1">UPLOADING...</div>
              <p className="text-gray-500 text-sm">Processing photos, extracting EXIF, generating thumbnails...</p>
            </div>
          ) : isDragActive ? (
            <div className="text-amber font-heading text-lg">DROP PHOTOS HERE</div>
          ) : (
            <div>
              <div className="text-gray-400 font-heading text-lg mb-1">DRAG & DROP TRAIL CAM PHOTOS</div>
              <p className="text-gray-500 text-sm">Supports 500+ photos per batch. JPG, PNG, TIFF.</p>
              <p className="text-gray-600 text-xs mt-2">Auto: EXIF extraction, thumbnails, weather backfill, moon phase</p>
            </div>
          )}
        </div>

        {uploadResult && (
          <div className={`mt-3 p-3 rounded font-mono text-sm ${
            uploadResult.error ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'
          }`}>
            {uploadResult.error
              ? `Error: ${uploadResult.error}`
              : `Uploaded: ${uploadResult.uploaded} | Failed: ${uploadResult.failed} | Total: ${uploadResult.total}`
            }
          </div>
        )}
      </div>

      {/* Historical Import Section */}
      {showHistorical && (
        <div className="card border-amber/30">
          <h3 className="font-heading text-lg text-amber mb-3 uppercase tracking-wider">Historical Bulk Import</h3>
          <p className="text-gray-400 text-sm mb-4">
            Import old photos organized by year folder (e.g. /path/to/photos/2021/, 2022/, 2023/).
            Each year becomes a season. All photos get EXIF parsed, weather backfilled, and queued for AI analysis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Base Folder Path</label>
              <input
                className="input-field"
                value={historicalPath}
                onChange={e => setHistoricalPath(e.target.value)}
                placeholder="/path/to/trail-cam-archive"
              />
            </div>
            <div>
              <label className="label">Camera Location (optional)</label>
              <select className="input-field" value={uploadCamera} onChange={e => setUploadCamera(e.target.value)}>
                <option value="">Select camera...</option>
                {markers.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <button
            className="btn-primary text-sm py-2"
            onClick={handleHistoricalImport}
            disabled={importingHistorical || !historicalPath}
          >
            {importingHistorical ? 'Importing...' : 'Start Historical Import'}
          </button>

          {historicalResult && (
            <div className={`mt-3 p-3 rounded font-mono text-sm ${
              historicalResult.error ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'
            }`}>
              {historicalResult.error
                ? `Error: ${historicalResult.error}`
                : (
                  <div>
                    <div>Total imported: {historicalResult.totalImported} | Failed: {historicalResult.totalFailed}</div>
                    {historicalResult.seasons?.map(s => (
                      <div key={s.year} className="ml-4">
                        {s.year}: {s.imported} photos ({s.failed} failed)
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <select className="input-field w-auto text-sm" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="pending">Pending Analysis</option>
          <option value="complete">Analyzed</option>
          <option value="failed">Failed</option>
        </select>
        <select className="input-field w-auto text-sm" value={filterCamera} onChange={e => { setFilterCamera(e.target.value); setPage(1) }}>
          <option value="">All Cameras</option>
          {markers.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <span className="font-mono text-xs text-gray-500">{totalPhotos} photos total</span>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {photos.map(photo => (
          <div
            key={photo.id}
            className="card p-0 overflow-hidden cursor-pointer hover:border-amber/50 transition-colors"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="aspect-[4/3] bg-forest-dark relative">
              {photo.thumbPath ? (
                <img src={`/${photo.thumbPath}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-600 font-mono text-xs">
                  No Thumb
                </div>
              )}

              {/* Status badge */}
              <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                photo.analysisStatus === 'complete' ? 'bg-green-900/80 text-green-400' :
                photo.analysisStatus === 'processing' ? 'bg-blue-900/80 text-blue-400' :
                photo.analysisStatus === 'failed' ? 'bg-red-900/80 text-red-400' :
                'bg-yellow-900/80 text-yellow-400'
              }`}>
                {photo.analysisStatus}
              </div>

              {/* Deer count */}
              {photo.detectedDeer && (
                <div className="absolute bottom-2 left-2 bg-amber/90 text-forest-dark px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                  {photo.deerCount} DEER
                </div>
              )}
            </div>

            <div className="p-2">
              <div className="font-mono text-[10px] text-gray-500">
                {photo.capturedAt ? new Date(photo.capturedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Unknown date'}
              </div>
              {photo.cameraMarker && (
                <div className="font-mono text-[10px] text-gray-600 truncate">{photo.cameraMarker.label}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPhotos > 50 && (
        <div className="flex items-center justify-center gap-4">
          <button className="btn-secondary text-sm py-1" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span className="font-mono text-sm text-gray-500">Page {page} of {Math.ceil(totalPhotos / 50)}</span>
          <button className="btn-secondary text-sm py-1" disabled={page >= Math.ceil(totalPhotos / 50)} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="bg-forest-light border border-bark/30 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex">
              {/* Image */}
              <div className="flex-1 bg-forest-dark">
                <img src={`/${selectedPhoto.filePath}`} alt="" className="w-full object-contain max-h-[60vh]" />
              </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg text-amber">Photo Details</h3>
                <div className="flex gap-2">
                  {selectedPhoto.analysisStatus === 'pending' && (
                    <button
                      className="btn-primary text-xs py-1 px-3"
                      onClick={async () => {
                        try {
                          const result = await api.analyzePhoto(selectedPhoto.id)
                          setSelectedPhoto(result)
                          setPhotos(prev => prev.map(p => p.id === result.id ? result : p))
                        } catch (err) {
                          console.error(err)
                        }
                      }}
                    >
                      Analyze Now
                    </button>
                  )}
                  <button className="text-gray-500 hover:text-gray-300 font-mono text-sm" onClick={() => setSelectedPhoto(null)}>CLOSE</button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                <div><span className="text-gray-500">Captured:</span><br />{selectedPhoto.capturedAt ? new Date(selectedPhoto.capturedAt).toLocaleString() : 'Unknown'}</div>
                <div><span className="text-gray-500">Time of Day:</span><br />{selectedPhoto.timeOfDay || 'N/A'}</div>
                <div><span className="text-gray-500">Temp:</span><br />{selectedPhoto.temperature ? `${selectedPhoto.temperature}°F` : 'N/A'}</div>
                <div><span className="text-gray-500">Pressure:</span><br />{selectedPhoto.barometricPressure ? `${selectedPhoto.barometricPressure}" ${selectedPhoto.pressureTrend || ''}` : 'N/A'}</div>
                <div><span className="text-gray-500">Moon:</span><br />{selectedPhoto.moonPhase?.replace(/_/g, ' ') || 'N/A'} {selectedPhoto.moonIllumination != null ? `(${selectedPhoto.moonIllumination}%)` : ''}</div>
                <div><span className="text-gray-500">Status:</span><br /><span className={
                  selectedPhoto.analysisStatus === 'complete' ? 'text-green-400' :
                  selectedPhoto.analysisStatus === 'failed' ? 'text-red-400' : 'text-yellow-400'
                }>{selectedPhoto.analysisStatus}</span></div>
                <div><span className="text-gray-500">Deer:</span><br />{selectedPhoto.detectedDeer ? `${selectedPhoto.deerCount} detected` : 'None'}</div>
                <div><span className="text-gray-500">Camera:</span><br />{selectedPhoto.cameraMarker?.label || 'Unknown'}</div>
              </div>

              {/* AI Analysis */}
              {selectedPhoto.deerAnalysis && (
                <div>
                  <h4 className="font-heading text-sm text-amber mb-2 uppercase">AI Analysis</h4>
                  <div className="bg-forest-dark p-3 rounded font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(JSON.parse(selectedPhoto.deerAnalysis), null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
