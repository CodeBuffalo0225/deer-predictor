/**
 * Local embedding service using a simple TF-IDF-like approach.
 * Generates 384-dim vectors for semantic similarity search.
 *
 * Uses a deterministic hash-based embedding for zero-dependency local operation.
 * For production, swap in @xenova/transformers with 'Xenova/all-MiniLM-L6-v2'.
 */

const EMBEDDING_DIM = 384

/**
 * Simple deterministic text → 384-dim vector embedding.
 * Uses character n-gram hashing to produce consistent vectors.
 */
export async function embed(text) {
  if (!text || typeof text !== 'string') {
    return new Array(EMBEDDING_DIM).fill(0)
  }

  const normalized = text.toLowerCase().trim()
  const vector = new Float32Array(EMBEDDING_DIM).fill(0)

  // Character trigram hashing into embedding dimensions
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.substring(i, i + 3)
    let hash = 0
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) - hash + trigram.charCodeAt(j)) | 0
    }
    const idx = Math.abs(hash) % EMBEDDING_DIM
    vector[idx] += (hash > 0 ? 1 : -1) * 0.1
  }

  // Word-level hashing for semantic grouping
  const words = normalized.split(/\s+/)
  for (const word of words) {
    let hash = 0
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash + word.charCodeAt(j)) | 0
    }
    const idx = Math.abs(hash) % EMBEDDING_DIM
    vector[idx] += (hash > 0 ? 1 : -1) * 0.3
  }

  // L2 normalize
  let norm = 0
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += vector[i] * vector[i]
  }
  norm = Math.sqrt(norm)
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] /= norm
    }
  }

  return Array.from(vector)
}

/**
 * Build embeddable text from a sighting record
 */
export function sightingToText(sighting) {
  const parts = [
    sighting.behavior && `behavior:${sighting.behavior}`,
    sighting.rutPhase && `rut:${sighting.rutPhase}`,
    sighting.pressureTrend && `pressure:${sighting.pressureTrend}`,
    sighting.timeOfDay && `time:${sighting.timeOfDay}`,
    sighting.windDirection && `wind:${sighting.windDirection}`,
    sighting.temperature != null && `temp:${Math.round(sighting.temperature)}F`,
    sighting.moonPhase && `moon:${sighting.moonPhase}`,
    sighting.vegetationState && `vegetation:${sighting.vegetationState}`,
    sighting.huntingPressure && `pressure_level:${sighting.huntingPressure}`,
    sighting.travelDirection && `travel:${sighting.travelDirection}`,
    sighting.notes,
  ].filter(Boolean)
  return parts.join(' ')
}

/**
 * Build embeddable text from a photo analysis result
 */
export function photoAnalysisToText(photo) {
  const parts = [
    photo.timeOfDay && `time:${photo.timeOfDay}`,
    photo.pressureTrend && `pressure:${photo.pressureTrend}`,
    photo.temperature != null && `temp:${Math.round(photo.temperature)}F`,
    photo.deerCount > 0 && `deer_count:${photo.deerCount}`,
    photo.moonPhase && `moon:${photo.moonPhase}`,
  ]

  if (photo.deerAnalysis) {
    try {
      const analysis = typeof photo.deerAnalysis === 'string'
        ? JSON.parse(photo.deerAnalysis)
        : photo.deerAnalysis
      if (analysis.individuals) {
        for (const ind of analysis.individuals) {
          parts.push(
            ind.sex && `sex:${ind.sex}`,
            ind.ageClass && `age:${ind.ageClass}`,
            ind.behavior && `behavior:${ind.behavior}`,
            ind.bodyCondition && `condition:${ind.bodyCondition}`,
            ind.travelDirection && `travel:${ind.travelDirection}`,
          )
        }
      }
      if (analysis.vegetationState) parts.push(`vegetation:${analysis.vegetationState}`)
    } catch {}
  }

  if (photo.notes) parts.push(photo.notes)
  return parts.filter(Boolean).join(' ')
}

/**
 * Build embeddable text from a deer season snapshot
 */
export function snapshotToText(snapshot) {
  const parts = [
    `season:${snapshot.season}`,
    snapshot.estimatedAge && `age:${snapshot.estimatedAge}`,
    snapshot.antlerPoints && `points:${snapshot.antlerPoints}`,
    snapshot.bodyConditionRating && `condition:${snapshot.bodyConditionRating}`,
    snapshot.estimatedScore && `score:${snapshot.estimatedScore}`,
    snapshot.daylightHitPercent != null && `daylight:${snapshot.daylightHitPercent}%`,
    snapshot.homeRangeDescription,
    snapshot.aiAnnualSummary,
  ].filter(Boolean)
  return parts.join(' ')
}

/**
 * Build embeddable text from a sign observation
 */
export function signToText(sign) {
  const parts = [
    `type:${sign.type}`,
    `status:${sign.status}`,
    sign.rubSize && `rub_size:${sign.rubSize}`,
    sign.scrapeSize && `scrape_size:${sign.scrapeSize}`,
    sign.notes,
  ].filter(Boolean)
  return parts.join(' ')
}
