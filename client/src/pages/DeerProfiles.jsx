import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function DeerProfiles({ property }) {
  const [deer, setDeer] = useState([])
  const [selectedDeer, setSelectedDeer] = useState(null)
  const [filterSex, setFilterSex] = useState('')

  useEffect(() => {
    if (!property) return
    api.getDeer(property.id).then(setDeer).catch(console.error)
  }, [property])

  const filtered = filterSex ? deer.filter(d => d.sex === filterSex) : deer

  if (!property) {
    return <div className="text-gray-500 text-center py-20">Select a property</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Deer Profiles</h2>
        <div className="flex gap-2">
          <select className="input-field w-auto text-sm" value={filterSex} onChange={e => setFilterSex(e.target.value)}>
            <option value="">All</option>
            <option value="buck">Bucks</option>
            <option value="doe">Does</option>
          </select>
        </div>
      </div>

      {/* Buck Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(d => {
          const latestSnapshot = d.snapshots?.[0]
          return (
            <div
              key={d.id}
              className="card cursor-pointer hover:border-amber/50 transition-colors"
              onClick={() => setSelectedDeer(d)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-heading text-lg text-amber">{d.name}</h3>
                  {d.nickname && d.nickname !== d.name && (
                    <span className="font-mono text-xs text-gray-500">"{d.nickname}"</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase ${
                  d.sex === 'buck' ? 'bg-blue-900/30 text-blue-400' :
                  d.sex === 'doe' ? 'bg-pink-900/30 text-pink-400' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {d.sex}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div>
                  <span className="text-gray-500">Age:</span>{' '}
                  <span className="text-gray-300">{d.currentEstimatedAge || '?'} yr</span>
                </div>
                {d.antlerPoints && (
                  <div>
                    <span className="text-gray-500">Points:</span>{' '}
                    <span className="text-gray-300">{d.antlerPoints}-pt</span>
                  </div>
                )}
                {latestSnapshot?.estimatedScore && (
                  <div>
                    <span className="text-gray-500">Score:</span>{' '}
                    <span className="text-amber">{latestSnapshot.estimatedScore}"</span>
                  </div>
                )}
                {latestSnapshot?.daylightHitPercent != null && (
                  <div>
                    <span className="text-gray-500">Daylight:</span>{' '}
                    <span className={latestSnapshot.daylightHitPercent > 40 ? 'text-green-400' : 'text-red-400'}>
                      {latestSnapshot.daylightHitPercent}%
                    </span>
                  </div>
                )}
              </div>

              {d.isNocturnal && (
                <div className="mt-2 text-xs text-red-400 font-mono uppercase">Ghost Buck Mode</div>
              )}

              <div className="mt-2 text-xs text-gray-500 line-clamp-2">{d.distinguishingFeatures}</div>

              {/* Score trajectory */}
              {d.snapshots?.length > 1 && (
                <div className="mt-2 flex items-end gap-1 h-8">
                  {d.snapshots.slice().reverse().map((snap, i) => {
                    const maxScore = Math.max(...d.snapshots.map(s => s.estimatedScore || 0))
                    const height = snap.estimatedScore ? (snap.estimatedScore / maxScore) * 100 : 10
                    return (
                      <div key={snap.id} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className="w-full bg-amber/60 rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${snap.season}: ${snap.estimatedScore}"`}
                        />
                        <span className="text-[8px] text-gray-600">{snap.season}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Deer Detail */}
      {selectedDeer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDeer(null)}>
          <div className="bg-forest-light border border-bark/30 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-heading text-2xl text-amber">{selectedDeer.name}</h3>
                <p className="font-mono text-sm text-gray-500">{selectedDeer.sex} | {selectedDeer.species} | Age: {selectedDeer.currentEstimatedAge} yr</p>
              </div>
              <button className="text-gray-500 hover:text-gray-300 font-mono" onClick={() => setSelectedDeer(null)}>CLOSE</button>
            </div>

            {selectedDeer.antlerDescription && (
              <p className="text-sm text-gray-300 mb-2"><span className="text-amber font-mono text-xs">ANTLERS:</span> {selectedDeer.antlerDescription}</p>
            )}
            {selectedDeer.distinguishingFeatures && (
              <p className="text-sm text-gray-300 mb-2"><span className="text-amber font-mono text-xs">ID FEATURES:</span> {selectedDeer.distinguishingFeatures}</p>
            )}
            {selectedDeer.notes && (
              <p className="text-sm text-gray-400 mb-4">{selectedDeer.notes}</p>
            )}

            {selectedDeer.isNocturnal && (
              <div className="bg-red-900/20 border border-red-600/30 rounded p-3 mb-4 font-mono text-sm text-red-400">
                GHOST BUCK MODE — {'>'} 80% nocturnal cam hits. Standard prediction models adjusted.
              </div>
            )}

            {/* Season Snapshots */}
            {selectedDeer.snapshots?.length > 0 && (
              <div>
                <h4 className="font-heading text-lg text-amber mb-3 uppercase tracking-wider">Season History</h4>
                <div className="space-y-4">
                  {selectedDeer.snapshots.map(snap => (
                    <div key={snap.id} className="card">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-heading text-amber">{snap.season} Season</h5>
                        {snap.estimatedScore && (
                          <span className="stat-value text-lg">{snap.estimatedScore}"</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                        <div><span className="text-gray-500">Age:</span> {snap.estimatedAge} yr</div>
                        <div><span className="text-gray-500">Points:</span> {snap.antlerPoints}-pt</div>
                        <div><span className="text-gray-500">Body:</span> {snap.bodyConditionRating}</div>
                        <div><span className="text-gray-500">Weight:</span> {snap.peakWeightEstimate}</div>
                        <div><span className="text-gray-500">Sightings:</span> {snap.totalSightings}</div>
                        <div><span className="text-gray-500">Cam Hits:</span> {snap.totalCamHits}</div>
                        <div><span className="text-gray-500">Daylight:</span> <span className={snap.daylightHitPercent > 40 ? 'text-green-400' : 'text-red-400'}>{snap.daylightHitPercent}%</span></div>
                      </div>
                      {snap.aiAnnualSummary && (
                        <p className="text-sm text-gray-400 mt-2">{snap.aiAnnualSummary}</p>
                      )}
                      {snap.growthDeltaNotes && (
                        <p className="text-xs text-amber/80 mt-1 font-mono">{snap.growthDeltaNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
