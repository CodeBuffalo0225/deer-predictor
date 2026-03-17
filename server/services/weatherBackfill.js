const BASE = 'https://api.open-meteo.com/v1'

/**
 * Get historical weather for a specific datetime and location
 */
export async function getHistoricalWeather(lat, lng, datetime) {
  const date = datetime.toISOString().split('T')[0]
  const hour = datetime.getUTCHours()

  const url = `${BASE}/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${date}&end_date=${date}` +
    `&hourly=temperature_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()

    if (!data.hourly) return null

    const idx = hour
    const temperature = data.hourly.temperature_2m?.[idx]
    const pressureHpa = data.hourly.surface_pressure?.[idx]
    const windSpeed = data.hourly.wind_speed_10m?.[idx]
    const windDir = data.hourly.wind_direction_10m?.[idx]
    const precipitation = data.hourly.precipitation?.[idx]

    // Convert hPa to inHg for barometric pressure
    const barometricPressure = pressureHpa ? +(pressureHpa * 0.02953).toFixed(2) : null

    // Calculate pressure trend from prior 6 hours
    let pressureTrend = 'steady'
    if (pressureHpa && idx >= 6) {
      const priorPressure = data.hourly.surface_pressure?.[idx - 6]
      if (priorPressure) {
        const delta = pressureHpa - priorPressure
        if (delta > 1.5) pressureTrend = 'rising'
        else if (delta < -1.5) pressureTrend = 'falling'
      }
    }

    // Convert Celsius to Fahrenheit
    const tempF = temperature != null ? +(temperature * 9 / 5 + 32).toFixed(1) : null

    // Convert wind direction degrees to compass
    const windDirection = windDir != null ? degreesToCompass(windDir) : null

    return {
      temperature: tempF,
      barometricPressure,
      pressureTrend,
      windSpeed: windSpeed != null ? `${+(windSpeed * 0.621371).toFixed(1)} mph` : null,
      windDirection,
      precipitation,
    }
  } catch (err) {
    console.error('Weather backfill error:', err.message)
    return null
  }
}

/**
 * Get forecast for a location (for prediction windows)
 */
export async function getForecast(lat, lng, days = 7) {
  const url = `${BASE}/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation` +
    `&forecast_days=${days}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return data.hourly || null
  } catch (err) {
    console.error('Forecast fetch error:', err.message)
    return null
  }
}

/**
 * Detect front windows from hourly pressure data
 */
export function detectFrontWindows(hourlyPressure, hourlyTimes) {
  if (!hourlyPressure || hourlyPressure.length < 12) return []

  const windows = []

  for (let i = 6; i < hourlyPressure.length; i++) {
    const current = hourlyPressure[i]
    const sixHoursAgo = hourlyPressure[i - 6]

    if (current == null || sixHoursAgo == null) continue

    const deltaHpa = current - sixHoursAgo
    const deltaInHg = deltaHpa * 0.02953

    // Pre-front surge: pressure falling >0.10 inHg in 6 hours
    if (deltaInHg < -0.10) {
      windows.push({
        type: 'pre_front',
        start: hourlyTimes?.[i] || null,
        end: hourlyTimes?.[Math.min(i + 6, hourlyPressure.length - 1)] || null,
        magnitude: Math.abs(deltaInHg),
        description: 'Pre-front surge — high movement expected',
      })
    }

    // Post-front surge: pressure stabilizing after drop
    if (i >= 12) {
      const twelveHoursAgo = hourlyPressure[i - 12]
      if (twelveHoursAgo != null) {
        const longDelta = current - twelveHoursAgo
        const shortDelta = current - sixHoursAgo
        // Was falling, now stabilizing
        if (longDelta * 0.02953 < -0.10 && Math.abs(shortDelta * 0.02953) < 0.03) {
          windows.push({
            type: 'post_front',
            start: hourlyTimes?.[i] || null,
            end: hourlyTimes?.[Math.min(i + 12, hourlyPressure.length - 1)] || null,
            magnitude: Math.abs(longDelta * 0.02953),
            description: 'Post-front stabilization — movement surge expected',
          })
        }
      }
    }
  }

  // Deduplicate windows that are close together
  const deduped = []
  for (const w of windows) {
    const last = deduped[deduped.length - 1]
    if (last && last.type === w.type && last.end === w.start) {
      last.end = w.end
      last.magnitude = Math.max(last.magnitude, w.magnitude)
    } else {
      deduped.push({ ...w })
    }
  }

  return deduped
}

/**
 * Convert degrees to compass direction
 */
function degreesToCompass(degrees) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const idx = Math.round(degrees / 22.5) % 16
  return dirs[idx]
}

/**
 * Determine time-of-day category from a datetime
 */
export function getTimeOfDay(datetime) {
  const hour = datetime.getHours()
  if (hour >= 4 && hour < 6) return 'pre_dawn'
  if (hour >= 6 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 19) return 'dusk'
  return 'night'
}
