import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api } from './lib/api'
import Dashboard from './pages/Dashboard'
import PropertyMap from './pages/PropertyMap'
import TrailCams from './pages/TrailCams'
import DeerProfiles from './pages/DeerProfiles'
import SightingLog from './pages/SightingLog'
import SignNetwork from './pages/SignNetwork'
import StandTracker from './pages/StandTracker'
import DoeGroupsPage from './pages/DoeGroupsPage'
import ReportBuilder from './pages/ReportBuilder'
import WeeklyBriefing from './pages/WeeklyBriefing'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/map', label: 'Map' },
  { path: '/trail-cams', label: 'Trail Cams' },
  { path: '/deer', label: 'Deer' },
  { path: '/sightings', label: 'Sightings' },
  { path: '/sign', label: 'Sign' },
  { path: '/stands', label: 'Stands' },
  { path: '/doe-groups', label: 'Does' },
  { path: '/reports', label: 'Reports' },
  { path: '/briefings', label: 'Briefings' },
  { path: '/settings', label: 'Settings' },
]

export default function App() {
  const [properties, setProperties] = useState([])
  const [activeProperty, setActiveProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProperties = useCallback(() => {
    api.getProperties().then(props => {
      setProperties(props)
      // Keep current selection if it still exists, otherwise pick first
      if (props.length > 0) {
        const current = activeProperty ? props.find(p => p.id === activeProperty.id) : null
        setActiveProperty(current || props[0])
      } else {
        setActiveProperty(null)
      }
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [activeProperty?.id])

  useEffect(() => {
    loadProperties()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-amber font-heading text-xl uppercase tracking-widest animate-pulse">
          Loading...
        </div>
      </div>
    )
  }

  // No properties — show onboarding
  if (properties.length === 0) {
    return <Onboarding onComplete={loadProperties} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-forest-dark border-b border-bark/30 px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-xl text-amber uppercase tracking-widest">
              Deer Predictor
            </h1>
            {activeProperty && (
              <span className="font-mono text-xs text-gray-500 border border-bark/30 px-2 py-1 rounded">
                {activeProperty.name}
              </span>
            )}
          </div>

          {properties.length > 1 && (
            <select
              className="input-field w-auto text-sm"
              value={activeProperty?.id || ''}
              onChange={e => {
                const p = properties.find(p => p.id === e.target.value)
                setActiveProperty(p)
              }}
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-forest-dark/50 border-b border-bark/20 px-4">
        <div className="max-w-[1600px] mx-auto flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 max-w-[1600px] mx-auto w-full">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard property={activeProperty} />} />
          <Route path="/map" element={<PropertyMap property={activeProperty} onUpdate={p => setActiveProperty(p)} />} />
          <Route path="/trail-cams" element={<TrailCams property={activeProperty} />} />
          <Route path="/deer" element={<DeerProfiles property={activeProperty} />} />
          <Route path="/sightings" element={<SightingLog property={activeProperty} />} />
          <Route path="/sign" element={<SignNetwork property={activeProperty} />} />
          <Route path="/stands" element={<StandTracker property={activeProperty} />} />
          <Route path="/doe-groups" element={<DoeGroupsPage property={activeProperty} />} />
          <Route path="/reports" element={<ReportBuilder property={activeProperty} />} />
          <Route path="/briefings" element={<WeeklyBriefing property={activeProperty} />} />
          <Route path="/settings" element={
            <Settings
              property={activeProperty}
              properties={properties}
              onPropertyChange={setActiveProperty}
              onRefresh={loadProperties}
            />
          } />
        </Routes>
      </main>
    </div>
  )
}
