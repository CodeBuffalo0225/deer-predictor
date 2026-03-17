import { prisma } from '../index.js'
import { embed } from './embeddingService.js'

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Store an embedding in the vector store
 */
export async function storeEmbedding(propertyId, sourceType, sourceId, embeddingVector, metadata = {}) {
  await prisma.vectorEntry.upsert({
    where: {
      id: `${sourceType}_${sourceId}`,
    },
    create: {
      id: `${sourceType}_${sourceId}`,
      propertyId,
      sourceType,
      sourceId,
      embedding: JSON.stringify(embeddingVector),
      metadata: JSON.stringify(metadata),
    },
    update: {
      embedding: JSON.stringify(embeddingVector),
      metadata: JSON.stringify(metadata),
    },
  })
}

/**
 * Find similar entries by cosine similarity
 */
export async function findSimilar(queryEmbedding, options = {}) {
  const { propertyId, sourceType, topK = 15, excludeIds = [] } = options

  const where = {}
  if (propertyId) where.propertyId = propertyId
  if (sourceType) where.sourceType = sourceType

  const entries = await prisma.vectorEntry.findMany({ where })

  const scored = entries
    .filter(e => !excludeIds.includes(e.sourceId))
    .map(entry => {
      const entryEmbedding = JSON.parse(entry.embedding)
      const similarity = cosineSimilarity(queryEmbedding, entryEmbedding)
      return {
        ...entry,
        metadata: JSON.parse(entry.metadata || '{}'),
        similarity,
      }
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)

  return scored
}

/**
 * Find similar sightings
 */
export async function findSimilarSightings(queryEmbedding, filters = {}, topK = 15) {
  return findSimilar(queryEmbedding, {
    ...filters,
    sourceType: 'sighting',
    topK,
  })
}

/**
 * Find similar photos
 */
export async function findSimilarPhotos(queryEmbedding, filters = {}, topK = 20) {
  return findSimilar(queryEmbedding, {
    ...filters,
    sourceType: 'photo',
    topK,
  })
}

/**
 * Find similar deer season snapshots
 */
export async function findSimilarSnapshots(queryEmbedding, filters = {}, topK = 5) {
  return findSimilar(queryEmbedding, {
    ...filters,
    sourceType: 'snapshot',
    topK,
  })
}

/**
 * Full-archive semantic search
 */
export async function semanticSearch(naturalLanguageQuery, propertyId, topK = 20) {
  const queryEmbedding = await embed(naturalLanguageQuery)
  return findSimilar(queryEmbedding, { propertyId, topK })
}
