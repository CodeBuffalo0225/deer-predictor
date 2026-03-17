import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Dashboard({ property }) {
  const [stats, setStats] = useState(null)
  const [recentSightings, setRecentSightings] = useState([])
  const [queueStatus, setQueueStatus] = useState(null)

  useEffect(() => {
    if (!property) return
    Promise.all([
      api.getProperty(property.id),
      api.getSightings(property.id),
      api.getQueueStatus(property.id),
      api.getDeer(property.id),
    ]).then(([prop, sightings, queue, deer]) => {
      setStats({
        totalDeer: deer.length,
        totalBucks: deer.filter(d => d.sex === 'buck').length,
        totalSightings: sightings.length,
        seasons: prop.seasons?.length || 0,
        markers: prop.markers?.length || prop._count?.markers || 0,
        photos: prop._count?.photos || 0,
      })
      setRecentSightings(sightings.slice(0, 10))
      setQueueStatus(queue)
    }).catch(console.error)
  }, [property])

  if (!property) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="font-heading text-2xl text-amber mb-2">NO PROPERTY LOADED</h2>
          <p className="text-gray-500">Create a property to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">
          {property.name} — Dashboard
        </h2>
        <span className="font-mono text-xs text-gray-500">
          {property.acreage} acres | {property.county}, {property.state}
        </span>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Deer Profiled', value: stats.totalDeer },
            { label: 'Bucks', value: stats.totalBucks },
            { label: 'Sightings', value: stats.totalSightings },
            { label: 'Seasons', value: stats.seasons },
            { label: 'Markers', value: stats.markers },
            { label: 'Photos', value: stats.photos },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Queue Status */}
      {queueStatus && queueStatus.pending > 0 && (
        <div className="card border-amber/50">
          <h3 className="font-heading text-lg text-amber mb-2">AI ANALYSIS QUEUE</h3>
          <div className="grid grid-cols-4 gap-4">
            <div><span className="stat-value text-yellow-400">{queueStatus.pending}</span><div className="stat-label">Pending</div></div>
            <div><span className="stat-value text-blue-400">{queueStatus.processing}</span><div className="stat-label">Processing</div></div>
            <div><span className="stat-value text-green-400">{queueStatus.complete}</span><div className="stat-label">Complete</div></div>
            <div><span className="stat-value text-red-400">{queueStatus.failed}</span><div className="stat-label">Failed</div></div>
          </div>
        </div>
      )}

      {/* Recent Sightings */}
      <div className="card">
        <h3 className="font-heading text-lg text-amber mb-3 uppercase tracking-wider">Recent Sightings</h3>
        {recentSightings.length === 0 ? (
          <p className="text-gray-500 text-sm">No sightings recorded yet</p>
        ) : (
          <div className="space-y-2">
            {recentSightings.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-bark/20 last:border-0">
                <span className="font-mono text-xs text-gray-500 w-32 shrink-0">
                  {new Date(s.observedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded uppercase font-mono ${
                  s.type === 'trail_cam' ? 'bg-blue-900/30 text-blue-400' :
                  s.type === 'in_person' ? 'bg-green-900/30 text-green-400' :
                  'bg-yellow-900/30 text-yellow-400'
                }`}>
                  {s.type.replace('_', ' ')}
                </span>
                <span className="text-sm">{s.behavior || 'unknown'}</span>
                {s.locationMarker && (
                  <span className="text-xs text-gray-500">@ {s.locationMarker.label}</span>
                )}
                {s.barometricPressure && (
                  <span className="font-mono text-xs text-gray-500 ml-auto">
                    {s.barometricPressure}" {s.pressureTrend === 'falling' ? '\u2193' : s.pressureTrend === 'rising' ? '\u2191' : '\u2192'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
