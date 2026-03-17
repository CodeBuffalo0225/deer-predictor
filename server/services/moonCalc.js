/**
 * Simple moon phase calculator
 */
export function getMoonPhase(date) {
  // Known new moon: January 6, 2000
  const knownNew = new Date(2000, 0, 6, 18, 14, 0)
  const synodicMonth = 29.53058867

  const daysSinceNew = (date.getTime() - knownNew.getTime()) / (1000 * 60 * 60 * 24)
  const cyclePosition = ((daysSinceNew % synodicMonth) + synodicMonth) % synodicMonth
  const illumination = +(0.5 * (1 - Math.cos(2 * Math.PI * cyclePosition / synodicMonth)) * 100).toFixed(1)

  let phase
  if (cyclePosition < 1.85) phase = 'new_moon'
  else if (cyclePosition < 7.38) phase = 'waxing_crescent'
  else if (cyclePosition < 9.23) phase = 'first_quarter'
  else if (cyclePosition < 14.77) phase = 'waxing_gibbous'
  else if (cyclePosition < 16.61) phase = 'full_moon'
  else if (cyclePosition < 22.15) phase = 'waning_gibbous'
  else if (cyclePosition < 23.99) phase = 'last_quarter'
  else if (cyclePosition < 29.53) phase = 'waning_crescent'
  else phase = 'new_moon'

  return { phase, illumination, cycleDay: +cyclePosition.toFixed(1) }
}
