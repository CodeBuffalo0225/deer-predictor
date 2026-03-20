import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const RUT_PHASES = [
  { value: 'pre_rut', label: 'Pre-Rut', desc: 'Bucks establishing territory, scrape activity rising' },
  { value: 'seeking', label: 'Seeking', desc: 'Bucks actively searching for does, moving long distances' },
  { value: 'chasing', label: 'Chasing', desc: 'Bucks chasing does, most daylight movement' },
  { value: 'peak_rut', label: 'Peak Rut', desc: 'Peak breeding, bucks locked on individual does' },
  { value: 'lockdown', label: 'Lockdown', desc: 'Bucks paired with does, minimal visible movement' },
  { value: 'post_rut', label: 'Post-Rut', desc: 'Bucks recovering, secondary rut possible' },
]

const HUNT_TYPES = [
  { value: 'morning', label: 'Morning Hunt' },
  { value: 'afternoon', label: 'Afternoon Hunt' },
  { value: 'all_day', label: 'All Day Sit' },
]

const PRIORITIES = [
  { value: 'max_probability', label: 'Max Probability', desc: 'Best chance to see target deer' },
  { value: 'minimize_pressure', label: 'Minimize Pressure', desc: 'Play the long game — preserve stands' },
  { value: 'all_in', label: 'All In', desc: 'No holds barred — final chance mentality' },
]

export default function ReportBuilder({ property }) {
  const [step, setStep] = useState(1)
  const [deer, setDeer] = useState([])
  const [markers, setMarkers] = useState([])
  const [reports, setReports] = useState([])

  const [config, setConfig] = useState({
    reportType: 'specific_deer',
    selectedDeerIds: [],
    dateStart: '',
    dateEnd: '',
    quickWindow: '7_days',
    rutPhase: 'pre_rut',
    windDirections: [],
    huntingPressure: 'low',
    recentObservations: '',
    priority: 'max_probability',
    huntType: 'morning',
    acceptableStands: [],
    hunterNotes: '',
  })

  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState(null)

  useEffect(() => {
    if (!property) return
    api.getDeer(property.id).then(setDeer).catch(console.error)
    api.getMarkers(property.id).then(setMarkers).catch(console.error)
    api.getReports(property.id).then(setReports).catch(console.error)
  }, [property])

  const stands = markers.filter(m => m.type === 'STAND' || m.type === 'BLIND')
  const windDirs = ['N','NE','E','SE','S','SW','W','NW']

  const handleGenerate = async () => {
    setGenerating(true)
    setReport(null)
    // Simulated report since this requires Claude API
    setTimeout(() => {
      setReport({
        narrative: `**Prediction Report for ${property.name}**\n\nBased on current ${config.rutPhase.replace('_', ' ')} conditions and ${config.huntType} hunt preference, here are the recommendations:\n\nThis report requires an active Claude API key to generate AI-powered predictions. Configure your key in Settings > General > Claude API Key.\n\nWhen configured, the system will:\n1. Build a condition fingerprint from your inputs\n2. Retrieve the most similar historical sightings via vector similarity\n3. Stream a detailed narrative prediction with stand recommendations\n4. Generate structured JSON for map overlay rendering`,
        generatedAt: new Date().toISOString(),
      })
      setGenerating(false)
    }, 1500)
  }

  if (!property) {
    return <div className="flex items-center justify-center h-96"><p className="text-gray-500">Select a property first</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-amber uppercase tracking-wider">Report Builder</h2>
        <span className="font-mono text-xs text-gray-500">Step {step} of 4</span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-bark/30 rounded-full overflow-hidden">
        <div className="h-full bg-amber rounded-full transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      {/* Step 1: Subject */}
      {step === 1 && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase">Select Subject</h3>
          <div className="space-y-2">
            {[
              { value: 'specific_deer', label: 'Specific Deer' },
              { value: 'all_bucks', label: 'All Bucks' },
              { value: 'property_overview', label: 'Property Overview' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-3 p-2 rounded hover:bg-forest-dark cursor-pointer">
                <input type="radio" name="reportType" className="accent-amber"
                  checked={config.reportType === opt.value}
                  onChange={() => setConfig(c => ({ ...c, reportType: opt.value }))} />
                <span className="font-heading text-sm uppercase text-gray-200">{opt.label}</span>
              </label>
            ))}
          </div>

          {config.reportType === 'specific_deer' && (
            <div>
              <label className="label">Select Deer</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {deer.filter(d => d.sex === 'buck').map(d => (
                  <label key={d.id} className="flex items-center gap-2 p-2 rounded hover:bg-forest-dark cursor-pointer">
                    <input type="checkbox" className="accent-amber"
                      checked={config.selectedDeerIds.includes(d.id)}
                      onChange={e => {
                        setConfig(c => ({
                          ...c,
                          selectedDeerIds: e.target.checked
                            ? [...c.selectedDeerIds, d.id]
                            : c.selectedDeerIds.filter(id => id !== d.id)
                        }))
                      }} />
                    <span className="text-sm text-gray-200">{d.name}</span>
                    {d.antlerPoints && <span className="font-mono text-xs text-gray-500">{d.antlerPoints}pt</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button className="btn-primary text-sm py-2 w-full" onClick={() => setStep(2)}>
            Next: Conditions
          </button>
        </div>
      )}

      {/* Step 2: Conditions */}
      {step === 2 && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase">Current Conditions</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rut Phase</label>
              <select className="input-field" value={config.rutPhase}
                onChange={e => setConfig(c => ({ ...c, rutPhase: e.target.value }))}>
                {RUT_PHASES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <p className="text-gray-600 text-xs mt-1">{RUT_PHASES.find(r => r.value === config.rutPhase)?.desc}</p>
            </div>
            <div>
              <label className="label">Hunting Pressure</label>
              <select className="input-field" value={config.huntingPressure}
                onChange={e => setConfig(c => ({ ...c, huntingPressure: e.target.value }))}>
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Expected Wind Directions</label>
            <div className="flex gap-2 flex-wrap">
              {windDirs.map(d => (
                <button key={d}
                  className={`px-3 py-1 rounded font-mono text-xs ${
                    config.windDirections.includes(d)
                      ? 'bg-amber text-forest-dark'
                      : 'bg-forest-dark text-gray-400 hover:bg-bark/50'
                  }`}
                  onClick={() => setConfig(c => ({
                    ...c,
                    windDirections: c.windDirections.includes(d)
                      ? c.windDirections.filter(x => x !== d)
                      : [...c.windDirections, d]
                  }))}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Recent Observations</label>
            <textarea className="input-field" rows={3} value={config.recentObservations}
              onChange={e => setConfig(c => ({ ...c, recentObservations: e.target.value }))}
              placeholder="e.g. Saw him Tuesday at the creek crossing going south" />
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1 py-2" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary flex-1 py-2" onClick={() => setStep(3)}>Next: Strategy</button>
          </div>
        </div>
      )}

      {/* Step 3: Strategy */}
      {step === 3 && (
        <div className="card space-y-4">
          <h3 className="font-heading text-lg text-amber uppercase">Hunter Preference</h3>

          <div className="space-y-2">
            {PRIORITIES.map(p => (
              <label key={p.value} className="flex items-start gap-3 p-2 rounded hover:bg-forest-dark cursor-pointer">
                <input type="radio" name="priority" className="mt-1 accent-amber"
                  checked={config.priority === p.value}
                  onChange={() => setConfig(c => ({ ...c, priority: p.value }))} />
                <div>
                  <span className="font-heading text-sm uppercase text-gray-200">{p.label}</span>
                  <p className="text-gray-500 text-xs">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div>
            <label className="label">Hunt Type</label>
            <div className="flex gap-2">
              {HUNT_TYPES.map(h => (
                <button key={h.value}
                  className={`flex-1 py-2 rounded font-heading text-sm uppercase ${
                    config.huntType === h.value
                      ? 'bg-amber text-forest-dark'
                      : 'bg-forest-dark text-gray-400 hover:bg-bark/50'
                  }`}
                  onClick={() => setConfig(c => ({ ...c, huntType: h.value }))}>
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Acceptable Stands</label>
            <div className="grid grid-cols-2 gap-2">
              {stands.map(s => (
                <label key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-forest-dark cursor-pointer">
                  <input type="checkbox" className="accent-amber"
                    checked={config.acceptableStands.includes(s.id)}
                    onChange={e => setConfig(c => ({
                      ...c,
                      acceptableStands: e.target.checked
                        ? [...c.acceptableStands, s.id]
                        : c.acceptableStands.filter(id => id !== s.id)
                    }))} />
                  <span className="text-sm text-gray-200">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Hunter Knowledge Notes</label>
            <textarea className="input-field" rows={2} value={config.hunterNotes}
              onChange={e => setConfig(c => ({ ...c, hunterNotes: e.target.value }))}
              placeholder="e.g. He always goes nocturnal after I hunt the east ridge" />
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1 py-2" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary flex-1 py-2" onClick={() => setStep(4)}>Generate Report</button>
          </div>
        </div>
      )}

      {/* Step 4: Generate */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-heading text-lg text-amber uppercase mb-3">Report Configuration</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="label">Type</span><p className="text-gray-200">{config.reportType.replace(/_/g, ' ')}</p></div>
              <div><span className="label">Rut Phase</span><p className="text-gray-200">{config.rutPhase.replace(/_/g, ' ')}</p></div>
              <div><span className="label">Priority</span><p className="text-gray-200">{config.priority.replace(/_/g, ' ')}</p></div>
              <div><span className="label">Hunt</span><p className="text-gray-200">{config.huntType}</p></div>
            </div>

            {!report && (
              <button className="btn-primary w-full py-3 mt-4" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generating Report...' : 'Generate AI Prediction Report'}
              </button>
            )}
          </div>

          {report && (
            <div className="card border-amber/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg text-amber uppercase">Prediction Report</h3>
                <span className="font-mono text-xs text-gray-500">
                  {new Date(report.generatedAt).toLocaleString()}
                </span>
              </div>
              <div className="prose prose-sm prose-invert max-w-none">
                {report.narrative.split('\n').map((line, i) => (
                  <p key={i} className="text-gray-300 text-sm mb-2">{line}</p>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button className="btn-secondary text-sm py-2" onClick={() => { setReport(null); setStep(2) }}>
                  Adjust & Regenerate
                </button>
                <button className="btn-secondary text-sm py-2" onClick={() => { setReport(null); setStep(1) }}>
                  New Report
                </button>
              </div>
            </div>
          )}

          {!report && (
            <button className="text-gray-500 hover:text-gray-300 text-xs font-mono" onClick={() => setStep(3)}>
              Back to Strategy
            </button>
          )}
        </div>
      )}

      {/* Past Reports */}
      {reports.length > 0 && step === 1 && (
        <div className="card">
          <h3 className="font-heading text-lg text-amber mb-3 uppercase tracking-wider">Past Reports ({reports.length})</h3>
          <div className="space-y-2">
            {reports.slice(0, 10).map(r => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-bark/20 last:border-0">
                <span className="font-mono text-xs text-gray-500">
                  {new Date(r.generatedAt).toLocaleDateString()}
                </span>
                <span className="text-sm text-gray-200 truncate">{r.narrativeReport?.slice(0, 80)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
